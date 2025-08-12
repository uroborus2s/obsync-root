import {
  CompletedTask,
  CreateTaskRequest,
  IncrementalSyncRequest,
  IncrementalSyncStatus,
  PaginatedResponse,
  RunningTask,
  TaskQueryParams,
  TaskStats,
  TaskStatus,
  TaskTreeQueryParams,
  TaskTreeResponse,
  UpdateTaskRequest,
} from '@/types/task.types'

// 新增：树形任务接口的类型定义
export interface TreeTaskQueryParams {
  status?: string | string[]
  page?: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface TreeTaskResponse {
  id: string
  parent_id?: string | null
  name: string
  description?: string | null
  task_type: string
  status: TaskStatus
  priority: number
  progress: number
  executor_name?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
  started_at?: string | null
  completed_at?: string | null
  childrenCount: number
  depth: number
  children?: TreeTaskResponse[]
}

export interface TreeTaskListResponse {
  tasks: TreeTaskResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

/**
 * 任务API服务类
 * 提供所有任务相关的API调用方法，对接icalink-sync服务
 */
export class TaskApiService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    // 统一使用kwps.jlufe.edu.cn的API地址
    this.baseUrl = baseUrl || 'https://kwps.jlufe.edu.cn'
  }

  /**
   * 创建请求配置，包含401错误处理和自动重定向
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        credentials: 'include', // 包含cookies以支持服务端session
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      // 处理401未授权错误
      if (response.status === 401) {
        this.handleUnauthorized()
        throw new Error('需要重新授权')
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API请求失败: ${response.status} ${errorText}`)
      }

      return response.json()
    } catch (error) {
      // 网络错误或其他错误
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查网络连接')
      }
      throw error
    }
  }

  /**
   * 处理401未授权响应 - 使用统一的认证管理器重定向到WPS授权页面
   */
  private handleUnauthorized(): void {

    // 动态导入认证管理器以避免循环依赖
    import('./gateway-auth-manager')
      .then(({ authManager }) => {
        console.log('✅ TaskApiService: 成功加载认证管理器')
        // 保存当前页面URL，授权后返回
        const currentUrl = window.location.href
        console.log(
          '🔄 TaskApiService: 准备重定向到WPS授权页面，返回URL:',
          currentUrl
        )

        // 使用统一的认证管理器进行重定向
        authManager.redirectToAuth(currentUrl)
      })
      .catch((error) => {
        console.error('❌ TaskApiService: 加载认证管理器失败:', error)
        // 降级处理：直接使用配置文件的重定向方法
        console.log('🔄 TaskApiService: 使用降级方案，直接调用WPS认证配置')
        import('@/config/wps-auth-config')
          .then(({ redirectToWpsAuth }) => {
            console.log('✅ TaskApiService: 成功加载WPS认证配置，开始重定向')
            redirectToWpsAuth(window.location.href)
          })
          .catch((configError) => {
            console.error('❌ TaskApiService: 降级方案也失败了:', configError)
          })
      })
  }

  // ========== 新增：树形任务接口 ==========

