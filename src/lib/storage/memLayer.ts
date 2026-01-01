import type { PureEntry } from '@/types'
import { redis } from '@/lib/redis'
import { keyHash, normalizeKeyString, redisKeyCache } from '@/lib/key'

export async function getMemEntry(source: string, key: string, options?: { supportsPool?: boolean }) {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(source, keyHash(normalized))

  if (options?.supportsPool) {
    const poolKey = `pool:${cacheKey}`
    const poolEntries = await redis.lrange(poolKey, 0, 9)
    if (poolEntries.length > 0) {
      return poolEntries as unknown as PureEntry[]
    }
    return null
  }

  const entry = await redis.get<PureEntry>(cacheKey)
  return entry
}

type EntryOptions = {
  ttlSec?: number
  supportsPool?: boolean
}
export async function setMemEntry(source: string, key: string, entry: PureEntry | PureEntry[], options?: EntryOptions) {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(source, keyHash(normalized))

  const supportsPool = options?.supportsPool ?? false

  // For pool entries, we might want to store them differently
  if (supportsPool && Array.isArray(entry)) {
    // Handle pool entries separately if needed
    return await redis.lpush(`pool:${cacheKey}`, JSON.stringify(entry))
  }

  const ttl = options?.ttlSec ?? (Array.isArray(entry) ? 60 : entry.meta?.ttlS) ?? 60
  return await redis.set(cacheKey, entry, ttl > 0 ? { ex: ttl } : undefined)
}

export async function delMemEntry(source: string, key: string) {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(source, keyHash(normalized))

  return await redis.del(cacheKey)
}
