import { UserCalendarRepository } from '../../repositories/user-calendar-repository.js';
/**
 * 日程创建执行器
 * 为参与者创建课程日程
 */
export declare const scheduleCreationExecutor: (userCalendarRepo: UserCalendarRepository) => {
    onRun: (params?: {
        courseId?: string;
        kkh?: string;
        xnxq?: string;
        participant?: {
            id: string;
            type: "teacher" | "student";
            [key: string]: any;
        };
        courseData?: any;
    }) => Promise<{
        success: boolean;
        error: string;
        participantId?: undefined;
        courseId?: undefined;
        kkh?: undefined;
        participantType?: undefined;
        scheduled?: undefined;
    } | {
        success: boolean;
        participantId: string;
        courseId: string | undefined;
        kkh: string | undefined;
        participantType: "student" | "teacher";
        scheduled: boolean;
        error?: undefined;
    }>;
};
//# sourceMappingURL=schedule-creation.executor.d.ts.map