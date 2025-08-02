import { CompletedTask, CreateTaskRequest, IncrementalSyncRequest, IncrementalSyncStatus, PaginatedResponse, RunningTask, TaskQueryParams, TaskStats, TaskStatus, TaskTreeQueryParams, TaskTreeResponse, UpdateTaskRequest } from '@/types/task.types';
export interface TreeTaskQueryParams {
    status?: string | string[];
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}
export interface TreeTaskResponse {
    id: string;
    parent_id?: string | null;
    name: string;
    description?: string | null;
    task_type: string;
    status: TaskStatus;
    priority: number;
    progress: number;
    executor_name?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    started_at?: string | null;
    completed_at?: string | null;
    childrenCount: number;
    depth: number;
    children?: TreeTaskResponse[];
}
export interface TreeTaskListResponse {
    tasks: TreeTaskResponse[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}
/**
 * 任务API服务类
 * 提供所有任务相关的API调用方法，对接icalink-sync服务
 */
export declare class TaskApiService {
    private baseUrl;
    constructor(baseUrl?: string);
    /**
     * 根据当前环境获取API基础URL
     */
    private getApiBaseUrl;
    /**
     * 创建请求配置，包含401错误处理和自动重定向
     */
    private makeRequest;
    /**
     * 处理401未授权响应 - 直接重定向到WPS授权页面
     */
    private handleUnauthorized;
    /**
     * 构造WPS授权URL
     */
    private buildWpsAuthUrl;
    /**
     * 获取根任务列表（树形展示）
     */
    getTaskTreeRoots(params?: TreeTaskQueryParams): Promise<TreeTaskListResponse>;
    /**
     * 获取任务子任务列表
     */
    getTaskTreeChildren(taskId: string, params?: TreeTaskQueryParams): Promise<TreeTaskListResponse>;
    /**
     * 获取完整任务树结构
     */
    getTaskTreeComplete(taskId: string, maxDepth?: number): Promise<TreeTaskResponse>;
    /**
     * 构建完整的任务树数据（推荐使用）
     * 先获取根任务，然后根据需要获取子任务
     */
    buildTaskTreeData(params?: TreeTaskQueryParams): Promise<{
        roots: TreeTaskResponse[];
        total: number;
        pagination: {
            page: number;
            page_size: number;
            total_pages: number;
            has_next: boolean;
            has_prev: boolean;
        };
    }>;
    /**
     * 懒加载获取子任务数据
     */
    loadTaskChildren(taskId: string, params?: TreeTaskQueryParams): Promise<TreeTaskResponse[]>;
    /**
     * 获取完整的任务树（递归获取所有层级）
     * 注意：这个方法可能会产生大量API调用，建议谨慎使用
     */
    getFullTaskTree(params?: TreeTaskQueryParams, maxDepth?: number): Promise<TreeTaskResponse[]>;
    /**
     * 获取任务统计信息
     */
    getTaskStats(): Promise<TaskStats>;
    /**
     * 获取任务树视图（已弃用，建议使用 getTaskTreeRoots）
     * @deprecated 请使用 getTaskTreeRoots 替代
     */
    getTaskTree(params?: TaskTreeQueryParams): Promise<TaskTreeResponse>;
    /**
     * 获取根任务列表（已弃用，建议使用 getTaskTreeRoots）
     * @deprecated 请使用 getTaskTreeRoots 替代
     */
    getRootTasks(params?: TaskQueryParams): Promise<PaginatedResponse<RunningTask>>;
    /**
     * 获取任务列表（通用方法）
     */
    getTasks(params?: TaskQueryParams): Promise<PaginatedResponse<RunningTask>>;
    /**
     * 获取运行中任务列表
     */
    getRunningTasks(params?: TaskQueryParams): Promise<PaginatedResponse<RunningTask>>;
    /**
     * 获取已完成任务列表
     */
    getCompletedTasks(params?: TaskQueryParams): Promise<PaginatedResponse<CompletedTask>>;
    /**
     * 根据ID获取任务详情
     */
    getTaskById(id: string): Promise<RunningTask | CompletedTask>;
    /**
     * 根据名称获取任务详情
     */
    getTaskByName(name: string): Promise<RunningTask | CompletedTask>;
    /**
     * 获取任务的子任务列表
     */
    getTaskChildren(parentId: string): Promise<RunningTask[]>;
    /**
     * 创建新任务
     */
    createTask(task: CreateTaskRequest): Promise<{
        id: string;
    }>;
    /**
     * 启动任务
     */
    startTask(id: string, reason?: string): Promise<void>;
    /**
     * 暂停任务
     */
    pauseTask(id: string, reason?: string): Promise<void>;
    /**
     * 恢复任务
     */
    resumeTask(id: string, reason?: string): Promise<void>;
    /**
     * 取消任务
     */
    cancelTask(id: string, reason?: string): Promise<void>;
    /**
     * 标记任务成功
     */
    markTaskSuccess(id: string, result?: unknown, reason?: string): Promise<void>;
    /**
     * 标记任务失败
     */
    markTaskFail(id: string, error?: string, reason?: string): Promise<void>;
    /**
     * 恢复所有可恢复的任务
     */
    recoverTasks(): Promise<void>;
    /**
     * 启动增量同步任务
     * @param config - 同步配置
     */
    startIncrementalSync(config: IncrementalSyncRequest): Promise<IncrementalSyncStatus>;
    /**
     * 获取增量同步状态
     * @param xnxq - 学年学期
     */
    getIncrementalSyncStatus(xnxq: string): Promise<IncrementalSyncStatus>;
    /**
     * 更新任务（兼容现有代码）
     */
    updateTask(id: string, updates: UpdateTaskRequest): Promise<void>;
    /**
     * 重试任务（兼容现有代码）
     */
    retryTask(id: string): Promise<{
        id: string;
    }>;
    /**
     * 删除任务（兼容现有代码）
     */
    deleteTask(id: string): Promise<void>;
    /**
     * 获取任务日志（兼容现有代码）
     */
    getTaskLogs(_id: string, _limit?: number): Promise<string[]>;
}
export declare const taskApi: TaskApiService;
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
//# sourceMappingURL=task-api.d.ts.map