// @stratix/icasync 教师信息仓储
import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type {
  NewTeacherInfo,
  TeacherInfo,
  TeacherInfoUpdate,
  UserInfo
} from '../types/database.js';
import { BaseIcasyncRepository } from './base/BaseIcasyncRepository.js';

// 依赖注入装饰器 - 使用框架自动发现机制

/**
 * 教师信息仓储接口
 */
export interface ITeacherRepository {
  // 基础操作
  findByIdNullable(id: string): Promise<DatabaseResult<TeacherInfo | null>>;
  create(data: NewTeacherInfo): Promise<DatabaseResult<TeacherInfo>>;
  updateNullable(
    id: string,
    data: TeacherInfoUpdate
  ): Promise<DatabaseResult<TeacherInfo | null>>;
  delete(id: string): Promise<DatabaseResult<boolean>>;

  // 业务查询方法
  findByGh(gh: string): Promise<DatabaseResult<TeacherInfo | null>>;
  findByGhList(ghList: string[]): Promise<DatabaseResult<TeacherInfo[]>>;
  findByDepartment(ssdwdm: string): Promise<DatabaseResult<TeacherInfo[]>>;
  findByTitle(zc: string): Promise<DatabaseResult<TeacherInfo[]>>;
  findByDegree(zgxw: string): Promise<DatabaseResult<TeacherInfo[]>>;
  findByEducation(zgxl: string): Promise<DatabaseResult<TeacherInfo[]>>;

  // 状态查询
  findByStatus(zt: string): Promise<DatabaseResult<TeacherInfo[]>>;
  findUnprocessedChanges(): Promise<DatabaseResult<TeacherInfo[]>>;
  findChangesAfterTime(timestamp: Date): Promise<DatabaseResult<TeacherInfo[]>>;
  findTeachersForSync(): Promise<DatabaseResult<TeacherInfo[]>>;
  findTeachersByUpdateTimeRange(
    startTime: Date,
    endTime: Date
  ): Promise<DatabaseResult<TeacherInfo[]>>;

  // 通用查询方法
  findMany(filter?: any, options?: any): Promise<DatabaseResult<TeacherInfo[]>>;

  // 批量操作
  createTeachersBatch(
    teachers: NewTeacherInfo[]
  ): Promise<DatabaseResult<TeacherInfo[]>>;
  updateTeachersBatch(
    updates: Array<{ id: string; data: TeacherInfoUpdate }>
  ): Promise<DatabaseResult<number>>;
  markAsProcessed(ids: string[]): Promise<DatabaseResult<number>>;

  // 统计查询
  countByDepartment(ssdwdm: string): Promise<DatabaseResult<number>>;
  countByTitle(zc: string): Promise<DatabaseResult<number>>;
  countByDegree(zgxw: string): Promise<DatabaseResult<number>>;
  countByEducation(zgxl: string): Promise<DatabaseResult<number>>;
  countByStatus(zt: string): Promise<DatabaseResult<number>>;
  countUnprocessedChanges(): Promise<DatabaseResult<number>>;

  // 数据验证
  validateTeacherData(
    data: Partial<TeacherInfo>
  ): Promise<DatabaseResult<boolean>>;
  findDuplicateTeachers(): Promise<DatabaseResult<TeacherInfo[]>>;
  checkTeacherExists(gh: string): Promise<DatabaseResult<boolean>>;

  // 业务转换
  convertToUserInfo(teacher: TeacherInfo): UserInfo;
  convertManyToUserInfo(teachers: TeacherInfo[]): UserInfo[];

  // 搜索功能
  searchTeachers(keyword: string): Promise<DatabaseResult<TeacherInfo[]>>;
  searchByName(name: string): Promise<DatabaseResult<TeacherInfo[]>>;
  searchByPhone(phone: string): Promise<DatabaseResult<TeacherInfo[]>>;
  searchByEmail(email: string): Promise<DatabaseResult<TeacherInfo[]>>;
}

