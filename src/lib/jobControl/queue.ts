import type { RefreshJob, EnqueueResult } from '@/lib/types'
import { redis } from '@/lib/redis'
import { keyHash, normalizeKeyString, redisKeyDedup, redisQueueKey } from '@/lib/key'

export const DEFAULT_DEDUPE_TTL_S = 60 // same-key dedupe window
export const DEFAULT_IDEMP_TTL_S = 15 * 60 // Idempotency-Key validity window

export function createJobId(): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `j_${Date.now()}_${rand}`
}

export interface EnqueueOptions {
  idempotencyKey?: string | null
  dedupeTtlS?: number
  idempTtlS?: number
}

export async function enqueueRefresh(
  job: Omit<RefreshJob, 'id' | 'enqueuedAt'>,
  options?: EnqueueOptions,
): Promise<EnqueueResult> {
  const sourceId = job.sourceId
  const normalizedKey = normalizeKeyString(job.key)
  const kHash = keyHash(normalizedKey)

  // Same-key dedupe window (avoid burst duplicate refreshes)
  const dedupKey = redisKeyDedup(sourceId, kHash)

  const ok = await redis.set(dedupKey, '1', {
    nx: true,
    ex: options?.dedupeTtlS ?? DEFAULT_DEDUPE_TTL_S,
  })

  if (ok !== 'OK') {
    return { enqueued: false, reason: 'duplicate' }
  }

  // Enqueue (one list per source)
  const qkey = redisQueueKey(sourceId)
  const jobId = createJobId()
  const record: RefreshJob = {
    id: jobId,
    sourceId,
    key: normalizedKey,
    priority: job.priority ?? 'normal',
    attempts: job.attempts ?? 0,
    enqueuedAt: new Date().toISOString(),
    sourceMethod: job.sourceMethod,
  }

  await redis.rpush(qkey, JSON.stringify(record))
  return { enqueued: true, jobId, reason: 'success' }
}