  /**
   * 获取根任务列表（树形展示）
   */
  async getTaskTreeRoots(
    params?: TreeTaskQueryParams
  ): Promise<TreeTaskListResponse> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.status) {
        const statusParam = Array.isArray(params.status)
          ? params.status.join(',')
          : params.status
        queryString.append('status', statusParam)
      }
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
      if (params.sort_by) queryString.append('sort_by', params.sort_by)
      if (params.sort_order) queryString.append('sort_order', params.sort_order)
    }

    const endpoint = `/apiv2/tasks/tree/roots${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<TreeTaskListResponse>(endpoint)
  }

  /**
   * 获取任务子任务列表
   */
  async getTaskTreeChildren(
    taskId: string,
    params?: TreeTaskQueryParams
  ): Promise<TreeTaskListResponse> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.status) {
        const statusParam = Array.isArray(params.status)
          ? params.status.join(',')
          : params.status
        queryString.append('status', statusParam)
      }
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
      if (params.sort_by) queryString.append('sort_by', params.sort_by)
      if (params.sort_order) queryString.append('sort_order', params.sort_order)
    }

    const endpoint = `/apiv2/tasks/${taskId}/tree/children${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<TreeTaskListResponse>(endpoint, {
      headers: {
        'Accept-Encoding': 'identity',
      },
    })
  }

  /**
   * 获取完整任务树结构
   */
  async getTaskTreeComplete(
    taskId: string,
    maxDepth?: number
  ): Promise<TreeTaskResponse> {
    const queryString = new URLSearchParams()
    if (maxDepth) queryString.append('max_depth', maxDepth.toString())

    const endpoint = `/apiv2/tasks/${taskId}/tree/complete${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<TreeTaskResponse>(endpoint)
  }

  /**
   * 构建完整的任务树数据（推荐使用）
   * 先获取根任务，然后根据需要获取子任务
   */
  async buildTaskTreeData(params?: TreeTaskQueryParams): Promise<{
    roots: TreeTaskResponse[]
    total: number
    pagination: {
      page: number
      page_size: number
      total_pages: number
      has_next: boolean
      has_prev: boolean
    }
  }> {
    // 1. 获取根任务列表
    const rootsResponse = await this.getTaskTreeRoots(params)

    return {
      roots: rootsResponse.tasks,
      total: rootsResponse.total,
      pagination: {
        page: rootsResponse.page,
        page_size: rootsResponse.page_size,
        total_pages: rootsResponse.total_pages,
        has_next: rootsResponse.has_next,
        has_prev: rootsResponse.has_prev,
      },
    }
  }

  /**
   * 懒加载获取子任务数据
   */
  async loadTaskChildren(
    taskId: string,
    params?: TreeTaskQueryParams
  ): Promise<TreeTaskResponse[]> {
    const response = await this.getTaskTreeChildren(taskId, params)
    return response.tasks
  }

  /**
   * 获取完整的任务树（递归获取所有层级）
   * 注意：这个方法可能会产生大量API调用，建议谨慎使用
   */
  async getFullTaskTree(
    params?: TreeTaskQueryParams,
    maxDepth: number = 5
  ): Promise<TreeTaskResponse[]> {
    // 获取根任务
    const rootsResponse = await this.getTaskTreeRoots(params)

    // 递归获取每个根任务的完整树
    const fullTrees = await Promise.all(
      rootsResponse.tasks.map(async (rootTask) => {
        if (rootTask.childrenCount > 0) {
          try {
            // 获取完整的子树
            return await this.getTaskTreeComplete(rootTask.id, maxDepth)
          } catch (error) {
            console.warn(
              `Failed to load complete tree for task ${rootTask.id}:`,
              error
            )
            return rootTask
          }
        }
        return rootTask
      })
    )

    return fullTrees
  }

  // ========== 任务树相关接口（保持向后兼容） ==========

  /**
   * 获取任务统计信息
   */
  async getTaskStats(): Promise<TaskStats> {
    return this.makeRequest<TaskStats>('/apiv2/tasks/statistics')
  }

  /**
   * 获取任务树视图（已弃用，建议使用 getTaskTreeRoots）
   * @deprecated 请使用 getTaskTreeRoots 替代
   */
  async getTaskTree(params?: TaskTreeQueryParams): Promise<TaskTreeResponse> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.maxDepth)
        queryString.append('maxDepth', params.maxDepth.toString())
      if (params.includePlaceholders !== undefined)
        queryString.append(
          'includePlaceholders',
          params.includePlaceholders.toString()
        )
      if (params.limit) queryString.append('limit', params.limit.toString())
      if (params.offset) queryString.append('offset', params.offset.toString())
      if (params.status)
        queryString.append(
          'status',
          Array.isArray(params.status) ? params.status.join(',') : params.status
        )
    }

    const endpoint = `/apiv2/tasks/tree${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<TaskTreeResponse>(endpoint)
  }

  /**
   * 获取根任务列表（已弃用，建议使用 getTaskTreeRoots）
   * @deprecated 请使用 getTaskTreeRoots 替代
   */
  async getRootTasks(
    params?: TaskQueryParams
  ): Promise<PaginatedResponse<RunningTask>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.status)
        queryString.append(
          'status',
          Array.isArray(params.status) ? params.status.join(',') : params.status
        )
      if (params.includeChildren) queryString.append('includeChildren', 'true')
      if (params.includeAncestors)
        queryString.append('includeAncestors', 'true')
      if (params.limit) queryString.append('limit', params.limit.toString())
      if (params.offset) queryString.append('offset', params.offset.toString())
    }

    const endpoint = `/apiv2/tasks/roots${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<PaginatedResponse<RunningTask>>(endpoint)
  }

  /**
   * 获取任务列表（通用方法）
   */
  async getTasks(
    params?: TaskQueryParams
  ): Promise<PaginatedResponse<RunningTask>> {
    const queryString = new URLSearchParams()

    if (params) {
      if (params.status)
        queryString.append(
          'status',
          Array.isArray(params.status) ? params.status.join(',') : params.status
        )
      if (params.task_type)
        queryString.append(
          'task_type',
          Array.isArray(params.task_type)
            ? params.task_type.join(',')
            : params.task_type
        )
      if (params.executor_name)
        queryString.append('executor_name', params.executor_name)
      if (params.created_from)
        queryString.append('created_from', params.created_from)
      if (params.created_to) queryString.append('created_to', params.created_to)
      if (params.page) queryString.append('page', params.page.toString())
      if (params.page_size)
        queryString.append('page_size', params.page_size.toString())
      if (params.sort_by) queryString.append('sort_by', params.sort_by)
      if (params.sort_order) queryString.append('sort_order', params.sort_order)
      if (params.include_children)
        queryString.append('include_children', 'true')
    }

    const endpoint = `/apiv2/tasks${queryString.toString() ? `?${queryString.toString()}` : ''}`
    return this.makeRequest<PaginatedResponse<RunningTask>>(endpoint)
  }

  /**
   * 获取运行中任务列表
   */
  async getRunningTasks(
    params?: TaskQueryParams
  ): Promise<PaginatedResponse<RunningTask>> {
    const runningStatuses = [
      TaskStatus.PENDING,
      TaskStatus.RUNNING,
      TaskStatus.PAUSED,
    ]
    return this.getTasks({ ...params, status: runningStatuses })
  }

  /**
   * 获取已完成任务列表
   */
  async getCompletedTasks(
    params?: TaskQueryParams
  ): Promise<PaginatedResponse<CompletedTask>> {
    const completedStatuses = [TaskStatus.SUCCESS, TaskStatus.FAILED]
    const result = await this.getTasks({ ...params, status: completedStatuses })
    return result as unknown as PaginatedResponse<CompletedTask>
  }

  /**
   * 根据ID获取任务详情
   */
  async getTaskById(id: string): Promise<RunningTask | CompletedTask> {
    return this.makeRequest<RunningTask | CompletedTask>(`/apiv2/tasks/${id}`)
  }

  /**
   * 根据名称获取任务详情
   */
  async getTaskByName(name: string): Promise<RunningTask | CompletedTask> {
    return this.makeRequest<RunningTask | CompletedTask>(
      `/apiv2/tasks/by-name/${encodeURIComponent(name)}`
    )
  }

  /**
   * 获取任务的子任务列表
   */
  async getTaskChildren(parentId: string): Promise<RunningTask[]> {
    return this.makeRequest<RunningTask[]>(`/apiv2/tasks/${parentId}/children`)
  }

  // ========== 任务操作接口 ==========

  /**
   * 创建新任务
   */
  async createTask(task: CreateTaskRequest): Promise<{ id: string }> {
    return this.makeRequest<{ id: string }>('/apiv2/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    })
  }

  /**
   * 启动任务
   */
  async startTask(id: string, reason?: string): Promise<void> {
    return this.makeRequest<void>(`/apiv2/tasks/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  /**
   * 暂停任务
   */
  async pauseTask(id: string, reason?: string): Promise<void> {
    return this.makeRequest<void>(`/apiv2/tasks/${id}/pause`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  /**
   * 恢复任务
   */
  async resumeTask(id: string, reason?: string): Promise<void> {
    return this.makeRequest<void>(`/apiv2/tasks/${id}/resume`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  /**
   * 取消任务
   */
  async cancelTask(id: string, reason?: string): Promise<void> {
    return this.makeRequest<void>(`/apiv2/tasks/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  }

  /**
   * 标记任务成功
   */
  async markTaskSuccess(
    id: string,
    result?: unknown,
    reason?: string
  ): Promise<void> {
    return this.makeRequest<void>(`/apiv2/tasks/${id}/success`, {
      method: 'POST',
      body: JSON.stringify({ result, reason }),
    })
  }

  /**
   * 标记任务失败
   */
  async markTaskFail(
    id: string,
    error?: string,
    reason?: string
  ): Promise<void> {
    return this.makeRequest<void>(`/apiv2/tasks/${id}/fail`, {
      method: 'POST',
      body: JSON.stringify({ error, reason }),
    })
  }

  /**
   * 恢复所有可恢复的任务
   */
  async recoverTasks(): Promise<void> {
    return this.makeRequest<void>('/apiv2/tasks/recovery', {
      method: 'POST',
    })
  }

  // ========== 增量同步接口 ==========

  /**
   * 启动增量同步任务
   * @param config - 同步配置
   */
  async startIncrementalSync(
    config: IncrementalSyncRequest
  ): Promise<IncrementalSyncStatus> {
    return this.makeRequest<IncrementalSyncStatus>(
      '/apiv2/tasks/incremental-sync',
      {
        method: 'POST',
        body: JSON.stringify(config),
      }
    )
  }

  /**
   * 获取增量同步状态
   * @param xnxq - 学年学期
   */
  async getIncrementalSyncStatus(xnxq: string): Promise<IncrementalSyncStatus> {
    return this.makeRequest<IncrementalSyncStatus>(
      `/api/tasks/incremental-sync/${xnxq}`
    )
  }

  // ========== 兼容性方法 ==========

  /**
   * 更新任务（兼容现有代码）
   */
  async updateTask(id: string, updates: UpdateTaskRequest): Promise<void> {
    // 根据更新内容调用相应的操作接口
    if (updates.status === TaskStatus.RUNNING) {
      return this.startTask(id)
    } else if (updates.status === TaskStatus.PAUSED) {
      return this.pauseTask(id)
    } else if (updates.status === TaskStatus.CANCELLED) {
      return this.cancelTask(id)
    }

    throw new Error('不支持的任务更新操作')
  }

  /**
   * 重试任务（兼容现有代码）
   */
  async retryTask(id: string): Promise<{ id: string }> {
    // 首先取消当前任务，然后重新启动
    await this.cancelTask(id, '任务重试')
    await this.startTask(id, '任务重试')
    return { id }
  }

  /**
   * 删除任务（兼容现有代码）
   */
  async deleteTask(id: string): Promise<void> {
    return this.cancelTask(id, '删除任务')
  }

  /**
   * 获取任务日志（兼容现有代码）
   */
  async getTaskLogs(_id: string, _limit = 100): Promise<string[]> {
    // 这个功能需要后端实现相应接口
    throw new Error('任务日志功能暂未实现')
  }
}

// 导出单例实例
export const taskApi = new TaskApiService()

/**
 * 任务状态颜色映射
 */
export const taskStatusColors = {
  [TaskStatus.PENDING]:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [TaskStatus.RUNNING]:
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [TaskStatus.PAUSED]:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  [TaskStatus.SUCCESS]:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [TaskStatus.FAILED]:
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  [TaskStatus.CANCELLED]:
    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  [TaskStatus.TIMEOUT]:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
}

/**
 * 任务状态中文标签
 */
export const taskStatusLabels = {
  [TaskStatus.PENDING]: '等待中',
  [TaskStatus.RUNNING]: '运行中',
  [TaskStatus.PAUSED]: '已暂停',
  [TaskStatus.SUCCESS]: '已完成',
  [TaskStatus.FAILED]: '失败',
  [TaskStatus.CANCELLED]: '已取消',
  [TaskStatus.TIMEOUT]: '超时',
}
