/**
 * 全量同步服务
 * 使用 @stratix/tasks 创建树形任务结构实现全量同步流程
 */

import type { Logger } from '@stratix/core';
import { sleep } from '@stratix/utils/async';
import { ScheduleModule } from '@stratix/was-v7';
import {
  CourseAggregateEntity,
  CourseAggregateRepository,
  StudentCourseRepository,
  StudentInfoRepository,
  UserCalendarRepository
} from '../repositories/index.js';
import { formatToRFC3339 } from '../utils/time.js';
import { StudentInfo, TeacherInfo } from './schedule.service.js';

/**
 * 全量同步配置
 */
export interface FullSyncConfig {
  /** 学年学期 */
  xnxq: string;
  /** 批量处理大小 */
  batchSize?: number;
  /** 是否并行处理 */
  parallel?: boolean;
  /** 最大并发数 */
  maxConcurrency?: number;
}

/**
 * 全量同步统计
 */
export interface FullSyncStatistics {
  /** 任务ID */
  taskId: string;
  /** 学年学期 */
  xnxq: string;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime?: Date;
  /** 总课程数 */
  totalCourses: number;
  /** 教师任务数 */
  teacherTasks: number;
  /** 学生任务数 */
  studentTasks: number;
  /** 已完成任务数 */
  completedTasks: number;
  /** 失败任务数 */
  failedTasks: number;
  /** 同步状态 */
  status: 'running' | 'completed' | 'failed' | 'cancelled';
}

/**
 * 全量同步服务
 */
export class FullSyncService {
  constructor(
    private courseAggregateRepo: CourseAggregateRepository,
    private studentCourseRepo: StudentCourseRepository,
    private studentInfoRepo: StudentInfoRepository,
    private userCalendarRepo: UserCalendarRepository, // UserCalendarRepository
    private wasV7Schedule: ScheduleModule,
    private log: Logger
  ) {}

