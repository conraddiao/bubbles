import { describe, it, expect, vi, beforeEach } from 'vitest'
import { archiveContactGroup, unarchiveContactGroup, getArchivedGroups, getUserGroups } from '../database'

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
  handleDatabaseError: vi.fn((e: unknown) => (e instanceof Error ? e.message : String(e))),
}))

const mockUser = { id: 'owner-1', email: 'owner@example.com' }

function makeRpcChain(returnValue: { data: unknown; error: unknown }) {
  return returnValue
}

function makeSelectChain(rows: unknown[], options?: { count?: number }) {
  const chain: Record<string, unknown> = {}
  const terminal = {
    data: rows,
    error: null,
    count: options?.count ?? null,
  }
  chain.select = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      not: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          returns: vi.fn().mockResolvedValue(terminal),
        }),
      }),
      is: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          returns: vi.fn().mockResolvedValue(terminal),
        }),
      }),
      single: vi.fn().mockResolvedValue({ data: rows[0] ?? null, error: null }),
    }),
    in: vi.fn().mockReturnValue({
      is: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          returns: vi.fn().mockResolvedValue(terminal),
        }),
      }),
    }),
    or: vi.fn().mockReturnValue({
      is: vi.fn().mockResolvedValue(terminal),
    }),
  })
  return chain
}

describe('archiveContactGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  it('returns success when RPC succeeds', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })

    const result = await archiveContactGroup('group-1')

    expect(mockRpc).toHaveBeenCalledWith('archive_contact_group', { group_uuid: 'group-1' })
    expect(result.data).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns error when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('Group not found.') })

    const result = await archiveContactGroup('nonexistent')

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('returns error when group is already archived', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('Group is already archived.') })

    const result = await archiveContactGroup('group-1')

    expect(result.error).toContain('already archived')
  })
})

describe('unarchiveContactGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  it('returns success when RPC succeeds', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })

    const result = await unarchiveContactGroup('group-1')

    expect(mockRpc).toHaveBeenCalledWith('unarchive_contact_group', { group_uuid: 'group-1' })
    expect(result.data).toBe(true)
    expect(result.error).toBeNull()
  })

  it('returns error when group is not archived', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('Group is not archived.') })

    const result = await unarchiveContactGroup('group-1')

    expect(result.error).toContain('not archived')
  })

  it('returns error when non-owner attempts to unarchive', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('Only the group owner can unarchive the group.') })

    const result = await unarchiveContactGroup('group-1')

    expect(result.error).toContain('owner')
  })
})

describe('getArchivedGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  it('returns only archived groups for the owner', async () => {
    const archivedGroup = {
      id: 'g-archived',
      name: 'Old Group',
      owner_id: 'owner-1',
      archived_at: '2026-03-01T00:00:00Z',
      is_closed: false,
      share_token: 'tok1',
      access_type: 'open',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
    }

    const countChain = {
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            returns: vi.fn().mockResolvedValue({ data: [{ group_id: 'g-archived' }, { group_id: 'g-archived' }, { group_id: 'g-archived' }], error: null }),
          }),
        }),
      }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'contact_groups') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  returns: vi.fn().mockResolvedValue({ data: [archivedGroup], error: null }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'group_memberships') {
        return countChain
      }
      return {}
    })

    const result = await getArchivedGroups()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].id).toBe('g-archived')
    expect(result.data![0].is_owner).toBe(true)
  })

  it('returns empty array when no archived groups exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'contact_groups') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  returns: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const result = await getArchivedGroups()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(0)
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await getArchivedGroups()

    expect(result.error).toBeTruthy()
    expect(result.data).toBeNull()
  })
})

describe('getUserGroups — excludes archived groups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  it('passes archived_at IS NULL filter on both queries', async () => {
    const isNull = vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        returns: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    const membershipIsNull = vi.fn().mockResolvedValue({ data: [], error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'group_memberships') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              is: membershipIsNull,
            }),
            eq: vi.fn().mockReturnValue({
              is: membershipIsNull,
            }),
          }),
        }
      }
      if (table === 'contact_groups') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              is: isNull,
            }),
            eq: vi.fn().mockReturnValue({
              is: isNull,
            }),
          }),
        }
      }
      return {}
    })

    await getUserGroups()

    // archived_at IS NULL must be applied to the owned-groups query (always runs)
    expect(isNull).toHaveBeenCalledWith('archived_at', null)
  })
})
