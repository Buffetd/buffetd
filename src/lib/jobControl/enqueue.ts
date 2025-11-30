import { getPayload } from 'payload'
import config from '@payload-config'

import type { RefreshJob, EnqueueResult } from '@/lib/types'
import type { TaskKeys } from '@/tasks/fetchSourceEntry'
import { redis } from '@/lib/redis'
import { keyHash, normalizeKeyString, redisKeyDedup, redisQueueKey } from '@/lib/key'

type Job = {
  jobName: TaskKeys
  jobType: 'memory' | 'postgres'
  jobArgs: Record<string, unknown>
}

export async function enqueueFetchSourceEntryTask(sourceName: string, key: string, method: string) {
  const job: Job = {
    jobName: 'tFetchSourceEntry' as const,
    jobType: 'postgres',
    jobArgs: {
      sourceName,
      key: normalizeKeyString(key),
      method,
    },
  }

  const normalizedKey = normalizeKeyString(key)
  const dedupName = sourceName
  const dedupHash = keyHash(normalizedKey)

  return enqueueTask(job)
}

async function enqueueTask(job: Job) {
  // if (job.jobType === 'memory') {
  //   return enqueueMemoryTask(job)
  // }

  return enqueuePgTask(job)
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

async function enqueueMemoryTask(job: Job) {
  const { jobName, jobArgs } = job

  // const sourceId = jobArgs.sourceName
  // const normalizedKey = normalizeKeyString(jobArgs.key)
  // const kHash = keyHash(normalizedKey)

  // Same-key dedupe window (avoid burst duplicate refreshes)
  // const dedupKey = redisKeyDedup(sourceId, kHash)

  // const ok = await redis.set(dedupKey, '1', {
  //   nx: true,
  //   ex: options?.dedupeTtlS ?? DEFAULT_DEDUPE_TTL_S,
  // })

  // if (ok !== 'OK') {
  //   return { enqueued: false, reason: 'duplicate' }
  // }

  // Enqueue (one list per source)
  // const qkey = redisQueueKey(sourceId)
  const jobId = createJobId()
  // const record: RefreshJob = {
  //   id: jobId,
  //   sourceId,
  //   key: normalizedKey,
  //   priority: job.priority ?? 'normal',
  //   attempts: job.attempts ?? 0,
  //   enqueuedAt: new Date().toISOString(),
  //   sourceMethod: job.sourceMethod,
  // }

  // await redis.rpush(qkey, JSON.stringify(record))
  return { enqueued: true, jobId, reason: 'success' }
}

async function enqueuePgTask(job: Job) {
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
