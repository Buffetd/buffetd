import { type NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { redis } from '@/lib/redis'
import { ok } from '@/lib/helpers/response'

const payload = await getPayload({ config })

function getCacheFromRedis() {
  const cache = redis.get('cache')
  // return JSON.parse(cache)
}

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const sources = await payload.find({ collection: 'sources', limit: 0 })

  return ok({
    uptime_s: 0,
    cache: { hit: 0, miss: 0, stale_served: 0 },
    sources: { count: sources.docs.length },
    entries: {},
    jobs: { queued: 0, running: 0, failed: 0 },
  })
}
