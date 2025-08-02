/**
 * 日程管理服务
 * 负责与WPS API交互，创建、删除、更新日程
 */
/**
 * 日程管理服务
 */
export class ScheduleService {
    scheduleModule;
    log;
    constructor(scheduleModule, log) {
        this.scheduleModule = scheduleModule;
        this.log = log;
    }
    /**
     * 为教师创建课程日程
     */
    async createTeacherSchedule(teacher, courseTask) {
        try {
            const scheduleData = this.buildScheduleData(courseTask, 'teacher', teacher);
            const schedule = await this.scheduleModule.createSchedule({
                calendar_id: teacher.calendarId,
                ...scheduleData
            });
            this.log.info({
                teacherId: teacher.gh,
                teacherName: teacher.xm,
                courseKkh: courseTask.kkh,
                scheduleId: schedule.id
            }, '教师日程创建成功');
            return {
                success: true,
                scheduleId: schedule.id
            };
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                teacherId: teacher.gh,
                courseKkh: courseTask.kkh
            }, '教师日程创建失败');
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * 为学生创建课程日程
     */
    async createStudentSchedule(student, courseTask) {
        try {
            const scheduleData = this.buildScheduleData(courseTask, 'student', student);
            const schedule = await this.scheduleModule.createSchedule({
                calendar_id: student.calendarId,
                ...scheduleData
            });
            this.log.debug({
                studentId: student.xh,
                studentName: student.xm,
                courseKkh: courseTask.kkh,
                scheduleId: schedule.id
            }, '学生日程创建成功');
            return {
                success: true,
                scheduleId: schedule.id
            };
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                studentId: student.xh,
                courseKkh: courseTask.kkh
            }, '学生日程创建失败');
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * 批量为学生创建课程日程
     */
    async batchCreateStudentSchedules(students, courseTask) {
        const results = [];
        for (const student of students) {
            const result = await this.createStudentSchedule(student, courseTask);
            results.push(result);
        }
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;
        this.log.info({
            courseKkh: courseTask.kkh,
            totalStudents: students.length,
            successCount,
            failCount
        }, '批量学生日程创建完成');
        return results;
    }
    /**
     * 删除日程
     */
    async deleteSchedule(calendarId, eventId) {
        try {
            await this.scheduleModule.deleteSchedule({
                calendar_id: calendarId,
                event_id: eventId
            });
            this.log.info({ calendarId, eventId }, '日程删除成功');
            return true;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                calendarId,
                eventId
            }, '日程删除失败');
            return false;
        }
    }
    /**
     * 构建日程数据
     */
    buildScheduleData(courseTask, participantType, participant) {
        const startTime = this.parseDateTime(courseTask.rq, courseTask.sj_f);
        const endTime = this.parseDateTime(courseTask.rq, courseTask.sj_t);
        const description = this.buildDescription(courseTask, participantType);
        return {
            summary: courseTask.kcmc,
            description,
            start_time: {
                datetime: startTime
            },
            end_time: {
                datetime: endTime
            },
            status: 'confirmed',
            transparency: 'opaque',
            visibility: 'default',
            reminders: [
                { minutes: 15 } // 提前15分钟提醒
            ]
        };
    }
    /**
     * 构建日程描述
     */
    buildDescription(courseTask, participantType) {
        const parts = [
            `课程：${courseTask.kcmc}`,
            `时间：${courseTask.sj_f} - ${courseTask.sj_t}`,
            `节次：${courseTask.jc_s}`,
            `教室：${courseTask.room_s || '未指定'}`,
            `学年学期：${courseTask.xnxq}`,
            `教学周：${courseTask.jxz}`,
            `周次：${courseTask.zc}`
        ];
        if (courseTask.xm_s) {
            parts.push(`教师：${courseTask.xm_s}`);
        }
        if (courseTask.sfdk === '1') {
            parts.push('📋 本节课需要考勤');
        }
        return parts.join('\n');
    }
    /**
     * 解析日期时间
     */
    parseDateTime(date, time) {
        // 确保日期格式为 YYYY-MM-DD
        const dateStr = date.includes('T') ? date.split('T')[0] : date;
        // 确保时间格式为 HH:mm:ss
        const timeStr = time.includes('T') ? time.split('T')[1] : time;
        // 组合成 ISO 8601 格式
        return `${dateStr}T${timeStr}+08:00`;
    }
}
//# sourceMappingURL=schedule.service.js.map