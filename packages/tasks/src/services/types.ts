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
 * 任务树查询选项
 */
export interface TaskTreeQueryOptions {
  /** 返回的最大深度，默认为1（只返回根节点） */
  maxDepth?: number;
  /** 是否包含占位符节点，默认为true */
  includePlaceholders?: boolean;
  /** 分页大小，默认为20 */
  limit?: number;
  /** 分页偏移量，默认为0 */
  offset?: number;
  /** 状态过滤 */
  status?: TaskStatus | TaskStatus[];
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

/**
 * 任务树节点接口（递归结构）
 */
export interface TaskTreeNode {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  progress: number;
  priority: number;
  type: string;
  executorName?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  isPlaceholder: boolean;
  metadata: Record<string, any>;
  /** 子任务列表（递归） */
  children: TaskTreeNode[];
  /** 树的深度 */
  depth: number;
  /** 从根节点到当前节点的路径 */
  path: string[];
}

/**
 * 任务树结构
 */
export interface TaskTree {
  /** 根任务信息 */
  root: TaskTreeNode;
  /** 树的统计信息 */
  statistics: {
    /** 总节点数 */
    totalNodes: number;
    /** 运行中节点数 */
    runningNodes: number;
    /** 已完成节点数 */
    completedNodes: number;
    /** 失败节点数 */
    failedNodes: number;
    /** 占位符节点数 */
    placeholderNodes: number;
    /** 树的最大深度 */
    maxDepth: number;
    /** 总进度（百分比） */
    totalProgress: number;
  };
  /** 树的元数据 */
  metadata: {
    /** 树的创建时间 */
    createdAt: Date;
    /** 树的最后更新时间 */
    lastUpdatedAt: Date;
    /** 根任务名称 */
    rootTaskName: string;
    /** 根任务类型 */
    rootTaskType: string;
  };
}

/**
 * 任务树集合结果
 */
export interface TaskTreesResult {
  /** 所有任务树 */
  trees: TaskTree[];
  /** 全局统计信息 */
  globalStatistics: {
    /** 树的总数 */
    totalTrees: number;
    /** 所有树的总节点数 */
    totalNodes: number;
    /** 所有树的运行中节点数 */
    totalRunningNodes: number;
    /** 所有树的已完成节点数 */
    totalCompletedNodes: number;
    /** 所有树的失败节点数 */
    totalFailedNodes: number;
    /** 所有树的占位符节点数 */
    totalPlaceholderNodes: number;
    /** 全局总进度（百分比） */
    globalProgress: number;
  };
  /** 查询时间戳 */
  timestamp: Date;
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
 * 分层任务树结果
 */
export interface LayeredTaskTreesResult {
  /** 任务树根节点列表 */
  trees: Array<{
    /** 根任务信息 */
    root: TaskTreeNode;
    /** 树的基本统计信息 */
    statistics: {
      /** 总节点数 */
      totalNodes: number;
      /** 已加载节点数 */
      loadedNodes: number;
      /** 树的实际最大深度 */
      actualMaxDepth: number;
      /** 当前返回的最大深度 */
      currentMaxDepth: number;
    };
    /** 树的元数据 */
    metadata: {
      /** 树的创建时间 */
      createdAt: Date;
      /** 树的最后更新时间 */
      lastUpdatedAt: Date;
      /** 根任务名称 */
      rootTaskName: string;
      /** 根任务类型 */
      rootTaskType: string;
    };
  }>;
  /** 分页信息 */
  pagination: {
    /** 总数 */
    total: number;
    /** 当前页大小 */
    limit: number;
    /** 偏移量 */
    offset: number;
    /** 是否有更多数据 */
    hasMore: boolean;
  };
  /** 查询参数 */
  queryOptions: TaskTreeQueryOptions;
  /** 查询时间戳 */
  timestamp: Date;
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
  retryTask(
    id: string,
    reason?: string,
    resetProgress?: boolean
  ): Promise<TaskStateChangeResult>;
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
  getTaskTrees(): Promise<TaskTreesResult>;
  getLayeredTaskTrees(
    options?: TaskTreeQueryOptions
  ): Promise<LayeredTaskTreesResult>;
  getTaskChildren(parentId: string): Promise<TaskTreeNode[]>;

  // 事件处理
  handleClearTree(event: TreeCompletionEvent): Promise<void>;
  handleNodePlaceholderConversion(node: TaskNodePlaceholder): Promise<void>;
}
