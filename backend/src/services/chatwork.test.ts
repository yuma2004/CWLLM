import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatworkApiError, createChatworkClient } from './chatwork'

describe('chatwork service client', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-28T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('トークン未設定ではクライアント作成時に失敗する', () => {
    expect(() => createChatworkClient({ token: undefined })).toThrow(
      'CHATWORK_API_TOKEN is not set'
    )
  })

  it('通信失敗時は再試行して成功すればレスポンスを返す', async () => {
    const fetcher = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ room_id: 1, name: 'Room One' }]), { status: 200 })
      )

    const client = createChatworkClient({
      token: 'token',
      baseUrl: 'https://api.chatwork.test',
      fetcher: fetcher as unknown as typeof fetch,
      maxRetries: 1,
    })

    const promise = client.listRooms()
    await vi.advanceTimersByTimeAsync(1000)
    const rooms = await promise

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(rooms).toEqual([{ room_id: 1, name: 'Room One' }])
  })

  it('サーバーエラーは再試行して回復する', async () => {
    const fetcher = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'temporary' }), { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ message_id: '10', body: 'ok', send_time: 1700000000 }]),
          { status: 200 }
        )
      )

    const client = createChatworkClient({
      token: 'token',
      baseUrl: 'https://api.chatwork.test',
      fetcher: fetcher as unknown as typeof fetch,
      maxRetries: 1,
    })

    const promise = client.listMessages('123')
    await vi.advanceTimersByTimeAsync(1000)
    const messages = await promise

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(messages).toHaveLength(1)
    expect(messages[0]?.message_id).toBe('10')
  })

  it('429発生時はヘッダに従って待機して再試行する', async () => {
    const logger = { warn: vi.fn() }
    const resetAt = Math.floor(Date.now() / 1000) + 2
    const fetcher = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'rate limited' }), {
          status: 429,
          headers: { 'x-ratelimit-reset': String(resetAt) },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ room_id: 5, name: 'Recovered' }]), { status: 200 })
      )

    const client = createChatworkClient({
      token: 'token',
      baseUrl: 'https://api.chatwork.test',
      fetcher: fetcher as unknown as typeof fetch,
      logger,
      maxRetries: 1,
    })

    const promise = client.listRooms()
    await vi.advanceTimersByTimeAsync(2000)
    const rooms = await promise

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalled()
    expect(rooms[0]?.room_id).toBe(5)
  })

  it('タイムアウト時はAbortされ最終的に失敗する', async () => {
    const fetcher = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>(
      async (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted by timeout'))
          }, { once: true })
        })
    )

    const client = createChatworkClient({
      token: 'token',
      baseUrl: 'https://api.chatwork.test',
      fetcher: fetcher as unknown as typeof fetch,
      maxRetries: 0,
      timeoutMs: 10,
    })

    const promise = client.listRooms()
    const assertion = expect(promise).rejects.toThrow('aborted by timeout')
    await vi.advanceTimersByTimeAsync(10)

    await assertion
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('非2xxはChatworkApiErrorへ変換してstatusとbodyを保持する', async () => {
    const fetcher = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(new Response('forbidden', { status: 403, statusText: 'Forbidden' }))

    const client = createChatworkClient({
      token: 'token',
      baseUrl: 'https://api.chatwork.test',
      fetcher: fetcher as unknown as typeof fetch,
      maxRetries: 0,
    })

    const error = await client.listRooms().catch((err) => err)

    expect(error).toBeInstanceOf(ChatworkApiError)
    expect(error).toMatchObject({
      status: 403,
      body: 'forbidden',
    })
  })

  it('空レスポンスはフォールバック値を返す', async () => {
    const fetcher = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }))

    const client = createChatworkClient({
      token: 'token',
      baseUrl: 'https://api.chatwork.test',
      fetcher: fetcher as unknown as typeof fetch,
      maxRetries: 0,
    })

    await expect(client.listRooms()).resolves.toEqual([])
    await expect(client.listMessages('777')).resolves.toEqual([])
  })

  it('壊れたJSONレスポンスは例外として伝播する', async () => {
    const fetcher = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue(new Response('not-json', { status: 200 }))

    const client = createChatworkClient({
      token: 'token',
      baseUrl: 'https://api.chatwork.test',
      fetcher: fetcher as unknown as typeof fetch,
      maxRetries: 0,
    })

    await expect(client.listRooms()).rejects.toBeInstanceOf(SyntaxError)
  })
})