  /**
   * 启动全量同步任务
   */
  async startFullSync(config: FullSyncConfig): Promise<void> {
    const {
      xnxq,
      batchSize = 50,
      parallel = false,
      maxConcurrency = 5
    } = config;

    this.log.info(
      { xnxq, batchSize, parallel, maxConcurrency },
      '开始启动全量同步任务'
    );
    try {
      // // 创建数据清理任务
      // const cleanupTaskName = `清空数据-${xnxq}`;
      // const cleanupTask = await this.taskTreeService.createTask({
      //   data: {
      //     name: cleanupTaskName,
      //     description: '清空中间表数据并重置状态',
      //     type: 'cleanup_data',
      //     executorName: 'cleanup_data',
      //     priority: 9,
      //     createdAt: new Date(),
      //     updatedAt: new Date(),
      //     metadata: { xnxq }
      //   },
      //   parentId: rootTask.id
      // });

      // // 创建重新聚合任务
      // const aggregateTaskName = `重新聚合-${xnxq}`;
      // const aggregateTask = await this.taskTreeService.createTask({
      //   data: {
      //     name: aggregateTaskName,
      //     description: '重新生成聚合表数据',
      //     type: 'regenerate_aggregate',
      //     executorName: 'regenerate_aggregate',
      //     priority: 8,
      //     createdAt: new Date(),
      //     updatedAt: new Date(),
      //     metadata: { xnxq }
      //   },
      //   parentId: rootTask.id
      // });

      // 获取课程数据并创建同步任务
      this.log.info({ xnxq }, '开始获取待同步的课程数据');
      const aggregateTasks = await this.courseAggregateRepo.findByXnxq(xnxq);
      this.log.info(
        { xnxq, courseCount: aggregateTasks.length },
        '获取到聚合课程数据'
      );

      for (const courseTask of aggregateTasks) {
        const startDate = formatToRFC3339(courseTask.rq, courseTask.sj_f);
        const taskId = Buffer.from(
          `${xnxq}.${courseTask.kkh}.${startDate}`,
          'utf8'
        ).toString('base64');
        // 将taskId转换为base64
        // 1. 获取课程的教师信息
        const teachers = await this.getTeachersForCourse(courseTask);

        // 2. 获取课程的学生信息
        const students = await this.getStudentsForCourse(
          courseTask.kkh,
          courseTask.xnxq
        );

        // 创建教师同步任务
        await this.createTeacherSyncTasks(taskId, teachers, courseTask);
        // 创建学生同步任务
        await this.createStudentSyncTasks(taskId, students, courseTask);
      }
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xnxq
        },
        '全量同步任务创建失败'
      );
      throw error;
    }
  }

  private formatDate(date: string, time: string): string {
    return `${date} ${time}`;
  }

  /**
   * 创建教师日程同步任务
   */
  private async createTeacherSyncTasks(
    taskId: string,
    teachers: TeacherInfo[],
    courseTask: CourseAggregateEntity
  ): Promise<void> {
    // 4. 创建教师组同步任务
    for (const teacher of teachers) {
      const { gh, xm, calendarId } = teacher;

      try {
        // 1. 从user_calendar表获取教师的日历ID
        const userCalendar = await this.userCalendarRepo.findByXgh(gh);

        if (!userCalendar) {
          this.log.warn(
            { teacherId: gh, teacherName: xm },
            '教师未找到日历信息，跳过日程同步'
          );
          return;
        }

        if (!userCalendar.calendar_id) {
          this.log.warn(
            { teacherId: gh, teacherName: xm },
            '教师日历ID为空，跳过日程同步'
          );
          return;
        }
        try {
          // 检查日程是否存在，如果存在则删除日程
          const schedules = await this.wasV7Schedule.getAllScheduleList({
            calendar_id: userCalendar.calendar_id,
            start_time: formatToRFC3339(courseTask.rq, courseTask.sj_f),
            end_time: formatToRFC3339(courseTask.rq, courseTask.sj_t)
          });

          for (let i = 0; i < schedules.length - 1; i += 1) {
            const schedule = schedules[i];
            if (schedule.id && schedule.summary === courseTask.kcmc) {
              await sleep(20);
              try {
                await this.wasV7Schedule.deleteSchedule({
                  calendar_id: userCalendar.calendar_id,
                  event_id: schedule.id
                });
              } catch (error) {
                this.log.error(
                  {
                    error:
                      error instanceof Error ? error.message : String(error),
                    teacherId: gh,
                    teacherName: xm
                  },
                  '删除教师日程失败'
                );
              }
            }
          }
        } catch (error) {
          this.log.error(
            {
              error: error instanceof Error ? error.message : String(error),
              teacherId: gh,
              teacherName: xm
            },
            '删除教师日程失败'
          );
        }
      } catch (error) {
        this.log.error('教师日程同步失败');
        throw error;
      }
    }
  }

  /**
   * 创建学生日程同步任务
   */
  private async createStudentSyncTasks(
    taskId: string,
    students: StudentInfo[],
    courseTask: CourseAggregateEntity
  ): Promise<void> {
    if (students.length === 0) {
      return;
    }

    // 2. 创建学生组同步任务
    for (const student of students) {
      const { xh, xm, calendarId } = student;
      // 1. 从user_calendar表获取教师的日历ID
      const userCalendar = await this.userCalendarRepo.findByXgh(xh);

      if (!userCalendar) {
        this.log.warn(
          { teacherId: xh, teacherName: xm },
          '教师未找到日历信息，跳过日程同步'
        );
        return;
      }

      if (!userCalendar.calendar_id) {
        this.log.warn(
          { teacherId: xh, teacherName: xm },
          '教师日历ID为空，跳过日程同步'
        );
        return;
      }
      const schedules = await this.wasV7Schedule.getAllScheduleList({
        calendar_id: userCalendar.calendar_id,
        start_time: formatToRFC3339(courseTask.rq, courseTask.sj_f),
        end_time: formatToRFC3339(courseTask.rq, courseTask.sj_t)
      });
      if (schedules.length > 1) {
        for (let i = 0; i < schedules.length - 1; i += 1) {
          const schedule = schedules[i];
          if (schedule.id && schedule.summary === courseTask.kcmc) {
            await sleep(20);
            try {
              await this.wasV7Schedule.deleteSchedule({
                calendar_id: userCalendar.calendar_id,
                event_id: schedule.id
              });
            } catch (error) {
              this.log.error(
                {
                  error: error instanceof Error ? error.message : String(error),
                  teacherId: xh,
                  teacherName: xm
                },
                '删除教师日程失败'
              );
            }
          }
        }
      }
    }
  }

  /**
   * 获取课程的教师信息
   */
  private async getTeachersForCourse(courseTask: any): Promise<TeacherInfo[]> {
    if (!courseTask.gh_s || !courseTask.xm_s) {
      return [];
    }

    const teacherIds = courseTask.gh_s.split(',');
    const teacherNames = courseTask.xm_s.split(',');

    const teachers: TeacherInfo[] = [];

    for (let i = 0; i < teacherIds.length; i++) {
      const gh = teacherIds[i]?.trim();
      const xm = teacherNames[i]?.trim();

      if (gh && xm) {
        // TODO: 这里需要根据实际情况获取教师的WPS日历ID
        // 暂时使用工号作为日历ID，实际应该从用户系统获取
        teachers.push({
          gh,
          xm,
          calendarId: `teacher_${gh}` // 临时方案
        });
      }
    }

    return teachers;
  }

  /**
   * 获取课程的学生信息
   */
  private async getStudentsForCourse(
    kkh: string,
    xnxq: string
  ): Promise<StudentInfo[]> {
    try {
      // 从学生课表关联表获取学生列表
      const studentCourses =
        await this.studentCourseRepo.findStudentsByKkhAndXnxq(kkh, xnxq);

      if (studentCourses.length === 0) {
        return [];
      }

      // 获取学生详细信息
      const studentIds = studentCourses.map((sc) => sc.xh);
      const studentInfos = await this.studentInfoRepo.findByXhs(studentIds);

      const students: StudentInfo[] = [];

      for (const studentInfo of studentInfos) {
        if (studentInfo.xh && studentInfo.xm) {
          // TODO: 这里需要根据实际情况获取学生的WPS日历ID
          // 暂时使用学号作为日历ID，实际应该从用户系统获取
          students.push({
            xh: studentInfo.xh,
            xm: studentInfo.xm,
            calendarId: `student_${studentInfo.xh}` // 临时方案
          });
        }
      }

      return students;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          kkh,
          xnxq
        },
        '获取课程学生信息失败'
      );
      return [];
    }
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
