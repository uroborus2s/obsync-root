/**
 * 通用类型定义
 */

/**
 * 分页选项
 */
export interface PaginationOptions {
  /** 页码（从1开始） */
  page: number;
  /** 每页大小 */
  limit: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  data: T[];
  /** 总数量 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页大小 */
  limit: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

/**
 * 排序选项
 */
export interface SortOptions {
  /** 排序字段 */
  field: string;
  /** 排序方向 */
  order: 'asc' | 'desc';
}

/**
 * 查询选项
 */
export interface QueryOptions {
  /** 分页选项 */
  pagination?: PaginationOptions;
  /** 排序选项 */
  sort?: SortOptions;
  /** 过滤条件 */
  filters?: Record<string, any>;
  /** 包含字段 */
  include?: string[];
  /** 排除字段 */
  exclude?: string[];
}

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
  /** 错误详情 */
  errorDetails?: any;
  /** 响应消息 */
  message?: string;
  /** 时间戳 */
  timestamp: Date;
  /** 请求ID */
  requestId?: string;
}

/**
 * 错误类型
 */
export type ErrorType = 
  | 'validation'     // 验证错误
  | 'not_found'      // 资源不存在
  | 'unauthorized'   // 未授权
  | 'forbidden'      // 禁止访问
  | 'conflict'       // 冲突
  | 'internal'       // 内部错误
  | 'timeout'        // 超时
  | 'rate_limit'     // 限流
  | 'dependency';    // 依赖错误

/**
 * 业务错误
 */
export class BusinessError extends Error {
  constructor(
    public readonly type: ErrorType,
    public readonly code: string,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * 状态转换
 */
export interface StateTransition {
  /** 转换ID */
  id: string;
  /** 实体ID */
  entityId: string;
  /** 实体类型 */
  entityType: 'workflow' | 'task';
  /** 原状态 */
  fromState: string;
  /** 目标状态 */
  toState: string;
  /** 转换原因 */
  reason?: string;
  /** 转换时间 */
  timestamp: Date;
  /** 操作者 */
  operator?: string;
  /** 额外数据 */
  metadata?: Record<string, any>;
}

/**
 * 事件类型
 */
export type EventType = 
  | 'workflow.created'
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.cancelled'
  | 'workflow.paused'
  | 'workflow.resumed'
  | 'task.created'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.retried'
  | 'executor.registered'
  | 'executor.unregistered';

/**
 * 事件数据
 */
export interface EventData {
  /** 事件ID */
  id: string;
  /** 事件类型 */
  type: EventType;
  /** 事件源 */
  source: string;
  /** 事件数据 */
  data: any;
  /** 事件时间 */
  timestamp: Date;
  /** 关联ID */
  correlationId?: string;
  /** 事件版本 */
  version?: string;
}

/**
 * 事件监听器
 */
export interface EventListener {
  /**
   * 处理事件
   * @param event 事件数据
   */
  handle(event: EventData): Promise<void>;
  
  /**
   * 获取监听的事件类型
   */
  getEventTypes(): EventType[];
}

/**
 * 事件发布器
 */
export interface EventPublisher {
  /**
   * 发布事件
   * @param event 事件数据
   */
  publish(event: EventData): Promise<void>;
  
  /**
   * 订阅事件
   * @param eventType 事件类型
   * @param listener 监听器
   */
  subscribe(eventType: EventType, listener: EventListener): void;
  
  /**
   * 取消订阅
   * @param eventType 事件类型
   * @param listener 监听器
   */
  unsubscribe(eventType: EventType, listener: EventListener): void;
}

/**
 * 配置提供者
 */
export interface ConfigProvider {
  /**
   * 获取配置值
   * @param key 配置键
   * @param defaultValue 默认值
   */
  get<T = any>(key: string, defaultValue?: T): T;
  
  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  set(key: string, value: any): void;
  
  /**
   * 检查配置是否存在
   * @param key 配置键
   */
  has(key: string): boolean;
}

/**
 * 缓存接口
 */
export interface Cache {
  /**
   * 获取缓存值
   * @param key 缓存键
   */
  get<T = any>(key: string): Promise<T | null>;
  
  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒）
   */
  set(key: string, value: any, ttl?: number): Promise<void>;
  
  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): Promise<void>;
  
  /**
   * 清空缓存
   */
  clear(): Promise<void>;
  
  /**
   * 检查缓存是否存在
   * @param key 缓存键
   */
  has(key: string): Promise<boolean>;
}

/**
 * 锁接口
 */
export interface Lock {
  /**
   * 获取锁
   * @param key 锁键
   * @param ttl 锁过期时间（毫秒）
   */
  acquire(key: string, ttl?: number): Promise<boolean>;
  
  /**
   * 释放锁
   * @param key 锁键
   */
  release(key: string): Promise<void>;
  
  /**
   * 检查锁是否存在
   * @param key 锁键
   */
  isLocked(key: string): Promise<boolean>;
}
