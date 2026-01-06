export interface LLMInputMessage {
  id: string
  sender: string
  body: string
  sentAt: string
}

export interface LLMTokenUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  requests?: number
}

export interface LLMMeta {
  model: string
  promptVersion: string
  sourceMessageCount: number
  tokenUsage?: LLMTokenUsage
}

export interface LLMResult {
  content: string
  sourceLinks: string[]
  metadata?: LLMMeta
}

export interface LLMClient {
  summarize(messages: LLMInputMessage[]): Promise<LLMResult>
}

const MAX_SOURCE_LINKS = 20
const CHUNK_SIZE = 40
const PROMPT_VERSION = 'v2-ja-map-reduce'
const SYSTEM_PROMPT =
  'あなたは営業チームのアシスタントです。以下の会話ログを日本語で要約してください。' +
  'Markdownで次の見出しを必ず使ってください: ' +
  '## Summary, ## Key Topics, ## Open Items, ## Next Actions。' +
  '箇条書き中心で、事実と推測を分けて簡潔にまとめてください。'
const REDUCE_PROMPT =
  '以下は分割した要約の集合です。重複を整理して一つの要約に統合してください。' +
  'Markdownで次の見出しを必ず使ってください: ' +
  '## Summary, ## Key Topics, ## Open Items, ## Next Actions。' +
  '可能な限り具体的に、日本語で書いてください。'

export const LLM_PROMPT_VERSION = PROMPT_VERSION

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max)}...` : value

const normalizeBody = (value: string) =>
  value.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim()

const chunkMessages = <T>(messages: T[], size: number) => {
  const chunks: T[][] = []
  for (let i = 0; i < messages.length; i += size) {
    chunks.push(messages.slice(i, i + size))
  }
  return chunks
}

const mergeTokenUsage = (base: LLMTokenUsage | undefined, next?: LLMTokenUsage) => {
  if (!next) return base ?? { requests: 0 }
  const current = base ?? {}
  return {
    promptTokens: (current.promptTokens ?? 0) + (next.promptTokens ?? 0),
    completionTokens: (current.completionTokens ?? 0) + (next.completionTokens ?? 0),
    totalTokens: (current.totalTokens ?? 0) + (next.totalTokens ?? 0),
    requests: (current.requests ?? 0) + (next.requests ?? 0),
  }
}

const extractActionLines = (messages: LLMInputMessage[]) => {
  const matches: string[] = []
  const patterns = [/\bTODO\b/i, /\baction\b/i, /\bfollow\s*up\b/i, /\bnext\b/i]

  for (const message of messages) {
    if (patterns.some((pattern) => pattern.test(message.body))) {
      matches.push(truncate(normalizeBody(message.body), 120))
    }
    if (matches.length >= 5) break
  }

  return matches
}

class MockLLMClient implements LLMClient {
  async summarize(messages: LLMInputMessage[]): Promise<LLMResult> {
    const topMessages = messages.slice(0, 5)
    const highlightLines = topMessages.map((message) => `- ${truncate(normalizeBody(message.body), 120)}`)
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
      actionLines.length > 0 ? actionLines.map((line) => `- ${line}`).join('\n') : '- No open items found.',
      '',
      '## Next Actions',
      actionLines.length > 0
        ? actionLines.map((line) => `- ${line}`).join('\n')
        : '- No action items suggested.',
    ].join('\n')

    return {
      content,
      sourceLinks: messages.slice(0, MAX_SOURCE_LINKS).map((message) => message.id),
      metadata: {
        model: 'mock',
        promptVersion: PROMPT_VERSION,
        sourceMessageCount: messages.length,
        tokenUsage: { requests: 1 },
      },
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

  private async requestCompletion(systemPrompt: string, userContent: string) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const payload = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userContent,
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
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
        error?: { message?: string }
      }

      if (!response.ok || !data.choices?.[0]?.message?.content) {
        const errorMessage = data.error?.message || 'LLM request failed'
        throw new Error(errorMessage)
      }

      const usage: LLMTokenUsage = {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
        requests: 1,
      }

      return { content: data.choices[0].message.content, usage }
    } finally {
      clearTimeout(timeout)
    }
  }

  private async summarizeChunk(messages: LLMInputMessage[]) {
    const userContent = messages
      .map((message) => `[${message.sentAt}] ${message.sender}: ${normalizeBody(message.body)}`)
      .join('\n')
    return this.requestCompletion(SYSTEM_PROMPT, userContent)
  }

  private async summarizeText(text: string) {
    return this.requestCompletion(REDUCE_PROMPT, text)
  }

  async summarize(messages: LLMInputMessage[]): Promise<LLMResult> {
    const sourceLinks = messages.slice(0, MAX_SOURCE_LINKS).map((message) => message.id)
    const sourceMessageCount = messages.length
    let tokenUsage: LLMTokenUsage | undefined

    if (messages.length <= CHUNK_SIZE) {
      const result = await this.summarizeChunk(messages)
      tokenUsage = mergeTokenUsage(tokenUsage, result.usage)
      return {
        content: result.content,
        sourceLinks,
        metadata: {
          model: this.model,
          promptVersion: PROMPT_VERSION,
          sourceMessageCount,
          tokenUsage,
        },
      }
    }

    const chunks = chunkMessages(messages, CHUNK_SIZE)
    const summaries: string[] = []

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index]
      const result = await this.summarizeChunk(chunk)
      tokenUsage = mergeTokenUsage(tokenUsage, result.usage)
      summaries.push(`### Chunk ${index + 1}\n${result.content}`)
    }

    const reduce = await this.summarizeText(summaries.join('\n\n'))
    tokenUsage = mergeTokenUsage(tokenUsage, reduce.usage)

    return {
      content: reduce.content,
      sourceLinks,
      metadata: {
        model: this.model,
        promptVersion: PROMPT_VERSION,
        sourceMessageCount,
        tokenUsage,
      },
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
