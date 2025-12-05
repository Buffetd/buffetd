import type { PureEntry } from '@/types'

import { getMemEntry, setMemEntry, delMemEntry } from './memLayer'
import { getPersistEntry, setPersistEntry, delPersistEntry } from './persistLayer'

export async function getEntry(source: string, key: string, options?: { fallback?: boolean }) {
  const entry = await getMemEntry(source, key)
  if (entry) return entry

  return options?.fallback ? getPersistEntry(source, key) : null
}

export async function setEntry(entry: PureEntry, options?: { persist?: boolean; ttlSec?: number }) {
  await setMemEntry(entry.source, entry.key, entry, options?.ttlSec)
  if (options?.persist) await setPersistEntry(entry)
}

export async function delEntry(source: string, key: string, options?: { pure?: boolean }) {
  await delMemEntry(source, key)
  if (options?.pure) await delPersistEntry(source, key)
}
