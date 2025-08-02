import { CompletedTask, CreateTaskRequest, IncrementalSyncRequest, IncrementalSyncStatus, PaginatedResponse, RunningTask, TaskQueryParams, TaskStats, TaskStatus, TaskTreeQueryParams, TaskTreeResponse, UpdateTaskRequest } from '@/types/task.types';
/**
 * Mock 实现的任务API服务
 * 用于开发和测试环境
 */
export declare class MockTaskApiService {
    constructor(_baseUrl?: string);
    getTaskStats(): Promise<TaskStats>;
    getTaskTree(_params?: TaskTreeQueryParams): Promise<TaskTreeResponse>;
    getRootTasks(_params?: TaskQueryParams): Promise<PaginatedResponse<RunningTask>>;
    getRunningTasks(_params?: TaskQueryParams): Promise<PaginatedResponse<RunningTask>>;
    getCompletedTasks(_params?: TaskQueryParams): Promise<PaginatedResponse<CompletedTask>>;
    getTaskById(id: string): Promise<RunningTask | CompletedTask>;
    getTaskByName(name: string): Promise<RunningTask | CompletedTask>;
    getTaskChildren(parentId: string): Promise<RunningTask[]>;
    createTask(task: CreateTaskRequest): Promise<{
        id: string;
    }>;
    startTask(id: string, reason?: string): Promise<void>;
    pauseTask(id: string, reason?: string): Promise<void>;
    resumeTask(id: string, reason?: string): Promise<void>;
    cancelTask(id: string, reason?: string): Promise<void>;
    markTaskSuccess(id: string, result?: unknown, reason?: string): Promise<void>;
    markTaskFail(id: string, error?: string, reason?: string): Promise<void>;
    recoverTasks(): Promise<void>;
    startIncrementalSync(config: IncrementalSyncRequest): Promise<IncrementalSyncStatus>;
    getIncrementalSyncStatus(xnxq: string): Promise<IncrementalSyncStatus>;
    updateTask(id: string, updates: UpdateTaskRequest): Promise<void>;
    retryTask(id: string): Promise<{
        id: string;
    }>;
    deleteTask(id: string): Promise<void>;
    getTaskLogs(_id: string, _limit?: number): Promise<string[]>;
}
export declare const taskApi: MockTaskApiService | null;
/**
 * 任务状态颜色映射
 */
export declare const taskStatusColors: {
    [TaskStatus.PENDING]: string;
    [TaskStatus.RUNNING]: string;
    [TaskStatus.PAUSED]: string;
    [TaskStatus.SUCCESS]: string;
    [TaskStatus.FAILED]: string;
    [TaskStatus.CANCELLED]: string;
    [TaskStatus.TIMEOUT]: string;
};
/**
 * 任务状态中文标签
 */
export declare const taskStatusLabels: {
    [TaskStatus.PENDING]: string;
    [TaskStatus.RUNNING]: string;
    [TaskStatus.PAUSED]: string;
    [TaskStatus.SUCCESS]: string;
    [TaskStatus.FAILED]: string;
    [TaskStatus.CANCELLED]: string;
    [TaskStatus.TIMEOUT]: string;
};
//# sourceMappingURL=task-api-mock.d.ts.map