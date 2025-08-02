/**
 * 课程服务
 * 处理课程相关的业务逻辑
 */
/**
 * 课程服务类
 */
export class CourseService {
    db;
    log;
    courseScheduleRepo;
    attendanceRepo;
    courseAggregateRepo;
    teacherInfoRepo;
    constructor(db, log, courseScheduleRepo, attendanceRepo, courseAggregateRepo, teacherInfoRepo) {
        this.db = db;
        this.log = log;
        this.courseScheduleRepo = courseScheduleRepo;
        this.attendanceRepo = attendanceRepo;
        this.courseAggregateRepo = courseAggregateRepo;
        this.teacherInfoRepo = teacherInfoRepo;
    }
    /**
     * 根据考勤记录ID获取课程的授课教师信息
     */
    async getCourseTeachers(attendanceRecordId) {
        try {
            this.log.debug({ attendanceRecordId }, '获取课程授课教师信息');
            // 获取考勤记录
            const attendanceRecord = await this.attendanceRepo.getAttendanceRecord(attendanceRecordId);
            if (!attendanceRecord) {
                throw new Error('考勤记录不存在');
            }
            // 通过CourseAggregateRepository获取教师信息
            const courseAggregates = await this.courseAggregateRepo.findByConditions({
                kkh: attendanceRecord.kkh
            });
            if (courseAggregates.length === 0) {
                throw new Error('未找到课程的聚合信息');
            }
            // 取第一条记录获取教师信息
            const courseAggregate = courseAggregates[0];
            if (!courseAggregate.gh_s || !courseAggregate.xm_s) {
                throw new Error('未找到课程的教师信息');
            }
            // 解析教师工号串和姓名串（可能有多个教师，用逗号分隔）
            const teacherIds = courseAggregate.gh_s
                .split(',')
                .map((id) => id.trim())
                .filter((id) => id);
            const teacherNames = courseAggregate.xm_s
                .split(',')
                .map((name) => name.trim())
                .filter((name) => name);
            if (teacherIds.length === 0) {
                throw new Error('课程没有分配教师');
            }
            // 构建教师信息列表
            const teachers = [];
            for (let i = 0; i < teacherIds.length; i++) {
                const teacherId = teacherIds[i];
                const teacherName = teacherNames[i] || '未知教师';
                // 尝试获取教师详细信息
                const teacherInfo = await this.teacherInfoRepo.findByGh(teacherId);
                teachers.push({
                    gh: teacherId,
                    xm: teacherName,
                    ssdwdm: teacherInfo?.ssdwdm || undefined,
                    ssdwmc: teacherInfo?.ssdwmc || undefined,
                    zc: teacherInfo?.zc || undefined
                });
            }
            this.log.info({
                attendanceRecordId,
                kkh: attendanceRecord.kkh,
                teacherCount: teachers.length,
                teachers: teachers.map((t) => ({ gh: t.gh, xm: t.xm }))
            }, '成功获取课程授课教师信息');
            return teachers;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                attendanceRecordId
            }, '获取课程授课教师信息失败');
            throw error;
        }
    }
    /**
     * 获取课程的主要授课教师（第一个教师）
     */
    async getPrimaryCourseTeacher(attendanceRecordId) {
        try {
            const teachers = await this.getCourseTeachers(attendanceRecordId);
            return teachers.length > 0 ? teachers[0] : null;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                attendanceRecordId
            }, '获取主要授课教师信息失败');
            return null;
        }
    }
}
//# sourceMappingURL=course.service.js.map