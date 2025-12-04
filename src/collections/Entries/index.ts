import type { CollectionConfig } from 'payload'
import * as z from 'zod'

export const entryMetadataSchema = z.object({
  // Source Fields
  sourceId: z.string(),
  // HTTP Cache Fields
  ttlS: z.number(),
  etag: z.string().nullable(),
  lastModified: z.string().nullable(),
  // HTTP Response Fields
  originStatus: z.number(),
  contentType: z.string().nullable(),
  dataEncoding: z.enum(['json', 'text']),
  // Cache Fields
  cachedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
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
      jsonSchema: {
        uri: 'buffetd://entries/metadata.schema.json',
        fileMatch: ['buffetd://entries/metadata.schema.json'],
        schema: z.toJSONSchema(entryMetadataSchema) as any,
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
      name: 'data',
      type: 'json',
    },
  ],
}
