import type { CollectionConfig } from 'payload'
import * as z from 'zod'

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
        schema: entryMetadataJSONSchema as any,
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
  ],
}
