/**
 * 课表数据Repository
 * 专门管理u_jw_kcb_cur表的CRUD操作
 */
import { Logger } from '@stratix/core';
import type { DatabaseProvider } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { CourseScheduleEntity } from './types.js';
/**
 * 课表数据Repository实现
 */
export declare class CourseScheduleRepository extends BaseRepository {
    private db;
    constructor(databaseProvider: DatabaseProvider, log: Logger);
    /**
     * 根据学年学期查询课表数据
     */
    findByXnxq(xnxq: string): Promise<CourseScheduleEntity[]>;
    /**
     * 根据开课号查询课表数据
     */
    findByKkh(kkh: string): Promise<CourseScheduleEntity[]>;
    /**
     * 查询未同步的课表数据（gx_zt为null）
     */
    findUnsyncedData(xnxq?: string): Promise<CourseScheduleEntity[]>;
    /**
     * 查询变化的数据（用于增量同步）
     */
    findChangedData(xnxq: string): Promise<CourseScheduleEntity[]>;
    /**
     * 获取变化数据的开课号和日期
     */
    getChangedKkhAndRq(xnxq: string): Promise<Array<{
        kkh: string;
        rq: string;
    }>>;
    /**
     * 批量更新同步状态
     */
    batchUpdateSyncStatus(conditions: Array<{
        kkh: string;
        xnxq: string;
        rq: string;
        st: string;
    }>, gxZt: number): Promise<number>;
    /**
     * 更新单条记录的同步状态
     */
    updateSyncStatus(kkh: string, xnxq: string, jxz: string, zc: number, rq: string, gxZt: number): Promise<boolean>;
    /**
     * 清空指定学年学期的同步状态
     */
    resetSyncStatus(xnxq: string): Promise<number>;
    /**
     * 根据条件查询课表数据
     */
    findByConditions(conditions: {
        xnxq?: string;
        kkh?: string;
        rq?: string;
        gxZt?: number | null;
        zt?: string;
        sjf?: string;
        sjt?: string;
        sjd?: 'am' | 'pm';
        kcmc?: string;
        beginDate?: string;
        endDate?: string;
    }): Promise<CourseScheduleEntity[]>;
    /**
     * 获取同步状态统计
     */
    getSyncStats(xnxq: string): Promise<{
        total: number;
        synced: number;
        unsynced: number;
        deleted: number;
    }>;
    /**
     * 根据日期范围查询课表数据
     */
    findByDateRange(xnxq: string, startDate: string, endDate: string): Promise<CourseScheduleEntity[]>;
    /**
     * 获取教师课表数据
     */
    findTeacherSchedule(xnxq: string, ghs?: string): Promise<CourseScheduleEntity[]>;
    /**
     * 生成聚合数据到juhe_renwu表
     * 通过对kkh，日期，上下午的聚合和union，生成日历的任务清单
     *
     * @param xnxq 学年学期
     * @param conditions 过滤条件
     * @param conditions.gxZtFilter 更新状态过滤器
     *   - 'null': 只处理gx_zt为null的数据（未处理）
     *   - '4': 只处理gx_zt为4的数据（软删除处理完毕）
     *   - 'both': 处理gx_zt为null或4的数据（所有待处理）
     * @param conditions.dateRange 日期范围过滤
     * @param conditions.zt 是否过滤删除状态
     *
     * @example
     * // 处理未同步数据
     * await repo.generateAggregateData('2024-2025-2', { gxZtFilter: 'null' });
     *
     * // 处理软删除数据
     * await repo.generateAggregateData('2024-2025-2', { gxZtFilter: '4' });
     *
     * // 处理所有待处理数据
     * await repo.generateAggregateData('2024-2025-2', { gxZtFilter: 'both' });
     */
    generateAggregateData(xnxq?: string, conditions?: {
        gxZtIsNull?: boolean;
        gxZtEquals4?: boolean;
        gxZtFilter?: 'null' | '4' | 'both';
        dateRange?: {
            startDate: string;
            endDate: string;
        };
        zt?: boolean;
    }): Promise<{
        amRecords: number;
        pmRecords: number;
        totalRecords: number;
    }>;
    /**
     * 生成增量聚合数据（只处理gx_zt为null的数据）
     * 用于增量同步场景
     */
    generateIncrementalAggregateData(xnxq: string): Promise<{
        amRecords: number;
        pmRecords: number;
        totalRecords: number;
    }>;
    /**
     * 生成软删除聚合数据（只处理gx_zt为4的数据）
     * 用于处理软删除的课程数据
     */
    generateSoftDeletedAggregateData(xnxq: string): Promise<{
        amRecords: number;
        pmRecords: number;
        totalRecords: number;
    }>;
    /**
     * 生成全量待处理聚合数据（处理gx_zt为null或4的数据）
     * 用于处理所有待处理的课程数据
     */
    generatePendingAggregateData(xnxq: string): Promise<{
        amRecords: number;
        pmRecords: number;
        totalRecords: number;
    }>;
    /**
     * 为指定日期范围生成聚合数据
     */
    generateAggregateDataForDateRange(xnxq: string, startDate: string, endDate: string, gxZtFilter?: 'null' | '4' | 'both' | 'all'): Promise<{
        amRecords: number;
        pmRecords: number;
        totalRecords: number;
    }>;
}
//# sourceMappingURL=course-schedule-repository.d.ts.map