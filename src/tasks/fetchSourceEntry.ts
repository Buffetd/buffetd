import type { TaskConfig, TypedJobs, TaskHandler, Field } from 'payload'

// import { executeJob } from '@/lib/jobControl/executeJob'
import { fetchTargetWithSource } from '@/lib/jobControl/sourceFetch'

export type TaskKeys = keyof TypedJobs['tasks']

export function createTask<N extends TaskKeys>(name: N, input: string[], handler: TaskHandler<N>) {
  const inputSchema = input.map((i) => {
    const [name, type, required] = i.split('|')
    return { name, type, required: required === 'required' } as Field
  })

  return {
    slug: name,
    inputSchema,
    handler,
  }
}

export const createFetchSourceEntryTask = (): TaskConfig<'tFetchSourceEntry'> => {
  const fields = ['sourceName|text|required', 'key|text|required', 'method|text|required']

  return createTask('tFetchSourceEntry', fields, async ({ input, req }) => {
    const entry = await fetchTargetWithSource(input.sourceName, input.key, { method: input.method })
    console.log('Fetched entry:', entry)

    const sourceResult = await req.payload.find({
      collection: 'sources',
      where: {
        name: { equals: input.sourceName },
      },
    })

    const source = sourceResult.docs[0]
    if (!source) {
      throw new Error(`Source "${input.sourceName}" not found`)
    }

    await req.payload.create({
      collection: 'entries',
      data: {
        source: input.sourceName,
        key: input.key,
        meta: {
          sourceId: source.id,
          ttlS: source.cacheTTL ?? 3600,
          originStatus: 200,
          dataEncoding: 'json' as const,
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + (source.cacheTTL ?? 3600) * 1000).toISOString(),
        },
        value: entry.value,
      },
    })
    return {
      output: { executed: true },
    }
  })
}

export const createExecuteJobTask = (): TaskConfig<'tExecuteJob'> => {
  const fields = ['sourceName|text|required', 'key|text|required']

  return createTask('tExecuteJob', fields, async ({}) => {
    return {
      output: { executed: true },
    }
  })
}

export const createSendEmailTask = (): TaskConfig<'tSendEmail'> => {
  const fields = ['to|text|required', 'subject|text|required', 'text|text|required']

  return createTask('tSendEmail', fields, async ({ input, req }) => {
    await req.payload.sendEmail({
      to: input.to,
      subject: input.subject,
      text: input.text,
    })

    return {
      output: { executed: true },
    }
  })
}
