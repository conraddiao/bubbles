import { describe, it, expect } from 'vitest'
import {
  escapeVCardValue,
  formatVCardRev,
  generateMemberVCard,
  generateBulkVCard,
} from '../vcard'

const FIXED_REV = new Date('2026-04-10T12:34:56.789Z')

const member = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  first_name: 'Jane',
  last_name: "O'Brien",
  email: 'jane@example.com',
  phone: '+1-555-0100',
  avatar_url: 'https://example.com/avatar.jpg',
}

describe('escapeVCardValue', () => {
  it('escapes backslash, newline, semicolon, and comma', () => {
    expect(escapeVCardValue('a\\b\nc;d,e')).toBe('a\\\\b\\nc\\;d\\,e')
  })

  it('returns empty string for null/undefined', () => {
    expect(escapeVCardValue(null)).toBe('')
    expect(escapeVCardValue(undefined)).toBe('')
  })
})

describe('formatVCardRev', () => {
  it('produces ISO-8601 UTC with no milliseconds', () => {
    expect(formatVCardRev(FIXED_REV)).toBe('2026-04-10T12:34:56Z')
  })
})

describe('generateMemberVCard', () => {
  it('emits BEGIN/END, VERSION 3.0, and all core fields', () => {
    const vcard = generateMemberVCard(member, 'Test Group', FIXED_REV)
    expect(vcard.startsWith('BEGIN:VCARD\r\n')).toBe(true)
    expect(vcard.endsWith('\r\nEND:VCARD')).toBe(true)
    expect(vcard).toContain('VERSION:3.0')
    // Apostrophes are not escaped in vCard 3.0 (only \\, LF, ;, and , are).
    expect(vcard).toContain("FN:Jane O'Brien")
    expect(vcard).toContain("N:O'Brien;Jane;;;")
    expect(vcard).toContain('EMAIL;TYPE=INTERNET:jane@example.com')
    expect(vcard).toContain('TEL;TYPE=CELL:+1-555-0100')
    expect(vcard).toContain('PHOTO;VALUE=URI:https://example.com/avatar.jpg')
    expect(vcard).toContain('ORG:Test Group | bubbles.fyi')
    expect(vcard).toContain('NOTE:Member of Test Group group from bubbles.fyi')
  })

  it('emits a stable UID:urn:uuid:<member.id>', () => {
    const vcard = generateMemberVCard(member, 'Test Group', FIXED_REV)
    expect(vcard).toContain(`UID:urn:uuid:${member.id}`)
    // UID must be stable across repeated calls with the same member.
    const again = generateMemberVCard(member, 'Test Group', FIXED_REV)
    const uidLine = (s: string) => s.match(/UID:[^\r\n]+/)?.[0]
    expect(uidLine(vcard)).toBe(uidLine(again))
  })

  it('emits a REV timestamp in ISO-8601 UTC form', () => {
    const vcard = generateMemberVCard(member, 'Test Group', FIXED_REV)
    expect(vcard).toContain('REV:2026-04-10T12:34:56Z')
  })

  it('places UID and REV immediately after FN', () => {
    const vcard = generateMemberVCard(member, 'Test Group', FIXED_REV)
    const lines = vcard.split('\r\n')
    const fnIdx = lines.findIndex((l) => l.startsWith('FN:'))
    expect(lines[fnIdx + 1]).toMatch(/^UID:urn:uuid:/)
    expect(lines[fnIdx + 2]).toMatch(/^REV:/)
  })

  it('omits optional fields when missing', () => {
    const bare = {
      id: 'bare-id',
      first_name: 'Bob',
      last_name: 'Smith',
      email: null,
      phone: null,
      avatar_url: null,
    }
    const vcard = generateMemberVCard(bare, 'Test Group', FIXED_REV)
    expect(vcard).not.toContain('EMAIL')
    expect(vcard).not.toContain('TEL')
    expect(vcard).not.toContain('PHOTO')
    // UID and REV should still be present.
    expect(vcard).toContain('UID:urn:uuid:bare-id')
    expect(vcard).toContain('REV:2026-04-10T12:34:56Z')
  })

  it('falls back to email as FN when name is empty', () => {
    const nameless = {
      id: 'no-name',
      first_name: '',
      last_name: '',
      email: 'no-name@example.com',
    }
    const vcard = generateMemberVCard(nameless, 'Test Group', FIXED_REV)
    expect(vcard).toContain('FN:no-name@example.com')
  })
})

describe('generateBulkVCard', () => {
  const other = {
    id: '22222222-2222-2222-2222-222222222222',
    first_name: 'Bob',
    last_name: 'Smith',
    email: 'bob@example.com',
  }

  it('joins member vCards with CRLF CRLF and terminates with CRLF', () => {
    const bulk = generateBulkVCard([member, other], 'Test Group', FIXED_REV)
    expect((bulk.match(/BEGIN:VCARD/g) || []).length).toBe(2)
    expect(bulk).toMatch(/END:VCARD\r\n\r\nBEGIN:VCARD/)
    expect(bulk.endsWith('\r\n')).toBe(true)
  })

  it('uses the same REV instant for every card in a bulk export', () => {
    const bulk = generateBulkVCard([member, other], 'Test Group', FIXED_REV)
    const revs = bulk.match(/REV:[^\r\n]+/g) || []
    expect(revs.length).toBe(2)
    expect(new Set(revs).size).toBe(1)
  })

  it('emits distinct UIDs for distinct members', () => {
    const bulk = generateBulkVCard([member, other], 'Test Group', FIXED_REV)
    expect(bulk).toContain(`UID:urn:uuid:${member.id}`)
    expect(bulk).toContain(`UID:urn:uuid:${other.id}`)
  })
})
