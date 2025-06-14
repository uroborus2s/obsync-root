/**
 * 任务API客户端
 */

import { apiConfig } from '../config/api';
import type {
  CleanupResponse,
  CreateTaskRequest,
  ExecutorInfo,
  HealthCheckResponse,
  QueryTasksParams,
  Task,
  TaskOperationOptions,
  TaskStats,
  TaskTreeNode,
  UpdateTaskRequest
} from '../types/task';
import { mockTaskApi, shouldUseMockApi } from './mockClient';

class TaskApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // 优先使用环境变量中的API基础URL，然后是传入的baseUrl，最后是默认值
    this.baseUrl = baseUrl || apiConfig.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    // 处理204 No Content响应
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // 任务管理接口
  async createTask(request: CreateTaskRequest): Promise<Task> {
    if (shouldUseMockApi) {
      return mockTaskApi.createTask(request);
    }

    return this.request<Task>('', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async getTask(id: string): Promise<Task> {
    if (shouldUseMockApi) {
      return mockTaskApi.getTask(id);
    }

    return this.request<Task>(`/${id}`);
  }

  async updateTask(id: string, request: UpdateTaskRequest): Promise<Task> {
    if (shouldUseMockApi) {
      return mockTaskApi.updateTask(id, request);
    }

    return this.request<Task>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request)
    });
  }

  async deleteTask(
    id: string,
    options: { cascade?: boolean; force?: boolean } = {}
  ): Promise<void> {
    if (shouldUseMockApi) {
      return mockTaskApi.deleteTask(id, options);
    }

    const params = new URLSearchParams();
    if (options.cascade) params.append('cascade', 'true');
    if (options.force) params.append('force', 'true');

    const query = params.toString();
    const endpoint = query ? `/${id}?${query}` : `/${id}`;

    return this.request<void>(endpoint, {
      method: 'DELETE'
    });
  }

  async queryTasks(params: QueryTasksParams = {}): Promise<Task[]> {
    if (shouldUseMockApi) {
      return mockTaskApi.queryTasks(params);
    }

    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    const query = searchParams.toString();
    const endpoint = query ? `?${query}` : '';

    return this.request<Task[]>(endpoint);
  }

  async getTaskTree(rootId?: string): Promise<TaskTreeNode[]> {
    if (shouldUseMockApi) {
      return mockTaskApi.getTaskTree(rootId);
    }

    const params = new URLSearchParams();
    if (rootId) params.append('rootId', rootId);

    const query = params.toString();
    const endpoint = `/tree${query ? `?${query}` : ''}`;

    return this.request<TaskTreeNode[]>(endpoint);
  }

  // 任务控制接口
  async startTask(
    id: string,
    options: TaskOperationOptions = {}
  ): Promise<void> {
    if (shouldUseMockApi) {
      return mockTaskApi.startTask(id);
    }

    return this.request<void>(`/${id}/start`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async pauseTask(
    id: string,
    options: TaskOperationOptions = {}
  ): Promise<void> {
    if (shouldUseMockApi) {
      return mockTaskApi.pauseTask(id);
    }

    return this.request<void>(`/${id}/pause`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async resumeTask(
    id: string,
    options: TaskOperationOptions = {}
  ): Promise<void> {
    if (shouldUseMockApi) {
      return mockTaskApi.resumeTask(id);
    }

    return this.request<void>(`/${id}/resume`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async stopTask(
    id: string,
    options: TaskOperationOptions = {}
  ): Promise<void> {
    if (shouldUseMockApi) {
      return mockTaskApi.stopTask(id);
    }

    return this.request<void>(`/${id}/stop`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  // 统计信息接口
  async getStats(): Promise<TaskStats> {
    if (shouldUseMockApi) {
      return mockTaskApi.getStats();
    }

    return this.request<TaskStats>('/stats');
  }

  // 执行器管理接口
  async getExecutors(): Promise<{ executors: ExecutorInfo[] }> {
    if (shouldUseMockApi) {
      return mockTaskApi.getExecutors();
    }

    return this.request<{ executors: ExecutorInfo[] }>('/executors');
  }

  // 清理接口
  async cleanup(olderThan?: Date): Promise<CleanupResponse> {
    if (shouldUseMockApi) {
      return mockTaskApi.cleanup(olderThan);
    }

    const body = olderThan ? { olderThan: olderThan.toISOString() } : {};

    return this.request<CleanupResponse>('/cleanup', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // 健康检查
  async healthCheck(): Promise<HealthCheckResponse> {
    if (shouldUseMockApi) {
      return mockTaskApi.healthCheck();
    }

    return this.request<HealthCheckResponse>('/health');
  }
}

// 导出单例实例
export const taskApiClient = new TaskApiClient();
export default taskApiClient;
