import type { EntryMetadata } from '@/types'

export function nowISO(): string {
  return new Date().toISOString()
}

export function computeExpiresAt(ttlSec: number): string | null {
  if (!ttlSec || ttlSec <= 0) return null
  return new Date(Date.now() + ttlSec * 1000).toISOString()
}

export function isStale(meta: Pick<EntryMetadata, 'expiresAt'>): boolean {
  if (!meta.expiresAt) return false
  return Date.now() >= Date.parse(meta.expiresAt)
}

export function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
  return Promise.race<T>([fn(), timeout])
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
