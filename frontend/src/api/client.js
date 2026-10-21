// Thin fetch wrapper for the Flask API. The session lives in an HttpOnly
// cookie, so requests only need to be same-origin (Vite proxies /api in dev).

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function apiFetch(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Could not reach the Life OS server.', 0, null)
  }

  let data = null
  try {
    data = await res.json()
  } catch { /* non-JSON response (e.g. proxy error page) */ }

  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data)
  }
  return data
}
