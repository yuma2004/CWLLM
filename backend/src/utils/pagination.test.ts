import { describe, expect, it } from 'vitest'
import {
  buildPaginatedResponse,
  buildPagination,
  parseLimit,
  parsePagination,
} from './pagination'

describe('parsePagination', () => {
  it('uses defaults when values are missing or invalid', () => {
    expect(parsePagination(undefined, undefined)).toEqual({
      page: 1,
      pageSize: 20,
      skip: 0,
    })
    expect(parsePagination('not-a-number', 'bad')).toEqual({
      page: 1,
      pageSize: 20,
      skip: 0,
    })
  })

  it('clamps page and pageSize into valid ranges', () => {
    expect(parsePagination('-10', '500', 80)).toEqual({
      page: 1,
      pageSize: 80,
      skip: 0,
    })
    expect(parsePagination('3', '2', 80)).toEqual({
      page: 3,
      pageSize: 2,
      skip: 4,
    })
  })
})

describe('parseLimit', () => {
  it('returns default when value is invalid', () => {
    expect(parseLimit(undefined, 12, 50)).toBe(12)
    expect(parseLimit('not-a-number', 12, 50)).toBe(12)
  })

  it('floors decimals and clamps bounds', () => {
    expect(parseLimit('5.9', 12, 50)).toBe(5)
    expect(parseLimit('0', 12, 50)).toBe(12)
    expect(parseLimit('-5', 12, 50)).toBe(1)
    expect(parseLimit('1000', 12, 50)).toBe(50)
  })
})

describe('buildPagination', () => {
  it('builds pagination object', () => {
    expect(buildPagination(2, 30, 99)).toEqual({ page: 2, pageSize: 30, total: 99 })
  })
})

describe('buildPaginatedResponse', () => {
  it('wraps items and pagination', () => {
    expect(buildPaginatedResponse(['a', 'b'], 4, 10, 35)).toEqual({
      items: ['a', 'b'],
      pagination: {
        page: 4,
        pageSize: 10,
        total: 35,
      },
    })
  })
})
