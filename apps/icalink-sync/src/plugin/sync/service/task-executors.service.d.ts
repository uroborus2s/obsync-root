/**
 * 任务执行器服务
 * 实现各种任务的执行逻辑
 */
import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { QueueService } from '@stratix/queue';
import { TaskExecutor, TaskNode, TaskTreeService } from '@stratix/tasks';
import { CalendarModule, ScheduleModule } from '@stratix/was-v7';
import { CourseAggregateRepository, ExtendedDatabase, UserCalendarRepository } from '../repositories/index.js';
import { AttendanceService } from '../services/attendance/attendance.service.js';
/**
 * 共享上下文接口
 */
interface SharedContext {
    [key: string]: any;
}
/**
 * 数据清理任务执行器
 */
export declare class CleanupDataExecutor implements TaskExecutor {
    private db;
    private log;
    name: string;
    constructor(db: Kysely<ExtendedDatabase>, log: Logger);
    execute(taskNode: TaskNode, context: SharedContext): Promise<void>;
    onSuccess(taskNode: TaskNode, context: SharedContext): void;
    onFail(taskNode: TaskNode, context: SharedContext): void;
}
/**
 * 重新聚合数据任务执行器
 */
export declare class RegenerateAggregateExecutor implements TaskExecutor {
    private db;
    private courseAggregateRepo;
    private log;
    name: string;
    constructor(db: Kysely<ExtendedDatabase>, courseAggregateRepo: CourseAggregateRepository, log: Logger);
    execute(taskNode: TaskNode, context: SharedContext): Promise<void>;
    private generateAggregateData;
}
/**
 * 签到表创建任务执行器
 */
export declare class CreateAttendanceTableExecutor implements TaskExecutor {
    private attendanceService;
    private db;
    private log;
    name: string;
    constructor(attendanceService: AttendanceService, db: Kysely<ExtendedDatabase>, log: Logger);
    onStart(taskNode: TaskNode, context: SharedContext): Promise<void>;
    onSuccess(taskNode: TaskNode, context: SharedContext): Promise<void>;
    onFail(taskNode: TaskNode, context: SharedContext): Promise<void>;
    onComplete(taskNode: TaskNode, context: SharedContext): Promise<void>;
    /**
     * 更新聚合表状态
     */
    private updateAggregateStatus;
    /**
     * 检查并更新课程状态
     * 当所有任务都完成时（gx_zt = 2），更新相关表状态
     */
    private checkAndUpdateCourseStatus;
}
/**
 * 教师日程同步任务执行器
 */
export declare class SyncTeacherScheduleExecutor implements TaskExecutor {
    private queueService;
    private userCalendarRepo;
    private taskTreeService;
    private wasV7Schedule;
    private wasV7Calendar;
    private log;
    name: string;
    constructor(queueService: QueueService, userCalendarRepo: UserCalendarRepository, // UserCalendarRepository
    taskTreeService: TaskTreeService, wasV7Schedule: ScheduleModule, wasV7Calendar: CalendarModule, log: Logger);
    onStart(taskNode: TaskNode, context: SharedContext): Promise<void>;
    execute(taskNode: TaskNode, context: SharedContext): Promise<void>;
}
/**
 * 生成考勤记录任务执行器
 */
export declare class GenerateAttendanceExecutor implements TaskExecutor {
    private courseAggregateRepo;
    private log;
    name: string;
    constructor(courseAggregateRepo: CourseAggregateRepository, log: Logger);
    execute(taskNode: TaskNode, context: SharedContext): Promise<void>;
}
export {};
//# sourceMappingURL=task-executors.service.d.ts.map