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
import {
  mockCompletedTasksResponse,
  mockTaskStats,
  mockTasksResponse,
} from './mock-data'

/**
 * Mock 实现的任务API服务
 * 用于开发和测试环境
 */
export class MockTaskApiService {
  constructor(_baseUrl?: string) {
    // Mock 实现不需要实际的 baseUrl
  }

  async getTaskStats(): Promise<TaskStats> {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 100))
    return mockTaskStats
  }

  async getTaskTree(_params?: TaskTreeQueryParams): Promise<TaskTreeResponse> {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 150))
    return {
      nodes: [],
      total: 0,
      maxDepth: 0,
      hasMore: false,
    }
  }

  async getRootTasks(
    _params?: TaskQueryParams
  ): Promise<PaginatedResponse<RunningTask>> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    const task = mockTasksResponse.items.find(
      (task: RunningTask) => task.id === 'task-001'
    )
    return {
      ...mockTasksResponse,
      items: task ? [task] : [],
      total: task ? 1 : 0,
    }
  }

  async getRunningTasks(
    _params?: TaskQueryParams
  ): Promise<PaginatedResponse<RunningTask>> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    const task = mockTasksResponse.items.find(
      (task: RunningTask) => task.id === 'task-001'
    )
    return {
      ...mockTasksResponse,
      items: task ? [task] : [],
      total: task ? 1 : 0,
    }
  }

  async getCompletedTasks(
    _params?: TaskQueryParams
  ): Promise<PaginatedResponse<CompletedTask>> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return mockCompletedTasksResponse
  }

  async getTaskById(id: string): Promise<RunningTask | CompletedTask> {
    await new Promise((resolve) => setTimeout(resolve, 100))

    const runningTask = mockTasksResponse.items.find(
      (task: RunningTask) => task.id === id
    )
    if (runningTask) return runningTask

    const completedTask = mockCompletedTasksResponse.items.find(
      (task: CompletedTask) => task.id === id
    )
    if (completedTask) return completedTask

    throw new Error(`Task not found: ${id}`)
  }

  async getTaskByName(name: string): Promise<RunningTask | CompletedTask> {
    await new Promise((resolve) => setTimeout(resolve, 100))

    const runningTask = mockTasksResponse.items.find(
      (task: RunningTask) => task.name === name
    )
    if (runningTask) return runningTask

    const completedTask = mockCompletedTasksResponse.items.find(
      (task: CompletedTask) => task.name === name
    )
    if (completedTask) return completedTask

    throw new Error(`Task not found: ${name}`)
  }

  async getTaskChildren(parentId: string): Promise<RunningTask[]> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return mockTasksResponse.items.filter(
      (task: RunningTask) => task.parent_id === parentId
    )
  }

  async createTask(task: CreateTaskRequest): Promise<{ id: string }> {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const id = `task-${Date.now()}`
    console.log('创建任务:', { id, ...task })
    return { id }
  }

  async startTask(id: string, reason?: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`启动任务: ${id}`, reason ? `原因: ${reason}` : '')
  }

  async pauseTask(id: string, reason?: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`暂停任务: ${id}`, reason ? `原因: ${reason}` : '')
  }

  async resumeTask(id: string, reason?: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`恢复任务: ${id}`, reason ? `原因: ${reason}` : '')
  }

  async cancelTask(id: string, reason?: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`取消任务: ${id}`, reason ? `原因: ${reason}` : '')
  }

  async markTaskSuccess(
    id: string,
    result?: unknown,
    reason?: string
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`任务成功: ${id}`, { result, reason })
  }

  async markTaskFail(
    id: string,
    error?: string,
    reason?: string
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    console.log(`任务失败: ${id}`, { error, reason })
  }

  async recoverTasks(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log('恢复所有任务')
  }

  async startIncrementalSync(
    config: IncrementalSyncRequest
  ): Promise<IncrementalSyncStatus> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    console.log('启动增量同步:', config)
    return {
      taskId: `sync-${Date.now()}`,
      xnxq: config.xnxq,
      status: 'running',
      startTime: new Date().toISOString(),
      totalTasks: 100,
      completedTasks: 0,
      failedTasks: 0,
      progress: 0,
      statistics: {
        totalCourses: 100,
        processedCourses: 0,
        teacherTasks: 50,
        studentTasks: 50,
        attendanceTables: 0,
        errors: [],
      },
    }
  }

  async getIncrementalSyncStatus(xnxq: string): Promise<IncrementalSyncStatus> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return {
      xnxq,
      status: 'idle',
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      progress: 0,
    }
  }

  // 兼容性方法
  async updateTask(id: string, updates: UpdateTaskRequest): Promise<void> {
    if (updates.status === TaskStatus.RUNNING) {
      return this.startTask(id)
    } else if (updates.status === TaskStatus.PAUSED) {
      return this.pauseTask(id)
    } else if (updates.status === TaskStatus.CANCELLED) {
      return this.cancelTask(id)
    }
    throw new Error('不支持的任务更新操作')
  }

  async retryTask(id: string): Promise<{ id: string }> {
    await this.cancelTask(id, '任务重试')
    await this.startTask(id, '任务重试')
    return { id }
  }

  async deleteTask(id: string): Promise<void> {
    return this.cancelTask(id, '删除任务')
  }

  async getTaskLogs(_id: string, _limit = 100): Promise<string[]> {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return ['模拟日志条目 1', '模拟日志条目 2', '模拟日志条目 3']
  }
}

// 判断是否使用Mock数据
const useMock =
  process.env.NODE_ENV === 'development' || !process.env.VITE_API_BASE_URL

// 导出任务API实例
export const taskApi = useMock ? new MockTaskApiService() : null

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
