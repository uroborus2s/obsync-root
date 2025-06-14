/**
 * Mock API客户端，用于开发和测试
 */

import type {
  CreateTaskRequest,
  QueryTasksParams,
  Task,
  TaskTreeNode,
  UpdateTaskRequest
} from '../types/task';
import { buildTaskTree, delay, generateId, mockTasks } from './mockData';

class MockTaskApiClient {
  private tasks: Task[] = [...mockTasks];

  private async mockDelay() {
    await delay(Math.random() * 1000 + 500); // 500-1500ms 随机延迟
  }

  private updateTaskTree() {
    // 当任务数据更新时，重新构建树形结构
    return buildTaskTree(this.tasks);
  }

  async createTask(request: CreateTaskRequest): Promise<Task> {
    await this.mockDelay();

    const now = new Date().toISOString();
    const newTask: Task = {
      id: generateId(),
      ...request,
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      children: []
    };

    this.tasks.push(newTask);
    return newTask;
  }

  async getTask(id: string): Promise<Task> {
    await this.mockDelay();

    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`任务 ${id} 不存在`);
    }
    return task;
  }

  async updateTask(id: string, request: UpdateTaskRequest): Promise<Task> {
    await this.mockDelay();

    const taskIndex = this.tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      throw new Error(`任务 ${id} 不存在`);
    }

    const updatedTask = {
      ...this.tasks[taskIndex],
      ...request,
      updatedAt: new Date().toISOString()
    };

    this.tasks[taskIndex] = updatedTask;
    return updatedTask;
  }

  async deleteTask(
    id: string,
    options: { cascade?: boolean; force?: boolean } = {}
  ): Promise<void> {
    await this.mockDelay();

    const taskIndex = this.tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      throw new Error(`任务 ${id} 不存在`);
    }

    if (options.cascade) {
      // 级联删除：删除所有子任务
      const toDelete = new Set([id]);
      let changed = true;

      while (changed) {
        changed = false;
        this.tasks.forEach((task) => {
          if (
            task.parentId &&
            toDelete.has(task.parentId) &&
            !toDelete.has(task.id)
          ) {
            toDelete.add(task.id);
            changed = true;
          }
        });
      }

      this.tasks = this.tasks.filter((task) => !toDelete.has(task.id));
    } else {
      // 只删除指定任务
      this.tasks.splice(taskIndex, 1);
    }
  }

  async queryTasks(params: QueryTasksParams = {}): Promise<Task[]> {
    await this.mockDelay();

    let filteredTasks = [...this.tasks];

    // 按父任务筛选
    if (params.parentId !== undefined) {
      filteredTasks = filteredTasks.filter(
        (task) => task.parentId === params.parentId
      );
    }

    // 按状态筛选
    if (params.status) {
      const statuses = Array.isArray(params.status)
        ? params.status
        : [params.status];
      filteredTasks = filteredTasks.filter((task) =>
        statuses.includes(task.status)
      );
    }

    // 按类型筛选
    if (params.type) {
      filteredTasks = filteredTasks.filter((task) => task.type === params.type);
    }

    // 排序
    if (params.orderBy) {
      const direction = params.orderDirection === 'DESC' ? -1 : 1;
      filteredTasks.sort((a, b) => {
        // 简化排序，只支持基本字段
        let aValue: string | number;
        let bValue: string | number;

        switch (params.orderBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'createdAt':
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
          case 'updatedAt':
            aValue = a.updatedAt;
            bValue = b.updatedAt;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return -1 * direction;
        if (aValue > bValue) return 1 * direction;
        return 0;
      });
    }

    // 分页
    if (params.offset !== undefined && params.limit !== undefined) {
      filteredTasks = filteredTasks.slice(
        params.offset,
        params.offset + params.limit
      );
    }

    return filteredTasks;
  }

  async getTaskTree(rootId?: string): Promise<TaskTreeNode[]> {
    await this.mockDelay();

    const tree = this.updateTaskTree();

    if (rootId) {
      const rootNode = this.findNodeInTree(tree, rootId);
      return rootNode ? [rootNode] : [];
    }

    return tree;
  }

  private findNodeInTree(
    tree: TaskTreeNode[],
    id: string
  ): TaskTreeNode | null {
    for (const node of tree) {
      if (node.id === id) {
        return node;
      }
      const found = this.findNodeInTree(node.children, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  async startTask(id: string): Promise<void> {
    await this.mockDelay();

    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`任务 ${id} 不存在`);
    }

    if (!['pending', 'failed', 'stopped'].includes(task.status)) {
      throw new Error(`任务状态 ${task.status} 无法启动`);
    }

    task.status = 'running';
    task.updatedAt = new Date().toISOString();
  }

  async pauseTask(id: string): Promise<void> {
    await this.mockDelay();

    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`任务 ${id} 不存在`);
    }

    if (task.status !== 'running') {
      throw new Error(`任务状态 ${task.status} 无法暂停`);
    }

    task.status = 'paused';
    task.updatedAt = new Date().toISOString();
  }

  async resumeTask(id: string): Promise<void> {
    await this.mockDelay();

    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`任务 ${id} 不存在`);
    }

    if (task.status !== 'paused') {
      throw new Error(`任务状态 ${task.status} 无法恢复`);
    }

    task.status = 'running';
    task.updatedAt = new Date().toISOString();
  }

  async stopTask(id: string): Promise<void> {
    await this.mockDelay();

    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new Error(`任务 ${id} 不存在`);
    }

    if (!['running', 'paused'].includes(task.status)) {
      throw new Error(`任务状态 ${task.status} 无法停止`);
    }

    task.status = 'stopped';
    task.updatedAt = new Date().toISOString();
  }

  async getStats(): Promise<import('../types/task').TaskStats> {
    await this.mockDelay();

    const total = this.tasks.length;
    const statusCounts = this.tasks.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const completed = statusCounts.completed || 0;
    const failed = statusCounts.failed || 0;
    const successRate =
      total > 0 ? (completed / (completed + failed)) * 100 : 0;

    return {
      total,
      pending: statusCounts.pending || 0,
      running: statusCounts.running || 0,
      paused: statusCounts.paused || 0,
      completed,
      failed,
      stopped: statusCounts.stopped || 0,
      avgExecutionTime: 2500, // 模拟平均执行时间
      successRate
    };
  }

  async getExecutors(): Promise<{
    executors: import('../types/task').ExecutorInfo[];
  }> {
    await this.mockDelay();
    return {
      executors: [
        {
          name: 'http-request',
          description: 'HTTP请求执行器',
          defaultConfig: { timeout: 30000, retries: 3 }
        },
        {
          name: 'shell-command',
          description: 'Shell命令执行器',
          defaultConfig: { timeout: 60000, retries: 1 }
        },
        {
          name: 'file-processor',
          description: '文件处理执行器',
          defaultConfig: { batchSize: 100 }
        }
      ]
    };
  }

  async cleanup(
    olderThan?: Date
  ): Promise<import('../types/task').CleanupResponse> {
    await this.mockDelay();

    const cutoffDate =
      olderThan || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30天前
    const initialCount = this.tasks.length;

    this.tasks = this.tasks.filter((task) => {
      const taskDate = new Date(task.createdAt);
      return (
        taskDate >= cutoffDate ||
        !['completed', 'failed', 'stopped'].includes(task.status)
      );
    });

    const deletedCount = initialCount - this.tasks.length;
    return { deletedCount };
  }

  async healthCheck(): Promise<import('../types/task').HealthCheckResponse> {
    await this.mockDelay();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '@stratix/tasks-api',
      taskManager: {
        running: true
      }
    };
  }
}

// 创建mock实例
export const mockTaskApi = new MockTaskApiClient();

// 导入配置
import { shouldUseMockApi as configShouldUseMockApi } from '../config/api';

// 导出配置中的shouldUseMockApi
export const shouldUseMockApi = configShouldUseMockApi;
