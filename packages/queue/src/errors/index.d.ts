/**
 * 错误定义统一导出
 */
export { ConfigurationError, ConsumerGroupError, InvalidMessageError, MaxRetriesExceededError, MessageAckError, MessageDeserializationError, MessageProcessingError, MessageReceiveError, MessageSendError, MessageSerializationError, MessageValidationError, PermissionError, QueueAlreadyExistsError, QueueConfigurationError, QueueError, QueueFullError, QueueNotFoundError, QueueOperationError, SerializationError, TimeoutError } from './queue-error.js';
export { RedisClusterError, RedisCommandError, RedisConnectionError, RedisError, RedisNodeUnavailableError, RedisOutOfMemoryError, RedisTimeoutError } from './redis-error.js';
export { createQueueError } from './queue-error.js';
export { createRedisError } from './redis-error.js';
export { isRedisClusterError, isRedisCommandError, isRedisConnectionError, isRedisError } from './redis-error.js';
export declare const handleError: (error: any) => Error;
export declare const isRetryableError: (error: any) => boolean;
export declare const getErrorSeverity: (error: any) => "low" | "medium" | "high" | "critical";
//# sourceMappingURL=index.d.ts.map