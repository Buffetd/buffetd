import type { CollectionConfig } from 'payload'
import * as z from 'zod'

export const entryMetadataSchema = z.object({
  // Source Fields
  source_id: z.string(),
  key: z.string(),
  // HTTP Cache Fields
  ttl_s: z.number(),
  etag: z.string().nullable(),
  last_modified: z.string().nullable(),
  // HTTP Response Fields
  origin_status: z.number(),
  content_type: z.string().nullable(),
  data_encoding: z.enum(['json', 'text']),
  // Cache Fields
  cached_at: z.iso.datetime(),
  expires_at: z.iso.datetime(),
})

export type EntryMetadata = z.infer<typeof entryMetadataSchema>

export const Entries: CollectionConfig = {
  slug: 'entries',
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
    },
    {
      name: 'metadata',
      type: 'json',
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
      name: 'data',
      type: 'json',
    },
  ],
}
