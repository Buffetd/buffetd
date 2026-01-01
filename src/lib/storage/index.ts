import { getPayload } from 'payload'
import config from '@payload-config'

import type { PureEntry } from '@/types'

import { getMemEntry, setMemEntry, delMemEntry } from './memLayer'
import { getPersistEntry, setPersistEntry, delPersistEntry } from './persistLayer'

export async function getEntry(source: string, key: string, options?: { fallback?: boolean }) {
  const payload = await getPayload({ config })

  const sources = await payload.find({ collection: 'sources', where: { name: { equals: source } } })
  if (sources.docs.length === 0) return null
  const src = sources.docs[0]

  const entry = await getMemEntry(source, key, { supportsPool: !!src.supportsPool })
  if (entry) return entry

  if (options?.fallback) {
    const entries = await getPersistEntry(source, key)
    if (entries.length) {
      // Write to memory layer
      if (src.supportsPool) {
        await setMemEntry(source, key, entries, { ttlSec: 60, supportsPool: true })
        // Random choice from pool
        const randomIndex = Math.floor(Math.random() * entries.length)
        return entries[randomIndex]
      }
      await setMemEntry(source, key, entries[0], { ttlSec: 60 })
      return entries[0]
    }
    return null
  }

  return null
}

export async function setEntry(
  entry: PureEntry,
  options?: { persist?: boolean; ttlSec?: number; supportsPool?: boolean },
) {
  await setMemEntry(entry.source, entry.key, entry, { ttlSec: options?.ttlSec, supportsPool: options?.supportsPool })
  if (options?.persist) await setPersistEntry(entry)
}

export async function delEntry(source: string, key: string, options?: { pure?: boolean }) {
  await delMemEntry(source, key)
  if (options?.pure) await delPersistEntry(source, key)
}
