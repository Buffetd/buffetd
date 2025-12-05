import type { Source, Entry } from '@/payload-types'

type ExcludePayloadProps<T> = Omit<T, 'id' | 'updatedAt' | 'createdAt'>

export type PureEntry = ExcludePayloadProps<Entry>

export type PureSource = ExcludePayloadProps<Source>

/**
 * General Types
 */
// #region General

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'CONNECT' | 'TRACE'

export type ValidMethod = Exclude<HTTPMethod, 'OPTIONS' | 'CONNECT' | 'TRACE'>

// #endregion
