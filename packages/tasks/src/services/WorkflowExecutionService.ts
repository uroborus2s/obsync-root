/**
 * 工作流执行服务实现
 *
 * 实现工作流执行的核心业务逻辑
 * 版本: v3.0.0-refactored
 */

import type { AwilixContainer, Logger } from '@stratix/core';
import { RESOLVER } from '@stratix/core';
import type {
  IExecutionLockService,
  INodeExecutionService,
  IWorkflowExecutionService,
  IWorkflowInstanceService
} from '../interfaces/index.js';
import type {
  ExecutionContext,
  NodeInstance,
  ServiceResult,
  WorkflowInstance,
  WorkflowOptions
} from '../types/business.js';

/**
 * 工作流执行服务实现
 */
export default class WorkflowExecutionService
  implements IWorkflowExecutionService
{
  /**
   * Stratix框架依赖注入配置
   */
  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      return {
        workflowInstanceService: container.resolve('workflowInstanceService'),
        nodeExecutionService: container.resolve('nodeExecutionService'),
        executionLockService: container.resolve('executionLockService'),
        logger: container.resolve('logger')
      };
    }
  };

  constructor(
    private readonly workflowInstanceService: IWorkflowInstanceService,
    private readonly nodeExecutionService: INodeExecutionService,
    private readonly executionLockService: IExecutionLockService,
    private readonly logger: Logger
  ) {}

  /**
   * 执行工作流实例主流程
   */
  async executeWorkflowInstance(
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

      // 2. 更新工作流状态为执行中
      await this.workflowInstanceService.updateStatus(instance.id, 'running');

      // 3. 获取检查点节点（当前节点或第一个节点）
      let currentNode = await this.getCurrentOrFirstNode(instance);
      if (!currentNode) {
        // 没有节点，工作流完成
        await this.completeWorkflow(instance);
        return { success: true };
      }

      // 4. 循环执行串行节点
      while (currentNode) {
        this.logger.info('Executing node', {
          nodeId: currentNode.nodeId,
          nodeType: currentNode.nodeType,
          instanceId: instance.id
        });

        // 检查节点状态
        if (currentNode.status === 'completed') {
          // 节点已完成，获取下一个节点
          const nextNodeResult =
            await this.workflowInstanceService.getNextNode(currentNode);
          if (!nextNodeResult.success) {
            await this.handleWorkflowError(
              instance,
              'Failed to get next node',
              nextNodeResult.error
            );
            break;
          }
          currentNode = nextNodeResult.data || null;
          continue;
        }

        if (currentNode.status === 'failed') {
          // 节点失败，检查是否需要重试
          if (currentNode.retryCount < currentNode.maxRetries) {
            this.logger.info('Retrying failed node', {
              nodeId: currentNode.nodeId,
              retryCount: currentNode.retryCount + 1,
              maxRetries: currentNode.maxRetries
            });

            // 重置节点状态为待重试
            await this.nodeExecutionService.updateNodeStatus(
              currentNode.id,
              'failed_retry'
            );
            currentNode.status = 'failed_retry';
          } else {
            // 重试次数已达上限，工作流失败
            await this.handleWorkflowError(
              instance,
              `Node ${currentNode.nodeId} failed after ${currentNode.maxRetries} retries`
            );
            break;
          }
        }

        // 执行节点
        const executionResult = await this.executeNodeWithContext(
          currentNode,
          instance
        );

        if (!executionResult.success) {
          // 节点执行失败
          if (currentNode.retryCount < currentNode.maxRetries) {
            // 可以重试，更新重试计数
            currentNode.retryCount++;
            await this.nodeExecutionService.updateNodeStatus(
              currentNode.id,
              'failed_retry',
              executionResult.error,
              executionResult.errorDetails
            );

            // 等待一段时间后重试
            await this.delay(5000); // 5秒延迟
            continue;
          } else {
            // 重试次数已达上限
            await this.handleWorkflowError(
              instance,
              `Node ${currentNode.nodeId} execution failed`,
              executionResult.errorDetails
            );
            break;
          }
        }

        // 节点执行成功，更新检查点并获取下一个节点
        await this.workflowInstanceService.updateCurrentNode(
          instance.id,
          currentNode.nodeId,
          { lastCompletedNode: currentNode.nodeId, timestamp: new Date() }
        );

        const nextNodeResult =
          await this.workflowInstanceService.getNextNode(currentNode);
        if (!nextNodeResult.success) {
          await this.handleWorkflowError(
            instance,
            'Failed to get next node',
            nextNodeResult.error
          );
          break;
        }

        currentNode = nextNodeResult.data || null;
      }

      // 5. 工作流完成
      if (currentNode === null) {
        await this.completeWorkflow(instance);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Workflow execution failed', {
        error,
        instanceId: instance.id
      });
      await this.handleWorkflowError(
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
    definitionsId: string,
    opts: WorkflowOptions
  ): Promise<ServiceResult<void>> {
    try {
      this.logger.info('Starting workflow', { definitionsId, opts });

      // 1. 创建或读取工作流运行实例
      const instanceResult =
        await this.workflowInstanceService.getWorkflowInstance(
          definitionsId,
          opts
        );
      if (!instanceResult.success) {
        return {
          success: false,
          error: 'Failed to get workflow instance',
          errorDetails: instanceResult.error
        };
      }

      const instance = instanceResult.data!;

      // 2. 执行工作流
      return await this.executeWorkflowInstance(instance);
    } catch (error) {
      this.logger.error('Failed to start workflow', {
        error,
        definitionsId,
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

      // 执行工作流
      return await this.executeWorkflowInstance(instance);
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

  // 私有辅助方法

  /**
   * 获取当前节点或第一个节点
   */
  private async getCurrentOrFirstNode(
    instance: WorkflowInstance
  ): Promise<NodeInstance | null> {
    if (instance.currentNodeId) {
      // 从检查点恢复
      const nodeResult = await this.nodeExecutionService.getNodeInstance(
        instance.id,
        instance.currentNodeId
      );
      if (nodeResult.success) {
        return nodeResult.data!;
      }
    }

    // 获取第一个节点（创建虚拟的起始节点）
    const firstNodeResult = await this.workflowInstanceService.getNextNode({
      id: 0,
      workflowInstanceId: instance.id,
      nodeId: '__start__',
      nodeName: 'Start',
      nodeType: 'simple',
      status: 'completed',
      retryCount: 0,
      maxRetries: 0,
      loopCompletedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as NodeInstance);

    return firstNodeResult.success ? firstNodeResult.data || null : null;
  }

  /**
   * 执行节点并提供执行上下文
   */
  private async executeNodeWithContext(
    node: NodeInstance,
    instance: WorkflowInstance
  ): Promise<ServiceResult<any>> {
    const executionContext: ExecutionContext = {
      workflowInstanceId: instance.id,
      workflowDefinition: {}, // TODO: 从实例中获取工作流定义
      inputData: instance.inputData || {},
      contextData: instance.contextData || {},
      checkpointFunctions: {}, // TODO: 从选项中获取检查点函数
      executorRegistry: {}, // TODO: 从容器中获取执行器注册表
      logger: this.logger
    };

    return await this.nodeExecutionService.executeNode(node, executionContext);
  }

  /**
   * 完成工作流
   */
  private async completeWorkflow(instance: WorkflowInstance): Promise<void> {
    await this.workflowInstanceService.updateStatus(instance.id, 'completed');
    this.logger.info('Workflow completed successfully', {
      instanceId: instance.id
    });
  }

  /**
   * 处理工作流错误
   */
  private async handleWorkflowError(
    instance: WorkflowInstance,
    error: string,
    errorDetails?: any
  ): Promise<void> {
    await this.workflowInstanceService.updateStatus(
      instance.id,
      'failed',
      error,
      errorDetails
    );
    this.logger.error('Workflow failed', {
      instanceId: instance.id,
      error,
      errorDetails
    });
  }

  /**
   * 延迟函数
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
