/**
 * 节点执行服务实现
 *
 * 实现各种类型节点的执行逻辑
 * 版本: v3.0.0-refactored
 */

import type { AwilixContainer, Logger } from '@stratix/core';
import { RESOLVER } from '@stratix/core';
import type {
  INodeExecutionService,
  INodeInstanceRepository,
  IWorkflowInstanceRepository
} from '../interfaces/index.js';
import type {
  ExecutionContext,
  ExecutionResult,
  LoopProgress,
  NodeInstance,
  ServiceResult
} from '../types/business.js';

/**
 * 节点执行服务实现
 */
export default class NodeExecutionService implements INodeExecutionService {
  /**
   * Stratix框架依赖注入配置
   */
  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      return {
        nodeInstanceRepository: container.resolve('nodeInstanceRepository'),
        workflowInstanceRepository: container.resolve(
          'workflowInstanceRepository'
        ),
        logger: container.resolve('logger')
      };
    }
  };

  constructor(
    private readonly nodeInstanceRepository: INodeInstanceRepository,
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 执行简单操作节点
   *
   * 1. 执行基础操作节点逻辑
   * 2. 获取对应的执行器
   * 3. 调用执行器执行业务逻辑
   * 4. 返回执行结果
   */
  async executeSimpleNode(
    node: NodeInstance,
    context: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>> {
    try {
      this.logger.info('Executing simple node', {
        nodeId: node.nodeId,
        workflowInstanceId: node.workflowInstanceId
      });

      const startTime = Date.now();

      // 更新节点状态为执行中
      await this.updateNodeStatus(node.id, 'running');

      // 获取执行器
      if (!node.executor) {
        return {
          success: false,
          error: 'No executor specified for node'
        };
      }

      const executor = context.executorRegistry.getExecutor(node.executor);
      if (!executor) {
        return {
          success: false,
          error: `Executor not found: ${node.executor}`
        };
      }

      // 准备执行上下文
      const executionContext = {
        taskId: node.id,
        workflowInstanceId: node.workflowInstanceId,
        config: node.executorConfig || {},
        inputs: { ...context.inputData, ...node.inputData },
        context: context.contextData || {},
        logger: this.logger
      };

      // 执行任务
      const result = await executor.execute(executionContext);
      const duration = Date.now() - startTime;

      if (result.success) {
        // 更新节点状态为完成
        await this.updateNodeStatus(node.id, 'completed');
        await this.nodeInstanceRepository.updateNodeInstance(node.id, {
          output_data: result.data,
          completed_at: new Date(),
          duration_ms: duration
        });

        return {
          success: true,
          data: {
            success: true,
            data: result.data,
            duration
          }
        };
      } else {
        // 更新节点状态为失败
        await this.updateNodeStatus(node.id, 'failed', result.error, result);

        return {
          success: false,
          error: result.error || 'Task execution failed',
          errorDetails: result
        };
      }
    } catch (error) {
      this.logger.error('Failed to execute simple node', { error, node });
      await this.updateNodeStatus(node.id, 'failed', 'Execution error', error);

      return {
        success: false,
        error: 'Failed to execute simple node',
        errorDetails: error
      };
    }
  }

  /**
   * 执行循环节点
   *
   * 1. 获取当前循环执行进度
   * 如果是创建状态：
   * 1. 执行数据获取器执行器
   * 2. 根据结果在事务中创建所有子节点实例并保存到数据库，同时修改节点进度状态
   * 如果是执行阶段：
   * 1. 获取所有未执行的子节点
   * 2. 根据并行或串行配置循环执行子节点 executeNode(childNode, childContext)
   * 3. 子节点执行成功后，修改子节点状态并更新循环节点进度状态
   * 4. 所有节点完成后修改节点状态为完成
   */
  async executeLoopNode(
    node: NodeInstance,
    context: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>> {
    try {
      this.logger.info('Executing loop node', {
        nodeId: node.nodeId,
        workflowInstanceId: node.workflowInstanceId
      });

      const progress: LoopProgress = node.loopProgress || {
        status: 'creating',
        totalCount: 0,
        completedCount: 0,
        failedCount: 0
      };

      if (progress.status === 'creating') {
        return await this.createLoopChildNodes(node, context, progress);
      } else if (progress.status === 'executing') {
        return await this.executeLoopChildNodes(node, context, progress);
      } else {
        return {
          success: true,
          data: {
            success: true,
            data: { status: 'completed', progress }
          }
        };
      }
    } catch (error) {
      this.logger.error('Failed to execute loop node', { error, node });
      await this.updateNodeStatus(
        node.id,
        'failed',
        'Loop execution error',
        error
      );

      return {
        success: false,
        error: 'Failed to execute loop node',
        errorDetails: error
      };
    }
  }

  /**
   * 创建循环子节点
   */
  private async createLoopChildNodes(
    node: NodeInstance,
    context: ExecutionContext,
    progress: LoopProgress
  ): Promise<ServiceResult<ExecutionResult>> {
    // 执行数据获取器执行器
    if (!node.executor) {
      return {
        success: false,
        error: 'No data fetcher executor specified for loop node'
      };
    }

    const executor = context.executorRegistry.getExecutor(node.executor);
    if (!executor) {
      return {
        success: false,
        error: `Data fetcher executor not found: ${node.executor}`
      };
    }

    // 获取循环数据
    const executionContext = {
      taskId: node.id,
      workflowInstanceId: node.workflowInstanceId,
      config: node.executorConfig || {},
      inputs: { ...context.inputData, ...node.inputData },
      context: context.contextData || {},
      logger: this.logger
    };

    const dataResult = await executor.execute(executionContext);
    if (!dataResult.success) {
      return {
        success: false,
        error: 'Failed to fetch loop data',
        errorDetails: dataResult
      };
    }

    const loopData = Array.isArray(dataResult.data)
      ? dataResult.data
      : [dataResult.data];
    const totalCount = loopData.length;

    // 创建子节点实例
    const childNodeInstances = loopData.map((data: any, index: number) => ({
      workflow_instance_id: node.workflowInstanceId,
      node_id: `${node.nodeId}_child_${index}`,
      node_name: `${node.nodeName} - Item ${index + 1}`,
      node_type: 'simple' as const,
      executor: node.executorConfig?.childExecutor || null,
      executor_config: node.executorConfig?.childConfig || null,
      status: 'pending' as const,
      input_data: data,
      output_data: null,
      error_message: null,
      error_details: null,
      started_at: null,
      completed_at: null,
      duration_ms: null,
      retry_count: 0,
      max_retries: 3,
      parent_node_id: node.id,
      child_index: index,
      loop_progress: null,
      loop_total_count: null,
      loop_completed_count: 0,
      parallel_group_id: null,
      parallel_index: null
    }));

    // 批量创建子节点实例
    const createResult =
      await this.nodeInstanceRepository.createMany(childNodeInstances);
    if (!createResult.success) {
      return {
        success: false,
        error: 'Failed to create child node instances',
        errorDetails: createResult.error
      };
    }

    // 更新循环进度状态
    const updatedProgress: LoopProgress = {
      status: 'executing',
      totalCount,
      completedCount: 0,
      failedCount: 0
    };

    await this.nodeInstanceRepository.updateLoopProgress(
      node.id,
      updatedProgress,
      0
    );

    return {
      success: true,
      data: {
        success: true,
        data: {
          status: 'child_nodes_created',
          totalCount,
          progress: updatedProgress
        }
      }
    };
  }

  /**
   * 执行循环子节点
   */
  private async executeLoopChildNodes(
    node: NodeInstance,
    context: ExecutionContext,
    progress: LoopProgress
  ): Promise<ServiceResult<ExecutionResult>> {
    // 获取所有未执行的子节点
    const pendingChildrenResult =
      await this.nodeInstanceRepository.findPendingChildNodes(node.id);
    if (!pendingChildrenResult.success) {
      return {
        success: false,
        error: 'Failed to get pending child nodes',
        errorDetails: pendingChildrenResult.error
      };
    }

    const pendingChildren = pendingChildrenResult.data || [];

    if (pendingChildren.length === 0) {
      // 所有子节点已完成，更新循环节点状态
      await this.updateNodeStatus(node.id, 'completed');
      const finalProgress: LoopProgress = {
        ...progress,
        status: 'completed'
      };

      await this.nodeInstanceRepository.updateLoopProgress(
        node.id,
        finalProgress,
        progress.completedCount
      );

      return {
        success: true,
        data: {
          success: true,
          data: { status: 'completed', progress: finalProgress }
        }
      };
    }

    // 根据配置决定并行或串行执行
    const isParallel = node.executorConfig?.parallel || false;

    if (isParallel) {
      // 并行执行所有子节点
      const childResults = await Promise.allSettled(
        pendingChildren.map((child) =>
          this.executeNode(this.mapToBusinessModel(child), context)
        )
      );

      let completedCount = progress.completedCount;
      let failedCount = progress.failedCount;

      childResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          completedCount++;
        } else {
          failedCount++;
        }
      });

      const updatedProgress: LoopProgress = {
        ...progress,
        completedCount,
        failedCount
      };

      await this.nodeInstanceRepository.updateLoopProgress(
        node.id,
        updatedProgress,
        completedCount
      );

      return {
        success: true,
        data: {
          success: true,
          data: { status: 'executing', progress: updatedProgress }
        }
      };
    } else {
      // 串行执行第一个子节点
      const firstChild = pendingChildren[0];
      const childResult = await this.executeNode(
        this.mapToBusinessModel(firstChild),
        context
      );

      let completedCount = progress.completedCount;
      let failedCount = progress.failedCount;

      if (childResult.success) {
        completedCount++;
      } else {
        failedCount++;
      }

      const updatedProgress: LoopProgress = {
        ...progress,
        completedCount,
        failedCount
      };

      await this.nodeInstanceRepository.updateLoopProgress(
        node.id,
        updatedProgress,
        completedCount
      );

      return {
        success: true,
        data: {
          success: true,
          data: { status: 'executing', progress: updatedProgress }
        }
      };
    }
  }

  /**
   * 执行子流程节点
   *
   * 1. 调用 executeWorkflowInstance 执行子工作流
   * 2. 根据子工作流完成状态更新当前节点状态
   */
  async executeSubProcessNode(
    node: NodeInstance,
    context: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>> {
    try {
      this.logger.info('Executing subprocess node', {
        nodeId: node.nodeId,
        workflowInstanceId: node.workflowInstanceId
      });

      // 更新节点状态为执行中
      await this.updateNodeStatus(node.id, 'running');

      // 获取子工作流定义ID
      const subWorkflowId = node.executorConfig?.subWorkflowId;
      if (!subWorkflowId) {
        return {
          success: false,
          error: 'No sub-workflow ID specified'
        };
      }

      // 准备子工作流选项
      const subWorkflowOptions = {
        inputData: { ...context.inputData, ...node.inputData },
        contextData: {
          ...context.contextData,
          parentWorkflowInstanceId: node.workflowInstanceId,
          parentNodeId: node.nodeId
        }
      };

      // 这里需要调用工作流执行服务来启动子工作流
      // 由于循环依赖问题，这里使用简化的实现
      // 实际实现中应该通过依赖注入获取工作流执行服务

      // 模拟子工作流执行
      const startTime = Date.now();

      // TODO: 实际调用工作流执行服务
      // const workflowExecutionService = container.resolve('workflowExecutionService');
      // const subResult = await workflowExecutionService.startWorkflow(subWorkflowId, subWorkflowOptions);

      const duration = Date.now() - startTime;

      // 更新节点状态为完成
      await this.updateNodeStatus(node.id, 'completed');
      await this.nodeInstanceRepository.updateNodeInstance(node.id, {
        output_data: { subWorkflowCompleted: true },
        completed_at: new Date(),
        duration_ms: duration
      });

      return {
        success: true,
        data: {
          success: true,
          data: { subWorkflowCompleted: true },
          duration
        }
      };
    } catch (error) {
      this.logger.error('Failed to execute subprocess node', { error, node });
      await this.updateNodeStatus(
        node.id,
        'failed',
        'Subprocess execution error',
        error
      );

      return {
        success: false,
        error: 'Failed to execute subprocess node',
        errorDetails: error
      };
    }
  }

  /**
   * 执行并行节点
   *
   * 1. 从定义中获取所有子节点定义
   * 2. 获取所有未执行的子节点实例
   * 3. 并行执行所有子节点 executeNode(childNode, context)
   * 4. 所有子节点完成后更新节点状态
   */
  async executeParallelNode(
    node: NodeInstance,
    context: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>> {
    try {
      this.logger.info('Executing parallel node', {
        nodeId: node.nodeId,
        workflowInstanceId: node.workflowInstanceId
      });

      // 更新节点状态为执行中
      await this.updateNodeStatus(node.id, 'running');

      // 获取所有子节点实例
      const childrenResult = await this.nodeInstanceRepository.findChildNodes(
        node.id
      );
      if (!childrenResult.success) {
        return {
          success: false,
          error: 'Failed to get child nodes',
          errorDetails: childrenResult.error
        };
      }

      const children = childrenResult.data || [];

      if (children.length === 0) {
        // 没有子节点，直接完成
        await this.updateNodeStatus(node.id, 'completed');
        return {
          success: true,
          data: {
            success: true,
            data: { status: 'completed', childCount: 0 }
          }
        };
      }

      // 并行执行所有子节点
      const childResults = await Promise.allSettled(
        children.map((child) =>
          this.executeNode(this.mapToBusinessModel(child), context)
        )
      );

      let successCount = 0;
      let failedCount = 0;

      childResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successCount++;
        } else {
          failedCount++;
        }
      });

      // 更新节点状态
      if (failedCount === 0) {
        await this.updateNodeStatus(node.id, 'completed');
      } else {
        await this.updateNodeStatus(
          node.id,
          'failed',
          `${failedCount} child nodes failed`
        );
      }

      return {
        success: failedCount === 0,
        data: {
          success: failedCount === 0,
          data: {
            status: failedCount === 0 ? 'completed' : 'failed',
            successCount,
            failedCount,
            totalCount: children.length
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to execute parallel node', { error, node });
      await this.updateNodeStatus(
        node.id,
        'failed',
        'Parallel execution error',
        error
      );

      return {
        success: false,
        error: 'Failed to execute parallel node',
        errorDetails: error
      };
    }
  }

  /**
   * 通用节点执行入口
   *
   * 1. 根据节点类型判断执行策略
   * 2. 简单类型：调用 executeSimpleNode
   * 3. 循环节点类型：调用 executeLoopNode
   * 4. 子流程节点类型：调用 executeSubProcessNode
   * 5. 并行节点类型：调用 executeParallelNode
   */
  async executeNode(
    node: NodeInstance,
    context: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>> {
    try {
      this.logger.info('Executing node', {
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        workflowInstanceId: node.workflowInstanceId
      });

      switch (node.nodeType) {
        case 'simple':
          return await this.executeSimpleNode(node, context);
        case 'loop':
          return await this.executeLoopNode(node, context);
        case 'subprocess':
          return await this.executeSubProcessNode(node, context);
        case 'parallel':
          return await this.executeParallelNode(node, context);
        default:
          return {
            success: false,
            error: `Unknown node type: ${node.nodeType}`
          };
      }
    } catch (error) {
      this.logger.error('Failed to execute node', { error, node });
      return {
        success: false,
        error: 'Failed to execute node',
        errorDetails: error
      };
    }
  }

  /**
   * 更新节点状态
   */
  async updateNodeStatus(
    nodeId: number,
    status: string,
    errorMessage?: string,
    errorDetails?: any
  ): Promise<ServiceResult<boolean>> {
    const result = await this.nodeInstanceRepository.updateStatus(
      nodeId,
      status as any,
      errorMessage,
      errorDetails
    );

    return {
      success: result.success,
      error: result.success
        ? undefined
        : result.error?.message || 'Failed to update node status'
    };
  }

  /**
   * 获取节点实例
   */
  async getNodeInstance(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<ServiceResult<NodeInstance>> {
    const result = await this.nodeInstanceRepository.findByWorkflowAndNodeId(
      workflowInstanceId,
      nodeId
    );
    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || 'Failed to get node instance'
      };
    }
    return {
      success: true,
      data: this.mapToBusinessModel(result.data!)
    };
  }

  /**
   * 创建节点实例
   */
  async createNodeInstance(
    nodeInstance: Partial<NodeInstance>
  ): Promise<ServiceResult<NodeInstance>> {
    const newNodeInstance = {
      workflow_instance_id: nodeInstance.workflowInstanceId!,
      node_id: nodeInstance.nodeId!,
      node_name: nodeInstance.nodeName!,
      node_type: nodeInstance.nodeType!,
      executor: nodeInstance.executor || null,
      executor_config: nodeInstance.executorConfig || null,
      status: 'pending' as const,
      input_data: nodeInstance.inputData || null,
      output_data: null,
      error_message: null,
      error_details: null,
      started_at: null,
      completed_at: null,
      duration_ms: null,
      retry_count: 0,
      max_retries: nodeInstance.maxRetries || 3,
      parent_node_id: nodeInstance.parentNodeId || null,
      child_index: nodeInstance.childIndex || null,
      loop_progress: null,
      loop_total_count: null,
      loop_completed_count: 0,
      parallel_group_id: nodeInstance.parallelGroupId || null,
      parallel_index: nodeInstance.parallelIndex || null
    };

    const result = await this.nodeInstanceRepository.create(newNodeInstance);
    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || 'Failed to create node instance'
      };
    }
    return {
      success: true,
      data: this.mapToBusinessModel(result.data!)
    };
  }

  // 辅助方法
  private mapToBusinessModel(dbModel: any): NodeInstance {
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
}
