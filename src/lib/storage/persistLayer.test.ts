import { beforeAll, describe, it, expect, vi } from 'vitest'

import { getPersistEntry, setPersistEntry, delPersistEntry } from './persistLayer'

vi.mock('@payload-config', () => ({
  default: {},
}))

vi.mock('payload', () => {
  const store = new Map<string, unknown>()
  const idFor = (source: string, key: string) => `${source}:${key}`

  const payloadClient = {
    find: vi.fn(async ({ where }: { where: { source: { equals: string }; key: { equals: string } } }) => {
      const source = where.source.equals
      const key = where.key.equals
      const doc = store.get(idFor(source, key)) ?? null
      return { docs: doc ? [doc] : [] }
    }),
    create: vi.fn(async ({ data }: { data: { source: string; key: string } }) => {
      store.set(idFor(data.source, data.key), data)
      return data
    }),
    delete: vi.fn(async ({ where }: { where: { source: { equals: string }; key: { equals: string } } }) => {
      const source = where.source.equals
      const key = where.key.equals
      const deleted = store.delete(idFor(source, key))
      return { docs: deleted ? [{}] : [] }
    }),
  }

  return {
    getPayload: vi.fn(async () => payloadClient),
  }
})

describe('persistLayer', () => {
  beforeAll(async () => {
    vi.resetModules()
  })

  it('getPersistEntry returns undefined when not found', async () => {
    const entry = await getPersistEntry('source', 'key')
    expect(entry).toBeUndefined()
  })

  it('setPersistEntry + getPersistEntry', async () => {
    await setPersistEntry({
      source: 'source',
      key: 'key',
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

    const entry = await getPersistEntry('source', 'key')
    expect(entry).toBeTruthy()
    expect(entry?.value).toBe('value')
  })

  it('delPersistEntry returns number of deleted docs', async () => {
    await setPersistEntry({
      source: 'source',
      key: 'key',
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

    const deleted = await delPersistEntry('source', 'key')
    expect(deleted).toBe(1)

    const entry = await getPersistEntry('source', 'key')
    expect(entry).toBeUndefined()
  })
})
