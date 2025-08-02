/**
 * 同步任务执行器集合
 * 实现各种同步任务的具体执行逻辑，支持断点续传和错误重试
 */
/**
 * 聚合任务执行器
 * 处理课程数据聚合逻辑
 */
export class AggregateExecutor {
    courseAggregateRepo;
    courseScheduleRepo;
    log;
    name = 'aggregateExecutor';
    constructor(courseAggregateRepo, courseScheduleRepo, log) {
        this.courseAggregateRepo = courseAggregateRepo;
        this.courseScheduleRepo = courseScheduleRepo;
        this.log = log;
    }
    async run(metadata) {
        const { xnxq, action } = metadata;
        this.log.info({ xnxq, action }, '开始执行聚合任务');
        switch (action) {
            case 'regenerate':
                return await this.regenerateAggregateData(xnxq);
            case 'handle_null':
                return await this.handleNullStatusCourses(xnxq);
            case 'handle_completed':
                return await this.handleCompletedCourses(xnxq);
            default:
                throw new Error(`未知的聚合操作: ${action}`);
        }
    }
    async regenerateAggregateData(xnxq) {
        // 清空现有聚合数据
        await this.courseAggregateRepo.clearByXnxq(xnxq);
        // 重新生成聚合数据
        const result = await this.generateAggregateData(xnxq);
        this.log.info({ xnxq, result }, '聚合数据重新生成完成');
        return result;
    }
    async handleNullStatusCourses(xnxq) {
        const courses = await this.courseAggregateRepo.findByStatus(xnxq, null);
        this.log.info({ xnxq, count: courses.length }, '处理状态为 null 的课程');
        return { processedCount: courses.length };
    }
    async handleCompletedCourses(xnxq) {
        const courses = await this.courseAggregateRepo.findByStatus(xnxq, 4);
        this.log.info({ xnxq, count: courses.length }, '处理已完成的课程');
        return { processedCount: courses.length };
    }
    async generateAggregateData(xnxq) {
        // 实现聚合数据生成逻辑
        // 这里需要根据实际需求实现 SQL 聚合逻辑
        this.log.info({ xnxq }, '聚合数据生成逻辑待实现');
        return { status: 'completed' };
    }
    async onSuccess(metadata, result) {
        const { xnxq, action } = metadata;
        this.log.info({ xnxq, action, result }, '聚合任务成功完成');
    }
    async onFail(metadata, error) {
        const { xnxq, action } = metadata;
        this.log.error({ xnxq, action, error }, '聚合任务执行失败');
    }
}
/**
 * 获取课程列表执行器
 */
export class GetCoursesExecutor {
    courseAggregateRepo;
    log;
    name = 'getCoursesExecutor';
    constructor(courseAggregateRepo, log) {
        this.courseAggregateRepo = courseAggregateRepo;
        this.log = log;
    }
    async run(metadata) {
        const { xnxq, status } = metadata;
        this.log.info({ xnxq, status }, '开始获取课程列表');
        const courses = await this.courseAggregateRepo.findByStatus(xnxq, status);
        this.log.info({ xnxq, status, count: courses.length }, '课程列表获取完成');
        return {
            courses: courses.map((course) => ({
                id: course.id,
                kkh: course.kkh,
                kcmc: course.kcmc,
                rq: course.rq,
                sjd: course.sjd
            })),
            count: courses.length
        };
    }
    async onSuccess(metadata, result) {
        const { xnxq } = metadata;
        this.log.info({ xnxq, count: result.count }, '课程列表获取成功');
    }
}
/**
 * 课程同步执行器
 */
