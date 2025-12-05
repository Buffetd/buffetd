import type { TypedJobs, TaskHandler, Field } from 'payload'
import { getPayload } from 'payload'
import config from '@payload-config'

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

export async function runJobImmediatly<T extends TaskKeys>(task: T, input: TypedJobs['tasks'][T]['input']) {
  const payload = await getPayload({ config })

  const job = await payload.jobs.queue({ task: task as TaskKeys, input })

  return payload.jobs.runByID({ id: job.id })
}
