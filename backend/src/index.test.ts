import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import cors from '@fastify/cors'

describe('Healthz endpoint', () => {
  it('should return 200 with status ok', async () => {
    const fastify = Fastify()
    await fastify.register(cors)

    fastify.get('/healthz', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/healthz',
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()

    await fastify.close()
  })
})
