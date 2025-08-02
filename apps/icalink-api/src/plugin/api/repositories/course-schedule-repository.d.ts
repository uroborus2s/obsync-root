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
        jxz: string;
        zc: number;
        rq: string;
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
}
//# sourceMappingURL=course-schedule-repository.d.ts.map