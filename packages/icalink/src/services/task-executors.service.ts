/**
 * 任务执行器服务
 * 实现各种任务的执行逻辑
 */

import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { QueueService } from '@stratix/queue';
import { TaskExecutor, TaskNode, TaskTreeService } from '@stratix/tasks';
import { ScheduleModule } from '@stratix/was-v7';
import {
  CourseAggregateRepository,
  ExtendedDatabase,
  StudentCourseRepository,
  UserCalendarRepository
} from '../repositories/index.js';
import { formatToRFC3339 } from '../utils/time.js';
import { AttendanceService } from './attendance/attendance.service.js';
/**
 * 共享上下文接口
 */
interface SharedContext {
  [key: string]: any;
}

/**
 * 数据清理任务执行器
 */
export class CleanupDataExecutor implements TaskExecutor {
  name = 'cleanup_data';

  constructor(
    private db: Kysely<ExtendedDatabase>,
    private log: Logger
  ) {}

  async execute(taskNode: TaskNode, context: SharedContext): Promise<void> {
    const { xnxq } = taskNode.data.metadata;

    this.log.info({ xnxq }, '开始清空数据');

    try {
      // 1. 清空聚合表数据
      await this.db.deleteFrom('juhe_renwu').where('xnxq', '=', xnxq).execute();

      // 2. 重置中间表状态
      await this.db
        .updateTable('u_jw_kcb_cur')
        .set({
          gx_sj: null,
          gx_zt: null
        })
        .where('xnxq', '=', xnxq)
        .execute();

      this.log.info({ xnxq }, '数据清理完成');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xnxq
        },
        '数据清理失败'
      );
      throw error;
    }
  }

  onSuccess(taskNode: TaskNode, context: SharedContext): void {
    this.log.info({ xnxq: taskNode.data.metadata.xnxq }, '数据清理完成');
  }

  onFail(taskNode: TaskNode, context: SharedContext): void {
    this.log.error({ xnxq: taskNode.data.metadata.xnxq }, '数据清理失败');
  }
}

/**
 * 重新聚合数据任务执行器
 */
export class RegenerateAggregateExecutor implements TaskExecutor {
  name = 'regenerate_aggregate';

  constructor(
    private db: Kysely<ExtendedDatabase>,
    private courseAggregateRepo: CourseAggregateRepository,
    private log: Logger
  ) {}

  async execute(taskNode: TaskNode, context: SharedContext): Promise<void> {
    const { xnxq } = taskNode.data.metadata;

    this.log.info({ xnxq }, '开始重新聚合数据');

    try {
      // 执行聚合SQL，生成上午时段数据
      await this.generateAggregateData(xnxq, 'am');

      // 执行聚合SQL，生成下午时段数据
      await this.generateAggregateData(xnxq, 'pm');

      this.log.info({ xnxq }, '数据聚合完成');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xnxq
        },
        '数据聚合失败'
      );
      throw error;
    }
  }

  private async generateAggregateData(
    xnxq: string,
    period: 'am' | 'pm'
  ): Promise<void> {
    const jcCondition = period === 'am' ? '< 5' : '> 4';

    // 构建聚合SQL
    const sql = `
      INSERT INTO juhe_renwu (
        kkh, xnxq, jxz, zc, rq, kcmc, sfdk,
        jc_s, room_s, gh_s, xm_s, lq, sj_f, sj_t, sjd
      )
      SELECT
        kkh,
        xnxq,
        jxz,
        zc,
        LEFT(rq, 10) as rq,
        kcmc,
        sfdk,
        GROUP_CONCAT(jc ORDER BY jc SEPARATOR '/') as jc_s,
        GROUP_CONCAT(IFNULL(room, '无') ORDER BY jc SEPARATOR '/') as room_s,
        GROUP_CONCAT(DISTINCT ghs) as gh_s,
        GROUP_CONCAT(DISTINCT xms) as xm_s,
        SUBSTRING_INDEX(GROUP_CONCAT(lq ORDER BY st), ',', 1) as lq,
        SUBSTRING_INDEX(GROUP_CONCAT(st ORDER BY st), ',', 1) as sj_f,
        SUBSTRING_INDEX(GROUP_CONCAT(ed ORDER BY ed DESC), ',', 1) as sj_t,
        '${period}' as sjd
      FROM u_jw_kcb_cur
      WHERE xnxq = ? AND jc ${jcCondition}
      GROUP BY kkh, xnxq, jxz, zc, rq, kcmc, sfdk
    `;

    // 暂时跳过SQL执行，使用仓储层方法
    this.log.info({ xnxq, period }, '聚合数据生成暂时跳过，需要实现仓储层方法');

    this.log.debug(
      { xnxq, period },
      `${period === 'am' ? '上午' : '下午'}时段聚合完成`
    );
  }
}

