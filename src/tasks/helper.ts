import type { TypedJobs, TaskHandler, Field } from 'payload'

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
