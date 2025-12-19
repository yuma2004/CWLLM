const DEFAULT_BASE_URL = 'https://api.chatwork.com/v2';
const DEFAULT_TIMEOUT_MS = 8000;

function createChatworkError(message, statusCode, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}

function buildUrl(baseUrl, path, query) {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function createChatworkService(options = {}) {
  const apiToken = options.apiToken || process.env.CHATWORK_API_TOKEN;
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl || fetch;

  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is not available for chatworkService');
  }

  function ensureToken() {
    if (!apiToken) {
      throw createChatworkError('CHATWORK_API_TOKEN is not set', 500);
    }
  }

  async function request(path, { method = 'GET', query, body } = {}) {
    ensureToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const url = buildUrl(baseUrl, path, query);

    const headers = {
      Accept: 'application/json',
      'X-ChatWorkToken': apiToken
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw createChatworkError('Chatwork API request timed out', 504);
      }
      throw createChatworkError('Chatwork API request failed', 502, { message: error?.message });
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = response.headers.get('content-type') || '';
    let payload = null;

    try {
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        payload = await response.text();
      }
    } catch (_) {
      payload = null;
    }

    if (!response.ok) {
      const message =
        (payload && payload.message) ||
        (payload && payload.errors && payload.errors.join(' ')) ||
        `Chatwork API error (${response.status})`;
      throw createChatworkError(message, response.status, payload);
    }

    return payload;
  }

  function listRooms() {
    return request('/rooms');
  }

  function listRoomMessages(roomId, { force } = {}) {
    if (!roomId) {
      throw createChatworkError('roomId is required', 400);
    }
    return request(`/rooms/${roomId}/messages`, {
      query: force !== undefined ? { force: force ? 1 : 0 } : undefined
    });
  }

  return {
    listRooms,
    listRoomMessages
  };
}

module.exports = { createChatworkService };

