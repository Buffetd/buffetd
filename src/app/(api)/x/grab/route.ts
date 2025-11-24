import { type NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { CacheEntry, EnqueueResult } from '@/lib/types'
import { getCacheEntry } from '@/lib/cacheControl'
import { enqueueRefresh } from '@/lib/jobControl/queue'
import { ok, err } from '@/lib/helpers/response'

const payload = await getPayload({ config })

type ErrorResponse = { error: string }

type GrabResponse =
  | { entry_status: 'hit'; data: CacheEntry }
  | { entry_status: 'enqueued'; data: EnqueueResult }
  | ErrorResponse

export const GET = async (request: NextRequest): Promise<NextResponse<GrabResponse>> => {
  return handler(request, 'GET')
}

export const POST = async (request: NextRequest): Promise<NextResponse<GrabResponse>> => {
  return handler(request, 'POST')
}

async function handler(request: NextRequest, method: 'GET' | 'POST'): Promise<NextResponse<GrabResponse>> {
  const args = await extractArguments(request, ['source_id', 'key'] as const)
  const { source_id, key } = args
  if (!source_id || !key) {
    return err(422, 'Missing source_id or key')
  }

  const sources = await payload.find({ collection: 'sources', where: { name: { equals: source_id } } })
  if (sources.docs.length === 0) {
    return err(404, 'Source not found')
  }

  const src = sources.docs[0]
  console.info({ event: 'grab.source', source_id, key, src })
  let cacheKey = key
  if (src.supportsPool) {
    cacheKey = `/pool:${key}`
  }

  const entry: CacheEntry | null = await getCacheEntry(source_id, cacheKey)

  if (entry) {
    return ok({ entry_status: 'hit', data: entry })
  }

  const r = await enqueueRefresh({
    sourceId: source_id,
    key: cacheKey,
    priority: 'normal',
    attempts: 0,
    sourceMethod: method,
  })

  return ok({
    entry_status: 'enqueued',
    data: {
      enqueued: r.enqueued,
      jobId: r.jobId,
      reason: r.reason,
      sourceId: source_id,
      key,
    },
  })
}

function fromEntriesSmart<T>(entries: Iterable<[string, T]>) {
  const out: Record<string, T | T[]> = {}
  for (const [k, v] of entries) {
    if (k in out) {
      if (!Array.isArray(out[k])) out[k] = [out[k]]
      out[k].push(v)
    } else {
      out[k] = v
    }
  }
  return out
}

async function extractArguments<const TFields extends readonly string[]>(
  request: NextRequest,
  fields: TFields,
): Promise<{ [K in TFields[number]]?: string }> {
  const url = request.nextUrl
  const searchEntries = url.searchParams.entries()
  const argFromQueries = fromEntriesSmart(searchEntries)
  let body = {} as { [K in TFields[number]]?: string }
  try {
    body = await request.json()
  } catch (error) {
    console.error('Failed to parse JSON body:', error)
  }
  const argFromBody = body

  const result = {} as { [K in TFields[number]]?: string }
  fields.forEach((field) => {
    const f = field as TFields[number]
    if (argFromQueries[f]) {
      result[f] = argFromQueries[f] as string
    }
    if (argFromBody[f]) {
      result[f] = argFromBody[f] as string
    }
  })
  return result
}
