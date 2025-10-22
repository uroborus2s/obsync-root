/**
 * 同步进度实体类型定义
 * 用于数据库持久化
 */

/**
 * 同步进度表结构
 */
export interface SyncProgressEntity {
  id: number;
  task_name: string; // 任务名称，如 'absent_student_relations_sync'
  file_id: string; // WPS 文件 ID
  sheet_id: number; // WPS Sheet ID
  status: string; // 同步状态：not_started, in_progress, completed, failed, paused
  total_count: number; // 总记录数
  synced_count: number; // 已同步记录数
  current_offset: number; // 当前偏移量
  batch_size: number; // 批次大小
  started_at: string | null; // 开始时间
  completed_at: string | null; // 完成时间
  last_updated_at: string; // 最后更新时间
  error_message: string | null; // 错误信息
  failure_count: number; // 失败次数
  created_at: string; // 创建时间
  updated_at: string; // 更新时间
}

/**
 * 创建同步进度的输入类型
 */
export interface CreateSyncProgressInput {
  task_name: string;
  file_id: string;
  sheet_id: number;
  status: string;
  total_count: number;
  synced_count: number;
  current_offset: number;
  batch_size: number;
  started_at?: string | null;
  completed_at?: string | null;
  last_updated_at: string;
  error_message?: string | null;
  failure_count: number;
}

/**
 * 更新同步进度的输入类型
 */
export interface UpdateSyncProgressInput {
  status?: string;
  total_count?: number;
  synced_count?: number;
  current_offset?: number;
  batch_size?: number;
  started_at?: string | null;
  completed_at?: string | null;
  last_updated_at?: string;
  error_message?: string | null;
  failure_count?: number;
}