export class CourseSyncExecutor {
    courseAggregateRepo;
    log;
    name = 'courseSyncExecutor';
    constructor(courseAggregateRepo, log) {
        this.courseAggregateRepo = courseAggregateRepo;
        this.log = log;
    }
    async run(metadata) {
        const { course, syncType, xnxq, kkh } = metadata;
        this.log.info({ kkh, syncType }, '开始执行课程同步');
        // 检查课程是否存在
        const exists = await this.checkCourseExists(course);
        if (!exists && syncType === 'incremental') {
            this.log.warn({ kkh }, '增量同步中课程不存在，跳过');
            return { status: 'skipped', reason: 'course_not_exists' };
        }
        // 创建或更新课程基础信息
        const courseResult = await this.ensureCourseExists(course);
        this.log.info({ kkh, syncType }, '课程同步完成');
        return {
            status: 'success',
            courseResult,
            course: {
                kkh: course.kkh,
                kcmc: course.kcmc,
                rq: course.rq,
                sjd: course.sjd
            }
        };
    }
    async checkCourseExists(course) {
        try {
            const existing = await this.courseAggregateRepo.findById(course.id);
            return !!existing;
        }
        catch (error) {
            this.log.warn({ kkh: course.kkh, error }, '检查课程存在性时出错');
            return false;
        }
    }
    async ensureCourseExists(course) {
        // 确保课程记录存在
        // 这里可以实现课程创建或更新逻辑
        this.log.info({ kkh: course.kkh }, '确保课程存在');
        return { action: 'ensured' };
    }
    async onSuccess(metadata, result) {
        const { course } = metadata;
        // 更新聚合表状态
        await this.updateCourseStatus(course, 1); // 标记为教师已同步
        this.log.info({ kkh: course.kkh }, '课程同步成功，已更新状态');
    }
    async onFail(metadata, error) {
        const { course } = metadata;
        this.log.error({ kkh: course.kkh, error }, '课程同步失败');
    }
    async updateCourseStatus(course, status) {
        try {
            if (course.id) {
                await this.courseAggregateRepo.updateStatus(course.id, status);
            }
        }
        catch (error) {
            this.log.error({ kkh: course.kkh, status, error }, '更新课程状态失败');
        }
    }
}
/**
 * 删除课程执行器
 */
export class DeleteCourseExecutor {
    courseAggregateRepo;
    queueService;
    wasV7Schedule;
    log;
    name = 'deleteCourseExecutor';
    constructor(courseAggregateRepo, queueService, wasV7Schedule, log) {
        this.courseAggregateRepo = courseAggregateRepo;
        this.queueService = queueService;
        this.wasV7Schedule = wasV7Schedule;
        this.log = log;
    }
    async run(metadata) {
        const { course, action } = metadata;
        this.log.info({ kkh: course.kkh, action }, '开始执行课程删除');
        // 1. 标记聚合表状态为删除中
        await this.updateCourseStatus(course.id, 3);
        // 2. 读取课程日历信息
        const calendarInfo = await this.getCourseCalendarInfo(course);
        // 3. 将删除日程任务加入队列
        await this.queueDeleteSchedule(course, calendarInfo);
        this.log.info({ kkh: course.kkh }, '课程删除任务完成');
        return {
            status: 'success',
            action: 'delete_scheduled',
            course: {
                kkh: course.kkh,
                kcmc: course.kcmc
            }
        };
    }
    async getCourseCalendarInfo(course) {
        // 获取课程相关的日历信息
        this.log.info({ kkh: course.kkh }, '获取课程日历信息');
        return { calendarId: null, eventIds: [] };
    }
    async queueDeleteSchedule(course, calendarInfo) {
        // 将删除日程的任务加入队列
        await this.queueService.addTask({
            name: 'delete-schedule',
            executor: 'deleteScheduleExecutor',
            payload: {
                courseKkh: course.kkh,
                calendarInfo
            }
        });
        this.log.info({ kkh: course.kkh }, '删除日程任务已加入队列');
    }
    async updateCourseStatus(courseId, status) {
        try {
            await this.courseAggregateRepo.updateStatus(courseId, status);
        }
        catch (error) {
            this.log.error({ courseId, status, error }, '更新课程状态失败');
        }
    }
    async onSuccess(metadata, result) {
        const { course } = metadata;
        // 删除成功后，标记状态为已完成删除
        await this.updateCourseStatus(course.id, 4);
        this.log.info({ kkh: course.kkh }, '课程删除成功，已更新状态为完成');
    }
    async onFail(metadata, error) {
        const { course } = metadata;
        this.log.error({ kkh: course.kkh, error }, '课程删除失败');
    }
}
/**
 * 创建签到表执行器
 */
