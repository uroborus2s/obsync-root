/**
 * 任务管理器相关类型定义
 */

import type { EventEmitter } from 'events';
import type {
  BatchCreateResult,
  BatchCreateTaskParams,
  CreateTaskParams,
  TaskBase,
  TaskExecutorConfig,
  TaskExecutorRegistration,
  TaskQueryParams,
  TaskStats,
  TaskTreeNode
} from './task.types.js';

/**
 * 临时Task类型定义 - 等待新架构完善
 */
export interface Task {
  id: string;
  name: string;
  // TODO: 完善Task接口定义
}

/**
 * 任务管理器配置
 */
export interface TaskManagerConfig {
  /** 最大并发执行任务数 */
  maxConcurrency?: number;
  /** 任务执行超时时间（毫秒） */
  defaultTimeout?: number;
  /** 是否自动启动 */
  autoStart?: boolean;
  /** 进度更新间隔（毫秒） */
  progressUpdateInterval?: number;
  /** 是否启用持久化 */
  enablePersistence?: boolean;
  /** 持久化间隔（毫秒） */
  persistenceInterval?: number;
  /** 最大任务树深度 */
  maxTreeDepth?: number;
  /** 是否启用事件发布 */
  enableEvents?: boolean;
}

/**
 * 任务管理器接口
 */
export interface ITaskManager extends EventEmitter {
  /** 配置信息 */
  readonly config: TaskManagerConfig;

  /**
   * 创建任务
   */
  createTask(params: CreateTaskParams): Promise<TaskBase>;

  /**
   * 批量创建任务（使用事务确保原子性）
   */
  batchCreateTasks(params: BatchCreateTaskParams): Promise<BatchCreateResult>;

  /**
   * 获取任务
   */
  getTask(id: string): Promise<TaskBase | null>;

  /**
   * 根据名称获取任务 (精确匹配)
   */
  getTaskByName(name: string): Promise<TaskBase | null>;

  /**
   * 根据名称获取任务对象
   */
  getTaskObjectByName(
    name: string,
    config?: TaskExecutorConfig
  ): Promise<Task | null>;

  /**
   * 获取Task对象（公开方法）
   */
  getTaskObject(
    taskId: string,
    forceRefresh?: boolean,
    config?: TaskExecutorConfig
  ): Promise<Task | null>;

  /**
   * 根据名称搜索任务 (支持模糊匹配)
   */
  searchTasksByName(
    name: string,
    exact?: boolean,
    limit?: number
  ): Promise<TaskBase[]>;

  /**
   * 删除任务
   */
  deleteTask(id: string): Promise<void>;

  /**
   * 根据名称删除任务
   */
  deleteTaskByName(name: string): Promise<void>;

  /**
   * 查询任务列表
   */
  queryTasks(params?: TaskQueryParams): Promise<TaskBase[]>;

  /**
   * 获取任务树
   */
  getTaskTree(rootId?: string): Promise<TaskTreeNode[]>;

  /**
   * 开始执行任务
   */
  startTask(id: string): Promise<void>;

  /**
   * 根据名称开始执行任务
   */
  startTaskByName(name: string): Promise<void>;

  /**
   * 暂停任务
   */
  pauseTask(id: string): Promise<void>;

  /**
   * 根据名称暂停任务
   */
  pauseTaskByName(name: string): Promise<void>;

  /**
   * 继续任务
   */
  resumeTask(id: string): Promise<void>;

  /**
   * 根据名称继续任务
   */
  resumeTaskByName(name: string): Promise<void>;

  /**
   * 停止任务
   */
  stopTask(id: string): Promise<void>;

  /**
   * 根据名称停止任务
   */
  stopTaskByName(name: string): Promise<void>;

  /**
   * 获取任务统计信息
   */
  getStats(): Promise<TaskStats>;

  /**
   * 订阅任务完成事件
   */
  subscribeTaskCompletion(
    taskId: string,
    callback: (task: TaskBase, result?: any) => void
  ): () => void;

  /**
   * 订阅任务失败事件
   */
  subscribeTaskFailure(
    taskId: string,
    callback: (task: TaskBase, error: string | Error) => void
  ): () => void;

  /**
   * 取消订阅任务完成事件
   */
  unsubscribeTaskCompletion(
    taskId: string,
    callback?: (task: TaskBase, result?: any) => void
  ): void;

  /**
   * 取消订阅任务失败事件
   */
  unsubscribeTaskFailure(
    taskId: string,
    callback?: (task: TaskBase, error: string | Error) => void
  ): void;

  /**
   * 通用事件订阅方法
   */
  subscribeTaskEvent(
    taskId: string,
    eventType: 'completion' | 'failure',
    callback: (task: TaskBase, data?: any) => void
  ): () => void;

  /**
   * 获取任务的订阅者统计
   */
  getTaskSubscriberStats(taskId: string): {
    completionSubscribers: number;
    failureSubscribers: number;
  };

  /**
   * 订阅任务消息（便捷方法）
   */
  subscribeTaskMessage(
    taskId: string,
    messageType: string,
    callback: (message: any, task: Task) => void,
    once?: boolean
  ): Promise<(() => void) | null>;

