/**
 * 课程同步执行器
 * 执行单个课程的完整同步流程
 */
export const createCourseSyncExecutor = (courseScheduleRepo, attendanceRepo, studentCourseRepo, teacherInfoRepo, studentInfoRepo, queueService, log) => {
    return {
        async onRun(params) {
            const { courseId, kkh, xnxq, courseData } = params;
            try {
                log.info({ courseId, kkh, xnxq }, '开始课程同步');
                // 1. 检查课程是否存在，不存在则创建
                let course = await courseScheduleRepo.findByKkh(kkh);
                if (!course) {
                    log.info({ kkh }, '课程不存在，创建新课程');
                    course = await courseScheduleRepo.create({
                        kkh,
                        xnxq,
                        ...courseData
                    });
                }
                // 2. 创建或更新课程签到表
                log.info({ courseId, kkh }, '创建/更新课程签到表');
                let attendance = await attendanceRepo.findByCourseId(courseId);
                if (!attendance) {
                    attendance = await attendanceRepo.create({
                        courseId,
                        kkh,
                        xnxq,
                        status: 1
                    });
                }
                else {
                    await attendanceRepo.update(attendance.id, { status: 1 });
                }
                // 3. 获取课程参与者列表（教师/学生）
                log.info({ kkh }, '获取课程参与者列表');
                const [teachers, students] = await Promise.all([
                    teacherInfoRepo.findTeachersByKkh(kkh),
                    studentInfoRepo.findStudentsByKkh(kkh)
                ]);
                log.info({
                    kkh,
                    teacherCount: teachers.length,
                    studentCount: students.length
                }, '获取参与者完成');
                // 4. 将创建日程任务加入队列
                const participants = [
                    ...teachers.map((t) => ({ ...t, type: 'teacher' })),
                    ...students.map((s) => ({ ...s, type: 'student' }))
                ];
                for (const participant of participants) {
                    await queueService.addTask('schedule-creation', {
                        courseId,
                        kkh,
                        xnxq,
                        participant,
                        courseData
                    });
                }
                log.info({
                    courseId,
                    kkh,
                    participantCount: participants.length
                }, '课程同步完成，已加入日程创建队列');
                return {
                    success: true,
                    courseId,
                    kkh,
                    participantCount: participants.length,
                    teacherCount: teachers.length,
                    studentCount: students.length
                };
            }
            catch (error) {
                log.error({ error, courseId, kkh, xnxq }, '课程同步失败');
                throw error;
            }
        }
    };
};
//# sourceMappingURL=course-sync.executor.js.map