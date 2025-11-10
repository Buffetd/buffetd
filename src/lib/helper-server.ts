type Headers = Record<string, string>

export function json(data: unknown, status = 200, headers: Headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

export function error(status: number, message: string, headers?: Headers) {
  return json({ error: message }, status, headers)
}

export function methodNotAllowedFallback() {
  return error(405, 'Method not allowed')
}
