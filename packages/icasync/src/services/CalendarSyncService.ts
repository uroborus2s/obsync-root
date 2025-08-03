// @stratix/icasync 日历同步服务
// 负责日历创建、删除、参与者管理等核心业务逻辑

import { Logger } from '@stratix/core';
import type { WpsCalendarAdapter, WpsScheduleAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import type { ICalendarParticipantsRepository } from '../repositories/CalendarParticipantsRepository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type { IStudentCourseRepository } from '../repositories/StudentCourseRepository.js';
import type { IStudentRepository } from '../repositories/StudentRepository.js';
import type { ITeacherRepository } from '../repositories/TeacherRepository.js';
import type {
  JuheRenwu,
  NewCalendarMapping,
  NewCalendarParticipant
} from '../types/database.js';

/**
 * 日历同步配置
 */
export interface CalendarSyncConfig {
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * 日历同步结果
 */
export interface CalendarSyncResult {
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failedCount: number;
  /** 处理的总数量 */
  totalCount: number;
  /** 错误信息 */
  errors: string[];
  /** 创建的日历ID列表 */
  createdCalendarIds: string[];
  /** 删除的日历ID列表 */
  deletedCalendarIds: string[];
}

/**
 * 参与者同步结果
 */
export interface ParticipantSyncResult {
  /** 成功添加的参与者数量 */
  addedCount: number;
  /** 成功删除的参与者数量 */
  removedCount: number;
  /** 失败数量 */
  failedCount: number;
  /** 错误信息 */
  errors: string[];
}

/**
 * 日历同步服务接口
 */
export interface ICalendarSyncService {
  /**
   * 创建课程日历
   */
  createCourseCalendar(
    kkh: string,
    xnxq: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult>;

  /**
   * 删除课程日历
   */
  deleteCourseCalendar(
    kkh: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult>;

  /**
   * 删除学期内所有日历
   */
  deleteAllCalendarsForSemester(
    xnxq: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult>;

  /**
   * 批量创建课程日历
   */
  createCourseCalendarsBatch(
    kkhList: string[],
    xnxq: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult>;

  /**
   * 添加日历参与者
   */
  addCalendarParticipants(
    calendarId: string,
    kkh: string,
    config?: CalendarSyncConfig
  ): Promise<ParticipantSyncResult>;

  /**
   * 删除日历参与者
   */
  removeCalendarParticipants(
    calendarId: string,
    userCodes: string[],
    config?: CalendarSyncConfig
  ): Promise<ParticipantSyncResult>;

  /**
   * 同步日历参与者（增量更新）
   */
  syncCalendarParticipants(
    calendarId: string,
    kkh: string,
    config?: CalendarSyncConfig
  ): Promise<ParticipantSyncResult>;

  /**
   * 创建课程日程
   */
  createCourseSchedules(
    calendarId: string,
    kkh: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult>;

  /**
   * 删除课程日程
   */
  deleteCourseSchedules(
    calendarId: string,
    kkh: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult>;

  /**
   * 获取已创建的日历列表
   */
  getCreatedCalendars(
    xnxq: string,
    batchSize?: number
  ): Promise<CalendarInfo[]>;
}

/**
 * 日历信息接口
 */
export interface CalendarInfo {
  id: number; // 映射表ID
  kkh: string; // 开课号
  calendar_id: string; // WAS V7日历ID
  calendar_name: string; // 日历名称
  status: string; // 状态
  teacher_ids?: string; // 教师ID列表
  class_codes?: string; // 班级代码列表
  created_at: Date; // 创建时间
  updated_at: Date; // 更新时间
}

/**
 * 日历同步服务实现
 *
 * 注意：根据Stratix框架架构原则，Service层通过依赖注入获取适配器，
 * 但不直接引用适配器类型，而是通过容器解析获得
 */
export default class CalendarSyncService implements ICalendarSyncService {
  constructor(
    private readonly calendarMappingRepository: ICalendarMappingRepository,
    private readonly calendarParticipantsRepository: ICalendarParticipantsRepository,
    private readonly juheRenwuRepository: IJuheRenwuRepository,
    private readonly studentCourseRepository: IStudentCourseRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly teacherRepository: ITeacherRepository,
    private readonly logger: Logger,
    // 通过依赖注入获取WAS V7适配器
    private readonly wasV7ApiCalendar: WpsCalendarAdapter,
    private readonly wasV7ApiSchedule: WpsScheduleAdapter
  ) {}

  /**
   * 创建课程日历
   */
  async createCourseCalendar(
    kkh: string,
    xnxq: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      successCount: 0,
      failedCount: 0,
      totalCount: 1,
      errors: [],
      createdCalendarIds: [],
      deletedCalendarIds: []
    };

    try {
      this.logger.info(`开始创建课程日历，开课号: ${kkh}, 学年学期: ${xnxq}`);

      // 1. 全量同步前先删除现有日历（如果存在）
      const existingMapping =
        await this.calendarMappingRepository.findByKkhAndXnxq(kkh, xnxq);
      if (existingMapping.success && existingMapping.data) {
        const existing = existingMapping.data;
        if (!existing.is_deleted) {
          this.logger.info(
            `发现现有日历，先删除后重建，开课号: ${kkh}, 日历ID: ${existing.calendar_id}`
          );

          // 删除现有日历
          const deleteResult = await this.deleteCourseCalendar(kkh);
          if (deleteResult.failedCount > 0) {
            this.logger.warn(
              `删除现有日历时出现问题: ${deleteResult.errors.join(', ')}`
            );
          } else {
            this.logger.info(`成功删除现有日历，开课号: ${kkh}`);
          }
        }
      }

      // 2. 获取课程信息
      const courseInfo = await this.getCourseInfo(kkh, xnxq);
      if (!courseInfo) {
        throw new Error(`未找到课程信息，开课号: ${kkh}`);
      }

      // 3. 创建WPS日历
      const calendarParams = {
        summary: `${courseInfo.kcmc} (${kkh})`,
        description: `课程: ${courseInfo.kcmc}\n开课号: ${kkh}\n学年学期: ${xnxq}\n授课教师: ${courseInfo.xm_s || '未知'}`
      };

      const calendar =
        await this.wasV7ApiCalendar.createCalendar(calendarParams);
      this.logger.info(
        `WPS日历创建成功，ID: ${calendar.id}, 名称: ${calendar.summary}`
      );

      // 4. 保存日历映射
      const mappingData: NewCalendarMapping = {
        kkh,
        xnxq,
        calendar_id: calendar.id,
        calendar_name: calendar.summary,
        is_deleted: false,
        metadata: JSON.stringify({
          course_name: courseInfo.kcmc,
          teacher_names: courseInfo.xm_s,
          created_by: 'icasync_service'
        })
      };

      const mappingResult =
        await this.calendarMappingRepository.create(mappingData);
      if (!mappingResult.success) {
        throw new Error(`保存日历映射失败: ${mappingResult.error}`);
      }

      result.successCount = 1;
      result.createdCalendarIds.push(calendar.id);

      this.logger.info(
        `课程日历创建完成，开课号: ${kkh}, 日历ID: ${calendar.id}`
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `创建课程日历失败，开课号: ${kkh}, 错误: ${errorMessage}`
      );

      result.failedCount = 1;
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * 删除课程日历
   */
  async deleteCourseCalendar(
    kkh: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      successCount: 0,
      failedCount: 0,
      totalCount: 1,
      errors: [],
      createdCalendarIds: [],
      deletedCalendarIds: []
    };

    try {
      this.logger.info(`开始删除课程日历，开课号: ${kkh}`);

      // 1. 查找日历映射
      const mappingResult = await this.calendarMappingRepository.findByKkh(kkh);
      if (!mappingResult.success || !mappingResult.data) {
        this.logger.warn(`未找到课程日历映射，开课号: ${kkh}`);
        result.successCount = 1; // 认为删除成功（幂等性）
        return result;
      }

      const mapping = mappingResult.data;
      if (mapping.is_deleted) {
        this.logger.warn(
          `课程日历已被删除，开课号: ${kkh}, 日历ID: ${mapping.calendar_id}`
        );
        result.successCount = 1;
        result.deletedCalendarIds.push(mapping.calendar_id);
        return result;
      }

      // 2. 调用WPS API删除日历
      await this.wasV7ApiCalendar.deleteCalendar({
        calendar_id: mapping.calendar_id
      });
      this.logger.info(`WPS日历删除成功，ID: ${mapping.calendar_id}`);

      // 3. 软删除日历映射
      await this.calendarMappingRepository.updateNullable(mapping.id, {
        is_deleted: true,
        deleted_at: new Date().toISOString()
      });

      // 4. 软删除相关的参与者记录
      await this.calendarParticipantsRepository.deleteByCalendarId(
        mapping.calendar_id
      );

      result.successCount = 1;
      result.deletedCalendarIds.push(mapping.calendar_id);

      this.logger.info(
        `课程日历删除完成，开课号: ${kkh}, 日历ID: ${mapping.calendar_id}`
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `删除课程日历失败，开课号: ${kkh}, 错误: ${errorMessage}`
      );

      result.failedCount = 1;
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * 删除学期内所有日历
   */
  async deleteAllCalendarsForSemester(
    xnxq: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      successCount: 0,
      failedCount: 0,
      totalCount: 0,
      errors: [],
      createdCalendarIds: [],
      deletedCalendarIds: []
    };

    try {
      this.logger.info(`开始删除学期内所有日历，学年学期: ${xnxq}`);

      // 1. 获取该学期的所有日历映射
      const mappingsResult =
        await this.calendarMappingRepository.findByXnxq(xnxq);
      if (
        !mappingsResult.success ||
        !mappingsResult.data ||
        mappingsResult.data.length === 0
      ) {
        this.logger.info(`该学期没有找到日历映射，学年学期: ${xnxq}`);
        return result;
      }

      const activeMappings = mappingsResult.data.filter(
        (mapping) => !mapping.is_deleted
      );
      result.totalCount = activeMappings.length;

      if (activeMappings.length === 0) {
        this.logger.info(`该学期没有活跃的日历，学年学期: ${xnxq}`);
        return result;
      }

      this.logger.info(`找到 ${activeMappings.length} 个活跃日历需要删除`);

      // 2. 批量删除日历
      const batchSize = config?.batchSize || 10;
      for (let i = 0; i < activeMappings.length; i += batchSize) {
        const batch = activeMappings.slice(i, i + batchSize);

        const batchPromises = batch.map(async (mapping) => {
          try {
            const deleteResult = await this.deleteCourseCalendar(
              mapping.kkh!,
              config
            );
            return { kkh: mapping.kkh, result: deleteResult };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return {
              kkh: mapping.kkh,
              result: {
                successCount: 0,
                failedCount: 1,
                totalCount: 1,
                errors: [errorMessage],
                createdCalendarIds: [],
                deletedCalendarIds: []
              } as CalendarSyncResult
            };
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);

        // 汇总批次结果
        for (const promiseResult of batchResults) {
          if (promiseResult.status === 'fulfilled') {
            const { result: singleResult } = promiseResult.value;
            result.successCount += singleResult.successCount;
            result.failedCount += singleResult.failedCount;
            result.errors.push(...singleResult.errors);
            result.deletedCalendarIds.push(...singleResult.deletedCalendarIds);
          } else {
            result.failedCount += 1;
            result.errors.push(`批处理失败: ${promiseResult.reason}`);
          }
        }

        // 批次间延迟，避免API限流
        if (i + batchSize < activeMappings.length) {
          await this.sleep(config?.retryDelay || 1000);
        }
      }

      this.logger.info(
        `删除学期内所有日历完成，成功: ${result.successCount}, 失败: ${result.failedCount}`
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`删除学期内所有日历失败: ${errorMessage}`);
      result.failedCount = result.totalCount;
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * 批量创建课程日历
   */
  async createCourseCalendarsBatch(
    kkhList: string[],
    xnxq: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult> {
    const batchSize = config?.batchSize || 10;
    const result: CalendarSyncResult = {
      successCount: 0,
      failedCount: 0,
      totalCount: kkhList.length,
      errors: [],
      createdCalendarIds: [],
      deletedCalendarIds: []
    };

    this.logger.info(
      `开始批量创建课程日历，数量: ${kkhList.length}, 学年学期: ${xnxq}`
    );

    // 全量同步前先删除该学期的所有现有日历
    this.logger.info(`全量同步前先删除学期内所有现有日历，学年学期: ${xnxq}`);
    const deleteAllResult = await this.deleteAllCalendarsForSemester(
      xnxq,
      config
    );

    if (deleteAllResult.failedCount > 0) {
      this.logger.warn(
        `删除现有日历时出现问题，成功: ${deleteAllResult.successCount}, 失败: ${deleteAllResult.failedCount}`
      );
      // 将删除错误添加到结果中，但继续执行创建操作
      result.errors.push(
        ...deleteAllResult.errors.map((err) => `删除阶段: ${err}`)
      );
    } else {
      this.logger.info(
        `成功删除 ${deleteAllResult.successCount} 个现有日历，开始创建新日历`
      );
    }

    // 将删除的日历ID添加到结果中
    result.deletedCalendarIds.push(...deleteAllResult.deletedCalendarIds);

    // 分批处理
    for (let i = 0; i < kkhList.length; i += batchSize) {
      const batch = kkhList.slice(i, i + batchSize);

      const batchPromises = batch.map(async (kkh) => {
        try {
          const singleResult = await this.createCourseCalendar(
            kkh,
            xnxq,
            config
          );
          return { kkh, result: singleResult };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            kkh,
            result: {
              successCount: 0,
              failedCount: 1,
              totalCount: 1,
              errors: [errorMessage],
              createdCalendarIds: [],
              deletedCalendarIds: []
            } as CalendarSyncResult
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      // 汇总批次结果
      for (const promiseResult of batchResults) {
        if (promiseResult.status === 'fulfilled') {
          const { result: singleResult } = promiseResult.value;
          result.successCount += singleResult.successCount;
          result.failedCount += singleResult.failedCount;
          result.errors.push(...singleResult.errors);
          result.createdCalendarIds.push(...singleResult.createdCalendarIds);
        } else {
          result.failedCount += 1;
          result.errors.push(`批处理失败: ${promiseResult.reason}`);
        }
      }

      // 批次间延迟，避免API限流
      if (i + batchSize < kkhList.length) {
        await this.sleep(config?.retryDelay || 1000);
      }
    }

    this.logger.info(
      `批量创建课程日历完成，成功: ${result.successCount}, 失败: ${result.failedCount}`
    );
    return result;
  }

  /**
   * 添加日历参与者
   */
  async addCalendarParticipants(
    calendarId: string,
    kkh: string,
    config?: CalendarSyncConfig
  ): Promise<ParticipantSyncResult> {
    const result: ParticipantSyncResult = {
      addedCount: 0,
      removedCount: 0,
      failedCount: 0,
      errors: []
    };

    try {
      this.logger.info(
        `开始添加日历参与者，日历ID: ${calendarId}, 开课号: ${kkh}`
      );

      // 1. 获取课程的所有参与者（学生 + 教师）
      const participants = await this.getCourseParticipants(kkh);
      if (participants.length === 0) {
        this.logger.warn(`未找到课程参与者，开课号: ${kkh}`);
        return result;
      }

      this.logger.info(`找到 ${participants.length} 个参与者`);

      // 2. 分批添加参与者（WPS API限制每批最多100个）
      const batchSize = Math.min(config?.batchSize || 50, 100);

      for (let i = 0; i < participants.length; i += batchSize) {
        const batch = participants.slice(i, i + batchSize);

        try {
          // 转换为WPS API格式
          const wpsParticipants = batch.map((p) => ({
            user_id: p.userCode,
            role:
              p.userType === 'teacher'
                ? ('writer' as const)
                : ('reader' as const),
            id_type: 'external' as const
          }));

          // 调用WPS API批量添加参与者
          const batchResult =
            await this.wasV7ApiCalendar.batchCreateCalendarPermissions({
              calendar_id: calendarId,
              permissions: wpsParticipants,
              id_type: 'external'
            });

          // 保存参与者记录到数据库
          const participantRecords: NewCalendarParticipant[] = batch.map(
            (p) => ({
              kkh,
              calendar_id: calendarId,
              user_code: p.userCode,
              user_name: p.userName,
              user_type: p.userType,
              permission_role: p.userType === 'teacher' ? 'writer' : 'reader',
              is_deleted: false,
              metadata: JSON.stringify({
                wps_permission_id:
                  batchResult.items?.find(
                    (item: any) => item.user_id === p.userCode
                  )?.id || null,
                added_by: 'icasync_service'
              })
            })
          );

          const saveResult =
            await this.calendarParticipantsRepository.createParticipantsBatch(
              participantRecords
            );
          if (!saveResult.success) {
            throw new Error(`保存参与者记录失败: ${saveResult.error}`);
          }

          result.addedCount += batch.length;
          this.logger.info(`批次添加成功，数量: ${batch.length}`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`批次添加失败: ${errorMessage}`);
          result.failedCount += batch.length;
          result.errors.push(
            `批次 ${Math.floor(i / batchSize) + 1}: ${errorMessage}`
          );
        }

        // 批次间延迟
        if (i + batchSize < participants.length) {
          await this.sleep(config?.retryDelay || 500);
        }
      }

      this.logger.info(
        `添加日历参与者完成，成功: ${result.addedCount}, 失败: ${result.failedCount}`
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`添加日历参与者失败: ${errorMessage}`);
      result.failedCount = 1;
      result.errors.push(errorMessage);
      return result;
    }
  }

  // 私有辅助方法...

  private async getCourseInfo(
    kkh: string,
    xnxq: string
  ): Promise<JuheRenwu | null> {
    const result = await this.juheRenwuRepository.findByKkh(kkh);
    if (!result.success || result.data.length === 0) {
      return null;
    }
    return result.data.find((item) => item.xnxq === xnxq) || result.data[0];
  }

  private async getCourseParticipants(kkh: string): Promise<
    Array<{
      userCode: string;
      userName: string;
      userType: 'student' | 'teacher';
    }>
  > {
    const participants: Array<{
      userCode: string;
      userName: string;
      userType: 'student' | 'teacher';
    }> = [];

    // 获取学生参与者
    const studentsResult = await this.studentCourseRepository.findByKkh(kkh);
    if (studentsResult.success) {
      for (const studentCourse of studentsResult.data) {
        if (!studentCourse.xh) continue;

        const studentResult = await this.studentRepository.findByXh(
          studentCourse.xh
        );
        if (
          studentResult.success &&
          studentResult.data &&
          studentResult.data.xh &&
          studentResult.data.xm
        ) {
          participants.push({
            userCode: studentResult.data.xh,
            userName: studentResult.data.xm,
            userType: 'student'
          });
        }
      }
    }

    // 获取教师参与者
    const courseInfo = await this.getCourseInfo(kkh, '');
    if (courseInfo && courseInfo.gh_s) {
      const teacherCodes = courseInfo.gh_s.split(',').filter(Boolean);
      for (const teacherCode of teacherCodes) {
        const teacherResult = await this.teacherRepository.findByGh(
          teacherCode.trim()
        );
        if (
          teacherResult.success &&
          teacherResult.data &&
          teacherResult.data.gh &&
          teacherResult.data.xm
        ) {
          participants.push({
            userCode: teacherResult.data.gh,
            userName: teacherResult.data.xm,
            userType: 'teacher'
          });
        }
      }
    }

    return participants;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 删除日历参与者
   */
  async removeCalendarParticipants(
    calendarId: string,
    userCodes: string[],
    config?: CalendarSyncConfig
  ): Promise<ParticipantSyncResult> {
    const result: ParticipantSyncResult = {
      addedCount: 0,
      removedCount: 0,
      failedCount: 0,
      errors: []
    };

    try {
      this.logger.info(
        `开始删除日历参与者，日历ID: ${calendarId}, 用户数量: ${userCodes.length}`
      );

      for (const userCode of userCodes) {
        try {
          // 1. 查找参与者记录
          // 注意：这里我们不知道用户类型，所以先尝试查找所有参与者
          const allParticipantsResult =
            await this.calendarParticipantsRepository.findByCalendarId(
              calendarId
            );
          const participant = allParticipantsResult.success
            ? allParticipantsResult.data.find(
                (p) => p.user_code === userCode && !p.is_deleted
              )
            : null;

          if (!participant) {
            this.logger.warn(`未找到参与者记录，用户: ${userCode}`);
            continue;
          }
          if (participant.is_deleted) {
            this.logger.warn(`参与者已被删除，用户: ${userCode}`);
            result.removedCount++;
            continue;
          }

          // 2. 获取WPS权限ID
          const metadata =
            participant.metadata && typeof participant.metadata === 'string'
              ? JSON.parse(participant.metadata)
              : participant.metadata || {};
          const wpsPermissionId = metadata.wps_permission_id;

          if (wpsPermissionId) {
            // 3. 调用WPS API删除权限
            await this.wasV7ApiCalendar.deleteCalendarPermission({
              calendar_id: calendarId,
              calendar_permission_id: wpsPermissionId
            });
          }

          // 4. 软删除数据库记录
          await this.calendarParticipantsRepository.updateNullable(
            participant.id,
            {
              is_deleted: true,
              deleted_at: new Date().toISOString()
            }
          );

          result.removedCount++;
          this.logger.debug(`参与者删除成功，用户: ${userCode}`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `删除参与者失败，用户: ${userCode}, 错误: ${errorMessage}`
          );
          result.failedCount++;
          result.errors.push(`${userCode}: ${errorMessage}`);
        }

        // 避免API限流
        await this.sleep(100);
      }

      this.logger.info(
        `删除日历参与者完成，成功: ${result.removedCount}, 失败: ${result.failedCount}`
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`删除日历参与者失败: ${errorMessage}`);
      result.failedCount = userCodes.length;
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * 同步日历参与者（增量更新）
   */
  async syncCalendarParticipants(
    calendarId: string,
    kkh: string,
    config?: CalendarSyncConfig
  ): Promise<ParticipantSyncResult> {
    const result: ParticipantSyncResult = {
      addedCount: 0,
      removedCount: 0,
      failedCount: 0,
      errors: []
    };

    try {
      this.logger.info(
        `开始同步日历参与者，日历ID: ${calendarId}, 开课号: ${kkh}`
      );

      // 1. 获取当前应该有的参与者
      const currentParticipants = await this.getCourseParticipants(kkh);
      const currentUserCodes = new Set(
        currentParticipants.map((p) => p.userCode)
      );

      // 2. 获取数据库中已有的参与者
      const existingResult =
        await this.calendarParticipantsRepository.findByCalendarId(calendarId);
      const existingParticipants = existingResult.success
        ? existingResult.data
        : [];
      const existingUserCodes = new Set(
        existingParticipants
          .filter((p) => !p.is_deleted)
          .map((p) => p.user_code)
      );

      // 3. 计算需要添加和删除的参与者
      const toAdd = currentParticipants.filter(
        (p) => !existingUserCodes.has(p.userCode)
      );
      const toRemove = Array.from(existingUserCodes).filter(
        (code) => !currentUserCodes.has(code)
      );

      this.logger.info(
        `参与者同步计划 - 添加: ${toAdd.length}, 删除: ${toRemove.length}`
      );

      // 4. 添加新参与者
      if (toAdd.length > 0) {
        // 临时创建一个子日历ID来复用addCalendarParticipants逻辑
        const addResult = await this.addCalendarParticipants(
          calendarId,
          kkh,
          config
        );
        result.addedCount = addResult.addedCount;
        result.failedCount += addResult.failedCount;
        result.errors.push(...addResult.errors);
      }

      // 5. 删除不再需要的参与者
      if (toRemove.length > 0) {
        const removeResult = await this.removeCalendarParticipants(
          calendarId,
          toRemove,
          config
        );
        result.removedCount = removeResult.removedCount;
        result.failedCount += removeResult.failedCount;
        result.errors.push(...removeResult.errors);
      }

      this.logger.info(
        `同步日历参与者完成，添加: ${result.addedCount}, 删除: ${result.removedCount}, 失败: ${result.failedCount}`
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`同步日历参与者失败: ${errorMessage}`);
      result.failedCount = 1;
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * 创建课程日程
   */
  async createCourseSchedules(
    calendarId: string,
    kkh: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      successCount: 0,
      failedCount: 0,
      totalCount: 0,
      errors: [],
      createdCalendarIds: [],
      deletedCalendarIds: []
    };

    try {
      this.logger.info(
        `开始创建课程日程，日历ID: ${calendarId}, 开课号: ${kkh}`
      );

      // 1. 获取课程的所有聚合任务
      const tasksResult = await this.juheRenwuRepository.findByKkh(kkh);
      if (!tasksResult.success || tasksResult.data.length === 0) {
        this.logger.warn(`未找到课程任务，开课号: ${kkh}`);
        return result;
      }

      const tasks = tasksResult.data.filter((task) => task.gx_zt === '0'); // 只处理未同步的任务
      result.totalCount = tasks.length;

      if (tasks.length === 0) {
        this.logger.info(`所有课程任务已同步，开课号: ${kkh}`);
        return result;
      }

      this.logger.info(`找到 ${tasks.length} 个待同步的课程任务`);

      // 2. 转换为WPS日程格式
      const schedules = tasks
        .filter((task) => task.rq && task.sj_f && task.sj_t) // 过滤掉缺少必要字段的任务
        .map((task) => ({
          summary: `${task.kcmc}`,
          description: `课程: ${task.kcmc}\n开课号: ${task.kkh}\n教师: ${task.xm_s || '未知'}\n教室: ${task.room_s || '未知'}\n节次: ${task.jc_s || '未知'}`,
          start_time: {
            datetime: this.formatDateTime(task.rq!, task.sj_f!)
          },
          end_time: {
            datetime: this.formatDateTime(task.rq!, task.sj_t!)
          },
          time_zone: 'Asia/Shanghai',
          location: `${task.lq || ''}${task.room_s || ''}`.trim() || '未知地点'
        }));

      // 3. 批量创建日程
      const batchResult = await this.wasV7ApiSchedule.batchCreateSchedules({
        calendar_id: calendarId,
        events: schedules
      });

      // 4. 更新任务同步状态
      const taskIds = tasks.map((task) => task.id).filter(Boolean) as number[];
      if (taskIds.length > 0) {
        await this.juheRenwuRepository.updateSyncStatusBatch(taskIds, '1'); // 标记为已同步
      }

      result.successCount = batchResult.events?.length || 0;
      result.failedCount = tasks.length - result.successCount;

      this.logger.info(
        `创建课程日程完成，成功: ${result.successCount}, 失败: ${result.failedCount}`
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`创建课程日程失败: ${errorMessage}`);
      result.failedCount = result.totalCount;
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * 删除课程日程
   */
  async deleteCourseSchedules(
    calendarId: string,
    kkh: string,
    config?: CalendarSyncConfig
  ): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      successCount: 0,
      failedCount: 0,
      totalCount: 0,
      errors: [],
      createdCalendarIds: [],
      deletedCalendarIds: []
    };

    try {
      this.logger.info(
        `开始删除课程日程，日历ID: ${calendarId}, 开课号: ${kkh}`
      );

      // 1. 获取日历中的所有日程
      const scheduleListResult = await this.wasV7ApiSchedule.getScheduleList({
        calendar_id: calendarId,
        page_size: 100 // WPS API最大支持100
      });

      if (!scheduleListResult.items || scheduleListResult.items.length === 0) {
        this.logger.info(`日历中没有日程，日历ID: ${calendarId}`);
        return result;
      }

      // 2. 筛选出属于指定课程的日程（通过日程标题或描述匹配）
      const courseSchedules = scheduleListResult.items.filter(
        (schedule: any) => {
          // 通过日程标题或描述中包含开课号来识别
          const titleMatch = schedule.summary?.includes(kkh);
          const descMatch = schedule.description?.includes(kkh);
          return titleMatch || descMatch;
        }
      );

      result.totalCount = courseSchedules.length;

      if (courseSchedules.length === 0) {
        this.logger.info(`未找到课程相关日程，开课号: ${kkh}`);
        return result;
      }

      this.logger.info(`找到 ${courseSchedules.length} 个课程日程需要删除`);

      // 3. 逐个删除日程
      for (const schedule of courseSchedules) {
        try {
          await this.wasV7ApiSchedule.deleteSchedule({
            calendar_id: calendarId,
            event_id: schedule.id
          });
          result.successCount++;
          this.logger.debug(`日程删除成功，ID: ${schedule.id}`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `删除日程失败，ID: ${schedule.id}, 错误: ${errorMessage}`
          );
          result.failedCount++;
          result.errors.push(`日程 ${schedule.id}: ${errorMessage}`);
        }

        // 避免API限流
        await this.sleep(100);
      }

      // 4. 更新相关任务的同步状态
      const tasksResult = await this.juheRenwuRepository.findByKkh(kkh);
      if (tasksResult.success && tasksResult.data.length > 0) {
        const taskIds = tasksResult.data
          .map((task) => task.id)
          .filter(Boolean) as number[];
        if (taskIds.length > 0) {
          await this.juheRenwuRepository.updateSyncStatusBatch(taskIds, '4'); // 标记为已删除
        }
      }

      this.logger.info(
        `删除课程日程完成，成功: ${result.successCount}, 失败: ${result.failedCount}`
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`删除课程日程失败: ${errorMessage}`);
      result.failedCount = result.totalCount;
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * 获取已创建的日历列表
   */
  async getCreatedCalendars(
    xnxq: string,
    batchSize: number = 100
  ): Promise<CalendarInfo[]> {
    try {
      this.logger.info(
        `获取已创建的日历列表，学年学期: ${xnxq}, 批次大小: ${batchSize}`
      );

      // 通过 Repository 层获取已创建的日历映射
      const mappingsResult =
        await this.calendarMappingRepository.findByXnxqWithStatus(
          xnxq,
          ['active', 'participants_added'], // 获取已创建且可以添加参与者的日历
          batchSize
        );

      if (!mappingsResult.success) {
        this.logger.error(`获取日历映射失败: ${mappingsResult.error?.message}`);
        return [];
      }

      const mappings = mappingsResult.data || [];
      const calendars: CalendarInfo[] = [];

      // 转换为 CalendarInfo 格式
      for (const mapping of mappings) {
        calendars.push({
          id: mapping.id,
          kkh: mapping.kkh,
          calendar_id: mapping.calendar_id,
          calendar_name: mapping.calendar_name || `课程日历-${mapping.kkh}`,
          status: 'active', // 从查询条件推断状态
          teacher_ids: '', // 如需要可通过其他方法获取
          class_codes: '', // 如需要可通过其他方法获取
          created_at: mapping.created_at,
          updated_at: mapping.updated_at
        });
      }

      this.logger.info(`获取到 ${calendars.length} 个已创建的日历`);
      return calendars;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`获取已创建日历列表失败: ${errorMessage}`);
      return [];
    }
  }

  /**
   * 格式化日期时间
   */
  private formatDateTime(date: string, time: string): string {
    // 输入格式: date = "2025/03/03", time = "08:00:00.000"
    // 输出格式: "2025-03-03T08:00:00+08:00"

    const dateStr = date.replace(/\//g, '-'); // 转换为 2025-03-03
    const timeStr = time.split('.')[0]; // 去掉毫秒部分，得到 08:00:00

    return `${dateStr}T${timeStr}+08:00`;
  }
}
