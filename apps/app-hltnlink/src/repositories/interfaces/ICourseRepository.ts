// @wps/hltnlink 课程Repository接口定义
// 基于AutoSaveRepository的课程数据管理接口

import type { BatchResult, DatabaseResult } from '@stratix/database';
import type { DbCourseData } from '../../types/course-sync.js';

/**
 * 课程Repository接口
 * 继承AutoSaveRepository的功能，提供课程数据的批量同步和管理
 */
export interface ISourceCourseRepository {
  /**
   * 创建课程表并插入数据（带批次管理）
   * @param dataArray 数据数组
   * @param options 选项
   * @returns 批次操作结果
   */
  createTableWithBatch<T extends Record<string, string | number | boolean>>(
    dataArray: T[],
    options?: any
  ): Promise<DatabaseResult<BatchResult<T>>>;

  /**
   * 根据批次ID查询课程数据
   * @param batchId 批次ID
   * @returns 课程数据数组
   */
  findByBatchId(batchId: string): Promise<DatabaseResult<DbCourseData[]>>;

  /**
   * 获取所有批次ID列表
   * @returns 批次ID数组，按时间降序排列
   */
  getAllBatchIds(): Promise<DatabaseResult<string[]>>;

  /**
   * 根据课程ID查询课程信息
   * @param courseId 课程ID
   * @param batchId 可选的批次ID，不指定则查询最新批次
   * @returns 课程信息
   */
  findByCourseId(
    courseId: string,
    batchId?: string
  ): Promise<DatabaseResult<DbCourseData | null>>;

  /**
   * 根据学期查询课程列表
   * @param semester 学期
   * @param academicYear 学年
   * @param batchId 可选的批次ID，不指定则查询最新批次
   * @returns 课程列表
   */
  findBySemester(
    semester: string,
    academicYear: string,
    batchId?: string
  ): Promise<DatabaseResult<DbCourseData[]>>;

  /**
   * 根据教师查询课程列表
   * @param instructorId 教师工号
   * @param batchId 可选的批次ID，不指定则查询最新批次
   * @returns 课程列表
   */
  findByInstructor(
    instructorId: string,
    batchId?: string
  ): Promise<DatabaseResult<DbCourseData[]>>;

  /**
   * 根据院系查询课程列表
   * @param department 院系
   * @param batchId 可选的批次ID，不指定则查询最新批次
   * @returns 课程列表
   */
  findByDepartment(
    department: string,
    batchId?: string
  ): Promise<DatabaseResult<DbCourseData[]>>;

  /**
   * 获取课程统计信息
   * @param batchId 可选的批次ID，不指定则统计最新批次
   * @returns 统计信息
   */
  getCourseStatistics(batchId?: string): Promise<
    DatabaseResult<{
      totalCourses: number;
      activeCourses: number;
      inactiveCourses: number;
      cancelledCourses: number;
      departmentStats: Record<string, number>;
      semesterStats: Record<string, number>;
      instructorStats: Record<string, number>;
    }>
  >;

  /**
   * 清理旧批次数据
   * @param maxBatchesToKeep 保留的批次数量，默认3
   * @returns 清理结果
   */
  cleanupOldBatches(maxBatchesToKeep?: number): Promise<
    DatabaseResult<{
      deletedBatches: number;
      deletedRecords: number;
      retainedBatches: string[];
    }>
  >;

  /**
   * 验证课程数据
   * @param courseData 课程数据
   * @returns 验证结果
   */
  validateCourseData(
    courseData: DbCourseData
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 批量验证课程数据
   * @param coursesData 课程数据数组
   * @returns 验证结果，包含错误信息
   */
  validateCoursesData(coursesData: DbCourseData[]): Promise<
    DatabaseResult<{
      valid: boolean;
      errors: Array<{
        index: number;
        field: string;
        message: string;
        value: any;
      }>;
    }>
  >;

  /**
   * 获取最新批次ID
   * @returns 最新批次ID
   */
  getLatestBatchId(): Promise<DatabaseResult<string | null>>;

  /**
   * 检查表是否存在
   * @returns 表是否存在
   */
  tableExists(): Promise<DatabaseResult<boolean>>;

  /**
   * 获取表记录总数
   * @param batchId 可选的批次ID，不指定则统计所有记录
   * @returns 记录总数
   */
  getRecordCount(batchId?: string): Promise<DatabaseResult<number>>;

  /**
   * 删除指定批次的数据
   * @param batchId 批次ID
   * @returns 删除的记录数
   */
  deleteBatch(batchId: string): Promise<DatabaseResult<number>>;

  /**
   * 获取批次信息
   * @param batchId 批次ID
   * @returns 批次信息
   */
  getBatchInfo(batchId: string): Promise<
    DatabaseResult<{
      batchId: string;
      recordCount: number;
      createdAt: Date;
      firstRecord?: DbCourseData;
      lastRecord?: DbCourseData;
    }>
  >;
}
