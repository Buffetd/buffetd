import { getPayload } from 'payload'
import config from '@payload-config'

import type { CacheMeta, CacheEntry } from './types'
import { redis } from './redis'
import { keyHash, normalizeKeyString, redisKeyCache } from './key'
import { dbSetCacheEntry } from './cache-db'

const payload = await getPayload({ config })

function nowISO(): string {
  return new Date().toISOString()
}

export function computeExpiresAt(ttl_s: number): string | null {
  if (!ttl_s || ttl_s <= 0) return null
  return new Date(Date.now() + ttl_s * 1000).toISOString()
}

export function isStale(meta: Pick<CacheMeta, 'expires_at'>): boolean {
  if (!meta.expires_at) return false
  return Date.now() >= Date.parse(meta.expires_at)
}

export async function getCacheEntry<T = unknown>(source_id: string, key: string): Promise<CacheEntry<T> | null> {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(source_id, keyHash(normalized))

  const val = await redis.get<CacheEntry<T>>(cacheKey)
  if (val) {
    return val
  }

  return null
}

export interface SetCacheEntryOptions {
  ttl_s?: number // Override TTL; defaults to meta.ttl_s
  persistToPg?: boolean // Whether to persist to Postgres; default true
}

export async function setCacheEntry<T extends Record<string, unknown>>(
  source_id: string,
  key: string,
  entry: CacheEntry<T>,
  opts: SetCacheEntryOptions = {},
): Promise<void> {
  const normalized = normalizeKeyString(key)
  const cacheKey = redisKeyCache(source_id, keyHash(normalized))
  const ttl = opts.ttl_s ?? entry?.metadata?.ttl_s ?? 60

  const copy: CacheEntry<T> = {
    ...entry,
    metadata: {
      ...entry.metadata,
      source_id,
      key: normalized,
      cached_at: nowISO(),
      stale: isStale(entry.metadata),
    },
  }

  if (ttl && ttl > 0) {
    await redis.set(cacheKey, copy, { ex: ttl })
  } else {
    await redis.set(cacheKey, copy)
  }
  // Write-through to Postgres by default; can be disabled via opts.persistToPg
  const persist = opts.persistToPg !== false
  if (persist) {
    // await pgSetCacheEntry(source_id, key, copy);
    console.log(copy)
    try {
      dbSetCacheEntry(source_id, key, copy)
    } catch (error) {
      console.error({ event: 'runner.cache_persist_error', source_id, key, err: String(error) })
    }
  }
}
