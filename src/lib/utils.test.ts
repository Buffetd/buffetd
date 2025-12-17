import { describe, it, expect, vi } from 'vitest'

import { computeExpiresAt, withTimeout } from './utils'

describe('utils', () => {
  it('should compute expires at', () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)

    expect(computeExpiresAt(60)).toBe(new Date(now + 60 * 1000).toISOString())

    vi.restoreAllMocks()
  })

  it('should timeout', async () => {
    await expect(
      withTimeout(() => new Promise((resolve) => setTimeout(() => resolve('done'), 1000)), 500),
    ).rejects.toThrowError('TIMEOUT')
  })
})
