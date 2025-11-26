import { getPayload } from 'payload'
import config from '@payload-config'

import type { CacheEntry } from '@/lib/types'
import { keyHash, normalizeKeyString } from '@/lib/key'

export async function dbGetCacheEntry(sourceId: string, key: string) {
  const payload = await getPayload({ config })

  const normalized = normalizeKeyString(key)
  const hashKey = keyHash(normalized)

  const res = await payload.find({
    collection: 'caches',
    where: { source_id: { equals: sourceId }, key: { equals: hashKey } },
  })
  return res.docs[0]
}

export async function dbSetCacheEntry<T>(sourceId: string, key: string, entry: CacheEntry<T>) {
  const payload = await getPayload({ config })

  const normalized = normalizeKeyString(key)
  const hashKey = keyHash(normalized)
  const meta = entry.metadata
  const data = entry.data
  await payload.create({
    collection: 'caches',
    data: {
      cid: hashKey,
      metadata: meta,
      data: data as unknown as Record<string, unknown>,
    },
  })
}

export async function dbDelCacheEntry(sourceId: string, key: string) {
  const payload = await getPayload({ config })
  const normalized = normalizeKeyString(key)
  const hashKey = keyHash(normalized)
  const res = await payload.delete({
    collection: 'caches',
    where: { source_id: { equals: sourceId }, key_hash: { equals: hashKey } },
  })
  return res.docs.length ?? 0
}

export type PoolItem = {
  sourceId: string
  cacheId: string
  poolKey: string
  metadata: Record<string, unknown>
  data: Record<string, unknown>
}
export async function dbPoolAddItem(item: PoolItem) {
  const payload = await getPayload({ config })

  const { sourceId, cacheId, poolKey, metadata, data } = item
  const normalizedKey = normalizeKeyString(poolKey)
  const hashKey = keyHash(normalizedKey)

  await payload.create({
    collection: 'cache_pools',
    data: { source_id: sourceId, cache_id: cacheId, pool_key: hashKey, metadata, data },
  })
}

export async function dbPoolGetItem(sourceId: string, cacheId: string, poolKey: string) {
  const payload = await getPayload({ config })

  const normalized = normalizeKeyString(poolKey)
  const hashKey = keyHash(normalized)

  const res = await payload.find({
    collection: 'cache_pools',
    where: { source_id: { equals: sourceId }, cache_id: { equals: cacheId }, pool_key: { equals: hashKey } },
  })
  return res.docs[0]
}

export async function dbPoolGetRandom(sourceId: string, cacheId: string) {
  const payload = await getPayload({ config })

  const res = await payload.find({
    collection: 'cache_pools',
    where: { source_id: { equals: sourceId }, cache_id: { equals: cacheId } },
    limit: 1,
    sort: 'random()',
  })
  return res.docs[0]
}
