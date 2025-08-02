/**
 * 错误定义统一导出
 */

// 具体导出避免循环依赖

// 队列错误类
export {
  ConfigurationError,
  ConsumerGroupError,
  InvalidMessageError,
  MaxRetriesExceededError,
  MessageAckError,
  MessageDeserializationError,
  MessageProcessingError,
  MessageReceiveError,
  MessageSendError,
  MessageSerializationError,
  MessageValidationError,
  PermissionError,
  QueueAlreadyExistsError,
  QueueConfigurationError,
  QueueError,
  QueueFullError,
  QueueNotFoundError,
  QueueOperationError,
  SerializationError,
  TimeoutError
} from './queue-error.js';

// Redis错误类
export {
  RedisClusterError,
  RedisCommandError,
  RedisConnectionError,
  RedisError,
  RedisNodeUnavailableError,
  RedisOutOfMemoryError,
  RedisTimeoutError
} from './redis-error.js';

// 注意：错误类已经在上面导出，这里不需要重复导出类型

// 错误工厂函数
export { createQueueError } from './queue-error.js';
export { createRedisError } from './redis-error.js';

// 错误类型检查函数
export {
  isRedisClusterError,
  isRedisCommandError,
  isRedisConnectionError,
  isRedisError
} from './redis-error.js';

// 通用错误处理函数
export const handleError = (error: any): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Unknown error occurred');
};

// 错误重试判断函数
export const isRetryableError = (error: any): boolean => {
  if (!error) return false;

  // Redis连接错误可重试
  if (error.code === 'REDIS_CONNECTION_ERROR') return true;
  if (error.code === 'REDIS_TIMEOUT_ERROR') return true;
  if (error.code === 'REDIS_NODE_UNAVAILABLE') return true;

  // 队列超时错误可重试
  if (error.code === 'TIMEOUT_ERROR') return true;

  // 消息发送错误可重试
  if (error.code === 'MESSAGE_SEND_ERROR') return true;

  // 网络相关错误可重试
  if (error.code === 'ECONNRESET') return true;
  if (error.code === 'ECONNREFUSED') return true;
  if (error.code === 'ETIMEDOUT') return true;

  return false;
};

// 错误严重级别判断函数
export const getErrorSeverity = (
  error: any
): 'low' | 'medium' | 'high' | 'critical' => {
  if (!error) return 'low';

  // 关键错误
  if (error.code === 'REDIS_CLUSTER_ERROR') return 'critical';
  if (error.code === 'REDIS_OUT_OF_MEMORY') return 'critical';
  if (error.code === 'QUEUE_FULL') return 'critical';

  // 高级错误
  if (error.code === 'REDIS_CONNECTION_ERROR') return 'high';
  if (error.code === 'REDIS_NODE_UNAVAILABLE') return 'high';
  if (error.code === 'MAX_RETRIES_EXCEEDED') return 'high';

  // 中级错误
  if (error.code === 'MESSAGE_SEND_ERROR') return 'medium';
  if (error.code === 'MESSAGE_RECEIVE_ERROR') return 'medium';
  if (error.code === 'TIMEOUT_ERROR') return 'medium';

  // 低级错误
  return 'low';
};
