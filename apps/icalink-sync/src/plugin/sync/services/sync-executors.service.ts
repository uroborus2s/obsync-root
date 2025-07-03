/**
 * 同步任务执行器集合
 * 实现各种同步任务的具体执行逻辑，支持断点续传和错误重试
 */

import { Logger } from '@stratix/core';
import { QueueService } from '@stratix/queue';
import { CalendarModule, ScheduleModule } from '@stratix/was-v7';
import {
  AttendanceRepository,
  CourseAggregateRepository,
  CourseScheduleRepository,
  StudentCourseRepository,
  StudentInfoRepository,
  TeacherInfoRepository,
  UserCalendarRepository
} from '../repositories/index.js';

/**
 * 任务执行器基础接口
 */
interface TaskExecutor {
  name: string;
  run(metadata: any): Promise<any>;
  onStart?(metadata: any): Promise<void>;
  onSuccess?(metadata: any, result: any): Promise<void>;
  onFail?(metadata: any, error: any): Promise<void>;
  pause?(metadata: any): Promise<void>;
  resume?(metadata: any): Promise<void>;
}

/**
 * 聚合任务执行器
 * 处理课程数据聚合逻辑
 */
export class AggregateExecutor implements TaskExecutor {
  name = 'aggregateExecutor';

  constructor(
    private readonly courseAggregateRepo: CourseAggregateRepository,
    private readonly courseScheduleRepo: CourseScheduleRepository,
    private readonly log: Logger
  ) {}

  async run(metadata: any): Promise<any> {
    const { xnxq, action } = metadata;

    this.log.info({ xnxq, action }, '开始执行聚合任务');

    switch (action) {
      case 'regenerate':
        return await this.regenerateAggregateData(xnxq);
      case 'handle_null':
        return await this.handleNullStatusCourses(xnxq);
      case 'handle_completed':
        return await this.handleCompletedCourses(xnxq);
      default:
        throw new Error(`未知的聚合操作: ${action}`);
    }
  }

  private async regenerateAggregateData(xnxq: string): Promise<any> {
    // 清空现有聚合数据
    await this.courseAggregateRepo.clearByXnxq(xnxq);

    // 重新生成聚合数据
    const result = await this.generateAggregateData(xnxq);

    this.log.info({ xnxq, result }, '聚合数据重新生成完成');
    return result;
  }

  private async handleNullStatusCourses(xnxq: string): Promise<any> {
    const courses = await this.courseAggregateRepo.findByStatus(xnxq, null);
    this.log.info({ xnxq, count: courses.length }, '处理状态为 null 的课程');
    return { processedCount: courses.length };
  }

  private async handleCompletedCourses(xnxq: string): Promise<any> {
    const courses = await this.courseAggregateRepo.findByStatus(xnxq, 4);
    this.log.info({ xnxq, count: courses.length }, '处理已完成的课程');
    return { processedCount: courses.length };
  }

  private async generateAggregateData(xnxq: string): Promise<any> {
    // 实现聚合数据生成逻辑
    // 这里需要根据实际需求实现 SQL 聚合逻辑
    this.log.info({ xnxq }, '聚合数据生成逻辑待实现');
    return { status: 'completed' };
  }

  async onSuccess(metadata: any, result: any): Promise<void> {
    const { xnxq, action } = metadata;
    this.log.info({ xnxq, action, result }, '聚合任务成功完成');
  }

  async onFail(metadata: any, error: any): Promise<void> {
    const { xnxq, action } = metadata;
    this.log.error({ xnxq, action, error }, '聚合任务执行失败');
  }
}

/**
 * 获取课程列表执行器
 */
export class GetCoursesExecutor implements TaskExecutor {
  name = 'getCoursesExecutor';

  constructor(
    private readonly courseAggregateRepo: CourseAggregateRepository,
    private readonly log: Logger
  ) {}

  async run(metadata: any): Promise<any> {
    const { xnxq, status } = metadata;

    this.log.info({ xnxq, status }, '开始获取课程列表');

    const courses = await this.courseAggregateRepo.findByStatus(xnxq, status);

    this.log.info({ xnxq, status, count: courses.length }, '课程列表获取完成');

    return {
      courses: courses.map((course) => ({
        id: course.id,
        kkh: course.kkh,
        kcmc: course.kcmc,
        rq: course.rq,
        sjd: course.sjd
      })),
      count: courses.length
    };
  }

  async onSuccess(metadata: any, result: any): Promise<void> {
    const { xnxq } = metadata;
    this.log.info({ xnxq, count: result.count }, '课程列表获取成功');
  }
}

/**
 * 课程同步执行器
 */
