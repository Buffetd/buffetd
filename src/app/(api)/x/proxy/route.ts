import { type NextRequest, NextResponse } from 'next/server'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

type BypassRequestInit = Omit<RequestInit, 'method' | 'body' | 'headers'>

async function handler(request: NextRequest, method: Method): Promise<Response> {
  const search = request.nextUrl.searchParams
  const targetUrl = search.get('url')
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

  if (!targetUrl) {
    return NextResponse.json({ message: 'Missing target URL' }, { status: 400 })
  }

  const response = await fetch(targetUrl, {
    method,
    body: clientReqBody,
    headers: forwardedHeaders,
    ...bypassRequestInit,
  })

  const targetResHeaders = response.headers

  const resContentType = targetResHeaders.get('content-type')
  const resType = resContentType?.includes('json') ? 'json' : 'text'

  const message = {
    source: await response[resType](),
    meta: {
      method,
      targetUrl,
      clientReqHeaders: request.headers,
      clientReqBody,
      targetResHeaders,
      targetResContentType: resContentType,
    },
  }

  return NextResponse.json({ message }, { headers: { 'X-Buffetd': `Proxy ${method} ${targetUrl}` } })
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
