/**
 * 工作流任务节点服务
 *
 * 负责任务节点的创建、执行、状态管理、依赖处理等功能
 */

import type { Logger } from '@stratix/core';
import { RESOLVER } from '@stratix/core';
import type { IWorkflowTaskNodeRepository } from '../repositories/WorkflowTaskNodeRepository.js';
import type {
  NewWorkflowTaskNode,
  WorkflowTaskNode
} from '../types/database.js';

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
 * 任务节点状态
 */
export type TaskNodeStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

/**
 * 任务节点查询选项
 */
export interface TaskNodeQueryOptions {
  workflowInstanceId?: number;
  status?: TaskNodeStatus | TaskNodeStatus[];
  nodeType?: string;
  executor?: string;
  parentNodeId?: number;
  parallelGroupId?: string;
  assignedEngineId?: string;
  limit?: number;
  offset?: number;
}

/**
 * 任务节点执行结果
 */
export interface TaskNodeExecutionResult {
  success: boolean;
  outputData?: any;
  error?: string;
  duration?: number;
}

/**
 * 工作流任务节点服务接口
 */
export interface IWorkflowTaskNodeService {
  /**
   * 创建任务节点
   */
  createTaskNode(
    data: NewWorkflowTaskNode
  ): Promise<ServiceResult<WorkflowTaskNode>>;

  /**
   * 根据ID获取任务节点
   */
  getTaskNodeById(id: number): Promise<ServiceResult<WorkflowTaskNode>>;