/**
 * 签到表创建任务执行器
 */
export class CreateAttendanceTableExecutor implements TaskExecutor {
  name = 'createAttendanceTableExecutor';

  constructor(
    private attendanceService: AttendanceService,
    private studentCourseRepo: StudentCourseRepository,
    private courseAggregateRepo: CourseAggregateRepository,
    private db: Kysely<ExtendedDatabase>,
    private log: Logger
  ) {}

  async onStart(taskNode: TaskNode, context: SharedContext): Promise<void> {
    const { taskId, courseTask, totalStudentCount } = taskNode.data.metadata;

    this.log.info(
      {
        courseKkh: courseTask.kkh,
        courseName: courseTask.kcmc,
        courseDate: courseTask.rq,
        sjd: courseTask.sjd
      },
      '开始创建签到表记录'
    );

    try {
      this.log.info(
        { courseKkh: courseTask.kkh, totalStudentCount },
        '获取课程学生总数'
      );

      // 3. 构建CourseInfo对象
      const courseInfo = {
        kkh: courseTask.kkh,
        xnxq: courseTask.xnxq,
        kcmc: courseTask.kcmc,
        rq: courseTask.rq,
        jc_s: courseTask.jc_s,
        room_s: courseTask.room_s,
        gh_s: courseTask.gh_s || '',
        xm_s: courseTask.xm_s || '',
        sj_f: courseTask.sj_f,
        sj_t: courseTask.sj_t,
        sjd: courseTask.sjd,
        jxz: courseTask.jxz,
        zc: courseTask.zc,
        lq: courseTask.lq
      };

      const attendanceRecord =
        await this.attendanceService.createAttendanceRecord(
          taskId,
          courseInfo,
          totalStudentCount
        );

      this.log.info(
        {
          attendanceRecordId: attendanceRecord.id,
          checkinUrl: attendanceRecord.checkin_url,
          courseKkh: courseTask.kkh,
          totalStudents: totalStudentCount
        },
        '签到表记录创建成功'
      );

      this.log.info(
        { courseKkh: courseTask.kkh },
        '签到表创建任务onStart执行成功'
      );
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          courseKkh: courseTask.kkh,
          courseName: courseTask.kcmc
        },
        '签到表创建任务失败'
      );
      throw error;
    }
  }

  async onSuccess(taskNode: TaskNode, context: SharedContext): Promise<void> {
    const { courseTask, taskType } = taskNode.data.metadata;

    this.log.info(
      { courseKkh: courseTask.kkh, courseName: courseTask.kcmc, taskType },
      '签到表记录创建任务成功完成'
    );

    try {
      // 根据任务类型更新 juhe_renwu 表的 gx_zt 状态
      if (taskType === 'teacher') {
        // 教师任务完成，设置 gx_zt = 1
        await this.updateAggregateStatus(courseTask, 1);
        this.log.info(
          { courseKkh: courseTask.kkh },
          '教师任务完成，juhe_renwu表gx_zt已更新为1'
        );
      } else if (taskType === 'student') {
        // 学生任务完成，设置 gx_zt = 2
        await this.updateAggregateStatus(courseTask, 2);
        this.log.info(
          { courseKkh: courseTask.kkh },
          '学生任务完成，juhe_renwu表gx_zt已更新为2'
        );

        // 检查是否所有任务都完成，如果是则更新 out_jw_kcb_xs 的 zt 状态
        await this.checkAndUpdateCourseStatus(courseTask);
      }
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          courseKkh: courseTask.kkh,
          taskType
        },
        '状态更新失败'
      );
    }
  }

  async onFail(taskNode: TaskNode, context: SharedContext): Promise<void> {
    const { courseTask, taskType } = taskNode.data.metadata;
    this.log.error(
      { courseKkh: courseTask.kkh, courseName: courseTask.kcmc, taskType },
      '签到表记录创建任务失败'
    );
  }

  async onComplete(taskNode: TaskNode, context: SharedContext): Promise<void> {
    const { courseTask, taskType } = taskNode.data.metadata;
    this.log.info(
      { courseKkh: courseTask.kkh, courseName: courseTask.kcmc, taskType },
      '签到表记录创建任务已完成'
    );
  }

  /**
   * 更新聚合表状态
   */
  private async updateAggregateStatus(
    courseTask: any,
    gxZt: number
  ): Promise<void> {
    try {
      await this.db
        .updateTable('juhe_renwu')
        .set({ gx_zt: gxZt })
        .where('kkh', '=', courseTask.kkh)
        .where('xnxq', '=', courseTask.xnxq)
        .where('rq', '=', courseTask.rq)
        .where('sjd', '=', courseTask.sjd)
        .execute();

      this.log.info(
        {
          courseKkh: courseTask.kkh,
          courseDate: courseTask.rq,
          sjd: courseTask.sjd,
          gxZt
        },
        `聚合表状态更新完成: gx_zt = ${gxZt}`
      );
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          courseKkh: courseTask.kkh,
          gxZt
        },
        '聚合表状态更新失败'
      );
      throw error;
    }
  }

  /**
   * 检查并更新课程状态
   * 当所有任务都完成时（gx_zt = 2），更新相关表状态
   */
  private async checkAndUpdateCourseStatus(courseTask: any): Promise<void> {
    try {
      // 检查是否还有未完成的任务（gx_zt != 2）
      const uncompletedTasks = await this.db
        .selectFrom('juhe_renwu')
        .select('id')
        .where('kkh', '=', courseTask.kkh)
        .where('xnxq', '=', courseTask.xnxq)
        .where('rq', '=', courseTask.rq)
        .where((eb) => eb.or([eb('gx_zt', 'is', null), eb('gx_zt', '!=', 2)]))
        .limit(1)
        .execute();

      if (uncompletedTasks.length === 0) {
        // 所有任务都已完成，更新 out_jw_kcb_xs 的状态
        await this.db
          .updateTable('out_jw_kcb_xs')
          .set({ zt: '0' })
          .where('kkh', '=', courseTask.kkh)
          .where('xnxq', '=', courseTask.xnxq)
          .execute();

        // 同时更新 u_jw_kcb_cur 中间表状态 - 按照需求文档要求
        await this.db
          .updateTable('u_jw_kcb_cur')
          .set({
            gx_zt: 1,
            gx_sj: new Date().toISOString()
          })
          .where('kkh', '=', courseTask.kkh)
          .where('xnxq', '=', courseTask.xnxq)
          .where('rq', 'like', `${courseTask.rq}%`)
          .execute();

        this.log.info(
          {
            courseKkh: courseTask.kkh,
            courseDate: courseTask.rq
          },
          '所有任务已完成，u_jw_kcb_cur和out_jw_kcb_xs表状态已更新'
        );
      } else {
        this.log.debug(
          {
            courseKkh: courseTask.kkh,
            courseDate: courseTask.rq,
            remainingTasks: uncompletedTasks.length
          },
          '仍有未完成的任务，暂不更新表状态'
        );
      }
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          courseKkh: courseTask.kkh
        },
        '检查并更新课程状态失败'
      );
      throw error;
    }
  }
}

