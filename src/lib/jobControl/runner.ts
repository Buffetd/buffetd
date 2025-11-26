import { getPayload } from 'payload'
import config from '@payload-config'

import type { CacheEntry, Metadata, RefreshJob } from '@/lib/types'
import { redis } from '@/lib/redis'
import { redisQueueKey, sanitizePoolKey } from '@/lib/key'
import { computeExpiresAt } from '@/lib/utils'
import { setCacheEntry } from '@/lib/cacheControl'

import { fetchSourceItem } from './source'

const DEFAULT_MAX_PER_SOURCE = 20 // Max jobs per source per run
const DEFAULT_TIME_BUDGET_MS = 5_000 // Time budget for immediate execution (ms)

export type RunSummary = {
  ok: true
  processed_sources: number
  per_source: Record<string, { dequeued: number; updated: number; cacheHit: number; errors: number }>
  durationMs: number
}

export interface RunOptions {
  source_id: string | string[] | null
  maxPerSource?: number
  timeBudgetMs?: number
}

async function getSources(sourceId: string | string[] | null) {
  const payload = await getPayload({ config })

  if (!sourceId) return payload.find({ collection: 'sources', limit: DEFAULT_MAX_PER_SOURCE })
  if (Array.isArray(sourceId)) {
    return payload.find({ collection: 'sources', where: { name: { in: sourceId } } })
  }
  return payload.find({ collection: 'sources', where: { name: { equals: sourceId } } })
}

export async function runOnce(opts: RunOptions): Promise<RunSummary> {
  const started = Date.now()
  const maxPerSource = Math.max(1, Math.floor(opts.maxPerSource ?? DEFAULT_MAX_PER_SOURCE))
  const timeBudgetMs = Math.max(500, Math.floor(opts.timeBudgetMs ?? DEFAULT_TIME_BUDGET_MS))
  console.info({ event: 'runner.start', source_id: opts.source_id ?? null, maxPerSource, timeBudgetMs })

  const sources = await getSources(opts.source_id)

  const perSource: Record<string, { dequeued: number; updated: number; cacheHit: number; errors: number }> = {}
  console.info({ event: 'runner.sources', ids: sources.docs.map((s) => s.id) })

  for (const src of sources.docs) {
    perSource[src.name!] = { dequeued: 0, updated: 0, cacheHit: 0, errors: 0 }

    const queueKey = redisQueueKey(src.name!)
    const queueLen = await redis.llen(queueKey)
    console.info({ event: 'runner.queue_init', source_id: src.name!, queue_len: queueLen })

    for (let i = 0; i < maxPerSource; i++) {
      if (Date.now() - started > timeBudgetMs) break // Guardrail for time budget

      const raw = (await redis.lpop(queueKey)) as unknown

      console.log(raw)
      if (!raw) {
        console.log(raw)
        console.info({ event: 'runner.queue_empty', source_id: src.name!, i, dequeued: perSource[src.name!].dequeued })
        break // Queue is empty
      }
      perSource[src.name!].dequeued++

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

      console.log({ event: 'runner.job_getted', job_type: 'object', key: job.key, attempts: job.attempts ?? 0, job })

      if (!job?.key) continue

      try {
        const ttl_s = Number(src.cacheTTL ?? 600)
        const initMetadata: Partial<Metadata> = {
          source_id: `${src.id}`,
          key: job.key,
          // stale: false, // Will be recomputed by setCacheEntry,
          ttl_s,
          expires_at: computeExpiresAt(ttl_s),
        }

        // Pool mode: keys starting with "/pool:" are treated as pool collection jobs
        const isPoolJob = typeof job.key === 'string' && job.key.startsWith('/pool:')
        console.log({
          event: 'runner.job_preprocess',
          job_type: 'object',
          key: job.key,
          attempts: job.attempts ?? 0,
          job,
        })
        let result
        if (isPoolJob) {
          const after = job.key.slice('/pool:'.length)
          const poolWithQS = after.length > 0 ? after : '/'
          const pool_key = sanitizePoolKey(poolWithQS)

          result = await fetchSourceItem(job, src, pool_key, perSource[src.name!])
        } else {
          result = await fetchSourceItem(job, src, job.key, perSource[src.name!])
        }

        if (!result) continue

        const entry: CacheEntry<Record<string, unknown>> = {
          data: result.data,
          metadata: {
            ...initMetadata,
            ...result.metadata,
          } as Metadata,
        }

        await setCacheEntry(src.name!, job.key, entry, { ttlSec: ttl_s })
      } catch (error) {
        perSource[src.name!].errors++
        console.error({ event: 'runner.refresh_error', source_id: src.name!, key: job?.key, err: String(error) })
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
