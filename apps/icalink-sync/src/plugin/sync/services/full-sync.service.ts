/**
 * 全量同步服务
 * 使用 @stratix/tasks 创建树形任务结构实现全量同步流程
 */

import type { Logger } from '@stratix/core';
import {
  type ITaskTreeService,
  TaskNode,
  type TaskNodePlaceholder,
  TaskStatus
} from '@stratix/tasks';
import { sleep } from '@stratix/utils/async';
import { ScheduleModule } from '@stratix/was-v7';
import {
  CourseAggregateEntity,
  CourseAggregateRepository,
  CourseScheduleRepository,
  StudentCourseRepository,
  StudentInfoRepository,
  UserCalendarRepository
} from '../repositories/index.js';
import {
  CreateAttendanceTableExecutor,
  SyncTeacherScheduleExecutor
} from '../service/task-executors.service.js';
import { formatToRFC3339 } from '../utils/time.js';
import { AttendanceService } from './attendance/attendance.service.js';
import { createPageUrlFactory } from './generatePageUrl.js';
import { StudentInfo, TeacherInfo } from './schedule.service.js';
import { UpdateAggregateService } from './update-aggregate.service.js';
import { WpsScheduleProcessorService } from './wps-schedule-processor.service.js';

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
    private taskTreeService: ITaskTreeService,
    private courseAggregateRepo: CourseAggregateRepository,
    private studentCourseRepo: StudentCourseRepository,
    private studentInfoRepo: StudentInfoRepository,
    private pageUrlService: ReturnType<typeof createPageUrlFactory>,
    private log: Logger,
    private syncTeacherScheduleExecutor: SyncTeacherScheduleExecutor,
    private wasV7Schedule: ScheduleModule,
    private createAttendanceTableExecutor: CreateAttendanceTableExecutor,
    private courseScheduleRepo: CourseScheduleRepository,
    private userCalendarRepo: UserCalendarRepository,
    private attendanceService: AttendanceService,
    private updateAggregateService: UpdateAggregateService,
    private wpsScheduleProcessorService: WpsScheduleProcessorService
  ) {}

  /**
   * 查找已存在的任务
   */
  private findExistingTask(
    name: string
  ): TaskNode | TaskNodePlaceholder | null {
    try {
      // 使用 getTaskByname 方法根据名称查找任务
      return this.taskTreeService.getTaskByname(name);
    } catch (error) {
      this.log.warn(
        {
          name,
          error: error instanceof Error ? error.message : String(error)
        },
        '查找已存在任务时出错，将创建新任务'
      );
      return null;
    }
  }

  /**
   * 检查任务是否有子任务
   */
  private async hasChildTasks(taskId: string): Promise<boolean> {
    try {
      const task = this.taskTreeService.getTask(taskId);
      if (task && 'children' in task) {
        return task.children && task.children.length > 0;
      }
      return false;
    } catch (error) {
      this.log.warn(
        {
          taskId,
          error: error instanceof Error ? error.message : String(error)
        },
        '检查子任务时出错'
      );
      return false;
    }
  }

  async incremSyncc(config: FullSyncConfig): Promise<void> {
    const {
      xnxq,
      batchSize = 50,
      parallel = false,
      maxConcurrency = 5
    } = config;

    // 增量同步前，先查询u_jw_kcb_cur表中gx_zt为null的记录
    const courseSchedules = await this.courseScheduleRepo.findByConditions({
      xnxq,
      gxZt: null,
      beginDate: '2025/06/23'
    });
    // 2. 根据为空的记录，查询juhe_renwu表中记录，通过kkh和rq查询，如果查询到，则将gx_zt设置为3。注意需要将rq字段从“2025/03/12 00:00:00.000” 转为“2025/03/12”

    // 创建重新聚合任务,并更新juhe_renwu表，将聚合的数据新增到juhe_renwu表中
    await this.courseScheduleRepo.generateAggregateData(xnxq, {
      gxZtIsNull: true,
      dateRange: {
        startDate: '2025/06/23',
        endDate: '2025/07/16'
      }
    });

    // 从聚合表里获取为null的数据
    const aggregateTasks = await this.courseAggregateRepo.findByConditions({
      gxZt: null,
      beginDate: '2025/06/23',
      kcmc: '习近平新时代中国特色社会主义思想概论'
    });

    for (const juheRenwu of aggregateTasks) {
      await this.updateAggregateService.updateRelatedCourseSchedules(
        [juheRenwu],
        3
      );
      // 修改juhe_renwu表的gx_zt为4
      await this.courseAggregateRepo.updateStatus(Number(juheRenwu.id), 3);

      // 获取关联的教师数据
      const teachers = await this.getTeachersForCourse(juheRenwu);
      // 获取关联的学生数据
      const students = await this.getStudentsForCourse(
        juheRenwu.kkh,
        juheRenwu.xnxq
      );
      //将教师的日程信息删除
      for (const teacher of teachers) {
        // 3. 从日历中删除日程
        try {
          // 获取教师的日历id
          const userCalendar = await this.userCalendarRepo.findByXgh(
            teacher.gh
          );
          if (!userCalendar) {
            this.log.warn(
              { teacherId: teacher.gh, teacherName: teacher.xm },
              '教师未找到日历信息，跳过日程同步'
            );
            continue;
          }
          // 检查日程是否存在，如果存在则删除日程
          const schedules = await this.wasV7Schedule.getAllScheduleList({
            calendar_id: userCalendar.calendar_id!,
            start_time: formatToRFC3339(juheRenwu.rq, juheRenwu.sj_f),
            end_time: formatToRFC3339(juheRenwu.rq, juheRenwu.sj_t)
          });
          // 删除所有的日程
          for (const schedule of schedules) {
            await sleep(50);
            if (schedule.summary === juheRenwu.kcmc) {
              await this.wasV7Schedule.deleteSchedule({
                calendar_id: userCalendar.calendar_id!,
                event_id: schedule.id!
              });
            }
          }
        } catch (error) {
          this.log.error(
            { error: error instanceof Error ? error.message : String(error) },
            '删除日程失败'
          );
        }
      }
      // 删除学生的日程
      for (const student of students) {
        // 获取学生的日历id
        const userCalendar = await this.userCalendarRepo.findByXgh(student.xh);
        if (!userCalendar) {
          this.log.warn(
            { studentId: student.xh, studentName: student.xm },
            '学生未找到日历信息，跳过日程同步'
          );
          continue;
        }
        if (!userCalendar.calendar_id) {
          this.log.warn(
            { studentId: student.xh, studentName: student.xm },
            '学生日历ID为空，跳过日程同步'
          );
          continue;
        }
        // 删除学生的日程
        const schedules = await this.wasV7Schedule.getAllScheduleList({
          calendar_id: userCalendar.calendar_id!,
          start_time: formatToRFC3339(juheRenwu.rq, juheRenwu.sj_f),
          end_time: formatToRFC3339(juheRenwu.rq, juheRenwu.sj_t)
        });
        // 删除所有的日程
        for (const schedule of schedules) {
          await sleep(50);
          if (schedule.summary === juheRenwu.kcmc) {
            await this.wasV7Schedule.deleteSchedule({
              calendar_id: userCalendar.calendar_id!,
              event_id: schedule.id!
            });
          }
        }
      }
      // 修改juhe_renwu表的gx_zt为4
      await this.courseAggregateRepo.updateStatus(Number(juheRenwu.id), 4);
      await this.updateAggregateService.updateRelatedCourseSchedules(
        [juheRenwu],
        4
      );
    }
  }

  async incremSyncc2(config: FullSyncConfig): Promise<void> {
    const {
      xnxq,
      batchSize = 50,
      parallel = false,
      maxConcurrency = 5
    } = config;
    await this.courseScheduleRepo.generateAggregateData(xnxq, {
      gxZtFilter: '4',
      zt: true,
      dateRange: {
        startDate: '2025/06/2',
        endDate: '2025/07/16'
      }
    });
  }
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
      // 1. 检查根任务是否已存在
      const rootTaskName = `全量同步任务-${xnxq}`;
      let rootTask = this.findExistingTask(rootTaskName);

      // 2. 创建新的根任务（如果不存在或无法恢复）
      if (!rootTask) {
        rootTask = await this.taskTreeService.createTask({
          data: {
            name: rootTaskName,
            description: `学期 ${xnxq} 的全量同步任务`,
            type: 'full_sync_root',
            priority: 10,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: { xnxq }
          }
        });
        this.log.info({ taskId: rootTask.id }, '创建新的根任务成功');
        await rootTask.start('全量同步任务启动');
      }

      this.log.info('开始创建子任务');

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
        if (!courseTask.sj_f) {
          continue;
        }
        const startDate = formatToRFC3339(courseTask.rq, courseTask.sj_f);
        const taskId = Buffer.from(
          `${xnxq}.${courseTask.kkh}.${startDate}`,
          'utf8'
        ).toString('base64');

        // // 将taskId转换为base64
        // // 1. 获取课程的教师信息
        // const teachers = await this.getTeachersForCourse(courseTask);

        // 2. 获取课程的学生信息
        const students = await this.getStudentsForCourse(
          courseTask.kkh,
          courseTask.xnxq
        );
        if (!this.pageUrlService.isCheckInUrl(courseTask.sfdk)) {
          // 创建签到表任务
          await this.createAttendanceTableTask(
            taskId,
            rootTask.id,
            students.length,
            courseTask
          );
        }

        await this.wpsScheduleProcessorService.processCreateScheduleTask({
          participantType: 'student',
          participantId: '126238802',
          participantName: '孙永锐',
          calendarId: '126238802',
          courseData: {
            taskId: taskId,
            kkh: courseTask.kkh,
            kcmc: courseTask.kcmc,
            rq: courseTask.rq,
            jc_s: courseTask.jc_s, // 1,2,3,4,5
            room_s: courseTask.room_s,
            sj_f: courseTask.sj_f,
            sj_t: courseTask.sj_t,
            sjd: courseTask.sjd,
            gh_s: courseTask.gh_s!,
            xm_s: courseTask.xm_s!,
            sfdk: courseTask.sfdk!
          }
        });

        // 创建教师同步任务
        await this.createTeacherSyncTasks(
          xnxq,
          rootTask.id,
          taskId,
          teachers,
          courseTask
        );
        // 创建学生同步任务
        await this.createStudentSyncTasks(
          xnxq,
          rootTask.id,
          taskId,
          students,
          courseTask
        );
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
   * 创建签到表任务
   */
  private async createAttendanceTableTask(
    taskId: string,
    parentTaskId: string,
    studentCount: number,
    courseTask: CourseAggregateEntity
  ): Promise<void> {
    // 创建签到任务
    const attendanceTaskName = `${courseTask.kcmc}:${taskId}`;
    let attendanceTask = this.findExistingTask(attendanceTaskName);
    if (!attendanceTask) {
      attendanceTask = await this.taskTreeService.createTask({
        id: taskId,
        parentId: parentTaskId,
        data: {
          name: attendanceTaskName,
          description: `为课程 ${courseTask.kcmc} 创建签到表记录 (${courseTask.rq} ${courseTask.sjd})`,
          type: 'create_attendance_table',
          priority: 8, // 比教师日程任务优先级高，确保先执行
          metadata: {
            taskId,
            courseTask,
            totalStudentCount: studentCount
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      await attendanceTask.start('签到表记录创建任务启动');
    } else {
      this.log.info(
        { attendanceTaskName },
        '签到表记录任务已经完成，不需要在创建'
      );
    }
    if (
      attendanceTask instanceof TaskNode &&
      attendanceTask.status === TaskStatus.PENDING
    ) {
      attendanceTask.start('签到表记录创建任务启动');
    }
    setTimeout(() => {
      this.createAttendanceTableExecutor.onStart(
        attendanceTask as TaskNode,
        {}
      );
    }, 1000 * 60);
  }

  /**
   * 创建教师日程同步任务
   */
  private async createTeacherSyncTasks(
    xnxq: string,
    parentTaskId: string,
    taskId: string,
    teachers: TeacherInfo[],
    courseTask: CourseAggregateEntity
  ): Promise<void> {
    // 1. 创建教师组同步任务
    const teacherGroupTaskName = `教师课程同步.${xnxq}.${taskId}`;
    let teacherGroupTask = this.findExistingTask(teacherGroupTaskName);
    if (!teacherGroupTask) {
      // 添加执行器，任务完成后，将任务状态设置教师为完成
      teacherGroupTask = await this.taskTreeService.createTask({
        data: {
          name: teacherGroupTaskName,
          description: '教师日程同步任务组',
          type: 'teacher_sync_group',
          executorName: 'updateAggregateService',
          priority: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            xnxq,
            taskType: 'teacher_group',
            courseTask,
            action: 'updateTeacherCompleted'
          }
        },
        parentId: parentTaskId
      });
      await teacherGroupTask.start('教师日程同步任务启动');
    } else if (!(teacherGroupTask instanceof TaskNode)) {
      this.log.info({ xnxq }, '教师同步任务任务已经完成，不需要在创建');
      return;
    }
    // 4. 创建教师组同步任务
    for (const teacher of teachers) {
      // 1. 拼接教师创建日程任务名称
      const teacherJobId = `${xnxq}.${taskId}.${teacher.gh}`;
      const attendanceTaskName = `${courseTask.kcmc}.${teacherJobId}`;
      let attendanceTask = this.findExistingTask(attendanceTaskName);
      if (!attendanceTask) {
        attendanceTask = await this.taskTreeService.createTask({
          data: {
            name: attendanceTaskName,
            description: `为教师 ${teacher.xm} 创建日程 (${courseTask.rq} ${courseTask.sjd})`,
            type: 'sync_teacher_schedule',
            priority: 6,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              xnxq,
              taskType: 'teacher_group',
              courseTask,
              jobId: teacherJobId,
              taskId,
              userId: teacher.gh,
              userName: teacher.xm,
              type: 'teacher'
            }
          },
          parentId: teacherGroupTask.id
        });
        await attendanceTask.start('教师日程同步任务启动');
      } else if (!(attendanceTask instanceof TaskNode)) {
        this.log.info({ xnxq }, '教师同步任务任务已经完成，不需要在创建');
        continue;
      }
      await this.syncTeacherScheduleExecutor.onStart(attendanceTask, {});
    }
  }

  /**
   * 创建学生日程同步任务
   */
  private async createStudentSyncTasks(
    xnxq: string,
    parentTaskId: string,
    taskId: string,
    students: StudentInfo[],
    courseTask: CourseAggregateEntity
  ): Promise<void> {
    if (students.length === 0) {
      return;
    }
    // 1. 创学生组同步任务
    const studentGroupTaskName = `学生课程同步.${xnxq}.${taskId}`;
    let studentGroupTask = this.findExistingTask(studentGroupTaskName);
    if (!studentGroupTask) {
      studentGroupTask = await this.taskTreeService.createTask({
        data: {
          name: studentGroupTaskName,
          description: '学生日程同步任务组',
          type: 'student_sync_group',
          executorName: 'updateAggregateService',
          priority: 6,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            xnxq,
            taskType: 'student_group',
            courseTask,
            action: 'updateStudentCompleted'
          }
        },
        parentId: parentTaskId
      });
      await studentGroupTask.start('学生日程同步任务启动');
    } else if (!(studentGroupTask instanceof TaskNode)) {
      this.log.info({ xnxq }, '教师同步任务任务已经完成，不需要在创建');
      return;
    }

    // 2. 创建学生组同步任务
    for (const student of students) {
      // 1. 拼接学生创建日程任务名称
      const studentJobId = `${xnxq}.${taskId}.${student.xh}`;
      const attendanceTaskName = `${courseTask.kcmc}.${studentJobId}`;
      let attendanceTask = this.findExistingTask(attendanceTaskName);
      if (!attendanceTask) {
        attendanceTask = await this.taskTreeService.createTask({
          data: {
            name: attendanceTaskName,
            description: `为学生 ${student.xm} 创建日程 (${courseTask.rq} ${courseTask.sjd})`,
            type: 'sync_student_schedule',
            priority: 6,
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              xnxq,
              taskType: 'student_group',
              courseTask,
              jobId: studentJobId,
              taskId,
              userId: student.xh,
              userName: student.xm,
              type: 'student'
            }
          },
          parentId: studentGroupTask.id
        });
        await attendanceTask.start('学生日程同步任务启动');
      } else if (!(attendanceTask instanceof TaskNode)) {
        this.log.info({ xnxq }, '学生同步任务任务已经完成，不需要在创建');
        continue;
      }
      await this.syncTeacherScheduleExecutor.onStart(attendanceTask, {});
    }
  }

  /**
   * 获取课程的教师信息
   */
  public async getTeachersForCourse(courseTask: any): Promise<TeacherInfo[]> {
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
  public async getStudentsForCourse(
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
   * 获取全量同步状态
   */
  async getFullSyncStatus(taskId: string): Promise<FullSyncStatistics | null> {
    try {
      const task = this.taskTreeService.getTask(taskId);
      if (!task) {
        return null;
      }

      // TODO: 实现状态统计逻辑
      // 这里需要遍历任务树，统计各种状态的任务数量

      // 检查是否为TaskNode类型
      if ('data' in task) {
        return {
          taskId,
          xnxq: task.data.metadata?.xnxq || '',
          startTime: task.data.createdAt,
          endTime: task.data.updatedAt,
          totalCourses: 0,
          teacherTasks: 0,
          studentTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          status: 'running'
        };
      }

      // 如果是TaskNodePlaceholder，返回基本信息
      return {
        taskId,
        xnxq: '',
        startTime: new Date(),
        totalCourses: 0,
        teacherTasks: 0,
        studentTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        status: 'running'
      };
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          taskId
        },
        '获取全量同步状态失败'
      );
      return null;
    }
  }

  /**
   * 取消全量同步任务
   */
  async cancelFullSync(taskId: string): Promise<boolean> {
    try {
      const result = await this.taskTreeService.cancelTask(taskId, '用户取消');

      this.log.info({ taskId, success: result.success }, '全量同步任务取消');

      return result.success;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          taskId
        },
        '取消全量同步任务失败'
      );
      return false;
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
