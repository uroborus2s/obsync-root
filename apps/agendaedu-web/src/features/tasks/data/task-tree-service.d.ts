import { TaskStatus } from '@/types/task.types';
import { TreeTaskQueryParams, TreeTaskResponse } from '@/lib/task-api';
/**
 * 任务树节点状态
 */
export interface TaskTreeNodeState {
    id: string;
    isExpanded: boolean;
    isLoading: boolean;
    children: TreeTaskResponse[];
    hasLoadedChildren: boolean;
}
/**
 * 任务树数据服务
 * 负责管理任务树的数据获取、缓存和状态
 */
export declare class TaskTreeService {
    private nodeStates;
    private rootTasks;
    private totalCount;
    /**
     * 获取根任务列表
     */
    loadRootTasks(params?: TreeTaskQueryParams): Promise<{
        tasks: TreeTaskResponse[];
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
     * 懒加载子任务
     */
    loadChildren(taskId: string, params?: TreeTaskQueryParams): Promise<TreeTaskResponse[]>;
    /**
     * 切换节点展开状态
     */
    toggleNodeExpansion(taskId: string): Promise<boolean>;
    /**
     * 展开所有已加载的节点
     */
    expandAll(): void;
    /**
     * 收缩所有节点
     */
    collapseAll(): void;
    /**
     * 获取扁平化的任务列表（用于表格显示）
     */
    getFlattenedTasks(): Array<TreeTaskResponse & {
        level: number;
        isExpanded: boolean;
        hasChildren: boolean;
    }>;
    /**
     * 获取节点状态
     */
    getNodeState(taskId: string): TaskTreeNodeState | undefined;
    /**
     * 获取所有根任务
     */
    getRootTasks(): TreeTaskResponse[];
    /**
     * 获取总数
     */
    getTotalCount(): number;
    /**
     * 清除缓存
     */
    clearCache(): void;
    /**
     * 刷新指定任务的数据
     */
    refreshTask(taskId: string): Promise<void>;
    /**
     * 预加载指定层级的任务
     */
    preloadLevel(maxLevel?: number): Promise<void>;
}
export declare const taskTreeService: TaskTreeService;
/**
 * 任务数据获取策略
 */
export declare const TaskDataStrategy: {
    /**
     * 懒加载策略（推荐）
     * 适用于大量任务的场景，按需加载子任务
     */
    readonly LAZY_LOAD: "lazy_load";
    /**
     * 完整加载策略
     * 适用于任务数量较少，需要完整树结构的场景
     */
    readonly FULL_LOAD: "full_load";
    /**
     * 分页加载策略
     * 适用于根任务数量很多的场景
     */
    readonly PAGINATED_LOAD: "paginated_load";
};
/**
 * 根据不同策略获取任务数据的工具函数
 */
export declare const TaskDataHelper: {
    /**
     * 懒加载策略：先加载根任务，按需加载子任务
     */
    loadWithLazyStrategy(status?: TaskStatus | TaskStatus[], page?: number, pageSize?: number): Promise<{
        tasks: TreeTaskResponse[];
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
     * 完整加载策略：获取所有任务的完整树结构
     */
    loadWithFullStrategy(status?: TaskStatus | TaskStatus[], maxDepth?: number): Promise<any>;
    /**
     * 分页加载策略：分页获取根任务
     */
    loadWithPaginatedStrategy(status?: TaskStatus | TaskStatus[], page?: number, pageSize?: number): Promise<{
        tasks: TreeTaskResponse[];
        total: number;
        pagination: {
            page: number;
            page_size: number;
            total_pages: number;
            has_next: boolean;
            has_prev: boolean;
        };
    }>;
};
//# sourceMappingURL=task-tree-service.d.ts.map