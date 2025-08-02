/**
 * WPS日程处理器服务
 * 处理队列中的WPS日程创建任务
 */
import { Logger } from '@stratix/core';
import { TaskTreeService } from '@stratix/tasks';
import { ScheduleModule } from '@stratix/was-v7';
import { createPageUrlFactory } from './generatePageUrl.js';
/**
 * 队列任务执行结果接口
 */
interface JobExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    message: string;
}
/**
 * 队列任务接口
 */
interface QueueJob {
    id: string;
    payload: any;
    executor_name: string;
    queue_name: string;
    metadata?: any;
}
/**
 * 任务执行器接口
 */
interface JobExecutor {
    readonly name: string;
    execute(job: QueueJob): Promise<JobExecutionResult>;
    validate?(payload: any): boolean | Promise<boolean>;
}
/**
 * WPS日程创建任务数据
 */
export interface WpsScheduleTaskData {
    participantType: 'teacher' | 'student';
    participantId: string;
    participantName: string;
    calendarId: string;
    courseData: {
        taskId: string;
        kkh: string;
        kcmc: string;
        rq: string;
        jc_s: string;
        room_s: string;
        sj_f: string;
        sj_t: string;
        sjd: string;
        gh_s: string;
        xm_s: string;
        sfdk: string;
    };
}
/**
 * WPS日程处理器服务
 * 实现JobExecutor接口，作为队列处理器
 */
export declare class WpsScheduleProcessorService implements JobExecutor {
    private wasV7Schedule;
    private taskTreeService;
    private pageUrlService;
    private log;
    readonly name = "wpsScheduleProcessorService";
    constructor(wasV7Schedule: ScheduleModule, taskTreeService: TaskTreeService, pageUrlService: ReturnType<typeof createPageUrlFactory>, // 注入TaskTreeService用于任务状态回调
    log: Logger);
    /**
     * 验证任务载荷
     */
    validate(payload: WpsScheduleTaskData): Promise<boolean>;
    /**
     * 执行WPS日程创建任务
     */
    execute(job: QueueJob): Promise<JobExecutionResult>;
    /**
     * 创建WPS日程 - 统一入口方法
     */
    private createSchedule;
    /**
     * 处理任务回调 - 更新原始任务状态
     */
    private handleTaskCallback;
    /**
     * 处理WPS日程创建任务
     */
    processCreateScheduleTask(taskData: WpsScheduleTaskData): Promise<any>;
    /**
     * 构建日程描述
     */
    private buildScheduleDescription;
    /**
     * 格式化日期时间为RFC3339格式（上海时区）
     * 使用@stratix/utils中的date-fns方法严格输出RFC3339格式
     * 输入格式：rq: "2025/03/18", sj_f: "09:50:00.000"
     * 输出格式：RFC3339 (如 "2025-03-18T09:50:00+08:00")
     */
    private formatDateTime;
    /**
     * 删除WPS日程
     */
    processDeleteScheduleTask(taskData: {
        calendarId: string;
        eventId: string;
        participantId: string;
        participantName: string;
        participantType: string;
        courseData: any;
    }): Promise<any>;
}
export {};
//# sourceMappingURL=wps-schedule-processor.service.d.ts.map