// @stratix/icasync 学生课程关联仓储
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import {
  isRight,
  isLeft,
  eitherMap as map,
  eitherRight as right,
  eitherLeft as left
} from '@stratix/utils/functional';
import type {
  ClassInfo,
  NewStudentCourse,
  StudentCourse,
  StudentCourseUpdate
} from '../types/database.js';
import {
  BaseIcasyncRepository,
  fromOption
} from './base/BaseIcasyncRepository.js';

// 依赖注入装饰器 - 使用框架自动发现机制

/**
 * 学生课程关联仓储接口
 */
export interface IStudentCourseRepository {
  // 基础操作
  findByIdNullable(id: number): Promise<DatabaseResult<StudentCourse | null>>;
  create(data: NewStudentCourse): Promise<DatabaseResult<StudentCourse>>;
  updateNullable(
    id: number,
    data: StudentCourseUpdate
  ): Promise<DatabaseResult<StudentCourse | null>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;

  // 业务查询方法
  findByKkh(kkh: string): Promise<DatabaseResult<StudentCourse[]>>;
  findByXh(xh: string): Promise<DatabaseResult<StudentCourse[]>>;
  findByXnxq(xnxq: string): Promise<DatabaseResult<StudentCourse[]>>;
  findByKcbh(kcbh: string): Promise<DatabaseResult<StudentCourse[]>>;
  findByKkhAndXh(
    kkh: string,
    xh: string
  ): Promise<DatabaseResult<StudentCourse | null>>;
  findByXhAndXnxq(
    xh: string,
    xnxq: string
  ): Promise<DatabaseResult<StudentCourse[]>>;
  findByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<StudentCourse[]>>;

  // 状态查询
  findByStatus(zt: string): Promise<DatabaseResult<StudentCourse[]>>;
  findUnprocessedChanges(): Promise<DatabaseResult<StudentCourse[]>>;
  findChangesAfterTime(
    timestamp: Date
  ): Promise<DatabaseResult<StudentCourse[]>>;

  // 批量操作
  createStudentCoursesBatch(
    studentCourses: NewStudentCourse[]
  ): Promise<DatabaseResult<StudentCourse[]>>;
  updateStudentCoursesBatch(
    updates: Array<{ id: string; data: StudentCourseUpdate }>
  ): Promise<DatabaseResult<number>>;
  markAsProcessed(ids: string[]): Promise<DatabaseResult<number>>;
  deleteByKkh(kkh: string): Promise<DatabaseResult<number>>;
  deleteByXh(xh: string): Promise<DatabaseResult<number>>;
  deleteByXnxq(xnxq: string): Promise<DatabaseResult<number>>;

  // 统计查询
  countByKkh(kkh: string): Promise<DatabaseResult<number>>;
  countByXh(xh: string): Promise<DatabaseResult<number>>;
  countByXnxq(xnxq: string): Promise<DatabaseResult<number>>;
  countByKcbh(kcbh: string): Promise<DatabaseResult<number>>;
  countByStatus(zt: string): Promise<DatabaseResult<number>>;
  countUnprocessedChanges(): Promise<DatabaseResult<number>>;

  // 数据验证
  validateStudentCourseData(
    data: Partial<StudentCourse>
  ): Promise<DatabaseResult<boolean>>;
  findDuplicateStudentCourses(): Promise<DatabaseResult<StudentCourse[]>>;
  checkStudentCourseExists(
    kkh: string,
    xh: string
  ): Promise<DatabaseResult<boolean>>;

  // 业务查询
  findStudentsByKkh(kkh: string): Promise<
    DatabaseResult<{
      studentIds: string[];
      teacherIds: string[];
    }>
  >;
  findCoursesByXh(xh: string): Promise<DatabaseResult<string[]>>;
  findCoursesByXhAndXnxq(
    xh: string,
    xnxq: string
  ): Promise<DatabaseResult<string[]>>;
  findStudentsByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<string[]>>;

