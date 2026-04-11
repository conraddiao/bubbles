import { describe, it, expect } from 'vitest'
import {
  toE164US,
  normalizePhoneInput,
  isRequiredE164Phone,
  isOptionalE164Phone,
} from '@/lib/phone'

describe('normalizePhoneInput', () => {
  it('returns undefined for null and undefined', () => {
    expect(normalizePhoneInput(null)).toBeUndefined()
    expect(normalizePhoneInput(undefined)).toBeUndefined()
  })

  it('returns undefined for empty and whitespace-only strings', () => {
    expect(normalizePhoneInput('')).toBeUndefined()
    expect(normalizePhoneInput('   ')).toBeUndefined()
    expect(normalizePhoneInput('\t\n')).toBeUndefined()
  })

  it('trims surrounding whitespace', () => {
    expect(normalizePhoneInput('  +15551234567  ')).toBe('+15551234567')
  })
})

describe('toE164US', () => {
  it('returns undefined for empty input', () => {
    expect(toE164US(undefined)).toBeUndefined()
    expect(toE164US(null)).toBeUndefined()
    expect(toE164US('')).toBeUndefined()
    expect(toE164US('   ')).toBeUndefined()
  })

  it('passes through already-valid E.164 numbers unchanged', () => {
    expect(toE164US('+15551234567')).toBe('+15551234567')
    expect(toE164US('+447700900123')).toBe('+447700900123')
  })

  it('normalizes 10-digit US numbers', () => {
    expect(toE164US('5551234567')).toBe('+15551234567')
  })

  it('normalizes common US formatting variations', () => {
    expect(toE164US('(555) 123-4567')).toBe('+15551234567')
    expect(toE164US('555-123-4567')).toBe('+15551234567')
    expect(toE164US('555.123.4567')).toBe('+15551234567')
    expect(toE164US('555 123 4567')).toBe('+15551234567')
  })

  it('normalizes 11-digit US numbers with leading 1', () => {
    expect(toE164US('15551234567')).toBe('+15551234567')
    expect(toE164US('1-555-123-4567')).toBe('+15551234567')
    expect(toE164US('1 (555) 123-4567')).toBe('+15551234567')
  })

  it('returns input unchanged when it cannot be normalized', () => {
    // Too few digits — let downstream validation reject it.
    expect(toE164US('12345')).toBe('12345')
    // Too many digits and no leading 1.
    expect(toE164US('55512345678')).toBe('55512345678')
  })
})

describe('isRequiredE164Phone', () => {
  it('rejects empty and missing values', () => {
    expect(isRequiredE164Phone(undefined)).toBe(false)
    expect(isRequiredE164Phone(null)).toBe(false)
    expect(isRequiredE164Phone('')).toBe(false)
    expect(isRequiredE164Phone('   ')).toBe(false)
  })

  it('accepts valid E.164 numbers', () => {
    expect(isRequiredE164Phone('+15551234567')).toBe(true)
    expect(isRequiredE164Phone('  +15551234567  ')).toBe(true)
  })

  it('rejects non-E.164 formats', () => {
    expect(isRequiredE164Phone('5551234567')).toBe(false)
    expect(isRequiredE164Phone('(555) 123-4567')).toBe(false)
  })
})

describe('isOptionalE164Phone', () => {
  it('accepts empty and missing values', () => {
    expect(isOptionalE164Phone(undefined)).toBe(true)
    expect(isOptionalE164Phone(null)).toBe(true)
    expect(isOptionalE164Phone('')).toBe(true)
    expect(isOptionalE164Phone('   ')).toBe(true)
  })

  it('accepts valid E.164 numbers', () => {
    expect(isOptionalE164Phone('+15551234567')).toBe(true)
  })

  it('rejects non-empty, non-E.164 values', () => {
    expect(isOptionalE164Phone('5551234567')).toBe(false)
    expect(isOptionalE164Phone('garbage')).toBe(false)
  })
})