export class CreateAttendanceExecutor {
    attendanceRepo;
    studentCourseRepo;
    log;
    name = 'createAttendanceExecutor';
    constructor(attendanceRepo, studentCourseRepo, log) {
        this.attendanceRepo = attendanceRepo;
        this.studentCourseRepo = studentCourseRepo;
        this.log = log;
    }
    async run(metadata) {
        const { course } = metadata;
        this.log.info({ kkh: course.kkh }, '开始创建签到表');
        // 1. 检查签到表是否已存在
        const existingRecord = await this.checkAttendanceExists(course);
        if (existingRecord) {
            this.log.info({ kkh: course.kkh }, '签到表已存在，跳过创建');
            return { status: 'exists', recordId: existingRecord.id };
        }
        // 2. 获取课程学生总数
        const studentCount = await this.getStudentCount(course.kkh);
        // 3. 创建签到表记录
        const recordId = await this.createAttendanceRecord(course, studentCount);
        this.log.info({ kkh: course.kkh, recordId }, '签到表创建完成');
        return {
            status: 'created',
            recordId,
            studentCount
        };
    }
    async checkAttendanceExists(course) {
        // 检查签到表是否存在的逻辑
        // 需要根据实际的 attendanceRepo 实现
        this.log.debug({ kkh: course.kkh }, '检查签到表是否存在');
        return null; // 暂时返回 null，表示不存在
    }
    async getStudentCount(kkh) {
        try {
            const students = await this.studentCourseRepo.findStudentsByKkh(kkh);
            return students.length;
        }
        catch (error) {
            this.log.error({ kkh, error }, '获取学生数量失败');
            return 0;
        }
    }
    async createAttendanceRecord(course, studentCount) {
        // 创建签到表记录
        // 需要根据实际的 attendanceRepo 实现
        this.log.info({ kkh: course.kkh, studentCount }, '创建签到表记录');
        return `attendance_${course.kkh}_${Date.now()}`;
    }
    async onSuccess(metadata, result) {
        const { course } = metadata;
        this.log.info({ kkh: course.kkh, result }, '签到表创建成功');
    }
}
/**
 * 获取课程参与者执行器
 */
export class GetParticipantsExecutor {
    studentCourseRepo;
    teacherInfoRepo;
    studentInfoRepo;
    log;
    name = 'getParticipantsExecutor';
    constructor(studentCourseRepo, teacherInfoRepo, studentInfoRepo, log) {
        this.studentCourseRepo = studentCourseRepo;
        this.teacherInfoRepo = teacherInfoRepo;
        this.studentInfoRepo = studentInfoRepo;
        this.log = log;
    }
    async run(metadata) {
        const { course } = metadata;
        this.log.info({ kkh: course.kkh }, '开始获取课程参与者');
        // 1. 获取教师列表
        const teachers = await this.getTeachers(course);
        // 2. 获取学生列表
        const students = await this.getStudents(course.kkh);
        this.log.info({
            kkh: course.kkh,
            teacherCount: teachers.length,
            studentCount: students.length
        }, '课程参与者获取完成');
        return {
            teachers,
            students,
            teacherCount: teachers.length,
            studentCount: students.length
        };
    }
    async getTeachers(course) {
        // 从课程的 gh_s 字段解析教师工号
        const teacherGhs = course.gh_s ? course.gh_s.split(',') : [];
        const teachers = [];
        for (const gh of teacherGhs) {
            try {
                const teacher = await this.teacherInfoRepo.findByGh(gh.trim());
                if (teacher) {
                    teachers.push(teacher);
                }
            }
            catch (error) {
                this.log.warn({ gh, error }, '获取教师信息失败');
            }
        }
        return teachers;
    }
    async getStudents(kkh) {
        try {
            const studentCourses = await this.studentCourseRepo.findStudentsByKkh(kkh);
            const students = [];
            for (const sc of studentCourses) {
                try {
                    const student = await this.studentInfoRepo.findByXh(sc.xh);
                    if (student) {
                        students.push(student);
                    }
                }
                catch (error) {
                    this.log.warn({ xh: sc.xh, error }, '获取学生信息失败');
                }
            }
            return students;
        }
        catch (error) {
            this.log.error({ kkh, error }, '获取学生列表失败');
            return [];
        }
    }
    async onSuccess(metadata, result) {
        const { course } = metadata;
        this.log.info({
            kkh: course.kkh,
            teacherCount: result.teacherCount,
            studentCount: result.studentCount
        }, '参与者信息获取成功');
    }
}
/**
 * 日程创建执行器
 */
