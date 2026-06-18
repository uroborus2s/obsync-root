import { ApiError, normalizeApiError } from '@/lib/api/api-error'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiRequestConfig<TData> {
  body?: unknown
  delayMs?: number
  method?: HttpMethod
  mock?: () => Promise<TData> | TData
  path: string
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, delayMs)
  })
}

async function request<TData>({
  body,
  delayMs = 250,
  method = 'GET',
  mock,
  path,
}: ApiRequestConfig<TData>): Promise<TData> {
  const apiMode = import.meta.env.VITE_API_MODE ?? 'mock'

  try {
    if (apiMode === 'mock') {
      if (!mock) {
        throw new ApiError(`No mock handler configured for ${method} ${path}.`, {
          status: 500,
        })
      }

      await wait(delayMs)
      return await mock()
    }

    const response = await fetch(path, {
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
      },
      method,
    })

    if (!response.ok) {
      let payload: unknown = null

      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      throw new ApiError(
        response.statusText || 'The request did not complete successfully.',
        {
          status: response.status,
          details: payload,
        }
      )
    }

    return (await response.json()) as TData
  } catch (error) {
    throw normalizeApiError(error)
  }
}

export const apiClient = {
  request,
}
