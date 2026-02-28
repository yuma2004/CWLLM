import { expect, afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { server } from './msw/server'
import { clearCache } from '../lib/apiCache'

expect.extend(matchers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
  server.resetHandlers()
  clearCache()
  cleanup()
})

afterAll(() => {
  server.close()
})
