import { describe, it, expect } from 'vitest'

import { ok, err, notAllowed, notFound, internalError } from './response'

describe('response helpers', () => {
  it('should create ok response', () => {
    const response = ok({ message: 'success' })
    expect(response.status).toBe(200)
    expect(response.statusText).toBe('OK')
  })

  it('should create error response', () => {
    const response = err(404, 'Not found')
    expect(response.status).toBe(404)
    expect(response.statusText).toBe('error')
    expect(response.headers.get('content-type')).toBe('application/json')
  })

  it('should create not allowed response', () => {
    const response = notAllowed(['GET', 'POST'])
    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, POST')
  })

  it('should create not found response', () => {
    const response = notFound()
    expect(response.status).toBe(404)
  })

  it('should create internal error response', () => {
    const response = internalError()
    expect(response.status).toBe(500)
  })
})
