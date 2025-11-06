import type { CollectionConfig } from 'payload'
import * as z from 'zod'

const metadataSchema = z.object({
  source_id: z.string(),
  ttl_s: z.number(),
  cached_at: z.date(),
  expires_at: z.date(),
  data_encoding: z.enum(['json', 'text']),
  origin_status: z.number(),
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
