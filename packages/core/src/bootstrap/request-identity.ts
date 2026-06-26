export interface RequestIdentityOptions {
  requestIdHeader?: string;
  traceIdHeader?: string;
  includeTraceId?: boolean;
}

export interface RequestIdentity {
  requestId: string;
  traceId?: string;
}

function createRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function createTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function headerValue(
  headers: Record<string, unknown> | undefined,
  headerName: string | undefined
): string | undefined {
  if (!headers || !headerName) {
    return undefined;
  }

  const value = headers[headerName.toLowerCase()];
  const firstValue = Array.isArray(value) ? value[0] : value;
  return typeof firstValue === 'string' && firstValue.length > 0
    ? firstValue
    : undefined;
}

export function getRequestId(request: unknown): string | undefined {
  const candidate = (request as any)?.requestId ?? (request as any)?.id;

  return typeof candidate === 'string' ? candidate : undefined;
}

export function resolveRequestIdentity(
  request: unknown,
  options: RequestIdentityOptions = {}
): RequestIdentity {
  const requestRecord = request as any;
  const headers = requestRecord?.headers as Record<string, unknown> | undefined;
  const requestId =
    headerValue(headers, options.requestIdHeader || 'x-request-id') ||
    getRequestId(request) ||
    createRequestId();

  const identity: RequestIdentity = { requestId };

  if (options.includeTraceId) {
    identity.traceId =
      headerValue(headers, options.traceIdHeader || 'x-trace-id') ||
      (typeof requestRecord?.traceId === 'string'
        ? requestRecord.traceId
        : undefined) ||
      createTraceId();
  }

  return identity;
}

export function assignRequestIdentity(
  request: unknown,
  options: RequestIdentityOptions = {}
): RequestIdentity {
  const identity = resolveRequestIdentity(request, options);
  const requestRecord = request as any;
  requestRecord.requestId = identity.requestId;

  if (identity.traceId) {
    requestRecord.traceId = identity.traceId;
  }

  return identity;
}
