import { WpsScheduleAdapter } from '@stratix/was-v7';
// @wps/hltnlink 课表到WPS日程同步服务实现
// 基于Stratix框架的Service层实现

import { type Logger } from '@stratix/core';
import { sleep } from '@stratix/utils/async';
import type { WpsCalendarAdapter, WpsUserAdapter } from '@stratix/was-v7';
import { addDays, addWeeks, format, setDay, startOfDay } from 'date-fns';
import type CalendarRepository from '../repositories/CalendarRepository.js';
import type SourceCourseRepository from '../repositories/SourceCourseRepository.js';
import type SourceCourseSelectionsRepository from '../repositories/SourceCourseSelectionsRepository.js';
import type {
  CalendarInfo,
  CalendarSyncParams,
  CalendarSyncResult,
  CourseScheduleData,
  PermissionBatchResult,
  PermissionData,
  ServiceResult,
  SyncProgressCallback,
  WpsExcludeDate,
  WpsRecurrenceRule,
  WpsScheduleCreateParams
} from '../types/calendar-sync.js';
import type { ICalendarSyncService } from './interfaces/ICalendarSyncService.js';

/**
 * 课表到WPS日程同步服务实现
 * 负责完整的课表数据到WPS日程同步流程
 */
export default class CalendarSyncService implements ICalendarSyncService {
  constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly sourceCourseRepository: SourceCourseRepository,
    private readonly sourceCourseSelectionsRepository: SourceCourseSelectionsRepository,
    private readonly wasV7ApiCalendar: WpsCalendarAdapter,
    private readonly wasV7ApiSchedule: WpsScheduleAdapter,
    private readonly wasV7ApiUser: WpsUserAdapter,
    private readonly logger: Logger
  ) {}

  /**
   * 执行完整的课表到WPS日程同步流程
   */
  async syncCalendarSchedules(
    params: CalendarSyncParams,
    progressCallback?: SyncProgressCallback
  ): Promise<ServiceResult<CalendarSyncResult>> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting calendar schedule synchronization', {
        params
      });

      // 1. 验证参数
      const validationResult = this.validateSyncParams(params);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      const calendarsResult = await this.getCalendarsForSync(params.semester);
      if (!calendarsResult.success || !calendarsResult.data) {
        return {
          success: false,
          error: {
            code: 'FETCH_CALENDARS_FAILED',
            message: '获取日历数据失败',
            details: calendarsResult.error
          }
        };
      }

      const calendars = calendarsResult.data;
      this.logger.info(`Found ${calendars.length} calendars to sync`);

      // 3. 初始化结果对象
      const result: CalendarSyncResult = {
        success: true,
        totalCalendars: calendars.length,
        successfulCalendars: 0,
        failedCalendars: 0,
        permissionResults: [],
        scheduleResults: [],
        errors: [],
        duration: 0,
        statistics: {
          totalPermissions: 0,
          successfulPermissions: 0,
          totalSchedules: 0,
          successfulSchedules: 0,
          apiCalls: 0,
          dbOperations: 0
        }
      };

      // 4. 循环处理每个日历
      for (let i = 0; i < calendars.length; i++) {
        const calendar = calendars[i];

        progressCallback?.({
          step: 'SYNCING_PERMISSIONS',
          currentCalendar: i + 1,
          totalCalendars: calendars.length,
          percentage: Math.round(((i + 1) / calendars.length) * 100),
          currentCourseSequence: calendar.courseId,
          message: `正在同步日历 ${calendar.courseName}...`
        });

        try {
          // 同步单个日历
          const syncResult = await this.syncSingleCalendar(calendar, params);

          if (syncResult.success && syncResult.data) {
            result.successfulCalendars++;
            result.permissionResults.push(syncResult.data.permissionResult);
            result.scheduleResults.push(syncResult.data.scheduleResult);
          } else {
            result.failedCalendars++;
            result.errors.push({
              type: 'CALENDAR_NOT_FOUND',
              message: `日历同步失败: ${calendar.courseName}`,
              calendarId: calendar.calendarId,
              courseSequence: calendar.courseId,
              details: syncResult.error
            });
          }
        } catch (error) {
          result.failedCalendars++;
          result.errors.push({
            type: 'API_ERROR',
            message: `日历同步异常: ${calendar.courseName}`,
            calendarId: calendar.calendarId,
            courseSequence: calendar.courseId,
            details: error
          });
          this.logger.error(
            `Calendar sync error for ${calendar.courseId}:`,
            error
          );
        }
      }

      // 5. 完成同步
      result.duration = Date.now() - startTime;
      result.success = result.failedCalendars === 0;

      progressCallback?.({
        step: 'COMPLETED',
        currentCalendar: calendars.length,
        totalCalendars: calendars.length,
        percentage: 100,
        message: `同步完成: 成功 ${result.successfulCalendars}/${result.totalCalendars}`
      });

      this.logger.info('Calendar synchronization completed', {
        totalCalendars: result.totalCalendars,
        successful: result.successfulCalendars,
        failed: result.failedCalendars,
        duration: result.duration
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error('Calendar synchronization failed:', error);
      return {
        success: false,
        error: {
          code: 'SYNC_FAILED',
          message: '同步过程发生异常',
          details: error
        }
      };
    }
  }

  /**
   * 为单个日历执行同步
   */
  async syncSingleCalendar(
    calendarInfo: CalendarInfo,
    params: CalendarSyncParams
  ): Promise<ServiceResult<{ permissionResult: any; scheduleResult: any }>> {
    try {
      const results = { permissionResult: null, scheduleResult: null };

      // 1. 同步权限（如果启用）
      // if (params.options?.syncPermissions !== false) {
      //   const permissionResult = await this.syncCalendarPermissions(
      //     calendarInfo,
      //     params.selectionBatchId || params.batchId,
      //     params.semester
      //   );
      //   results.permissionResult = permissionResult;
      // }

      // 2. 同步日程（如果启用）
      if (params.options?.syncSchedules !== false) {
        const scheduleResult = await this.syncCalendarSchedules_Single(
          calendarInfo,
          params.courseBatchId || params.batchId,
          params.semester
        );
        results.scheduleResult = scheduleResult;
      }

      return {
        success: true,
        data: results
      };
    } catch (error) {
      this.logger.error(
        `Single calendar sync failed for ${calendarInfo.courseId}:`,
        error
      );
      return {
        success: false,
        error: {
          code: 'SINGLE_CALENDAR_SYNC_FAILED',
          message: `单个日历同步失败: ${calendarInfo.courseName}`,
          details: error
        }
      };
    }
  }

  /**
   * 同步单个日历的权限
   */
  private async syncCalendarPermissions(
    calendarInfo: CalendarInfo,
    batchId: string,
    semester: string
  ): Promise<any> {
    try {
      // 1. 获取权限数据
      const permissionResult = await this.getPermissionData(
        calendarInfo.courseId,
        batchId,
        semester
      );

      if (!permissionResult.success || !permissionResult.data) {
        return {
          calendarId: calendarInfo.calendarId,
          courseSequence: calendarInfo.courseId,
          addedPermissions: 0,
          failedPermissions: 0,
          errors: ['获取权限数据失败']
        };
      }

      const permissions = permissionResult.data;
      const studentIds = permissions.map((p) => p.studentId);

      // 2. 批量添加权限
      const addResult = await this.addCalendarPermissions(
        calendarInfo.wpsCalendarId,
        studentIds
      );

      return {
        calendarId: calendarInfo.calendarId,
        courseSequence: calendarInfo.courseId,
        addedPermissions: addResult.success
          ? addResult.data?.successful || 0
          : 0,
        failedPermissions: addResult.success
          ? addResult.data?.failed || 0
          : studentIds.length,
        errors: addResult.success
          ? addResult.data?.errors || []
          : [addResult.error?.message || '权限添加失败']
      };
    } catch (error) {
      this.logger.error(
        `Permission sync failed for ${calendarInfo.courseId}:`,
        error
      );
      return {
        calendarId: calendarInfo.calendarId,
        courseSequence: calendarInfo.courseId,
        addedPermissions: 0,
        failedPermissions: 0,
        errors: [`权限同步异常: ${error}`]
      };
    }
  }

  /**
   * 同步单个日历的日程
   */
  private async syncCalendarSchedules_Single(
    calendarInfo: CalendarInfo,
    batchId: string,
    semester: string
  ): Promise<any> {
    try {
      // 1. 获取日程数据
      const scheduleResult = await this.getScheduleData(
        calendarInfo.courseId,
        batchId,
        semester
      );

      if (!scheduleResult.success || !scheduleResult.data) {
        return {
          calendarId: calendarInfo.calendarId,
          courseSequence: calendarInfo.courseId,
          createdSchedules: 0,
          failedSchedules: 0,
          errors: ['获取日程数据失败']
        };
      }

      const schedules = scheduleResult.data;

      // 2. 批量创建日程
      const createResult = await this.batchCreateWpsSchedules(
        calendarInfo.wpsCalendarId,
        schedules
      );

      return {
        calendarId: calendarInfo.calendarId,
        courseSequence: calendarInfo.courseId,
        createdSchedules: createResult.success
          ? createResult.data?.successful || 0
          : 0,
        failedSchedules: createResult.success
          ? createResult.data?.failed || 0
          : schedules.length,
        errors: createResult.success
          ? createResult.data?.errors || []
          : [createResult.error?.message || '日程创建失败']
      };
    } catch (error) {
      this.logger.error(
        `Schedule sync failed for ${calendarInfo.courseId}:`,
        error
      );
      return {
        calendarId: calendarInfo.calendarId,
        courseSequence: calendarInfo.courseId,
        createdSchedules: 0,
        failedSchedules: 0,
        errors: [`日程同步异常: ${error}`]
      };
    }
  }

  /**
   * 获取需要同步的日历数据
   */
  async getCalendarsForSync(
    semester: string
  ): Promise<ServiceResult<CalendarInfo[]>> {
    try {
      this.logger.debug(`Fetching calendars , semester ${semester}`);

      // 从calendars表获取所有需要处理的日历数据
      const calendarsResult = await this.calendarRepository.findBySemester({
        xnxq: semester
      });

      if (!calendarsResult.success) {
        return {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: '获取日历数据失败',
            details: 'Failed to fetch calendars'
          }
        };
      }

      const calendars = calendarsResult.data || [];

      // 转换为CalendarInfo格式
      const calendarInfos: CalendarInfo[] = calendars.map((calendar) => ({
        calendarId: calendar.id?.toString() || '',
        wpsCalendarId: calendar.wps_calendar_id,
        courseId: calendar.course_id,
        courseName: calendar.course_name,
        teacherId: calendar.teacher_id,
        teacherName: calendar.teacher_name,
        semester: calendar.semester || ''
      }));

      this.logger.info(`Found ${calendarInfos.length} calendars for sync`);

      return {
        success: true,
        data: calendarInfos
      };
    } catch (error) {
      this.logger.error('Failed to fetch calendars for sync:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_CALENDARS_ERROR',
          message: '获取日历数据异常',
          details: error
        }
      };
    }
  }

  /**
   * 获取指定课程的权限数据（学生ID列表）
   */
  async getPermissionData(
    courseSequence: string,
    batchId: string,
    semester: string
  ): Promise<ServiceResult<PermissionData[]>> {
    try {
      this.logger.debug(
        `Fetching permission data for course ${courseSequence}`
      );

      // 从source_course_selections表获取权限相关的学生ID数据
      const result =
        await this.sourceCourseSelectionsRepository.findPermissionByKXH(
          batchId,
          semester,
          courseSequence
        );

      if (!result.success) {
        throw new Error('Failed to fetch permissions');
      }

      const permissions: PermissionData[] = (result.data || []).map(
        (row: any) => ({
          studentId: row.XSID,
          courseSequence,
          semester,
          batchId
        })
      );

      this.logger.info(
        `Found ${permissions.length} permission records for course ${courseSequence}`
      );

      return {
        success: true,
        data: permissions
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch permission data for course ${courseSequence}:`,
        error
      );
      return {
        success: false,
        error: {
          code: 'FETCH_PERMISSIONS_ERROR',
          message: '获取权限数据失败',
          details: error
        }
      };
    }
  }

  /**
   * 获取指定课程的日程数据
   */
  async getScheduleData(
    courseSequence: string,
    batchId: string,
    semester: string
  ): Promise<ServiceResult<CourseScheduleData[]>> {
    try {
      this.logger.debug(`Fetching schedule data for course ${courseSequence}`);

      // 从source_courses表获取课程日程数据
      const result = await this.sourceCourseRepository.findSchedulesByKXH(
        batchId,
        semester,
        courseSequence
      );

      if (!result.success) {
        throw new Error('Failed to fetch schedules');
      }

      const schedules: CourseScheduleData[] = (result.data || []).map(
        (row: any) => ({
          courseSequence: row.KXH,
          courseName: row.KCMC,
          teacherName: row.JSXM,
          teacherCode: row.JSGH,
          startTime: row.KSSJ,
          endTime: row.JSSJ,
          weekday: row.XQJ,
          weeks: row.DJZ,
          classroom: row.SKJSMC,
          semester: row.KKXQM,
          batchId: row.batch_id
        })
      );

      this.logger.info(
        `Found ${schedules.length} schedule records for course ${courseSequence}`
      );

      return {
        success: true,
        data: schedules
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch schedule data for course ${courseSequence}:`,
        error
      );
      return {
        success: false,
        error: {
          code: 'FETCH_SCHEDULES_ERROR',
          message: '获取日程数据失败',
          details: error
        }
      };
    }
  }

  /**
   * 批量添加日历权限
   * 支持分批处理和用户存在性检查
   */
  async addCalendarPermissions(
    calendarId: string,
    studentIds: string[]
  ): Promise<
    ServiceResult<{ successful: number; failed: number; errors: string[] }>
  > {
    try {
      this.logger.debug(
        `Adding permissions for calendar ${calendarId}, ${studentIds.length} students`
      );

      if (studentIds.length === 0) {
        return {
          success: true,
          data: { successful: 0, failed: 0, errors: [] }
        };
      }

      // 分批处理权限添加
      const batchSize = 100;
      const batches = this.splitIntoBatches(studentIds, batchSize);
      const batchResults: PermissionBatchResult[] = [];

      this.logger.info(
        `Processing ${studentIds.length} permissions in ${batches.length} batches`
      );

      // 逐批处理
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchNumber = i + 1;

        this.logger.debug(`Processing batch ${batchNumber}/${batches.length}`, {
          calendarId,
          batchSize: batch.length
        });

        try {
          const batchResult = await this.addSingleBatchPermissions(
            calendarId,
            batch,
            batchNumber
          );
          batchResults.push(batchResult);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Batch ${batchNumber} failed:`, error);

          batchResults.push({
            batchNumber,
            userCount: batch.length,
            successCount: 0,
            failureCount: batch.length,
            skippedCount: 0,
            success: false,
            error: errorMessage
          });
        }
      }

      // 汇总结果
      const totalSuccessful = batchResults.reduce(
        (sum, batch) => sum + batch.successCount,
        0
      );
      const totalFailed = batchResults.reduce(
        (sum, batch) => sum + batch.failureCount,
        0
      );
      const totalSkipped = batchResults.reduce(
        (sum, batch) => sum + batch.skippedCount,
        0
      );

      const errors = batchResults
        .filter((batch) => batch.error)
        .map((batch) => `Batch ${batch.batchNumber}: ${batch.error}`);

      // 记录不存在的用户ID
      const allNonExistentUserIds = batchResults.flatMap(
        (batch) => batch.nonExistentUserIds || []
      );

      if (allNonExistentUserIds.length > 0) {
        this.logger.warn(
          `Found ${allNonExistentUserIds.length} non-existent user IDs`,
          { nonExistentUserIds: allNonExistentUserIds }
        );
        errors.push(
          `${allNonExistentUserIds.length} users not found in system`
        );
      }

      this.logger.info('Permission batch processing completed', {
        calendarId,
        totalUsers: studentIds.length,
        successful: totalSuccessful,
        failed: totalFailed,
        skipped: totalSkipped,
        batchCount: batches.length
      });

      return {
        success: true,
        data: {
          successful: totalSuccessful,
          failed: totalFailed + totalSkipped, // 将跳过的也算作失败
          errors
        }
      };
    } catch (error) {
      this.logger.error(
        `Failed to add calendar permissions for ${calendarId}:`,
        error
      );
      return {
        success: false,
        error: {
          code: 'ADD_PERMISSIONS_ERROR',
          message: '添加日历权限失败',
          details: error
        }
      };
    }
  }

  /**
   * 创建WPS日程
   */
  async createWpsSchedule(
    scheduleParams: WpsScheduleCreateParams
  ): Promise<ServiceResult<{ eventId: string; success: boolean }>> {
    try {
      this.logger.debug(
        `Creating WPS schedule for calendar ${scheduleParams.calendarId}`
      );

      const result = await this.wasV7ApiSchedule.createSchedule({
        calendar_id: scheduleParams.calendarId,
        summary: scheduleParams.summary,
        description: scheduleParams.description,
        start_time: {
          datetime: scheduleParams.startTime
        },
        end_time: {
          datetime: scheduleParams.endTime
        },
        locations: scheduleParams.location
          ? [{ name: scheduleParams.location }]
          : [],
        recurrence: scheduleParams.recurrence,
        reminders: scheduleParams.reminders
      });

      return {
        success: true,
        data: {
          eventId: result.id,
          success: true
        }
      };
    } catch (error) {
      this.logger.error('Failed to create WPS schedule:', error);
      return {
        success: false,
        error: {
          code: 'CREATE_SCHEDULE_ERROR',
          message: '创建WPS日程失败',
          details: error
        }
      };
    }
  }

  /**
   * 批量创建WPS日程
   */
  async batchCreateWpsSchedules(
    calendarId: string,
    schedules: CourseScheduleData[]
  ): Promise<
    ServiceResult<{ successful: number; failed: number; errors: string[] }>
  > {
    try {
      this.logger.debug(
        `Batch creating ${schedules.length} schedules for calendar ${calendarId}`
      );

      if (schedules.length === 0) {
        return {
          success: true,
          data: { successful: 0, failed: 0, errors: [] }
        };
      }

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // 逐个创建日程（可以考虑使用批量API如果WPS支持）
      for (const schedule of schedules) {
        try {
          const wpsSchedule = this.convertCourseToWpsSchedule(
            schedule,
            calendarId
          );
          const wpsSchedus = await this.wasV7ApiSchedule.getScheduleList({
            calendar_id: calendarId,
            start_time: wpsSchedule.startTime,
            end_time: wpsSchedule.endTime
          });
          if (wpsSchedus.items.length > 0) {
            this.logger.debug(
              `Schedule already exists for ${schedule.courseName}`
            );
            this.wasV7ApiSchedule.deleteSchedule({
              calendar_id: calendarId,
              event_id: wpsSchedus.items[0].id
            });
          }
          const result = await this.createWpsSchedule(wpsSchedule);

          if (result.success && result.data?.eventId) {
            // 日程创建成功，添加教师作为参与者
            try {
              await this.addTeacherAsAttendee(
                calendarId,
                result.data.eventId,
                schedule.teacherCode,
                schedule.teacherName
              );
              this.logger.debug(
                `Added teacher ${schedule.teacherName} (${schedule.teacherCode}) as attendee to schedule ${result.data.eventId}`
              );
            } catch (attendeeError) {
              this.logger.warn(
                `Failed to add teacher as attendee for schedule ${result.data.eventId}:`,
                attendeeError
              );
              // 不影响日程创建的成功状态，只记录警告
            }
            successful++;
          } else {
            failed++;
            errors.push(
              `${schedule.courseName}: ${result.error?.message || '创建失败'}`
            );
          }
        } catch (error) {
          failed++;
          errors.push(`${schedule.courseName}: ${error}`);
        }

        // 添加延迟避免API限制
        await sleep(20);
      }

      this.logger.info(
        `Batch schedule creation result: ${successful} successful, ${failed} failed`
      );

      return {
        success: true,
        data: { successful, failed, errors }
      };
    } catch (error) {
      this.logger.error(
        `Failed to batch create schedules for calendar ${calendarId}:`,
        error
      );
      return {
        success: false,
        error: {
          code: 'BATCH_CREATE_SCHEDULES_ERROR',
          message: '批量创建日程失败',
          details: error
        }
      };
    }
  }

  /**
   * 将课程数据转换为WPS日程格式
   */
  convertCourseToWpsSchedule(
    courseData: CourseScheduleData,
    calendarId: string
  ): WpsScheduleCreateParams {
    // 解析教学周，获取第一个教学周
    const weeks = this.parseWeeksString(courseData.weeks);
    const firstWeek = Math.min(...weeks);

    // 解析开始时间和结束时间（使用第一个教学周的日期）
    const startDateTime = this.parseDateTime(
      courseData.startTime,
      courseData.weekday,
      courseData.semester,
      firstWeek
    );
    const endDateTime = this.parseDateTime(
      courseData.endTime,
      courseData.weekday,
      courseData.semester,
      firstWeek
    );

    // 生成重复规则（使用对象格式）
    const recurrence = this.generateRecurrenceRuleObject(
      parseInt(courseData.weekday),
      weeks,
      startDateTime,
      courseData.semester,
      courseData.endTime, // 传递结束时间用于计算until_date
      courseData.startTime // 传递开始时间用于计算排除日期的具体时间
    );

    return {
      calendarId,
      summary: `${courseData.courseName} - ${courseData.teacherName}`,
      description: `课程：${courseData.courseName}\n教师：${courseData.teacherName}`,
      startTime: format(startDateTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      endTime: format(endDateTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      location: courseData.classroom,
      recurrence,
      reminders: [{ minutes: 15 }]
    };
  }

  /**
   * 解析上课周次字符串
   * 支持多种格式：
   * - 逗号分隔：1,4,7,10,13,16
   * - 范围格式：1-16周
   * - 混合格式：1,3,5-8,10
   */
  parseWeeksString(weeksString: string): number[] {
    const weeks: number[] = [];

    try {
      // 移除"周"字符，统一处理
      const cleanString = weeksString.replace(/周/g, '').trim();

      // 按逗号分割
      const parts = cleanString.split(',');

      for (const part of parts) {
        const trimmedPart = part.trim();

        // 检查是否是范围格式（如 "5-8"）
        const rangeMatch = trimmedPart.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1]);
          const end = parseInt(rangeMatch[2]);
          for (let i = start; i <= end; i++) {
            weeks.push(i);
          }
        } else {
          // 单独的周次
          const weekNumber = parseInt(trimmedPart);
          if (!isNaN(weekNumber) && weekNumber > 0) {
            weeks.push(weekNumber);
          }
        }
      }

      // 去重并排序
      const uniqueWeeks = [...new Set(weeks)].sort((a, b) => a - b);
      return uniqueWeeks;
    } catch (error) {
      this.logger.warn(`Failed to parse weeks string: ${weeksString}`, error);
      return [];
    }
  }

  /**
   * 生成重复规则（对象格式）
   * 根据教学周数据生成WPS API对象格式的重复规则
   */
  generateRecurrenceRuleObject(
    weekday: number,
    weeks: number[],
    startDate: Date,
    semester: string,
    endTime?: string,
    startTime?: string
  ): WpsRecurrenceRule {
    try {
      // 星期几映射：1=周一，2=周二，...，7=周日
      const weekdayMap = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
      const wpsWeekday = weekdayMap[weekday] || 'MO';

      // 计算学期开始日期
      const semesterStartDate = this.calculateSemesterStartDate(semester);

      // 生成排除日期列表（传递开始时间用于设置排除日期的具体时间）
      const excludeDates = this.generateExcludeDates(
        weeks,
        weekday,
        semesterStartDate,
        startTime // 传递开始时间，确保排除日期包含正确的课程开始时间
      );

      // 计算最后一个教学周的日期和结束时间
      const lastWeek = Math.max(...weeks);
      const lastWeekDate = this.calculateWeekDate(
        semesterStartDate,
        lastWeek,
        weekday
      );

      // 解析结束时间并设置到最后一周的日期
      const lastClassEndTime = this.parseTimeToDate(
        lastWeekDate,
        endTime || '23:59'
      );

      const recurrenceRule: WpsRecurrenceRule = {
        freq: 'WEEKLY',
        by_day: [wpsWeekday],
        interval: 1,
        until_date: {
          datetime: format(lastClassEndTime, "yyyy-MM-dd'T'HH:mm:ssXXX")
        }
      };

      // 添加排除日期
      if (excludeDates.length > 0) {
        recurrenceRule.exdate = excludeDates.map((ed) => ({
          datetime: ed.datetime || ed.date + 'T00:00:00+08:00'
        }));
      }

      this.logger.debug('Generated recurrence rule object', {
        weekday,
        weeks,
        lastWeek,
        excludeDatesCount: excludeDates.length,
        rule: recurrenceRule
      });

      return recurrenceRule;
    } catch (error) {
      this.logger.warn('Failed to generate recurrence rule object', error);

      // 降级处理：返回简单的每周重复规则
      const weekdayMap = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
      const wpsWeekday = weekdayMap[weekday] || 'MO';
      const count =
        Array.isArray(weeks) && weeks.length > 0 ? weeks.length : 16;

      return {
        freq: 'WEEKLY',
        by_day: [wpsWeekday],
        interval: 1,
        count
      };
    }
  }

  /**
   * 生成重复规则（字符串数组格式）
   * 根据教学周数据生成RFC 5545格式的重复规则字符串数组
   */
  generateRecurrenceRule(
    weekday: number,
    weeks: number[],
    _startDate: Date,
    semester: string
  ): string[] {
    try {
      // 星期几映射：1=周一，2=周二，...，7=周日
      const weekdayMap = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
      const wpsWeekday = weekdayMap[weekday] || 'MO';

      // 计算学期开始日期
      const semesterStartDate = this.calculateSemesterStartDate(semester);

      // 生成排除日期列表（字符串格式不需要具体时间）
      const excludeDates = this.generateExcludeDates(
        weeks,
        weekday,
        semesterStartDate
        // 不传递开始时间，保持兼容性
      );

      // 计算总的学期周数（通常为16-20周）
      const totalWeeks = Math.max(...weeks, 16); // 至少16周

      // 构建基础的RRULE
      const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${wpsWeekday};INTERVAL=1;COUNT=${totalWeeks}`;

      // 构建EXDATE规则（排除非教学周）
      const exdateRules: string[] = [];
      if (excludeDates.length > 0) {
        // 将排除日期按日期分组，每组最多20个日期
        const dateGroups = this.chunkArray(excludeDates, 20);

        for (const group of dateGroups) {
          const dateStrings = group
            .map((ed: WpsExcludeDate) => ed.date)
            .filter(Boolean);
          if (dateStrings.length > 0) {
            // 格式：EXDATE;VALUE=DATE:20240101,20240108,20240115
            const exdateRule = `EXDATE;VALUE=DATE:${dateStrings.map((d: string | undefined) => d!.replace(/-/g, '')).join(',')}`;
            exdateRules.push(exdateRule);
          }
        }
      }

      // 返回完整的重复规则数组
      const recurrenceRules = [rrule, ...exdateRules];

      this.logger.debug('Generated recurrence rules', {
        weekday,
        weeks,
        totalWeeks,
        excludeDatesCount: excludeDates.length,
        rulesCount: recurrenceRules.length,
        rules: recurrenceRules
      });

      return recurrenceRules;
    } catch (error) {
      this.logger.warn('Failed to generate recurrence rule', error);

      // 降级处理：返回简单的每周重复规则
      try {
        const weekdayMap = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
        const wpsWeekday = weekdayMap[weekday] || 'MO';
        const count =
          Array.isArray(weeks) && weeks.length > 0 ? weeks.length : 16;
        return [`RRULE:FREQ=WEEKLY;BYDAY=${wpsWeekday};COUNT=${count}`];
      } catch (fallbackError) {
        this.logger.error(
          'Failed to generate fallback recurrence rule',
          fallbackError
        );
        return [`RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=16`];
      }
    }
  }

  /**
   * 解析日期时间
   * 根据时间字符串、星期几和学期信息计算具体的日期时间
   */
  private parseDateTime(
    timeString: string,
    weekdayString: string,
    semester?: string,
    weekNumber: number = 1 // 默认第一周
  ): Date {
    try {
      // 解析时间字符串，支持多种格式：
      // 1. "HH:mm" 格式（如：19:40）
      // 2. "HHmm" 格式（如：1940）
      let hours: number, minutes: number;

      if (timeString.includes(':')) {
        // HH:mm 格式
        const parts = timeString.split(':').map(Number);
        hours = parts[0];
        minutes = parts[1];
      } else if (timeString.length === 4 && /^\d{4}$/.test(timeString)) {
        // HHmm 格式（如：1940）
        hours = parseInt(timeString.substring(0, 2));
        minutes = parseInt(timeString.substring(2, 4));
      } else if (timeString.length === 3 && /^\d{3}$/.test(timeString)) {
        // Hmm 格式（如：940 表示 09:40）
        hours = parseInt(timeString.substring(0, 1));
        minutes = parseInt(timeString.substring(1, 3));
      } else {
        throw new Error(`Unsupported time format: ${timeString}`);
      }

      if (
        isNaN(hours) ||
        isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59
      ) {
        throw new Error(
          `Invalid time values: ${timeString} -> ${hours}:${minutes}`
        );
      }

      // 获取学期开始日期
      const semesterStartDate = semester
        ? this.calculateSemesterStartDate(semester)
        : new Date(); // 如果没有学期信息，使用当前日期

      // 计算指定周次的日期
      const weekday = parseInt(weekdayString);
      const classDate = this.calculateWeekDate(
        semesterStartDate,
        weekNumber,
        weekday
      );

      // 设置具体的时间
      const dateTime = new Date(classDate);
      dateTime.setHours(hours, minutes, 0, 0);

      return dateTime;
    } catch (error) {
      this.logger.warn(
        `Failed to parse date time: ${timeString}, weekday: ${weekdayString}`,
        error
      );

      // 降级处理：使用当前日期
      const now = new Date();
      const [hours, minutes] = timeString.split(':').map(Number);
      now.setHours(hours || 0, minutes || 0, 0, 0);
      return now;
    }
  }

  /**
   * 验证同步参数
   */
  validateSyncParams(params: CalendarSyncParams): ServiceResult<boolean> {
    const errors: string[] = [];

    if (!params.batchId) {
      errors.push('批次ID不能为空');
    }

    if (!params.semester) {
      errors.push('学期码不能为空');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_PARAMS',
          message: '参数验证失败',
          details: errors
        }
      };
    }

    return {
      success: true,
      data: true
    };
  }

  /**
   * 测试WPS API连接
   */
  async testWpsApiConnection(): Promise<ServiceResult<boolean>> {
    try {
      // 测试日历API
      await this.wasV7ApiCalendar.getPrimaryCalendar();

      this.logger.info('WPS API connection test successful');
      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('WPS API connection test failed:', error);
      return {
        success: false,
        error: {
          code: 'API_CONNECTION_FAILED',
          message: 'WPS API连接测试失败',
          details: error
        }
      };
    }
  }

  /**
   * 获取同步统计信息
   */
  async getSyncStatistics(
    _batchId: string,
    _semester: string
  ): Promise<
    ServiceResult<{
      totalCalendars: number;
      syncedCalendars: number;
      totalPermissions: number;
      totalSchedules: number;
      lastSyncTime?: Date;
    }>
  > {
    try {
      // 这里可以实现具体的统计逻辑
      // 目前返回基本信息
      return {
        success: true,
        data: {
          totalCalendars: 0,
          syncedCalendars: 0,
          totalPermissions: 0,
          totalSchedules: 0
        }
      };
    } catch (error) {
      this.logger.error('Failed to get sync statistics:', error);
      return {
        success: false,
        error: {
          code: 'GET_STATISTICS_ERROR',
          message: '获取统计信息失败',
          details: error
        }
      };
    }
  }

  /**
   * 清理失败的同步数据
   */
  async cleanupFailedSync(
    _batchId: string,
    _semester: string
  ): Promise<
    ServiceResult<{ cleanedPermissions: number; cleanedSchedules: number }>
  > {
    try {
      // 这里可以实现清理逻辑
      return {
        success: true,
        data: {
          cleanedPermissions: 0,
          cleanedSchedules: 0
        }
      };
    } catch (error) {
      this.logger.error('Failed to cleanup failed sync:', error);
      return {
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: '清理失败数据异常',
          details: error
        }
      };
    }
  }

  /**
   * 处理API错误
   */
  handleApiError(error: any, context: string): ServiceResult<never> {
    this.logger.error(`API error in ${context}:`, error);
    return {
      success: false,
      error: {
        code: 'API_ERROR',
        message: `API调用失败: ${context}`,
        details: error
      }
    };
  }

  /**
   * 处理数据库错误
   */
  handleDatabaseError(error: any, context: string): ServiceResult<never> {
    this.logger.error(`Database error in ${context}:`, error);
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `数据库操作失败: ${context}`,
        details: error
      }
    };
  }

  /**
   * 重试操作
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Operation failed, attempt ${attempt}/${maxRetries}:`,
          error
        );

        if (attempt < maxRetries) {
          await sleep(delayMs * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * 将数组分割成指定大小的批次
   */
  private splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 添加单个批次的权限
   * 包含用户存在性检查和错误处理
   */
  private async addSingleBatchPermissions(
    calendarId: string,
    userIds: string[],
    batchNumber: number
  ): Promise<PermissionBatchResult> {
    try {
      this.logger.debug(`Processing permission batch ${batchNumber}`, {
        calendarId,
        userCount: userIds.length
      });

      // 1. 检查用户是否存在于WPS系统中
      const wpsUsersResponse = await this.wasV7ApiUser.getUsersByExUserIds({
        status: ['active', 'notactive', 'disabled'] as any[],
        ex_user_ids: userIds
      });

      // 2. 提取存在的用户ID
      const existingUserIds =
        wpsUsersResponse.items?.map((user: any) => user.ex_user_id) || [];
      const existingUserIdSet = new Set(existingUserIds);

      // 3. 找出不存在的用户ID
      const nonExistentUserIds = userIds.filter(
        (userId) => !existingUserIdSet.has(userId)
      );

      // 4. 记录不存在的用户ID警告
      if (nonExistentUserIds.length > 0) {
        this.logger.warn(
          `Batch ${batchNumber}: Found ${nonExistentUserIds.length} non-existent user IDs`,
          {
            calendarId,
            batchNumber,
            nonExistentUserIds: nonExistentUserIds.slice(0, 10), // 只记录前10个
            totalNonExistent: nonExistentUserIds.length
          }
        );
      }

      // 5. 只为存在的用户构建权限列表
      const validUserIds = userIds.filter((userId) =>
        existingUserIdSet.has(userId)
      );

      if (validUserIds.length === 0) {
        this.logger.warn(
          `Batch ${batchNumber}: No valid user IDs, skipping permission addition`,
          {
            calendarId,
            batchNumber,
            originalUserCount: userIds.length,
            validUserCount: 0
          }
        );

        return {
          batchNumber,
          userCount: userIds.length,
          successCount: 0,
          failureCount: 0,
          skippedCount: userIds.length,
          success: true, // 虽然没有添加权限，但这不是错误
          nonExistentUserIds
        };
      }

      // 6. 构建权限列表（所有用户都设为reader权限）
      const permissions = validUserIds.map((userId) => ({
        user_id: userId,
        role: 'reader' as const
      }));

      // 7. 调用WPS API批量添加权限
      const response =
        await this.wasV7ApiCalendar.batchCreateCalendarPermissionsLimit({
          calendar_id: calendarId,
          permissions
        });

      const successCount = response.items?.length || 0;
      const failureCount = validUserIds.length - successCount;

      this.logger.debug(`Batch ${batchNumber} completed`, {
        calendarId,
        batchNumber,
        originalUserCount: userIds.length,
        validUserCount: validUserIds.length,
        successCount,
        failureCount,
        skippedCount: nonExistentUserIds.length
      });

      return {
        batchNumber,
        userCount: userIds.length,
        successCount,
        failureCount,
        skippedCount: nonExistentUserIds.length,
        success: true,
        nonExistentUserIds
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Batch ${batchNumber} permission addition failed`, {
        calendarId,
        batchNumber,
        userCount: userIds.length,
        error: errorMessage
      });

      return {
        batchNumber,
        userCount: userIds.length,
        successCount: 0,
        failureCount: userIds.length,
        skippedCount: 0,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 计算学期开始日期
   * 根据学期码计算学期的第一周开始日期
   */
  private calculateSemesterStartDate(semester: string): Date {
    try {
      // 解析学期码，如 "2025-2026-1" 或 "2025-2026-2"
      const match = semester.match(/^(\d{4})-(\d{4})-([12])$/);
      if (!match) {
        throw new Error(`Invalid semester format: ${semester}`);
      }

      const startYear = parseInt(match[1]);
      const semesterNumber = parseInt(match[3]);

      // 根据学期号确定开始月份
      if (semesterNumber === 1) {
        // 第一学期（秋季学期）：通常9月开始
        // 设置为当年9月的第一个周一
        const septemberFirst = new Date(startYear, 8, 1); // 9月1日
        const firstMonday = setDay(septemberFirst, 1, { weekStartsOn: 1 });
        return startOfDay(firstMonday);
      } else {
        // 第二学期（春季学期）：通常次年2月开始
        // 设置为次年2月的第一个周一
        const februaryFirst = new Date(startYear + 1, 1, 1); // 次年2月1日（月份索引1表示2月）
        // setDay 可能会调整到上一周，所以我们需要确保在2月内
        let firstMonday = setDay(februaryFirst, 1, { weekStartsOn: 1 });

        // 如果调整后的日期在1月，则向前调整到2月的第一个周一
        if (firstMonday.getMonth() === 0) {
          firstMonday = setDay(addDays(februaryFirst, 7), 1, {
            weekStartsOn: 1
          });
        }

        return startOfDay(firstMonday);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to calculate semester start date for ${semester}`,
        error
      );
      // 默认返回当前年份9月第一个周一
      const currentYear = new Date().getFullYear();
      const septemberFirst = new Date(currentYear, 8, 1);
      return setDay(septemberFirst, 1, { weekStartsOn: 1 });
    }
  }

  /**
   * 生成排除日期列表
   * 计算非教学周对应的日期，用于WPS API的exdate字段
   * @param teachingWeeks 教学周数组
   * @param weekday 星期几
   * @param semesterStartDate 学期开始日期
   * @param startTime 课程开始时间（KSSJ），用于设置排除日期的具体时间
   */
  private generateExcludeDates(
    teachingWeeks: number[],
    weekday: number,
    semesterStartDate: Date,
    startTime?: string
  ): WpsExcludeDate[] {
    const excludeDates: WpsExcludeDate[] = [];

    try {
      // 计算教学周的范围：从最小周到最大周
      const minWeek = Math.min(...teachingWeeks);
      const maxWeek = Math.max(...teachingWeeks);

      // 创建教学周的Set，便于快速查找
      const teachingWeekSet = new Set(teachingWeeks);

      // 只在教学周范围内遍历，找出缺失的周次
      for (let week = minWeek; week <= maxWeek; week++) {
        if (!teachingWeekSet.has(week)) {
          // 计算该周对应的具体日期
          const weekStartDate = addWeeks(semesterStartDate, week - 1);
          const classDate = setDay(weekStartDate, weekday === 7 ? 0 : weekday, {
            weekStartsOn: 1
          });

          // 如果提供了开始时间，则生成包含具体时间的排除日期
          if (startTime) {
            // 解析开始时间并设置到排除日期
            const excludeDateTime = this.parseTimeToDate(classDate, startTime);
            excludeDates.push({
              datetime: format(excludeDateTime, "yyyy-MM-dd'T'HH:mm:ssXXX")
            });
          } else {
            // 兼容旧版本，只提供日期
            excludeDates.push({
              date: format(classDate, 'yyyy-MM-dd')
            });
          }
        }
      }

      this.logger.debug(
        `Generated ${excludeDates.length} exclude dates for non-teaching weeks`,
        {
          teachingWeeks,
          weekRange: `${minWeek}-${maxWeek}`,
          excludeDatesCount: excludeDates.length
        }
      );
    } catch (error) {
      this.logger.warn('Failed to generate exclude dates', error);
    }

    return excludeDates;
  }

  /**
   * 计算指定周次的具体日期
   */
  private calculateWeekDate(
    semesterStartDate: Date,
    weekNumber: number,
    weekday: number
  ): Date {
    // 计算指定周次的开始日期（学期开始 + (周次-1) * 7天）
    const weekStartDate = addWeeks(semesterStartDate, weekNumber - 1);

    // 设置为指定的星期几
    const targetDate = setDay(weekStartDate, weekday === 7 ? 0 : weekday, {
      weekStartsOn: 1
    });

    return startOfDay(targetDate);
  }

  /**
   * 将时间字符串解析并设置到指定日期
   */
  private parseTimeToDate(baseDate: Date, timeString: string): Date {
    // 解析时间字符串，支持多种格式
    let hours: number, minutes: number;

    if (timeString.includes(':')) {
      // HH:mm 格式
      const parts = timeString.split(':').map(Number);
      hours = parts[0];
      minutes = parts[1];
    } else if (timeString.length === 4 && /^\d{4}$/.test(timeString)) {
      // HHmm 格式
      hours = parseInt(timeString.substring(0, 2));
      minutes = parseInt(timeString.substring(2, 4));
    } else if (timeString.length === 3 && /^\d{3}$/.test(timeString)) {
      // Hmm 格式
      hours = parseInt(timeString.substring(0, 1));
      minutes = parseInt(timeString.substring(1, 3));
    } else {
      // 默认值
      hours = 0;
      minutes = 0;
    }

    // 验证时间有效性
    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      hours = 0;
      minutes = 0;
    }

    // 创建新的日期对象并设置时间
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);

    return result;
  }

  /**
   * 将重复规则对象转换为RFC 5545字符串数组
   */
  private convertRecurrenceObjectToStrings(rule: WpsRecurrenceRule): string[] {
    const rules: string[] = [];

    // 构建基础RRULE
    let rrule = `RRULE:FREQ=${rule.freq}`;

    if (rule.by_day && rule.by_day.length > 0) {
      rrule += `;BYDAY=${rule.by_day.join(',')}`;
    }

    if (rule.interval) {
      rrule += `;INTERVAL=${rule.interval}`;
    }

    if (rule.count) {
      rrule += `;COUNT=${rule.count}`;
    }

    if (rule.until_date?.datetime) {
      // 转换为UTC格式
      const untilDate = new Date(rule.until_date.datetime);
      const utcString = format(untilDate, "yyyyMMdd'T'HHmmss'Z'");
      rrule += `;UNTIL=${utcString}`;
    }

    rules.push(rrule);

    // 添加排除日期
    if (rule.exdate && rule.exdate.length > 0) {
      const exdates = rule.exdate
        .map((ed) => {
          if (ed.datetime) {
            const date = new Date(ed.datetime);
            return format(date, 'yyyyMMdd');
          } else if (ed.date) {
            return ed.date.replace(/-/g, '');
          }
          return null;
        })
        .filter(Boolean);

      if (exdates.length > 0) {
        rules.push(`EXDATE;VALUE=DATE:${exdates.join(',')}`);
      }
    }

    return rules;
  }

  /**
   * 将数组分割成指定大小的块
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 添加教师作为日程参与者
   * @param calendarId 日历ID
   * @param eventId 日程ID
   * @param teacherCode 教师工号，可能是单个工号或多个工号用逗号分隔（如"0154,0326"）
   * @param teacherName 教师姓名
   */
  private async addTeacherAsAttendee(
    calendarId: string,
    eventId: string,
    teacherCode: string,
    teacherName: string
  ): Promise<void> {
    try {
      // 解析教师工号，支持多个工号用逗号分隔
      const teacherCodes = teacherCode
        .split(',')
        .map((code) => code.trim())
        .filter((code) => code.length > 0);

      if (teacherCodes.length === 0) {
        this.logger.warn(`No valid teacher codes found in: ${teacherCode}`);
        return;
      }

      this.logger.debug(
        `Adding ${teacherCodes.length} teacher(s) as attendees to event ${eventId}: ${teacherCodes.join(', ')}`
      );

      // 构建参与者数据，为每个教师工号创建一个参与者
      const attendees = teacherCodes.map((code) => ({
        type: 'user' as const,
        user_id: code // 使用教师工号作为用户ID
      }));

      // 调用批量添加参与者API
      await this.wasV7ApiSchedule.batchCreateAttendees({
        calendar_id: calendarId,
        event_id: eventId,
        attendees
      });

      this.logger.debug(
        `Successfully added ${teacherCodes.length} teacher attendee(s): ${teacherCodes.join(', ')}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to add teacher(s) ${teacherCode} as attendee(s):`,
        error
      );
      throw error;
    }
  }
}
