/**
 * 教师信息Repository
 * 专门管理out_jsxx表的CRUD操作
 */
import { Logger } from '@stratix/core';
import type { DatabaseProvider } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { TeacherInfoEntity } from './types.js';
/**
 * 教师信息Repository实现
 */
export declare class TeacherInfoRepository extends BaseRepository {
    private db;
    constructor(databaseProvider: DatabaseProvider, log: Logger);
    /**
     * 根据工号查询教师信息
     */
    findByGh(gh: string): Promise<TeacherInfoEntity | null>;
    /**
     * 根据ID查询教师信息
     */
    findById(id: string): Promise<TeacherInfoEntity | null>;
    /**
     * 批量根据工号查询教师信息
     */
    findByGhs(ghs: string[]): Promise<TeacherInfoEntity[]>;
    /**
     * 根据部门查询教师信息
     */
    findByDepartment(ssdwdm: string): Promise<TeacherInfoEntity[]>;
    /**
     * 根据职称查询教师信息
     */
    findByTitle(zc: string): Promise<TeacherInfoEntity[]>;
    /**
     * 根据性别查询教师信息
     */
    findByGender(xb: string): Promise<TeacherInfoEntity[]>;
    /**
     * 根据条件查询教师信息
     */
    findByConditions(conditions: {
        gh?: string;
        xm?: string;
        ssdwdm?: string;
        zc?: string;
        xb?: string;
        zt?: string;
    }): Promise<TeacherInfoEntity[]>;
    /**
     * 搜索教师（根据姓名或工号）
     */
    searchTeachers(keyword: string): Promise<TeacherInfoEntity[]>;
    /**
     * 获取教师统计信息
     */
    getTeacherStats(): Promise<{
        total: number;
        byDepartment: Array<{
            ssdwdm: string;
            ssdwmc: string;
            count: number;
        }>;
        byTitle: Array<{
            zc: string;
            count: number;
        }>;
        byGender: Array<{
            xb: string;
            count: number;
        }>;
    }>;
    /**
     * 检查工号是否存在
     */
    existsByGh(gh: string): Promise<boolean>;
    /**
     * 获取部门教师列表
     */
    getDepartmentTeachers(ssdwdm: string): Promise<Array<{
        gh: string;
        xm: string;
        zc: string;
        sjh: string;
    }>>;
    /**
     * 获取部门树状结构
     */
    getDepartmentTree(): Promise<Array<{
        ssdwdm: string;
        ssdwmc: string;
        teacherCount: number;
        titles: Array<{
            zc: string;
            count: number;
        }>;
    }>>;
}
//# sourceMappingURL=teacher-info-repository.d.ts.map