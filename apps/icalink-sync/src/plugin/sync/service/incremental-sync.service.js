/**
 * 增量同步服务
 * 实现基于 gx_zt 状态的增量同步业务流程
 */
/**
 * 增量同步服务
 */
export class IncrementalSyncService {
    databaseProvider;
    courseScheduleRepo;
    courseAggregateRepo;
    userCalendarRepo;
    updateAggregateService;
    taskTreeService;
    wasV7Schedule;
    log;
    constructor(databaseProvider, courseScheduleRepo, courseAggregateRepo, userCalendarRepo, updateAggregateService, taskTreeService, wasV7Schedule, log) {
        this.databaseProvider = databaseProvider;
        this.courseScheduleRepo = courseScheduleRepo;
        this.courseAggregateRepo = courseAggregateRepo;
        this.userCalendarRepo = userCalendarRepo;
        this.updateAggregateService = updateAggregateService;
        this.taskTreeService = taskTreeService;
        this.wasV7Schedule = wasV7Schedule;
        this.log = log;
    }
    /**
     * 启动增量同步流程
     */
    async startIncrementalSync(config) {
        const { xnxq, batchSize = 50 } = config;
        const stats = {
            startTime: new Date(),
            processedCourses: 0,
            softDeletedAggregates: 0,
            deletedTeacherCalendars: 0,
            deletedStudentCalendars: 0,
            newAggregates: 0,
            status: 'running'
        };
        this.log.info({ xnxq, batchSize }, '开始增量同步流程');
        try {
            // 步骤 3-4: 查询中间表未处理的数据，获取变化的 kkh 和 rq
            const changedData = await this.getChangedKkhAndRq(xnxq);
            this.log.info({ changedCount: changedData.length }, '获取到未处理的变化数据');
            if (changedData.length === 0) {
                this.log.info('没有需要处理的变化数据');
                stats.status = 'completed';
                stats.endTime = new Date();
                return stats;
            }
            stats.processedCourses = changedData.length;
            // 步骤 5: 软删除聚合表相关数据
            const softDeletedCount = await this.softDeleteAggregateData(changedData);
            stats.softDeletedAggregates = softDeletedCount;
            // 步骤 6: 删除教师和学生日历对象
            const { teacherCount, studentCount } = await this.deleteUserCalendars(changedData, xnxq);
            stats.deletedTeacherCalendars = teacherCount;
            stats.deletedStudentCalendars = studentCount;
            // 步骤 7: 重新聚合并添加到聚合表
            const newAggregatesCount = await this.regenerateAggregateData(xnxq);
            stats.newAggregates = newAggregatesCount;
            stats.status = 'completed';
            stats.endTime = new Date();
            this.log.info({
                duration: stats.endTime.getTime() - stats.startTime.getTime(),
                processedCourses: stats.processedCourses,
                softDeletedAggregates: stats.softDeletedAggregates,
                deletedCalendars: stats.deletedTeacherCalendars + stats.deletedStudentCalendars,
                newAggregates: stats.newAggregates
            }, '增量同步完成');
            return stats;
        }
        catch (error) {
            stats.status = 'failed';
            stats.endTime = new Date();
            stats.error = error instanceof Error ? error.message : String(error);
            this.log.error({
                error: stats.error,
                duration: stats.endTime.getTime() - stats.startTime.getTime()
            }, '增量同步失败');
            throw error;
        }
    }
    /**
     * 步骤 3-4: 查询中间表根据 gx_zt is null 取到未处理的数据
     * 获取变化数据的 kkh 和 rq
     */
    async getChangedKkhAndRq(xnxq) {
        try {
            this.log.debug({ xnxq }, '查询未处理的变化数据');
            // 查询 u_jw_kcb_cur 表中 gx_zt is null 的数据
            // 按 kkh 和 rq 分组去重
            const changedData = await this.courseScheduleRepo.getChangedKkhAndRq(xnxq);
            this.log.info({ xnxq, count: changedData.length }, '获取变化的开课号和日期完成');
            return changedData;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xnxq
            }, '获取变化数据失败');
            throw error;
        }
    }
    /**
     * 步骤 5: 软删除聚合表相关数据
     * 根据查到的 rq 和 kkh，把 gx_zt 设置为 3（软删除未处理）
     */
    async softDeleteAggregateData(changedData) {
        try {
            this.log.debug({ count: changedData.length }, '开始软删除聚合表数据');
            let softDeletedCount = 0;
            // 批量处理软删除操作
            for (const { kkh, rq } of changedData) {
                const deletedCount = await this.courseAggregateRepo.softDelete(kkh, rq);
                softDeletedCount += deletedCount;
                this.log.debug({ kkh, rq, deletedCount }, '软删除聚合数据完成');
            }
            this.log.info({ totalDeleted: softDeletedCount }, '聚合表软删除完成');
            return softDeletedCount;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                count: changedData.length
            }, '软删除聚合表数据失败');
            throw error;
        }
    }
    /**
     * 步骤 6: 根据 gx_zt 和 rq 顺序删除教师和学生日历对象
     * 处理完毕后 gx_zt 置为 4（软删除处理完毕）
     */
    async deleteUserCalendars(changedData, xnxq) {
        try {
            this.log.debug({ count: changedData.length }, '开始删除用户日历对象');
            let teacherCount = 0;
            let studentCount = 0;
            for (const { kkh, rq } of changedData) {
                // 1. 删除教师日历
                const teacherDeleteCount = await this.deleteTeacherCalendarsForCourse(kkh, rq, xnxq);
                teacherCount += teacherDeleteCount;
                // 2. 删除学生日历
                const studentDeleteCount = await this.deleteStudentCalendarsForCourse(kkh, rq, xnxq);
                studentCount += studentDeleteCount;
                this.log.debug({
                    kkh,
                    rq,
                    teacherDeleted: teacherDeleteCount,
                    studentDeleted: studentDeleteCount
                }, '课程日历删除完成');
            }
            // 完成软删除处理，更新聚合表状态为 4
            await this.updateAggregateService.completeSoftDeleteProcessing(xnxq);
            this.log.info({
                teacherCount,
                studentCount,
                total: teacherCount + studentCount
            }, '用户日历删除完成');
            return { teacherCount, studentCount };
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                count: changedData.length
            }, '删除用户日历失败');
            throw error;
        }
    }
    /**
     * 删除指定课程的教师日历
     */
    async deleteTeacherCalendarsForCourse(kkh, rq, xnxq) {
        try {
            // 获取该课程的教师信息
            const courseSchedules = await this.courseScheduleRepo.findByConditions({
                kkh,
                rq: `${rq} 00:00:00.000`,
                xnxq
            });
            if (courseSchedules.length === 0) {
                return 0;
            }
            // 提取教师工号
            const teacherXghs = [
                ...new Set(courseSchedules.map((schedule) => schedule.ghs).filter(Boolean))
            ];
            let deletedCount = 0;
            // 批量删除教师日历
            for (const xgh of teacherXghs) {
                if (xgh) {
                    // 确保 xgh 不为 null
                    // 这里应该调用WPS API删除具体的日历事件
                    // 暂时先删除本地记录
                    const deleted = await this.userCalendarRepo.deleteByXgh(xgh);
                    if (deleted) {
                        deletedCount++;
                    }
                }
            }
            return deletedCount;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                kkh,
                rq
            }, '删除教师日历失败');
            throw error;
        }
    }
    /**
     * 删除指定课程的学生日历
     */
    async deleteStudentCalendarsForCourse(kkh, rq, xnxq) {
        try {
            // 获取该课程的学生信息
            const courseSchedules = await this.courseScheduleRepo.findByConditions({
                kkh,
                rq: `${rq} 00:00:00.000`,
                xnxq
            });
            if (courseSchedules.length === 0) {
                return 0;
            }
            // 这里需要根据课程信息获取学生列表
            // 由于表结构限制，可能需要从其他相关表获取学生信息
            // 暂时返回0，具体实现需要根据实际的数据结构调整
            let deletedCount = 0;
            // TODO: 实现学生日历删除逻辑
            return deletedCount;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                kkh,
                rq
            }, '删除学生日历失败');
            throw error;
        }
    }
    /**
     * 步骤 7: 查询中间表根据 gx_zt is null，取到未处理的数据重新聚合
     * 把新聚合的值附加到聚合表
     */
    async regenerateAggregateData(xnxq) {
        try {
            this.log.debug({ xnxq }, '开始重新聚合数据');
            // 使用 CourseScheduleRepository 的方法生成增量聚合数据
            const aggregateStats = await this.courseScheduleRepo.generateIncrementalAggregateData(xnxq);
            this.log.info({
                xnxq,
                amRecords: aggregateStats.amRecords,
                pmRecords: aggregateStats.pmRecords,
                totalRecords: aggregateStats.totalRecords
            }, '重新聚合完成');
            return aggregateStats.totalRecords;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xnxq
            }, '重新聚合数据失败');
            throw error;
        }
    }
    /**
     * 获取增量同步状态
     */
    async getIncrementalSyncStatus(xnxq) {
        try {
            const [unprocessedData, aggregateStats] = await Promise.all([
                this.courseScheduleRepo.findUnsyncedData(xnxq),
                this.courseAggregateRepo.getStats(xnxq)
            ]);
            return {
                unprocessedCount: unprocessedData.length,
                softDeletedCount: aggregateStats.softDeleted,
                processedCount: aggregateStats.processed
            };
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xnxq
            }, '获取增量同步状态失败');
            throw error;
        }
    }
}
//# sourceMappingURL=incremental-sync.service.js.map