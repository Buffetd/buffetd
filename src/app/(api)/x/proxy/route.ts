import { getPayload } from 'payload'
import config from '@payload-config'

import { type NextRequest, NextResponse } from 'next/server'

import type { ValidMethod } from '@/types'
import { runJobImmediatly } from '@/tasks/helper'
import { withTimeout } from '@/lib/utils'
import { ok, err } from '@/lib/helpers/response'
import { getEntry } from '@/lib/storage'

import { enqueueFetchSourceEntryTask } from '@/lib/jobControl/enqueue'
import { autoCreateSource } from '@/lib/jobControl/source'
import { fetchTargetDirect } from '@/lib/jobControl/sourceFetch'

type BypassRequestInit = Omit<RequestInit, 'method' | 'body' | 'headers'>

async function handler(request: NextRequest, method: ValidMethod): Promise<Response> {
  const payload = await getPayload({ config })

  const search = request.nextUrl.searchParams
  const targetUrl = search.get('url')

  if (!targetUrl) {
    return NextResponse.json({ message: 'Missing target URL' }, { status: 400 })
  }

  /**
   * 1. Check Cache
   */
  const url = new URL(targetUrl)
  const key = url.href.replace(url.origin, '')
  const src = await autoCreateSource(targetUrl)
  const entry = await getEntry(src.name!, key, { fallback: true })
  if (entry) {
    console.info({ event: 'proxy.hit', sourceName: src.name!, key })
    return ok({ message: entry }, { 'X-Buffetd': `Proxy hit cache ${method} ${targetUrl}` })
  }

  const clientReqBody = method === 'POST' ? await request.json() : undefined
  const clientReqHeaders = request.headers
  const forwardedHeaders: Record<string, string> = {}
  const bypassRequestInit: BypassRequestInit = {}
  for (const [key, value] of clientReqHeaders) {
    if (key.startsWith('x-buffetd-')) {
      const headerKey = key.replace('x-buffetd-', '')
      forwardedHeaders[headerKey] = value
    }
    if (key.startsWith('x-request-init-')) {
      const initKey = key.replace('x-request-init-', '') as keyof BypassRequestInit

      switch (initKey) {
        case 'cache':
          bypassRequestInit.cache = value as RequestCache
          break
        case 'credentials':
          bypassRequestInit.credentials = value as RequestCredentials
          break
        case 'integrity':
          bypassRequestInit.integrity = value
          break
        case 'keepalive':
          bypassRequestInit.keepalive = value === 'true'
          break
        case 'mode':
          bypassRequestInit.mode = value as RequestMode
          break
        case 'referrer':
          bypassRequestInit.referrer = value
          break
        case 'referrerPolicy':
          bypassRequestInit.referrerPolicy = value as ReferrerPolicy
          break
        default:
          break
      }
    }
  }

  console.info({ event: 'proxy.route', method, targetUrl, reqBody: clientReqBody })

  try {
    /**
     * 2. Origin Fetch
     */
    // throw new Error('TIMEOUT')
    const message = await withTimeout(
      fetchTargetDirect.bind(null, targetUrl, {
        method,
        body: clientReqBody,
        headers: forwardedHeaders,
        ...bypassRequestInit,
      }),
      5000,
    )

    console.info({ event: 'proxy.fetch', meta: message.meta })

    runJobImmediatly('tSaveEntry', {
      entry: {
        source: src.name!,
        key,
        meta: {
          sourceId: src.id,
          ttlS: 60,
          originStatus: 200,
          contentType: message.meta.targetResHeaders.get('content-type'),
          dataEncoding: message.meta.targetResContentType?.includes('json') ? 'json' : 'text',
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
        },
        value: message.value,
      },
      persist: true,
      ttlSec: 60,
    }).catch((e) => {
      console.error({ event: 'proxy.save_entry_error', targetUrl, err: String(e) })
    })

    return ok({ message }, { 'X-Buffetd': `Proxy ${method} ${targetUrl}` })
  } catch (error) {
    console.error({ event: 'proxy.fetch_error', targetUrl, err: String(error) })
    /**
     * 3. Schedule Job
     */
    if (error instanceof Error && error.message === 'TIMEOUT') {
      const result = await enqueueFetchSourceEntryTask(src.name!, '', method)

      console.info({ event: 'proxy.enqueued', sourceName: src.name!, cacheKey: '', result })

      // const r = await enqueueRefresh({
      //   sourceId: `${src.id}`,
      //   key: '',
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
          sourceId: src.name!,
          key: '',
        },
      })
    }
    return err(500, (error as Error).message ?? 'Internal Server Error')
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
