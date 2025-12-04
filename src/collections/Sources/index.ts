import type { CollectionConfig } from 'payload'
import * as z from 'zod'

import type { Source } from '@/payload-types'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'

const rateLimitSchema = z
  .object({
    requestPerSecond: z.number().optional(),
    requestPerMinute: z.number().optional(),
    requestPerHour: z.number().optional(),
    requestPerDay: z.number().optional(),
    requestPerMonth: z.number().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined && v > 0), {
    message: 'At least one rate limit must be specified',
  })

export type RateLimit = z.infer<typeof rateLimitSchema>

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
      name: 'baseUrl',
      type: 'text',
      required: true,
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
      name: 'keyTemplate',
      type: 'text',
      defaultValue: '/',
    },
    {
      name: 'defaultHeaders',
      type: 'json',
      defaultValue: {},
      validate: (value) => {
        try {
          z.record(z.string(), z.string()).parse(value)
          return true
        } catch (error: unknown) {
          return error instanceof z.ZodError ? error.message : 'Unknown error'
        }
      },
    },
    {
      name: 'rateLimit',
      type: 'json',
      defaultValue: {},
      jsonSchema: {
        uri: 'buffetd://sources/rateLimit.schema.json',
        fileMatch: ['buffetd://sources/rateLimit.schema.json'],
        schema: z.toJSONSchema(rateLimitSchema) as any,
      },
      validate: (value) => {
        try {
          rateLimitSchema.parse(value)
          return true
        } catch (error: unknown) {
          return error instanceof z.ZodError ? error.message : 'Unknown error'
        }
      },
    },
    {
      name: 'cacheTTL',
      type: 'number',
      defaultValue: 3600, // 1 hour in seconds
    },
    {
      name: 'supportsPool',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }: { data?: Partial<Source> }) => {
        if (!data) return data

        if (data.baseUrl && !data.name) {
          data.name = getTopLevelDomain(data.baseUrl)
        }
        return data
      },
    ],
  },
}

function getTopLevelDomain(url: string) {
  const urlStruct = new URL(url)
  return urlStruct.hostname.split('.').at(-2)
}
