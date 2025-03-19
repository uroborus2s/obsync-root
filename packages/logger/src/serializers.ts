/**
 * 错误序列化器
 * 将错误对象序列化为JSON友好格式
 */
export function errSerializer(err: Error | any): Record<string, any> {
  if (!(err instanceof Error)) {
    return err;
  }

  const result: Record<string, any> = {
    type: err.constructor.name,
    message: err.message,
    stack: err.stack
  };

  // 处理附加属性
  for (const key in err) {
    if (
      Object.prototype.hasOwnProperty.call(err, key) &&
      key !== 'stack' &&
      key !== 'message'
    ) {
      result[key] = (err as Record<string, any>)[key];
    }
  }

  return result;
}

/**
 * 请求序列化器
 * 序列化HTTP请求对象
 */
export function reqSerializer(req: any): Record<string, any> {
  if (!req) {
    return req;
  }

  return {
    method: req.method,
    url: req.url || req.originalUrl,
    path: req.path,
    protocol: req.protocol,
    ip: req.ip || (req.connection && req.connection.remoteAddress),
    headers: sanitizeHeaders(req.headers || {}),
    id: req.id || (req.headers && req.headers['x-request-id'])
  };
}

/**
 * 响应序列化器
 * 序列化HTTP响应对象
 */
export function resSerializer(res: any): Record<string, any> {
  if (!res) {
    return res;
  }

  return {
    statusCode: res.statusCode,
    headers: res.getHeaders ? res.getHeaders() : {},
    responseTime: res.getResponseTime ? res.getResponseTime() : undefined
  };
}

/**
 * 过滤请求头中的敏感信息
 */
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  // 复制所有头信息
  for (const key in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, key)) {
      result[key] = headers[key];
    }
  }

  // 敏感头信息列表
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'apikey',
    'x-authorization'
  ];

  // 脱敏敏感信息
  for (const header of sensitiveHeaders) {
    if (result[header]) {
      result[header] = '[REDACTED]';
    }
  }

  return result;
}

/**
 * 默认序列化器集合
 */
export const defaultSerializers = {
  err: errSerializer,
  req: reqSerializer,
  res: resSerializer
};
