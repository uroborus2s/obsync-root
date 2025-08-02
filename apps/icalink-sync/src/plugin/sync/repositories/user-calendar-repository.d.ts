/**
 * 用户日历仓库
 * 处理user_calendar表的数据操作
 */
import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { ExtendedDatabase, UserCalendarEntity } from './index.js';
/**
 * 创建用户日历参数
 */
export interface CreateUserCalendarParams {
    wpsId?: string;
    xgh: string;
    name: string;
    calendar_id: string;
    status?: 'normal';
}
/**
 * 关联日历ID和学号参数
 */
export interface AssociateCalendarParams {
    xgh: string;
    calendar_id: string;
    name?: string;
    wpsId?: string;
    status?: 'normal';
}
/**
 * 更新用户日历参数
 */
export interface UpdateUserCalendarParams {
    wpsId?: string;
    name?: string;
    calendar_id?: string;
    status?: 'normal';
}
/**
 * 用户日历仓库
 */
export declare class UserCalendarRepository {
    private db;
    private log;
    constructor(db: Kysely<ExtendedDatabase>, log: Logger);
    /**
     * 根据学号/工号获取用户日历信息
     */
    findByXgh(xgh: string): Promise<UserCalendarEntity | null>;
    /**
     * 根据WPS用户ID获取用户日历信息
     */
    findByWpsId(wpsId: string): Promise<UserCalendarEntity | null>;
    /**
     * 批量获取用户日历信息
     */
    findByXghList(xghList: string[]): Promise<UserCalendarEntity[]>;
    /**
     * 创建用户日历记录
     */
    create(params: CreateUserCalendarParams): Promise<UserCalendarEntity>;
    /**
     * 更新用户日历记录
     */
    updateByXgh(xgh: string, params: UpdateUserCalendarParams): Promise<boolean>;
    /**
     * 删除用户日历记录（软删除，设置状态）
     */
    deleteByXgh(xgh: string): Promise<boolean>;
    /**
     * 检查用户是否有有效的日历
     */
    hasValidCalendar(xgh: string): Promise<boolean>;
    /**
     * 获取所有有效的用户日历
     */
    findAllValid(): Promise<UserCalendarEntity[]>;
    /**
     * 关联日历ID和学号
     * 如果记录已存在则更新，不存在则创建
     */
    associateCalendar(params: AssociateCalendarParams): Promise<UserCalendarEntity>;
    /**
     * 批量关联日历ID和学号
     */
    batchAssociateCalendar(associationList: AssociateCalendarParams[]): Promise<UserCalendarEntity[]>;
    /**
     * 取消学号的日历关联（清空calendar_id）
     */
    dissociateCalendar(xgh: string): Promise<boolean>;
    /**
     * 根据calendar_id查找关联的学号
     */
    findXghByCalendarId(calendarId: string): Promise<string | null>;
}
//# sourceMappingURL=user-calendar-repository.d.ts.map