import { getPayload } from 'payload'
import config from '@payload-config'

import type { CacheMeta, CacheEntry } from './types'
import { keyHash, normalizeKeyString, redisKeyCache } from './key'

const payload = await getPayload({ config })

export async function dbGetCacheEntry(sourceId: string, key: string) {
  const normalized = normalizeKeyString(key)
  const hashKey = keyHash(normalized)

  const res = await payload.find({
    collection: 'caches',
    where: { source_id: { equals: sourceId }, key_hash: { equals: hashKey } },
  })
  return res.docs[0]
}

export async function dbSetCacheEntry<T extends Record<string, unknown>>(
  sourceId: string,
  key: string,
  entry: CacheEntry<T>,
) {
  const normalized = normalizeKeyString(key)
  const hashKey = keyHash(normalized)
  const meta = entry.metadata
  const data = entry.data
  await payload.create({
    collection: 'caches',
    data: { cid: hashKey, metadata: meta as unknown as Record<string, unknown>, data: data },
  })
}

export async function dbDelCacheEntry(sourceId: string, key: string) {
  const normalized = normalizeKeyString(key)
  const hashKey = keyHash(normalized)
  const res = await payload.delete({
    collection: 'caches',
    where: { source_id: { equals: sourceId }, key_hash: { equals: hashKey } },
  })
  return res.docs.length ?? 0
}
