import type { Source, Entry } from '@/payload-types'

type ExcludePayloadProps<T> = Omit<T, 'id' | 'updatedAt' | 'createdAt'>

export type PureEntry = ExcludePayloadProps<Entry>

export type PureSource = ExcludePayloadProps<Source>
