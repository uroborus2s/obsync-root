/**
 * 工作流实例管理服务实现
 *
 * 实现工作流实例的核心业务逻辑
 * 版本: v3.0.0-refactored
 */

import type { AwilixContainer, Logger } from '@stratix/core';
import { RESOLVER } from '@stratix/core';
import type {
  IExecutionLockRepository,
  INodeInstanceRepository,
  IWorkflowDefinitionRepository,
  IWorkflowInstanceRepository,
  IWorkflowInstanceService
} from '../interfaces/index.js';
import type {
  NodeInstance,
  NodeType,
  PaginationOptions,
  QueryFilters,
  ServiceResult,
  WorkflowInstance,
  WorkflowInstanceStatus,
  WorkflowOptions
} from '../types/business.js';

/**
 * 工作流实例管理服务实现
 */
export default class WorkflowInstanceService
  implements IWorkflowInstanceService
{
  /**
   * Stratix框架依赖注入配置
   */
  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      return {
        workflowDefinitionRepository: container.resolve(
          'workflowDefinitionRepository'
        ),
        workflowInstanceRepository: container.resolve(
          'workflowInstanceRepository'
        ),
        nodeInstanceRepository: container.resolve('nodeInstanceRepository'),
        executionLockRepository: container.resolve('executionLockRepository'),
        logger: container.resolve('logger')
      };
    }
  };

  constructor(
    private readonly workflowDefinitionRepository: IWorkflowDefinitionRepository,
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly nodeInstanceRepository: INodeInstanceRepository,
    private readonly executionLockRepository: IExecutionLockRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取或创建工作流实例
   *
   * 如果是创建工作流实例：
   * 1. 检查实例锁：根据实例type检查是否有运行中或中断的实例
   * 2. 检查业务实例锁：根据参数判断是否有已执行的实例锁（检查所有实例）
   * 3. 执行其他检查点验证
   * 4. 创建工作流实例并写入数据库，返回工作流实例
   *
   * 如果是恢复工作流实例：
   * 1. 查找中断的工作流实例
   * 2. 如果存在则修改工作流状态为执行中，并返回工作流实例
   */
  async getWorkflowInstance(
    definitionsId: string,
    opts: WorkflowOptions
  ): Promise<ServiceResult<WorkflowInstance>> {
    try {
      this.logger.info('Getting workflow instance', { definitionsId, opts });

      // 如果是恢复模式，查找中断的实例
      if (opts.resume) {
        return await this.resumeInterruptedInstance(definitionsId, opts);
      }

      // 创建新实例模式
      return await this.createNewInstance(definitionsId, opts);
    } catch (error) {
      this.logger.error('Failed to get workflow instance', {
        error,
        definitionsId,
        opts
      });
      return {
        success: false,
        error: 'Failed to get workflow instance',
        errorDetails: error
      };
    }
  }

  /**
   * 恢复中断的实例
   */
  private async resumeInterruptedInstance(
    definitionsId: string,
    opts: WorkflowOptions
  ): Promise<ServiceResult<WorkflowInstance>> {
    // 查找中断的工作流实例
    const interruptedResult =
      await this.workflowInstanceRepository.findInterruptedInstances();
    if (!interruptedResult.success) {
      return {
        success: false,
        error: 'Failed to find interrupted instances',
        errorDetails: interruptedResult.error
      };
    }

    // 查找匹配的中断实例
    const matchedInstance = interruptedResult.data?.find(
      (instance) =>
        instance.workflow_definition_id.toString() === definitionsId &&
        (opts.businessKey ? instance.business_key === opts.businessKey : true)
    );

    if (!matchedInstance) {
      return {
        success: false,
        error: 'No interrupted instance found for resume'
      };
    }

    // 修改工作流状态为执行中
    const updateResult = await this.workflowInstanceRepository.updateStatus(
      matchedInstance.id,
      'running'
    );

    if (!updateResult.success) {
      return {
        success: false,
        error: 'Failed to update instance status to running',
        errorDetails: updateResult.error
      };
    }

    // 返回工作流实例
    const instanceResult = await this.workflowInstanceRepository.findById(
      matchedInstance.id
    );
    if (!instanceResult.success) {
      return {
        success: false,
        error: 'Failed to retrieve updated instance',
        errorDetails: instanceResult.error
      };
    }

    return {
      success: true,
      data: this.mapToBusinessModel(instanceResult.data!)
    };
  }

  /**
   * 创建新实例
   */
  private async createNewInstance(
    definitionsId: string,
    opts: WorkflowOptions
  ): Promise<ServiceResult<WorkflowInstance>> {
    // 1. 获取工作流定义
    const definitionResult = await this.workflowDefinitionRepository.findById(
      parseInt(definitionsId)
    );
    if (!definitionResult.success) {
      return {
        success: false,
        error: `Workflow definition not found: ${definitionsId}`,
        errorDetails: definitionResult.error
      };
    }

    const definition = definitionResult.data!;
    const instanceType = opts.contextData?.instanceType || definition.name;

    // 2. 检查实例锁：根据实例type检查是否有运行中或中断的实例
    const instanceLockResult =
      await this.workflowInstanceRepository.checkInstanceLock(instanceType);
    if (!instanceLockResult.success) {
      return {
        success: false,
        error: 'Failed to check instance lock',
        errorDetails: instanceLockResult.error
      };
    }

    if (instanceLockResult.data && instanceLockResult.data.length > 0) {
      return {
        success: false,
        error: `Instance lock conflict: ${instanceType} has running or interrupted instances`
      };
    }

    // 3. 检查业务实例锁：根据参数判断是否有已执行的实例锁
    if (opts.businessKey) {
      const businessLockResult =
        await this.workflowInstanceRepository.checkBusinessInstanceLock(
          opts.businessKey
        );
      if (!businessLockResult.success) {
        return {
          success: false,
          error: 'Failed to check business instance lock',
          errorDetails: businessLockResult.error
        };
      }

      if (businessLockResult.data && businessLockResult.data.length > 0) {
        return {
          success: false,
          error: `Business instance lock conflict: ${opts.businessKey} already has executed instances`
        };
      }
    }

    // 4. 执行检查点验证
    if (opts.checkpointFunctions) {
      for (const [checkpointName, checkpointFn] of Object.entries(
        opts.checkpointFunctions
      )) {
        try {
          const checkResult = await checkpointFn(opts.contextData || {});
          if (!checkResult) {
            return {
              success: false,
              error: `Checkpoint validation failed: ${checkpointName}`
            };
          }
        } catch (error) {
          return {
            success: false,
            error: `Checkpoint execution failed: ${checkpointName}`,
            errorDetails: error
          };
        }
      }
    }

    // 5. 创建工作流实例并写入数据库
    const newInstance = {
      workflow_definition_id: definition.id,
      name: `${definition.name}-${Date.now()}`,
      external_id: opts.contextData?.externalId || null,
      status: 'pending' as const,
      instance_type: instanceType,
      input_data: opts.inputData || null,
      output_data: null,
      context_data: opts.contextData || null,
      business_key: opts.businessKey || null,
      mutex_key: opts.mutexKey || null,
      started_at: null,
      completed_at: null,
      interrupted_at: null,
      error_message: null,
      error_details: null,
      retry_count: 0,
      max_retries: definition.max_retries,
      current_node_id: null,
      checkpoint_data: null,
      created_by: opts.contextData?.createdBy || null
    };

    const createResult =
      await this.workflowInstanceRepository.create(newInstance);
    if (!createResult.success) {
      return {
        success: false,
        error: 'Failed to create workflow instance',
        errorDetails: createResult.error
      };
    }

    return {
      success: true,
      data: this.mapToBusinessModel(createResult.data!)
    };
  }

  /**
   * 获取下一个执行节点
   *
   * 1. 检查下一个节点的定义配置
   * 2. 从数据库根据实例id和节点类型定义检查节点实例是否存在
   * 3. 如果节点实例存在，直接返回
   * 4. 如果节点实例不存在，根据节点定义创建并保存到数据库
   * 5. 返回节点实例
   */
  async getNextNode(
    node: NodeInstance
  ): Promise<ServiceResult<NodeInstance | null>> {
    try {
      this.logger.info('Getting next node', {
        currentNodeId: node.nodeId,
        workflowInstanceId: node.workflowInstanceId
      });

      // 1. 获取工作流定义以确定下一个节点
      const instanceResult = await this.workflowInstanceRepository.findById(
        node.workflowInstanceId
      );
      if (!instanceResult.success) {
        return {
          success: false,
          error: 'Failed to get workflow instance',
          errorDetails: instanceResult.error
        };
      }

      const instance = instanceResult.data!;
      const definitionResult = await this.workflowDefinitionRepository.findById(
        instance.workflow_definition_id
      );
      if (!definitionResult.success) {
        return {
          success: false,
          error: 'Failed to get workflow definition',
          errorDetails: definitionResult.error
        };
      }

      const definition = definitionResult.data!;
      const workflowDef = definition.definition;

      // 2. 根据当前节点找到下一个节点定义
      const nextNodeDef = this.findNextNodeDefinition(workflowDef, node.nodeId);
      if (!nextNodeDef) {
        // 没有下一个节点，工作流结束
        return {
          success: true,
          data: null
        };
      }

      // 3. 检查节点实例是否已存在
      const existingNodeResult =
        await this.nodeInstanceRepository.findByWorkflowAndNodeId(
          node.workflowInstanceId,
          nextNodeDef.id
        );

      if (existingNodeResult.success && existingNodeResult.data) {
        // 节点实例已存在，直接返回
        return {
          success: true,
          data: this.mapNodeToBusinessModel(existingNodeResult.data)
        };
      }

      // 4. 创建新的节点实例
      const newNodeInstance = {
        workflow_instance_id: node.workflowInstanceId,
        node_id: nextNodeDef.id,
        node_name: nextNodeDef.name || nextNodeDef.id,
        node_type: this.mapNodeType(nextNodeDef.type),
        executor: nextNodeDef.executor || null,
        executor_config: nextNodeDef.config || null,
        status: 'pending' as const,
        input_data: null,
        output_data: null,
        error_message: null,
        error_details: null,
        started_at: null,
        completed_at: null,
        duration_ms: null,
        retry_count: 0,
        max_retries: nextNodeDef.maxRetries || 3,
        parent_node_id: null,
        child_index: null,
        loop_progress: null,
        loop_total_count: null,
        loop_completed_count: 0,
        parallel_group_id: null,
        parallel_index: null
      };

      const createResult =
        await this.nodeInstanceRepository.create(newNodeInstance);
      if (!createResult.success) {
        return {
          success: false,
          error: 'Failed to create node instance',
          errorDetails: createResult.error
        };
      }

      return {
        success: true,
        data: this.mapNodeToBusinessModel(createResult.data!)
      };
    } catch (error) {
      this.logger.error('Failed to get next node', { error, node });
      return {
        success: false,
        error: 'Failed to get next node',
        errorDetails: error
      };
    }
  }

  // 其他方法的简化实现...
  async getById(id: number): Promise<ServiceResult<WorkflowInstance>> {
    const result = await this.workflowInstanceRepository.findById(id);
    if (!result.success) {
      return {
        success: false,
        error:
          typeof result.error === 'string' ? result.error : 'Database error',
        errorDetails: result.error
      };
    }
    return {
      success: true,
      data: this.mapToBusinessModel(result.data!)
    };
  }

  async updateStatus(
    id: number,
    status: string,
    errorMessage?: string,
    errorDetails?: any
  ): Promise<ServiceResult<boolean>> {
    const result = await this.workflowInstanceRepository.updateStatus(
      id,
      status as WorkflowInstanceStatus,
      errorMessage,
      errorDetails
    );

    if (!result.success) {
      return {
        success: false,
        error:
          typeof result.error === 'string' ? result.error : 'Database error',
        errorDetails: result.error
      };
    }

    return result;
  }

  async updateCurrentNode(
    id: number,
    nodeId: string,
    checkpointData?: any
  ): Promise<ServiceResult<boolean>> {
    const result = await this.workflowInstanceRepository.updateCurrentNode(
      id,
      nodeId,
      checkpointData
    );

    if (!result.success) {
      return {
        success: false,
        error:
          typeof result.error === 'string' ? result.error : 'Database error',
        errorDetails: result.error
      };
    }

    return result;
  }

  async findMany(
    filters?: QueryFilters,
    pagination?: PaginationOptions
  ): Promise<ServiceResult<WorkflowInstance[]>> {
    const result = await this.workflowInstanceRepository.findMany(
      filters,
      pagination
    );
    if (!result.success) {
      return {
        success: false,
        error:
          typeof result.error === 'string' ? result.error : 'Database error',
        errorDetails: result.error
      };
    }
    return {
      success: true,
      data: result.data!.map((item) => this.mapToBusinessModel(item))
    };
  }

  async findInterruptedInstances(): Promise<ServiceResult<WorkflowInstance[]>> {
    const result =
      await this.workflowInstanceRepository.findInterruptedInstances();
    if (!result.success) {
      return {
        success: false,
        error:
          typeof result.error === 'string' ? result.error : 'Database error',
        errorDetails: result.error
      };
    }
    return {
      success: true,
      data: result.data!.map((item) => this.mapToBusinessModel(item))
    };
  }

  // 辅助方法
  private mapToBusinessModel(dbModel: any): WorkflowInstance {
    return {
      id: dbModel.id,
      workflowDefinitionId: dbModel.workflow_definition_id,
      name: dbModel.name,
      externalId: dbModel.external_id,
      status: dbModel.status,
      instanceType: dbModel.instance_type,
      inputData: dbModel.input_data,
      outputData: dbModel.output_data,
      contextData: dbModel.context_data,
      businessKey: dbModel.business_key,
      mutexKey: dbModel.mutex_key,
      startedAt: dbModel.started_at,
      completedAt: dbModel.completed_at,
      interruptedAt: dbModel.interrupted_at,
      errorMessage: dbModel.error_message,
      errorDetails: dbModel.error_details,
      retryCount: dbModel.retry_count,
      maxRetries: dbModel.max_retries,
      currentNodeId: dbModel.current_node_id,
      checkpointData: dbModel.checkpoint_data,
      createdBy: dbModel.created_by,
      createdAt: dbModel.created_at,
      updatedAt: dbModel.updated_at
    };
  }

  private mapNodeToBusinessModel(dbModel: any): NodeInstance {
    return {
      id: dbModel.id,
      workflowInstanceId: dbModel.workflow_instance_id,
      nodeId: dbModel.node_id,
      nodeName: dbModel.node_name,
      nodeType: dbModel.node_type,
      executor: dbModel.executor,
      executorConfig: dbModel.executor_config,
      status: dbModel.status,
      inputData: dbModel.input_data,
      outputData: dbModel.output_data,
      errorMessage: dbModel.error_message,
      errorDetails: dbModel.error_details,
      startedAt: dbModel.started_at,
      completedAt: dbModel.completed_at,
      durationMs: dbModel.duration_ms,
      retryCount: dbModel.retry_count,
      maxRetries: dbModel.max_retries,
      parentNodeId: dbModel.parent_node_id,
      childIndex: dbModel.child_index,
      loopProgress: dbModel.loop_progress,
      loopTotalCount: dbModel.loop_total_count,
      loopCompletedCount: dbModel.loop_completed_count,
      parallelGroupId: dbModel.parallel_group_id,
      parallelIndex: dbModel.parallel_index,
      createdAt: dbModel.created_at,
      updatedAt: dbModel.updated_at
    };
  }

  private findNextNodeDefinition(workflowDef: any, currentNodeId: string): any {
    // 简化的下一个节点查找逻辑
    // 实际实现需要根据工作流定义的结构来确定
    const nodes = workflowDef.nodes || [];
    const currentIndex = nodes.findIndex(
      (node: any) => node.id === currentNodeId
    );
    return currentIndex >= 0 && currentIndex < nodes.length - 1
      ? nodes[currentIndex + 1]
      : null;
  }

  private mapNodeType(type: string): NodeType {
    switch (type) {
      case 'loop':
        return 'loop';
      case 'parallel':
        return 'parallel';
      case 'subprocess':
        return 'subprocess';
      default:
        return 'simple';
    }
  }
}
