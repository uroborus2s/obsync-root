/**
 * 事件相关类型定义
 */

import type { TaskBase } from './task.types.js';

/**
 * 任务事件基础接口
 */
export interface TaskEventBase {
  /** 事件时间戳 */
  timestamp: Date;
  /** 任务ID */
  taskId: string;
  /** 事件类型 */
  type: string;
}

/**
 * 任务状态变更事件
 */
export interface TaskStatusChangeEvent extends TaskEventBase {
  type: 'status_change';
  /** 旧状态 */
  oldStatus: string;
  /** 新状态 */
  newStatus: string;
  /** 任务信息 */
  task: TaskBase;
}

/**
 * 任务进度更新事件
 */
export interface TaskProgressUpdateEvent extends TaskEventBase {
  type: 'progress_update';
  /** 旧进度 */
  oldProgress: number;
  /** 新进度 */
  newProgress: number;
  /** 任务信息 */
  task: TaskBase;
}

/**
 * 任务创建事件
 */
export interface TaskCreatedEvent extends TaskEventBase {
  type: 'task_created';
  /** 任务信息 */
  task: TaskBase;
}

/**
 * 任务删除事件
 */
export interface TaskDeletedEvent extends TaskEventBase {
  type: 'task_deleted';
  /** 被删除的任务信息 */
  task: TaskBase;
}

/**
 * 任务执行开始事件
 */
export interface TaskExecutionStartedEvent extends TaskEventBase {
  type: 'execution_started';
  /** 任务信息 */
  task: TaskBase;
  /** 执行器名称 */
  executorName: string;
}

/**
 * 任务执行完成事件
 */
export interface TaskExecutionCompletedEvent extends TaskEventBase {
  type: 'execution_completed';
  /** 任务信息 */
  task: TaskBase;
  /** 执行器名称 */
  executorName: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 执行结果 */
  result?: any;
}

/**
 * 任务执行失败事件
 */
export interface TaskExecutionFailedEvent extends TaskEventBase {
  type: 'execution_failed';
  /** 任务信息 */
  task: TaskBase;
  /** 执行器名称 */
  executorName: string;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 错误信息 */
  error: string;
  /** 错误堆栈 */
  stack?: string;
}

/**
 * 任务树变更事件
 */
export interface TaskTreeChangeEvent extends TaskEventBase {
  type: 'tree_change';
  /** 变更类型 */
  changeType: 'add' | 'remove' | 'move';
  /** 父任务ID */
  parentId?: string;
  /** 任务信息 */
  task: TaskBase;
}

/**
 * 所有任务事件类型的联合类型
 */
export type TaskEvent =
  | TaskStatusChangeEvent
  | TaskProgressUpdateEvent
  | TaskCreatedEvent
  | TaskDeletedEvent
  | TaskExecutionStartedEvent
  | TaskExecutionCompletedEvent
  | TaskExecutionFailedEvent
  | TaskTreeChangeEvent;

/**
 * 事件监听器类型
 */
export type TaskEventListener<T extends TaskEvent = TaskEvent> = (
  event: T
) => void | Promise<void>;

/**
 * 事件发布器接口
 */
export interface ITaskEventEmitter {
  /**
   * 发布事件
   */
  emit<T extends TaskEvent>(event: T): void;

  /**
   * 监听事件
   */
  on<T extends TaskEvent>(
    eventType: T['type'],
    listener: TaskEventListener<T>
  ): void;

  /**
   * 监听一次事件
   */
  once<T extends TaskEvent>(
    eventType: T['type'],
    listener: TaskEventListener<T>
  ): void;

  /**
   * 移除事件监听器
   */
  off<T extends TaskEvent>(
    eventType: T['type'],
    listener: TaskEventListener<T>
  ): void;

  /**
   * 移除所有事件监听器
   */
  removeAllListeners(eventType?: string): void;
}
