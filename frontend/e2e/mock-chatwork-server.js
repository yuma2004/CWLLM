import http from 'node:http'
import { URL } from 'node:url'

const port = Number(process.env.MOCK_CHATWORK_PORT || 9101)

const rooms = [
  { room_id: 101, name: 'Mock Room Alpha', description: 'E2E room alpha' },
  { room_id: 202, name: 'Mock Room Beta', description: 'E2E room beta' },
]

const messages = {
  '101': [
    {
      message_id: '9001',
      account: { account_id: 1, name: 'Mock User' },
      body: 'Hello from mock server',
      send_time: Math.floor(Date.now() / 1000),
    },
  ],
  '202': [],
}

const defaultMode = {
  roomsShouldFail: false,
  messagesShouldFail: false,
}

let mode = { ...defaultMode }

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
  })
  res.end(JSON.stringify(payload))
}

const readRequestJson = (req) =>
  new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString('utf8')
    })
    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })

const server = http.createServer((req, res) => {
  void (async () => {
    if (!req.url) {
      sendJson(res, 400, { error: 'Missing url' })
      return
    }

    const url = new URL(req.url, `http://${req.headers.host}`)
    if (req.method === 'GET' && url.pathname === '/healthz') {
      sendJson(res, 200, { status: 'ok', mode })
      return
    }

    if (req.method === 'POST' && url.pathname === '/__test/reset') {
      mode = { ...defaultMode }
      sendJson(res, 200, { ok: true, mode })
      return
    }

    if (req.method === 'POST' && url.pathname === '/__test/mode') {
      try {
        const payload = await readRequestJson(req)
        mode = {
          roomsShouldFail: Boolean(payload.roomsShouldFail),
          messagesShouldFail: Boolean(payload.messagesShouldFail),
        }
        sendJson(res, 200, { ok: true, mode })
      } catch {
        sendJson(res, 400, { error: 'Invalid JSON body' })
      }
      return
    }

    if (req.method === 'GET' && url.pathname === '/v2/rooms') {
      if (mode.roomsShouldFail) {
        sendJson(res, 500, { error: 'Mock rooms failure' })
        return
      }
      sendJson(res, 200, rooms)
      return
    }

    const roomMessageMatch = url.pathname.match(/^\/v2\/rooms\/(\d+)\/messages$/)
    if (req.method === 'GET' && roomMessageMatch) {
      if (mode.messagesShouldFail) {
        sendJson(res, 500, { error: 'Mock messages failure' })
        return
      }
      const roomId = roomMessageMatch[1]
      sendJson(res, 200, messages[roomId] || [])
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  })().catch((error) => {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Unknown server error',
    })
  })
})

server.listen(port, () => {
  console.log(`Mock Chatwork API listening on http://localhost:${port}`)
})

const shutdown = () => {
  server.close(() => {
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
