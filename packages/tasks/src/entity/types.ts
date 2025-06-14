/**
 * 实体层类型定义
 */

/**
 * 任务数据接口
 */
export interface TaskData {
  name: string;
  description: string;
  type?: string; // 任务类型，用于数据库分类
  /** 执行器名称（可选） */
  executorName?: string;
  priority?: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
  parentId?: string | null; // 父任务ID（用于数据库同步）
  progress?: number;
  status?: TaskStatus;
}

// TaskStatus 已移动到 types/task.types.ts 中统一管理
import { TaskStatus, TaskStatusUtils } from '../types/task.types.js';
export { TaskStatus, TaskStatusUtils };

/**
 * 任务状态变更事件
 */
export enum TaskStatusChangeEvent {
  STARTED = 'started',
  PAUSED = 'paused',
  RESUMED = 'resumed',
  SUCCESS = 'success', // 成功完成事件
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed' // 通用完成事件
}

/**
 * 触发类型
 */
export enum TriggerType {
  MANUAL = 'manual',
  CASCADED = 'cascaded'
}

/**
 * 任务节点占位符（用于内存优化）
 */
export interface TaskNodePlaceholder {
  id: string;
  name: string;
  status: TaskStatus;
  progress: number;
  completedAt: Date;
  isPlaceholder: true;
}

/**
 * 任务状态数据库同步事件数据
 */
export interface TaskStatusSyncEvent {
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  progress: number;
  timestamp: Date;
  reason?: string;
  executorName?: string;
  taskData: TaskData;
  triggerType: TriggerType;
}

/**
 * 数据库同步回调函数类型
 */
export type TaskStatusSyncCallback = (
  event: TaskStatusSyncEvent
) => Promise<void>;

// TaskStatusUtils 已移动到 types/task.types.ts 中统一管理
