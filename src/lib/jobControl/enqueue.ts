import { getPayload } from 'payload'
import config from '@payload-config'

import type { ValidMethod, FetchSourceEntryParam, RefreshJob, EnqueueResult } from '@/types'
import type { TaskKeys } from '@/tasks/fetchSourceEntry'
import { redis } from '@/lib/redis'
import { keyHash, normalizeKeyString, redisKeyDedup, redisQueueKey } from '@/lib/key'

type Job<A> = {
  jobName: TaskKeys
  jobType: 'memory' | 'postgres'
  jobArgs: A
}

type FetchSourceEntryJobArgs = FetchSourceEntryParam & { method: ValidMethod }

export async function enqueueFetchSourceEntryTask(
  sourceName: string,
  key: string,
  method: ValidMethod,
): Promise<EnqueueResult> {
  const job: Job<FetchSourceEntryJobArgs> = {
    jobName: 'tFetchSourceEntry' as const,
    jobType: 'memory',
    jobArgs: {
      sourceName,
      key: normalizeKeyString(key),
      method,
    },
  }

  return enqueueTask(job)
}

async function enqueueTask(job: Job<FetchSourceEntryJobArgs>): Promise<EnqueueResult> {
  // if (job.jobType === 'memory') {
  //   return enqueueMemoryTask<A>(job)
  // }
  job.jobName
  enqueuePayloadJob(job)
  return enqueueMemoryJob(job)
}

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

async function enqueueMemoryJob(job: Job<FetchSourceEntryJobArgs>, options?: EnqueueOptions): Promise<EnqueueResult> {
  const { jobArgs } = job

  const sourceId = jobArgs.sourceName
  const normalizedKey = normalizeKeyString(jobArgs.key)
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
    priority: 'normal',
    attempts: 0,
    enqueuedAt: new Date().toISOString(),
    sourceMethod: jobArgs.method,
  }

  await redis.rpush(qkey, JSON.stringify(record))
  return { enqueued: true, jobId, reason: 'success' }
}

async function enqueuePayloadJob<A>(job: Job<A>) {
  const { jobName, jobArgs } = job
  const payload = await getPayload({ config })

  try {
    return await payload.jobs.queue({
      task: jobName,
      input: jobArgs,
    })
  } catch (error) {
    console.error('Failed to enqueue job', error)
  }
}
