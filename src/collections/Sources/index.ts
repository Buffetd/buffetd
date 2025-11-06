import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'

export const Sources: CollectionConfig = {
  slug: 'sources',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: anyone,
  },
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
