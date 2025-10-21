/**
 * @stratix/redis 类型定义
 */

// 重新导出适配器相关类型
export type { RedisConfig, RedisAdapter } from '../adapters/redis.adapter.js';

// 重新导出插件配置类型
export type { RedisPluginOptions } from '../index.js';

/**
 * Redis 操作结果类型
 */
export interface RedisOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Redis 连接状态
 */
export enum RedisConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * Redis 连接信息
 */
export interface RedisConnectionInfo {
  status: RedisConnectionStatus;
  host?: string;
  port?: number;
  db?: number;
  mode: 'single' | 'cluster';
  connectedAt?: Date;
  lastError?: string;
}

/**
 * Redis 统计信息
 */
export interface RedisStats {
  totalConnections: number;
  activeConnections: number;
  totalCommands: number;
  failedCommands: number;
  avgResponseTime: number;
  memoryUsage?: number;
}

/**
 * Redis 事件类型
 */
export interface RedisEvents {
  connect: () => void;
  ready: () => void;
  error: (error: Error) => void;
  close: () => void;
  reconnecting: () => void;
  end: () => void;
}

/**
 * Redis 批量操作选项
 */
export interface RedisBatchOptions {
  /** 批量大小 */
  batchSize?: number;
  /** 并发数 */
  concurrency?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 失败时是否继续 */
  continueOnError?: boolean;
}

/**
 * Redis 缓存选项
 */
export interface RedisCacheOptions {
  /** 过期时间（秒） */
  ttl?: number;
  /** 键前缀 */
  prefix?: string;
  /** 序列化器 */
  serializer?: 'json' | 'string' | 'buffer';
  /** 压缩 */
  compress?: boolean;
}

/**
 * Redis 锁选项
 */
export interface RedisLockOptions {
  /** 锁过期时间（毫秒） */
  ttl?: number;
  /** 重试次数 */
  retries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 锁标识符 */
  identifier?: string;
}

/**
 * Redis 发布订阅消息
 */
export interface RedisPubSubMessage {
  channel: string;
  message: string;
  pattern?: string;
  timestamp: Date;
}

/**
 * Redis 流消息
 */
export interface RedisStreamMessage {
  id: string;
  fields: Record<string, string>;
  timestamp: Date;
}

/**
 * Redis 流选项
 */
export interface RedisStreamOptions {
  /** 最大长度 */
  maxLength?: number;
  /** 消费者组 */
  group?: string;
  /** 消费者名称 */
  consumer?: string;
  /** 阻塞时间（毫秒） */
  blockTime?: number;
  /** 批量大小 */
  count?: number;
}
