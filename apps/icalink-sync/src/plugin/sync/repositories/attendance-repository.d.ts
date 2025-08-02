/**
 * 考勤仓库
 * 处理考勤相关的数据库操作
 */
import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { AttendanceRecord } from '../types/attendance.js';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase } from './types.js';
/**
 * 考勤记录数据
 */
interface AttendanceRecordData {
    id: string;
    kkh: string;
    xnxq: string;
    jxz?: number | null;
    zc?: number | null;
    rq: string;
    lq?: string;
    jc_s: string;
    kcmc: string;
    sj_f: string;
    sj_t: string;
    sjd: 'am' | 'pm';
    total_count: number;
    checkin_count: number;
    absent_count: number;
    leave_count: number;
    checkin_url?: string;
    leave_url?: string;
    checkin_token?: string;
    status: 'active' | 'closed';
    auto_start_time?: string;
    auto_close_time?: string;
    created_at: Date;
    updated_at: Date;
}
/**
 * 考勤仓库类
 */
export declare class AttendanceRepository extends BaseRepository {
    private db;
    constructor(db: Kysely<ExtendedDatabase>, log: Logger);
    /**
     * 创建或更新考勤记录
     * 如果ID已存在则更新记录，否则创建新记录
     */
    createAttendanceRecord(data: AttendanceRecordData): Promise<AttendanceRecord>;
    /**
     * 插入或更新考勤记录（upsert操作）
     * 这是createAttendanceRecord的别名方法，提供更明确的语义
     */
    upsertAttendanceRecord(data: AttendanceRecordData): Promise<AttendanceRecord>;
    /**
     * 根据ID获取考勤记录
     */
    getAttendanceRecord(id: string): Promise<AttendanceRecord | null>;
    /**
     * 检查考勤记录ID是否存在
     */
    checkAttendanceRecordExists(id: string): Promise<boolean>;
    /**
     * 根据条件查询考勤记录
     */
    findAttendanceRecords(conditions: {
        kkh?: string;
        xnxq?: string;
        rq?: string;
        status?: 'active' | 'closed';
    }): Promise<AttendanceRecord[]>;
    /**
     * 更新考勤记录（部分字段更新）
     */
    updateAttendanceRecord(id: string, updates: Partial<AttendanceRecordData>): Promise<void>;
    /**
     * 更新完整考勤记录（如果记录不存在则抛出错误）
     */
    updateFullAttendanceRecord(id: string, data: AttendanceRecordData): Promise<AttendanceRecord>;
    /**
     * 获取考勤统计
     */
    getAttendanceStats(attendanceRecordId: string): Promise<{
        [key: string]: number;
    }>;
    /**
     * 更新考勤记录统计
     */
    updateAttendanceStats(attendanceRecordId: string): Promise<void>;
    /**
     * 根据任务ID列表查找考勤记录
     */
    findByTaskIds(taskIds: string[]): Promise<AttendanceRecord[]>;
    /**
     * 根据条件查找所有考勤记录
     */
    findAllWithConditions(conditions: Record<string, any>): Promise<AttendanceRecord[]>;
    /**
     * 关闭考勤记录
     */
    closeAttendanceRecord(attendanceRecordId: string): Promise<void>;
    /**
     * 转换为考勤记录对象
     */
    private convertToAttendanceRecord;
}
export {};
//# sourceMappingURL=attendance-repository.d.ts.map