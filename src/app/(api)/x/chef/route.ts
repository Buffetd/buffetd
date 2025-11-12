// An endpoint for directly running the background job runner
import { type NextRequest, NextResponse } from 'next/server'

import type { RunSummary } from '@/lib/runner'
import { redis } from '@/lib/redis'
import { redisQueueKey } from '@/lib/key'
import { runOnce } from '@/lib/runner'
import { ok, err } from '@/lib/helper-server'

type ErrorResponse = { error: string }
type ChefResponse =
  | ({ endpoint: string; source_id: string | null; debug: Record<string, unknown> } & RunSummary)
  | ErrorResponse

export const POST = async (request: NextRequest): Promise<NextResponse<ChefResponse>> => {
  const body = await request.json()
  const { sourceId, keys } = body

  if (!sourceId && !keys) {
    return err(422, 'Missing source_id and keys')
  }

  let queue_len_before: number | null = null
  let queue_len_after_enqueue: number | null = null
  let queue_len_after_run: number | null = null

  const runOpts = {
    source_id: sourceId,
    maxPerSource: 10,
    timeBudgetMs: 5_000,
  } as const

  console.info({ event: 'tasks-run.runOnce.invoke', ...runOpts })
  const summary = await runOnce({ ...runOpts })
  if (sourceId) {
    const qkey = redisQueueKey(sourceId)
    queue_len_after_run = await redis.llen(qkey)
  }
  console.info({ event: 'tasks-run.runOnce.summary', summary, queue_len_after_run })

  const resp = { ...summary, endpoint: 'tasks-run', source_id: sourceId ?? null, debug: {} }
  resp.debug = {
    queue_len_before,
    queue_len_after_enqueue,
    queue_len_after_run,
    run_opts: runOpts,
  }

  return ok(resp)
}
