import { getPayload } from 'payload'
import config from '@payload-config'

import type { PureEntry } from '@/types'

import { getMemEntry, setMemEntry, delMemEntry } from './memLayer'
import { getPersistEntry, setPersistEntry, delPersistEntry } from './persistLayer'

export async function getEntry(source: string, key: string, options?: { fallback?: boolean }) {
  const payload = await getPayload({ config })

  const sources = await payload.find({ collection: 'sources', where: { name: { equals: source } } })
  if (sources.docs.length === 0) return null
  // const src = sources.docs[0]

  // if (src.supportsPool) {
  //   return null
  // }

  const entry = await getMemEntry(source, key)
  if (entry) return entry

  if (options?.fallback) {
    const entry = await getPersistEntry(source, key)
    if (entry) {
      // Write to memory layer
      await setMemEntry(source, key, entry, 60)
      return entry
    }
    return null
  }

  return null
}

export async function setEntry(entry: PureEntry, options?: { persist?: boolean; ttlSec?: number }) {
  await setMemEntry(entry.source, entry.key, entry, options?.ttlSec)
  if (options?.persist) await setPersistEntry(entry)
}

export async function delEntry(source: string, key: string, options?: { pure?: boolean }) {
  await delMemEntry(source, key)
  if (options?.pure) await delPersistEntry(source, key)
}
