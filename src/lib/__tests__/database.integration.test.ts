/**
 * Integration tests — require a running local Supabase instance.
 *
 * Setup:
 *   npm run db:start
 *   cp .env.test.local.example .env.test.local   # first time only
 *   # fill in values from: npm run db:status
 *   npm run test:integration
 *
 * These tests use fixed seed UUIDs defined in supabase/seed.sql.
 * Run `npm run db:reset` to restore the seed state if data gets dirty.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

const SEED_USER_ALICE = '00000000-0000-0000-0000-000000000001'
const SEED_GROUP_BOOK_CLUB = '10000000-0000-0000-0000-000000000001'
const SEED_GROUP_HIKING = '10000000-0000-0000-0000-000000000002'

function getTestClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Missing .env.test.local — copy .env.test.local.example and fill in values from `npm run db:status`'
    )
  }
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

describe('contact_groups', () => {
  it('returns seed groups for Alice', async () => {
    const db = getTestClient()
    const { data, error } = await db
      .from('contact_groups')
      .select('id, name, is_closed')
      .eq('owner_id', SEED_USER_ALICE)
      .order('name')

    expect(error).toBeNull()
    expect(data).toHaveLength(2)
    expect(data?.map((g) => g.name)).toEqual(['Book Club', 'Hiking Crew'])
  })

  it('can read a group by id', async () => {
    const db = getTestClient()
    const { data, error } = await db
      .from('contact_groups')
      .select('*')
      .eq('id', SEED_GROUP_BOOK_CLUB)
      .single()

    expect(error).toBeNull()
    expect(data?.name).toBe('Book Club')
    expect(data?.is_closed).toBe(false)
    expect(data?.share_token).toBe('bookclub-test-token-001')
  })

  it('closed group is marked is_closed', async () => {
    const db = getTestClient()
    const { data, error } = await db
      .from('contact_groups')
      .select('is_closed')
      .eq('id', SEED_GROUP_HIKING)
      .single()

    expect(error).toBeNull()
    expect(data?.is_closed).toBe(true)
  })
})

describe('group_memberships', () => {
  it('Book Club has 3 seed members', async () => {
    const db = getTestClient()
    const { data, error } = await db
      .from('group_memberships')
      .select('id, first_name, last_name')
      .eq('group_id', SEED_GROUP_BOOK_CLUB)

    expect(error).toBeNull()
    expect(data).toHaveLength(3)
  })

  it('can insert and delete a membership', async () => {
    const db = getTestClient()

    const { data: inserted, error: insertError } = await db
      .from('group_memberships')
      .insert({
        group_id: SEED_GROUP_BOOK_CLUB,
        first_name: 'Temp',
        last_name: 'Test',
        email: `temp-${Date.now()}@example.com`,
        notifications_enabled: false,
      })
      .select('id')
      .single()

    expect(insertError).toBeNull()
    expect(inserted?.id).toBeTruthy()

    // Clean up
    const { error: deleteError } = await db
      .from('group_memberships')
      .delete()
      .eq('id', inserted!.id)

    expect(deleteError).toBeNull()
  })
})
