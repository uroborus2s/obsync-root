/**
 * 聚合执行器
 * 处理课程数据聚合任务
 */
export const aggregateExecutor = (courseAggregateRepo) => {
    return {
        onRun: async (params) => {
            const { type = 'full', xnxq } = params || {};
            if (type === 'full') {
                // 全量同步：获取学年学期的所有课程
                if (xnxq) {
                    const courses = await courseAggregateRepo.findByXnxq(xnxq);
                    return { success: true, type: 'full', count: courses.length };
                }
            }
            else {
                // 增量同步：处理 null 状态的数据
                if (xnxq) {
                    const courses = await courseAggregateRepo.findByStatus(xnxq, null);
                    return { success: true, type: 'incremental', count: courses.length };
                }
            }
            return { success: true, type };
        }
    };
};
//# sourceMappingURL=aggregate.executor.js.map