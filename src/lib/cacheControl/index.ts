import type { CacheEntry } from '@/lib/types'
import { redis } from '@/lib/redis'
import { keyHash, normalizeKeyString, redisKeyCache } from '@/lib/key'

import { dbGetCacheEntry, dbPoolAddItem, dbSetCacheEntry } from './persist'

export async function getCacheEntry<T>(sourceId: string, key: string) {
  const entry = await getMemCacheEntry<T>(sourceId, key)
  if (entry) return entry

  return getPersistCacheEntry(sourceId, key)
}

async function getMemCacheEntry<T>(sourceId: string, key: string) {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(sourceId, keyHash(normalized))

  const entry = await redis.get<CacheEntry<T>>(cacheKey)
  return entry
}

async function getPersistCacheEntry(sourceId: string, key: string) {
  const entry = await dbGetCacheEntry(sourceId, key)
  return entry
}

export interface CacheOptions {
  ttlSec?: number // Override TTL; defaults to meta.ttl_s
  persist?: boolean // Whether to persist to Postgres; default true
}

export async function setCacheEntry<T>(
  sourceId: string,
  key: string,
  entry: CacheEntry<T>,
  opts: CacheOptions,
): Promise<void> {
  await setMemCacheEntry(sourceId, key, entry, opts.ttlSec)
  if (opts.persist !== false) await setPersistCacheEntry(sourceId, key, entry)
}

async function setMemCacheEntry<T>(sourceId: string, key: string, entry: CacheEntry<T>, ttlSec?: number) {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(sourceId, keyHash(normalized))
  const ttl = ttlSec ?? entry?.metadata?.ttl_s ?? 60

  await redis.set(cacheKey, entry, ttl > 0 ? { ex: ttl } : undefined)
}

async function setPersistCacheEntry<T>(sourceId: string, key: string, entry: CacheEntry<T>) {
  try {
    const isPoolJob = key.startsWith('/pool:')
    if (isPoolJob) {
      dbPoolAddItem({
        sourceId,
        cacheId: key,
        poolKey: key,
        metadata: entry.metadata,
        data: entry.data as unknown as Record<string, unknown>,
      })
    } else {
      dbSetCacheEntry(sourceId, key, entry)
    }
  } catch (error) {
    console.error({ event: 'runner.cache_persist_error', sourceId, key, err: String(error) })
  }
}
