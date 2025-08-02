import { CourseAggregateRepository } from '../../repositories/course-aggregate-repository.js';
/**
 * 获取课程执行器
 * 根据不同的同步类型获取课程列表
 */
export declare const getCoursesExecutor: (courseAggregateRepo: CourseAggregateRepository) => {
    onRun: (params?: {
        type?: "full" | "incremental";
        status?: number | null;
        xnxq?: string;
    }) => Promise<{
        success: boolean;
        error: string;
        courses?: undefined;
        count?: undefined;
    } | {
        success: boolean;
        courses: any[];
        count: number;
        error?: undefined;
    }>;
};
//# sourceMappingURL=get-courses.executor.d.ts.map