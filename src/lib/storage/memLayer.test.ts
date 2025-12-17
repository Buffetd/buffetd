import { beforeAll, describe, it, expect, vi } from 'vitest'

import { getMemEntry, setMemEntry, delMemEntry } from './memLayer'

vi.mock('@/lib/redis', () => {
  const store = new Map<string, unknown>()

  return {
    redis: {
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, value: unknown) => {
        store.set(key, value)
        return 'OK'
      }),
      del: vi.fn(async (key: string) => (store.delete(key) ? 1 : 0)),
    },
  }
})

describe('memLayer', () => {
  beforeAll(async () => {
    vi.resetModules()
  })

  it('getMemEntry', async () => {
    const entry = await getMemEntry('source', 'key')
    expect(entry).toBeNull()
  })

  it('setMemEntry', async () => {
    await setMemEntry('source', 'key', {
      source: 'test',
      key: '/',
      meta: {
        sourceId: 1,
        ttlS: 60,
        originStatus: 200,
        dataEncoding: 'text',
        expiresAt: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
      },
      value: 'value',
    })
    const entry = await getMemEntry('source', 'key')
    expect(entry?.value).toBe('value')
  })

  it('delMemEntry', async () => {
    await setMemEntry('source', 'key', {
      source: 'test',
      key: '/',
      meta: {
        sourceId: 1,
        ttlS: 60,
        originStatus: 200,
        dataEncoding: 'text',
        expiresAt: new Date().toISOString(),
        cachedAt: new Date().toISOString(),
      },
      value: 'value',
    })

    await delMemEntry('source', 'key')
    const entry = await getMemEntry('source', 'key')
    expect(entry).toBeNull()
  })
})