  /**
   * 订阅任务消息（一次性，便捷方法）
   */
  subscribeTaskMessageOnce(
    taskId: string,
    messageType: string,
    callback: (message: any, task: Task) => void
  ): Promise<(() => void) | null>;

  /**
   * 通过任务名称订阅任务消息
   */
  subscribeTaskMessageByName(
    taskName: string,
    messageType: string,
    callback: (message: any, task: Task) => void,
    once?: boolean
  ): Promise<(() => void) | null>;

  /**
   * 发布任务消息（便捷方法）
   */
  publishTaskMessage(
    taskId: string,
    messageType: string,
    message: any
  ): Promise<boolean>;

  /**
   * 通过任务名称发布任务消息
   */
  publishTaskMessageByName(
    taskName: string,
    messageType: string,
    message: any
  ): Promise<boolean>;

  /**
   * 取消任务消息订阅（便捷方法）
   */
  unsubscribeTaskMessage(
    taskId: string,
    messageType: string,
    callback?: (message: any, task: Task) => void
  ): Promise<boolean>;

  /**
   * 获取任务消息订阅统计
   */
  getTaskMessageStats(
    taskId: string
  ): Promise<{ [messageType: string]: number } | null>;

  /**
   * 完成任务
   * 供执行器调用的便捷方法
   */
  completeTask(taskId: string, data?: any, progress?: number): Promise<void>;

  /**
   * 根据名称完成任务
   * 供执行器调用的便捷方法
   */
  completeTaskByName(
    name: string,
    data?: any,
    progress?: number
  ): Promise<void>;

  /**
   * 标记任务失败
   * 供执行器调用的便捷方法
   */
  failTask(
    taskId: string,
    error: string | Error,
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * 根据名称标记任务失败
   * 供执行器调用的便捷方法
   */
  failTaskByName(
    name: string,
    error: string | Error,
    metadata?: Record<string, any>
  ): Promise<void>;
}

/**
 * 任务管理器事件类型
 */
export interface TaskManagerEvents {
  /** 管理器启动 */
  'manager:started': () => void;
  /** 管理器停止 */
  'manager:stopped': () => void;
  /** 任务创建 */
  'task:created': (task: TaskBase) => void;
  /** 任务更新 */
  'task:updated': (task: TaskBase) => void;
  /** 任务删除 */
  'task:deleted': (taskId: string) => void;
  /** 任务开始 */
  'task:started': (task: TaskBase) => void;
  /** 任务暂停 */
  'task:paused': (task: TaskBase) => void;
  /** 任务继续 */
  'task:resumed': (task: TaskBase) => void;
  /** 任务完成 */
  'task:completed': (task: TaskBase) => void;
  /** 任务失败 */
  'task:failed': (task: TaskBase, error: Error) => void;
  /** 任务停止 */
  'task:stopped': (task: TaskBase) => void;
  /** 进度更新 */
  'task:progress': (task: TaskBase, progress: number) => void;
  /** 执行器注册 */
  'executor:registered': (name: string) => void;
  /** 执行器注销 */
  'executor:unregistered': (name: string) => void;
}

/**
 * 恢复配置接口
 */
export interface RecoveryConfig {
  /** 是否启用自动恢复 */
  enabled?: boolean;
  /** 恢复延迟（毫秒） */
  delay?: number;
  /** 最大恢复尝试次数 */
  maxRetries?: number;
  /** 重试间隔（毫秒） */
  retryInterval?: number;
  /** 是否恢复暂停的任务 */
  recoverPausedTasks?: boolean;
}

/**
 * 消息代理配置接口
 */
export interface MessageBrokerConfig {
  /** 是否启用消息代理 */
  enabled?: boolean;
  /** 消息队列最大长度 */
  maxQueueLength?: number;
  /** 批处理大小 */
  batchSize?: number;
  /** 处理间隔（毫秒） */
  processInterval?: number;
}

/**
 * 任务插件配置
 */
export interface TaskPluginOptions {
  /** 任务管理器配置 */
  manager?: Partial<TaskManagerConfig>;
  /** 预注册的执行器 */
  executors?: TaskExecutorRegistration[];
  /** 任务恢复配置 */
  recovery?: Partial<RecoveryConfig>;
  /** 消息代理配置 */
  messageBroker?: Partial<MessageBrokerConfig>;
}

/**
 * 任务操作选项
 */
export interface TaskOperationOptions {
  /** 是否级联操作到子任务 */
  cascade?: boolean;
  /** 是否强制操作（忽略状态检查） */
  force?: boolean;
  /** 操作超时时间（毫秒） */
  timeout?: number;
}

/**
 * 任务批量操作参数
 */
export interface BatchTaskOperation {
  /** 任务ID列表 */
  taskIds: string[];
  /** 操作类型 */
  operation: 'start' | 'pause' | 'resume' | 'stop' | 'delete';
  /** 操作选项 */
  options?: TaskOperationOptions;
}

/**
 * 任务批量操作结果
 */
export interface BatchTaskOperationResult {
  /** 成功的任务ID列表 */
  success: string[];
  /** 失败的任务ID及错误信息 */
  failed: Array<{
    taskId: string;
    error: string;
  }>;
  /** 总处理数量 */
  total: number;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failedCount: number;
}
