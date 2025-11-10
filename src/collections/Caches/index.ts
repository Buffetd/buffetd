import type { CollectionConfig } from 'payload'
import * as z from 'zod'

const metadataSchema = z.object({
  // Source Fields
  source_id: z.string(),
  key: z.string(),
  // key_hash: z.string(),
  // HTTP Cache Fields
  etag: z.string().nullable(),
  last_modified: z.string().nullable(),
  ttl_s: z.number(),
  // HTTP Response Fields
  origin_status: z.number(),
  content_type: z.string().nullable(),
  data_encoding: z.enum(['json', 'text']),
  // Cache Fields
  cached_at: z.iso.datetime(),
  expires_at: z.iso.datetime(),
})

type Metadata = z.infer<typeof metadataSchema>

export const Caches: CollectionConfig = {
  slug: 'caches',
  fields: [
    {
      name: 'cid',
      type: 'text',
    },
    {
      name: 'metadata',
      type: 'json',
      validate: (value) => {
        try {
          metadataSchema.parse(value)
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
