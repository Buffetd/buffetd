// An endpoint for directly running the background job runner
import { type NextRequest, NextResponse } from 'next/server'

import type { RunSummary } from '@/lib/jobControl/runner'
import { redis } from '@/lib/redis'
import { redisQueueKey } from '@/lib/key'
import { runOnce } from '@/lib/jobControl/runner'
import { ok, err } from '@/lib/helpers/response'

type ErrorResponse = { error: string }
type ChefResponse =
  | ({ endpoint: string; source_id: string | null; debug: Record<string, unknown> } & RunSummary)
  | ErrorResponse

export const POST = async (request: NextRequest) => {
  return handler(request)
}

async function handler(request: NextRequest): Promise<NextResponse<ChefResponse>> {
  const body = await request.json()
  const { sourceId } = body

  if (!sourceId) {
    return err(422, 'Missing source_id')
  }

  let qlen_before: number | null = null
  let qlen_after_enqueue: number | null = null
  let qlen_after_run: number | null = null

  const runOpts = {
    source_id: sourceId,
    maxPerSource: 10,
    timeBudgetMs: 5_000,
  } as const

  console.info({ event: 'chef.runOnce.invoke', ...runOpts })
  const summary = await runOnce({ ...runOpts })
  if (sourceId) {
    const qkey = redisQueueKey(sourceId)
    qlen_after_run = await redis.llen(qkey)
  }

  console.info({ event: 'chef.runOnce.summary', summary, qlen_after_run })
  const resp = { ...summary, endpoint: 'chef', source_id: sourceId ?? null, debug: {} }
  resp.debug = {
    qlen_before,
    qlen_after_enqueue,
    qlen_after_run,
    run_opts: runOpts,
  }

  return ok(resp)
}
