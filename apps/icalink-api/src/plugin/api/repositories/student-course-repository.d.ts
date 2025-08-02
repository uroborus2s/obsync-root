/**
 * 学生课表Repository
 * 专门管理out_jw_kcb_xs表的CRUD操作
 */
import { Logger } from '@stratix/core';
import type { DatabaseProvider } from '@stratix/database';
import { BaseRepository } from './base-repository.js';
import { StudentCourseEntity } from './types.js';
/**
 * 学生课表Repository实现
 */
export declare class StudentCourseRepository extends BaseRepository {
    private db;
    constructor(databaseProvider: DatabaseProvider, log: Logger);
    /**
     * 根据开课号查询学生列表
     */
    findStudentsByKkh(kkh: string): Promise<StudentCourseEntity[]>;
    /**
     * 根据学号查询课表
     */
    findCoursesByXh(xh: string, xnxq?: string): Promise<StudentCourseEntity[]>;
    /**
     * 根据学年学期查询学生课表
     */
    findByXnxq(xnxq: string): Promise<StudentCourseEntity[]>;
    /**
     * 根据开课号和学年学期查询学生列表
     */
    findStudentsByKkhAndXnxq(kkh: string, xnxq: string): Promise<StudentCourseEntity[]>;
    /**
     * 根据课程号和学年学期查询学生详细信息列表
     */
    findStudentsWithDetailsByCourse(kkh: string, xnxq: string): Promise<{
        xh: string;
        xm: string | null;
        bjmc: string | null;
        zymc: string | null;
    }[]>;
    /**
     * 根据课程编号查询学生课表
     */
    findByKcbh(kcbh: string, xnxq?: string): Promise<StudentCourseEntity[]>;
    /**
     * 根据班级查询学生课表
     */
    findByClass(bjdm: string, xnxq?: string): Promise<StudentCourseEntity[]>;
    /**
     * 获取学生课表统计信息
     */
    getStudentCourseStats(xnxq: string): Promise<{
        totalStudents: number;
        totalCourses: number;
        totalRecords: number;
    }>;
    /**
     * 根据条件查询学生课表
     */
    findByConditions(conditions: {
        kkh?: string;
        xh?: string;
        xnxq?: string;
        kcbh?: string;
        pyfadm?: string;
        zt?: string;
    }): Promise<StudentCourseEntity[]>;
    /**
     * 获取课程的学生数量
     */
    getStudentCountByKkh(kkh: string): Promise<number>;
    /**
     * 获取学生的课程数量
     */
    getCourseCountByXh(xh: string, xnxq?: string): Promise<number>;
    /**
     * 批量查询多个开课号的学生列表
     */
    findStudentsByKkhs(kkhs: string[]): Promise<StudentCourseEntity[]>;
    /**
     * 获取学生课表详情（关联学生信息）
     */
    findStudentCourseDetails(conditions: {
        kkh?: string;
        xh?: string;
        xnxq?: string;
    }): Promise<Array<StudentCourseEntity & {
        xm?: string | null;
        bjmc?: string | null;
        xymc?: string | null;
    }>>;
    /**
     * 检查学生是否选修了指定课程
     */
    hasStudentCourse(xh: string, kkh: string, xnxq?: string): Promise<boolean>;
}
//# sourceMappingURL=student-course-repository.d.ts.map