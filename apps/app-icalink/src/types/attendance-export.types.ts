import type { ColumnType } from '@stratix/database';

/**
 * 导出类型枚举
 */
export enum AttendanceExportType {
  REALTIME = 'realtime',
  HISTORY = 'history'
}

/**
 * 导出任务状态枚举
 */
export enum AttendanceExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * 考勤数据导出记录表实体
 */
export interface IcalinkAttendanceExportRecord {
  id: ColumnType<number, number | undefined, number>;
  task_id: string;
  export_type: AttendanceExportType;
  course_id?: number;
  course_code?: string;
  course_name?: string;
  query_params?: any;
  query_hash: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  status: AttendanceExportStatus;
  progress: number;
  error_message?: string;
  record_count?: number;
  created_at: ColumnType<Date, string | undefined, string>;
  updated_at: ColumnType<Date, string | undefined, string>;
  completed_at?: Date;
  expires_at?: Date;
  created_by?: string;
}

/**
 * 实时数据导出请求参数
 */
export interface RealtimeExportRequest {
  courseId: number;
  externalId?: string;
}

/**
 * 历史统计数据导出请求参数
 */
export interface HistoryExportRequest {
  courseCode: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 导出任务响应
 */
export interface ExportTaskResponse {
  taskId: string;
  status: AttendanceExportStatus;
  downloadUrl?: string;
  cacheHit?: boolean;
  progress?: number;
  error?: string;
  fileName?: string;
  fileSize?: number;
  recordCount?: number;
  createdAt?: Date;
  completedAt?: Date;
}

/**
 * 任务状态更新参数
 */
export interface TaskStatusUpdate {
  progress?: number;
  error_message?: string;
  file_path?: string;
  file_size?: number;
  record_count?: number;
  completed_at?: Date;
}
