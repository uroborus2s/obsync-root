/**
 * 课程同步执行器
 * 执行单个课程的完整同步流程
 */
export declare const createCourseSyncExecutor: () => {
    onRun(params: {
        courseId: string;
        kkh: string;
        xnxq: string;
        courseData: any;
    }): Promise<{
        success: boolean;
        courseId: string;
        kkh: string;
        message: string;
    }>;
};
//# sourceMappingURL=course-sync.executor.d.ts.map