import type { CollectionConfig } from 'payload'
import * as z from 'zod'

import { metadataSchema } from '../Caches'

export const CachePools: CollectionConfig = {
  slug: 'cache_pools',
  fields: [
    {
      name: 'source_id',
      type: 'text',
    },
    {
      name: 'cache_id',
      type: 'text',
    },
    {
      name: 'pool_key',
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
