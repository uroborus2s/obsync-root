/**
 * 工作流执行服务实现
 *
 * 实现工作流执行的核心业务逻辑
 * 版本: v3.0.0-refactored
 */

import type { Logger } from '@stratix/core';
import type {
  IExecutionLockService,
  INodeExecutionService,
  IWorkflowDefinitionService,
  IWorkflowExecutionService,
  IWorkflowInstanceService
} from '../interfaces/index.js';
import type {
  ServiceResult,
  WorkflowInstance,
  WorkflowOptions
} from '../types/business.js';
import { WorkflowDefinitionTable } from '../types/database.js';
import type { NodeInstance } from '../types/unified-node.js';
import type AutoLockRenewalService from './AutoLockRenewalService.js';

/**
 * 工作流执行服务实现
 */
export default class WorkflowExecutionService
  implements IWorkflowExecutionService
{
  constructor(
    private readonly workflowInstanceService: IWorkflowInstanceService,
    private readonly nodeExecutionService: INodeExecutionService,
    private readonly executionLockService: IExecutionLockService,
    private readonly autoLockRenewalService: AutoLockRenewalService,
    private readonly workflowDefinitionService: IWorkflowDefinitionService,
    private readonly logger: Logger
  ) {}

  /**
   * 执行工作流实例主流程
   * 重构版本：使用for循环顺序执行模式
   */
  async executeWorkflowInstance(
    definition: WorkflowDefinitionTable,
    instance: WorkflowInstance
  ): Promise<ServiceResult<void>> {
    const lockOwner = `workflow-engine-${process.pid}-${Date.now()}`;

    try {
      this.logger.info('Starting workflow instance execution', {
        instanceId: instance.id,
        workflowName: instance.name
      });

      // 1. 获取工作流执行锁
      const lockResult = await this.executionLockService.acquireWorkflowLock(
        instance.id,
        lockOwner,
        300000 // 5分钟锁超时
      );

      if (!lockResult.success) {
        return {
          success: false,
          error: 'Failed to acquire workflow execution lock',
          errorDetails: lockResult.error
        };
      }

      // 1.1 启动自动续期
      await this.autoLockRenewalService.startAutoRenewal(
        instance.id,
        lockOwner
      );

      return this.nodeExecutionService.executeWorkflowInstance(
        definition,
        instance
      );
    } catch (error) {
      this.logger.error('Workflow execution failed', {
        error,
        instanceId: instance.id
      });
      await this.nodeExecutionService.handleWorkflowError(
        instance,
        'Workflow execution error',
        error
      );
      return {
        success: false,
        error: 'Workflow execution failed',
        errorDetails: error
      };
    } finally {
      // 停止自动续期
      await this.autoLockRenewalService.stopAutoRenewal(instance.id);

      // 释放工作流执行锁
      await this.executionLockService.releaseWorkflowLock(
        instance.id,
        lockOwner
      );
    }
  }

  /**
   * 启动工作流主入口
   *
   * 1. 创建或读取工作流运行实例
   * 2. 执行工作流
   */
  async startWorkflow(
    definition: WorkflowDefinitionTable,
    opts: WorkflowOptions
  ): Promise<ServiceResult<WorkflowInstance>> {
    try {
      this.logger.info('Starting workflow', {
        name: definition.name,
        version: definition.version,
        opts
      });

      // 1. 验证和处理工作流输入参数
      const inputValidationResult =
        await this.workflowDefinitionService.validateAndProcessInputs(
          definition,
          opts.inputData || {},
          {
            strict: false, // 允许未定义的参数
            applyDefaults: true, // 应用默认值
            typeCoercion: true // 允许类型转换
          }
        );

      if (!inputValidationResult.success) {
        this.logger.warn('Workflow input validation failed', {
          workflowId: definition.id,
          workflowName: definition.name,
          error: inputValidationResult.error,
          errorDetails: inputValidationResult.errorDetails
        });

        return {
          success: false,
          error: `Input validation failed: ${inputValidationResult.error}`,
          errorDetails: inputValidationResult.errorDetails
        };
      }

      // 使用验证后的输入数据更新选项
      const validatedOpts: WorkflowOptions = {
        ...opts,
        inputData: inputValidationResult.data
      };

      this.logger.debug('Workflow input validation successful', {
        workflowId: definition.id,
        originalInputKeys: Object.keys(opts.inputData || {}),
        validatedInputKeys: Object.keys(inputValidationResult.data || {})
      });

      // 2. 创建或读取工作流运行实例
      const instanceResult =
        await this.workflowInstanceService.getWorkflowInstance(
          definition,
          validatedOpts
        );
      if (!instanceResult.success) {
        return {
          success: false,
          error: 'Failed to get workflow instance',
          errorDetails: instanceResult.error
        };
      }

      const instance = instanceResult.data!;

      // 3. 执行工作流
      const executionResult = await this.executeWorkflowInstance(
        definition,
        instance
      );

      if (!executionResult.success) {
        return {
          success: false,
          error: 'Failed to execute workflow',
          errorDetails: executionResult.error
        };
      }

      // 4. 返回工作流实例
      return {
        success: true,
        data: instance
      };
    } catch (error) {
      this.logger.error('Failed to start workflow', {
        error,
        definitionId: definition.id,
        definitionName: definition.name,
        opts
      });
      return {
        success: false,
        error: 'Failed to start workflow',
        errorDetails: error
      };
    }
  }

  /**
   * 恢复中断的工作流
   */
  async resumeWorkflow(instanceId: number): Promise<ServiceResult<void>> {
    try {
      this.logger.info('Resuming workflow', { instanceId });

      // 获取工作流实例
      const instanceResult =
        await this.workflowInstanceService.getById(instanceId);
      if (!instanceResult.success) {
        return {
          success: false,
          error: 'Workflow instance not found',
          errorDetails: instanceResult.error
        };
      }

      const instance = instanceResult.data!;

      // 检查实例状态
      if (instance.status !== 'interrupted') {
        return {
          success: false,
          error: `Cannot resume workflow in status: ${instance.status}`
        };
      }

      const definitionResult = await this.workflowDefinitionService.getById(
        instance.workflowDefinitionId
      );
      if (!definitionResult.success) {
        return {
          success: false,
          error: 'Failed to get workflow definition',
          errorDetails: definitionResult.error
        };
      }

      const definition = definitionResult.data!;

      // 执行工作流
      return await this.executeWorkflowInstance(definition, instance);
    } catch (error) {
      this.logger.error('Failed to resume workflow', { error, instanceId });
      return {
        success: false,
        error: 'Failed to resume workflow',
        errorDetails: error
      };
    }
  }

  /**
   * 停止工作流执行
   */
  async stopWorkflow(
    instanceId: number,
    reason?: string
  ): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Stopping workflow', { instanceId, reason });

      // 更新工作流状态为中断
      const updateResult = await this.workflowInstanceService.updateStatus(
        instanceId,
        'interrupted',
        reason || 'Workflow stopped by user'
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: 'Failed to update workflow status',
          errorDetails: updateResult.error
        };
      }

      return { success: true, data: true };
    } catch (error) {
      this.logger.error('Failed to stop workflow', {
        error,
        instanceId,
        reason
      });
      return {
        success: false,
        error: 'Failed to stop workflow',
        errorDetails: error
      };
    }
  }

  /**
   * 获取工作流执行状态
   */
  async getWorkflowStatus(instanceId: number): Promise<ServiceResult<any>> {
    try {
      const instanceResult =
        await this.workflowInstanceService.getById(instanceId);
      if (!instanceResult.success) {
        return instanceResult as ServiceResult<any>;
      }

      const instance = instanceResult.data!;

      return {
        success: true,
        data: {
          instanceId: instance.id,
          status: instance.status,
          currentNodeId: instance.currentNodeId,
          startedAt: instance.startedAt,
          completedAt: instance.completedAt,
          interruptedAt: instance.interruptedAt,
          errorMessage: instance.errorMessage,
          retryCount: instance.retryCount,
          maxRetries: instance.maxRetries
        }
      };
    } catch (error) {
      this.logger.error('Failed to get workflow status', { error, instanceId });
      return {
        success: false,
        error: 'Failed to get workflow status',
        errorDetails: error
      };
    }
  }

  /**
   * 构建节点输出数据映射
   */
  private async buildNodesOutputData(
    workflowInstanceId: number,
    currentNodeId: string,
    orderedNodes: any[]
  ): Promise<{
    nodes: Record<string, any>;
    previousNode: any;
  }> {
    const nodes: Record<string, any> = {};
    let previousNode: any = null;

    try {
      // 遍历有序节点，收集当前节点之前的所有已完成节点输出
      for (const nodeDefinition of orderedNodes) {
        const nodeId = nodeDefinition.nodeId || nodeDefinition.id;

        if (nodeId === currentNodeId) {
          break; // 到达当前节点，停止收集
        }

        // 查询节点实例的输出数据
        const nodeInstanceResult =
          await this.nodeExecutionService.getNodeInstance(
            workflowInstanceId,
            nodeId
          );

        if (nodeInstanceResult.success && nodeInstanceResult.data) {
          const nodeInstance = nodeInstanceResult.data;

          // 只包含已完成的节点输出
          if (nodeInstance.status === 'completed' && nodeInstance.outputData) {
            nodes[nodeId] = {
              output: nodeInstance.outputData,
              status: nodeInstance.status,
              completedAt: nodeInstance.completedAt,
              durationMs: nodeInstance.durationMs
            };

            // 记录直接前置节点（最后一个完成的节点）
            previousNode = nodes[nodeId];
          }
        }
      }

      this.logger.debug('Nodes output data built', {
        workflowInstanceId,
        currentNodeId,
        completedNodesCount: Object.keys(nodes).length,
        hasPreviousNode: !!previousNode
      });

      return { nodes, previousNode };
    } catch (error) {
      this.logger.error('Failed to build nodes output data', {
        error,
        workflowInstanceId,
        currentNodeId
      });

      return { nodes: {}, previousNode: null };
    }
  }

  /**
   * 收集所有数据源
   */
  private async collectDataSources(
    workflowInstance: WorkflowInstance,
    nodeInstance: NodeInstance,
    currentNodeId: string,
    orderedNodes: any[]
  ): Promise<{
    workflowInputData: any;
    workflowContextData: any;
    nodeInputData: any;
    nodeContextData: any;
    previousNodeOutput: any;
    nodesOutputData: Record<string, any>;
  }> {
    try {
      // 1. 工作流级别数据
      const workflowInputData = workflowInstance.inputData || {};
      const workflowContextData = workflowInstance.contextData || {};

      // 2. 节点级别数据
      const nodeInputData = nodeInstance.inputData || {};
      const nodeContextData = (nodeInstance as any).contextData || {}; // 节点实例可能包含contextData

      // 3. 所有节点输出数据（用于 ${nodes.nodeId.output.field} 访问）
      const nodesOutputData = await this.buildNodesOutputData(
        workflowInstance.id,
        currentNodeId,
        orderedNodes
      );

      // 4. 获取直接前置节点输出
      let previousNodeOutput = null;
      if (nodesOutputData.previousNode) {
        previousNodeOutput = nodesOutputData.previousNode.output;
      }

      return {
        workflowInputData,
        workflowContextData,
        nodeInputData,
        nodeContextData,
        previousNodeOutput,
        nodesOutputData: nodesOutputData.nodes
      };
    } catch (error) {
      this.logger.error('Failed to collect data sources', {
        error,
        workflowInstanceId: workflowInstance.id,
        currentNodeId
      });

      return {
        workflowInputData: {},
        workflowContextData: {},
        nodeInputData: {},
        nodeContextData: {},
        previousNodeOutput: null,
        nodesOutputData: {}
      };
    }
  }

  /**
   * 合并数据源到扁平化变量中
   */
  private mergeDataSource(
    target: Record<string, any>,
    source: any,
    sourceName: string
  ): void {
    if (!source || typeof source !== 'object') {
      return;
    }

    try {
      // 递归扁平化对象
      this.flattenObject(source, target, '');

      this.logger.debug('Merged data source', {
        sourceName,
        sourceKeys: Object.keys(source),
        addedKeys: Object.keys(source).length
      });
    } catch (error) {
      this.logger.warn('Failed to merge data source', {
        error,
        sourceName
      });
    }
  }

  /**
   * 递归扁平化对象
   */
  private flattenObject(
    obj: any,
    target: Record<string, any>,
    prefix: string
  ): void {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // 递归处理嵌套对象
          this.flattenObject(value, target, newKey);
        } else {
          // 直接赋值（扁平化）
          target[key] = value;

          // 同时保留嵌套路径访问
          if (prefix) {
            target[newKey] = value;
          }
        }
      }
    }
  }
}
