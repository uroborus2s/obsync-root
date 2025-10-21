/**
 * 工作流 API 服务
 * 直接调用 tasks 库提供的接口，路径以 /api/workflows 开头
 */
import type {
  ApiResponse,
  CreateWorkflowDefinitionRequest,
  CreateWorkflowInstanceRequest,
  ExecutionLogQueryParams,
  HealthCheckResponse,
  PaginatedResponse,
  UpdateWorkflowDefinitionRequest,
  WorkflowDefinition,
  WorkflowDefinitionQueryParams,
  WorkflowExecutionLog,
  WorkflowGroupQueryParams,
  WorkflowGroupResponse,
  WorkflowInstance,
  WorkflowInstanceQueryParams,
  WorkflowStats,
} from '@/types/workflow.types'
import { WorkflowStatus } from '@/types/workflow.types'
import { apiClient } from './api-client'

export class WorkflowApiService {
  private readonly baseUrl = '/api/workflows'

  // ==================== 工作流定义管理 ====================

  /**
   * 创建工作流定义
   */
  async createWorkflowDefinition(
    request: CreateWorkflowDefinitionRequest
  ): Promise<WorkflowDefinition> {
    const response = await apiClient.post<ApiResponse<WorkflowDefinition>>(
      `${this.baseUrl}/definitions`,
      request
    )

    if (!response.success) {
      throw new Error(response.error || '创建工作流定义失败')
    }

    return response.data!
  }

