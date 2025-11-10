import { getPayload } from 'payload'
import config from '@payload-config'

import { redis } from './redis'
import { redisQueueKey } from './key'
import { computeExpiresAt, setCacheEntry } from './cache'
import type { CacheDataEncoding, CacheEntry, RefreshJob } from './types'

const payload = await getPayload({ config })

const DEFAULT_MAX_PER_SOURCE = 20 // Max jobs per source per run
const DEFAULT_TIME_BUDGET_MS = 5_000 // Time budget for immediate execution (ms)
const MAX_ATTEMPTS = 3 // Max retry attempts for transient errors (via requeue)

export type RunSummary = {
  ok: true
  processed_sources: number
  per_source: Record<string, { dequeued: number; updated: number; not_modified: number; errors: number }>
  durationMs: number
}

export interface RunOptions {
  source_id?: string | null
  maxPerSource?: number
  timeBudgetMs?: number
}

function buildURL(base: string, path: string, q: Record<string, any> | null | undefined): string {
  // Combine base_url and key (key usually starts with "/")
  const u = new URL(path, base)
  if (q) {
    for (const [k, v] of Object.entries(q)) {
      if (v == null) continue
      if (!u.searchParams.has(k)) u.searchParams.set(k, String(v))
    }
  }
  return u.toString()
}

async function pickDataAndEncoding(
  res: Response,
): Promise<{ data: any; encoding: CacheDataEncoding; contentType: string | null }> {
  const ct = res.headers.get('content-type')
  const cts = (ct || '').toLowerCase()
  if (cts.includes('application/json')) {
    try {
      const json = await res.json()
      return { data: json, encoding: 'json', contentType: ct }
    } catch {
      const txt = await res.text()
      return { data: txt, encoding: 'text', contentType: ct }
    }
  }
  if (cts.startsWith('text/')) {
    const txt = await res.text()
    return { data: txt, encoding: 'text', contentType: ct }
  }
  const ab = await res.arrayBuffer()
  const b64 = Buffer.from(ab).toString('base64')
  return { data: b64, encoding: 'base64', contentType: ct }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Lightweight retry with timeout for 5xx/429 and network errors.
// Non-retryable statuses (2xx/3xx/4xx except 429) return immediately.
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { attempts?: number; baseDelayMs?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const attempts = Math.max(1, opts.attempts ?? 2)
  const baseDelayMs = opts.baseDelayMs ?? 200
  const timeoutMs = opts.timeoutMs ?? 2500
  let lastErr: unknown
  let lastRes: Response | undefined

  for (let i = 1; i <= attempts; i++) {
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null
    const t = ac ? setTimeout(() => ac.abort(), timeoutMs) : null
    try {
      const res = await fetch(url, { ...init, signal: ac?.signal })
      lastRes = res
      // 5xx or 429 are considered retryable; other statuses return immediately
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`upstream status ${res.status}`)
      } else {
        if (t) clearTimeout(t as any)
        return res
      }
    } catch (e) {
      lastErr = e
    } finally {
      if (t) clearTimeout(t as any)
    }
    if (i < attempts) {
      const jitter = Math.floor(Math.random() * baseDelayMs)
      await sleep(baseDelayMs * i + jitter)
    }
  }
  if (lastRes) return lastRes
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr ?? 'fetch failed'))
}

// Neon may return JSON columns as strings; do a lenient parse of fields
const parseMaybeObj = <T extends unknown>(v: unknown): T | null => {
  if (!v) return null
  if (typeof v === 'string') {
    try {
      const o = JSON.parse(v)
      return (o ?? null) as T | null
    } catch {
      return null
    }
  }
  if (typeof v === 'object') return v as T
  return null
}

