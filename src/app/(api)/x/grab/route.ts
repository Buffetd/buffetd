import { type NextRequest, NextResponse } from 'next/server'

import { getCacheEntry } from '@/lib/cache'
import { enqueueRefresh } from '@/lib/queue'
import type { CacheEntry, EnqueueResult } from '@/lib/types'

type GrabResponse =
  | { type: 'hit'; data: CacheEntry }
  | { type: 'enqueued'; data: EnqueueResult }
  | { type: 'error'; error: string }

export const GET = async (request: NextRequest): Promise<NextResponse<GrabResponse>> => {
  const url = request.nextUrl
  const sourceId = url.searchParams.get('source_id')
  const key = url.searchParams.get('key')

  if (!sourceId || !key) {
    return NextResponse.json({ type: 'error', error: 'Missing source_id or key' }, { status: 422 })
  }

  const entry: CacheEntry | null = await getCacheEntry(sourceId, key)

  if (entry) {
    return NextResponse.json({ type: 'hit', data: entry })
  }

  const r = await enqueueRefresh({ sourceId, key })

  return NextResponse.json({
    type: 'enqueued',
    data: {
      enqueued: r.enqueued,
      jobId: r.jobId,
      sourceId,
      key,
    },
  })
}
