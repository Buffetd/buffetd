'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

import { redis } from '@/lib/redis'

export async function getMetrics() {
  const payload = await getPayload({ config })

  const metrics = (await redis.hgetall('buffetd:metrics')) ?? {}
  const cached = {
    hit: Number(metrics['cached:hit'] ?? 0),
    miss: Number(metrics['cached:miss'] ?? 0),
    stale_served: Number(metrics['cached:stale'] ?? 0),
  }

  const sources = await payload.find({ collection: 'sources', limit: 0 })
  const entries = await payload.find({ collection: 'entries', limit: 0 })

  const jobs = await payload.find({ collection: 'payload-jobs', limit: 0 })
  const errorJobs = jobs.docs.filter((d) => d.hasError)
  const runningJobs = jobs.docs.filter((d) => d.processing)
  const pendingJobs = jobs.docs.filter((d) => !d.processing && !d.hasError)

  return {
    uptime_s: (Date.now() - Number(metrics?.startedAt ?? 0)) / 1000,
    cached,
    sources: { count: sources.totalDocs },
    entries: { count: entries.totalDocs },
    jobs: { all: jobs.totalDocs, running: runningJobs.length, pending: pendingJobs.length, failed: errorJobs.length },
  }
}

type CacheOp = {
  hit?: boolean
  miss?: boolean
  stale?: boolean
}
export async function updateCacheMetrics(cacheOp: CacheOp) {
  if (cacheOp.hit) {
    return await redis.hincrby('buffetd:metrics', 'cached:hit', 1)
  }
  if (cacheOp.miss) {
    return await redis.hincrby('buffetd:metrics', 'cached:miss', 1)
  }
  if (cacheOp.stale) {
    return await redis.hincrby('buffetd:metrics', 'cached:stale', 1)
  }
}