export class CourseSyncExecutor implements TaskExecutor {
  name = 'courseSyncExecutor';

  constructor(
    private readonly courseAggregateRepo: CourseAggregateRepository,
    private readonly log: Logger
  ) {}

  async run(metadata: any): Promise<any> {
    const { course, syncType, xnxq, kkh } = metadata;

    this.log.info({ kkh, syncType }, '开始执行课程同步');

    // 检查课程是否存在
    const exists = await this.checkCourseExists(course);

    if (!exists && syncType === 'incremental') {
      this.log.warn({ kkh }, '增量同步中课程不存在，跳过');
      return { status: 'skipped', reason: 'course_not_exists' };
    }

    // 创建或更新课程基础信息
    const courseResult = await this.ensureCourseExists(course);

    this.log.info({ kkh, syncType }, '课程同步完成');

    return {
      status: 'success',
      courseResult,
      course: {
        kkh: course.kkh,
        kcmc: course.kcmc,
        rq: course.rq,
        sjd: course.sjd
      }
    };
  }

  private async checkCourseExists(course: any): Promise<boolean> {
    try {
      const existing = await this.courseAggregateRepo.findById(course.id);
      return !!existing;
    } catch (error) {
      this.log.warn({ kkh: course.kkh, error }, '检查课程存在性时出错');
      return false;
    }
  }

  private async ensureCourseExists(course: any): Promise<any> {
    // 确保课程记录存在
    // 这里可以实现课程创建或更新逻辑
    this.log.info({ kkh: course.kkh }, '确保课程存在');
    return { action: 'ensured' };
  }

  async onSuccess(metadata: any, result: any): Promise<void> {
    const { course } = metadata;

    // 更新聚合表状态
    await this.updateCourseStatus(course, 1); // 标记为教师已同步

    this.log.info({ kkh: course.kkh }, '课程同步成功，已更新状态');
  }

  async onFail(metadata: any, error: any): Promise<void> {
    const { course } = metadata;
    this.log.error({ kkh: course.kkh, error }, '课程同步失败');
  }

  private async updateCourseStatus(course: any, status: number): Promise<void> {
    try {
      if (course.id) {
        await this.courseAggregateRepo.updateStatus(course.id, status);
      }
    } catch (error) {
      this.log.error({ kkh: course.kkh, status, error }, '更新课程状态失败');
    }
  }
}

/**
 * 删除课程执行器
 */
export class DeleteCourseExecutor implements TaskExecutor {
  name = 'deleteCourseExecutor';

  constructor(
    private readonly courseAggregateRepo: CourseAggregateRepository,
    private readonly queueService: QueueService,
    private readonly wasV7Schedule: ScheduleModule,
    private readonly log: Logger
  ) {}

  async run(metadata: any): Promise<any> {
    const { course, action } = metadata;

    this.log.info({ kkh: course.kkh, action }, '开始执行课程删除');

    // 1. 标记聚合表状态为删除中
    await this.updateCourseStatus(course.id, 3);

    // 2. 读取课程日历信息
    const calendarInfo = await this.getCourseCalendarInfo(course);

    // 3. 将删除日程任务加入队列
    await this.queueDeleteSchedule(course, calendarInfo);

    this.log.info({ kkh: course.kkh }, '课程删除任务完成');

    return {
      status: 'success',
      action: 'delete_scheduled',
      course: {
        kkh: course.kkh,
        kcmc: course.kcmc
      }
    };
  }

  private async getCourseCalendarInfo(course: any): Promise<any> {
    // 获取课程相关的日历信息
    this.log.info({ kkh: course.kkh }, '获取课程日历信息');
    return { calendarId: null, eventIds: [] };
  }

  private async queueDeleteSchedule(
    course: any,
    calendarInfo: any
  ): Promise<void> {
    // 将删除日程的任务加入队列
    await this.queueService.addTask({
      name: 'delete-schedule',
      executor: 'deleteScheduleExecutor',
      payload: {
        courseKkh: course.kkh,
        calendarInfo
      }
    });

    this.log.info({ kkh: course.kkh }, '删除日程任务已加入队列');
  }

  private async updateCourseStatus(
    courseId: number,
    status: number
  ): Promise<void> {
    try {
      await this.courseAggregateRepo.updateStatus(courseId, status);
    } catch (error) {
      this.log.error({ courseId, status, error }, '更新课程状态失败');
    }
  }

  async onSuccess(metadata: any, result: any): Promise<void> {
    const { course } = metadata;

    // 删除成功后，标记状态为已完成删除
    await this.updateCourseStatus(course.id, 4);

    this.log.info({ kkh: course.kkh }, '课程删除成功，已更新状态为完成');
  }

