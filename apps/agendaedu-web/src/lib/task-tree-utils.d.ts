import { CompletedTask, RunningTask, TaskStatus } from '@/types/task.types';
export type TaskNode<T = RunningTask | CompletedTask> = T & {
    children: TaskNode<T>[];
    level: number;
    isExpanded?: boolean;
    hasChildren: boolean;
};
/**
 * 将扁平的任务列表转换为树形结构
 */
export declare function buildTaskTree<T extends RunningTask | CompletedTask>(tasks: T[]): TaskNode<T>[];
/**
 * 将树形结构扁平化为可渲染的列表
 */
export declare function flattenTaskTree<T extends RunningTask | CompletedTask>(nodes: TaskNode<T>[]): TaskNode<T>[];
/**
 * 切换节点的展开/收缩状态
 */
export declare function toggleNodeExpansion<T extends RunningTask | CompletedTask>(nodes: TaskNode<T>[], nodeId: string): TaskNode<T>[];
/**
 * 展开所有节点
 */
export declare function expandAllNodes<T extends RunningTask | CompletedTask>(nodes: TaskNode<T>[]): TaskNode<T>[];
/**
 * 收缩所有节点
 */
export declare function collapseAllNodes<T extends RunningTask | CompletedTask>(nodes: TaskNode<T>[]): TaskNode<T>[];
/**
 * 过滤任务树的选项
 */
export interface TaskTreeFilterOptions {
    searchTerm?: string;
    statuses?: TaskStatus[];
    taskTypes?: string[];
}
/**
 * 根据过滤条件过滤任务树
 */
export declare function filterTaskTree<T extends RunningTask | CompletedTask>(nodes: TaskNode<T>[], options?: TaskTreeFilterOptions): TaskNode<T>[];
/**
 * 获取任务树中所有的任务类型
 */
export declare function getTaskTypesFromTree<T extends RunningTask | CompletedTask>(nodes: TaskNode<T>[]): string[];
/**
 * 计算过滤后的任务数量
 */
export declare function countFilteredTasks<T extends RunningTask | CompletedTask>(nodes: TaskNode<T>[]): number;
//# sourceMappingURL=task-tree-utils.d.ts.map