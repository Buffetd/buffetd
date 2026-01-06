import type { PureEntry } from '@/types'
import { redis } from '@/lib/redis'
import { keyHash, normalizeKeyString, redisKeyCache, redisKeyPool } from '@/lib/key'
import { getPersistEntry } from './persistLayer'

export async function getMemEntry(source: string, key: string, options?: { supportsPool?: boolean }) {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(source, keyHash(normalized))

  if (options?.supportsPool) {
    const poolKey = redisKeyPool(source, keyHash(normalized))
    console.log('poolKey:', poolKey)
    const poolEntries = await redis.lrange(poolKey, 0, 9)
    console.log('pool lookup:', { poolKey, poolEntriesLength: poolEntries.length })
    if (poolEntries.length > 0) {
      if (poolEntries.length <= 1) {
        const entries = await getPersistEntry(source, key, 10)
        console.log('Refreshing pool entry from persist layer', entries.length, entries)
        if (entries.length > 0) {
          // Refresh the pool with fresh data
          await redis.del(poolKey)
          await setMemEntry(source, key, entries, { ttlSec: 3600, supportsPool: true })
          return entries as unknown as PureEntry[]
        }
      }

      const parsed = poolEntries
        .map((e) => {
          if (typeof e !== 'string') return null
          try {
            return JSON.parse(e) as PureEntry
          } catch {
            return null
          }
        })
        .filter(Boolean) as PureEntry[]

      return parsed.length ? parsed : null
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
    const poolKey = redisKeyPool(source, keyHash(normalized))
    const ttl = options?.ttlSec ?? 60

    // Clear existing pool entries and add new ones
    await redis.del(poolKey)

    // Push all entries at once
    const stringEntries = entry.map((e) => JSON.stringify(e))
    await redis.rpush(poolKey, ...stringEntries)

    // Set TTL on the pool key
    if (ttl > 0) {
      await redis.expire(poolKey, ttl)
    }

    return entry.length
  }

  if (supportsPool && !Array.isArray(entry)) {
    const poolKey = redisKeyPool(source, keyHash(normalized))
    const ttl = options?.ttlSec ?? entry.meta?.ttlS ?? 60

    await redis.lpush(poolKey, JSON.stringify(entry))
    await redis.ltrim(poolKey, 0, 9)

    if (ttl > 0) {
      await redis.expire(poolKey, ttl)
    }

    return 1
  }

  const ttl = options?.ttlSec ?? (Array.isArray(entry) ? 60 : entry.meta?.ttlS) ?? 60
  return await redis.set(cacheKey, entry, ttl > 0 ? { ex: ttl } : undefined)
}

export async function delMemEntry(source: string, key: string) {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(source, keyHash(normalized))

  return await redis.del(cacheKey)
}