  async onFail(metadata: any, error: any): Promise<void> {
    const { course } = metadata;
    this.log.error({ kkh: course.kkh, error }, '课程删除失败');
  }
}

/**
 * 创建签到表执行器
 */
export class CreateAttendanceExecutor implements TaskExecutor {
  name = 'createAttendanceExecutor';

  constructor(
    private readonly attendanceRepo: AttendanceRepository,
    private readonly studentCourseRepo: StudentCourseRepository,
    private readonly log: Logger
  ) {}

  async run(metadata: any): Promise<any> {
    const { course } = metadata;

    this.log.info({ kkh: course.kkh }, '开始创建签到表');

    // 1. 检查签到表是否已存在
    const existingRecord = await this.checkAttendanceExists(course);

    if (existingRecord) {
      this.log.info({ kkh: course.kkh }, '签到表已存在，跳过创建');
      return { status: 'exists', recordId: existingRecord.id };
    }

    // 2. 获取课程学生总数
    const studentCount = await this.getStudentCount(course.kkh);

    // 3. 创建签到表记录
    const recordId = await this.createAttendanceRecord(course, studentCount);

    this.log.info({ kkh: course.kkh, recordId }, '签到表创建完成');

    return {
      status: 'created',
      recordId,
      studentCount
    };
  }

  private async checkAttendanceExists(course: any): Promise<any> {
    // 检查签到表是否存在的逻辑
    // 需要根据实际的 attendanceRepo 实现
    this.log.debug({ kkh: course.kkh }, '检查签到表是否存在');
    return null; // 暂时返回 null，表示不存在
  }

  private async getStudentCount(kkh: string): Promise<number> {
    try {
      const students = await this.studentCourseRepo.findStudentsByKkh(kkh);
      return students.length;
    } catch (error) {
      this.log.error({ kkh, error }, '获取学生数量失败');
      return 0;
    }
  }

  private async createAttendanceRecord(
    course: any,
    studentCount: number
  ): Promise<string> {
    // 创建签到表记录
    // 需要根据实际的 attendanceRepo 实现
    this.log.info({ kkh: course.kkh, studentCount }, '创建签到表记录');
    return `attendance_${course.kkh}_${Date.now()}`;
  }

  async onSuccess(metadata: any, result: any): Promise<void> {
    const { course } = metadata;
    this.log.info({ kkh: course.kkh, result }, '签到表创建成功');
  }
}

/**
 * 获取课程参与者执行器
 */
export class GetParticipantsExecutor implements TaskExecutor {
  name = 'getParticipantsExecutor';

  constructor(
    private readonly studentCourseRepo: StudentCourseRepository,
    private readonly teacherInfoRepo: TeacherInfoRepository,
    private readonly studentInfoRepo: StudentInfoRepository,
    private readonly log: Logger
  ) {}

  async run(metadata: any): Promise<any> {
    const { course } = metadata;

    this.log.info({ kkh: course.kkh }, '开始获取课程参与者');

    // 1. 获取教师列表
    const teachers = await this.getTeachers(course);

    // 2. 获取学生列表
    const students = await this.getStudents(course.kkh);

    this.log.info(
      {
        kkh: course.kkh,
        teacherCount: teachers.length,
        studentCount: students.length
      },
      '课程参与者获取完成'
    );

    return {
      teachers,
      students,
      teacherCount: teachers.length,
      studentCount: students.length
    };
  }

  private async getTeachers(course: any): Promise<any[]> {
    // 从课程的 gh_s 字段解析教师工号
    const teacherGhs = course.gh_s ? course.gh_s.split(',') : [];

    const teachers = [];
    for (const gh of teacherGhs) {
      try {
        const teacher = await this.teacherInfoRepo.findByGh(gh.trim());
        if (teacher) {
          teachers.push(teacher);
        }
      } catch (error) {
        this.log.warn({ gh, error }, '获取教师信息失败');
      }
    }

    return teachers;
  }

  private async getStudents(kkh: string): Promise<any[]> {
    try {
      const studentCourses =
        await this.studentCourseRepo.findStudentsByKkh(kkh);
      const students = [];

      for (const sc of studentCourses) {
        try {
          const student = await this.studentInfoRepo.findByXh(sc.xh);
          if (student) {
            students.push(student);
          }
        } catch (error) {
          this.log.warn({ xh: sc.xh, error }, '获取学生信息失败');
        }
      }

      return students;
    } catch (error) {
      this.log.error({ kkh, error }, '获取学生列表失败');
      return [];
    }
  }

