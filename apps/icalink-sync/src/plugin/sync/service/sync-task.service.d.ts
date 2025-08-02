/**
 * 基于 taskService 的同步任务服务
 * 支持全量同步和增量同步，采用函数式编程风格
 * 特点：断点续传、反复执行、任务树管理
 */
import { Logger } from '@stratix/core';
import { ITaskTreeService } from '@stratix/tasks';
/**
 * 同步配置接口
 */
interface SyncConfig {
    xnxq: string;
    batchSize?: number;
    maxRetries?: number;
    timeout?: number;
}
/**
 * 任务状态统计
 */
interface TaskChildrenStats {
    total: number;
    completed: number;
    failed: number;
    running: number;
    pending: number;
}
/**
 * 课程任务数据结构
 */
interface CourseTaskData {
    id: number;
    kkh: string;
    xnxq: string;
    kcmc: string;
    rq: string;
    jc_s: string;
    room_s: string;
    gh_s: string | null;
    xm_s: string | null;
    sj_f: string;
    sj_t: string;
    sjd: string;
    gx_zt?: number | null;
}
/**
 * 同步任务服务
 * 负责管理同步任务的创建、执行和状态跟踪
 */
export declare class SyncTaskService {
    private readonly taskTreeService;
    private readonly log;
    constructor(taskTreeService: ITaskTreeService, log: Logger);
    /**
     * 启动全量同步
     */
    startFullSync(config: SyncConfig): Promise<string>;
    /**
     * 启动增量同步
     */
    startIncrementalSync(config: SyncConfig): Promise<string>;
    /**
     * 获取任务状态
     */
    getTaskStatus(taskId: string): Promise<{
        id: any;
        name: any;
        description: any;
        status: any;
        type: any;
        metadata: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    /**
     * 获取任务进度
     */
    getTaskProgress(taskId: string): Promise<any>;
    /**
     * 获取子任务统计
     */
    getChildrenStats(taskId: string): Promise<TaskChildrenStats | null>;
    /**
     * 暂停同步任务
     */
    pauseSync(taskId: string, reason?: string): Promise<any>;
    /**
     * 恢复同步任务
     */
    resumeSync(taskId: string, reason?: string): Promise<any>;
    /**
     * 取消同步任务
     */
    cancelSync(taskId: string, reason?: string): Promise<any>;
    /**
     * 重试同步任务
     */
    retrySync(taskId: string, reason?: string): Promise<any>;
}
export type { CourseTaskData, SyncConfig, TaskChildrenStats };
//# sourceMappingURL=sync-task.service.d.ts.map