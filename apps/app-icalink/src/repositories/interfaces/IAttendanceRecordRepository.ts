// @wps/app-icalink 签到记录仓储接口
// 基于 Stratix 框架的仓储接口定义

import { BaseRepository } from '@stratix/database';
import type {
  AttendanceStatus,
  IcalinkAttendanceRecord,
  IcalinkDatabase
} from '../../types/database.js';
import type {
  PaginatedResult,
  QueryOptions,
  ServiceResult
} from '../../types/service.js';

/**
 * 签到记录查询条件
 */
export interface AttendanceRecordQueryConditions {
  attendance_course_id?: number;
  student_id?: string;
  status?: AttendanceStatus;
  start_date?: Date;
  end_date?: Date;
  is_late?: boolean;
}

/**
 * 签到记录创建数据
 */
export interface CreateAttendanceRecordData {
  attendance_course_id: number;
  student_id: string;
  student_name: string;
  class_name?: string;
  major_name?: string;
  status?: AttendanceStatus;
  checkin_time?: Date;
  checkin_location?: string;
  checkin_latitude?: number;
  checkin_longitude?: number;
  checkin_accuracy?: number;
  ip_address?: string;
  user_agent?: string;
  is_late?: boolean;
  late_minutes?: number;
  remark?: string;
  created_by?: string;
  metadata?: any;
}

/**
 * 签到记录更新数据
 */
export interface UpdateAttendanceRecordData {
  status?: AttendanceStatus;
  checkin_time?: Date;
  checkin_location?: string;
  checkin_latitude?: number;
  checkin_longitude?: number;
  checkin_accuracy?: number;
  ip_address?: string;
  user_agent?: string;
  is_late?: boolean;
  late_minutes?: number;
  remark?: string;
  updated_by?: string;
  metadata?: any;
}

/**
 * 签到记录统计信息
 */
export interface AttendanceRecordStats {
  total_count: number;
  present_count: number;
  late_count: number;
  absent_count: number;
  leave_count: number;
  not_started_count: number;
  attendance_rate: number;
}

/**
 * 签到记录详细信息（包含关联数据）
 */
export interface AttendanceRecordWithDetails extends IcalinkAttendanceRecord {
  course_name?: string;
  course_code?: string;
  teacher_names?: string;
  class_location?: string;
  class_date?: string;
  class_time?: string;
}

/**
 * 签到记录仓储接口
 * 提供签到记录相关的数据访问方法
 */
