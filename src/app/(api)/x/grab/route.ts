import { type NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

import type { PureEntry, ValidMethod } from '@/types'
import type { CacheEntry, EnqueueResult } from '@/lib/types'
import { getCacheEntry } from '@/lib/cacheControl'
import { ok, err } from '@/lib/helpers/response'
import { withTimeout } from '@/lib/utils'
import { getEntry } from '@/lib/storage'

import { enqueueFetchSourceEntryTask } from '@/lib/jobControl/enqueue'
import { fetchTargetDirect } from '@/lib/jobControl/sourceFetch'

const payload = await getPayload({ config })

type ErrorResponse = { error: string }

type GrabResponse =
  | { entry_status: 'hit'; data: CacheEntry }
  | { entry_status: 'enqueued'; data: EnqueueResult }
  | ErrorResponse

async function handler(request: NextRequest, method: ValidMethod): Promise<Response> {
  const args = await extractArguments(request, ['sourceName', 'key'] as const, method)
  const { sourceName, key } = args
  if (!sourceName || !key) return err(422, 'Missing source name or key')

  /**
   * 1. Check Cache
   */
  const entry = await getEntry(sourceName, key, { fallback: true })
  if (entry) {
    console.info({ event: 'grab.hit', sourceName, key })
    return ok({ entry_status: 'hit', entry }, { 'X-Buffetd': `Grab hit cache ${method} ${sourceName} ${key}` })
  }

  const sources = await payload.find({ collection: 'sources', where: { name: { equals: sourceName } } })
  if (sources.docs.length === 0) return err(404, 'Source not found')
  const src = sources.docs[0]
  // const cacheKey = src.supportsPool ? `/pool:${key}` : key

  try {
    // throw new Error('TIMEOUT')
    const url = src.baseUrl + key
    const message = await withTimeout(
      () =>
        fetchTargetDirect(url, {
          method,
          headers: {},
          body: undefined,
        }),
      1000,
    )

    console.info({ event: 'grab.fetch', sourceName, key, url })

    return ok({ entry_status: 'source', message })
  } catch (error) {
    if (error instanceof Error && error.message === 'TIMEOUT') {
      const result = await enqueueFetchSourceEntryTask(sourceName, key, method)

      console.info({ event: 'grab.enqueued', sourceName, key, result })

      // const r = await enqueueRefresh({
      //   sourceId: sourceName,
      //   key: cacheKey,
      //   priority: 'normal',
      //   attempts: 0,
      //   sourceMethod: method,
      // })

      return ok({
        entry_status: 'enqueued',
        data: {
          enqueued: result?.enqueued ?? false,
          jobId: result?.jobId,
          reason: result?.reason ?? 'success',
          sourceId: sourceName,
          key,
        },
      })
    }
    console.error({ event: 'grab.error', sourceName, key, err: String(error) })
    return err(500, 'Internal Server Error')
  }
}

export const GET = async (request: NextRequest): Promise<Response> => {
  return handler(request, 'GET')
}

export const POST = async (request: NextRequest): Promise<Response> => {
  return handler(request, 'POST')
}

export const PUT = async (request: NextRequest): Promise<Response> => {
  return handler(request, 'PUT')
}

export const PATCH = async (request: NextRequest): Promise<Response> => {
  return handler(request, 'PATCH')
}

export const DELETE = async (request: NextRequest): Promise<Response> => {
  return handler(request, 'DELETE')
}

export const HEAD = async (request: NextRequest): Promise<Response> => {
  return handler(request, 'HEAD')
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
  method: ValidMethod,
): Promise<{ [K in TFields[number]]?: string }> {
  const url = request.nextUrl
  const searchEntries = url.searchParams.entries()
  const argFromQueries = fromEntriesSmart(searchEntries)
  let body = {} as { [K in TFields[number]]?: string }
  try {
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      body = await request.json()
    }
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
