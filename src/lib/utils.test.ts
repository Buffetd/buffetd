import { describe, it, expect } from 'vitest'

import { computeExpiresAt, withTimeout } from './utils'

describe('utils', () => {
  it('should compute expires at', () => {
    expect(computeExpiresAt(60)).toBe(new Date(Date.now() + 60 * 1000).toISOString())
  })

  it('should timeout', async () => {
    await expect(
      withTimeout(() => new Promise((resolve) => setTimeout(() => resolve('done'), 1000)), 500),
    ).rejects.toThrowError('TIMEOUT')
  })
})
