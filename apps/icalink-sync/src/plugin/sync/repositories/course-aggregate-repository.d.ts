/**
 * 聚合任务Repository
 * 专门管理juhe_renwu表的CRUD操作
 */
import { Logger } from '@stratix/core';
import type { DatabaseProvider } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { CourseAggregateEntity } from './types.js';
/**
 * 聚合任务Repository实现
 */
export declare class CourseAggregateRepository extends BaseRepository {
    private db;
    constructor(databaseProvider: DatabaseProvider, log: Logger);
    /**
     * 创建聚合任务
     */
    create(taskData: Omit<CourseAggregateEntity, 'id' | 'created_at' | 'updated_at'>): Promise<number>;
    /**
     * 批量创建聚合任务
     */
    batchCreate(tasks: Array<Omit<CourseAggregateEntity, 'id' | 'created_at' | 'updated_at'>>): Promise<number>;
    /**
     * 根据ID查询聚合任务
     */
    findById(id: number): Promise<CourseAggregateEntity | null>;
    /**
     * 根据学年学期查询聚合任务
     */
    findByXnxq(xnxq: string): Promise<CourseAggregateEntity[]>;
    /**
     * 根据同步状态查询聚合任务
     */
    findByStatus(xnxq: string, gxZt?: number | null): Promise<CourseAggregateEntity[]>;
    /**
     * 根据日期查询聚合任务
     */
    findByDate(xnxq: string, rq: string): Promise<CourseAggregateEntity[]>;
    /**
     * 根据日期范围查询聚合任务
     */
    findByDateRange(xnxq: string, startDate: string, endDate: string): Promise<CourseAggregateEntity[]>;
    /**
     * 更新聚合任务状态
     */
    updateStatus(id: number, gxZt: number): Promise<boolean>;
    /**
     * 批量更新聚合任务状态
     */
    batchUpdateStatus(ids: number[], gxZt: number): Promise<number>;
    /**
     * 软删除聚合任务（设置状态为3）
     */
    softDelete(kkh: string, rq: string): Promise<number>;
    /**
     * 删除聚合任务
     */
    delete(id: number): Promise<boolean>;
    /**
     * 清空指定学年学期的聚合任务
     */
    clearByXnxq(xnxq: string): Promise<number>;
    /**
     * 获取聚合任务统计
     */
    getStats(xnxq: string): Promise<{
        total: number;
        pending: number;
        teacherSynced: number;
        studentSynced: number;
        softDeleted: number;
        processed: number;
    }>;
    /**
     * 根据条件查询聚合任务
     */
    findByConditions(conditions: {
        xnxq?: string;
        kkh?: string;
        rq?: string;
        beginDate?: string;
        sjd?: string;
        gxZt?: number | null;
        sjf?: string;
        kcmc?: string;
    }): Promise<CourseAggregateEntity[]>;
    /**
     * 获取需要打卡的聚合任务
     */
    findAttendanceTasks(xnxq: string): Promise<CourseAggregateEntity[]>;
}
//# sourceMappingURL=course-aggregate-repository.d.ts.map