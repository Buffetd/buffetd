import { getPayload } from 'payload'
import config from '@payload-config'

import { Source } from '@/payload-types'

import type { PureEntry } from '@/types'
import type { CacheDataEncoding, CacheEntry, RefreshJob } from '@/types'
import { redis } from '@/lib/redis'
import { redisQueueKey, sanitizePoolKey, keyHash } from '@/lib/key'

const payload = await getPayload({ config })

const DEFAULT_MAX_PER_SOURCE = 20 // Max jobs per source per run
const DEFAULT_TIME_BUDGET_MS = 5_000 // Time budget for immediate execution (ms)
const MAX_ATTEMPTS = 3 // Max retry attempts for transient errors (via requeue)

function ensureHeaders(obj: Record<string, any> | null | undefined): Record<string, string> {
  const h: Record<string, string> = {}
  if (!obj) return h
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue
    h[k] = String(v)
  }
  return h
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

type JobStats = {
  dequeued: number
  updated: number
  cacheHit: number
  errors: number
}

export async function fetchSourceItem(
  job: RefreshJob,
  src: Source,
  key: string,
  jobStats: JobStats = { dequeued: 0, updated: 0, cacheHit: 0, errors: 0 },
) {
  const srcHeaders = ensureHeaders(parseMaybeObj<Record<string, string>>(src.defaultHeaders))
  // const srcQueries = parseMaybeObj<Record<string, any>>(src.defaultQuery);
  const res = await fetchWithRetry(
    buildURL(src.baseUrl, key, {}),
    { method: job.sourceMethod, headers: srcHeaders },
    { attempts: 2, baseDelayMs: 200, timeoutMs: 2500 },
  )

  if (!res.ok) {
    if (res.status === 429 || res.status === 502 || res.status === 503) {
      const nextAttempts = (job.attempts ?? 0) + 1
      if (nextAttempts <= MAX_ATTEMPTS) {
        const requeue = { ...job, attempts: nextAttempts } as RefreshJob
        await redis.rpush(redisQueueKey(src.name!), JSON.stringify(requeue))
      }
      console.warn({
        event: 'runner.pool_requeue_upstream',
        source_id: src.name!,
        key: job.key,
        status: res.status,
        next_attempts: nextAttempts,
      })
    }
    jobStats.errors++
    console.warn({ event: 'runner.origin_non_2xx', source_id: src.id, key: job.key, status: res.status })
    return
  }

  const { data, encoding, contentType } = await pickDataAndEncoding(res)
  const etag = res.headers.get('etag')
  const lastMod = res.headers.get('last-modified')

  const metadata: Partial<PureEntry['meta']> = {
    cachedAt: new Date().toISOString(), // Will be overwritten by setCacheEntry with the current time
    etag: etag ?? undefined,
    lastModified: lastMod ?? undefined,
    originStatus: res.status,
    contentType: contentType ?? undefined,
    dataEncoding: encoding,
  }

  jobStats.updated++

  return {
    data,
    metadata,
  }
}

export async function autoCreateSource(url: string) {
  const { origin } = URL.parse(url) ?? {}

  if (!origin) throw new Error('Invalid host name')

  // find host in sources collection
  const src = await payload.find({
    collection: 'sources',
    where: { baseUrl: { equals: origin } },
  })

  if (src.docs.length > 0) return src.docs[0]

  // create source
  const newSrc = await payload.create({
    collection: 'sources',
    data: {
      baseUrl: origin,
      rateLimit: {
        requestPerMinute: 6,
      },
    },
  })

  return newSrc
}
