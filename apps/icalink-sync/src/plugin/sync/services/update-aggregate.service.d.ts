import { Logger } from '@stratix/core';
import type { TaskExecutor, TaskNode } from '@stratix/tasks';
import { CourseAggregateRepository } from '../repositories/course-aggregate-repository.js';
import { CourseScheduleRepository } from '../repositories/course-schedule-repository.js';
/**
 * 聚合状态更新任务执行器
 * 用于教师和学生任务完成后修改聚合表的值，以及任务全部完成时修改中间表的状态
 */
export declare class UpdateAggregateService implements TaskExecutor {
    private log;
    private courseAggregateRepo;
    private courseScheduleRepo;
    name: string;
    constructor(log: Logger, courseAggregateRepo: CourseAggregateRepository, courseScheduleRepo: CourseScheduleRepository);
    /**
     * 任务完成时更新聚合表状态
     * 将对应课程的gx_zt设置为1，同时更新gx_sj为当前时间
     */
    updateCompleted(gxZt: number, courseTask: {
        kkh: string;
        xnxq: string;
        rq: string;
        sjd: string;
        jxz?: string;
        zc?: number;
        sj_f?: string;
    }): Promise<void>;
    /**
     * 根据juhe_renwu记录更新对应的u_jw_kcb_cur记录
     * 当学生任务完成（gx_zt=2）时，检查该课程的所有聚合任务是否都已完成，
     * 如果是则根据聚合记录的信息找到对应的u_jw_kcb_cur记录并更新其gx_zt和gx_sj
     */
    updateRelatedCourseSchedules(aggregateTasks: any[], zt?: number): Promise<void>;
    /**
     * 对课程表数据按照kkh, xnxq, jxz, zc, rq进行分组
     */
    private groupCourseSchedules;
    /**
     * 批量更新聚合表状态
     * 用于批量处理多个任务的状态更新
     */
    batchUpdateAggregateStatus(courseTasks: Array<{
        kkh: string;
        xnxq: string;
        rq: string;
        sjd: string;
    }>, status: number): Promise<void>;
    /**
     * 软删除聚合任务
     * 将指定课程的聚合任务状态设置为3（软删除未处理）
     */
    softDeleteAggregateTasks(conditions: Array<{
        kkh: string;
        rq: string;
    }>): Promise<void>;
    /**
     * 完成软删除处理
     * 将软删除的聚合任务状态从3更新为4（软删除处理完毕）
     */
    completeSoftDeleteProcessing(xnxq: string): Promise<void>;
    /**
     * 获取聚合任务统计信息
     */
    getAggregateStats(xnxq: string): Promise<{
        total: number;
        pending: number;
        teacherSynced: number;
        studentSynced: number;
        softDeleted: number;
        processed: number;
    }>;
    /**
     * 重置聚合任务状态
     * 将指定学年学期的所有聚合任务状态重置为初始状态
     */
    resetAggregateStatus(xnxq: string): Promise<void>;
    /**
     * TaskExecutor接口方法 - 任务执行
     */
    execute(taskNode: TaskNode): Promise<void>;
    /**
     * TaskExecutor接口方法 - 任务成功回调
     */
    onSuccess(taskNode: TaskNode): Promise<void>;
    /**
     * TaskExecutor接口方法 - 任务失败回调
     */
    onFail(taskNode: TaskNode): Promise<void>;
    /**
     * TaskExecutor接口方法 - 任务完成回调（无论成功失败都会调用）
     */
    onComplete(taskNode: TaskNode): Promise<void>;
}
//# sourceMappingURL=update-aggregate.service.d.ts.map