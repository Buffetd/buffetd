import { createHash } from 'node:crypto'

type CacheType = 'cache' | 'pool' | 'dedup' | 'idemp' | 'hot' | 'hotcd' | 'queue' | 'task'
function getKeyPrefix(type: CacheType) {
  switch (type) {
    case 'cache':
      return 'buffetd:cache'
    case 'pool':
      return 'buffetd:pool'
    case 'dedup':
      return 'buffetd:dedup'
    case 'idemp':
      return 'buffetd:idemp'
    case 'hot':
      return 'buffetd:hot'
    case 'hotcd':
      return 'buffetd:hotcd'
    case 'queue':
      return 'buffetd:queue'
    case 'task':
      return 'buffetd:task'
    default:
      return 'buffetd'
  }
}

function get(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k: string) => {
    if (acc == null) return undefined
    if (typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[k]
  }, obj)
}

export function templateKey(template: string, params: Record<string, string>): string {
  const s = template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, p1) => {
    const v = get(params, p1)
    return v == null ? '' : String(v)
  })
  return normalizeKeyString(s)
}

export function normalizeKeyString(key: string) {
  if (!key) return '/'
  let s = String(key).trim()
  // If the key is URL-encoded, try decoding once; ignore failures
  try {
    s = decodeURIComponent(s)
  } catch {}
  // Normalize leading slash and remove redundant slashes
  if (!s.startsWith('/')) s = '/' + s
  // Collapse multiple slashes into a single slash
  s = s.replace(/\/{2,}/g, '/')
  // Remove trailing slash (except for root)
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1)
  return s
}

export function keyHash(key: string) {
  return createHash('sha1').update(key).digest('hex')
}

/**
 * Redis Key Generator Start
 * ==================
 */

export function redisKeyCache(name: string, hash: string) {
  return `buffetd:cache:${name}:${hash}`
}

export function redisKeyDedup(name: string, hash: string) {
  return `buffetd:dedup:${name}:${hash}`
}

export function redisKeyIdemp(hash: string) {
  return `buffetd:idemp:${hash}`
}

export function redisKeyHot(name: string, hash: string) {
  return `buffetd:hot:${name}:${hash}`
}

export function redisKeyHotCooldown(name: string, hash: string) {
  return `buffetd:hotcd:${name}:${hash}`
}

export function redisQueueKey(name: string) {
  return `buffetd:queue:${name}`
}

export function redisTaskKey(name: string) {
  return `buffetd:task:${name}`
}

export function redisKeyPool(name: string, hash: string) {
  return `buffetd:pool:${name}:${hash}`
}

// Pool keys for list/pool support
export function redisKeyPoolIds(source_id: string, key_hash: string) {
  return `buffetd:pool:ids:${source_id}:${key_hash}`
}

export function redisKeyPoolItem(source_id: string, key_hash: string, item_id: string) {
  return `buffetd:pool:item:${source_id}:${key_hash}:${item_id}`
}

/**
 * Redis Key Generator End
 * ==================
 */

// For pool mode only:
// - Decode and normalize path
// - Keep business query params but remove transient dedupe param `i` (added by scheduler/prefetch)
// - Ignore fragments (#...)
export function sanitizePoolKey(raw: string): string {
  try {
    const normalized = normalizeKeyString(String(raw ?? ''))
    // Parse with a dummy base to easily extract pathname and query
    const u = new URL(normalized, 'http://buffetd.local')
    // Remove nonce param used for dedupe
    u.searchParams.delete('i')
    const qs = u.searchParams.toString()
    const path = u.pathname || '/'
    return qs ? `${path}?${qs}` : path
  } catch {
    // Fallback: at least keep a normalized path prefix
    return normalizeKeyString(String(raw ?? ''))
  }
}
