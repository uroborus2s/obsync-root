// @stratix/icasync 学生信息仓储
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
  NewStudentInfo,
  StudentInfo,
  StudentInfoUpdate,
  UserInfo
} from '../types/database.js';
import {
  BaseIcasyncRepository,
  fromOption
} from './base/BaseIcasyncRepository.js';

// 依赖注入装饰器 - 使用框架自动发现机制

/**
 * 学生信息仓储接口
 */
export interface IStudentRepository {
  // 基础操作
  findByIdNullable(id: number): Promise<DatabaseResult<StudentInfo | null>>;
  create(data: NewStudentInfo): Promise<DatabaseResult<StudentInfo>>;
  updateNullable(
    id: number,
    data: StudentInfoUpdate
  ): Promise<DatabaseResult<StudentInfo | null>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;

  // 业务查询方法
  findByXh(xh: string): Promise<DatabaseResult<StudentInfo | null>>;
  findByXhList(xhList: string[]): Promise<DatabaseResult<StudentInfo[]>>;
  findByClass(bjdm: string): Promise<DatabaseResult<StudentInfo[]>>;
  findByMajor(zydm: string): Promise<DatabaseResult<StudentInfo[]>>;
  findByCollege(xydm: string): Promise<DatabaseResult<StudentInfo[]>>;
  findByGrade(sznj: string): Promise<DatabaseResult<StudentInfo[]>>;
  findByType(lx: number): Promise<DatabaseResult<StudentInfo[]>>;

  // 状态查询
  findByStatus(zt: string): Promise<DatabaseResult<StudentInfo[]>>;
  findUnprocessedChanges(): Promise<DatabaseResult<StudentInfo[]>>;
  findChangesAfterTime(timestamp: Date): Promise<DatabaseResult<StudentInfo[]>>;
  findStudentsForSync(): Promise<DatabaseResult<StudentInfo[]>>;
  findStudentsByUpdateTimeRange(
    startTime: Date,
    endTime: Date
  ): Promise<DatabaseResult<StudentInfo[]>>;

  // 通用查询方法
  findMany(filter?: any, options?: any): Promise<DatabaseResult<StudentInfo[]>>;

  // 批量操作
  createStudentsBatch(
    students: NewStudentInfo[]
  ): Promise<DatabaseResult<StudentInfo[]>>;
  updateStudentsBatch(
    updates: Array<{ id: string; data: StudentInfoUpdate }>
  ): Promise<DatabaseResult<number>>;
  markAsProcessed(ids: string[]): Promise<DatabaseResult<number>>;

  // 统计查询
  countByClass(bjdm: string): Promise<DatabaseResult<number>>;
  countByMajor(zydm: string): Promise<DatabaseResult<number>>;
  countByCollege(xydm: string): Promise<DatabaseResult<number>>;
  countByGrade(sznj: string): Promise<DatabaseResult<number>>;
  countByType(lx: number): Promise<DatabaseResult<number>>;
  countByStatus(zt: string): Promise<DatabaseResult<number>>;
  countUnprocessedChanges(): Promise<DatabaseResult<number>>;

  // 数据验证
  validateStudentData(
    data: Partial<StudentInfo>
  ): Promise<DatabaseResult<boolean>>;
  findDuplicateStudents(): Promise<DatabaseResult<StudentInfo[]>>;
  checkStudentExists(xh: string): Promise<DatabaseResult<boolean>>;

  // 业务转换
  convertToUserInfo(student: StudentInfo): UserInfo;
  convertManyToUserInfo(students: StudentInfo[]): UserInfo[];

  // 搜索功能
  searchStudents(keyword: string): Promise<DatabaseResult<StudentInfo[]>>;
  searchByName(name: string): Promise<DatabaseResult<StudentInfo[]>>;
  searchByPhone(phone: string): Promise<DatabaseResult<StudentInfo[]>>;
  searchByEmail(email: string): Promise<DatabaseResult<StudentInfo[]>>;
}

/**
 * 学生信息仓储实现
 * 访问现有的 out_xsxx 表
 */
