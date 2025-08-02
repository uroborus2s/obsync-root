/**
 * 课程服务
 * 处理课程相关的业务逻辑
 */
import { Logger } from '@stratix/core';
import { AttendanceRepository } from '../repositories/attendance-repository.js';
import { CourseAggregateRepository } from '../repositories/course-aggregate-repository.js';
import { TeacherInfoRepository } from '../repositories/teacher-info-repository.js';
/**
 * 课程教师信息接口
 */
export interface CourseTeacherInfo {
    /** 教师工号 */
    gh: string;
    /** 教师姓名 */
    xm: string;
    /** 所属单位代码 */
    ssdwdm?: string;
    /** 所属单位名称 */
    ssdwmc?: string;
    /** 职称 */
    zc?: string;
}
/**
 * 课程服务类
 */
export declare class CourseService {
    private log;
    private attendanceRepo;
    private courseAggregateRepo;
    private teacherInfoRepo;
    constructor(log: Logger, attendanceRepo: AttendanceRepository, courseAggregateRepo: CourseAggregateRepository, teacherInfoRepo: TeacherInfoRepository);
    /**
     * 根据考勤记录ID获取课程的授课教师信息
     */
    getCourseTeachers(attendanceRecordId: string): Promise<CourseTeacherInfo[]>;
    /**
     * 获取课程的主要授课教师（第一个教师）
     */
    getPrimaryCourseTeacher(attendanceRecordId: string): Promise<CourseTeacherInfo | null>;
}
//# sourceMappingURL=course.service.d.ts.map