  // 搜索功能
  searchStudentCourses(
    keyword: string
  ): Promise<DatabaseResult<StudentCourse[]>>;

  // 教学班信息
  getClassInfo(kkh: string): Promise<DatabaseResult<ClassInfo[]>>;
  getClassInfoByXnxq(xnxq: string): Promise<DatabaseResult<ClassInfo[]>>;
}

/**
 * 学生课程关联仓储实现
 * 访问现有的 out_jw_kcb_xs 表
 */
export default class StudentCourseRepository
  extends BaseIcasyncRepository<
    'out_jw_kcb_xs',
    StudentCourse,
    NewStudentCourse,
    StudentCourseUpdate
  >
  implements IStudentCourseRepository
{
  protected readonly tableName = 'out_jw_kcb_xs' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super('syncdb');
  }

  /**
   * 根据开课号查找学生课程关联
   */
  async findByKkh(kkh: string): Promise<DatabaseResult<StudentCourse[]>> {
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('kkh', '=', kkh).orderBy('xh', 'asc')
    );
  }

  /**
   * 根据学号查找学生课程关联
   */
  async findByXh(xh: string): Promise<DatabaseResult<StudentCourse[]>> {
    if (!xh) {
      throw new Error('Student number cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('xh', '=', xh).where('zt', '!=', 'delete').orderBy('kkh', 'asc')
    );
  }

  /**
   * 根据学年学期查找学生课程关联
   */
  async findByXnxq(xnxq: string): Promise<DatabaseResult<StudentCourse[]>> {
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('xnxq', '=', xnxq).orderBy('xh', 'asc')
    );
  }

  /**
   * 根据课程编号查找学生课程关联
   */
  async findByKcbh(kcbh: string): Promise<DatabaseResult<StudentCourse[]>> {
    if (!kcbh) {
      throw new Error('Course code cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('kcbh', '=', kcbh).orderBy('xh', 'asc')
    );
  }

  /**
   * 根据开课号和学号查找学生课程关联
   */
  async findByKkhAndXh(
    kkh: string,
    xh: string
  ): Promise<DatabaseResult<StudentCourse | null>> {
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }
    if (!xh) {
      throw new Error('Student number cannot be empty');
    }

    return await this.findOneNullable((qb: any) =>
      qb.where('kkh', '=', kkh).where('xh', '=', xh)
    );
  }

  /**
   * 根据学号和学年学期查找学生课程关联
   */
  async findByXhAndXnxq(
    xh: string,
    xnxq: string
  ): Promise<DatabaseResult<StudentCourse[]>> {
    if (!xh) {
      throw new Error('Student number cannot be empty');
    }
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb
        .where('xh', '=', xh)
        .where('xnxq', '=', xnxq)
        .where('zt', '!=', 'delete')
        .orderBy('kkh', 'asc')
    );
  }

  /**
   * 根据开课号和学年学期查找学生课程关联
   */
  async findByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<StudentCourse[]>> {
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('kkh', '=', kkh).where('xnxq', '=', xnxq).orderBy('xh', 'asc')
    );
  }

  /**
   * 根据状态查找学生课程关联
   */
  async findByStatus(zt: string): Promise<DatabaseResult<StudentCourse[]>> {
    if (!zt) {
      throw new Error('Status cannot be empty');
    }

    return await this.findMany((qb: any) =>
      qb.where('zt', '=', zt).orderBy('sj', 'desc')
    );
  }

  /**
   * 查找未处理的变更
   */
  async findUnprocessedChanges(): Promise<DatabaseResult<StudentCourse[]>> {
    return await this.findMany((qb: any) =>
      qb.where('zt', 'is not', null).orderBy('sj', 'desc')
    );
  }

  /**
   * 查找指定时间后的变更
   */
  async findChangesAfterTime(
    timestamp: Date
  ): Promise<DatabaseResult<StudentCourse[]>> {
    const timestampStr = timestamp.toISOString();
    return await this.findMany((qb: any) =>
      qb.where('sj', '>', timestampStr).orderBy('sj', 'desc')
    );
  }

  /**
   * 批量创建学生课程关联
   */
  async createStudentCoursesBatch(
    studentCourses: NewStudentCourse[]
  ): Promise<DatabaseResult<StudentCourse[]>> {
    if (!studentCourses || studentCourses.length === 0) {
      throw new Error('Student courses array cannot be empty');
    }

    // 验证每个学生课程关联数据
    for (const studentCourse of studentCourses) {
      const requiredFields = ['kkh', 'xh', 'xnxq'];
      for (const field of requiredFields) {
        if (!studentCourse[field as keyof NewStudentCourse]) {
          throw new Error(
            `Required field '${field}' is missing in student course`
          );
        }
      }

      if (!studentCourse.kkh) {
        throw new Error('Course number cannot be empty');
      }

      if (!studentCourse.xh) {
        throw new Error('Student number cannot be empty');
      }

      if (!studentCourse.xnxq) {
        throw new Error('Academic year and semester cannot be empty');
      }
    }

    return await this.createMany(studentCourses);
  }

  /**
   * 批量更新学生课程关联
   */
  async updateStudentCoursesBatch(
    updates: Array<{ id: string; data: StudentCourseUpdate }>
  ): Promise<DatabaseResult<number>> {
    if (!updates || updates.length === 0) {
      throw new Error('Updates array cannot be empty');
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        const result = await this.updateNullable(
          Number(update.id),
          update.right
        );
        if (isRight(result)) {
          successCount++;
        } else {
          errors.push(
            `Failed to update student course ${update.id}: ${result.left?.message}`
          );
        }
      } catch (error) {
        errors.push(
          `Error updating student course ${update.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (errors.length > 0) {
      this.logError('updateStudentCoursesBatch', new Error(errors.join('; ')));
    }

    return right(successCount
    );
  }

  /**
   * 标记为已处理
   */
  async markAsProcessed(ids: string[]): Promise<DatabaseResult<number>> {
    if (!ids || ids.length === 0) {
      throw new Error('IDs array cannot be empty');
    }

    const updateData = this.buildUpdateData({
      zt: 'processed'
    });

    return await this.updateMany(
      { id: ids } as any,
      updateData as StudentCourseUpdate
    );
  }

  /**
   * 根据开课号删除学生课程关联
   */
  async deleteByKkh(kkh: string): Promise<DatabaseResult<number>> {
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }

    return await this.deleteMany({ kkh } as any);
  }

  /**
   * 根据学号删除学生课程关联
   */
  async deleteByXh(xh: string): Promise<DatabaseResult<number>> {
    if (!xh) {
      throw new Error('Student number cannot be empty');
    }

    return await this.deleteMany({ xh } as any);
  }

  /**
   * 根据学年学期删除学生课程关联
   */
  async deleteByXnxq(xnxq: string): Promise<DatabaseResult<number>> {
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    return await this.deleteMany({ xnxq } as any);
  }

  /**
   * 统计指定开课号的学生课程关联数量
   */
  async countByKkh(kkh: string): Promise<DatabaseResult<number>> {
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }

    return await this.count((qb) => qb.where('kkh', '=', kkh));
  }

  /**
   * 统计指定学号的学生课程关联数量
   */
  async countByXh(xh: string): Promise<DatabaseResult<number>> {
    if (!xh) {
      throw new Error('Student number cannot be empty');
    }

    return await this.count((qb) => qb.where('xh', '=', xh));
  }

  /**
   * 统计指定学年学期的学生课程关联数量
   */
  async countByXnxq(xnxq: string): Promise<DatabaseResult<number>> {
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    return await this.count((qb) => qb.where('xnxq', '=', xnxq));
  }

  /**
   * 统计指定课程编号的学生课程关联数量
   */
  async countByKcbh(kcbh: string): Promise<DatabaseResult<number>> {
    if (!kcbh) {
      throw new Error('Course code cannot be empty');
    }

    return await this.count((qb) => qb.where('kcbh', '=', kcbh));
  }

  /**
   * 统计指定状态的学生课程关联数量
   */
  async countByStatus(zt: string): Promise<DatabaseResult<number>> {
    if (!zt) {
      throw new Error('Status cannot be empty');
    }

    return await this.count((qb) => qb.where('zt', '=', zt));
  }

  /**
   * 统计未处理变更的数量
   */
  async countUnprocessedChanges(): Promise<DatabaseResult<number>> {
    return await this.count((qb) => qb.where('zt', 'is not', null));
  }

  /**
   * 验证学生课程关联数据
   */
  async validateStudentCourseData(
    data: Partial<StudentCourse>
  ): Promise<DatabaseResult<boolean>> {
    try {
      // 验证开课号格式
      if (data.kkh && !/^[A-Z0-9]{6,20}$/.test(data.kkh)) {
        throw new Error('Invalid course number format');
      }

      // 验证学号格式
      if (data.xh && !/^\d{8,12}$/.test(data.xh)) {
        throw new Error('Invalid student number format');
      }

      // 验证学年学期格式
      if (data.xnxq && !/^\d{4}-\d{4}-[12]$/.test(data.xnxq)) {
        throw new Error('Invalid academic year and semester format');
      }

      return right(true
      );
    } catch (error) {
      throw new Error(
        `Student course data validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 查找重复的学生课程关联
   */
  async findDuplicateStudentCourses(): Promise<
    DatabaseResult<StudentCourse[]>
  > {
    // 这里需要使用复杂的SQL查询来查找重复的学生课程关联
    // 由于BaseRepository可能不直接支持，我们先返回空数组
    // 实际实现需要使用原始SQL查询
    return right([]
    );
  }

  /**
   * 检查学生课程关联是否存在
   */
  async checkStudentCourseExists(
    kkh: string,
    xh: string
  ): Promise<DatabaseResult<boolean>> {
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }
    if (!xh) {
      throw new Error('Student number cannot be empty');
    }

    const result = await this.findByKkhAndXh(kkh, xh);
    if (isLeft(result)) {
      return left((result as any).error
      );
    }

    return right(result.right !== null
    );
  }

  /**
   * 根据开课号查找参与者信息（学生和教师）
   * 使用SQL级别的DISTINCT获取唯一学生ID，并从课程表获取教师信息，提高性能
   */
  async findStudentsByKkh(kkh: string): Promise<
    DatabaseResult<{
      studentIds: string[];
      teacherIds: string[];
    }>
  > {
    if (!kkh) {
      this.logger.warn('Course number is empty');
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR' as any,
          message: 'Course number cannot be empty',
          timestamp: new Date(),
          retryable: false
        }
      };
    }

    try {
      this.logger.debug('Finding participants by course number', { kkh });

      // 并行查询学生和教师信息
      const [studentsResult, teachersResult] = await Promise.all([
        // 查询学生ID列表
        this.rightbaseApi.executeQuery(
          (db: any) => {
            return db
              .selectFrom(this.tableName)
              .select('xh')
              .distinct()
              .where('kkh', '=', kkh)
              .where('xh', 'is not', null)
              .where((eb: any) =>
                eb.exists(
                  eb
                    .selectFrom('out_xsxx')
                    .select('xh')
                    .whereRef('out_xsxx.xh', '=', `${this.tableName}.xh`) // 关联当前表的xh
                    .where('out_xsxx.xh', 'is not', null)
                )
              )
              .orderBy('xh', 'asc')
              .execute();
          },
          { readonly: true, connectionName: 'syncdb' }
        ),
        // 查询教师ID列表
        this.rightbaseApi.executeQuery(
          (db: any) => {
            return db
              .selectFrom('out_jw_kcb_js')
              .select('gh')
              .distinct()
              .where('kkh', '=', kkh)
              .where((eb: any) =>
                eb.exists(
                  eb
                    .selectFrom('out_jsxx')
                    .select('gh')
                    .whereRef('out_jsxx.gh', '=', `out_jw_kcb_js.gh`) // 关联当前表的xh
                )
              )
              .where('gh', 'is not', null)
              .where('gh', 'not in', ['101005', '117044'])
              .execute();
          },
          { readonly: true, connectionName: 'syncdb' }
        )
      ]);

      // 检查学生查询结果
      if (isLeft(studentsResult)) {
        this.logger.left('Failed to find students by course number', {
          kkh,
          error: studentsResult.left
        });
        return left(studentsResult.left
        );
      }

      // 检查教师查询结果
      if (isLeft(teachersResult)) {
        this.logger.left('Failed to find teachers by course number', {
          kkh,
          error: teachersResult.left
        });
        return left(teachersResult.left
        );
      }

      // 提取学生ID（SQL已过滤null，无需内存过滤）
      const studentIds = (studentsResult.right as any[]).map(
        (row: any) => row.xh
      );

      // 提取并解析教师ID（处理逗号分隔的字符串）
      const teacherIds = (teachersResult.right as any[]).map(
        (row: any) => row.gh
      );

      // 去重教师ID
      const uniqueTeacherIds = [...new Set(teacherIds)];

      this.logger.debug('Found participants by course number', {
        kkh,
        studentCount: studentIds.length,
        teacherCount: uniqueTeacherIds.length
      });

      return {
        success: true,
        data: {
          studentIds,
          teacherIds: uniqueTeacherIds
        }
      };
    } catch (error) {
      this.logger.left('Error finding participants by course number', {
        kkh,
        error
      });
      return {
        success: false,
        error: {
          type: 'QUERY_ERROR' as any,
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date(),
          retryable: false
        }
      };
    }
  }

  /**
   * 根据学号查找课程列表
   */
  async findCoursesByXh(xh: string): Promise<DatabaseResult<string[]>> {
    if (!xh) {
      throw new Error('Student number cannot be empty');
    }

    const result = await this.findByXh(xh);
    if (isLeft(result)) {
      return result as DatabaseResult<string[]>;
    }

    const courseNumbers = result.right
      .map((sc) => sc.kkh)
      .filter((kkh): kkh is string => kkh !== null)
      .filter((kkh, index, array) => array.indexOf(kkh) === index); // 去重

    return right(courseNumbers
    );
  }

  /**
   * 根据学号和学年学期查找课程列表
   */
  async findCoursesByXhAndXnxq(
    xh: string,
    xnxq: string
  ): Promise<DatabaseResult<string[]>> {
    if (!xh) {
      throw new Error('Student number cannot be empty');
    }
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    const result = await this.findByXhAndXnxq(xh, xnxq);
    if (isLeft(result)) {
      return result as DatabaseResult<string[]>;
    }

    const courseNumbers = result.right
      .map((sc) => sc.kkh)
      .filter((kkh): kkh is string => kkh !== null)
      .filter((kkh, index, array) => array.indexOf(kkh) === index); // 去重

    return right(courseNumbers
    );
  }

  /**
   * 根据开课号和学年学期查找学生列表
   */
  async findStudentsByKkhAndXnxq(
    kkh: string,
    xnxq: string
  ): Promise<DatabaseResult<string[]>> {
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    const result = await this.findByKkhAndXnxq(kkh, xnxq);
    if (isLeft(result)) {
      return result as DatabaseResult<string[]>;
    }

    const studentNumbers = result.right
      .map((sc) => sc.xh)
      .filter((xh): xh is string => xh !== null)
      .filter((xh, index, array) => array.indexOf(xh) === index); // 去重

    return right(studentNumbers
    );
  }

  /**
   * 搜索学生课程关联（综合搜索）
   */
  async searchStudentCourses(
    keyword: string
  ): Promise<DatabaseResult<StudentCourse[]>> {
    if (!keyword) {
      throw new Error('Search keyword cannot be empty');
    }

    const searchPattern = `%${keyword}%`;

    return await this.findMany((qb: any) =>
      qb
        .where((eb: any) =>
          eb.or([
            eb('kkh', 'like', searchPattern),
            eb('xh', 'like', searchPattern),
            eb('xnxq', 'like', searchPattern),
            eb('kcbh', 'like', searchPattern)
          ])
        )
        .orderBy('kkh', 'asc')
    );
  }

  /**
   * 创建学生课程关联（重写以添加验证）
   */
  async create(data: NewStudentCourse): Promise<DatabaseResult<StudentCourse>> {
    // 验证必需字段
    const requiredFields = ['kkh', 'xh', 'xnxq'];
    for (const field of requiredFields) {
      if (!data[field as keyof NewStudentCourse]) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }

    // 验证数据格式
    const validationResult = await this.validateStudentCourseData(data);
    if (isLeft(validationResult)) {
      throw new Error('Student course data validation failed');
    }

    // 检查是否已存在
    const existsResult = await this.checkStudentCourseExists(
      data.kkh || '',
      data.xh || ''
    );
    if (isRight(existsResult) && existsResult.right) {
      throw new Error(
        `Student course relationship already exists for course ${data.kkh} and student ${data.xh}`
      );
    }

    const createData = this.buildCreateData({
      ...data,
      zt: data.zt || null
    });

    this.logOperation('create', {
      kkh: data.kkh,
      xh: data.xh,
      xnxq: data.xnxq
    });

    return await super.create(createData as NewStudentCourse);
  }

  /**
   * 获取教学班信息
   */
  async getClassInfo(kkh: string): Promise<DatabaseResult<ClassInfo[]>> {
    if (!kkh) {
      throw new Error('Course number cannot be empty');
    }

    try {
      // 这里需要通过学生课程关联表和学生信息表联合查询获取班级信息
      // 由于BaseRepository可能不直接支持复杂的JOIN查询，
      // 我们先用简单的方法实现
      const studentCoursesResult = await this.findByKkh(kkh);

      if (isLeft(studentCoursesResult)) {
        return studentCoursesResult as DatabaseResult<ClassInfo[]>;
      }

      // 这里应该通过学生编号查询学生信息表获取班级信息
      // 暂时返回空数组，实际实现需要联合查询
      return right([]
      );
    } catch (error) {
      this.handleDatabaseError('getClassInfo', error, { kkh });
    }
  }

  /**
   * 根据学年学期获取教学班信息
   */
  async getClassInfoByXnxq(xnxq: string): Promise<DatabaseResult<ClassInfo[]>> {
    if (!xnxq) {
      throw new Error('Academic year and semester cannot be empty');
    }

    try {
      // 这里需要通过学生课程关联表和学生信息表联合查询获取班级信息
      // 由于BaseRepository可能不直接支持复杂的JOIN查询，
      // 我们先用简单的方法实现
      const studentCoursesResult = await this.findByXnxq(xnxq);

      if (isLeft(studentCoursesResult)) {
        return studentCoursesResult as DatabaseResult<ClassInfo[]>;
      }

      // 这里应该通过学生编号查询学生信息表获取班级信息
      // 暂时返回空数组，实际实现需要联合查询
      return right([]
      );
    } catch (error) {
      this.handleDatabaseError('getClassInfoByXnxq', error, { xnxq });
    }
  }

  /**
   * 删除学生课程关联（重写以添加日志）
   */
  async delete(id: number): Promise<DatabaseResult<boolean>> {
    this.logOperation('delete', { id });

    return await super.delete(id);
  }
}

// 框架会自动发现和注册此仓储类
// 使用 SCOPED 生命周期，文件名符合 repositories/**/*.ts 模式
