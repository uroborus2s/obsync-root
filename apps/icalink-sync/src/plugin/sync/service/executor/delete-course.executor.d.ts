import { CourseAggregateRepository } from '../../repositories/course-aggregate-repository.js';
/**
 * 删除课程执行器
 * 处理课程删除相关的任务
 */
export declare const deleteCourseExecutor: (courseAggregateRepo: CourseAggregateRepository) => {
    onRun: (params?: {
        courseId?: string;
        kkh?: string;
        xnxq?: string;
    }) => Promise<{
        success: boolean;
        error: string;
        courseId?: undefined;
        kkh?: undefined;
        deleted?: undefined;
    } | {
        success: boolean;
        courseId: string;
        kkh: string | undefined;
        deleted: boolean;
        error?: undefined;
    }>;
};
//# sourceMappingURL=delete-course.executor.d.ts.map