export default class StudentRepository
  extends BaseIcasyncRepository<
    'out_xsxx',
    StudentInfo,
    NewStudentInfo,
    StudentInfoUpdate
  >
  implements IStudentRepository
{
  protected readonly tableName = 'out_xsxx' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super('syncdb');
  }

  /**
   * 根据学号查找学生
   */
  async findByXh(xh: string): Promise<DatabaseResult<StudentInfo | null>> {
    if (!xh) {
      throw new Error('Student number cannot be empty');
    }

    return await this.findOneNullable((eb: any) => eb('xh', '=', xh));
  }

  /**
   * 根据学号列表批量查找学生
   */
  async findByXhList(xhList: string[]): Promise<DatabaseResult<StudentInfo[]>> {
    if (!xhList || xhList.length === 0) {
      throw new Error('Student number list cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb('xh', 'in', xhList).orderBy('xh', 'asc')
    );
  }

  /**
   * 根据班级代码查找学生
   */
  async findByClass(bjdm: string): Promise<DatabaseResult<StudentInfo[]>> {
    if (!bjdm) {
      throw new Error('Class code cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb('bjdm', '=', bjdm).orderBy('xh', 'asc')
    );
  }

  /**
   * 根据专业代码查找学生
   */
  async findByMajor(zydm: string): Promise<DatabaseResult<StudentInfo[]>> {
    if (!zydm) {
      throw new Error('Major code cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb('zydm', '=', zydm).orderBy('xh', 'asc')
    );
  }

  /**
   * 根据学院代码查找学生
   */
  async findByCollege(xydm: string): Promise<DatabaseResult<StudentInfo[]>> {
    if (!xydm) {
      throw new Error('College code cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb('xydm', '=', xydm).orderBy('xh', 'asc')
    );
  }

  /**
   * 根据年级查找学生
   */
  async findByGrade(sznj: string): Promise<DatabaseResult<StudentInfo[]>> {
    if (!sznj) {
      throw new Error('Grade cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb('sznj', '=', sznj).orderBy('xh', 'asc')
    );
  }

  /**
   * 根据学生类型查找学生
   */
  async findByType(lx: number): Promise<DatabaseResult<StudentInfo[]>> {
    if (lx !== 1 && lx !== 2) {
      throw new Error('Student type must be 1 (undergraduate) or 2 (graduate)');
    }

    return await this.findMany((eb: any) =>
      eb.where('lx', '=', lx).orderBy('xh', 'asc')
    );
  }

  /**
   * 根据状态查找学生
   */
  async findByStatus(zt: string): Promise<DatabaseResult<StudentInfo[]>> {
    if (!zt) {
      throw new Error('Status cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb.where('zt', '=', zt).orderBy('update_time', 'desc')
    );
  }

  /**
   * 查找未处理的变更
   */
  async findUnprocessedChanges(): Promise<DatabaseResult<StudentInfo[]>> {
    return await this.findMany((eb: any) =>
      eb.where('zt', 'is not', null).orderBy('update_time', 'desc')
    );
  }

  /**
   * 查找需要同步的学生（状态不为空且不为processed）
   */
  async findStudentsForSync(): Promise<DatabaseResult<StudentInfo[]>> {
    return await this.findMany((eb: any) =>
      eb
        .where((eb: any) =>
          eb.and([eb('zt', 'is not', null), eb('zt', '!=', 'processed')])
        )
        .orderBy('update_time', 'desc')
    );
  }

  /**
   * 根据更新时间范围查找学生
   */
  async findStudentsByUpdateTimeRange(
    startTime: Date,
    endTime: Date
  ): Promise<DatabaseResult<StudentInfo[]>> {
    if (startTime > endTime) {
      throw new Error('Start time must be before end time');
    }

    return await this.findMany((eb: any) =>
      eb
        .where((eb: any) =>
          eb.and([
            eb('update_time', '>=', startTime),
            eb('update_time', '<=', endTime)
          ])
        )
        .orderBy('update_time', 'desc')
    );
  }

  /**
   * 查找指定时间后的变更
   */
  async findChangesAfterTime(
    timestamp: Date
  ): Promise<DatabaseResult<StudentInfo[]>> {
    return await this.findMany((eb: any) =>
      eb.where('update_time', '>', timestamp).orderBy('update_time', 'desc')
    );
  }

  /**
   * 批量创建学生
   */
  async createStudentsBatch(
    students: NewStudentInfo[]
  ): Promise<DatabaseResult<StudentInfo[]>> {
    if (!students || students.length === 0) {
      throw new Error('Students array cannot be empty');
    }

    // 验证每个学生数据
    for (const student of students) {
      const requiredFields = ['xh', 'xm'];
      for (const field of requiredFields) {
        if (!student[field as keyof NewStudentInfo]) {
          throw new Error(`Required field '${field}' is missing in student data`);
        }
      }

      if (!student.xh) {
        throw new Error('Student number cannot be empty');
      }

      if (!student.xm) {
        throw new Error('Student name cannot be empty');
      }
    }

    return await this.createMany(students);
  }

  /**
   * 批量更新学生
   */
  async updateStudentsBatch(
    updates: Array<{ id: string; data: StudentInfoUpdate }>
  ): Promise<DatabaseResult<number>> {
    if (!updates || updates.length === 0) {
      throw new Error('Updates array cannot be empty');
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        const result = await this.updateNullable(
          parseInt(update.id),
          update.right
        );
        if (isRight(result)) {
          successCount++;
        } else {
          errors.push(
            `Failed to update student ${update.id}: ${result.left?.message}`
          );
        }
      } catch (error) {
        errors.push(
          `Error updating student ${update.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (errors.length > 0) {
      this.logError('updateStudentsBatch', new Error(errors.join('; ')));
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
      updateData as StudentInfoUpdate
    );
  }

  /**
   * 统计指定班级的学生数量
   */
  async countByClass(bjdm: string): Promise<DatabaseResult<number>> {
    if (!bjdm) {
      throw new Error('Class code cannot be empty');
    }

    return await this.count((eb: any) => eb('bjdm', '=', bjdm));
  }

  /**
   * 统计指定专业的学生数量
   */
  async countByMajor(zydm: string): Promise<DatabaseResult<number>> {
    if (!zydm) {
      throw new Error('Major code cannot be empty');
    }

    return await this.count((eb: any) => eb('zydm', '=', zydm));
  }

  /**
   * 统计指定学院的学生数量
   */
  async countByCollege(xydm: string): Promise<DatabaseResult<number>> {
    if (!xydm) {
      throw new Error('College code cannot be empty');
    }

    return await this.count((eb: any) => eb('xydm', '=', xydm));
  }

  /**
   * 统计指定年级的学生数量
   */
  async countByGrade(sznj: string): Promise<DatabaseResult<number>> {
    if (!sznj) {
      throw new Error('Grade cannot be empty');
    }

    return await this.count((eb: any) => eb('sznj', '=', sznj));
  }

  /**
   * 统计指定类型的学生数量
   */
  async countByType(lx: number): Promise<DatabaseResult<number>> {
    if (lx !== 1 && lx !== 2) {
      throw new Error('Student type must be 1 (undergraduate) or 2 (graduate)');
    }

    return await this.count((eb: any) => eb('lx', '=', lx));
  }

  /**
   * 统计指定状态的学生数量
   */
  async countByStatus(zt: string): Promise<DatabaseResult<number>> {
    if (!zt) {
      throw new Error('Status cannot be empty');
    }

    return await this.count((eb: any) => eb('zt', '=', zt));
  }

  /**
   * 统计未处理变更的数量
   */
  async countUnprocessedChanges(): Promise<DatabaseResult<number>> {
    return await this.count((eb: any) => eb('zt', 'is not', null));
  }

  /**
   * 验证学生数据
   */
  async validateStudentData(
    data: Partial<StudentInfo>
  ): Promise<DatabaseResult<boolean>> {
    try {
      // 验证学号格式
      if (data.xh && !/^\d{8,12}$/.test(data.xh)) {
        throw new Error('Invalid student number format');
      }

      // 验证手机号格式
      if (data.sjh && !/^1[3-9]\d{9}$/.test(data.sjh)) {
        throw new Error('Invalid phone number format');
      }

      // 验证邮箱格式
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error('Invalid email format');
      }

      // 验证身份证号格式
      if (
        data.sfzh &&
        !/^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(
          data.sfzh
        )
      ) {
        throw new Error('Invalid ID card number format');
      }

      // 验证学生类型
      if (data.lx && data.lx !== 1 && data.lx !== 2) {
        throw new Error(
          'Student type must be 1 (undergraduate) or 2 (graduate)'
        );
      }

      return right(true
      );
    } catch (error) {
      throw new Error(
        `Student data validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 查找重复的学生
   */
  async findDuplicateStudents(): Promise<DatabaseResult<StudentInfo[]>> {
    // 这里需要使用复杂的SQL查询来查找重复学生
    // 由于BaseRepository可能不直接支持，我们先返回空数组
    // 实际实现需要使用原始SQL查询
    return right([]
    );
  }

  /**
   * 检查学生是否存在
   */
  async checkStudentExists(xh: string): Promise<DatabaseResult<boolean>> {
    if (!xh) {
      throw new Error('Student number cannot be empty');
    }

    const result = await this.findByXh(xh);
    if (isLeft(result)) {
      return left((result as any).error
      );
    }

    return right(result.right !== null
    );
  }

  /**
   * 转换为用户信息
   */
  convertToUserInfo(student: StudentInfo): UserInfo {
    return {
      userCode: student.xh || '',
      userName: student.xm || '',
      userType: 'student',
      collegeCode: student.xydm || undefined,
      collegeName: student.xymc || undefined,
      majorCode: student.zydm || undefined,
      majorName: student.zymc || undefined,
      classCode: student.bjdm || undefined,
      className: student.bjmc || undefined,
      phone: student.sjh || undefined,
      email: student.email || undefined
    };
  }

  /**
   * 批量转换为用户信息
   */
  convertManyToUserInfo(students: StudentInfo[]): UserInfo[] {
    return students.map((student) => this.convertToUserInfo(student));
  }

  /**
   * 搜索学生（综合搜索）
   */
  async searchStudents(
    keyword: string
  ): Promise<DatabaseResult<StudentInfo[]>> {
    if (!keyword) {
      throw new Error('Search keyword cannot be empty');
    }

    const searchPattern = `%${keyword}%`;

    return await this.findMany((eb: any) =>
      eb
        .where((eb: any) =>
          eb.or([
            eb('xh', 'like', searchPattern),
            eb('xm', 'like', searchPattern),
            eb('bjmc', 'like', searchPattern),
            eb('xymc', 'like', searchPattern),
            eb('zymc', 'like', searchPattern)
          ])
        )
        .orderBy('xh', 'asc')
    );
  }

  /**
   * 按姓名搜索学生
   */
  async searchByName(name: string): Promise<DatabaseResult<StudentInfo[]>> {
    if (!name) {
      throw new Error('Name cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb.where('xm', 'like', `%${name}%`).orderBy('xh', 'asc')
    );
  }

  /**
   * 按手机号搜索学生
   */
  async searchByPhone(phone: string): Promise<DatabaseResult<StudentInfo[]>> {
    if (!phone) {
      throw new Error('Phone cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb.where('sjh', 'like', `%${phone}%`).orderBy('xh', 'asc')
    );
  }

  /**
   * 按邮箱搜索学生
   */
  async searchByEmail(email: string): Promise<DatabaseResult<StudentInfo[]>> {
    if (!email) {
      throw new Error('Email cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb.where('email', 'like', `%${email}%`).orderBy('xh', 'asc')
    );
  }

  /**
   * 创建学生（重写以添加验证）
   */
  async create(data: NewStudentInfo): Promise<DatabaseResult<StudentInfo>> {
    // 验证必需字段
    const requiredFields = ['xh', 'xm'];
    for (const field of requiredFields) {
      if (!data[field as keyof NewStudentInfo]) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }

    // 验证数据格式
    const validationResult = await this.validateStudentData(
      data as Partial<StudentInfo>
    );
    if (isLeft(validationResult)) {
      throw new Error('Student data validation failed');
    }

    // 检查学号是否已存在
    const existsResult = await this.checkStudentExists(data.xh || '');
    if (isRight(existsResult) && existsResult.right) {
      throw new Error(`Student with number ${data.xh} already exists`);
    }

    const createData = this.buildCreateData({
      ...data,
      zt: data.zt || null
    });

    this.logOperation('create', {
      xh: data.xh,
      xm: data.xm,
      bjdm: data.bjdm
    });

    return await super.create(createData as NewStudentInfo);
  }

  /**
   * 删除学生（重写以添加日志）
   */
  async delete(id: number): Promise<DatabaseResult<boolean>> {
    this.logOperation('delete', { id });

    return await super.delete(id);
  }
}

// 框架会自动发现和注册此仓储类
// 使用 SCOPED 生命周期，文件名符合 repositories/**/*.ts 模式