/**
 * 教师信息仓储实现
 * 访问现有的 out_jsxx 表
 */
export default class TeacherRepository
  extends BaseIcasyncRepository<
    'out_jsxx',
    TeacherInfo,
    NewTeacherInfo,
    TeacherInfoUpdate,
    string
  >
  implements ITeacherRepository
{
  protected readonly tableName = 'out_jsxx' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super('syncdb');
  }

  /**
   * 根据工号查找教师
   */
  async findByGh(gh: string): Promise<DatabaseResult<TeacherInfo | null>> {
    if (!gh) {
      throw new Error('Teacher number cannot be empty');
    }

    return await this.findOneNullable((eb: any) => eb.where('gh', '=', gh));
  }

  /**
   * 根据工号列表批量查找教师
   */
  async findByGhList(ghList: string[]): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!ghList || ghList.length === 0) {
      throw new Error('Teacher number list cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb.where('gh', 'in', ghList).orderBy('gh', 'asc')
    );
  }

  /**
   * 根据部门代码查找教师
   */
  async findByDepartment(
    ssdwdm: string
  ): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!ssdwdm) {
      throw new Error('Department code cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb.where('ssdwdm', '=', ssdwdm).orderBy('gh', 'asc')
    );
  }

  /**
   * 根据职称查找教师
   */
  async findByTitle(zc: string): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!zc) {
      throw new Error('Title cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb.where('zc', '=', zc).orderBy('gh', 'asc')
    );
  }

  /**
   * 根据最高学位查找教师
   */
  async findByDegree(zgxw: string): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!zgxw) {
      throw new Error('Degree cannot be empty');
    }

    return await this.findMany((eb: any) => eb.where('zgxw', '=', zgxw));
  }

  /**
   * 根据最高学历查找教师
   */
  async findByEducation(zgxl: string): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!zgxl) {
      throw new Error('Education cannot be empty');
    }

    return await this.findMany((eb: any) => eb.where('zgxl', '=', zgxl));
  }

  /**
   * 根据状态查找教师
   */
  async findByStatus(zt: string): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!zt) {
      throw new Error('Status cannot be empty');
    }

    return await this.findMany((eb: any) => eb.where('zt', '=', zt));
  }

  /**
   * 查找未处理的变更
   */
  async findUnprocessedChanges(): Promise<DatabaseResult<TeacherInfo[]>> {
    return await this.findMany((eb: any) => eb.where('zt', 'is not', null));
  }

  /**
   * 查找需要同步的教师（状态不为空且不为processed）
   */
  async findTeachersForSync(): Promise<DatabaseResult<TeacherInfo[]>> {
    return await this.findMany((eb: any) =>
      eb.and([eb('zt', 'is not', null), eb('zt', '!=', 'processed')])
    );
  }

  /**
   * 根据更新时间范围查找教师
   */
  async findTeachersByUpdateTimeRange(
    startTime: Date,
    endTime: Date
  ): Promise<DatabaseResult<TeacherInfo[]>> {
    if (startTime > endTime) {
      throw new Error('Start time must be before end time');
    }

    return await this.findMany((eb: any) =>
      eb
        .where('update_time', '>=', startTime)
        .where('update_time', '<=', endTime)
    );
  }

  /**
   * 查找指定时间后的变更
   */
  async findChangesAfterTime(
    timestamp: Date
  ): Promise<DatabaseResult<TeacherInfo[]>> {
    return await this.findMany((eb: any) =>
      eb.where('update_time', '>', timestamp)
    );
  }

  /**
   * 批量创建教师
   */
  async createTeachersBatch(
    teachers: NewTeacherInfo[]
  ): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!teachers || teachers.length === 0) {
      throw new Error('Teachers array cannot be empty');
    }

    // 验证每个教师数据
    for (const teacher of teachers) {
      const requiredFields = ['gh', 'xm'];
      for (const field of requiredFields) {
        if (!teacher[field as keyof NewTeacherInfo]) {
          throw new Error(`Required field '${field}' is missing in teacher data`);
        }
      }

      if (!teacher.gh) {
        throw new Error('Teacher number cannot be empty');
      }

      if (!teacher.xm) {
        throw new Error('Teacher name cannot be empty');
      }
    }

    return await this.createMany(teachers);
  }

  /**
   * 批量更新教师
   */
  async updateTeachersBatch(
    updates: Array<{ id: string; data: TeacherInfoUpdate }>
  ): Promise<DatabaseResult<number>> {
    if (!updates || updates.length === 0) {
      throw new Error('Updates array cannot be empty');
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        const result = await this.updateNullable(update.id, update.data);
        if (result.success) {
          successCount++;
        } else {
          errors.push(
            `Failed to update teacher ${update.id}: ${result.error?.message}`
          );
        }
      } catch (error) {
        errors.push(
          `Error updating teacher ${update.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (errors.length > 0) {
      this.logError('updateTeachersBatch', new Error(errors.join('; ')));
    }

    return {
      success: true,
      data: successCount
    };
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
      updateData as TeacherInfoUpdate
    );
  }

  /**
   * 统计指定部门的教师数量
   */
  async countByDepartment(ssdwdm: string): Promise<DatabaseResult<number>> {
    if (!ssdwdm) {
      throw new Error('Department code cannot be empty');
    }

    return await this.count((eb) => eb.where('ssdwdm', '=', ssdwdm));
  }

  /**
   * 统计指定职称的教师数量
   */
  async countByTitle(zc: string): Promise<DatabaseResult<number>> {
    if (!zc) {
      throw new Error('Title cannot be empty');
    }

    return await this.count((eb) => eb.where('zc', '=', zc));
  }

  /**
   * 统计指定学位的教师数量
   */
  async countByDegree(zgxw: string): Promise<DatabaseResult<number>> {
    if (!zgxw) {
      throw new Error('Degree cannot be empty');
    }

    return await this.count((eb) => eb.where('zgxw', '=', zgxw));
  }

  /**
   * 统计指定学历的教师数量
   */
  async countByEducation(zgxl: string): Promise<DatabaseResult<number>> {
    if (!zgxl) {
      throw new Error('Education cannot be empty');
    }

    return await this.count((eb) => eb.where('zgxl', '=', zgxl));
  }

  /**
   * 统计指定状态的教师数量
   */
  async countByStatus(zt: string): Promise<DatabaseResult<number>> {
    if (!zt) {
      throw new Error('Status cannot be empty');
    }

    return await this.count((eb) => eb.where('zt', '=', zt));
  }

  /**
   * 统计未处理变更的数量
   */
  async countUnprocessedChanges(): Promise<DatabaseResult<number>> {
    return await this.count((eb) => eb.where('zt', 'is not', null));
  }

  /**
   * 验证教师数据
   */
  async validateTeacherData(
    data: Partial<TeacherInfo>
  ): Promise<DatabaseResult<boolean>> {
    try {
      // 验证工号格式
      if (data.gh && !/^\d{4,10}$/.test(data.gh)) {
        throw new Error('Invalid teacher number format');
      }

      // 验证手机号格式
      if (data.sjh && !/^1[3-9]\d{9}$/.test(data.sjh)) {
        throw new Error('Invalid phone number format');
      }

      // 验证邮箱格式
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error('Invalid email format');
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      throw new Error(
        `Teacher data validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 查找重复的教师
   */
  async findDuplicateTeachers(): Promise<DatabaseResult<TeacherInfo[]>> {
    // 这里需要使用复杂的SQL查询来查找重复教师
    // 由于BaseRepository可能不直接支持，我们先返回空数组
    // 实际实现需要使用原始SQL查询
    return {
      success: true,
      data: []
    };
  }

  /**
   * 检查教师是否存在
   */
  async checkTeacherExists(gh: string): Promise<DatabaseResult<boolean>> {
    if (!gh) {
      throw new Error('Teacher number cannot be empty');
    }

    const result = await this.findByGh(gh);
    if (!result.success) {
      return {
        success: false,
        error: (result as any).error
      };
    }

    return {
      success: true,
      data: result.data !== null
    };
  }

  /**
   * 转换为用户信息
   */
  convertToUserInfo(teacher: TeacherInfo): UserInfo {
    return {
      userCode: teacher.gh || '',
      userName: teacher.xm || '',
      userType: 'teacher',
      majorCode: teacher.ssdwdm || undefined,
      majorName: teacher.ssdwmc || undefined,
      phone: teacher.sjh || undefined,
      email: teacher.email || undefined
    };
  }

  /**
   * 批量转换为用户信息
   */
  convertManyToUserInfo(teachers: TeacherInfo[]): UserInfo[] {
    return teachers.map((teacher) => this.convertToUserInfo(teacher));
  }

  /**
   * 搜索教师（综合搜索）
   */
  async searchTeachers(
    keyword: string
  ): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!keyword) {
      throw new Error('Search keyword cannot be empty');
    }

    const searchPattern = `%${keyword}%`;

    return await this.findMany((eb: any) =>
      eb.or([
        eb('gh', 'like', searchPattern),
        eb('xm', 'like', searchPattern),
        eb('ssdwmc', 'like', searchPattern),
        eb('zc', 'like', searchPattern)
      ])
    );
  }

  /**
   * 按姓名搜索教师
   */
  async searchByName(name: string): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!name) {
      throw new Error('Name cannot be empty');
    }

    return await this.findMany((eb: any) => eb('xm', 'like', `%${name}%`));
  }

  /**
   * 按手机号搜索教师
   */
  async searchByPhone(phone: string): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!phone) {
      throw new Error('Phone cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb.where('sjh', 'like', `%${phone}%`)
    );
  }

  /**
   * 按邮箱搜索教师
   */
  async searchByEmail(email: string): Promise<DatabaseResult<TeacherInfo[]>> {
    if (!email) {
      throw new Error('Email cannot be empty');
    }

    return await this.findMany((eb: any) =>
      eb.where('email', 'like', `%${email}%`)
    );
  }

  /**
   * 创建教师（重写以添加验证）
   */
  async create(data: NewTeacherInfo): Promise<DatabaseResult<TeacherInfo>> {
    // 验证必需字段
    const requiredFields = ['gh', 'xm'];
    for (const field of requiredFields) {
      if (!data[field as keyof NewTeacherInfo]) {
        throw new Error(`Required field '${field}' is missing`);
      }
    }

    // 转换数据类型以进行验证
    const validationData: Partial<TeacherInfo> = {
      ...data,
      update_time: data.update_time ? new Date(data.update_time) : null
    };

    // 验证数据格式
    const validationResult = await this.validateTeacherData(validationData);
    if (!validationResult.success) {
      throw new Error('Teacher data validation failed');
    }

    // 检查工号是否已存在
    const existsResult = await this.checkTeacherExists(data.gh || '');
    if (existsResult.success && existsResult.data) {
      throw new Error(`Teacher with number ${data.gh} already exists`);
    }

    const createData = this.buildCreateData({
      ...data,
      zt: data.zt || null
    });

    this.logOperation('create', {
      gh: data.gh,
      xm: data.xm,
      ssdwdm: data.ssdwdm
    });

    return await super.create(createData as NewTeacherInfo);
  }

  /**
   * 删除教师（重写以添加日志）
   */
  async delete(id: string): Promise<DatabaseResult<boolean>> {
    this.logOperation('delete', { id });

    return await super.delete(id);
  }
}

// 框架会自动发现和注册此仓储类
// 使用 SCOPED 生命周期，文件名符合 repositories/**/*.ts 模式
