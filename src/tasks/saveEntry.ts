import * as z from 'zod'
import type { TaskConfig } from 'payload'

import type { PureEntry } from '@/types'
import { setEntry } from '@/lib/storage'

import { entryMetadataSchema } from '@/collections/Entries'
import type { JSONSchema4 } from 'json-schema'

const entryInputSchema = z.object({
  source: z.string(),
  key: z.string(),
  meta: entryMetadataSchema,
  value: z.record(z.string(), z.any()),
})
const entryInputJSONSchema = JSON.parse(JSON.stringify(z.toJSONSchema(entryInputSchema)))

export const createSaveEntryTask = (): TaskConfig<'tSaveEntry'> => {
  return {
    slug: 'tSaveEntry',
    inputSchema: [
      {
        name: 'entry',
        type: 'json',
        required: true,
        jsonSchema: { uri: '', fileMatch: [], schema: entryInputJSONSchema as unknown as JSONSchema4 },
      },
      { name: 'persist', type: 'checkbox', required: true },
      { name: 'ttlSec', type: 'number', required: true },
    ],
    handler: async ({ input }) => {
      if (!input.entry || typeof input.entry !== 'object' || Array.isArray(input.entry)) {
        throw new Error('Invalid entry payload for tSaveEntry')
      }

      const entry = input.entry as PureEntry
      const persist = input.persist
      const ttlSec = input.ttlSec

      await setEntry(entry, { persist, ttlSec })

      return {
        output: { saved: true },
      }
    },
  }
}
