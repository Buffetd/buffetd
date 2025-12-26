import { beforeEach, describe, it, expect, vi } from 'vitest'

import { getPayload } from 'payload'
import type { Payload } from 'payload'
import type { Entry } from '@/payload-types'
import type { PureEntry } from '@/types'

import { getEntry, setEntry, delEntry } from './'

import { getMemEntry, setMemEntry, delMemEntry } from './memLayer'
import { getPersistEntry, setPersistEntry, delPersistEntry } from './persistLayer'

vi.mock('@payload-config', () => ({ default: {} }))

vi.mock('payload', () => ({
  getPayload: vi.fn(),
}))

vi.mock('./memLayer', () => ({
  getMemEntry: vi.fn(),
  setMemEntry: vi.fn(),
  delMemEntry: vi.fn(),
}))

vi.mock('./persistLayer', () => ({
  getPersistEntry: vi.fn(),
  setPersistEntry: vi.fn(),
  delPersistEntry: vi.fn(),
}))

function mockPayloadWithSources(docs: Array<{ name: string }>) {
  return {
    find: vi.fn().mockResolvedValue({ docs }),
  } as unknown as Payload
}

describe('storage layer', () => {
  const getPayloadMock = vi.mocked(getPayload)

  const getMemEntryMock = vi.mocked(getMemEntry)
  const setMemEntryMock = vi.mocked(setMemEntry)
  const delMemEntryMock = vi.mocked(delMemEntry)

  const getPersistEntryMock = vi.mocked(getPersistEntry)
  const setPersistEntryMock = vi.mocked(setPersistEntry)
  const delPersistEntryMock = vi.mocked(delPersistEntry)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getEntry returns null when source does not exist', async () => {
    getPayloadMock.mockResolvedValueOnce(mockPayloadWithSources([]))

    await expect(getEntry('missing', '/a')).resolves.toBeNull()

    expect(getMemEntryMock).not.toHaveBeenCalled()
    expect(getPersistEntryMock).not.toHaveBeenCalled()
  })

  it('getEntry returns memory entry if present', async () => {
    getPayloadMock.mockResolvedValueOnce(mockPayloadWithSources([{ name: 's' }]))

    const entry = { source: 's', key: '/a' } as unknown as PureEntry
    getMemEntryMock.mockResolvedValueOnce(entry)

    await expect(getEntry('s', '/a')).resolves.toBe(entry)

    expect(getMemEntryMock).toHaveBeenCalledWith('s', '/a')
    expect(getPersistEntryMock).not.toHaveBeenCalled()
    expect(setMemEntryMock).not.toHaveBeenCalled()
  })

  it('getEntry with fallback reads from persist and writes back to memory', async () => {
    getPayloadMock.mockResolvedValueOnce(mockPayloadWithSources([{ name: 's' }]))

    getMemEntryMock.mockResolvedValueOnce(null)
    const persistEntry = {
      id: 1,
      source: 's',
      key: '/a',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    } as unknown as Entry

    getPersistEntryMock.mockResolvedValueOnce(persistEntry)

    await expect(getEntry('s', '/a', { fallback: true })).resolves.toBe(persistEntry)

    expect(getPersistEntryMock).toHaveBeenCalledWith('s', '/a')
    expect(setMemEntryMock).toHaveBeenCalledWith('s', '/a', persistEntry as unknown as PureEntry, 60)
  })

  it('getEntry with fallback returns null when persist miss', async () => {
    getPayloadMock.mockResolvedValueOnce(mockPayloadWithSources([{ name: 's' }]))

    getMemEntryMock.mockResolvedValueOnce(null)
    getPersistEntryMock.mockResolvedValueOnce(null as unknown as Entry)

    await expect(getEntry('s', '/a', { fallback: true })).resolves.toBeNull()

    expect(setMemEntryMock).not.toHaveBeenCalled()
  })

  it('setEntry writes to memory and optionally persists', async () => {
    const entry = { source: 's', key: '/a' } as unknown as PureEntry

    await setEntry(entry)
    expect(setMemEntryMock).toHaveBeenCalledWith('s', '/a', entry, undefined)
    expect(setPersistEntryMock).not.toHaveBeenCalled()

    vi.clearAllMocks()

    await setEntry(entry, { persist: true, ttlSec: 10 })
    expect(setMemEntryMock).toHaveBeenCalledWith('s', '/a', entry, 10)
    expect(setPersistEntryMock).toHaveBeenCalledWith(entry)
  })

  it('delEntry deletes from memory and optionally deletes persisted entry', async () => {
    await delEntry('s', '/a')
    expect(delMemEntryMock).toHaveBeenCalledWith('s', '/a')
    expect(delPersistEntryMock).not.toHaveBeenCalled()

    vi.clearAllMocks()

    await delEntry('s', '/a', { pure: true })
    expect(delMemEntryMock).toHaveBeenCalledWith('s', '/a')
    expect(delPersistEntryMock).toHaveBeenCalledWith('s', '/a')
  })
})
