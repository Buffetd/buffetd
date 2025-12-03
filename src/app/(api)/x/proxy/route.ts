import { type NextRequest, NextResponse } from 'next/server'

import type { CacheEntry, EnqueueResult, ValidMethod } from '@/lib/types'
import { withTimeout } from '@/lib/utils'
import { ok, err } from '@/lib/helpers/response'
import { enqueueFetchSourceEntryTask } from '@/lib/jobControl/enqueue'
import { autoCreateSource } from '@/lib/jobControl/source'
import { fetchTargetDirect } from '@/lib/jobControl/sourceFetch'

type BypassRequestInit = Omit<RequestInit, 'method' | 'body' | 'headers'>

async function handler(request: NextRequest, method: ValidMethod): Promise<Response> {
  const search = request.nextUrl.searchParams
  const targetUrl = search.get('url')

  if (!targetUrl) {
    return NextResponse.json({ message: 'Missing target URL' }, { status: 400 })
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

  const src = await autoCreateSource(targetUrl)

  try {
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
    return NextResponse.json({ message }, { headers: { 'X-Buffetd': `Proxy ${method} ${targetUrl}` } })
  } catch (error) {
    console.error({ event: 'proxy.fetch_error', targetUrl, err: String(error) })
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

export const OPTIONS = async (request: NextRequest): Promise<Response> => {
  return handler(request, 'OPTIONS')
}

// Unsupported
// export const CONNECT = async (request: NextRequest): Promise<Response> => {
//   return handler(request, 'CONNECT')
// }

// Unsupported
// export const TRACE = async (request: NextRequest): Promise<Response> => {
//   return handler(request, 'TRACE')
// }