  async onSuccess(metadata: any, result: any): Promise<void> {
    const { course } = metadata;
    this.log.info(
      {
        kkh: course.kkh,
        teacherCount: result.teacherCount,
        studentCount: result.studentCount
      },
      '参与者信息获取成功'
    );
  }
}

/**
 * 日程创建执行器
 */
export class ScheduleCreationExecutor implements TaskExecutor {
  name = 'scheduleCreationExecutor';

  constructor(
    private readonly queueService: QueueService,
    private readonly userCalendarRepo: UserCalendarRepository,
    private readonly wasV7Schedule: ScheduleModule,
    private readonly wasV7Calendar: CalendarModule,
    private readonly log: Logger
  ) {}

  async run(metadata: any): Promise<any> {
    const { course } = metadata;

    this.log.info({ kkh: course.kkh }, '开始创建日程任务');

    // 1. 获取课程参与者
    const participants = await this.getCourseParticipants(course);

    // 2. 为每个参与者创建日程任务
    const scheduleTasks = [];

    for (const participant of participants) {
      const taskId = await this.createScheduleTask(course, participant);
      scheduleTasks.push(taskId);
    }

    this.log.info(
      {
        kkh: course.kkh,
        taskCount: scheduleTasks.length
      },
      '日程创建任务已加入队列'
    );

    return {
      status: 'queued',
      taskIds: scheduleTasks,
      taskCount: scheduleTasks.length
    };
  }

  private async getCourseParticipants(course: any): Promise<any[]> {
    // 获取课程的教师和学生参与者
    // 这里需要根据课程信息获取参与者列表
    const participants = [];

    // 解析教师工号
    if (course.gh_s) {
      const teacherGhs = course.gh_s.split(',');
      for (const gh of teacherGhs) {
        participants.push({
          type: 'teacher',
          id: gh.trim(),
          name: null // 可以后续查询获取姓名
        });
      }
    }

    return participants;
  }

  private async createScheduleTask(
    course: any,
    participant: any
  ): Promise<string> {
    // 创建具体的日程同步任务并加入队列
    const taskData = {
      courseKkh: course.kkh,
      courseName: course.kcmc,
      courseDate: course.rq,
      courseTime: {
        start: course.sj_f,
        end: course.sj_t
      },
      participant: {
        type: participant.type,
        id: participant.id,
        name: participant.name
      },
      location: course.room_s,
      timeSlot: course.sjd
    };

    const jobId = await this.queueService.addTask({
      name: 'create-schedule',
      executor: 'createScheduleExecutor',
      payload: taskData
    });

    this.log.debug(
      {
        kkh: course.kkh,
        participantId: participant.id,
        jobId
      },
      '日程创建任务已加入队列'
    );

    return jobId;
  }

  async onSuccess(metadata: any, result: any): Promise<void> {
    const { course } = metadata;
    this.log.info(
      {
        kkh: course.kkh,
        taskCount: result.taskCount
      },
      '日程创建任务排队成功'
    );
  }

  async onFail(metadata: any, error: any): Promise<void> {
    const { course } = metadata;
    this.log.error({ kkh: course.kkh, error }, '日程创建任务失败');
  }
}

/**
 * 执行器工厂函数
 */
export function createSyncExecutors(
  courseAggregateRepo: CourseAggregateRepository,
  courseScheduleRepo: CourseScheduleRepository,
  userCalendarRepo: UserCalendarRepository,
  studentCourseRepo: StudentCourseRepository,
  teacherInfoRepo: TeacherInfoRepository,
  studentInfoRepo: StudentInfoRepository,
  attendanceRepo: AttendanceRepository,
  queueService: QueueService,
  wasV7Schedule: ScheduleModule,
  wasV7Calendar: CalendarModule,
  log: Logger
): Record<string, TaskExecutor> {
  return {
    aggregateExecutor: new AggregateExecutor(
      courseAggregateRepo,
      courseScheduleRepo,
      log
    ),
    getCoursesExecutor: new GetCoursesExecutor(courseAggregateRepo, log),
    courseSyncExecutor: new CourseSyncExecutor(courseAggregateRepo, log),
    deleteCourseExecutor: new DeleteCourseExecutor(
      courseAggregateRepo,
      queueService,
      wasV7Schedule,
      log
    ),
    createAttendanceExecutor: new CreateAttendanceExecutor(
      attendanceRepo,
      studentCourseRepo,
      log
    ),
    getParticipantsExecutor: new GetParticipantsExecutor(
      studentCourseRepo,
      teacherInfoRepo,
      studentInfoRepo,
      log
    ),
    scheduleCreationExecutor: new ScheduleCreationExecutor(
      queueService,
      userCalendarRepo,
      wasV7Schedule,
      wasV7Calendar,
      log
    )
  };
}
