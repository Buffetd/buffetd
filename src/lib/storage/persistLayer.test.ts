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
    update: vi.fn(async ({ id, data }: { id: string | number; data: { source: string; key: string } }) => {
      // For tests, treat id as opaque and use (source,key) as the storage key
      store.set(idFor(data.source, data.key), { ...data, id })
      return { ...data, id }
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
    const entries = await getPersistEntry('source', 'key')
    expect(entries).toEqual([])
  })

  it('setPersistEntry + getPersistEntry', async () => {
    await setPersistEntry({
      source: 'source',
      key: 'key',
      identityValue: 'source:key:nonpool',
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

    const entries = await getPersistEntry('source', 'key')
    expect(entries.length).toBe(1)
    expect((entries[0] as { value?: unknown })?.value).toBe('value')
  })

  it('delPersistEntry returns number of deleted docs', async () => {
    await setPersistEntry({
      source: 'source',
      key: 'key',
      identityValue: 'source:key:nonpool',
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

    const entries = await getPersistEntry('source', 'key')
    expect(entries).toEqual([])
  })
})
