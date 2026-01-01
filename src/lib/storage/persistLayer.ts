import { getPayload } from 'payload'
import config from '@payload-config'

import type { PureEntry } from '@/types'

export async function getPersistEntry(source: string, key: string) {
  const payload = await getPayload({ config })

  const res = await payload.find({
    collection: 'entries',
    where: { source: { equals: source }, key: { equals: key } },
  })
  return res.docs
}

export async function setPersistEntry(entry: PureEntry) {
  const payload = await getPayload({ config })

  await payload.create({
    collection: 'entries',
    data: entry,
  })
}

export async function delPersistEntry(source: string, key: string) {
  const payload = await getPayload({ config })

  const res = await payload.delete({
    collection: 'entries',
    where: { source: { equals: source }, key: { equals: key } },
  })
  return res.docs.length ?? 0
}
