/**
 * 学生信息Repository
 * 专门管理out_xsxx表的CRUD操作
 */
import { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { ExtendedDatabase, StudentInfoEntity } from './types.js';
/**
 * 学生信息Repository实现
 */
export declare class StudentInfoRepository extends BaseRepository {
    private db;
    constructor(db: Kysely<ExtendedDatabase>, log: Logger);
    /**
     * 根据学号查询学生信息
     */
    findByXh(xh: string): Promise<StudentInfoEntity | null>;
    /**
     * 根据ID查询学生信息
     */
    findById(id: string): Promise<StudentInfoEntity | null>;
    /**
     * 批量根据学号查询学生信息
     */
    findByXhs(xhs: string[]): Promise<StudentInfoEntity[]>;
    /**
     * 根据班级查询学生信息
     */
    findByClass(bjdm: string): Promise<StudentInfoEntity[]>;
    /**
     * 根据学院查询学生信息
     */
    findByCollege(xydm: string): Promise<StudentInfoEntity[]>;
    /**
     * 根据专业查询学生信息
     */
    findByMajor(zydm: string): Promise<StudentInfoEntity[]>;
    /**
     * 根据年级查询学生信息
     */
    findByGrade(sznj: string): Promise<StudentInfoEntity[]>;
    /**
     * 根据学生类型查询学生信息
     */
    findByType(lx: number): Promise<StudentInfoEntity[]>;
    /**
     * 根据条件查询学生信息
     */
    findByConditions(conditions: {
        xh?: string;
        xm?: string;
        xydm?: string;
        zydm?: string;
        bjdm?: string;
        sznj?: string;
        lx?: number;
        zt?: string;
    }): Promise<StudentInfoEntity[]>;
    /**
     * 搜索学生信息（模糊查询）
     */
    searchStudents(keyword: string): Promise<StudentInfoEntity[]>;
    /**
     * 获取学生统计信息
     */
    getStudentStats(): Promise<{
        total: number;
        undergraduate: number;
        graduate: number;
        byCollege: Array<{
            xydm: string;
            xymc: string;
            count: number;
        }>;
        byGrade: Array<{
            sznj: string;
            count: number;
        }>;
    }>;
    /**
     * 检查学号是否存在
     */
    existsByXh(xh: string): Promise<boolean>;
    /**
     * 获取班级学生列表
     */
    getClassStudents(bjdm: string): Promise<Array<{
        xh: string;
        xm: string;
        xb: string;
        sjh: string;
    }>>;
    /**
     * 获取学院专业班级树形结构
     */
    getCollegeMajorClassTree(): Promise<Array<{
        xydm: string;
        xymc: string;
        majors: Array<{
            zydm: string;
            zymc: string;
            classes: Array<{
                bjdm: string;
                bjmc: string;
                studentCount: number;
            }>;
        }>;
    }>>;
}
//# sourceMappingURL=student-info-repository.d.ts.map