/**
 * 工作流实例服务
 *
 * 负责工作流实例的完整生命周期管理
 */

import type { Logger } from '@stratix/core';
import type { IWorkflowInstanceRepository } from '../repositories/WorkflowInstanceRepository.js';
import type {
  NewWorkflowInstanceTable,
  WorkflowInstancesTable
} from '../types/database.js';
import type { WorkflowInstance, WorkflowStatus } from '../types/workflow.js';

/**
 * 服务结果类型
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * 工作流实例查询选项
 */
export interface WorkflowInstanceQueryOptions {
  status?: WorkflowStatus | WorkflowStatus[];
  workflowDefinitionId?: number;
  businessKey?: string;
  mutexKey?: string;
  assignedEngineId?: string;
  priority?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * 工作流实例服务接口
 */
export interface IWorkflowInstanceService {
  /**
   * 创建工作流实例
   */
  createInstance(
    data: NewWorkflowInstanceTable
  ): Promise<ServiceResult<WorkflowInstance>>;

  /**
   * 根据ID获取工作流实例
   */
  getInstanceById(id: number): Promise<ServiceResult<WorkflowInstance | null>>;

  /**
   * 根据外部ID获取工作流实例
   */
  getInstanceByExternalId(
    externalId: string
  ): Promise<ServiceResult<WorkflowInstance | null>>;

  /**
   * 更新工作流实例状态
   */
  updateInstanceStatus(
    id: number,
    status: WorkflowStatus,
    additionalData?: Partial<WorkflowInstance>
  ): Promise<ServiceResult<boolean>>;

  /**
   * 查询工作流实例列表
   */
  queryInstances(
    options: WorkflowInstanceQueryOptions
  ): Promise<ServiceResult<WorkflowInstance[]>>;

  /**
   * 删除工作流实例
   */
  deleteInstance(id: number): Promise<ServiceResult<boolean>>;

  /**
   * 获取实例统计信息
   */
  getInstanceStatistics(workflowDefinitionId?: number): Promise<
    ServiceResult<{
      total: number;
      pending: number;
      running: number;
      completed: number;
      failed: number;
      cancelled: number;
    }>
  >;

  /**
   * 更新实例心跳
   */
  updateHeartbeat(id: number, ownerId: string): Promise<ServiceResult<boolean>>;

  /**
   * 获取可恢复的实例
   */
  getRecoverableInstances(
    heartbeatTimeoutSeconds?: number
  ): Promise<ServiceResult<WorkflowInstance[]>>;

