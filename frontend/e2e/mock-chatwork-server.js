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

const sendJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
  })
  res.end(JSON.stringify(payload))
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: 'Missing url' })
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  if (req.method === 'GET' && url.pathname === '/healthz') {
    sendJson(res, 200, { status: 'ok' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/v2/rooms') {
    sendJson(res, 200, rooms)
    return
  }

  const roomMessageMatch = url.pathname.match(/^\/v2\/rooms\/(\d+)\/messages$/)
  if (req.method === 'GET' && roomMessageMatch) {
    const roomId = roomMessageMatch[1]
    sendJson(res, 200, messages[roomId] || [])
    return
  }

  sendJson(res, 404, { error: 'Not found' })
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