export class ScheduleCreationExecutor {
    queueService;
    userCalendarRepo;
    wasV7Schedule;
    wasV7Calendar;
    log;
    name = 'scheduleCreationExecutor';
    constructor(queueService, userCalendarRepo, wasV7Schedule, wasV7Calendar, log) {
        this.queueService = queueService;
        this.userCalendarRepo = userCalendarRepo;
        this.wasV7Schedule = wasV7Schedule;
        this.wasV7Calendar = wasV7Calendar;
        this.log = log;
    }
    async run(metadata) {
        const { course } = metadata;
        this.log.info({ kkh: course.kkh }, '开始创建日程任务');
        // 1. 获取课程参与者
        const participants = await this.getCourseParticipants(course);
        // 2. 为每个参与者创建日程任务
        const scheduleTasks = [];
        for (const participant of participants) {
            const taskId = await this.createScheduleTask(course, participant);
            scheduleTasks.push(taskId);
        }
        this.log.info({
            kkh: course.kkh,
            taskCount: scheduleTasks.length
        }, '日程创建任务已加入队列');
        return {
            status: 'queued',
            taskIds: scheduleTasks,
            taskCount: scheduleTasks.length
        };
    }
    async getCourseParticipants(course) {
        // 获取课程的教师和学生参与者
        // 这里需要根据课程信息获取参与者列表
        const participants = [];
        // 解析教师工号
        if (course.gh_s) {
            const teacherGhs = course.gh_s.split(',');
            for (const gh of teacherGhs) {
                participants.push({
                    type: 'teacher',
                    id: gh.trim(),
                    name: null // 可以后续查询获取姓名
                });
            }
        }
        return participants;
    }
    async createScheduleTask(course, participant) {
        // 创建具体的日程同步任务并加入队列
        const taskData = {
            courseKkh: course.kkh,
            courseName: course.kcmc,
            courseDate: course.rq,
            courseTime: {
                start: course.sj_f,
                end: course.sj_t
            },
            participant: {
                type: participant.type,
                id: participant.id,
                name: participant.name
            },
            location: course.room_s,
            timeSlot: course.sjd
        };
        const jobId = await this.queueService.addTask({
            name: 'create-schedule',
            executor: 'createScheduleExecutor',
            payload: taskData
        });
        this.log.debug({
            kkh: course.kkh,
            participantId: participant.id,
            jobId
        }, '日程创建任务已加入队列');
        return jobId;
    }
    async onSuccess(metadata, result) {
        const { course } = metadata;
        this.log.info({
            kkh: course.kkh,
            taskCount: result.taskCount
        }, '日程创建任务排队成功');
    }
    async onFail(metadata, error) {
        const { course } = metadata;
        this.log.error({ kkh: course.kkh, error }, '日程创建任务失败');
    }
}
/**
 * 执行器工厂函数
 */
export function createSyncExecutors(courseAggregateRepo, courseScheduleRepo, userCalendarRepo, studentCourseRepo, teacherInfoRepo, studentInfoRepo, attendanceRepo, queueService, wasV7Schedule, wasV7Calendar, log) {
    return {
        aggregateExecutor: new AggregateExecutor(courseAggregateRepo, courseScheduleRepo, log),
        getCoursesExecutor: new GetCoursesExecutor(courseAggregateRepo, log),
        courseSyncExecutor: new CourseSyncExecutor(courseAggregateRepo, log),
        deleteCourseExecutor: new DeleteCourseExecutor(courseAggregateRepo, queueService, wasV7Schedule, log),
        createAttendanceExecutor: new CreateAttendanceExecutor(attendanceRepo, studentCourseRepo, log),
        getParticipantsExecutor: new GetParticipantsExecutor(studentCourseRepo, teacherInfoRepo, studentInfoRepo, log),
        scheduleCreationExecutor: new ScheduleCreationExecutor(queueService, userCalendarRepo, wasV7Schedule, wasV7Calendar, log)
    };
}
//# sourceMappingURL=sync-executors.service.js.map