export interface IAttendanceRecordRepository
  extends InstanceType<typeof BaseRepository<
    IcalinkDatabase,
    'icalink_attendance_records',
    IcalinkAttendanceRecord,
    CreateAttendanceRecordData,
    UpdateAttendanceRecordData
  >> {
  /**
   * 根据课程ID和学生ID查找签到记录
   * @param courseId 课程ID
   * @param studentId 学生ID
   * @returns 签到记录或null
   */
  findByCourseAndStudent(
    courseId: number,
    studentId: string
  ): Promise<ServiceResult<IcalinkAttendanceRecord | null>>;

  /**
   * 根据条件查询签到记录
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 签到记录列表
   */
  findByConditions(
    conditions: AttendanceRecordQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<IcalinkAttendanceRecord[]>>;

  /**
   * 分页查询签到记录
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的签到记录列表
   */
  findByConditionsPaginated(
    conditions: AttendanceRecordQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<IcalinkAttendanceRecord>>>;

  /**
   * 查询签到记录详细信息（包含关联数据）
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 签到记录详细信息列表
   */
  findWithDetails(
    conditions: AttendanceRecordQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<AttendanceRecordWithDetails[]>>;

  /**
   * 分页查询签到记录详细信息
   * @param conditions 查询条件
   * @param options 查询选项
   * @returns 分页的签到记录详细信息列表
   */
  findWithDetailsPaginated(
    conditions: AttendanceRecordQueryConditions,
    options?: QueryOptions
  ): Promise<ServiceResult<PaginatedResult<AttendanceRecordWithDetails>>>;

  /**
   * 统计签到记录
   * @param conditions 查询条件
   * @returns 统计信息
   */
  getStatistics(
    conditions: AttendanceRecordQueryConditions
  ): Promise<ServiceResult<AttendanceRecordStats>>;

  /**
   * 根据课程ID统计签到情况
   * @param courseId 课程ID
   * @returns 统计信息
   */
  getStatisticsByCourse(
    courseId: number
  ): Promise<ServiceResult<AttendanceRecordStats>>;

  /**
   * 根据学生ID统计签到情况
   * @param studentId 学生ID
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   * @returns 统计信息
   */
  getStatisticsByStudent(
    studentId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<AttendanceRecordStats>>;

  /**
   * 批量更新签到记录状态
   * @param courseId 课程ID
   * @param studentIds 学生ID数组
   * @param status 新状态
   * @param updatedBy 更新人
   * @returns 更新的记录数量
   */
  updateStatusBatch(
    courseId: number,
    studentIds: string[],
    status: AttendanceStatus,
    updatedBy?: string
  ): Promise<ServiceResult<number>>;

  /**
   * 检查签到记录是否存在
   * @param courseId 课程ID
   * @param studentId 学生ID
   * @returns 是否存在
   */
  existsByCourseAndStudent(
    courseId: number,
    studentId: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 获取学生的最近签到记录
   * @param studentId 学生ID
   * @param limit 记录数量限制
   * @returns 最近的签到记录列表
   */
  getRecentByStudent(
    studentId: string,
    limit?: number
  ): Promise<ServiceResult<AttendanceRecordWithDetails[]>>;

  /**
   * 获取课程的最近签到记录
   * @param courseId 课程ID
   * @param limit 记录数量限制
   * @returns 最近的签到记录列表
   */
  getRecentByCourse(
    courseId: number,
    limit?: number
  ): Promise<ServiceResult<AttendanceRecordWithDetails[]>>;

  /**
   * 根据时间范围查询签到记录
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param options 查询选项
   * @returns 签到记录列表
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: QueryOptions
  ): Promise<ServiceResult<AttendanceRecordWithDetails[]>>;

  /**
   * 软删除签到记录
   * @param id 记录ID
   * @param deletedBy 删除人
   * @returns 是否删除成功
   */
  softDelete(id: number, deletedBy?: string): Promise<ServiceResult<boolean>>;

  /**
   * 恢复软删除的签到记录
   * @param id 记录ID
   * @param restoredBy 恢复人
   * @returns 是否恢复成功
   */
  restore(id: number, restoredBy?: string): Promise<ServiceResult<boolean>>;

  /**
   * 获取课程历史考勤记录
   * @param courseId 课程ID
   * @param startDate 开始日期(可选)
   * @param endDate 结束日期(可选)
   * @returns 历史考勤记录列表
   */
  getCourseHistory(
    courseId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<ServiceResult<Array<{
    id?: number;
    class_date?: string;
    class_time?: string;
    class_period?: string;
    total_students?: number;
    present_count?: number;
    leave_count?: number;
    absent_count?: number;
    attendance_rate?: number;
    created_at?: Date;
  }>>>;

  /**
   * 获取学生在特定课程的考勤统计
   * @param studentId 学生ID
   * @param courseId 课程ID
   * @returns 考勤统计数据
   */
  getStatisticsByStudentAndCourse(
    studentId: string,
    courseId: number
  ): Promise<ServiceResult<{
    total_count: number;
    present_count: number;
    absent_count: number;
    leave_count: number;
    attendance_rate: number;
  }>>;

  /**
   * 获取学生在特定课程的最近考勤记录
   * @param studentId 学生ID
   * @param courseId 课程ID
   * @param limit 记录数量限制
   * @returns 最近的考勤记录列表
   */
  getRecentByStudentAndCourse(
    studentId: string,
    courseId: number,
    limit?: number
  ): Promise<ServiceResult<Array<{
    id: number;
    class_date?: string;
    status: string;
    checkin_time?: Date;
    leave_reason?: string;
  }>>>;
}
