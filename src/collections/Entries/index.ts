import type { CollectionConfig } from 'payload'
import * as z from 'zod'
import type { JSONSchema4 } from 'json-schema'

import { keyHash, normalizeKeyString } from '@/lib/key'

export const entryMetadataSchema = z.object({
  // Source Fields
  sourceId: z.number(),
  // HTTP Cache Fields
  ttlS: z.number(),
  etag: z.string().nullish(),
  lastModified: z.string().nullish(),
  // HTTP Response Fields
  originStatus: z.number(),
  contentType: z.string().nullish(),
  dataEncoding: z.enum(['json', 'text', 'base64']),
  // Cache Fields
  cachedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
})

export type EntryMetadata = z.infer<typeof entryMetadataSchema>
export const entryMetadataJSONSchema = z.toJSONSchema(entryMetadataSchema)

export const Entries: CollectionConfig = {
  slug: 'entries',
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data

        const source =
          (data as { source?: unknown }).source ?? (originalDoc as { source?: unknown } | undefined)?.source
        const key = (data as { key?: unknown }).key ?? (originalDoc as { key?: unknown } | undefined)?.key
        const meta = (data as { meta?: unknown }).meta ?? (originalDoc as { meta?: unknown } | undefined)?.meta
        const value = (data as { value?: unknown }).value ?? (originalDoc as { value?: unknown } | undefined)?.value

        if (typeof source !== 'string' || typeof key !== 'string') return data
        if (
          typeof (data as { identityValue?: unknown }).identityValue === 'string' &&
          (data as { identityValue?: string }).identityValue
        ) {
          return data
        }

        const normalizedKey = normalizeKeyString(key)
        const srcRes = await req.payload.find({
          collection: 'sources',
          where: { name: { equals: source } },
          limit: 1,
          depth: 0,
          req,
        })
        const src = srcRes.docs[0]
        const supportsPool = Boolean(src?.supportsPool)
        const identityKey = typeof src?.identityKey === 'string' ? src.identityKey : null

        let variant = ''
        if (supportsPool) {
          const parsed = parseValueForIdentity(value, meta)
          if (identityKey) {
            const v = getByPath(parsed, identityKey)
            if (v != null) variant = String(v)
          }
          if (!variant) {
            const etag = getByPath(meta, 'etag')
            const lastModified = getByPath(meta, 'lastModified')
            if (typeof etag === 'string' && etag) variant = `etag:${etag}`
            else if (typeof lastModified === 'string' && lastModified) variant = `lm:${lastModified}`
          }
          if (!variant) {
            variant = `body:${keyHash(stableStringify(parsed))}`
          }
        }

        const identitySeed = supportsPool ? `${source}|${normalizedKey}|${variant}` : `${source}|${normalizedKey}`
        ;(data as { identityValue?: string }).identityValue = `v1:${keyHash(identitySeed)}`

        if (operation === 'update') return data
        return data
      },
    ],
  },
  fields: [
    {
      name: 'source',
      type: 'text',
      required: true,
    },
    {
      name: 'key',
      type: 'text',
      defaultValue: '/',
      required: true,
    },
    {
      name: 'meta',
      type: 'json',
      jsonSchema: {
        uri: 'buffetd://entries/meta.schema.json',
        fileMatch: [],
        schema: entryMetadataJSONSchema as unknown as JSONSchema4,
      },
      validate: (value) => {
        try {
          entryMetadataSchema.parse(value)
          return true
        } catch (error: unknown) {
          return error instanceof z.ZodError ? error.message : 'Unknown error'
        }
      },
    },
    {
      name: 'value',
      type: 'json',
    },
    {
      name: 'identityValue',
      type: 'text',
      index: true,
      unique: true,
      required: true,
      defaultValue: '',
    },
  ],
}

function getByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object' || !path) return undefined

  const parts = String(path)
    .split('.')
    .map((p) => p.trim())
    .filter(Boolean)

  let cur: unknown = obj
  for (const part of parts) {
    if (cur == null) return undefined

    const m = part.match(/^(?<key>[^\[]+)(\[(?<idx>\d+)\])?$/)
    const key = m?.groups?.key
    const idx = m?.groups?.idx

    if (!key) return undefined
    if (typeof cur !== 'object') return undefined

    cur = (cur as Record<string, unknown>)[key]
    if (idx != null) {
      if (!Array.isArray(cur)) return undefined
      cur = cur[Number(idx)]
    }
  }
  return cur
}

function parseValueForIdentity(value: unknown, meta: unknown): unknown {
  const encoding = getByPath(meta, 'dataEncoding')

  if (typeof value === 'string' && encoding === 'json') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

function stableStringify(value: unknown): string {
  if (value == null) return 'null'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value)

  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
