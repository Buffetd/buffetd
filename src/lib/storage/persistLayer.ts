import { getPayload } from 'payload'
import config from '@payload-config'

import type { PureEntry } from '@/types'

export async function getPersistEntry(source: string, key: string, limit = 0, sort?: string) {
  const payload = await getPayload({ config })

  const res = await payload.find({
    collection: 'entries',
    ...(limit > 0 ? { limit } : {}),
    where: { source: { equals: source }, key: { equals: key } },
    sort: sort ?? '-createdAt',
  })
  return res.docs
}

export async function setPersistEntry(entry: PureEntry, options?: { supportsPool?: boolean }) {
  const payload = await getPayload({ config })

  const supportsPool = options?.supportsPool ?? false

  const data = {
    ...entry,
    identityValue: entry.identityValue ?? '',
  }

  if (!supportsPool) {
    const existing = await payload.find({
      collection: 'entries',
      where: { source: { equals: entry.source }, key: { equals: entry.key } },
      limit: 1,
      depth: 0,
    })

    const doc = existing.docs[0] as { id?: string | number } | undefined
    if (doc?.id != null) {
      await payload.update({
        collection: 'entries',
        id: doc.id,
        data,
      })
      return
    }
  }

  try {
    await payload.create({
      collection: 'entries',
      data,
      draft: false,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)

    // Pool mode: duplicated identityValue means duplicated response variant.
    if (supportsPool && msg.toLowerCase().includes('duplicate')) return
    if (supportsPool && msg.toLowerCase().includes('unique')) return

    // Non-pool mode: race condition fallback - update by (source,key).
    if (!supportsPool) {
      const existing = await payload.find({
        collection: 'entries',
        where: { source: { equals: entry.source }, key: { equals: entry.key } },
        limit: 1,
        depth: 0,
      })
      const doc = existing.docs[0] as { id?: string | number } | undefined
      if (doc?.id != null) {
        await payload.update({
          collection: 'entries',
          id: doc.id,
          data,
        })
        return
      }
    }

    throw e
  }
}

export async function delPersistEntry(source: string, key: string) {
  const payload = await getPayload({ config })

  const res = await payload.delete({
    collection: 'entries',
    where: { source: { equals: source }, key: { equals: key } },
  })
  return res.docs.length ?? 0
}
