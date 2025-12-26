// import ky from 'ky'
import { getPayload } from 'payload'
import config from '@payload-config'

// import { withTimeout, sleep } from '@/lib/utils'

interface SourceFetchOptions {
  attempts?: number
  baseDelayMs?: number
  timeoutMs?: number
}

export function fetchTargetDirect(url: string, init?: RequestInit, options?: SourceFetchOptions) {
  return fetchTargetWithParsed(url, init, options)
}

export async function fetchTargetWithSource(
  name: string,
  key: string,
  init?: RequestInit,
  options?: SourceFetchOptions,
) {
  const payload = await getPayload({ config })

  const sources = await payload.find({ collection: 'sources', where: { name: { equals: name } } })

  if (sources.docs.length === 0) {
    throw new Error(`Source ${name} not found`)
  }

  const source = sources.docs[0]

  const url = source.baseUrl + key

  return fetchTargetWithParsed(url, init, options)
}

export async function fetchTargetWithParsed(url: string, init?: RequestInit, options?: SourceFetchOptions) {
  const response = await fetchTarget(url, init, options)

  const targetResHeaders = response.headers
  const resContentType = targetResHeaders.get('content-type')
  const resType = resContentType?.includes('json') ? 'json' : 'text'

  const message = {
    value: await response[resType](),
    meta: {
      method: init?.method,
      targetUrl: url,
      clientReqHeaders: init?.headers,
      clientReqBody: init?.body,
      targetResHeaders,
      targetResContentType: resContentType,
    },
  }

  return message
}

export function fetchTarget(url: string, init?: RequestInit, _options?: SourceFetchOptions) {
  return fetcher(new Request(url, init))
}

function fetcher(request: Request) {
  return fetch(request)
}
