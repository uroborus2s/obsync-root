export interface ApiErrorOptions {
  code?: string
  details?: unknown
  status: number
}

export class ApiError extends Error {
  readonly code?: string
  readonly details?: unknown
  readonly status: number

  constructor(message: string, options: ApiErrorOptions) {
    super(message)
    this.name = 'ApiError'
    this.code = options.code
    this.details = options.details
    this.status = options.status
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof Error) {
    return new ApiError(error.message, {
      status: 500,
      details: error,
    })
  }

  return new ApiError('An unexpected error occurred.', {
    status: 500,
    details: error,
  })
}

export function getErrorMessage(error: unknown): string {
  return normalizeApiError(error).message
}
