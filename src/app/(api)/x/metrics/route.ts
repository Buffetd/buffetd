import { type NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import { ok } from '@/lib/helpers/response'

const payload = await getPayload({ config })

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const sources = await payload.find({ collection: 'sources', limit: 0 })

  return ok({
    uptime_s: 0,
    cache: { hit: 0, miss: 0, stale_served: 0 },
    jobs: { queued: 0, running: 0, failed: 0 },
    sources: { count: sources.docs.length },
  })
}
