/**
 * 获取课程执行器
 * 根据不同的同步类型获取课程列表
 */
export const getCoursesExecutor = (courseAggregateRepo) => {
    return {
        onRun: async (params) => {
            const { type = 'full', status, xnxq } = params || {};
            if (!xnxq) {
                return { success: false, error: 'xnxq is required' };
            }
            let courses = [];
            if (type === 'full') {
                // 全量同步：获取学年学期的所有课程
                courses = await courseAggregateRepo.findByXnxq(xnxq);
            }
            else if (type === 'incremental') {
                if (status !== undefined) {
                    // 增量同步：根据状态获取课程
                    courses = await courseAggregateRepo.findByStatus(xnxq, status);
                }
                else {
                    // 获取需要增量同步的课程（状态为null）
                    courses = await courseAggregateRepo.findByStatus(xnxq, null);
                }
            }
            return {
                success: true,
                courses: courses || [],
                count: courses?.length || 0
            };
        }
    };
};
//# sourceMappingURL=get-courses.executor.js.map