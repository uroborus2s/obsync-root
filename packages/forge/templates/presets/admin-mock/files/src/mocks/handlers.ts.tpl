import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/health', () =>
    HttpResponse.json({
      ok: true,
      mode: 'mock',
      timestamp: new Date().toISOString(),
    })
  ),
]
