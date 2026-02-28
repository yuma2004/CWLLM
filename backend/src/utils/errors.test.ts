import { describe, expect, it } from 'vitest'
import {
  badRequest,
  buildErrorPayload,
  conflict,
  forbidden,
  normalizeErrorPayload,
  notFound,
  unauthorized,
} from './errors'

describe('buildErrorPayload', () => {
  it('builds payload with status-based default code', () => {
    expect(buildErrorPayload(404, 'missing')).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'missing',
      },
    })
  })

  it('uses provided code and details', () => {
    expect(buildErrorPayload(400, 'bad', { field: 'name' }, 'CUSTOM')).toEqual({
      error: {
        code: 'CUSTOM',
        message: 'bad',
        details: { field: 'name' },
      },
    })
  })

  it('maps additional status codes and fallback code', () => {
    expect(buildErrorPayload(422, 'invalid')).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'invalid',
      },
    })
    expect(buildErrorPayload(429, 'slow down')).toEqual({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'slow down',
      },
    })
    expect(buildErrorPayload(418, 'teapot')).toEqual({
      error: {
        code: 'ERROR',
        message: 'teapot',
      },
    })
  })
})

describe('normalizeErrorPayload', () => {
  it('keeps non-error payloads untouched', () => {
    expect(normalizeErrorPayload({ ok: true }, 400)).toEqual({ ok: true })
    expect(normalizeErrorPayload('x', 400)).toBe('x')
  })

  it('normalizes string errors into structured payload', () => {
    expect(normalizeErrorPayload({ error: 'oops' }, 400)).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'oops',
      },
    })
  })

  it('normalizes object errors and fills defaults', () => {
    expect(
      normalizeErrorPayload(
        { error: { code: 'CUSTOM', message: 'boom', details: { id: '1' } } },
        409
      )
    ).toEqual({
      error: {
        code: 'CUSTOM',
        message: 'boom',
        details: { id: '1' },
      },
    })
    expect(normalizeErrorPayload({ error: {} }, 500)).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unknown error',
      },
    })
  })

  it('normalizes non-object error payloads with unknown message', () => {
    expect(normalizeErrorPayload({ error: 123 }, 429)).toEqual({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Unknown error',
      },
    })
  })
})

describe('error helpers', () => {
  it('creates common structured payloads', () => {
    expect(badRequest('invalid')).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'invalid',
      },
    })
    expect(unauthorized()).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      },
    })
    expect(forbidden('nope')).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'nope',
      },
    })
    expect(notFound('Company')).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Company not found',
      },
    })
    expect(conflict('already exists')).toEqual({
      error: {
        code: 'CONFLICT',
        message: 'already exists',
      },
    })
  })
})
