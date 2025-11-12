import { type NextRequest, NextResponse } from 'next/server'

type ErrorResponse = { error: string }
type SuccessResponse<T> = { data: T }
type Response<T> = ErrorResponse | SuccessResponse<T>

function json<D>(data: D, status: number, statusText: string, headers: HeadersInit) {
  return NextResponse.json(data, { status, statusText, headers })
}

function res<T>(data: T, status = 200, statusText = 'OK', headers: HeadersInit = {}) {
  return json(data, status, statusText, headers)
}

// Shorthand
export function ok<T>(data: T, headers: HeadersInit = {}) {
  return res(data, 200, 'OK', headers)
}

export function err(status: number, message: string, headers: HeadersInit = {}): NextResponse<ErrorResponse> {
  return res({ error: message }, status, 'error', headers)
}

export function notAllowed(methods: string[], headers: HeadersInit = {}) {
  return err(405, 'Method not allowed', { ...headers, allow: methods.join(', ') })
}

export function notFound(headers: HeadersInit = {}) {
  return err(404, 'Not found', headers)
}

export function internalError(headers: HeadersInit = {}) {
  return err(500, 'Internal server error', headers)
}
