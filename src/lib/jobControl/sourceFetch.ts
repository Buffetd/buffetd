function sourceFetch(url: string) {
  const targetUrl = new URL(url)
  const targetUrlParams = {}
  const targetHeaders = {}
  const targetRequestMethod = 'GET'
  const targetRequestBody = null

  const fullUrl = targetUrl.toString()
  const requestInit: RequestInit = {
    method: targetRequestMethod,
    headers: targetHeaders,
    body: targetRequestBody,
  }

  const createRequest = () => {
    return new Request(fullUrl, requestInit)
  }

  const request = createRequest()
  return fetcher(request)
}

function fetcher(request: Request) {
  return fetch(request)
}
