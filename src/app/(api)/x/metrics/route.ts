import { type NextRequest, NextResponse } from 'next/server'

import { getMetrics } from '@/actions/metrics'
import { ok } from '@/lib/helpers/response'

export const GET = async (_request: NextRequest): Promise<NextResponse> => {
  const metrics = await getMetrics()

  return ok(metrics)
}
