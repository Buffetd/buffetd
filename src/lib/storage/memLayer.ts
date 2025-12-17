import type { PureEntry } from '@/types'
import { redis } from '@/lib/redis'
import { keyHash, normalizeKeyString, redisKeyCache } from '@/lib/key'

export async function getMemEntry(source: string, key: string) {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(source, keyHash(normalized))

  const entry = await redis.get<PureEntry>(cacheKey)
  return entry
}

export async function setMemEntry(source: string, key: string, entry: PureEntry, ttlSec?: number) {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(source, keyHash(normalized))

  const ttl = ttlSec ?? entry.meta?.ttlS ?? 60

  return await redis.set(cacheKey, entry, ttl > 0 ? { ex: ttl } : undefined)
}

export async function delMemEntry(source: string, key: string) {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(source, keyHash(normalized))

  return await redis.del(cacheKey)
}
