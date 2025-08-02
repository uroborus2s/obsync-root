import { taskApi } from '@/lib/task-api';
/**
 * 任务树数据服务
 * 负责管理任务树的数据获取、缓存和状态
 */
export class TaskTreeService {
    nodeStates = new Map();
    rootTasks = [];
    totalCount = 0;
    /**
     * 获取根任务列表
     */
    async loadRootTasks(params) {
        try {
            const response = await taskApi.getTaskTreeRoots(params);
            const data = response.data ||
                response;
            const items = data.items || data.tasks || [];
            const total = data.total || 0;
            this.rootTasks = items;
            this.totalCount = total;
            items.forEach((task) => {
                if (!this.nodeStates.has(task.id)) {
                    this.nodeStates.set(task.id, {
                        id: task.id,
                        isExpanded: false,
                        isLoading: false,
                        children: [],
                        hasLoadedChildren: task.childrenCount === 0,
                    });
                }
            });
            return {
                tasks: items,
                total: total,
                pagination: {
                    page: data.page || 1,
                    page_size: data.page_size || items.length,
                    total_pages: data.total_pages ||
                        Math.ceil(total / (data.page_size || items.length || 1)),
                    has_next: data.has_next || false,
                    has_prev: data.has_prev || false,
                },
            };
        }
        catch (error) {
            throw new Error(`获取根任务失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 懒加载子任务
     */
    async loadChildren(taskId, params) {
        const nodeState = this.nodeStates.get(taskId);
        if (!nodeState) {
            throw new Error(`任务节点 ${taskId} 不存在`);
        }
        if (nodeState.hasLoadedChildren) {
            return nodeState.children;
        }
        nodeState.isLoading = true;
        this.nodeStates.set(taskId, nodeState);
        try {
            // 自动循环分页直到拿完
            const pageSize = params?.page_size ?? 100;
            let page = 1;
            const allChildren = [];
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const response = await taskApi.getTaskTreeChildren(taskId, {
                    ...params,
                    page,
                    page_size: pageSize,
                });
                const data = response.data ??
                    response; // 兼容两种包装
                const items = data.items || data.tasks || [];
                allChildren.push(...items);
                if (!data.has_next)
                    break;
                page += 1;
            }
            nodeState.children = allChildren;
            nodeState.hasLoadedChildren = true;
            nodeState.isLoading = false;
            this.nodeStates.set(taskId, nodeState);
            allChildren.forEach((child) => {
                // 兼容 childrenCount/ChildrenCount 字段
                child.childrenCount =
                    child.childrenCount ?? child.ChildrenCount ?? 0;
                if (!this.nodeStates.has(child.id)) {
                    this.nodeStates.set(child.id, {
                        id: child.id,
                        isExpanded: false,
                        isLoading: false,
                        children: [],
                        hasLoadedChildren: child.childrenCount === 0,
                    });
                }
            });
            return allChildren;
        }
        catch (error) {
            nodeState.isLoading = false;
            this.nodeStates.set(taskId, nodeState);
            throw new Error(`加载子任务失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }
    /**
     * 切换节点展开状态
     */
    async toggleNodeExpansion(taskId) {
        const nodeState = this.nodeStates.get(taskId);
        if (!nodeState) {
            throw new Error(`任务节点 ${taskId} 不存在`);
        }
        if (!nodeState.isExpanded && !nodeState.hasLoadedChildren) {
            await this.loadChildren(taskId);
        }
        nodeState.isExpanded = !nodeState.isExpanded;
        this.nodeStates.set(taskId, nodeState);
        return nodeState.isExpanded;
    }
    /**
     * 展开所有已加载的节点
     */
    expandAll() {
        this.nodeStates.forEach((state, id) => {
            if (state.hasLoadedChildren && state.children.length > 0) {
                state.isExpanded = true;
                this.nodeStates.set(id, state);
            }
        });
    }
    /**
     * 收缩所有节点
     */
    collapseAll() {
        this.nodeStates.forEach((state, id) => {
            state.isExpanded = false;
            this.nodeStates.set(id, state);
        });
    }
    /**
     * 获取扁平化的任务列表（用于表格显示）
     */
    getFlattenedTasks() {
        const result = [];
        const traverse = (tasks, level) => {
            tasks.forEach((task) => {
                const nodeState = this.nodeStates.get(task.id);
                const isExpanded = nodeState?.isExpanded || false;
                const hasChildren = task.childrenCount > 0;
                result.push({
                    ...task,
                    level,
                    isExpanded,
                    hasChildren,
                });
                if (isExpanded && nodeState?.children) {
                    traverse(nodeState.children, level + 1);
                }
            });
        };
        traverse(this.rootTasks, 0);
        return result;
    }
    /**
     * 获取节点状态
     */
    getNodeState(taskId) {
        return this.nodeStates.get(taskId);
    }
    /**
     * 获取所有根任务
     */
    getRootTasks() {
        return this.rootTasks;
    }
    /**
     * 获取总数
     */
    getTotalCount() {
        return this.totalCount;
    }
    /**
     * 清除缓存
     */
    clearCache() {
        this.nodeStates.clear();
        this.rootTasks = [];
        this.totalCount = 0;
    }
    /**
     * 刷新指定任务的数据
     */
    async refreshTask(taskId) {
        const nodeState = this.nodeStates.get(taskId);
        if (nodeState) {
            nodeState.hasLoadedChildren = false;
            nodeState.children = [];
            this.nodeStates.set(taskId, nodeState);
            if (nodeState.isExpanded) {
                await this.loadChildren(taskId);
            }
        }
    }
    /**
     * 预加载指定层级的任务
     */
    async preloadLevel(maxLevel = 2) {
        const loadLevel = async (tasks, currentLevel) => {
            if (currentLevel >= maxLevel)
                return;
            for (const task of tasks) {
                if (task.childrenCount > 0) {
                    try {
                        const children = await this.loadChildren(task.id);
                        if (children.length > 0) {
                            await loadLevel(children, currentLevel + 1);
                        }
                    }
                    catch (error) {
                        // eslint-disable-next-line no-console
                        console.warn(`预加载任务 ${task.id} 失败:`, error);
                    }
                }
            }
        };
        await loadLevel(this.rootTasks, 0);
    }
}
// 导出单例实例
export const taskTreeService = new TaskTreeService();
/**
 * 任务数据获取策略
 */
export const TaskDataStrategy = {
    /**
     * 懒加载策略（推荐）
     * 适用于大量任务的场景，按需加载子任务
     */
    LAZY_LOAD: 'lazy_load',
    /**
     * 完整加载策略
     * 适用于任务数量较少，需要完整树结构的场景
     */
    FULL_LOAD: 'full_load',
    /**
     * 分页加载策略
     * 适用于根任务数量很多的场景
     */
    PAGINATED_LOAD: 'paginated_load',
};
/**
 * 根据不同策略获取任务数据的工具函数
 */
export const TaskDataHelper = {
    /**
     * 懒加载策略：先加载根任务，按需加载子任务
     */
    async loadWithLazyStrategy(status, page = 1, pageSize = 20) {
        const params = {
            status: Array.isArray(status) ? status.join(',') : status,
            page,
            page_size: pageSize,
            sort_by: 'created_at',
            sort_order: 'desc',
        };
        return taskTreeService.loadRootTasks(params);
    },
    /**
     * 完整加载策略：获取所有任务的完整树结构
     */
    async loadWithFullStrategy(status, maxDepth = 5) {
        const params = {
            status: Array.isArray(status) ? status.join(',') : status,
            page: 1,
            page_size: 1000, // 获取更多数据以构建完整树
            sort_by: 'created_at',
            sort_order: 'desc',
        };
        return taskApi.getFullTaskTree(params, maxDepth);
    },
    /**
     * 分页加载策略：分页获取根任务
     */
    async loadWithPaginatedStrategy(status, page = 1, pageSize = 50) {
        const params = {
            status: Array.isArray(status) ? status.join(',') : status,
            page,
            page_size: pageSize,
            sort_by: 'created_at',
            sort_order: 'desc',
        };
        return taskTreeService.loadRootTasks(params);
    },
};
//# sourceMappingURL=task-tree-service.js.map