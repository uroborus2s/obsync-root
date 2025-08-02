/**
 * 聚合状态更新任务执行器
 * 用于教师和学生任务完成后修改聚合表的值，以及任务全部完成时修改中间表的状态
 */
export class UpdateAggregateService {
    log;
    courseAggregateRepo;
    courseScheduleRepo;
    name = 'updateAggregateService';
    constructor(log, courseAggregateRepo, courseScheduleRepo) {
        this.log = log;
        this.courseAggregateRepo = courseAggregateRepo;
        this.courseScheduleRepo = courseScheduleRepo;
    }
    /**
     * 任务完成时更新聚合表状态
     * 将对应课程的gx_zt设置为1，同时更新gx_sj为当前时间
     */
    async updateCompleted(gxZt, courseTask) {
        try {
            // 查找对应的聚合任务
            const aggregateTasks = await this.courseAggregateRepo.findByConditions({
                kkh: courseTask.kkh,
                xnxq: courseTask.xnxq,
                rq: courseTask.rq,
                sjd: courseTask.sjd,
                sjf: courseTask.sj_f
            });
            if (aggregateTasks.length === 0) {
                this.log.warn({
                    courseKkh: courseTask.kkh,
                    courseDate: courseTask.rq,
                    sjd: courseTask.sjd
                }, '未找到对应的聚合任务');
                return;
            }
            // 更新聚合任务状态
            for (const task of aggregateTasks) {
                if (task.id) {
                    await this.courseAggregateRepo.updateStatus(task.id, gxZt);
                    await this.updateRelatedCourseSchedules(aggregateTasks, gxZt);
                }
            }
            this.log.info({
                courseKkh: courseTask.kkh,
                courseDate: courseTask.rq,
                sjd: courseTask.sjd,
                updatedCount: aggregateTasks.length,
                gxZt
            }, `任务完成，聚合表状态已更新为${gxZt}`);
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                courseKkh: courseTask.kkh,
                courseDate: courseTask.rq,
                sjd: courseTask.sjd
            }, '更新课程表状态失败');
            throw error;
        }
    }
    /**
     * 根据juhe_renwu记录更新对应的u_jw_kcb_cur记录
     * 当学生任务完成（gx_zt=2）时，检查该课程的所有聚合任务是否都已完成，
     * 如果是则根据聚合记录的信息找到对应的u_jw_kcb_cur记录并更新其gx_zt和gx_sj
     */
    async updateRelatedCourseSchedules(aggregateTasks, zt) {
        try {
            // 检查是否所有相关的聚合任务都已完成（gx_zt = 2）
            // 需要检查同一课程同一日期的所有聚合任务
            const firstTask = aggregateTasks[0];
            // 查询该课程在该日期的所有聚合任务
            const allAggregateTasks = await this.courseAggregateRepo.findByConditions({
                kkh: firstTask.kkh,
                xnxq: firstTask.xnxq,
                rq: firstTask.rq,
                sjf: firstTask.sj_f
            });
            if (allAggregateTasks.length > 0) {
                this.log.info({
                    courseKkh: firstTask.kkh,
                    courseDate: firstTask.rq,
                    totalTasks: allAggregateTasks.length
                }, '该课程所有聚合任务已完成，开始更新u_jw_kcb_cur记录');
                // 根据每个聚合任务的信息，找到对应的u_jw_kcb_cur记录并更新
                // juhe_renwu是由u_jw_kcb_cur按照kkh,xnxq,jxz,zc,rq,kcmc,sfdk分组聚合而来
                for (const aggregateTask of allAggregateTasks) {
                    // 根据聚合任务的信息和时间段直接查找对应的u_jw_kcb_cur记录
                    // 通过数据库查询条件直接过滤时间段，提高查询效率
                    const courseSchedules = await this.courseScheduleRepo.findByConditions({
                        kkh: aggregateTask.kkh,
                        rq: `${aggregateTask.rq}`,
                        sjd: aggregateTask.sjd
                    });
                    if (courseSchedules.length > 0) {
                        // 准备批量更新的条件
                        const updateConditions = courseSchedules.map((schedule) => ({
                            kkh: schedule.kkh,
                            xnxq: schedule.xnxq,
                            rq: schedule.rq,
                            st: schedule.st
                        }));
                        // 批量更新同步状态
                        await this.courseScheduleRepo.batchUpdateSyncStatus(updateConditions, zt || 1);
                        this.log.info({
                            aggregateTaskId: aggregateTask.id,
                            courseKkh: aggregateTask.kkh,
                            courseName: aggregateTask.kcmc,
                            timeSlot: aggregateTask.sjd,
                            updatedScheduleCount: courseSchedules.length
                        }, '已更新对应的u_jw_kcb_cur记录');
                    }
                    else {
                        this.log.warn({
                            aggregateTaskId: aggregateTask.id,
                            courseKkh: aggregateTask.kkh,
                            courseName: aggregateTask.kcmc,
                            timeSlot: aggregateTask.sjd
                        }, '未找到匹配的u_jw_kcb_cur记录');
                    }
                }
                this.log.info({
                    courseKkh: firstTask.kkh,
                    courseDate: firstTask.rq,
                    processedTasks: allAggregateTasks.length
                }, '所有聚合任务对应的u_jw_kcb_cur记录已更新完成');
            }
            else {
                this.log.debug({
                    courseKkh: firstTask.kkh,
                    courseDate: firstTask.rq,
                    totalTasks: allAggregateTasks.length,
                    completedTasks: allAggregateTasks.filter((task) => task.gx_zt === 2)
                        .length
                }, '仍有未完成的聚合任务，暂不更新u_jw_kcb_cur表状态');
            }
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                aggregateTasksCount: aggregateTasks.length
            }, '更新相关课程表记录失败');
            throw error;
        }
    }
    /**
     * 对课程表数据按照kkh, xnxq, jxz, zc, rq进行分组
     */
    groupCourseSchedules(schedules) {
        const groups = new Map();
        for (const schedule of schedules) {
            const key = `${schedule.kkh}-${schedule.xnxq}-${schedule.jxz}-${schedule.zc}-${schedule.rq}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    kkh: schedule.kkh,
                    xnxq: schedule.xnxq,
                    jxz: String(schedule.jxz),
                    zc: schedule.zc,
                    rq: schedule.rq
                });
            }
        }
        return Array.from(groups.values());
    }
    /**
     * 批量更新聚合表状态
     * 用于批量处理多个任务的状态更新
     */
    async batchUpdateAggregateStatus(courseTasks, status) {
        try {
            const updatePromises = courseTasks.map(async (courseTask) => {
                const aggregateTasks = await this.courseAggregateRepo.findByConditions({
                    kkh: courseTask.kkh,
                    xnxq: courseTask.xnxq,
                    rq: courseTask.rq,
                    sjd: courseTask.sjd
                });
                const updateIds = aggregateTasks
                    .filter((task) => task.id)
                    .map((task) => task.id);
                if (updateIds.length > 0) {
                    return this.courseAggregateRepo.batchUpdateStatus(updateIds, status);
                }
                return 0;
            });
            const results = await Promise.all(updatePromises);
            const totalUpdated = results.reduce((sum, count) => sum + count, 0);
            this.log.info({
                taskCount: courseTasks.length,
                totalUpdated,
                status
            }, '批量更新聚合表状态完成');
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                taskCount: courseTasks.length,
                status
            }, '批量更新聚合表状态失败');
            throw error;
        }
    }
    /**
     * 软删除聚合任务
     * 将指定课程的聚合任务状态设置为3（软删除未处理）
     */
    async softDeleteAggregateTasks(conditions) {
        try {
            let totalUpdated = 0;
            for (const condition of conditions) {
                const updated = await this.courseAggregateRepo.softDelete(condition.kkh, condition.rq);
                totalUpdated += updated;
            }
            this.log.info({
                conditionCount: conditions.length,
                totalUpdated
            }, '聚合任务软删除完成');
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                conditionCount: conditions.length
            }, '聚合任务软删除失败');
            throw error;
        }
    }
    /**
     * 完成软删除处理
     * 将软删除的聚合任务状态从3更新为4（软删除处理完毕）
     */
    async completeSoftDeleteProcessing(xnxq) {
        try {
            // 查找所有状态为3的聚合任务
            const softDeletedTasks = await this.courseAggregateRepo.findByConditions({
                xnxq,
                gxZt: 3
            });
            if (softDeletedTasks.length === 0) {
                this.log.info({ xnxq }, '没有需要处理的软删除任务');
                return;
            }
            // 批量更新状态为4
            const taskIds = softDeletedTasks
                .filter((task) => task.id)
                .map((task) => task.id);
            const updatedCount = await this.courseAggregateRepo.batchUpdateStatus(taskIds, 4);
            this.log.info({
                xnxq,
                taskCount: softDeletedTasks.length,
                updatedCount
            }, '软删除处理完成，状态已更新为4');
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xnxq
            }, '完成软删除处理失败');
            throw error;
        }
    }
    /**
     * 获取聚合任务统计信息
     */
    async getAggregateStats(xnxq) {
        try {
            const stats = await this.courseAggregateRepo.getStats(xnxq);
            this.log.info({ xnxq, stats }, '获取聚合任务统计信息');
            return stats;
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xnxq
            }, '获取聚合任务统计信息失败');
            throw error;
        }
    }
    /**
     * 重置聚合任务状态
     * 将指定学年学期的所有聚合任务状态重置为初始状态
     */
    async resetAggregateStatus(xnxq) {
        try {
            // 重置聚合表状态
            const aggregateResult = await this.courseAggregateRepo.clearByXnxq(xnxq);
            // 重置中间表状态
            const scheduleResult = await this.courseScheduleRepo.resetSyncStatus(xnxq);
            this.log.info({
                xnxq,
                aggregateReset: aggregateResult,
                scheduleReset: scheduleResult
            }, '聚合任务状态重置完成');
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                xnxq
            }, '重置聚合任务状态失败');
            throw error;
        }
    }
    /**
     * TaskExecutor接口方法 - 任务执行
     */
    async execute(taskNode) {
        const { action, courseTask, status } = taskNode.data.metadata;
        this.log.info({
            taskId: taskNode.id,
            action,
            courseKkh: courseTask?.kkh
        }, '开始执行聚合状态更新任务');
        try {
            switch (action) {
                case 'updateTeacherCompleted':
                    await this.updateCompleted(1, courseTask);
                    break;
                case 'updateStudentCompleted':
                    await this.updateCompleted(2, courseTask);
                    break;
                case 'batchUpdate':
                    await this.batchUpdateAggregateStatus(courseTask.tasks, status);
                    break;
                case 'softDelete':
                    await this.softDeleteAggregateTasks(courseTask.conditions);
                    break;
                case 'completeSoftDelete':
                    await this.completeSoftDeleteProcessing(courseTask.xnxq);
                    break;
                case 'resetStatus':
                    await this.resetAggregateStatus(courseTask.xnxq);
                    break;
                default:
                    throw new Error(`未知的聚合状态更新操作: ${action}`);
            }
            this.log.info({
                taskId: taskNode.id,
                action,
                courseKkh: courseTask?.kkh
            }, '聚合状态更新任务执行成功');
        }
        catch (error) {
            this.log.error({
                error: error instanceof Error ? error.message : String(error),
                taskId: taskNode.id,
                action,
                courseKkh: courseTask?.kkh
            }, '聚合状态更新任务执行失败');
            throw error;
        }
    }
    /**
     * TaskExecutor接口方法 - 任务成功回调
     */
    async onSuccess(taskNode) {
        const { action, courseTask } = taskNode.data.metadata;
        this.log.info({
            taskId: taskNode.id,
            action,
            courseKkh: courseTask?.kkh
        }, '聚合状态更新任务成功完成');
        this.execute(taskNode);
        // 可以在这里添加成功后的额外处理逻辑
        // 比如发送通知、更新统计信息等
    }
    /**
     * TaskExecutor接口方法 - 任务失败回调
     */
    async onFail(taskNode) {
        const { action, courseTask } = taskNode.data.metadata;
        this.log.error({
            taskId: taskNode.id,
            action,
            courseKkh: courseTask?.kkh,
            status: taskNode.status
        }, '聚合状态更新任务执行失败');
        this.execute(taskNode);
        // 可以在这里添加失败后的处理逻辑
        // 比如记录错误、发送告警、重试逻辑等
    }
    /**
     * TaskExecutor接口方法 - 任务完成回调（无论成功失败都会调用）
     */
    async onComplete(taskNode) {
        const { action, courseTask } = taskNode.data.metadata;
        this.log.info({
            taskId: taskNode.id,
            action,
            courseKkh: courseTask?.kkh,
            status: taskNode.status
        }, '聚合状态更新任务已完成');
        this.execute(taskNode);
        // 可以在这里添加任务完成后的清理逻辑
        // 比如释放资源、更新任务统计等
    }
}
//# sourceMappingURL=update-aggregate.service.js.map