  /**
   * 终止工作流实例
   */
  terminateInstance(
    instanceId: string,
    reason?: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 暂停工作流实例
   */
  pauseInstance(instanceId: string): Promise<ServiceResult<boolean>>;

  /**
   * 恢复工作流实例
   */
  resumeInstance(instanceId: string): Promise<ServiceResult<boolean>>;

  /**
   * 执行工作流实例
   */
  executeInstance(instanceId: string): Promise<ServiceResult<boolean>>;

  /**
   * 验证实例是否可以执行指定操作
   */
  canExecuteInstance(instanceId: string): Promise<ServiceResult<boolean>>;

  /**
   * 验证实例状态转换是否有效
   */
  validateStatusTransition(
    instanceId: string,
    targetStatus: WorkflowStatus
  ): Promise<ServiceResult<boolean>>;

  /**
   * 使用统一过滤器查询工作流实例列表
   */
  queryInstancesWithFilters(filters: any): Promise<ServiceResult<any>>;
}

/**
 * 工作流实例服务实现
 */
export default class WorkflowInstanceService
  implements IWorkflowInstanceService
{
  constructor(
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 映射数据库记录到工作流实例
   */
  private mapTableToWorkflowInstance = (
    tableRow: WorkflowInstancesTable
  ): WorkflowInstance => {
    const result: WorkflowInstance = {
      id: tableRow.id,
      workflowDefinitionId: tableRow.workflow_definition_id,
      name: tableRow.name,
      status: tableRow.status as any,
      retryCount: tableRow.retry_count,
      maxRetries: tableRow.max_retries,
      priority: tableRow.priority,
      createdAt: tableRow.created_at,
      updatedAt: tableRow.updated_at
    };

    // 添加可选字段
    if (tableRow.external_id) result.externalId = tableRow.external_id;
    if (tableRow.input_data) result.inputData = tableRow.input_data;
    if (tableRow.output_data) result.outputData = tableRow.output_data;
    if (tableRow.context_data) result.contextData = tableRow.context_data;
    if (tableRow.business_key) result.businessKey = tableRow.business_key;
    if (tableRow.mutex_key) result.mutexKey = tableRow.mutex_key;
    if (tableRow.started_at) result.startedAt = tableRow.started_at;
    if (tableRow.completed_at) result.completedAt = tableRow.completed_at;
    if (tableRow.paused_at) result.pausedAt = tableRow.paused_at;
    if (tableRow.error_message) result.errorMessage = tableRow.error_message;
    if (tableRow.error_details) result.errorDetails = tableRow.error_details;
    if (tableRow.scheduled_at) result.scheduledAt = tableRow.scheduled_at;
    if (tableRow.current_node_id)
      result.currentNodeId = tableRow.current_node_id;
    if (tableRow.completed_nodes)
      result.completedNodes = tableRow.completed_nodes;
    if (tableRow.failed_nodes) result.failedNodes = tableRow.failed_nodes;
    if (tableRow.lock_owner) result.lockOwner = tableRow.lock_owner;
    if (tableRow.lock_acquired_at)
      result.lockAcquiredAt = tableRow.lock_acquired_at;
    if (tableRow.last_heartbeat) result.lastHeartbeat = tableRow.last_heartbeat;
    if (tableRow.assigned_engine_id)
      result.assignedEngineId = tableRow.assigned_engine_id;
    if (tableRow.assignment_strategy)
      result.assignmentStrategy = tableRow.assignment_strategy;
    if (tableRow.created_by) result.createdBy = tableRow.created_by;

    return result;
  };

  /**
   * 创建工作流实例
   */
  async createInstance(
    data: NewWorkflowInstanceTable
  ): Promise<ServiceResult<WorkflowInstance>> {
    try {
      this.logger.info('创建工作流实例', {
        workflowDefinitionId: data.workflow_definition_id,
        name: data.name
      });

      // 验证必需字段
      if (!data.workflow_definition_id) {
        return {
          success: false,
          error: '工作流定义ID是必需的',
          errorCode: 'MISSING_WORKFLOW_DEFINITION_ID'
        };
      }

      if (!data.name) {
        return {
          success: false,
          error: '实例名称是必需的',
          errorCode: 'MISSING_INSTANCE_NAME'
        };
      }

      // 检查外部ID唯一性
      if (data.external_id) {
        const existingResult =
          await this.workflowInstanceRepository.findByExternalId(
            data.external_id
          );
        if (existingResult.success && existingResult.data) {
          return {
            success: false,
            error: `外部ID已存在: ${data.external_id}`,
            errorCode: 'DUPLICATE_EXTERNAL_ID'
          };
        }
      }

      // 创建实例
      const createResult = await this.workflowInstanceRepository.create(data);
      if (!createResult.success) {
        return {
          success: false,
          error: `创建工作流实例失败: ${createResult.error}`,
          errorCode: 'CREATE_FAILED'
        };
      }

      this.logger.info('工作流实例创建成功', {
        instanceId: createResult.data.id,
        name: data.name
      });

      return {
        success: true,
        data: this.mapTableToWorkflowInstance(createResult.data)
      };
    } catch (error) {
      this.logger.error('创建工作流实例异常', { error, data });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 根据ID获取工作流实例
   */
  async getInstanceById(
    id: number
  ): Promise<ServiceResult<WorkflowInstance | null>> {
    try {
      const result = await this.workflowInstanceRepository.findByIdNullable(id);

      if (!result.success) {
        return {
          success: false,
          error: `查询工作流实例失败: ${result.error}`,
          errorCode: 'QUERY_FAILED'
        };
      }

      if (!result.data) {
        return {
          success: false,
          error: `工作流实例不存在: ${id}`,
          errorCode: 'INSTANCE_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: result.data ? this.mapTableToWorkflowInstance(result.data) : null
      };
    } catch (error) {
      this.logger.error('获取工作流实例异常', { error, id });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 根据外部ID获取工作流实例
   */
  async getInstanceByExternalId(
    externalId: string
  ): Promise<ServiceResult<WorkflowInstance | null>> {
    try {
      const result =
        await this.workflowInstanceRepository.findByExternalId(externalId);

      if (!result.success) {
        return {
          success: false,
          error: `查询工作流实例失败: ${result.error}`,
          errorCode: 'QUERY_FAILED'
        };
      }

      if (!result.data) {
        return {
          success: false,
          error: `工作流实例不存在: ${externalId}`,
          errorCode: 'INSTANCE_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: result.data ? this.mapTableToWorkflowInstance(result.data) : null
      };
    } catch (error) {
      this.logger.error('获取工作流实例异常', { error, externalId });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 更新工作流实例状态
   */
  async updateInstanceStatus(
    id: number,
    status: WorkflowStatus,
    additionalData?: Partial<WorkflowInstance>
  ): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('更新工作流实例状态', { id, status });

      // 构建更新数据
      const updateData: any = {
        status,
        updated_at: new Date(),
        ...additionalData
      };

      // 根据状态设置时间戳
      if (status === 'running' && !updateData.started_at) {
        updateData.started_at = new Date();
      } else if (
        ['completed', 'failed', 'cancelled'].includes(status) &&
        !updateData.completed_at
      ) {
        updateData.completed_at = new Date();
      } else if (status === 'paused' && !updateData.paused_at) {
        updateData.paused_at = new Date();
      }

      const result = await this.workflowInstanceRepository.updateStatus(
        id,
        status,
        additionalData
      );

      if (!result.success) {
        return {
          success: false,
          error: `更新工作流实例状态失败: ${result.error}`,
          errorCode: 'UPDATE_FAILED'
        };
      }

      this.logger.info('工作流实例状态更新成功', { id, status });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('更新工作流实例状态异常', { error, id, status });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 查询工作流实例列表
   */
  async queryInstances(
    options: WorkflowInstanceQueryOptions
  ): Promise<ServiceResult<WorkflowInstance[]>> {
    try {
      this.logger.debug('查询工作流实例列表', { options });

      // 构建查询条件
      const queryOptions: any = {
        limit: options.limit || 100,
        offset: options.offset || 0
      };

      // 添加过滤条件
      if (options.status) {
        queryOptions.status = options.status;
      }
      if (options.workflowDefinitionId) {
        queryOptions.workflowDefinitionId = options.workflowDefinitionId;
      }
      if (options.businessKey) {
        queryOptions.businessKey = options.businessKey;
      }
      if (options.assignedEngineId) {
        queryOptions.assignedEngineId = options.assignedEngineId;
      }
      if (options.startDate || options.endDate) {
        queryOptions.dateRange = {
          start: options.startDate,
          end: options.endDate
        };
      }

      // 使用findByStatus方法进行查询
      let result;
      if (options.status) {
        result = await this.workflowInstanceRepository.findByStatus(
          options.status,
          queryOptions
        );
      } else {
        // 如果没有状态过滤，使用findByWorkflowDefinitionId或其他方法
        if (options.workflowDefinitionId) {
          result =
            await this.workflowInstanceRepository.findByWorkflowDefinitionId(
              options.workflowDefinitionId,
              queryOptions
            );
        } else {
          // 暂时返回空数组，实际应该实现通用查询方法
          result = { success: true, data: [] };
        }
      }

      if (!result.success) {
        return {
          success: false,
          error: `查询工作流实例列表失败: ${result.error}`,
          errorCode: 'QUERY_FAILED'
        };
      }

      return {
        success: true,
        data: (result.data || []).map(this.mapTableToWorkflowInstance)
      };
    } catch (error) {
      this.logger.error('查询工作流实例列表异常', { error, options });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 删除工作流实例
   */
  async deleteInstance(id: number): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('删除工作流实例', { id });

      // 使用updateStatus将状态设置为已删除，而不是物理删除
      const result = await this.workflowInstanceRepository.updateStatus(
        id,
        'cancelled'
      );

      if (!result.success) {
        return {
          success: false,
          error: `删除工作流实例失败: ${result.error}`,
          errorCode: 'DELETE_FAILED'
        };
      }

      this.logger.info('工作流实例删除成功', { id });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('删除工作流实例异常', { error, id });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 获取实例统计信息
   */
  async getInstanceStatistics(workflowDefinitionId?: number): Promise<
    ServiceResult<{
      total: number;
      pending: number;
      running: number;
      completed: number;
      failed: number;
      cancelled: number;
    }>
  > {
    try {
      this.logger.debug('获取实例统计信息', { workflowDefinitionId });

      // 这里需要Repository支持统计查询
      // 暂时返回模拟数据，实际实现需要Repository方法支持
      const stats = {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error('获取实例统计信息异常', {
        error,
        workflowDefinitionId
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 更新实例心跳
   */
  async updateHeartbeat(
    id: number,
    ownerId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const updateData = {
        last_heartbeat: new Date(),
        lock_owner: ownerId,
        updated_at: new Date()
      };

      const result = await this.workflowInstanceRepository.updateStatus(
        id,
        'running',
        updateData
      );

      if (!result.success) {
        return {
          success: false,
          error: `更新心跳失败: ${result.error}`,
          errorCode: 'HEARTBEAT_UPDATE_FAILED'
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('更新心跳异常', { error, id, ownerId });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 获取可恢复的实例
   */
  async getRecoverableInstances(
    heartbeatTimeoutSeconds: number = 300
  ): Promise<ServiceResult<WorkflowInstance[]>> {
    try {
      const timeoutMinutes = Math.ceil(heartbeatTimeoutSeconds / 60);

      // 使用Repository的findStaleInstances方法
      const result =
        await this.workflowInstanceRepository.findStaleInstances(
          timeoutMinutes
        );

      if (!result.success) {
        return {
          success: false,
          error: `获取可恢复实例失败: ${result.error}`,
          errorCode: 'QUERY_FAILED'
        };
      }

      return {
        success: true,
        data: (result.data || []).map(this.mapTableToWorkflowInstance)
      };
    } catch (error) {
      this.logger.error('获取可恢复实例异常', {
        error,
        heartbeatTimeoutSeconds
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 终止工作流实例
   */
  async terminateInstance(
    instanceId: string,
    reason?: string
  ): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('终止工作流实例', { instanceId, reason });

      // 1. 获取实例信息
      const instance = await this.getInstanceById(Number(instanceId));
      if (!instance.success || !instance.data) {
        return {
          success: false,
          error: '工作流实例不存在',
          errorCode: 'INSTANCE_NOT_FOUND'
        };
      }

      // 2. 业务规则验证
      if (instance.data.status === 'completed') {
        return {
          success: false,
          error: '已完成的工作流无法终止',
          errorCode: 'INVALID_STATUS_TRANSITION'
        };
      }

      if (instance.data.status === 'failed') {
        return {
          success: false,
          error: '工作流已处于失败状态',
          errorCode: 'ALREADY_FAILED'
        };
      }

      // 3. 状态更新
      const updateResult = await this.workflowInstanceRepository.updateStatus(
        Number(instanceId),
        'failed',
        {
          completed_at: new Date(), // 使用completed_at记录终止时间
          error_message: reason || '手动终止',
          updated_at: new Date()
        }
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: '状态更新失败',
          errorCode: 'UPDATE_FAILED'
        };
      }

      this.logger.info('工作流实例终止成功', { instanceId });
      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('终止工作流实例失败', { instanceId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 暂停工作流实例
   */
  async pauseInstance(instanceId: string): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('暂停工作流实例', { instanceId });

      // 1. 验证状态转换
      const canPause = await this.validateStatusTransition(
        instanceId,
        'paused'
      );
      if (!canPause.success) {
        return canPause;
      }

      // 2. 更新状态
      const updateResult = await this.workflowInstanceRepository.updateStatus(
        Number(instanceId),
        'paused',
        {
          paused_at: new Date(),
          updated_at: new Date()
        }
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: '暂停工作流失败',
          errorCode: 'UPDATE_FAILED'
        };
      }

      this.logger.info('工作流实例暂停成功', { instanceId });
      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('暂停工作流实例失败', { instanceId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 恢复工作流实例
   */
  async resumeInstance(instanceId: string): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('恢复工作流实例', { instanceId });

      // 1. 验证状态转换
      const canResume = await this.validateStatusTransition(
        instanceId,
        'running'
      );
      if (!canResume.success) {
        return canResume;
      }

      // 2. 更新状态
      const updateResult = await this.workflowInstanceRepository.updateStatus(
        Number(instanceId),
        'running',
        {
          paused_at: null,
          updated_at: new Date()
        }
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: '恢复工作流失败',
          errorCode: 'UPDATE_FAILED'
        };
      }

      this.logger.info('工作流实例恢复成功', { instanceId });
      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('恢复工作流实例失败', { instanceId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 执行工作流实例
   */
  async executeInstance(instanceId: string): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('执行工作流实例', { instanceId });

      // 1. 验证是否可以执行
      const canExecute = await this.canExecuteInstance(instanceId);
      if (!canExecute.success) {
        return canExecute;
      }

      // 2. 更新状态为运行中
      const updateResult = await this.workflowInstanceRepository.updateStatus(
        Number(instanceId),
        'running',
        {
          started_at: new Date(),
          updated_at: new Date()
        }
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: '执行工作流失败',
          errorCode: 'UPDATE_FAILED'
        };
      }

      this.logger.info('工作流实例执行成功', { instanceId });
      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('执行工作流实例失败', { instanceId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 验证实例是否可以执行指定操作
   */
  async canExecuteInstance(
    instanceId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      // 获取实例信息
      const instance = await this.getInstanceById(Number(instanceId));
      if (!instance.success || !instance.data) {
        return {
          success: false,
          error: '工作流实例不存在',
          errorCode: 'INSTANCE_NOT_FOUND'
        };
      }

      // 检查状态是否允许执行
      if (instance.data.status === 'running') {
        return {
          success: false,
          error: '工作流实例已在运行中',
          errorCode: 'INSTANCE_ALREADY_RUNNING'
        };
      }

      if (instance.data.status === 'completed') {
        return {
          success: false,
          error: '工作流实例已完成，无法重新执行',
          errorCode: 'INSTANCE_ALREADY_COMPLETED'
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('验证实例执行权限失败', { instanceId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 验证实例状态转换是否有效
   */
  async validateStatusTransition(
    instanceId: string,
    targetStatus: WorkflowStatus
  ): Promise<ServiceResult<boolean>> {
    try {
      // 获取当前实例状态
      const instance = await this.getInstanceById(Number(instanceId));
      if (!instance.success || !instance.data) {
        return {
          success: false,
          error: '工作流实例不存在',
          errorCode: 'INSTANCE_NOT_FOUND'
        };
      }

      const currentStatus = instance.data.status;

      // 定义有效的状态转换规则
      const validTransitions: Record<WorkflowStatus, WorkflowStatus[]> = {
        pending: ['running', 'cancelled'],
        running: ['paused', 'completed', 'failed', 'cancelled', 'timeout'],
        paused: ['running', 'cancelled'],
        completed: [], // 已完成的实例不能转换到其他状态
        failed: ['pending'], // 失败的实例可以重新启动
        cancelled: ['pending'], // 已取消的实例可以重新启动
        timeout: ['pending'] // 超时的实例可以重新启动
      };

      const allowedTransitions =
        validTransitions[currentStatus as WorkflowStatus] || [];

      if (!allowedTransitions.includes(targetStatus)) {
        return {
          success: false,
          error: `无效的状态转换：从 ${currentStatus} 到 ${targetStatus}`,
          errorCode: 'INVALID_STATUS_TRANSITION'
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('验证状态转换失败', {
        instanceId,
        targetStatus,
        error
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 使用统一过滤器查询工作流实例列表
   */
  async queryInstancesWithFilters(filters: any): Promise<ServiceResult<any>> {
    try {
      this.logger.debug('使用统一过滤器查询工作流实例列表', { filters });

      // 直接调用仓储层的统一查询方法
      const result =
        await this.workflowInstanceRepository.findWithFilters(filters);

      if (!result.success) {
        return {
          success: false,
          error: `查询工作流实例列表失败: ${result.error}`,
          errorCode: 'QUERY_FAILED'
        };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error('使用统一过滤器查询工作流实例列表异常', {
        error,
        filters
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }
}
