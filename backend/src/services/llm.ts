export interface LLMInputMessage {
  id: string
  sender: string
  body: string
  sentAt: string
}

export interface LLMResult {
  content: string
  sourceLinks: string[]
}

export interface LLMClient {
  summarize(messages: LLMInputMessage[]): Promise<LLMResult>
}

const MAX_SOURCE_LINKS = 20

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max)}c` : value

const extractActionLines = (messages: LLMInputMessage[]) => {
  const matches: string[] = []
  const patterns = [/\bTODO\b/i, /\baction\b/i, /\bfollow\s*up\b/i, /\bnext\b/i]

  for (const message of messages) {
    if (patterns.some((pattern) => pattern.test(message.body))) {
      matches.push(truncate(message.body.replace(/\s+/g, ' ').trim(), 120))
    }
    if (matches.length >= 5) break
  }

  return matches
}

class MockLLMClient implements LLMClient {
  async summarize(messages: LLMInputMessage[]): Promise<LLMResult> {
    const topMessages = messages.slice(0, 5)
    const highlightLines = topMessages.map((message) =>
      `- ${truncate(message.body.replace(/\s+/g, ' ').trim(), 120)}`
    )
    const participants = Array.from(new Set(messages.map((message) => message.sender))).slice(0, 5)
    const actionLines = extractActionLines(messages)

    const content = [
      '## Summary',
      highlightLines.length > 0 ? highlightLines.join('\n') : '- No recent highlights.',
      '',
      '## Key Topics',
      participants.length > 0
        ? participants.map((name) => `- ${name}`).join('\n')
        : '- No participants detected.',
      '',
      '## Open Items',
      actionLines.length > 0
        ? actionLines.map((line) => `- ${line}`).join('\n')
        : '- No open items found.',
      '',
      '## Next Actions',
      actionLines.length > 0
        ? actionLines.map((line) => `- ${line}`).join('\n')
        : '- No action items suggested.',
    ].join('\n')

    return {
      content,
      sourceLinks: messages.slice(0, MAX_SOURCE_LINKS).map((message) => message.id),
    }
  }
}

class OpenAILLMClient implements LLMClient {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey
    this.model = model
  }

  async summarize(messages: LLMInputMessage[]): Promise<LLMResult> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const payload = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'Summarize the conversation in Markdown with sections: Summary, Key Topics, Open Items, Next Actions.',
        },
        {
          role: 'user',
          content: messages
            .map((message) =>
              `[${message.sentAt}] ${message.sender}: ${message.body.replace(/\s+/g, ' ').trim()}`
            )
            .join('\n'),
        },
      ],
      temperature: 0.2,
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
        error?: { message?: string }
      }

      if (!response.ok || !data.choices?.[0]?.message?.content) {
        const errorMessage = data.error?.message || 'LLM request failed'
        throw new Error(errorMessage)
      }

      return {
        content: data.choices[0].message.content,
        sourceLinks: messages.slice(0, MAX_SOURCE_LINKS).map((message) => message.id),
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}

export const createLLMClient = (): LLMClient => {
  const apiKey = process.env.OPENAI_API_KEY
  if (apiKey) {
    return new OpenAILLMClient(apiKey, process.env.OPENAI_MODEL || 'gpt-4o-mini')
  }
  return new MockLLMClient()
}
