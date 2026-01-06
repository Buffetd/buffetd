import type { CollectionConfig } from 'payload'
import * as z from 'zod'
import type { JSONSchema4 } from 'json-schema'

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
export const rateLimitJSONSchema = z.toJSONSchema(rateLimitSchema)

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
      unique: true,
      index: true,
    },
    {
      name: 'name',
      type: 'text',
      unique: true,
      index: true,
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
      name: 'identityKey',
      type: 'text',
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
    // {
    //   name: 'rateLimit',
    //   type: 'json',
    //   defaultValue: {},
    //   jsonSchema: {
    //     uri: 'buffetd://sources/rateLimit.schema.json',
    //     fileMatch: [],
    //     schema: rateLimitJSONSchema as unknown as JSONSchema4,
    //   },
    //   validate: (value) => {
    //     try {
    //       rateLimitSchema.parse(value)
    //       return true
    //     } catch (error: unknown) {
    //       return error instanceof z.ZodError ? error.message : 'Unknown error'
    //     }
    //   },
    // },
    {
      label: 'Request Rate Limit',
      type: 'collapsible',
      fields: [
        {
          name: 'rateLimit',
          type: 'group',
          validate: (value) => {
            if (!value || typeof value !== 'object') {
              return 'At least one request rate limit must be specified'
            }

            const v = value as Record<string, unknown>

            const hasAnyLimit = [
              'requestPerSecond',
              'requestPerMinute',
              'requestPerHour',
              'requestPerDay',
              'requestPerMonth',
            ].some((key) => {
              const n = v[key]
              return typeof n === 'number' && Number.isFinite(n) && n > 0
            })

            return hasAnyLimit || 'At least one request rate limit must be specified'
          },
          fields: [
            {
              name: 'requestPerSecond',
              type: 'number',
              min: 0,
            },
            {
              name: 'requestPerMinute',
              type: 'number',
              min: 0,
            },
            {
              name: 'requestPerHour',
              type: 'number',
              min: 1,
            },
            {
              name: 'requestPerDay',
              type: 'number',
              min: 1,
            },
            {
              name: 'requestPerMonth',
              type: 'number',
              min: 1,
            },
          ],
        },
      ],
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
