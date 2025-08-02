/**
 * 删除课程执行器
 * 处理课程删除相关的任务
 */
export const deleteCourseExecutor = (courseAggregateRepo) => {
    return {
        onRun: async (params) => {
            const { courseId, kkh, xnxq } = params || {};
            if (!courseId) {
                return { success: false, error: 'courseId is required' };
            }
            // 转换 courseId 为数字
            const numericCourseId = parseInt(courseId, 10);
            // 修改聚合表状态为3（删除状态）
            await courseAggregateRepo.updateStatus(numericCourseId, 3);
            // 读取课程信息
            const courseInfo = await courseAggregateRepo.findById(numericCourseId);
            if (!courseInfo) {
                return { success: false, error: 'Course not found' };
            }
            return {
                success: true,
                courseId,
                kkh,
                deleted: true
            };
        }
    };
};
//# sourceMappingURL=delete-course.executor.js.map