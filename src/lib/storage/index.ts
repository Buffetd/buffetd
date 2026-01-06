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
    const entries = await getPersistEntry(source, key, src.supportsPool ? 10 : 1)
    if (entries.length) {
      // Write to memory layer
      if (src.supportsPool) {
        await setMemEntry(source, key, entries, { ttlSec: 60, supportsPool: true })
        return entries
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
  let supportsPool = options?.supportsPool

  if (supportsPool == null) {
    const payload = await getPayload({ config })
    const sources = await payload.find({ collection: 'sources', where: { name: { equals: entry.source } }, limit: 1 })
    supportsPool = Boolean(sources.docs[0]?.supportsPool)
  }

  supportsPool = Boolean(supportsPool)
  await setMemEntry(entry.source, entry.key, entry, { ttlSec: options?.ttlSec, supportsPool })
  if (options?.persist) await setPersistEntry(entry, { supportsPool })
}

export async function delEntry(source: string, key: string, options?: { pure?: boolean }) {
  await delMemEntry(source, key)
  if (options?.pure) await delPersistEntry(source, key)
}
