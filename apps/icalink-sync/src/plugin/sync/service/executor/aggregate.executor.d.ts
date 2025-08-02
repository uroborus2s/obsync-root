import { CourseAggregateRepository } from '../../repositories/course-aggregate-repository.js';
/**
 * 聚合执行器
 * 处理课程数据聚合任务
 */
export declare const aggregateExecutor: (courseAggregateRepo: CourseAggregateRepository) => {
    onRun: (params?: {
        type?: "full" | "incremental";
        xnxq?: string;
    }) => Promise<{
        success: boolean;
        type: string;
        count: number;
    } | {
        success: boolean;
        type: "incremental" | "full";
        count?: undefined;
    }>;
};
//# sourceMappingURL=aggregate.executor.d.ts.map