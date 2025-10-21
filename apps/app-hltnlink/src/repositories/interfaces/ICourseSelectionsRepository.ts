// @wps/hltnlink 选课Repository接口定义
// 基于AutoSaveRepository的选课数据管理接口

import type { BatchResult, DatabaseResult } from '@stratix/database';
import type {
  ApiCourseSelectionData,
  DbCourseSelectionData,
  SyncResult
} from '../../types/course-sync.js';

/**
 * 选课Repository接口
 * 继承AutoSaveRepository的功能，提供选课数据的批量同步和管理
 */
export interface ICourseSelectionsRepository {
  /**
   * 从API数据批量同步选课数据
   * @param apiData API返回的选课数据数组
   * @returns 同步结果，包含批次信息
   */
  syncSelectionsFromApi(
    apiData: ApiCourseSelectionData[]
  ): Promise<DatabaseResult<SyncResult<DbCourseSelectionData>>>;

  /**
   * 创建选课表并插入数据（带批次管理）
   * @param selections 选课数据数组
   * @returns 批次操作结果
   */
  createTableWithBatch(
    selections: DbCourseSelectionData[]
  ): Promise<DatabaseResult<BatchResult<DbCourseSelectionData>>>;

  /**
   * 根据批次ID查询选课数据
   * @param batchId 批次ID
   * @returns 选课数据数组
   */
  findByBatchId(
    batchId: string
  ): Promise<DatabaseResult<DbCourseSelectionData[]>>;

  /**
   * 获取所有批次ID列表
   * @returns 批次ID数组，按时间降序排列
   */
  getAllBatchIds(): Promise<DatabaseResult<string[]>>;

  /**
   * 根据选课记录ID查询选课信息
   * @param selectionId 选课记录ID
   * @param batchId 可选的批次ID，不指定则查询最新批次
   * @returns 选课信息
   */
  findBySelectionId(
    selectionId: string,
    batchId?: string
  ): Promise<DatabaseResult<DbCourseSelectionData | null>>;

  /**
   * 根据课程ID查询选课列表
   * @param courseId 课程ID
   * @param batchId 可选的批次ID，不指定则查询最新批次
   * @returns 选课列表
   */
  findByCourseId(
    courseId: string,
    batchId?: string
  ): Promise<DatabaseResult<DbCourseSelectionData[]>>;

  /**
   * 根据学生ID查询选课列表
   * @param studentId 学生学号
   * @param batchId 可选的批次ID，不指定则查询最新批次
   * @returns 选课列表
   */
  findByStudentId(
    studentId: string,
    batchId?: string
  ): Promise<DatabaseResult<DbCourseSelectionData[]>>;

  /**
   * 根据学生班级查询选课列表
   * @param studentClass 学生班级
   * @param batchId 可选的批次ID，不指定则查询最新批次
   * @returns 选课列表
   */
  findByStudentClass(
    studentClass: string,
    batchId?: string
  ): Promise<DatabaseResult<DbCourseSelectionData[]>>;

  /**
   * 根据学生专业查询选课列表
   * @param studentMajor 学生专业
   * @param batchId 可选的批次ID，不指定则查询最新批次
   * @returns 选课列表
   */
  findByStudentMajor(
    studentMajor: string,
    batchId?: string
  ): Promise<DatabaseResult<DbCourseSelectionData[]>>;

  /**
   * 根据选课状态查询选课列表
   * @param status 选课状态
   * @param batchId 可选的批次ID，不指定则查询最新批次
   * @returns 选课列表
   */
  findByStatus(
    status: string,
    batchId?: string
  ): Promise<DatabaseResult<DbCourseSelectionData[]>>;

  /**
   * 获取选课统计信息
   * @param batchId 可选的批次ID，不指定则统计最新批次
   * @returns 统计信息
   */
  getSelectionStatistics(batchId?: string): Promise<
    DatabaseResult<{
      totalSelections: number;
      selectedCount: number;
      droppedCount: number;
      pendingCount: number;
      confirmedCount: number;
      passedCount: number;
      failedCount: number;
      averageGrade: number;
      departmentStats: Record<string, number>;
      majorStats: Record<string, number>;
      classStats: Record<string, number>;
      gradeDistribution: Record<string, number>;
    }>
  >;

  /**
   * 获取课程选课统计
   * @param courseId 课程ID
   * @param batchId 可选的批次ID，不指定则统计最新批次
   * @returns 课程选课统计
   */
  getCourseSelectionStats(
    courseId: string,
    batchId?: string
  ): Promise<
    DatabaseResult<{
      courseId: string;
      totalSelections: number;
      currentSelections: number;
      droppedSelections: number;
      averageGrade: number;
      passRate: number;
      studentsByDepartment: Record<string, number>;
      studentsByMajor: Record<string, number>;
      studentsByClass: Record<string, number>;
    }>
  >;

  /**
   * 获取学生选课统计
   * @param studentId 学生学号
   * @param batchId 可选的批次ID，不指定则统计最新批次
   * @returns 学生选课统计
   */
  getStudentSelectionStats(
    studentId: string,
    batchId?: string
  ): Promise<
    DatabaseResult<{
      studentId: string;
      studentName: string;
      totalSelections: number;
      currentSelections: number;
      droppedSelections: number;
      totalCredits: number;
      averageGrade: number;
      passedCourses: number;
      failedCourses: number;
      gpa: number;
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
   * 验证选课数据
   * @param selectionData 选课数据
   * @returns 验证结果
   */
  validateSelectionData(
    selectionData: DbCourseSelectionData
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 批量验证选课数据
   * @param selectionsData 选课数据数组
   * @returns 验证结果，包含错误信息
   */
  validateSelectionsData(selectionsData: DbCourseSelectionData[]): Promise<
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
      firstRecord?: DbCourseSelectionData;
      lastRecord?: DbCourseSelectionData;
    }>
  >;
}
