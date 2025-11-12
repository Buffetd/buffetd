import { type NextRequest, NextResponse } from 'next/server'

import { ok } from '@/lib/helper-server'

export const GET = async (request: NextRequest): Promise<NextResponse> => {
  return ok({
    uptime_s: 0,
    cache: { hit: 0, miss: 0, stale_served: 0 },
    jobs: { queued: 0, running: 0, failed: 0 },
    sources: { count: 0 },
  })
}
