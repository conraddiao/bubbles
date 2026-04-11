/**
 * Shared vCard 3.0 generator for group members.
 *
 * Critical: every member vCard carries a stable `UID:urn:uuid:<member.id>`
 * so iOS's Contacts app can deduplicate on re-import. Without UID, iOS
 * falls back to fuzzy matching and creates fresh duplicates on every
 * bulk .vcf import.
 */

import { extractNames, getDisplayName } from '@/lib/name-utils'

export interface VCardMember {
  id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  avatar_url?: string | null
}

export const escapeVCardValue = (value?: string | null): string => {
  if (!value) return ''
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .trim()
}

/**
 * Formats a Date as a vCard REV timestamp.
 * iOS accepts the extended ISO-8601 form `YYYY-MM-DDTHH:MM:SSZ`
 * (no milliseconds).
 */
export const formatVCardRev = (date: Date = new Date()): string => {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Generate a single-member vCard 3.0 string.
 *
 * @param member  Member fields (id is required and becomes the UID).
 * @param groupName  Group name, used for ORG/NOTE lines.
 * @param rev  Optional REV timestamp; defaults to now.
 */
export function generateMemberVCard(
  member: VCardMember,
  groupName: string,
  rev: Date = new Date()
): string {
  const { firstName, lastName } = extractNames({
    first_name: member.first_name ?? '',
    last_name: member.last_name ?? '',
  })
  const fullName =
    getDisplayName({
      first_name: member.first_name ?? '',
      last_name: member.last_name ?? '',
    }) ||
    member.email ||
    'Bubbles Member'
  const givenName = firstName || fullName

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardValue(lastName)};${escapeVCardValue(givenName)};;;`,
    `FN:${escapeVCardValue(fullName)}`,
    `UID:urn:uuid:${member.id}`,
    `REV:${formatVCardRev(rev)}`,
  ]

  if (member.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(member.email)}`)
  if (member.phone) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(member.phone)}`)
  if (member.avatar_url) lines.push(`PHOTO;VALUE=URI:${escapeVCardValue(member.avatar_url)}`)

  lines.push(`ORG:${escapeVCardValue(groupName)} | bubbles.fyi`)
  lines.push(`NOTE:${escapeVCardValue(`Member of ${groupName} group from bubbles.fyi`)}`)
  lines.push('END:VCARD')

  return lines.join('\r\n')
}

/**
 * Generate a multi-member vCard string (concatenated with CRLF-CRLF and
 * terminated with a trailing CRLF, matching the prior inline behavior).
 *
 * All members share a single `rev` instant so a bulk export is
 * internally consistent.
 */
export function generateBulkVCard(
  members: VCardMember[],
  groupName: string,
  rev: Date = new Date()
): string {
  return (
    members.map((m) => generateMemberVCard(m, groupName, rev)).join('\r\n\r\n') + '\r\n'
  )
}
