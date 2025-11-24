import type { Metadata, CacheEntry } from '@/lib/types'

export function nowISO(): string {
  return new Date().toISOString()
}

export function computeExpiresAt(ttlSec: number): string | null {
  if (!ttlSec || ttlSec <= 0) return null
  return new Date(Date.now() + ttlSec * 1000).toISOString()
}

export function isStale(meta: Pick<Metadata, 'expires_at'>): boolean {
  if (!meta.expires_at) return false
  return Date.now() >= Date.parse(meta.expires_at)
}