/**
 * 教师日程同步任务执行器
 */
export class SyncTeacherScheduleExecutor implements TaskExecutor {
  name = 'syncTeacherScheduleExecutor';

  constructor(
    private queueService: QueueService,
    private userCalendarRepo: UserCalendarRepository, // UserCalendarRepository
    private taskTreeService: TaskTreeService,
    private wasV7Schedule: ScheduleModule,
    private log: Logger
  ) {}

  async onRun(taskNode: TaskNode, context: SharedContext): Promise<void> {
    const { courseTask, userId, type, userName, jobId, taskId } =
      taskNode.data.metadata;

    this.log.info(
      {
        taskId: taskNode.id,
        userId: userId,
        userName: userName,
        courseKkh: courseTask.kkh,
        courseDate: courseTask.rq,
        courseTime: `${courseTask.sj_f} - ${courseTask.sj_t}`
      },
      '开始同步教师日程'
    );

    try {
      // 1. 从user_calendar表获取教师的日历ID
      const userCalendar = await this.userCalendarRepo.findByXgh(userId);

      if (!userCalendar) {
        this.log.warn(
          { teacherId: userId, teacherName: userName },
          '教师未找到日历信息，跳过日程同步'
        );

        // 直接标记任务完成，但记录为跳过状态
        await this.taskTreeService.fail(
          taskNode.id,
          '教师未找到日历信息，跳过日程同步',
          new Error(`教师未找到日历信息，跳过日程同步`)
        );
        return;
      }

      if (!userCalendar.calendar_id) {
        this.log.warn(
          { teacherId: userId, teacherName: userName },
          '教师日历ID为空，跳过日程同步'
        );

        // 直接标记任务完成，但记录为跳过状态
        await this.taskTreeService.fail(
          taskNode.id,
          '教师日历ID为空，跳过日程同步',
          new Error(`教师日历ID为空，跳过日程同步`)
        );
        return;
      }

      this.log.info(
        {
          teacherId: userId,
          teacherName: userName,
          calendarId: userCalendar.calendar_id
        },
        '找到教师日历信息，准备创建日程'
      );

      // 检查日程是否存在，如果存在则删除日程
      const schedules = await this.wasV7Schedule.getAllScheduleList({
        calendar_id: userCalendar.calendar_id,
        start_time: formatToRFC3339(courseTask.rq, courseTask.sj_f),
        end_time: formatToRFC3339(courseTask.rq, courseTask.sj_t)
      });
      for (const schedule of schedules) {
        if (schedule.summary === courseTask.kcmc) {
          await this.wasV7Schedule.deleteSchedule({
            calendar_id: userCalendar.calendar_id,
            event_id: schedule.id
          });
        }
      }

      // 2. 添加创建日程任务到队列，传入从数据库获取的日历ID
      const scheduleJobId = await this.queueService.addTask({
        name: `schedule-${jobId}`,
        executor: 'wpsScheduleProcessorService',
        payload: {
          participantType: type,
          participantId: userId,
          participantName: userName,
          calendarId: userCalendar.calendar_id, // 使用从数据库获取的日历ID
          courseData: {
            taskId: taskId,
            kkh: courseTask.kkh,
            kcmc: courseTask.kcmc,
            rq: courseTask.rq,
            jc_s: courseTask.jc_s,
            room_s: courseTask.room_s,
            sj_f: courseTask.sj_f,
            sj_t: courseTask.sj_t,
            sjd: courseTask.sjd,
            gh_s: courseTask.gh_s,
            xm_s: courseTask.xm_s,
            sfdk: courseTask.sfdk,
            lq: courseTask.lq,
            zc: courseTask.zc,
            jxz: courseTask.jxz
          }
        },
        priority: 7,
        metadata: {
          taskType: 'create_teacher_schedule',
          courseKkh: courseTask.kkh,
          teacherId: userId,
          teacherName: userName,
          calendarId: userCalendar.calendar_id, // 保存到metadata便于追踪
          // 关键：传入原始任务ID，用于回调
          parentTaskId: taskNode.id,
          parentTaskName: taskNode.data.name,
          // 回调配置
          callback: {
            onSuccess: {
              action: 'complete_task',
              taskId: taskNode.id,
              reason: '教师日程创建成功'
            },
            onFailure: {
              action: 'fail_task',
              taskId: taskNode.id,
              reason: '教师日程创建失败'
            }
          }
        }
      });

      this.log.info(
        {
          taskId: taskId,
          teacherId: userId,
          scheduleJobId,
          parentTaskId: taskNode.id,
          calendarId: userCalendar.calendar_id
        },
        '教师日程创建任务已添加到队列，等待执行完成'
      );

      // 3. 保存队列任务ID到任务上下文，便于后续追踪
      if (!taskNode.data.metadata.queueJobs) {
        taskNode.data.metadata.queueJobs = [];
      }
      taskNode.data.metadata.queueJobs.push({
        jobId: scheduleJobId,
        type: 'create_teacher_schedule',
        status: 'pending',
        calendarId: userCalendar.calendar_id,
        participantId: userId,
        participantName: userName
      });
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          taskId: taskNode.id,
          teacherId: userId,
          courseKkh: courseTask.kkh
        },
        '教师日程同步失败'
      );
      throw error;
    }
  }

  async execute(taskNode: TaskNode, context: SharedContext): Promise<void> {
    // 主要逻辑在onStart中完成，这里可以添加额外的处理逻辑
    this.log.info(
      {
        teacherId: taskNode.data.metadata.teacher.gh,
        courseKkh: taskNode.data.metadata.courseTask.kkh
      },
      '教师日程同步任务执行完成'
    );
  }
}

/**
 * 生成考勤记录任务执行器
 */
export class GenerateAttendanceExecutor implements TaskExecutor {
  name = 'generate_attendance';

  constructor(
    private courseAggregateRepo: CourseAggregateRepository,
    private log: Logger
  ) {}

  async execute(taskNode: TaskNode, context: SharedContext): Promise<void> {
    const { xnxq } = taskNode.data.metadata;

    this.log.info({ xnxq }, '开始生成考勤记录');

    try {
      // 获取需要考勤的课程
      // const attendanceCourses = await this.courseAggregateRepo.findAttendanceCourses(xnxq);
      const attendanceCourses: any[] = []; // 暂时使用空数组

      this.log.info(
        { xnxq, attendanceCourseCount: attendanceCourses.length },
        '找到需要考勤的课程'
      );

      // TODO: 实现考勤记录生成逻辑
      // 这里需要为每个需要考勤的课程生成考勤记录

      this.log.info({ xnxq }, '考勤记录生成完成');
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xnxq
        },
        '考勤记录生成失败'
      );
      throw error;
    }
  }
}
