// @wps/hltnlink 课程数据同步相关类型定义
// 用于课程和选课数据同步功能的类型定义和接口

/**
 * 课程数据结构（来自外部API）
 */
export interface ApiCourseData {
  /** 课程ID */
  course_id: string;
  /** 课程名称 */
  course_name: string;
  /** 课程代码 */
  course_code: string;
  /** 学分 */
  credits: number;
  /** 学期 */
  semester: string;
  /** 学年 */
  academic_year: string;
  /** 授课教师 */
  instructor: string;
  /** 教师工号 */
  instructor_id: string;
  /** 课程类型 */
  course_type: string;
  /** 开课院系 */
  department: string;
  /** 上课时间 */
  schedule_time?: string;
  /** 上课地点 */
  classroom?: string;
  /** 课程状态 */
  status: 'active' | 'inactive' | 'cancelled';
  /** 最大选课人数 */
  max_students?: number;
  /** 当前选课人数 */
  current_students?: number;
  /** 课程描述 */
  description?: string;
  /** 创建时间 */
  created_at?: string;
  /** 更新时间 */
  updated_at?: string;
}

/**
 * 选课数据结构（来自外部API）
 */
export interface ApiCourseSelectionData {
  /** 选课记录ID */
  selection_id: string;
  /** 课程ID */
  course_id: string;
  /** 学生学号 */
  student_id: string;
  /** 学生姓名 */
  student_name: string;
  /** 学生班级 */
  student_class: string;
  /** 学生专业 */
  student_major: string;
  /** 学生院系 */
  student_department: string;
  /** 选课时间 */
  selection_time: string;
  /** 选课状态 */
  status: 'selected' | 'dropped' | 'pending' | 'confirmed';
  /** 成绩 */
  grade?: number;
  /** 成绩等级 */
  grade_level?: string;
  /** 是否通过 */
  is_passed?: boolean;
  /** 备注 */
  remarks?: string;
  /** 创建时间 */
  created_at?: string;
  /** 更新时间 */
  updated_at?: string;
}

/**
 * 数据库存储的课程数据结构
 */
export interface DbCourseData {
  /** 自增主键 */
  id?: number;
  /** 课程ID */
  course_id: string;
  /** 课程名称 */
  course_name: string;
  /** 课程代码 */
  course_code: string;
  /** 学分 */
  credits: number;
  /** 学期 */
  semester: string;
  /** 学年 */
  academic_year: string;
  /** 授课教师 */
  instructor: string;
  /** 教师工号 */
  instructor_id: string;
  /** 课程类型 */
  course_type: string;
  /** 开课院系 */
  department: string;
  /** 上课时间 */
  schedule_time: string | null;
  /** 上课地点 */
  classroom: string | null;
  /** 课程状态 */
  status: string;
  /** 最大选课人数 */
  max_students: number | null;
  /** 当前选课人数 */
  current_students: number | null;
  /** 课程描述 */
  description: string | null;
  /** 批次ID */
  batch_id: string;
  /** 创建时间 */
  created_at?: string;
  /** 更新时间 */
  updated_at?: string;
}

/**
 * 数据库存储的选课数据结构
 */
export interface DbCourseSelectionData {
  /** 自增主键 */
  id?: number;
  /** 选课记录ID */
  selection_id: string;
  /** 课程ID */
  course_id: string;
  /** 学生学号 */
  student_id: string;
  /** 学生姓名 */
  student_name: string;
  /** 学生班级 */
  student_class: string;
  /** 学生专业 */
  student_major: string;
  /** 学生院系 */
  student_department: string;
  /** 选课时间 */
  selection_time: string;
  /** 选课状态 */
  status: string;
  /** 成绩 */
  grade: number | null;
  /** 成绩等级 */
  grade_level: string | null;
  /** 是否通过 */
  is_passed: boolean | null;
  /** 备注 */
  remarks: string | null;
  /** 批次ID */
  batch_id: string;
  /** 创建时间 */
  created_at?: string;
  /** 更新时间 */
  updated_at?: string;
}

/**
 * API响应数据结构
 */
export interface ApiResponse<T> {
  /** 状态码 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
  /** 总数量 */
  total?: number;
  /** 当前页 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
}

/**
 * 数据同步配置
 */
export interface DataSyncConfig {
  /** API基础URL */
  baseUrl: string;
  /** 认证token */
  token?: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 批次大小 */
  batchSize?: number;
  /** 保留的批次数量 */
  maxBatchesToKeep?: number;
}

/**
 * 数据同步结果
 */
export interface SyncResult<T> {
  /** 是否成功 */
  success: boolean;
  /** 批次ID */
  batchId: string;
  /** 同步的数据 */
  data: T[];
  /** 同步数量 */
  count: number;
  /** 错误信息 */
  error?: string;
  /** 同步耗时（毫秒） */
  duration: number;
  /** 详细信息 */
  details?: {
    /** API请求耗时 */
    apiDuration: number;
    /** 数据转换耗时 */
    transformDuration: number;
    /** 数据库操作耗时 */
    dbDuration: number;
  };
}

/**
 * 数据验证错误
 */
export interface ValidationError {
  /** 字段名 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 错误值 */
  value: any;
  /** 记录索引 */
  recordIndex: number;
}

/**
 * 数据转换选项
 */
export interface DataTransformOptions {
  /** 是否验证必填字段 */
  validateRequired?: boolean;
  /** 是否转换数据类型 */
  convertTypes?: boolean;
  /** 默认值映射 */
  defaultValues?: Record<string, any>;
  /** 字段映射 */
  fieldMapping?: Record<string, string>;
}

/**
 * 同步统计信息
 */
export interface SyncStatistics {
  /** 总同步次数 */
  totalSyncs: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 总处理记录数 */
  totalRecords: number;
  /** 平均处理时间 */
  averageDuration: number;
  /** 最后同步时间 */
  lastSyncTime?: Date;
  /** 最后成功同步时间 */
  lastSuccessTime?: Date;
  /** 最后失败时间 */
  lastFailureTime?: Date;
  /** 最后错误信息 */
  lastError?: string;
}
