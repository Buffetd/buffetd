import type { TaskConfig, TypedJobs, TaskHandler, Field } from 'payload'

import type { Metadata } from '@/lib/types'
import { setCacheEntry } from '@/lib/cacheControl'

import { createTask } from './helper'

export const createSaveEntryTask = (): TaskConfig<'tSaveEntry'> => {
  const fields = ['source|json|required', 'meta|json|required']

  return createTask('tSaveEntry', fields, async ({ input, req }) => {
    if (!input.meta || typeof input.meta !== 'object' || Array.isArray(input.meta)) {
      throw new Error('Invalid meta payload for tSaveEntry')
    }

    const meta = input.meta as { source_id: string; key: string; ttl_s: number }

    await setCacheEntry(
      meta.source_id,
      meta.key,
      { data: input.source, metadata: meta as unknown as Metadata },
      { ttlSec: meta.ttl_s },
    )

    return {
      output: { saved: true, source: input.source, meta },
    }
  })
}
