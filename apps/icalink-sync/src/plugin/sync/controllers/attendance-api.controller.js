/**
 * 打卡数据接口控制器
 * 提供基于任务列表和打卡数据的HTTP接口
 */
/**
 * 获取任务列表
 * GET /apiv2/attendance-tasks
 */
const getTaskList = async (request, reply) => {
    try {
        const { teacher_id, student_id, xnxq = '2024-2025-2', start_date, end_date, status = 'all', page = 1, page_size = 20 } = request.query;
        const attendanceRepo = request.diScope.resolve('attendanceRepo');
        const courseAggregateRepo = request.diScope.resolve('courseAggregateRepo');
        const teacherInfoRepo = request.diScope.resolve('teacherInfoRepo');
        // 构建查询条件
        const whereConditions = {
            xnxq
        };
        if (start_date) {
            whereConditions.rq = { '>=': start_date };
        }
        if (end_date) {
            whereConditions.rq = { '<=': end_date };
        }
        // 如果指定了教师或学生，需要进一步过滤
        let tasks = [];
        if (teacher_id || student_id) {
            // 根据教师或学生筛选课程
            const courseConditions = { ...whereConditions };
            if (teacher_id) {
                courseConditions.gh_s = { like: `%${teacher_id}%` };
            }
            const courses = await courseAggregateRepo.findByConditions(courseConditions);
            const courseIds = courses.map((c) => `${c.kkh}_${c.rq}_${c.sjd}`);
            if (courseIds.length > 0) {
                tasks = await attendanceRepo.findByTaskIds(courseIds);
            }
        }
        else {
            // 获取所有考勤记录
            tasks = await attendanceRepo.findAllWithConditions(whereConditions);
        }
        // 状态过滤
        if (status !== 'all') {
            const now = new Date();
            tasks = tasks.filter((task) => {
                const courseStartTime = new Date(`${task.rq} ${task.sj_f}`);
                const courseEndTime = new Date(`${task.rq} ${task.sj_t}`);
                switch (status) {
                    case 'not_started':
                        return now < courseStartTime;
                    case 'in_progress':
                        return now >= courseStartTime && now <= courseEndTime;
                    case 'finished':
                        return now > courseEndTime;
                    default:
                        return true;
                }
            });
        }
        // 分页
        const total = tasks.length;
        const offset = (page - 1) * page_size;
        const paginatedTasks = tasks.slice(offset, offset + page_size);
        // 组装返回数据
        const taskDetails = await Promise.all(paginatedTasks.map(async (task) => {
            // 获取课程信息
            const courses = await courseAggregateRepo.findByConditions({
                kkh: task.kkh,
                xnxq: task.xnxq,
                rq: task.rq,
                sjd: task.sjd
            });
            const course = courses[0];
            // 获取教师信息
            const teacherIds = course?.gh_s?.split(',') || [];
            const teachers = await Promise.all(teacherIds.map(async (gh) => {
                const teacher = await teacherInfoRepo.findByGh(gh.trim());
                return {
                    gh: gh.trim(),
                    xm: teacher?.xm || '',
                    ssdwmc: teacher?.ssdwmc
                };
            }));
            // 计算课程状态
            const now = new Date();
            const courseStartTime = new Date(`${task.rq} ${task.sj_f}`);
            const courseEndTime = new Date(`${task.rq} ${task.sj_t}`);
            let course_status;
            if (now < courseStartTime) {
                course_status = 'not_started';
            }
            else if (now <= courseEndTime) {
                course_status = 'in_progress';
            }
            else {
                course_status = 'finished';
            }
            return {
                task_id: task.id,
                course: {
                    kkh: task.kkh,
                    kcmc: task.kcmc,
                    xnxq: task.xnxq,
                    rq: task.rq,
                    sj_f: task.sj_f,
                    sj_t: task.sj_t,
                    jc_s: task.jc_s,
                    room_s: course?.room_s || '',
                    jxz: task.jxz || undefined,
                    lq: task.lq
                },
                teachers,
                attendance_status: {
                    status: task.status,
                    total_count: task.total_count,
                    checkin_count: task.checkin_count,
                    leave_count: task.leave_count,
                    absent_count: task.absent_count,
                    checkin_rate: task.total_count > 0
                        ? Math.round((task.checkin_count / task.total_count) * 100)
                        : 0
                },
                course_status,
                created_at: task.created_at.toISOString(),
                updated_at: task.updated_at.toISOString()
            };
        }));
        const response = {
            success: true,
            data: taskDetails,
            pagination: {
                page,
                page_size,
                total,
                total_pages: Math.ceil(total / page_size)
            }
        };
        reply.send(response);
    }
    catch (error) {
        request.log.error('获取任务列表失败', error);
        reply.status(500).send({
            success: false,
            message: '获取任务列表失败',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
/**
 * 获取打卡数据列表
 * GET /apiv2/attendance-data
 */
const getAttendanceData = async (request, reply) => {
    try {
        const { attendance_record_id, kkh, xnxq = '2024-2025-2', start_date, end_date, student_id, teacher_id, status = 'all', page = 1, page_size = 20 } = request.query;
        const attendanceRepo = request.diScope.resolve('attendanceRepo');
        const studentAttendanceRepo = request.diScope.resolve('studentAttendanceRepo');
        const studentInfoRepo = request.diScope.resolve('studentInfoRepo');
        const courseAggregateRepo = request.diScope.resolve('courseAggregateRepo');
        // 构建查询条件
        const whereConditions = {};
        if (attendance_record_id) {
            whereConditions.attendance_record_id = attendance_record_id;
        }
        if (student_id) {
            whereConditions.student_id = student_id;
        }
        if (status !== 'all') {
            whereConditions.status = status;
        }
        // 获取学生签到记录
        let attendanceRecords = [];
        if (attendance_record_id) {
            // 直接查询指定考勤记录的打卡数据
            attendanceRecords =
                await studentAttendanceRepo.findByAttendanceRecordId(attendance_record_id);
        }
        else {
            // 需要先获取考勤记录，再查询打卡数据
            const attendanceConditions = { xnxq };
            if (kkh) {
                attendanceConditions.kkh = kkh;
            }
            if (start_date) {
                attendanceConditions.rq = { '>=': start_date };
            }
            if (end_date) {
                attendanceConditions.rq = { '<=': end_date };
            }
            // 如果指定了教师，需要通过课程聚合表过滤
            if (teacher_id) {
                const courses = await courseAggregateRepo.findByConditions({
                    ...attendanceConditions,
                    gh_s: { like: `%${teacher_id}%` }
                });
                const attendanceRecordIds = courses.map((c) => `${c.kkh}_${c.rq}_${c.sjd}`);
                if (attendanceRecordIds.length > 0) {
                    attendanceRecords =
                        await studentAttendanceRepo.findByAttendanceRecordIds(attendanceRecordIds);
                }
            }
            else {
                const allAttendanceRecords = await attendanceRepo.findAllWithConditions(attendanceConditions);
                const attendanceRecordIds = allAttendanceRecords.map((ar) => ar.id);
                if (attendanceRecordIds.length > 0) {
                    attendanceRecords =
                        await studentAttendanceRepo.findByAttendanceRecordIds(attendanceRecordIds);
                }
            }
        }
        // 应用学生和状态筛选
        if (student_id) {
            attendanceRecords = attendanceRecords.filter((record) => record.student_id === student_id);
        }
        if (status !== 'all') {
            attendanceRecords = attendanceRecords.filter((record) => record.status === status);
        }
        // 分页
        const total = attendanceRecords.length;
        const offset = (page - 1) * page_size;
        const paginatedRecords = attendanceRecords.slice(offset, offset + page_size);
        // 组装返回数据
        const attendanceDetails = await Promise.all(paginatedRecords.map(async (record) => {
            // 获取学生信息
            const student = await studentInfoRepo.findByXh(record.student_id);
            // 获取考勤记录信息
            const attendanceRecord = await attendanceRepo.getAttendanceRecord(record.attendance_record_id);
            // 获取课程信息
            const courses = await courseAggregateRepo.findByConditions({
                kkh: attendanceRecord?.kkh || '',
                xnxq: attendanceRecord?.xnxq || '',
                rq: attendanceRecord?.rq || '',
                sjd: attendanceRecord?.sjd || 'am'
            });
            const course = courses[0];
            const coordinates = record.latitude && record.longitude
                ? {
                    latitude: record.latitude,
                    longitude: record.longitude,
                    accuracy: record.accuracy
                }
                : undefined;
            return {
                id: record.id,
                attendance_record_id: record.attendance_record_id,
                student: {
                    xh: record.student_id,
                    xm: record.student_name || student?.xm || '',
                    bjmc: student?.bjmc,
                    zymc: student?.zymc
                },
                course: {
                    kkh: attendanceRecord?.kkh || '',
                    kcmc: attendanceRecord?.kcmc || '',
                    rq: attendanceRecord?.rq || '',
                    sj_f: attendanceRecord?.sj_f || '',
                    sj_t: attendanceRecord?.sj_t || '',
                    room_s: course?.room_s || '',
                    jc_s: attendanceRecord?.jc_s || ''
                },
                status: record.status,
                checkin_time: record.checkin_time?.toISOString(),
                location: record.location,
                coordinates,
                remark: record.remark,
                created_at: record.created_at.toISOString(),
                updated_at: record.updated_at.toISOString()
            };
        }));
        const response = {
            success: true,
            data: attendanceDetails,
            pagination: {
                page,
                page_size,
                total,
                total_pages: Math.ceil(total / page_size)
            }
        };
        reply.send(response);
    }
    catch (error) {
        request.log.error('获取打卡数据失败', error);
        reply.status(500).send({
            success: false,
            message: '获取打卡数据失败',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
/**
 * 获取任务详情
 * GET /apiv2/attendance-tasks/:task_id
 */
const getTaskDetail = async (request, reply) => {
    try {
        const { task_id } = request.params;
        const attendanceRepo = request.diScope.resolve('attendanceRepo');
        const courseAggregateRepo = request.diScope.resolve('courseAggregateRepo');
        const teacherInfoRepo = request.diScope.resolve('teacherInfoRepo');
        const studentAttendanceRepo = request.diScope.resolve('studentAttendanceRepo');
        // 获取考勤记录
        const task = await attendanceRepo.getAttendanceRecord(task_id);
        if (!task) {
            reply.status(404).send({
                success: false,
                message: '任务不存在'
            });
            return;
        }
        // 获取课程信息
        const courses = await courseAggregateRepo.findByConditions({
            kkh: task.kkh,
            xnxq: task.xnxq,
            rq: task.rq,
            sjd: task.sjd
        });
        const course = courses[0];
        // 获取教师信息
        const teacherIds = course?.gh_s?.split(',') || [];
        const teachers = await Promise.all(teacherIds.map(async (gh) => {
            const teacher = await teacherInfoRepo.findByGh(gh.trim());
            return {
                gh: gh.trim(),
                xm: teacher?.xm || '',
                ssdwmc: teacher?.ssdwmc
            };
        }));
        // 获取打卡详情
        const studentRecords = await studentAttendanceRepo.findByAttendanceRecordId(task_id);
        // 计算课程状态
        const now = new Date();
        const courseStartTime = new Date(`${task.rq} ${task.sj_f}`);
        const courseEndTime = new Date(`${task.rq} ${task.sj_t}`);
        let course_status;
        if (now < courseStartTime) {
            course_status = 'not_started';
        }
        else if (now <= courseEndTime) {
            course_status = 'in_progress';
        }
        else {
            course_status = 'finished';
        }
        const taskDetail = {
            task_id: task.id,
            course: {
                kkh: task.kkh,
                kcmc: task.kcmc,
                xnxq: task.xnxq,
                rq: task.rq,
                sj_f: task.sj_f,
                sj_t: task.sj_t,
                jc_s: task.jc_s,
                room_s: course?.room_s || '',
                jxz: task.jxz || undefined,
                lq: task.lq
            },
            teachers,
            attendance_status: {
                status: task.status,
                total_count: task.total_count,
                checkin_count: task.checkin_count,
                leave_count: task.leave_count,
                absent_count: task.absent_count,
                checkin_rate: task.total_count > 0
                    ? Math.round((task.checkin_count / task.total_count) * 100)
                    : 0
            },
            course_status,
            created_at: task.created_at.toISOString(),
            updated_at: task.updated_at.toISOString(),
            student_records: studentRecords.map((record) => ({
                id: record.id,
                student_id: record.student_id,
                student_name: record.student_name,
                status: record.status,
                checkin_time: record.checkin_time?.toISOString(),
                location: record.location,
                latitude: record.latitude,
                longitude: record.longitude,
                accuracy: record.accuracy,
                remark: record.remark,
                created_at: record.created_at.toISOString(),
                updated_at: record.updated_at.toISOString()
            }))
        };
        const response = {
            success: true,
            data: taskDetail
        };
        reply.send(response);
    }
    catch (error) {
        request.log.error('获取任务详情失败', error);
        reply.status(500).send({
            success: false,
            message: '获取任务详情失败',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
/**
 * 获取打卡统计数据
 * GET /apiv2/attendance-stats
 */
const getAttendanceStats = async (request, reply) => {
    try {
        const { xnxq = '2024-2025-2', start_date, end_date } = request.query;
        const attendanceRepo = request.diScope.resolve('attendanceRepo');
        const studentAttendanceRepo = request.diScope.resolve('studentAttendanceRepo');
        // 构建查询条件
        const whereConditions = { xnxq };
        if (start_date) {
            whereConditions.rq = { '>=': start_date };
        }
        if (end_date) {
            whereConditions.rq = { '<=': end_date };
        }
        // 获取所有考勤记录
        const attendanceRecords = await attendanceRepo.findAllWithConditions(whereConditions);
        // 计算总体统计
        const totalTasks = attendanceRecords.length;
        const totalStudents = attendanceRecords.reduce((sum, record) => sum + record.total_count, 0);
        const totalCheckins = attendanceRecords.reduce((sum, record) => sum + record.checkin_count, 0);
        const totalLeaves = attendanceRecords.reduce((sum, record) => sum + record.leave_count, 0);
        const totalAbsents = attendanceRecords.reduce((sum, record) => sum + record.absent_count, 0);
        // 按状态统计
        const statusStats = {
            active: attendanceRecords.filter((r) => r.status === 'active')
                .length,
            closed: attendanceRecords.filter((r) => r.status === 'closed').length
        };
        // 按课程状态统计
        const now = new Date();
        const courseStatusStats = {
            not_started: 0,
            in_progress: 0,
            finished: 0
        };
        attendanceRecords.forEach((record) => {
            const courseStartTime = new Date(`${record.rq} ${record.sj_f}`);
            const courseEndTime = new Date(`${record.rq} ${record.sj_t}`);
            if (now < courseStartTime) {
                courseStatusStats.not_started++;
            }
            else if (now <= courseEndTime) {
                courseStatusStats.in_progress++;
            }
            else {
                courseStatusStats.finished++;
            }
        });
        const stats = {
            overview: {
                total_tasks: totalTasks,
                total_students: totalStudents,
                total_checkins: totalCheckins,
                total_leaves: totalLeaves,
                total_absents: totalAbsents,
                overall_checkin_rate: totalStudents > 0
                    ? Math.round((totalCheckins / totalStudents) * 100)
                    : 0
            },
            task_status: statusStats,
            course_status: courseStatusStats,
            period_range: {
                start_date: start_date ||
                    (attendanceRecords.length > 0
                        ? attendanceRecords.sort((a, b) => a.rq.localeCompare(b.rq))[0].rq
                        : null),
                end_date: end_date ||
                    (attendanceRecords.length > 0
                        ? attendanceRecords.sort((a, b) => b.rq.localeCompare(a.rq))[0].rq
                        : null)
            }
        };
        const response = {
            success: true,
            data: stats
        };
        reply.send(response);
    }
    catch (error) {
        request.log.error('获取打卡统计失败', error);
        reply.status(500).send({
            success: false,
            message: '获取打卡统计失败',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
/**
 * 考勤数据查询接口
 * @param request
 * @param reply
 */
const queryAttendanceData = async (request, reply) => {
    try {
        const studentAttendanceRepo = request.diScope.resolve('studentAttendanceRepo');
        const queryParams = request.body || {};
        const result = await studentAttendanceRepo.findWithDetails(queryParams);
        reply.code(200).send({
            success: true,
            data: result.records.slice(0, 10),
            pagination: {
                total: result.total,
                page: queryParams.page || 1,
                page_size: queryParams.pageSize || 10,
                total_pages: Math.ceil(result.total / (queryParams.pageSize || 10))
            }
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : '获取打卡数据失败';
        request.log.error({ err: error }, errorMessage);
        reply.code(500).send({ success: false, message: errorMessage });
    }
};
/**
 * 注册考勤API控制器
 * @param fastify
 */
export async function attendanceApiController(fastify) {
    // 任务列表接口
    fastify.get('/apiv2/attendance-tasks', getTaskList);
    // 打卡数据列表接口
    fastify.get('/apiv2/attendance-data', getAttendanceData);
    // 任务详情接口
    fastify.get('/apiv2/attendance-tasks/:task_id', getTaskDetail);
    // 打卡统计接口
    fastify.get('/apiv2/attendance-stats', getAttendanceStats);
    // 注册新的数据查询接口
    fastify.post('/apiv2/attendance/query', queryAttendanceData);
    fastify.log.info('AttendanceAPI controller initialized successfully');
}
//# sourceMappingURL=attendance-api.controller.js.map