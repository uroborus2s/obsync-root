/**
 * 全量同步服务
 * 使用 @stratix/tasks 创建树形任务结构实现全量同步流程
 */
import type { Logger } from '@stratix/core';
import { type ITaskTreeService } from '@stratix/tasks';
import { ScheduleModule } from '@stratix/was-v7';
import { CourseAggregateRepository, CourseScheduleRepository, StudentCourseRepository, StudentInfoRepository, UserCalendarRepository } from '../repositories/index.js';
import { CreateAttendanceTableExecutor, SyncTeacherScheduleExecutor } from '../service/task-executors.service.js';
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
export declare class FullSyncService {
    private taskTreeService;
    private courseAggregateRepo;
    private studentCourseRepo;
    private studentInfoRepo;
    private pageUrlService;
    private log;
    private syncTeacherScheduleExecutor;
    private wasV7Schedule;
    private createAttendanceTableExecutor;
    private courseScheduleRepo;
    private userCalendarRepo;
    private attendanceService;
    private updateAggregateService;
    private wpsScheduleProcessorService;
    constructor(taskTreeService: ITaskTreeService, courseAggregateRepo: CourseAggregateRepository, studentCourseRepo: StudentCourseRepository, studentInfoRepo: StudentInfoRepository, pageUrlService: ReturnType<typeof createPageUrlFactory>, log: Logger, syncTeacherScheduleExecutor: SyncTeacherScheduleExecutor, wasV7Schedule: ScheduleModule, createAttendanceTableExecutor: CreateAttendanceTableExecutor, courseScheduleRepo: CourseScheduleRepository, userCalendarRepo: UserCalendarRepository, attendanceService: AttendanceService, updateAggregateService: UpdateAggregateService, wpsScheduleProcessorService: WpsScheduleProcessorService);
    /**
     * 查找已存在的任务
     */
    private findExistingTask;
    /**
     * 检查任务是否有子任务
     */
    private hasChildTasks;
    incremSyncc(config: FullSyncConfig): Promise<void>;
    incremSyncc2(config: FullSyncConfig): Promise<void>;
    /**
     * 启动全量同步任务
     */
    startFullSync(config: FullSyncConfig): Promise<void>;
    private formatDate;
    /**
     * 创建签到表任务
     */
    private createAttendanceTableTask;
    /**
     * 创建教师日程同步任务
     */
    private createTeacherSyncTasks;
    /**
     * 创建学生日程同步任务
     */
    private createStudentSyncTasks;
    /**
     * 获取课程的教师信息
     */
    getTeachersForCourse(courseTask: any): Promise<TeacherInfo[]>;
    /**
     * 获取课程的学生信息
     */
    getStudentsForCourse(kkh: string, xnxq: string): Promise<StudentInfo[]>;
    /**
     * 获取全量同步状态
     */
    getFullSyncStatus(taskId: string): Promise<FullSyncStatistics | null>;
    /**
     * 取消全量同步任务
     */
    cancelFullSync(taskId: string): Promise<boolean>;
    /**
     * 数组分块
     */
    private chunkArray;
}
//# sourceMappingURL=full-sync.service.d.ts.map