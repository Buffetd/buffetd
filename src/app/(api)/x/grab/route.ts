import { type NextRequest, NextResponse } from 'next/server'

import type { CacheEntry, EnqueueResult } from '@/lib/types'
import { getCacheEntry } from '@/lib/cache'
import { enqueueRefresh } from '@/lib/queue'
import { ok, err } from '@/lib/helper-server'

type ErrorResponse = { error: string }

type GrabResponse =
  | { entry_status: 'hit'; data: CacheEntry }
  | { entry_status: 'enqueued'; data: EnqueueResult }
  | ErrorResponse

export const GET = async (request: NextRequest): Promise<NextResponse<GrabResponse>> => {
  const url = request.nextUrl
  const sourceId = url.searchParams.get('source_id')
  const key = url.searchParams.get('key')

  if (!sourceId || !key) {
    return err(422, 'Missing source_id or key')
  }

  const entry: CacheEntry | null = await getCacheEntry(sourceId, key)

  if (entry) {
    return ok({ entry_status: 'hit', data: entry })
  }

  const r = await enqueueRefresh({ sourceId, key })

  return ok({
    entry_status: 'enqueued',
    data: {
      enqueued: r.enqueued,
      jobId: r.jobId,
      sourceId,
      key,
    },
  })
}
