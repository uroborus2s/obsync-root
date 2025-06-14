/**
 * 服务层类型定义
 */

import { TaskNode } from '../entity/taskNode.js';
import { TaskNodePlaceholder, TaskStatus } from '../entity/types.js';
import { TreeCompletionEvent } from '../subscribe/treeCleanupSubscribe.js';
import { ExtendedCreateTaskParams } from './TaskTreeService.js';

/**
 * Handler配置接口
 */
export interface HandlerConfig {
  name: string;
  type: 'single' | 'multi';
  config?: Record<string, any>;
}

/**
 * 任务查询选项
 */
export interface TaskQueryOptions {
  includeChildren?: boolean;
  includeAncestors?: boolean;
  status?: TaskStatus | TaskStatus[];
  limit?: number;
  offset?: number;
}

/**
 * 任务树统计信息
 */
export interface TaskTreeStatistics {
  totalTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  pausedTasks: number;
  cancelledTasks: number;
  rootTasksCount: number;
}

/**
 * 任务恢复结果
 */
export interface TaskRecoveryResult {
  recoveredCount: number;
  rootTasksCount: number;
  placeholderCount?: number;
  errors: Array<{
    taskId: string;
    error: string;
  }>;
  duration: number;
}

/**
 * 任务状态变更结果
 */
export interface TaskStateChangeResult {
  success: boolean;
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  error?: string;
  executionTime: number;
}

export interface TaskTreeView {
  rootTasks: Array<{
    id: string;
    name?: string;
    status: TaskStatus;
    progress: number;
    isPlaceholder: boolean;
    children: Array<{
      id: string;
      name?: string;
      status: TaskStatus;
      progress: number;
      isPlaceholder: boolean;
    }>;
  }>;
  statistics: {
    totalNodes: number;
    runningNodes: number;
    placeholderNodes: number;
    rootCount: number;
  };
}
/**
 * 任务树服务接口
 */
export interface ITaskTreeService {
  // 核心任务管理
  createTask(params: ExtendedCreateTaskParams): Promise<TaskNode>;
  getTask(id: string): TaskNode | TaskNodePlaceholder | null;
  getTaskByname(name: string): TaskNode | TaskNodePlaceholder | null;
  setTask(id: string, taskNode: TaskNode): void;
  getRootTasks(): Promise<TaskNode[]>;

  // 任务状态管理
  startTask(id: string, reason?: string): Promise<TaskStateChangeResult>;
  pauseTask(id: string, reason?: string): Promise<TaskStateChangeResult>;
  resumeTask(id: string, reason?: string): Promise<TaskStateChangeResult>;
  cancelTask(id: string, reason?: string): Promise<TaskStateChangeResult>;
  success(
    id: string,
    reason?: string,
    result?: any
  ): Promise<TaskStateChangeResult>;
  fail(
    id: string,
    reason?: string,
    error?: Error
  ): Promise<TaskStateChangeResult>;

  // 恢复和统计
  recoverRunningTasks(): Promise<TaskRecoveryResult>;
  getStatistics(): Promise<TaskTreeStatistics>;
  getTaskCount(): number;

  // 任务树视图
  getCompleteTaskTreeView(): Promise<TaskTreeView>;

  // 事件处理
  handleClearTree(event: TreeCompletionEvent): Promise<void>;
  handleNodePlaceholderConversion(node: TaskNodePlaceholder): Promise<void>;
}
