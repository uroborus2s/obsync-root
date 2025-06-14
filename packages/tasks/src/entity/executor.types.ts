/**
 * 任务执行器类型定义
 * 独立文件避免循环引用
 */

import type { SharedContext } from './SharedContext.js';
import { TaskNode } from './taskNode.js';
import { TaskStatus } from './types.js';

/**
 * 任务执行器接口
 * 定义任务在不同状态变更时的执行逻辑
 * 执行器方法通过call调用，this指向TaskNode，参数为SharedContext
 */
export interface TaskExecutor {
  /** 执行器唯一标识 */
  readonly name: string;
  /** 执行器描述 */
  readonly description?: string;

  /** 任务开始时执行 - 通过call调用，this指向TaskNode，参数为SharedContext */
  onStart?(taskNode: TaskNode, context: SharedContext): Promise<void> | void;
  /** 任务暂停时执行 */
  onPause?(taskNode: TaskNode, context: SharedContext): Promise<void> | void;
  /** 任务恢复时执行 */
  onResume?(taskNode: TaskNode, context: SharedContext): Promise<void> | void;
  /** 任务成功完成时执行 */
  onSuccess?(taskNode: TaskNode, context: SharedContext): Promise<void> | void;
  /** 任务失败时执行 */
  onFail?(taskNode: TaskNode, context: SharedContext): Promise<void> | void;
  /** 任务取消时执行 */
  onCancel?(taskNode: TaskNode, context: SharedContext): Promise<void> | void;
  /** 任务完成时执行（通用完成状态） */
  onComplete?(taskNode: TaskNode, context: SharedContext): Promise<void> | void;
  /** 任务运行时执行 */
  onRun?(taskNode: TaskNode, context: SharedContext): Promise<void> | void;
}

/**
 * 执行器注册事件数据
 */
export interface ExecutorRegistrationEvent {
  /** 任务ID */
  taskId: string;
  /** 执行器名称 */
  executorName: string;
  /** 执行器描述 */
  executorDescription?: string;
  /** 注册时间戳 */
  timestamp: Date;
  /** 任务名称（用于日志记录） */
  taskName?: string;
  /** 任务状态（用于验证） */
  taskStatus?: string;
  /** 是否是替换已有执行器 */
  isReplacement?: boolean;
  /** 被替换的执行器名称 */
  previousExecutorName?: string;
}

/**
 * 节点创建事件数据
 */
export interface NodeCreationEvent {
  /** 任务ID */
  taskId: string;
  /** 任务名称 */
  taskName: string;
  /** 任务描述 */
  taskDescription?: string;
  /** 执行器名称 */
  executorName?: string;
  /** 创建时间戳 */
  timestamp: Date;
  /** 父任务ID（如果有） */
  parentId?: string;
  /** 父任务名称（如果有） */
  parentName?: string;
  /** 任务优先级 */
  priority?: number;
  /** 是否为恢复创建（从数据库恢复） */
  isRecovery: boolean;
  /** 任务数据元信息 */
  metadata?: Record<string, any>;
  /** 任务类型 */
  type?: string;
  /** 任务状态 */
  status?: TaskStatus;
  /** 任务进度 */
  progress?: number;
}

/**
 * Metadata 变更事件数据
 */
export interface MetadataChangeEvent {
  /** 任务ID */
  taskId: string;
  /** 任务名称 */
  taskName: string;
  /** 变更前的 metadata */
  oldMetadata: Record<string, any>;
  /** 变更后的 metadata */
  newMetadata: Record<string, any>;
  /** 变更时间戳 */
  timestamp: Date;
  /** 变更原因 */
  reason?: string;
  /** 变更的具体字段（可选，用于精确跟踪） */
  changedFields?: string[];
}

/**
 * TaskNode 所有事件定义
 * 统一管理任务节点的所有可订阅事件
 */
