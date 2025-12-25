export interface ChatworkRoom {
  room_id: number
  name: string
  description?: string
}

export interface ChatworkAccount {
  account_id: number
  name: string
  avatar_image_url?: string
}

export interface ChatworkMessage {
  message_id: string
  account?: ChatworkAccount
  body: string
  send_time: number
}

export class ChatworkApiError extends Error {
  status: number
  body: string

  constructor(status: number, body: string) {
    super(`Chatwork API error: ${status}`)
    this.status = status
    this.body = body
  }
}

export interface ChatworkClientConfig {
  token?: string
  baseUrl?: string
  fetcher?: typeof fetch
  logger?: { warn: (message: string) => void }
  maxRetries?: number
  timeoutMs?: number
}

const DEFAULT_BASE_URL = 'https://api.chatwork.com/v2'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getRetryDelay = (resetHeader: string | null) => {
  if (!resetHeader) return 1000
  const resetAt = Number(resetHeader)
  if (!Number.isFinite(resetAt)) return 1000
  const nowSeconds = Math.floor(Date.now() / 1000)
  const waitSeconds = Math.max(resetAt - nowSeconds, 1)
  return Math.min(waitSeconds * 1000, 60_000)
}

const parseErrorBody = async (response: Response) => {
  try {
    const text = await response.text()
    return text || response.statusText
  } catch (err) {
    return response.statusText
  }
}

export const createChatworkClient = ({
  token,
  baseUrl = DEFAULT_BASE_URL,
  fetcher = fetch,
  logger,
  maxRetries = 1,
  timeoutMs = 10_000,
}: ChatworkClientConfig) => {
  if (!token) {
    throw new Error('CHATWORK_API_TOKEN is not set')
  }

  const request = async <T>(path: string, retry = 0): Promise<T> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response

    try {
      response = await fetcher(`${baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'x-chatworktoken': token,
        },
        signal: controller.signal,
      })
    } catch (error) {
      clearTimeout(timeoutId)
      if (retry < maxRetries) {
        await sleep(1000)
        return request<T>(path, retry + 1)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }

    if (response.status === 429 && retry < maxRetries) {
      const delay = getRetryDelay(response.headers.get('x-ratelimit-reset'))
      logger?.warn(`Chatwork rate limit hit. Retry in ${delay}ms`)
      await sleep(delay)
      return request<T>(path, retry + 1)
    }

    if (response.status >= 500 && retry < maxRetries) {
      await sleep(1000)
      return request<T>(path, retry + 1)
    }

    if (!response.ok) {
      const body = await parseErrorBody(response)
      throw new ChatworkApiError(response.status, body)
    }

    return response.json() as Promise<T>
  }

  const listRooms = () => request<ChatworkRoom[]>('/rooms')

  const listMessages = (roomId: string, force = false) => {
    const query = new URLSearchParams()
    query.set('force', force ? '1' : '0')
    return request<ChatworkMessage[]>(`/rooms/${roomId}/messages?${query.toString()}`)
  }

  return {
    listRooms,
    listMessages,
  }
}
