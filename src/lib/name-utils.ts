/**
 * Utility functions for handling first_name and last_name data
 */

export interface NameData {
  first_name?: string
  last_name?: string
}

/**
 * Extracts first and last name from name data
 */
export function extractNames(nameData: NameData): { firstName: string; lastName: string } {
  return {
    firstName: nameData.first_name || '',
    lastName: nameData.last_name || ''
  }
}

/**
 * Combines first and last name into a full name string
 */
export function combineNames(firstName: string, lastName: string): string {
  const first = firstName?.trim() || ''
  const last = lastName?.trim() || ''
  
  if (first && last) {
    return `${first} ${last}`
  } else if (first) {
    return first
  } else if (last) {
    return last
  } else {
    return ''
  }
}

/**
 * Gets display name from name data, preferring the new format
 */
export function getDisplayName(nameData: NameData): string {
  const { firstName, lastName } = extractNames(nameData)
  return combineNames(firstName, lastName)
}

/**
 * Gets initials from name data
 */
export function getInitials(nameData: NameData): string {
  const { firstName, lastName } = extractNames(nameData)
  
  const firstInitial = firstName.charAt(0).toUpperCase()
  const lastInitial = lastName.charAt(0).toUpperCase()
  
  if (firstInitial && lastInitial) {
    return `${firstInitial}${lastInitial}`
  } else if (firstInitial) {
    return firstInitial
  } else {
    return '?'
  }
}