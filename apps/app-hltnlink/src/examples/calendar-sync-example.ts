// @wps/hltnlink 课表到WPS日程同步服务使用示例
// 演示完整的同步流程

import type { Logger } from '@stratix/core';
import type CalendarSyncService from '../services/CalendarSyncService.js';
import type {
  CalendarSyncParams,
  CalendarSyncResult,
  CourseScheduleData,
  SyncProgress
} from '../types/calendar-sync.js';

/**
 * 课表同步示例类
 * 演示完整的课表到WPS日程同步流程
 */
export class CalendarSyncExample {
  private readonly logger: Logger;
  private readonly calendarSyncService: CalendarSyncService;

  constructor(logger: Logger, calendarSyncService: CalendarSyncService) {
    this.logger = logger;
    this.calendarSyncService = calendarSyncService;
  }

  /**
   * 示例1: 基本同步流程
   */
  async basicSyncExample(): Promise<void> {
    try {
      this.logger.info('=== 基本课表同步示例 ===');

      // 1. 测试WPS API连接
      const connectionTest =
        await this.calendarSyncService.testWpsApiConnection();
      if (!connectionTest.success) {
        this.logger.error('✗ WPS API连接失败');
        return;
      }
      this.logger.info('✓ WPS API连接成功');

      // 2. 设置同步参数
      const syncParams: CalendarSyncParams = {
        batchId: '202509072151', // 日历批次ID
        semester: '2025-2026-1', // 学期码
        courseBatchId: '202509072149', // 课程数据批次ID
        selectionBatchId: '202509072151', // 选课数据批次ID
        forceSync: false,
        options: {
          syncPermissions: true,
          syncSchedules: true,
          batchSize: 50,
          delayMs: 100,
          maxRetries: 3
        }
      };

      // 3. 定义进度回调
      const progressCallback = (progress: SyncProgress) => {
        const percentage = Math.round(progress.percentage);
        this.logger.info(
          `同步进度: ${percentage}% - ${progress.message} (${progress.currentCalendar}/${progress.totalCalendars})`
        );
      };

      // 4. 执行同步
      this.logger.info(`开始同步课表数据...`);
      const startTime = Date.now();

      const result = await this.calendarSyncService.syncCalendarSchedules(
        syncParams,
        progressCallback
      );

      const duration = Date.now() - startTime;

      // 5. 处理结果
      if (result.success && result.data) {
        this.logSyncResult(result.data, duration);
      } else {
        this.logger.error('✗ 同步失败:', result.error);
      }
    } catch (error) {
      this.logger.error('同步过程发生异常:', error);
    }
  }

  /**
   * 示例2: 分步骤同步
   */
  async stepByStepSyncExample(): Promise<void> {
    try {
      this.logger.info('=== 分步骤同步示例 ===');

      const batchId = '202509072151';
      const semester = '2025-2026-1';

      // 1. 获取需要同步的日历
      this.logger.info('步骤1: 获取日历数据...');
      const calendarsResult =
        await this.calendarSyncService.getCalendarsForSync(semester);

      if (!calendarsResult.success || !calendarsResult.data) {
        this.logger.error('获取日历数据失败:', calendarsResult.error);
        return;
      }

      const calendars = calendarsResult.data;
      this.logger.info(`找到 ${calendars.length} 个日历需要同步`);

      // 2. 逐个处理日历
      for (let i = 0; i < calendars.length; i++) {
        const calendar = calendars[i];
        this.logger.info(`步骤${i + 2}: 处理日历 ${calendar.courseName}...`);

        // 2.1 获取权限数据
        const permissionResult =
          await this.calendarSyncService.getPermissionData(
            calendar.courseId,
            batchId,
            semester
          );

        if (permissionResult.success && permissionResult.data) {
          this.logger.info(
            `  - 找到 ${permissionResult.data.length} 个权限记录`
          );
        }

        // 2.2 获取日程数据
        const scheduleResult = await this.calendarSyncService.getScheduleData(
          calendar.courseId,
          batchId,
          semester
        );

        if (scheduleResult.success && scheduleResult.data) {
          this.logger.info(`  - 找到 ${scheduleResult.data.length} 个日程记录`);
        }

        // 限制示例只处理前3个日历
        if (i >= 2) {
          this.logger.info('示例限制，只处理前3个日历');
          break;
        }
      }
    } catch (error) {
      this.logger.error('分步骤同步过程发生异常:', error);
    }
  }

