/**
 * 仓储层类型定义 v2.0.0
 * 对应新的数据库表结构：running_tasks, completed_tasks
 */

import { TaskStatus } from '../types/task.types.js';

/**
 * 运行中任务实体 (对应 running_tasks 表)
 * 注意：metadata 字段在数据库中存储为 JSON 字符串，Repository 层处理序列化/反序列化
 */
export interface RunningTaskEntity {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  task_type: string;
  status: TaskStatus; // 只能是 pending, running, paused
  priority: number;
  progress: number;
  metadata: any | null; // 应用层为对象，数据库层为 JSON 字符串
  executor_name: string | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
}

/**
 * 完成任务实体 (对应 completed_tasks 表)
 * 注意：metadata 字段在数据库中存储为 JSON 字符串，Repository 层处理序列化/反序列化
 */
export interface CompletedTaskEntity {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  task_type: string;
  status: TaskStatus; // 只能是 success, failed, cancelled, completed
  priority: number;
  progress: number;
  metadata: any | null; // 应用层为对象，数据库层为 JSON 字符串
  executor_name: string | null;
  created_at: Date;
  updated_at: Date;
  started_at: Date | null;
  completed_at: Date;
}

/**
 * 共享上下文实体 (对应 shared_contexts 表)
 * 注意：data 字段在数据库中存储为 JSON 字符串，Repository 层处理序列化/反序列化
 */
export interface SharedContextEntity {
  id: string; // 主键
  root_task_id: string; // 唯一键，根任务ID
  data: any; // 应用层为对象，数据库层为 JSON 字符串
  created_at: Date;
  updated_at: Date;
  version: number;
  checksum: string | null;
}

/**
 * 扩展数据库接口 - 包含新表结构
 */
export interface ExtendedDatabase {
  running_tasks: RunningTaskEntity;
  completed_tasks: CompletedTaskEntity;
  shared_contexts: SharedContextEntity;
}

/**
 * 查询选项
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * 基础仓储接口
 */
export interface BaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(entity: Omit<T, 'created_at' | 'updated_at'>): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

/**
 * 任务统计信息
 */
export interface TaskStats {
  total: number;
  pending: number;
  running: number;
  paused: number;
  success: number;
  failed: number;
  cancelled: number;
  completed: number;
}

/**
 * 执行器使用统计
 */
export interface ExecutorUsageStats {
  executor_name: string;
  total_tasks: number;
  running_tasks: number;
  completed_tasks: number;
  success_rate: number;
}
