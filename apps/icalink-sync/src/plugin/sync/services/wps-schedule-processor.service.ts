/**
 * WPS日程处理器服务
 * 处理队列中的WPS日程创建任务
 */

import { Logger } from '@stratix/core';
import { TaskTreeService } from '@stratix/tasks';
import { format, parse } from '@stratix/utils/time';
import type { CreateScheduleParams } from '@stratix/was-v7';
import { ScheduleModule } from '@stratix/was-v7';
import { createPageUrlFactory } from './generatePageUrl.js';

/**
 * 队列任务执行结果接口
 */
interface JobExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  message: string;
}

/**
 * 队列任务接口
 */
interface QueueJob {
  id: string;
  payload: any;
  executor_name: string;
  queue_name: string;
  metadata?: any;
}

/**
 * 任务执行器接口
 */
interface JobExecutor {
  readonly name: string;
  execute(job: QueueJob): Promise<JobExecutionResult>;
  validate?(payload: any): boolean | Promise<boolean>;
}

/**
 * WPS日程创建任务数据
 */
export interface WpsScheduleTaskData {
  participantType: 'teacher' | 'student';
  participantId: string;
  participantName: string;
  calendarId: string;
  courseData: {
    taskId: string;
    kkh: string;
    kcmc: string;
    rq: string;
    jc_s: string;
    room_s: string;
    sj_f: string;
    sj_t: string;
    sjd: string;
    gh_s: string;
    xm_s: string;
    sfdk: string;
  };
}

/**
 * WPS日程处理器服务
 * 实现JobExecutor接口，作为队列处理器
 */
export class WpsScheduleProcessorService implements JobExecutor {
  readonly name = 'wpsScheduleProcessorService';

  constructor(
    private wasV7Schedule: ScheduleModule,
    private taskTreeService: TaskTreeService,
    private pageUrlService: ReturnType<typeof createPageUrlFactory>, // 注入TaskTreeService用于任务状态回调
    private log: Logger
  ) {}

  /**
   * 验证任务载荷
   */
  async validate(payload: WpsScheduleTaskData): Promise<boolean> {
    if (!payload) {
      this.log.error('任务载荷不能为空');
      return false;
    }

    if (
      !payload.participantType ||
      !['teacher', 'student'].includes(payload.participantType)
    ) {
      this.log.error(
        { participantType: payload.participantType },
        '无效的参与者类型'
      );
      return false;
    }

    if (!payload.participantId || !payload.participantName) {
      this.log.error('参与者ID和姓名不能为空');
      return false;
    }

    if (!payload.courseData || !payload.courseData.kkh) {
      this.log.error('课程数据和开课号不能为空');
      return false;
    }

    return true;
  }