  /**
   * 获取工作流定义列表
   */
  async getWorkflowDefinitions(
    params?: WorkflowDefinitionQueryParams
  ): Promise<PaginatedResponse<WorkflowDefinition>> {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.category) queryParams.append('category', params.category)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.tags) queryParams.append('tags', params.tags)
    if (params?.createdBy) queryParams.append('createdBy', params.createdBy)
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    const url = `${this.baseUrl}/definitions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response =
      await apiClient.get<ApiResponse<PaginatedResponse<WorkflowDefinition>>>(
        url
      )

    if (!response.success) {
      throw new Error(response.error || '获取工作流定义列表失败')
    }

    return response.data!
  }

  /**
   * 获取工作流定义详情（通过名称和版本）
   */
  async getWorkflowDefinition(
    name: string,
    version: string
  ): Promise<WorkflowDefinition> {
    const response = await apiClient.get<ApiResponse<WorkflowDefinition>>(
      `${this.baseUrl}/${name}/${version}`
    )

    if (!response.success) {
      throw new Error(response.error || '获取工作流定义详情失败')
    }

    return response.data!
  }

  /**
   * 获取工作流定义详情（通过ID）
   */
  async getWorkflowDefinitionById(id: number): Promise<WorkflowDefinition> {
    const response = await apiClient.get<ApiResponse<WorkflowDefinition>>(
      `${this.baseUrl}/definitions/${id}`
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || '获取工作流定义失败')
    }

    return response.data
  }

  /**
   * 更新工作流定义
   */
  async updateWorkflowDefinition(
    name: string,
    version: string,
    request: UpdateWorkflowDefinitionRequest
  ): Promise<WorkflowDefinition> {
    const response = await apiClient.put<ApiResponse<WorkflowDefinition>>(
      `${this.baseUrl}/${name}/${version}`,
      request
    )

    if (!response.success) {
      throw new Error(response.error || '更新工作流定义失败')
    }

    return response.data!
  }

  /**
   * 删除工作流定义
   */
  async deleteWorkflowDefinition(name: string, version: string): Promise<void> {
    const response = await apiClient.delete<ApiResponse>(
      `${this.baseUrl}/${name}/${version}`
    )

    if (!response.success) {
      throw new Error(response.error || '删除工作流定义失败')
    }
  }

  // ==================== 工作流实例管理 ====================

  /**
   * 创建工作流实例
   */
  async createWorkflowInstance(
    request: CreateWorkflowInstanceRequest
  ): Promise<WorkflowInstance> {
    const response = await apiClient.post<ApiResponse<WorkflowInstance>>(
      `${this.baseUrl}/instances`,
      request
    )

    if (!response.success) {
      throw new Error(response.error || '创建工作流实例失败')
    }

    return response.data!
  }

  /**
   * 获取工作流实例列表
   */
  async getWorkflowInstances(
    params?: WorkflowInstanceQueryParams
  ): Promise<PaginatedResponse<WorkflowInstance>> {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params?.workflowDefinitionId) {
      queryParams.append(
        'workflowDefinitionId',
        params.workflowDefinitionId.toString()
      )
    }
    if (params?.status) queryParams.append('status', params.status)
    if (params?.businessKey)
      queryParams.append('businessKey', params.businessKey)
    if (params?.mutexKey) queryParams.append('mutexKey', params.mutexKey)
    if (params?.priority)
      queryParams.append('priority', params.priority.toString())
    if (params?.startTime) queryParams.append('startTime', params.startTime)
    if (params?.endTime) queryParams.append('endTime', params.endTime)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.workflowDefinitionName)
      queryParams.append(
        'workflowDefinitionName',
        params.workflowDefinitionName
      )
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)
    if (params?.groupByWorkflow) queryParams.append('groupByWorkflow', 'true')
    if (params?.rootInstancesOnly)
      queryParams.append('rootInstancesOnly', 'true')

    const url = `${this.baseUrl}/instances${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response =
      await apiClient.get<ApiResponse<PaginatedResponse<WorkflowInstance>>>(url)

    if (!response.success) {
      throw new Error(response.error || '获取工作流实例列表失败')
    }

    return response.data!
  }

  /**
   * 获取流程分组列表
   */
  async getWorkflowGroups(
    params?: WorkflowGroupQueryParams
  ): Promise<WorkflowGroupResponse> {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.workflowDefinitionName) {
      queryParams.append(
        'workflowDefinitionName',
        params.workflowDefinitionName
      )
    }
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    const url = `${this.baseUrl}/instances/groups${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response =
      await apiClient.get<ApiResponse<WorkflowGroupResponse>>(url)

    if (!response.success) {
      throw new Error(response.error || '获取流程分组列表失败')
    }

    return response.data!
  }

  /**
   * 获取指定流程分组的根实例列表
   */
  async getWorkflowGroupInstances(
    workflowDefinitionId: number,
    params?: Omit<WorkflowInstanceQueryParams, 'workflowDefinitionId'>
  ): Promise<PaginatedResponse<WorkflowInstance>> {
    return this.getWorkflowInstances({
      ...params,
      workflowDefinitionId,
      rootInstancesOnly: true,
    })
  }

  /**
   * 获取工作流实例详情
   */
  async getWorkflowInstance(id: number): Promise<WorkflowInstance> {
    const response = await apiClient.get<ApiResponse<WorkflowInstance>>(
      `${this.baseUrl}/instances/${id}`
    )

    if (!response.success) {
      throw new Error(response.error || '获取工作流实例详情失败')
    }

    return response.data!
  }

  /**
   * 启动工作流实例
   */
  async startWorkflowInstance(id: number, reason?: string): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<boolean>>(
      `${this.baseUrl}/instances/${id}/start`,
      { reason }
    )

    if (!response.success) {
      throw new Error(response.error || '启动工作流实例失败')
    }

    return response.data!
  }

  /**
   * 暂停工作流实例
   */
  async pauseWorkflowInstance(id: number, reason?: string): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<boolean>>(
      `${this.baseUrl}/instances/${id}/pause`,
      { reason }
    )

    if (!response.success) {
      throw new Error(response.error || '暂停工作流实例失败')
    }

    return response.data!
  }

  /**
   * 恢复工作流实例
   */
  async resumeWorkflowInstance(id: number, reason?: string): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<boolean>>(
      `${this.baseUrl}/instances/${id}/resume`,
      { reason }
    )

    if (!response.success) {
      throw new Error(response.error || '恢复工作流实例失败')
    }

    return response.data!
  }

  /**
   * 取消工作流实例
   */
  async cancelWorkflowInstance(id: number, reason?: string): Promise<boolean> {
    const response = await apiClient.post<ApiResponse<boolean>>(
      `${this.baseUrl}/instances/${id}/cancel`,
      { reason }
    )

    if (!response.success) {
      throw new Error(response.error || '取消工作流实例失败')
    }

    return response.data!
  }

  /**
   * 删除工作流实例
   */
  async deleteWorkflowInstance(id: number): Promise<boolean> {
    const response = await apiClient.delete<ApiResponse<boolean>>(
      `${this.baseUrl}/instances/${id}`
    )

    if (!response.success) {
      throw new Error(response.error || '删除工作流实例失败')
    }

    return response.data!
  }

  // ==================== 工作流执行日志查询 ====================

  /**
   * 获取工作流执行日志
   */
  async getExecutionLogs(
    params?: ExecutionLogQueryParams
  ): Promise<PaginatedResponse<WorkflowExecutionLog>> {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params?.workflowInstanceId) {
      queryParams.append(
        'workflowInstanceId',
        params.workflowInstanceId.toString()
      )
    }
    if (params?.taskNodeId)
      queryParams.append('taskNodeId', params.taskNodeId.toString())
    if (params?.nodeId) queryParams.append('nodeId', params.nodeId)
    if (params?.level) queryParams.append('level', params.level)
    if (params?.engineInstanceId)
      queryParams.append('engineInstanceId', params.engineInstanceId)
    if (params?.startTime) queryParams.append('startTime', params.startTime)
    if (params?.endTime) queryParams.append('endTime', params.endTime)
    if (params?.keyword) queryParams.append('keyword', params.keyword)
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder)

    const url = `${this.baseUrl}/logs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response =
      await apiClient.get<ApiResponse<PaginatedResponse<WorkflowExecutionLog>>>(
        url
      )

    if (!response.success) {
      throw new Error(response.error || '获取工作流执行日志失败')
    }

    return response.data!
  }

  /**
   * 根据工作流实例ID获取执行日志
   */
  async getLogsByInstanceId(
    instanceId: number,
    params?: { level?: 'debug' | 'info' | 'warn' | 'error'; limit?: number }
  ): Promise<WorkflowExecutionLog[]> {
    const queryParams = new URLSearchParams()

    if (params?.level) queryParams.append('level', params.level)
    if (params?.limit) queryParams.append('limit', params.limit.toString())

    const url = `${this.baseUrl}/logs/instance/${instanceId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response =
      await apiClient.get<ApiResponse<WorkflowExecutionLog[]>>(url)

    if (!response.success) {
      throw new Error(response.error || '获取执行日志失败')
    }

    return response.data!
  }

  // ==================== 系统监控 ====================

  /**
   * 系统健康检查
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await apiClient.get<ApiResponse<HealthCheckResponse>>(
      `${this.baseUrl}/health`
    )

    if (!response.success) {
      throw new Error(response.error || '健康检查失败')
    }

    return response.data!
  }

  // ==================== 便捷方法 ====================

  /**
   * 获取运行中的工作流实例
   */
  async getRunningWorkflowInstances(
    params?: Omit<WorkflowInstanceQueryParams, 'status'>
  ): Promise<PaginatedResponse<WorkflowInstance>> {
    return this.getWorkflowInstances({
      ...params,
      status: WorkflowStatus.RUNNING,
    })
  }

  /**
   * 获取已完成的工作流实例
   */
  async getCompletedWorkflowInstances(
    params?: Omit<WorkflowInstanceQueryParams, 'status'>
  ): Promise<PaginatedResponse<WorkflowInstance>> {
    return this.getWorkflowInstances({
      ...params,
      status: WorkflowStatus.COMPLETED,
    })
  }

  /**
   * 获取失败的工作流实例
   */
  async getFailedWorkflowInstances(
    params?: Omit<WorkflowInstanceQueryParams, 'status'>
  ): Promise<PaginatedResponse<WorkflowInstance>> {
    return this.getWorkflowInstances({
      ...params,
      status: WorkflowStatus.FAILED,
    })
  }

  /**
   * 获取工作流统计信息
   * 通过聚合现有接口数据来提供统计信息
   */
  async getWorkflowStats(): Promise<WorkflowStats> {
    try {
      // 并行获取各种统计数据
      const [
        definitions,
        allInstances,
        runningInstances,
        completedInstances,
        failedInstances,
      ] = await Promise.all([
        this.getWorkflowDefinitions({ page: 1, pageSize: 1 }),
        this.getWorkflowInstances({ page: 1, pageSize: 1 }),
        this.getRunningWorkflowInstances({ page: 1, pageSize: 1 }),
        this.getCompletedWorkflowInstances({ page: 1, pageSize: 1 }),
        this.getFailedWorkflowInstances({ page: 1, pageSize: 1 }),
      ])

      const totalInstances = allInstances.total
      const completedCount = completedInstances.total
      const failedCount = failedInstances.total
      const successRate =
        totalInstances > 0 ? (completedCount / totalInstances) * 100 : 0

      return {
        totalDefinitions: definitions.total,
        activeDefinitions: definitions.total, // 需要后端提供准确数据
        totalInstances: totalInstances,
        runningInstances: runningInstances.total,
        completedInstances: completedCount,
        failedInstances: failedCount,
        successRate: Math.round(successRate * 100) / 100,
        avgExecutionTime: 0, // 需要后端提供准确数据
        lastUpdated: new Date().toISOString(),
      }
    } catch (_error) {
      throw new Error('获取工作流统计信息失败')
    }
  }

  /**
   * 获取工作流定时任务列表
   */
  async getWorkflowSchedules(params?: {
    page?: number
    pageSize?: number
    search?: string
    enabled?: boolean
    workflowDefinitionName?: string
  }): Promise<PaginatedResponse<any>> {
    const queryParams = new URLSearchParams()

    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize)
      queryParams.append('pageSize', params.pageSize.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.enabled !== undefined)
      queryParams.append('enabled', params.enabled.toString())
    if (params?.workflowDefinitionName)
      queryParams.append(
        'workflowDefinitionName',
        params.workflowDefinitionName
      )

    // const url = `${this.baseUrl}/schedules${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

    // TODO: 实现真实的API调用，目前返回模拟数据
    return {
      items: [],
      total: 0,
      page: params?.page || 1,
      pageSize: params?.pageSize || 20,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    }
  }

  /**
   * 删除定时任务
   */
  async deleteSchedule(_id: string): Promise<void> {
    // TODO: 实现删除定时任务功能
    throw new Error('删除定时任务功能尚未实现')
  }

  /**
   * 切换定时任务状态
   */
  async toggleSchedule(_id: string, _enabled: boolean): Promise<void> {
    // TODO: 实现切换定时任务状态功能
    throw new Error('切换定时任务状态功能尚未实现')
  }

  // ==================== 工作流实例可视化 ====================

  /**
   * 获取工作流实例详情
   */
  async getWorkflowInstanceById(instanceId: number): Promise<WorkflowInstance> {
    const response = await apiClient.get<ApiResponse<WorkflowInstance>>(
      `${this.baseUrl}/instances/${instanceId}`
    )

    if (!response.success) {
      throw new Error(response.error || '获取工作流实例失败')
    }

    return response.data!
  }

  /**
   * 获取工作流执行状态
   */
  async getWorkflowExecutions(instanceId: number): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `${this.baseUrl}/instances/${instanceId}/executions`
    )

    if (!response.success) {
      throw new Error(response.error || '获取执行状态失败')
    }

    return response.data || []
  }

  /**
   * 获取工作流实例的节点实例（包含子节点层次结构）
   * 用于流程图展示，如果节点有子节点（如循环节点的子任务），
   * 会在节点的children字段中包含完整的子节点信息
   *
   * @param instanceId 工作流实例ID
   * @param nodeId 可选，指定节点ID。如果提供，则只返回该节点及其子节点；如果不提供，返回所有顶级节点
   */
  async getNodeInstances(instanceId: number, nodeId?: string): Promise<any[]> {
    const url = nodeId
      ? `${this.baseUrl}/instances/${instanceId}/nodes?nodeId=${encodeURIComponent(nodeId)}`
      : `${this.baseUrl}/instances/${instanceId}/nodes`

    const response = await apiClient.get<ApiResponse<any[]>>(url)

    if (!response.success) {
      throw new Error(response.error || '获取节点实例失败')
    }

    return response.data || []
  }

  /**
   * 获取循环节点执行详情
   */
  async getLoopExecutions(instanceId: number): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `${this.baseUrl}/instances/${instanceId}/loops`
    )

    if (!response.success) {
      throw new Error(response.error || '获取循环执行详情失败')
    }

    return response.data || []
  }

  /**
   * 获取节点执行日志
   */
  async getNodeExecutionLogs(
    instanceId: number,
    nodeId: string
  ): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>(
      `${this.baseUrl}/instances/${instanceId}/nodes/${nodeId}/logs`
    )

    if (!response.success) {
      throw new Error(response.error || '获取节点执行日志失败')
    }

    return response.data || []
  }
}

// 导出单例实例
export const workflowApi = new WorkflowApiService()