export async function runOnce(opts: RunOptions = {}): Promise<RunSummary> {
  const started = Date.now()
  const maxPerSource = Math.max(1, Math.floor(opts.maxPerSource ?? DEFAULT_MAX_PER_SOURCE))
  const timeBudgetMs = Math.max(500, Math.floor(opts.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS))
  console.info({ event: 'runner.start', source_id: opts.source_id ?? null, maxPerSource, timeBudgetMs })

  const sources = opts.source_id
    ? await payload.find({ collection: 'sources', where: { sid: { equals: opts.source_id } } })
    : await payload.find({ collection: 'sources', limit: maxPerSource })

  const perSource: Record<string, { dequeued: number; updated: number; not_modified: number; errors: number }> = {}
  console.info({ event: 'runner.sources', ids: sources.docs.map((s) => s.id) })

  for (const src of sources.docs) {
    perSource[src.sid!] = { dequeued: 0, updated: 0, not_modified: 0, errors: 0 }
    const queueKey = redisQueueKey(src.sid!)
    const initialLen = await redis.llen(queueKey)
    console.info({ event: 'runner.queue_init', source_id: src.sid, queue_len: initialLen })

    const perMinute = 5 // TODO: config from src
    const burst = 0

    for (let i = 0; i < maxPerSource; i++) {
      if (Date.now() - started > timeBudgetMs) break // Guardrail for time budget

      const raw = (await redis.lpop(queueKey)) as unknown
      if (!raw) {
        console.info({ event: 'runner.queue_empty', source_id: src.sid, i, dequeued: perSource[src.sid!].dequeued })
        break // Queue is empty
      }
      perSource[src.sid!].dequeued++

      let job: RefreshJob | null = null
      try {
        if (typeof raw === 'string') {
          job = JSON.parse(raw) as RefreshJob
          console.info({ event: 'runner.job_popped', job_type: 'string', key: job.key, attempts: job.attempts ?? 0 })
        } else if (raw && typeof raw === 'object') {
          job = raw as RefreshJob
          console.info({ event: 'runner.job_popped', job_type: 'object', key: job.key, attempts: job.attempts ?? 0 })
        } else {
          throw new Error(`unexpected job type: ${typeof raw}`)
        }
      } catch (e) {
        console.warn({ event: 'runner.invalid_job_payload', err: String(e), raw_type: typeof raw, raw })
        continue
      }
      if (!job?.key) continue

      try {
        // Regular mode: cache a single key
        const url = buildURL(src.baseUrl!, job.key, {})
        const res = await fetchWithRetry(
          url,
          { method: 'GET', headers: new Headers({}) },
          { attempts: 2, baseDelayMs: 200, timeoutMs: 2500 },
        )

        if (!res.ok) {
          perSource[src.sid!].errors++
          console.warn({ event: 'runner.origin_non_2xx', source_id: src.sid, key: job.key, status: res.status })
          continue
        }

        const { data, encoding, contentType } = await pickDataAndEncoding(res)
        const etag = res.headers.get('etag')
        const lastMod = res.headers.get('last-modified')
        const ttl_s = Number(src.cacheTTL ?? 600)

        const entry: CacheEntry<Record<string, unknown>> = {
          data,
          metadata: {
            source_id: src.sid!,
            key: job.key,
            cached_at: new Date().toISOString(), // Will be overwritten by setCacheEntry with the current time
            expires_at: computeExpiresAt(ttl_s),
            stale: false, // Will be recomputed by setCacheEntry
            ttl_s,
            etag: etag ?? null,
            last_modified: lastMod ?? null,
            origin_status: res.status,
            content_type: contentType ?? null,
            data_encoding: encoding,
          },
        }
        await setCacheEntry(src.sid!, job.key, entry, { ttl_s })

        perSource[src.sid!].updated++
        console.info({
          event: 'runner.cache_updated',
          source_id: src.sid,
          key: job.key,
          status: res.status,
          ttl_s: src.cacheTTL,
          content_type: contentType,
          encoding,
        })
      } catch (error) {
        perSource[src.sid!].errors++
        console.error({ event: 'runner.refresh_error', source_id: src.sid, key: job?.key, err: String(error) })
      }
    }
  }

  return {
    ok: true,
    processed_sources: Object.keys(perSource).length,
    per_source: perSource,
    durationMs: Date.now() - started,
  }
}