  /**
   * 执行WPS日程创建任务
   */
  async execute(job: QueueJob): Promise<JobExecutionResult> {
    const startTime = Date.now();
    let parentTaskCallback: any = null;

    try {
      this.log.info(
        {
          jobId: job.id,
          executor: job.executor_name,
          parentTaskId: job.metadata?.parentTaskId
        },
        '开始执行WPS日程创建任务'
      );

      // 1. 验证任务载荷
      if (!(await this.validate(job.payload))) {
        const error = '任务载荷验证失败';
        await this.handleTaskCallback(job.metadata, false, error);
        return {
          success: false,
          error,
          message: error
        };
      }

      const taskData: WpsScheduleTaskData = job.payload;
      parentTaskCallback = job.metadata?.callback;

      // 2. 创建WPS日程
      const scheduleResult = await this.createSchedule(taskData);

      if (!scheduleResult.success) {
        const error = `WPS日程创建失败: ${scheduleResult.error}`;
        await this.handleTaskCallback(job.metadata, false, error);
        return {
          success: false,
          error: scheduleResult.error,
          message: error
        };
      }

      // 3. 任务执行成功，回调原始任务
      await this.handleTaskCallback(job.metadata, true);

      const duration = Date.now() - startTime;
      this.log.info(
        {
          jobId: job.id,
          participantType: taskData.participantType,
          participantId: taskData.participantId,
          courseKkh: taskData.courseData.kkh,
          scheduleId: scheduleResult.data?.scheduleId,
          duration,
          parentTaskId: job.metadata?.parentTaskId
        },
        'WPS日程创建任务执行成功'
      );

      return {
        success: true,
        data: scheduleResult.data,
        message: `${taskData.participantType === 'teacher' ? '教师' : '学生'}日程创建成功`
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // 4. 任务执行失败，回调原始任务
      await this.handleTaskCallback(job.metadata, false, errorMessage);

      const duration = Date.now() - startTime;
      this.log.error(
        {
          jobId: job.id,
          error: errorMessage,
          duration,
          parentTaskId: job.metadata?.parentTaskId
        },
        'WPS日程创建任务执行失败'
      );

      return {
        success: false,
        error: errorMessage,
        message: `WPS日程创建失败: ${errorMessage}`
      };
    }
  }

  /**
   * 创建WPS日程 - 统一入口方法
   */
  private async createSchedule(taskData: WpsScheduleTaskData): Promise<any> {
    return await this.processCreateScheduleTask(taskData);
  }

  /**
   * 处理任务回调 - 更新原始任务状态
   */
  private async handleTaskCallback(
    metadata: any,
    success: boolean,
    error?: string
  ): Promise<void> {
    if (!metadata?.callback || !metadata?.parentTaskId) {
      this.log.debug('无回调配置或父任务ID，跳过任务状态更新');
      return;
    }

    try {
      const callback = success
        ? metadata.callback.onSuccess
        : metadata.callback.onFailure;
      if (!callback) {
        this.log.debug({ success }, '无对应状态的回调配置');
        return;
      }

      const { action, taskId, reason } = callback;

      switch (action) {
        case 'complete_task':
          await this.taskTreeService.success(
            taskId,
            reason || '队列任务执行成功',
            { queueJobSuccess: true }
          );
          this.log.info(
            { parentTaskId: taskId, reason },
            '原始任务已标记为完成'
          );
          break;

        case 'fail_task':
          await this.taskTreeService.fail(
            taskId,
            reason || error || '队列任务执行失败',
            error ? new Error(error) : undefined
          );
          this.log.info(
            { parentTaskId: taskId, reason, error },
            '原始任务已标记为失败'
          );
          break;

        default:
          this.log.warn({ action }, '未知的回调动作类型');
      }
    } catch (callbackError) {
      this.log.error(
        {
          parentTaskId: metadata?.parentTaskId,
          callbackError:
            callbackError instanceof Error
              ? callbackError.message
              : String(callbackError)
        },
        '任务回调执行失败'
      );
    }
  }

  /**
   * 处理WPS日程创建任务
   */
  async processCreateScheduleTask(taskData: WpsScheduleTaskData): Promise<any> {
    const {
      participantType,
      participantId,
      participantName,
      calendarId,
      courseData
    } = taskData;

    this.log.info(
      {
        participantType,
        participantId,
        participantName,
        courseKkh: courseData.kkh,
        courseName: courseData.kcmc,
        courseDate: courseData.rq,
        courseTime: `${courseData.sj_f} - ${courseData.sj_t}`
      },
      '开始处理WPS日程创建任务'
    );

    try {
      // 构建WPS日程创建参数
      const scheduleParams: CreateScheduleParams = {
        calendar_id: '126238802',
        summary: courseData.kcmc,
        description: this.buildScheduleDescription(courseData, participantType),
        start_time: {
          datetime: this.formatDateTime(courseData.rq, courseData.sj_f)
        },
        end_time: {
          datetime: this.formatDateTime(courseData.rq, courseData.sj_t)
        },
        reminders: [{ minutes: 15 }], // 提前15分钟提醒
        status: 'confirmed',
        visibility: 'default'
      };

      this.log.debug(
        {
          participantId,
          scheduleParams
        },
        'WPS日程创建参数'
      );

      // 调用WPS API创建日程
      const scheduleResult =
        await this.wasV7Schedule.createSchedule(scheduleParams);

      this.log.info(
        {
          participantType,
          participantId,
          participantName,
          scheduleId: scheduleResult.id,
          calendarId: scheduleResult.calendar_id,
          courseKkh: courseData.kkh
        },
        'WPS日程创建成功'
      );

      return {
        success: true,
        message: `${participantType === 'teacher' ? '教师' : '学生'} ${participantName} 日程创建成功`,
        data: {
          scheduleId: scheduleResult.id,
          calendarId: scheduleResult.calendar_id,
          participantId,
          participantName,
          participantType,
          courseData: {
            kkh: courseData.kkh,
            kcmc: courseData.kcmc,
            rq: courseData.rq,
            sjd: courseData.sjd
          },
          wpsScheduleInfo: {
            event_id: scheduleResult.id,
            summary: scheduleResult.summary,
            start_time: scheduleResult.start_time,
            end_time: scheduleResult.end_time,
            create_time: scheduleResult.create_time
          }
        }
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          participantType,
          participantId,
          participantName,
          courseKkh: courseData.kkh
        },
        'WPS日程创建失败'
      );

      return {
        success: false,
        message: `${participantType === 'teacher' ? '教师' : '学生'} ${participantName} 日程创建失败`,
        error: error instanceof Error ? error.message : String(error),
        data: {
          participantId,
          participantName,
          participantType,
          courseData: {
            kkh: courseData.kkh,
            kcmc: courseData.kcmc,
            rq: courseData.rq,
            sjd: courseData.sjd
          }
        }
      };
    }
  }

