import { describe, expect, it } from 'vitest'
import { JobCanceledError } from './jobErrors'

describe('JobCanceledError', () => {
  it('is an Error with a fixed message', () => {
    const error = new JobCanceledError()
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Job canceled')
  })
})
