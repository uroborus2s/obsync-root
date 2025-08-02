/**
 * 增量同步服务
 * 实现基于 gx_zt 状态的增量同步业务流程
 */
import type { Logger } from '@stratix/core';
import type { DatabaseProvider } from '@stratix/database';
import type { ITaskTreeService } from '@stratix/tasks';
import { ScheduleModule } from '@stratix/was-v7';
import { CourseAggregateRepository, CourseScheduleRepository, UserCalendarRepository } from '../repositories/index.js';
import { UpdateAggregateService } from '../services/update-aggregate.service.js';
/**
 * 增量同步配置
 */
export interface IncrementalSyncConfig {
    /** 学年学期 */
    xnxq: string;
    /** 批量处理大小 */
    batchSize?: number;
    /** 是否启用并行处理 */
    parallel?: boolean;
    /** 最大并发数 */
    maxConcurrency?: number;
}
/**
 * 增量同步统计信息
 */
export interface IncrementalSyncStats {
    /** 任务ID */
    taskId?: string;
    /** 开始时间 */
    startTime: Date;
    /** 结束时间 */
    endTime?: Date;
    /** 处理的课程数量 */
    processedCourses: number;
    /** 软删除的聚合任务数量 */
    softDeletedAggregates: number;
    /** 删除的教师日历数量 */
    deletedTeacherCalendars: number;
    /** 删除的学生日历数量 */
    deletedStudentCalendars: number;
    /** 新增的聚合任务数量 */
    newAggregates: number;
    /** 同步状态 */
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    /** 错误信息 */
    error?: string;
}
/**
 * 增量同步服务
 */
export declare class IncrementalSyncService {
    private databaseProvider;
    private courseScheduleRepo;
    private courseAggregateRepo;
    private userCalendarRepo;
    private updateAggregateService;
    private taskTreeService;
    private wasV7Schedule;
    private log;
    constructor(databaseProvider: DatabaseProvider, courseScheduleRepo: CourseScheduleRepository, courseAggregateRepo: CourseAggregateRepository, userCalendarRepo: UserCalendarRepository, updateAggregateService: UpdateAggregateService, taskTreeService: ITaskTreeService, wasV7Schedule: ScheduleModule, log: Logger);
    /**
     * 启动增量同步流程
     */
    startIncrementalSync(config: IncrementalSyncConfig): Promise<IncrementalSyncStats>;
    /**
     * 步骤 3-4: 查询中间表根据 gx_zt is null 取到未处理的数据
     * 获取变化数据的 kkh 和 rq
     */
    private getChangedKkhAndRq;
    /**
     * 步骤 5: 软删除聚合表相关数据
     * 根据查到的 rq 和 kkh，把 gx_zt 设置为 3（软删除未处理）
     */
    private softDeleteAggregateData;
    /**
     * 步骤 6: 根据 gx_zt 和 rq 顺序删除教师和学生日历对象
     * 处理完毕后 gx_zt 置为 4（软删除处理完毕）
     */
    private deleteUserCalendars;
    /**
     * 删除指定课程的教师日历
     */
    private deleteTeacherCalendarsForCourse;
    /**
     * 删除指定课程的学生日历
     */
    private deleteStudentCalendarsForCourse;
    /**
     * 步骤 7: 查询中间表根据 gx_zt is null，取到未处理的数据重新聚合
     * 把新聚合的值附加到聚合表
     */
    private regenerateAggregateData;
    /**
     * 获取增量同步状态
     */
    getIncrementalSyncStatus(xnxq: string): Promise<{
        unprocessedCount: number;
        softDeletedCount: number;
        processedCount: number;
        lastSyncTime?: Date;
    }>;
}
//# sourceMappingURL=incremental-sync.service.d.ts.map