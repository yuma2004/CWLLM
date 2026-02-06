import { describe, expect, it } from 'vitest'
import {
  createEnumNormalizer,
  isNonEmptyString,
  isNullableString,
  parseDate,
  parseNumber,
  parseStringArray,
  validatePassword,
} from './validation'

describe('isNonEmptyString', () => {
  it('returns true only for non-empty trimmed strings', () => {
    expect(isNonEmptyString('abc')).toBe(true)
    expect(isNonEmptyString('  x  ')).toBe(true)
    expect(isNonEmptyString('   ')).toBe(false)
    expect(isNonEmptyString(1)).toBe(false)
  })
})

describe('isNullableString', () => {
  it('accepts string, null and undefined', () => {
    expect(isNullableString('x')).toBe(true)
    expect(isNullableString(null)).toBe(true)
    expect(isNullableString(undefined)).toBe(true)
    expect(isNullableString(1)).toBe(false)
  })
})

describe('parseDate', () => {
  it('parses valid date strings', () => {
    const parsed = parseDate('2026-02-06T00:00:00.000Z')
    expect(parsed).toBeInstanceOf(Date)
    expect(parsed?.toISOString()).toBe('2026-02-06T00:00:00.000Z')
  })

  it('handles undefined, null and invalid strings', () => {
    expect(parseDate(undefined)).toBeUndefined()
    expect(parseDate(null)).toBeNull()
    expect(parseDate('invalid-date')).toBeNull()
  })
})

describe('parseNumber', () => {
  it('keeps finite numbers and normalizes invalid values', () => {
    expect(parseNumber(1)).toBe(1)
    expect(parseNumber(0)).toBe(0)
    expect(parseNumber(undefined)).toBeUndefined()
    expect(parseNumber(null)).toBeNull()
    expect(parseNumber('1')).toBeNull()
    expect(parseNumber(Number.NaN)).toBeNull()
  })
})

describe('parseStringArray', () => {
  it('parses string arrays and rejects invalid values', () => {
    expect(parseStringArray(['a', 'b'])).toEqual(['a', 'b'])
    expect(parseStringArray(undefined)).toBeUndefined()
    expect(parseStringArray('a')).toBeNull()
    expect(parseStringArray(['a', 1])).toBeNull()
  })
})

describe('validatePassword', () => {
  it('returns reason for invalid passwords', () => {
    expect(validatePassword(undefined)).toEqual({
      ok: false,
      reason: 'Password is required',
    })
    expect(validatePassword('short')).toEqual({
      ok: false,
      reason: 'Password must be at least 8 characters',
    })
    expect(validatePassword('abcdefgh')).toEqual({
      ok: false,
      reason: 'Password must include letters and numbers',
    })
  })

  it('accepts passwords with letters and numbers', () => {
    expect(validatePassword('abc12345')).toEqual({ ok: true })
  })
})

describe('createEnumNormalizer', () => {
  it('normalizes only known values', () => {
    const normalizeRole = createEnumNormalizer(new Set(['admin', 'employee'] as const))
    expect(normalizeRole(undefined)).toBeUndefined()
    expect(normalizeRole('admin')).toBe('admin')
    expect(normalizeRole('employee')).toBe('employee')
    expect(normalizeRole('unknown')).toBeNull()
  })
})
