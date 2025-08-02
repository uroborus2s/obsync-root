/**
 * 日程管理服务
 * 负责与WPS API交互，创建、删除、更新日程
 */
import { Logger } from '@stratix/core';
import { ScheduleModule } from '@stratix/was-v7';
import { CourseAggregateEntity } from '../repositories/types.js';
/**
 * 参与者类型
 */
export type ParticipantType = 'teacher' | 'student';
/**
 * 教师信息接口
 */
export interface TeacherInfo {
    gh: string;
    xm: string;
    calendarId: string;
}
/**
 * 学生信息接口
 */
export interface StudentInfo {
    xh: string;
    xm: string;
    calendarId: string;
}
/**
 * 日程创建结果
 */
export interface ScheduleCreateResult {
    success: boolean;
    scheduleId?: string;
    error?: string;
}
/**
 * 日程管理服务
 */
export declare class ScheduleService {
    private scheduleModule;
    private log;
    constructor(scheduleModule: ScheduleModule, log: Logger);
    /**
     * 为教师创建课程日程
     */
    createTeacherSchedule(teacher: TeacherInfo, courseTask: CourseAggregateEntity): Promise<ScheduleCreateResult>;
    /**
     * 为学生创建课程日程
     */
    createStudentSchedule(student: StudentInfo, courseTask: CourseAggregateEntity): Promise<ScheduleCreateResult>;
    /**
     * 批量为学生创建课程日程
     */
    batchCreateStudentSchedules(students: StudentInfo[], courseTask: CourseAggregateEntity): Promise<ScheduleCreateResult[]>;
    /**
     * 删除日程
     */
    deleteSchedule(calendarId: string, eventId: string): Promise<boolean>;
    /**
     * 构建日程数据
     */
    private buildScheduleData;
    /**
     * 构建日程描述
     */
    private buildDescription;
    /**
     * 解析日期时间
     */
    private parseDateTime;
}
//# sourceMappingURL=schedule.service.d.ts.map