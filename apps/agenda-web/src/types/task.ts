/**
 * 任务相关类型定义
 */

export interface ExecutorConfig {
  name: string;
  params?: Record<string, unknown>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'stopped';

export type TaskType = 'directory' | 'leaf';

export interface TaskMetadata {
  createdBy?: string;
  tags?: string[];
  priority?: number;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  parentId?: string;
  name: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  executorConfig?: ExecutorConfig;
  metadata?: TaskMetadata;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  children?: Task[];
}

export interface TaskTreeNode extends Task {
  children: TaskTreeNode[];
  depth: number;
  path: string[];
}

export interface QueryTasksParams {
  parentId?: string;
  status?: string | string[];
  type?: TaskType;
  tags?: string[];
  offset?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface TaskOperationOptions {
  cascade?: boolean;
  force?: boolean;
}

export interface CreateTaskRequest {
  parentId?: string;
  name: string;
  description?: string;
  type: TaskType;
  executorConfig?: ExecutorConfig;
  metadata?: TaskMetadata;
  autoStart?: boolean;
}

export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  executorConfig?: ExecutorConfig;
  metadata?: TaskMetadata;
}

export interface TaskStats {
  total: number;
  pending: number;
  running: number;
  paused: number;
  completed: number;
  failed: number;
  stopped: number;
  avgExecutionTime: number;
  successRate: number;
}

export interface ExecutorInfo {
  name: string;
  description?: string;
  defaultConfig?: Record<string, unknown>;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  service: string;
  taskManager: {
    running: boolean;
  };
}

export interface CleanupResponse {
  deletedCount: number;
}
