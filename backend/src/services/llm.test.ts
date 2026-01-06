import { describe, expect, it } from 'vitest'
import { createLLMClient } from './llm'

describe('LLM client', () => {
  it('uses ellipsis when truncating long lines', async () => {
    const originalKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = ''

    try {
      const client = createLLMClient()
      const result = await client.summarize([
        {
          id: 'msg-1',
          sender: 'user',
          body: 'a'.repeat(130),
          sentAt: new Date().toISOString(),
        },
      ])

      expect(result.content).toContain('...')
    } finally {
      if (originalKey === undefined) {
        delete process.env.OPENAI_API_KEY
      } else {
        process.env.OPENAI_API_KEY = originalKey
      }
    }
  })
})