  /**
   * 构建日程描述
   */
  private buildScheduleDescription(
    courseData: any,
    participantType: string
  ): string {
    const lines = [
      `教学周: ${courseData.jxz}`,
      `时间: ${courseData.rq} ${courseData.jc_s}节`,
      `地点: ${courseData.lq}${courseData.room_s}`
    ];

    if (participantType === 'student' && courseData.xm_s) {
      lines.push(`授课教师: ${courseData.xm_s}`);
    }
    if (
      participantType === 'student' &&
      !this.pageUrlService.isCheckInUrl(courseData.sfdk)
    ) {
      lines.push(
        `签到地址: ${this.pageUrlService.getuAttendanceUrl(courseData.taskId)}`
      );
    }
    if (participantType === 'teacher') {
      lines.push(
        `签到信息: ${this.pageUrlService.getTeacherQueueUrl(courseData.taskId)}`
      );
    }

    return lines.join('\n');
  }

  /**
   * 格式化日期时间为RFC3339格式（上海时区）
   * 使用@stratix/utils中的date-fns方法严格输出RFC3339格式
   * 输入格式：rq: "2025/03/18", sj_f: "09:50:00.000"
   * 输出格式：RFC3339 (如 "2025-03-18T09:50:00+08:00")
   */
  private formatDateTime(date: string, time: string): string {
    try {
      this.log.debug(
        { inputDate: date, inputTime: time },
        '开始格式化日期时间为RFC3339格式'
      );

      // 1. 标准化日期格式：从 "2025/03/18" 转换为 "2025-03-18"
      let normalizedDate = date;
      if (date.includes('/')) {
        normalizedDate = date.replace(/\//g, '-');
      }

      // 2. 标准化时间格式：移除毫秒部分 "09:50:00.000" -> "09:50:00"
      let normalizedTime = time;
      if (time.includes('.')) {
        normalizedTime = time.split('.')[0];
      }

      // 3. 解析时间组件
      const timeParts = normalizedTime.split(':');
      const hours = parseInt(timeParts[0] || '0', 10);
      const minutes = parseInt(timeParts[1] || '0', 10);
      const seconds = parseInt(timeParts[2] || '0', 10);

      // 4. 构建完整的日期时间字符串 (ISO格式但不带时区)
      const dateTimeString = `${normalizedDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // 5. 解析为Date对象（本地时间）
      const dateTime = parse(
        dateTimeString,
        "yyyy-MM-dd'T'HH:mm:ss",
        new Date()
      );

      // 6. 验证解析结果
      if (!dateTime || isNaN(dateTime.getTime())) {
        throw new Error(`解析日期时间失败: ${dateTimeString}`);
      }

      // 7. 使用date-fns的format函数输出RFC3339格式
      // 注意：由于输入时间是上海时间，我们需要手动添加+08:00时区偏移
      const formattedDateTime = format(dateTime, "yyyy-MM-dd'T'HH:mm:ss");
      const rfc3339DateTime = `${formattedDateTime}+08:00`;

      this.log.debug(
        {
          input: { date, time },
          normalized: { date: normalizedDate, time: normalizedTime },
          parsed: dateTime.toISOString(),
          output: rfc3339DateTime
        },
        '日期时间格式化完成'
      );

      return rfc3339DateTime;
    } catch (error) {
      this.log.error(
        {
          inputDate: date,
          inputTime: time,
          error: error instanceof Error ? error.message : String(error)
        },
        '格式化日期时间失败'
      );

      // 降级处理：使用简单的字符串拼接
      const fallbackDate = date.replace(/\//g, '-');
      const fallbackTime = time.includes('.') ? time.split('.')[0] : time;
      return `${fallbackDate}T${fallbackTime}+08:00`;
    }
  }

  /**
   * 删除WPS日程
   */
  async processDeleteScheduleTask(taskData: {
    calendarId: string;
    eventId: string;
    participantId: string;
    participantName: string;
    participantType: string;
    courseData: any;
  }): Promise<any> {
    const {
      calendarId,
      eventId,
      participantId,
      participantName,
      participantType,
      courseData
    } = taskData;

    this.log.info(
      {
        participantType,
        participantId,
        participantName,
        eventId,
        calendarId,
        courseKkh: courseData.kkh
      },
      '开始处理WPS日程删除任务'
    );

    try {
      // 调用WPS API删除日程
      await this.wasV7Schedule.deleteSchedule({
        calendar_id: calendarId,
        event_id: eventId
      });

      this.log.info(
        {
          participantType,
          participantId,
          participantName,
          eventId,
          calendarId,
          courseKkh: courseData.kkh
        },
        'WPS日程删除成功'
      );

      return {
        success: true,
        message: `${participantType === 'teacher' ? '教师' : '学生'} ${participantName} 日程删除成功`,
        data: {
          eventId,
          calendarId,
          participantId,
          participantName,
          participantType,
          courseData
        }
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          participantType,
          participantId,
          participantName,
          eventId,
          calendarId,
          courseKkh: courseData.kkh
        },
        'WPS日程删除失败'
      );

      return {
        success: false,
        message: `${participantType === 'teacher' ? '教师' : '学生'} ${participantName} 日程删除失败`,
        error: error instanceof Error ? error.message : String(error),
        data: {
          eventId,
          calendarId,
          participantId,
          participantName,
          participantType,
          courseData
        }
      };
    }
  }
}
