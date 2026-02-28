type MockMode = {
  roomsShouldFail?: boolean
  messagesShouldFail?: boolean
}

const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:3000'
const MOCK_CHATWORK_URL = process.env.E2E_MOCK_CHATWORK_URL || 'http://localhost:9101'

const postJson = async <T>(url: string, payload: unknown = {}): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`POST ${url} failed: ${response.status} ${body}`)
  }

  return response.json() as Promise<T>
}

export const resetBackendState = async () => {
  await postJson(`${BACKEND_URL}/api/test/reset`)
}

export const setMockMode = async (mode: MockMode) => {
  await postJson(`${MOCK_CHATWORK_URL}/__test/mode`, mode)
}

export const resetMockMode = async () => {
  await postJson(`${MOCK_CHATWORK_URL}/__test/reset`)
}
