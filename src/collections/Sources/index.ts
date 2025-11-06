import type { CollectionConfig } from 'payload'

export const Sources: CollectionConfig = {
  slug: 'sources',
  fields: [
    {
      name: 'sid',
      type: 'text',
    },
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'description',
      type: 'text',
    },
    {
      name: 'baseUrl',
      type: 'text',
    },
    {
      name: 'defaultHeaders',
      type: 'json',
    },
    {
      name: 'rateLimit',
      type: 'json',
    },
    {
      name: 'cacheTTL',
      type: 'number',
    },
    {
      name: 'supportsPool',
      type: 'checkbox',
    },
  ],
}
