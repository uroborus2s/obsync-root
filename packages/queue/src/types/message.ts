/**
 * 消息相关类型定义
 */

// 消息接口
export interface Message<T = any> {
  id?: string; // 消息ID
  payload: T; // 消息内容
  priority?: number; // 优先级 (0-9)
  delay?: number; // 延迟时间(ms)
  headers?: Record<string, any>; // 消息头
  timestamp?: number; // 时间戳
  retryCount?: number; // 重试次数
  maxRetries?: number; // 最大重试次数
  source?: string; // 消息来源
  traceId?: string; // 链路追踪ID
}

// 发送选项
export interface SendOptions {
  priority?: number;
  delay?: number;
  headers?: Record<string, any>;
  timeout?: number;
  retryPolicy?: string; // 重试策略名称
  deadLetterQueue?: string; // 死信队列
  compression?: boolean; // 是否压缩
}

// 发送结果
export interface SendResult {
  messageId: string;
  redisMessageId?: string; // Redis Stream消息ID
  timestamp: number;
  queue: string;
  status?: 'sent' | 'delayed' | 'failed';
  success: boolean;
  error?: string;
  delayed?: boolean; // 是否为延迟消息
  executeAt?: number; // 延迟消息的执行时间戳
}

// 批量发送结果
export interface BatchSendResult {
  results: SendResult[];
  successCount: number;
  failureCount: number;
  totalCount: number;
}

// 消费结果
export interface ConsumeResult<T = any> {
  message: Message<T>;
  messageId: string;
  queue: string;
  consumer: string;
  timestamp: number;

  // 消息确认方法
  ack(): Promise<void>; // 确认消息
  nack(requeue?: boolean): Promise<void>; // 拒绝消息
}

// 消息处理器类型
export type MessageHandler<T = any> = (
  result: ConsumeResult<T>
) => Promise<void>;
export type BatchMessageHandler<T = any> = (
  results: ConsumeResult<T>[]
) => Promise<void>;

// 消息状态
export enum MessageStatus {
  PENDING = 'pending', // 待处理
  PROCESSING = 'processing', // 处理中
  COMPLETED = 'completed', // 已完成
  FAILED = 'failed', // 失败
  RETRYING = 'retrying', // 重试中
  DEAD_LETTER = 'dead_letter' // 死信
}

// 消息元数据
export interface MessageMetadata {
  id: string;
  queue: string;
  status: MessageStatus;
  createdAt: number;
  updatedAt: number;
  processedAt?: number;
  retryCount: number;
  maxRetries: number;
  lastError?: string;
  processingTime?: number;
  consumerGroup?: string;
  consumerName?: string;
}

// 延迟消息
export interface DelayedMessage<T = any> extends Message<T> {
  executeAt: number; // 执行时间戳
  originalQueue: string; // 原始队列
}

// 死信消息
export interface DeadLetterMessage<T = any> extends Message<T> {
  originalQueue: string; // 原始队列
  failureReason: string; // 失败原因
  failedAt: number; // 失败时间
  attempts: number; // 尝试次数
}

// 消息统计
export interface MessageStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  deadLetter: number;
}

// 队列事件类型
export type QueueEvent =
  | 'message-sent'
  | 'message-received'
  | 'message-acked'
  | 'message-nacked'
  | 'message-retried'
  | 'message-failed'
  | 'message-dead-letter'
  | 'queue-created'
  | 'queue-deleted'
  | 'consumer-joined'
  | 'consumer-left'
  | 'batch-sent'
  | 'batch-processed';

// 事件数据
export interface QueueEventData {
  queue: string;
  messageId?: string;
  consumer?: string;
  timestamp: number;
  metadata?: any;
}

// 消息过滤器
export interface MessageFilter {
  priority?: number | number[];
  headers?: Record<string, any>;
  source?: string | string[];
  createdAfter?: number;
  createdBefore?: number;
}

// 消息查询选项
export interface MessageQueryOptions {
  limit?: number;
  offset?: number;
  filter?: MessageFilter;
  sortBy?: 'timestamp' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// 消息查询结果
export interface MessageQueryResult<T = any> {
  messages: Message<T>[];
  total: number;
  offset: number;
  limit: number;
  hasMore?: boolean; // 是否还有更多数据
}