  /**
   * 根据工作流实例ID和节点ID获取任务节点
   */
  getTaskNodeByNodeId(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<ServiceResult<WorkflowTaskNode>>;

  /**
   * 更新任务节点状态
   */
  updateTaskNodeStatus(
    id: number,
    status: TaskNodeStatus,
    additionalData?: Partial<WorkflowTaskNode>
  ): Promise<ServiceResult<boolean>>;

  /**
   * 查询任务节点列表
   */
  queryTaskNodes(
    options: TaskNodeQueryOptions
  ): Promise<ServiceResult<WorkflowTaskNode[]>>;

  /**
   * 获取可执行的任务节点
   */
  getExecutableNodes(
    limit?: number
  ): Promise<ServiceResult<WorkflowTaskNode[]>>;

  /**
   * 获取任务节点的依赖关系
   */
  getNodeDependencies(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<ServiceResult<WorkflowTaskNode[]>>;

  /**
   * 检查节点是否可以执行
   */
  canExecuteNode(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 批量更新节点状态
   */
  batchUpdateStatus(
    ids: number[],
    status: TaskNodeStatus
  ): Promise<ServiceResult<number>>;

  /**
   * 获取执行统计信息
   */
  getExecutionStats(workflowInstanceId: number): Promise<
    ServiceResult<{
      totalNodes: number;
      completedNodes: number;
      failedNodes: number;
      runningNodes: number;
      pendingNodes: number;
      averageDuration: number;
    }>
  >;

  /**
   * 删除任务节点
   */
  deleteTaskNode(id: number): Promise<ServiceResult<boolean>>;
}

/**
 * 工作流任务节点服务实现
 */
export default class WorkflowTaskNodeService
  implements IWorkflowTaskNodeService
{
  static [RESOLVER] = {
    lifetime: 'SCOPED'
  };
  constructor(
    private readonly workflowTaskNodeRepository: IWorkflowTaskNodeRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 创建任务节点
   */
  async createTaskNode(
    data: NewWorkflowTaskNode
  ): Promise<ServiceResult<WorkflowTaskNode>> {
    try {
      this.logger.info('创建任务节点', {
        workflowInstanceId: data.workflow_instance_id,
        nodeId: data.node_id,
        nodeType: data.node_type
      });

      // 验证必需字段
      if (!data.workflow_instance_id) {
        return {
          success: false,
          error: '工作流实例ID是必需的',
          errorCode: 'MISSING_WORKFLOW_INSTANCE_ID'
        };
      }

      if (!data.node_id) {
        return {
          success: false,
          error: '节点ID是必需的',
          errorCode: 'MISSING_NODE_ID'
        };
      }

      if (!data.node_name) {
        return {
          success: false,
          error: '节点名称是必需的',
          errorCode: 'MISSING_NODE_NAME'
        };
      }

      if (!data.node_type) {
        return {
          success: false,
          error: '节点类型是必需的',
          errorCode: 'MISSING_NODE_TYPE'
        };
      }

      // 检查节点是否已存在
      const existingResult = await this.workflowTaskNodeRepository.findByNodeId(
        data.workflow_instance_id,
        data.node_id
      );

      if (existingResult.success && existingResult.data) {
        return {
          success: false,
          error: `节点已存在: ${data.node_id}`,
          errorCode: 'DUPLICATE_NODE_ID'
        };
      }

      // 创建任务节点
      const createResult = await this.workflowTaskNodeRepository.create(data);
      if (!createResult.success) {
        return {
          success: false,
          error: `创建任务节点失败: ${createResult.error}`,
          errorCode: 'CREATE_FAILED'
        };
      }

      this.logger.info('任务节点创建成功', {
        taskNodeId: createResult.data.id,
        nodeId: data.node_id
      });

      return {
        success: true,
        data: createResult.data
      };
    } catch (error) {
      this.logger.error('创建任务节点异常', { error, data });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 根据ID获取任务节点
   */
  async getTaskNodeById(id: number): Promise<ServiceResult<WorkflowTaskNode>> {
    try {
      const result = await this.workflowTaskNodeRepository.findByIdNullable(id);

      if (!result.success) {
        return {
          success: false,
          error: `查询任务节点失败: ${result.error}`,
          errorCode: 'QUERY_FAILED'
        };
      }

      if (!result.data) {
        return {
          success: false,
          error: `任务节点不存在: ${id}`,
          errorCode: 'NODE_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error('获取任务节点异常', { error, id });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 根据工作流实例ID和节点ID获取任务节点
   */
  async getTaskNodeByNodeId(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<ServiceResult<WorkflowTaskNode>> {
    try {
      const result = await this.workflowTaskNodeRepository.findByNodeId(
        workflowInstanceId,
        nodeId
      );

      if (!result.success) {
        return {
          success: false,
          error: `查询任务节点失败: ${result.error}`,
          errorCode: 'QUERY_FAILED'
        };
      }

      if (!result.data) {
        return {
          success: false,
          error: `任务节点不存在: ${nodeId}`,
          errorCode: 'NODE_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error('获取任务节点异常', {
        error,
        workflowInstanceId,
        nodeId
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 更新任务节点状态
   */
  async updateTaskNodeStatus(
    id: number,
    status: TaskNodeStatus,
    additionalData?: Partial<WorkflowTaskNode>
  ): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('更新任务节点状态', { id, status });

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

        // 计算执行时长
        if (updateData.started_at) {
          const startTime = new Date(updateData.started_at).getTime();
          const endTime = updateData.completed_at.getTime();
          updateData.duration_ms = endTime - startTime;
        }
      }

      const result = await this.workflowTaskNodeRepository.updateNullable(
        id,
        updateData
      );

      if (!result.success) {
        return {
          success: false,
          error: `更新任务节点状态失败: ${result.error}`,
          errorCode: 'UPDATE_FAILED'
        };
      }

      this.logger.info('任务节点状态更新成功', { id, status });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('更新任务节点状态异常', { error, id, status });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 查询任务节点列表
   */
  async queryTaskNodes(
    options: TaskNodeQueryOptions
  ): Promise<ServiceResult<WorkflowTaskNode[]>> {
    try {
      this.logger.debug('查询任务节点列表', { options });

      // 构建查询条件
      const queryOptions: any = {
        limit: options.limit || 100,
        offset: options.offset || 0
      };

      // 添加过滤条件
      if (options.workflowInstanceId) {
        queryOptions.workflowInstanceId = options.workflowInstanceId;
      }
      if (options.status) {
        queryOptions.status = options.status;
      }
      if (options.nodeType) {
        queryOptions.nodeType = options.nodeType;
      }
      if (options.executor) {
        queryOptions.executor = options.executor;
      }
      if (options.parentNodeId) {
        queryOptions.parentNodeId = options.parentNodeId;
      }
      if (options.parallelGroupId) {
        queryOptions.parallelGroupId = options.parallelGroupId;
      }
      if (options.assignedEngineId) {
        queryOptions.assignedEngineId = options.assignedEngineId;
      }

      const result =
        await this.workflowTaskNodeRepository.findMany(queryOptions);

      if (!result.success) {
        return {
          success: false,
          error: `查询任务节点列表失败: ${result.error}`,
          errorCode: 'QUERY_FAILED'
        };
      }

      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      this.logger.error('查询任务节点列表异常', { error, options });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 获取可执行的任务节点
   */
  async getExecutableNodes(
    limit: number = 50
  ): Promise<ServiceResult<WorkflowTaskNode[]>> {
    try {
      const result =
        await this.workflowTaskNodeRepository.findExecutableNodes(limit);

      if (!result.success) {
        return {
          success: false,
          error: `获取可执行节点失败: ${result.error}`,
          errorCode: 'QUERY_FAILED'
        };
      }

      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      this.logger.error('获取可执行节点异常', { error, limit });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 获取任务节点的依赖关系
   */
  async getNodeDependencies(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<ServiceResult<WorkflowTaskNode[]>> {
    try {
      const result = await this.workflowTaskNodeRepository.findDependencies(
        workflowInstanceId,
        nodeId
      );

      if (!result.success) {
        return {
          success: false,
          error: `获取节点依赖失败: ${result.error}`,
          errorCode: 'QUERY_FAILED'
        };
      }

      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      this.logger.error('获取节点依赖异常', {
        error,
        workflowInstanceId,
        nodeId
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 检查节点是否可以执行
   */
  async canExecuteNode(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<ServiceResult<boolean>> {
    try {
      // 获取节点依赖
      const dependenciesResult = await this.getNodeDependencies(
        workflowInstanceId,
        nodeId
      );
      if (!dependenciesResult.success) {
        return {
          success: false,
          error: dependenciesResult.error || 'Failed to get node dependencies'
        };
      }

      const dependencies = dependenciesResult.data || [];

      // 检查所有依赖是否都已完成
      const canExecute = dependencies.every(
        (dep) => dep.status === 'completed'
      );

      return {
        success: true,
        data: canExecute
      };
    } catch (error) {
      this.logger.error('检查节点执行条件异常', {
        error,
        workflowInstanceId,
        nodeId
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 批量更新节点状态
   */
  async batchUpdateStatus(
    ids: number[],
    status: TaskNodeStatus
  ): Promise<ServiceResult<number>> {
    try {
      this.logger.info('批量更新节点状态', { ids, status });

      const result = await this.workflowTaskNodeRepository.batchUpdateStatus(
        ids,
        status
      );

      if (!result.success) {
        return {
          success: false,
          error: `批量更新节点状态失败: ${result.error}`,
          errorCode: 'BATCH_UPDATE_FAILED'
        };
      }

      this.logger.info('批量更新节点状态成功', {
        updatedCount: result.data,
        status
      });

      return {
        success: true,
        data: result.data || 0
      };
    } catch (error) {
      this.logger.error('批量更新节点状态异常', { error, ids, status });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 获取执行统计信息
   */
  async getExecutionStats(workflowInstanceId: number): Promise<
    ServiceResult<{
      totalNodes: number;
      completedNodes: number;
      failedNodes: number;
      runningNodes: number;
      pendingNodes: number;
      averageDuration: number;
    }>
  > {
    try {
      const result =
        await this.workflowTaskNodeRepository.getExecutionStats(
          workflowInstanceId
        );

      if (!result.success) {
        return {
          success: false,
          error: `获取执行统计失败: ${result.error}`,
          errorCode: 'STATS_QUERY_FAILED'
        };
      }

      return {
        success: true,
        data: result.data || {
          totalNodes: 0,
          completedNodes: 0,
          failedNodes: 0,
          runningNodes: 0,
          pendingNodes: 0,
          averageDuration: 0
        }
      };
    } catch (error) {
      this.logger.error('获取执行统计异常', { error, workflowInstanceId });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }

  /**
   * 删除任务节点
   */
  async deleteTaskNode(id: number): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('删除任务节点', { id });

      const result = await this.workflowTaskNodeRepository.delete(id);

      if (!result.success) {
        return {
          success: false,
          error: `删除任务节点失败: ${result.error}`,
          errorCode: 'DELETE_FAILED'
        };
      }

      this.logger.info('任务节点删除成功', { id });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('删除任务节点异常', { error, id });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'UNEXPECTED_ERROR'
      };
    }
  }
}