export const TASK_NODE_EVENTS = {
  // 1. 生命周期事件 (Lifecycle Events)
  /** 节点创建事件 - 任务节点创建时触发 */
  NODE_CREATED: 'node-created',

  // 2. 状态变更事件 (Status Change Events)
  // 2.1 子节点订阅的事件
  /** 任务启动事件 */
  STARTED: 'started',
  /** 任务恢复事件 */
  RESUMED: 'resumed',
  /** 任务暂停事件 */
  PAUSED: 'paused',
  // 2.2 父节点订阅的事件
  /** 任务成功事件 */
  SUCCESS: 'success',
  /** 任务失败事件 */
  FAILED: 'failed',
  /** 任务取消事件 */
  CANCELLED: 'cancelled',
  /** 任务完成事件 */
  COMPLETED: 'completed',

  // 3. 数据库同步事件 (Database Sync Events)
  /** 状态同步事件 - 用于异步数据库更新 */
  STATUS_SYNC: 'status-sync',

  // 5. 数据变更事件 (Data Change Events)
  /** Metadata 变更事件 - 任务元数据变更时触发 */
  METADATA_CHANGED: 'metadata-changed',

  /** 共享上下文变更事件 - 共享上下文变更时触发 */
  CONTEXT_CHANGED: 'context-changed',

  // 6. 树结构管理事件 (Tree Management Events)
  /** 任务树完成事件 - 根节点完成时触发 */
  TREE_COMPLETED: 'tree-completed',
  /** 节点转换为占位符事件 - 内存优化 */
  NODE_CONVERTED_TO_PLACEHOLDER: 'node-converted-to-placeholder'
} as const;

/**
 * TaskNode 事件类型联合
 */
export type TaskNodeEventType =
  (typeof TASK_NODE_EVENTS)[keyof typeof TASK_NODE_EVENTS];

/**
 * 向后兼容：保留原EXECUTOR_EVENTS名称
 * @deprecated 请使用 TASK_NODE_EVENTS.EXECUTOR_REGISTERED 和 TASK_NODE_EVENTS.EXECUTOR_UNREGISTERED
 */
/**
 * 事件分组 - 便于批量操作
 */
export const TASK_NODE_EVENT_GROUPS = {
  /** 生命周期事件组 */
  LIFECYCLE: [TASK_NODE_EVENTS.NODE_CREATED] as const,

  /** 状态变更事件组 */
  STATUS_CHANGE: [
    TASK_NODE_EVENTS.STARTED,
    TASK_NODE_EVENTS.RESUMED,
    TASK_NODE_EVENTS.PAUSED,
    TASK_NODE_EVENTS.SUCCESS,
    TASK_NODE_EVENTS.FAILED,
    TASK_NODE_EVENTS.CANCELLED,
    TASK_NODE_EVENTS.COMPLETED
  ] as const,

  /** 父子节点订阅事件组 */
  PARENT_SUBSCRIBE: [
    TASK_NODE_EVENTS.SUCCESS,
    TASK_NODE_EVENTS.FAILED,
    TASK_NODE_EVENTS.CANCELLED,
    TASK_NODE_EVENTS.COMPLETED
  ] as const,

  /** 子节点订阅事件组 */
  CHILD_SUBSCRIBE: [
    TASK_NODE_EVENTS.STARTED,
    TASK_NODE_EVENTS.RESUMED,
    TASK_NODE_EVENTS.PAUSED
  ] as const,

  /** 数据变更事件组 */
  DATA_CHANGE: [TASK_NODE_EVENTS.METADATA_CHANGED] as const,

  /** 系统内部事件组 */
  INTERNAL: [
    TASK_NODE_EVENTS.STATUS_SYNC,
    TASK_NODE_EVENTS.TREE_COMPLETED,
    TASK_NODE_EVENTS.NODE_CONVERTED_TO_PLACEHOLDER,
    TASK_NODE_EVENTS.METADATA_CHANGED
  ] as const,

  /** 外部可监听事件组 */
  EXTERNAL: [
    TASK_NODE_EVENTS.NODE_CREATED,
    TASK_NODE_EVENTS.STARTED,
    TASK_NODE_EVENTS.RESUMED,
    TASK_NODE_EVENTS.PAUSED,
    TASK_NODE_EVENTS.SUCCESS,
    TASK_NODE_EVENTS.FAILED,
    TASK_NODE_EVENTS.CANCELLED,
    TASK_NODE_EVENTS.COMPLETED,
    TASK_NODE_EVENTS.METADATA_CHANGED
  ] as const
} as const;
