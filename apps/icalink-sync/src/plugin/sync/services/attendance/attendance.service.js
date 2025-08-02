/**
 * 重构后的签到服务
 * 使用仓库层进行数据访问，遵循良好的架构设计原则
 */
import { AttendanceStatus } from '../../types/attendance.js';
import { formatToRFC3339 } from '../../utils/time.js';
/**
 * 签到服务
 */
export class AttendanceService {
    courseAggregateRepo;
    studentInfoRepo;
    studentAttendanceRepo;
    pageUrlService;
    attendanceRepo;
    constructor(courseAggregateRepo, studentInfoRepo, studentAttendanceRepo, pageUrlService, attendanceRepo) {
        this.courseAggregateRepo = courseAggregateRepo;
        this.studentInfoRepo = studentInfoRepo;
        this.studentAttendanceRepo = studentAttendanceRepo;
        this.pageUrlService = pageUrlService;
        this.attendanceRepo = attendanceRepo;
    }
    /**
     * 创建考勤记录
     * @param taskId 任务ID
     * @param courseInfo 课程信息
     * @param totalCount 总人数
     * @returns 考勤记录
     */
    async createAttendanceRecord(taskId, courseInfo, totalCount) {
        const now = new Date();
        const attendanceRecordData = {
            id: taskId,
            kkh: courseInfo.kkh,
            xnxq: courseInfo.xnxq,
            jxz: courseInfo.jxz,
            rq: courseInfo.rq,
            jc_s: courseInfo.jc_s,
            kcmc: courseInfo.kcmc,
            sj_f: courseInfo.sj_f,
            sj_t: courseInfo.sj_t,
            sjd: courseInfo.sjd,
            zc: courseInfo.zc,
            lq: courseInfo.lq,
            total_count: totalCount,
            checkin_count: 0,
            absent_count: 0,
            leave_count: 0,
            checkin_url: this.pageUrlService.getCheckInUrl(taskId),
            leave_url: this.pageUrlService.getLeaveUrl(taskId),
            checkin_token: '',
            status: 'active',
            auto_start_time: formatToRFC3339(courseInfo.rq, courseInfo.sj_f),
            auto_close_time: formatToRFC3339(courseInfo.rq, courseInfo.sj_t),
            created_at: now,
            updated_at: now
        };
        return await this.attendanceRepo.createAttendanceRecord(attendanceRecordData);
    }
    /**
     * 获取课程信息
     * @param kkh 开课号
     * @param xnxq 学年学期
     * @param rq 日期
     * @param sjd 时间段
     * @returns 课程信息
     */
    async getCourseInfo(kkh, xnxq, rq, sjd) {
        try {
            // 使用聚合任务仓库获取课程信息
            const courseAggregate = await this.courseAggregateRepo.findByConditions({
                kkh,
                xnxq,
                rq,
                sjd
            });
            if (!courseAggregate || courseAggregate.length === 0) {
                return null;
            }
            const course = courseAggregate[0];
            return {
                kkh: course.kkh,
                xnxq: course.xnxq,
                jxz: course.jxz ? parseInt(course.jxz) : null,
                zc: course.zc || null,
                kcmc: course.kcmc,
                rq: course.rq,
                jc_s: course.jc_s,
                room_s: course.room_s,
                gh_s: course.gh_s || '',
                xm_s: course.xm_s || '',
                sj_f: course.sj_f,
                sj_t: course.sj_t,
                sjd: course.sjd
            };
        }
        catch (error) {
            console.error('获取课程信息失败:', error);
            return null;
        }
    }
    /**
     * 获取学生信息
     * @param studentId 学号
     * @returns 学生信息
     */
    async getStudentInfo(studentId) {
        try {
            // 使用学生信息仓库获取学生信息
            const student = await this.studentInfoRepo.findByXh(studentId);
            if (!student) {
                return null;
            }
            return {
                xh: student.xh || studentId,
                xm: student.xm || '',
                xydm: student.xydm || undefined,
                xymc: student.xymc || undefined,
                zydm: student.zydm || undefined,
                zymc: student.zymc || undefined,
                bjdm: student.bjdm || undefined,
                bjmc: student.bjmc || undefined,
                sjh: student.sjh || undefined,
                email: student.email || undefined
            };
        }
        catch (error) {
            console.error('获取学生信息失败:', error);
            return null;
        }
    }
    /**
     * 获取课程签到信息
     * @param taskId 任务ID
     * @param studentId 学号（可选）
     * @returns 课程签到信息
     */
    async getCourseAttendanceInfo(taskId, studentId) {
        // 获取考勤记录
        const attendanceRecord = await this.attendanceRepo.getAttendanceRecord(taskId);
        if (!attendanceRecord) {
            throw new Error('考勤记录不存在');
        }
        // 检查考勤记录状态
        if (attendanceRecord.status === 'closed') {
            throw new Error('签到已关闭');
        }
        // 检查是否过期
        if (attendanceRecord.auto_close_time &&
            new Date() > new Date(attendanceRecord.auto_close_time)) {
            throw new Error('签到已过期');
        }
        // 获取课程信息
        const course = await this.getCourseInfo(attendanceRecord.kkh, attendanceRecord.xnxq, attendanceRecord.rq, attendanceRecord.sjd);
        if (!course) {
            throw new Error('课程信息不存在');
        }
        // 获取学生信息
        let student;
        let studentAttendance;
        if (studentId) {
            const studentInfo = await this.getStudentInfo(studentId);
            student = studentInfo || undefined;
            // 获取学生签到记录
            const studentAttendanceRecord = await this.studentAttendanceRepo.getStudentAttendanceByRecordAndStudent(taskId, studentId);
            if (studentAttendanceRecord) {
                studentAttendance = {
                    id: studentAttendanceRecord.id,
                    attendance_record_id: studentAttendanceRecord.attendance_record_id,
                    student_id: studentAttendanceRecord.xh,
                    student_name: studentAttendanceRecord.xm,
                    status: studentAttendanceRecord.status,
                    checkin_time: studentAttendanceRecord.checkin_time || undefined,
                    location: undefined,
                    latitude: undefined,
                    longitude: undefined,
                    accuracy: undefined,
                    remark: studentAttendanceRecord.leave_reason || undefined,
                    created_at: studentAttendanceRecord.created_at,
                    updated_at: studentAttendanceRecord.created_at
                };
            }
        }
        // 计算签到时间窗口
        const courseDate = new Date(attendanceRecord.rq);
        const [startHour, startMinute] = course.sj_f.split(':').map(Number);
        const startTime = new Date(courseDate);
        startTime.setHours(startHour, startMinute - 15, 0, 0); // 提前15分钟开始签到
        const endTime = new Date(courseDate);
        endTime.setHours(startHour, startMinute + 10, 0, 0); // 课程开始后10分钟内可签到
        const now = new Date();
        const canCheckin = now >= startTime &&
            now <= endTime &&
            attendanceRecord.status === 'active' &&
            !studentAttendance;
        return {
            course,
            attendance_record: attendanceRecord,
            student,
            student_attendance: studentAttendance,
            can_checkin: canCheckin,
            checkin_window: {
                start_time: startTime,
                end_time: endTime
            }
        };
    }
    /**
     * 学生签到
     * @param request 签到请求
     * @returns 签到响应
     */
    async checkIn(request) {
        try {
            // 获取考勤记录
            const attendanceRecord = await this.attendanceRepo.getAttendanceRecord(request.token);
            if (!attendanceRecord) {
                throw new Error('考勤记录不存在');
            }
            // 检查考勤记录状态
            if (attendanceRecord.status === 'closed') {
                throw new Error('签到已关闭');
            }
            // 检查学生是否已经签到
            const existingRecord = await this.studentAttendanceRepo.getStudentAttendanceByRecordAndStudent(request.token, request.student_id);
            if (existingRecord) {
                throw new Error('您已经签到过了');
            }
            // 检查签到时间窗口
            const now = new Date();
            const courseDate = new Date(attendanceRecord.rq);
            const [startHour, startMinute] = attendanceRecord.sj_f
                .split(':')
                .map(Number);
            const courseStartTime = new Date(courseDate);
            courseStartTime.setHours(startHour, startMinute, 0, 0);
            const checkinStartTime = new Date(courseStartTime);
            checkinStartTime.setMinutes(checkinStartTime.getMinutes() - 15); // 提前15分钟开始签到
            const checkinEndTime = new Date(courseStartTime);
            checkinEndTime.setMinutes(checkinEndTime.getMinutes() + 10); // 课程开始后10分钟内可签到
            if (now < checkinStartTime) {
                throw new Error('签到尚未开始');
            }
            if (now > checkinEndTime) {
                throw new Error('签到已结束');
            }
            // 判断是否迟到
            const isLate = now > courseStartTime;
            const status = AttendanceStatus.PRESENT;
            // 获取学生信息
            const studentInfo = await this.getStudentInfo(request.student_id);
            const studentName = studentInfo?.xm || '';
            // 创建学生签到记录
            await this.studentAttendanceRepo.createStudentAttendance({
                attendance_record_id: request.token,
                xh: request.student_id,
                xm: studentName,
                status,
                checkin_time: now,
                location_id: 'default', // 默认地点ID
                ip_address: request.location, // 临时使用location字段存储IP
                user_agent: request.remark // 临时使用remark字段存储user_agent
            });
            // 更新考勤记录统计
            const stats = await this.studentAttendanceRepo.getAttendanceStats(request.token);
            await this.attendanceRepo.updateAttendanceRecord(request.token, {
                checkin_count: stats.present_count,
                absent_count: stats.absent_count,
                leave_count: stats.leave_count
            });
            return {
                success: true,
                message: isLate ? '签到成功（迟到）' : '签到成功',
                status,
                checkin_time: now,
                is_late: isLate
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : '签到失败'
            };
        }
    }
    /**
     * 获取考勤统计
     * @param attendanceRecordId 考勤记录ID
     * @returns 考勤统计
     */
    async getAttendanceStats(attendanceRecordId) {
        try {
            const attendanceRecord = await this.attendanceRepo.getAttendanceRecord(attendanceRecordId);
            if (!attendanceRecord) {
                return null;
            }
            const stats = await this.studentAttendanceRepo.getAttendanceStats(attendanceRecordId);
            const checkinRate = attendanceRecord.total_count > 0
                ? (stats.present_count / attendanceRecord.total_count) * 100
                : 0;
            return {
                total_count: attendanceRecord.total_count,
                checkin_count: stats.present_count,
                late_count: 0, // 需要根据签到时间计算
                absent_count: stats.absent_count,
                leave_count: stats.leave_count,
                checkin_rate: Math.round(checkinRate * 100) / 100
            };
        }
        catch (error) {
            console.error('获取考勤统计失败:', error);
            return null;
        }
    }
    /**
     * 搜索学生签到信息
     * @param taskId 任务ID (格式: xnxq-kkh-startDate)
     * @param studentId 学号
     * @returns 学生签到搜索响应
     */
    async searchStudentAttendance(taskId, studentId) {
        try {
            // 获取考勤记录
            const attendanceRecord = await this.attendanceRepo.getAttendanceRecord(taskId);
            if (!attendanceRecord) {
                return {
                    success: false,
                    message: '考勤记录不存在'
                };
            }
            // 获取学生信息
            const studentInfo = await this.getStudentInfo(studentId);
            if (!studentInfo) {
                return {
                    success: false,
                    message: '学生信息不存在'
                };
            }
            // 检查学生是否已经签到
            const studentAttendance = await this.studentAttendanceRepo.getStudentAttendanceByRecordAndStudent(taskId, studentId);
            const hasCheckedIn = studentAttendance !== null &&
                studentAttendance.status === AttendanceStatus.PRESENT;
            // 检查是否在签到时间窗口内
            const now = new Date();
            const autoStartTime = new Date(attendanceRecord.auto_start_time || '');
            const autoCloseTime = new Date(attendanceRecord.auto_close_time || '');
            const isWithinTimeWindow = now >= autoStartTime && now <= autoCloseTime;
            return {
                success: true,
                data: {
                    course: {
                        kcmc: attendanceRecord.kcmc,
                        status: 'not_started', // 需要根据时间判断课程状态
                        course_start_time: `${attendanceRecord.rq} ${attendanceRecord.sj_f}`,
                        course_end_time: `${attendanceRecord.rq} ${attendanceRecord.sj_t}`,
                        room_s: '', // 需要从课程信息中获取
                        xm_s: '', // 需要从课程信息中获取
                        jc_s: attendanceRecord.jc_s
                    },
                    student: {
                        xh: studentInfo.xh,
                        xm: studentInfo.xm,
                        bjmc: studentInfo.bjmc,
                        zymc: studentInfo.zymc
                    },
                    attendance_status: {
                        is_checked_in: hasCheckedIn,
                        status: studentAttendance?.status,
                        checkin_time: studentAttendance?.checkin_time?.toISOString(),
                        can_checkin: isWithinTimeWindow &&
                            !hasCheckedIn &&
                            attendanceRecord.status === 'active',
                        can_leave: isWithinTimeWindow &&
                            !hasCheckedIn &&
                            attendanceRecord.status === 'active',
                        auto_start_time: autoStartTime.toISOString(),
                        auto_close_time: autoCloseTime.toISOString()
                    },
                    stats: {
                        total_count: attendanceRecord.total_count,
                        checkin_count: attendanceRecord.checkin_count,
                        late_count: 0, // TODO: 从数据库获取
                        absent_count: attendanceRecord.absent_count,
                        leave_count: attendanceRecord.leave_count
                    }
                }
            };
        }
        catch (error) {
            console.error('搜索学生签到信息失败:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : '搜索失败'
            };
        }
    }
}
//# sourceMappingURL=attendance.service.js.map