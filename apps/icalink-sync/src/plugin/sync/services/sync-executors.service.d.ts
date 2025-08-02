/**
 * 同步任务执行器集合
 * 实现各种同步任务的具体执行逻辑，支持断点续传和错误重试
 */
import { Logger } from '@stratix/core';
import { QueueService } from '@stratix/queue';
import { CalendarModule, ScheduleModule } from '@stratix/was-v7';
import { AttendanceRepository, CourseAggregateRepository, CourseScheduleRepository, StudentCourseRepository, StudentInfoRepository, TeacherInfoRepository, UserCalendarRepository } from '../repositories/index.js';
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
export declare class AggregateExecutor implements TaskExecutor {
    private readonly courseAggregateRepo;
    private readonly courseScheduleRepo;
    private readonly log;
    name: string;
    constructor(courseAggregateRepo: CourseAggregateRepository, courseScheduleRepo: CourseScheduleRepository, log: Logger);
    run(metadata: any): Promise<any>;
    private regenerateAggregateData;
    private handleNullStatusCourses;
    private handleCompletedCourses;
    private generateAggregateData;
    onSuccess(metadata: any, result: any): Promise<void>;
    onFail(metadata: any, error: any): Promise<void>;
}
/**
 * 获取课程列表执行器
 */
export declare class GetCoursesExecutor implements TaskExecutor {
    private readonly courseAggregateRepo;
    private readonly log;
    name: string;
    constructor(courseAggregateRepo: CourseAggregateRepository, log: Logger);
    run(metadata: any): Promise<any>;
    onSuccess(metadata: any, result: any): Promise<void>;
}
/**
 * 课程同步执行器
 */
export declare class CourseSyncExecutor implements TaskExecutor {
    private readonly courseAggregateRepo;
    private readonly log;
    name: string;
    constructor(courseAggregateRepo: CourseAggregateRepository, log: Logger);
    run(metadata: any): Promise<any>;
    private checkCourseExists;
    private ensureCourseExists;
    onSuccess(metadata: any, result: any): Promise<void>;
    onFail(metadata: any, error: any): Promise<void>;
    private updateCourseStatus;
}
/**
 * 删除课程执行器
 */
export declare class DeleteCourseExecutor implements TaskExecutor {
    private readonly courseAggregateRepo;
    private readonly queueService;
    private readonly wasV7Schedule;
    private readonly log;
    name: string;
    constructor(courseAggregateRepo: CourseAggregateRepository, queueService: QueueService, wasV7Schedule: ScheduleModule, log: Logger);
    run(metadata: any): Promise<any>;
    private getCourseCalendarInfo;
    private queueDeleteSchedule;
    private updateCourseStatus;
    onSuccess(metadata: any, result: any): Promise<void>;
    onFail(metadata: any, error: any): Promise<void>;
}
/**
 * 创建签到表执行器
 */
export declare class CreateAttendanceExecutor implements TaskExecutor {
    private readonly attendanceRepo;
    private readonly studentCourseRepo;
    private readonly log;
    name: string;
    constructor(attendanceRepo: AttendanceRepository, studentCourseRepo: StudentCourseRepository, log: Logger);
    run(metadata: any): Promise<any>;
    private checkAttendanceExists;
    private getStudentCount;
    private createAttendanceRecord;
    onSuccess(metadata: any, result: any): Promise<void>;
}
/**
 * 获取课程参与者执行器
 */
export declare class GetParticipantsExecutor implements TaskExecutor {
    private readonly studentCourseRepo;
    private readonly teacherInfoRepo;
    private readonly studentInfoRepo;
    private readonly log;
    name: string;
    constructor(studentCourseRepo: StudentCourseRepository, teacherInfoRepo: TeacherInfoRepository, studentInfoRepo: StudentInfoRepository, log: Logger);
    run(metadata: any): Promise<any>;
    private getTeachers;
    private getStudents;
    onSuccess(metadata: any, result: any): Promise<void>;
}
/**
 * 日程创建执行器
 */
export declare class ScheduleCreationExecutor implements TaskExecutor {
    private readonly queueService;
    private readonly userCalendarRepo;
    private readonly wasV7Schedule;
    private readonly wasV7Calendar;
    private readonly log;
    name: string;
    constructor(queueService: QueueService, userCalendarRepo: UserCalendarRepository, wasV7Schedule: ScheduleModule, wasV7Calendar: CalendarModule, log: Logger);
    run(metadata: any): Promise<any>;
    private getCourseParticipants;
    private createScheduleTask;
    onSuccess(metadata: any, result: any): Promise<void>;
    onFail(metadata: any, error: any): Promise<void>;
}
/**
 * 执行器工厂函数
 */
export declare function createSyncExecutors(courseAggregateRepo: CourseAggregateRepository, courseScheduleRepo: CourseScheduleRepository, userCalendarRepo: UserCalendarRepository, studentCourseRepo: StudentCourseRepository, teacherInfoRepo: TeacherInfoRepository, studentInfoRepo: StudentInfoRepository, attendanceRepo: AttendanceRepository, queueService: QueueService, wasV7Schedule: ScheduleModule, wasV7Calendar: CalendarModule, log: Logger): Record<string, TaskExecutor>;
export {};
//# sourceMappingURL=sync-executors.service.d.ts.map