  /**
   * 示例3: 错误处理和重试
   */
  async errorHandlingExample(): Promise<void> {
    try {
      this.logger.info('=== 错误处理和重试示例 ===');

      // 模拟一个可能失败的操作
      const operation = async () => {
        // 这里可以放置可能失败的操作
        throw new Error('模拟API调用失败');
      };

      // 使用重试机制
      try {
        await this.calendarSyncService.retryOperation(operation, 3, 1000);
      } catch (error) {
        this.logger.info('重试3次后仍然失败，这是预期的结果');
      }

      // 演示错误处理
      const apiError = this.calendarSyncService.handleApiError(
        new Error('API调用失败'),
        '测试上下文'
      );
      this.logger.info('API错误处理结果:', apiError);

      const dbError = this.calendarSyncService.handleDatabaseError(
        new Error('数据库连接失败'),
        '测试上下文'
      );
      this.logger.info('数据库错误处理结果:', dbError);
    } catch (error) {
      this.logger.error('错误处理示例发生异常:', error);
    }
  }

  /**
   * 示例4: 数据转换演示
   */
  async dataTransformExample(): Promise<void> {
    try {
      this.logger.info('=== 数据转换示例 ===');

      // 模拟课程数据
      const mockCourseData: CourseScheduleData = {
        courseSequence: 'B20136309.01',
        courseName: '高等数学',
        teacherName: '张教授',
        teacherCode: 'T001', // 添加教师工号
        startTime: '08:00',
        endTime: '09:40',
        weekday: '1',
        weeks: '1-16周',
        classroom: '教学楼A101',
        semester: '2025-2026-1',
        batchId: '202509072149'
      };

      // 转换为WPS日程格式
      const wpsSchedule = this.calendarSyncService.convertCourseToWpsSchedule(
        mockCourseData,
        'test-calendar-id'
      );

      this.logger.info('转换后的WPS日程数据:', {
        summary: wpsSchedule.summary,
        description: wpsSchedule.description,
        location: wpsSchedule.location,
        recurrence: wpsSchedule.recurrence
      });

      // 解析周次字符串
      const weeks = this.calendarSyncService.parseWeeksString('1-16周');
      this.logger.info('解析的周次:', weeks);

      const singleWeeks =
        this.calendarSyncService.parseWeeksString('1,3,5,7周');
      this.logger.info('解析的单独周次:', singleWeeks);
    } catch (error) {
      this.logger.error('数据转换示例发生异常:', error);
    }
  }

  /**
   * 记录同步结果
   */
  private logSyncResult(result: CalendarSyncResult, duration: number): void {
    this.logger.info('=== 同步结果 ===');
    this.logger.info(`✓ 同步完成，耗时: ${duration}ms`);
    this.logger.info(`总日历数: ${result.totalCalendars}`);
    this.logger.info(`成功同步: ${result.successfulCalendars}`);
    this.logger.info(`失败数量: ${result.failedCalendars}`);

    if (result.statistics) {
      this.logger.info('=== 详细统计 ===');
      this.logger.info(`总权限数: ${result.statistics.totalPermissions}`);
      this.logger.info(`成功权限: ${result.statistics.successfulPermissions}`);
      this.logger.info(`总日程数: ${result.statistics.totalSchedules}`);
      this.logger.info(`成功日程: ${result.statistics.successfulSchedules}`);
      this.logger.info(`API调用次数: ${result.statistics.apiCalls}`);
      this.logger.info(`数据库操作次数: ${result.statistics.dbOperations}`);
    }

    if (result.errors.length > 0) {
      this.logger.warn('=== 错误信息 ===');
      result.errors.forEach((error, index) => {
        this.logger.warn(`错误 ${index + 1}: ${error.message}`, {
          type: error.type,
          calendarId: error.calendarId,
          courseSequence: error.courseSequence
        });
      });
    }
  }
}

/**
 * 运行所有示例
 */
export async function runAllExamples(
  logger: Logger,
  calendarSyncService: CalendarSyncService
): Promise<void> {
  const example = new CalendarSyncExample(logger, calendarSyncService);

  await example.basicSyncExample();
  await example.stepByStepSyncExample();
  await example.errorHandlingExample();
  await example.dataTransformExample();
}
