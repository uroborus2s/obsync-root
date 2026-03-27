/**
 * 节点执行服务实现
 *
 * 实现各种类型节点的执行逻辑
 * 版本: v3.0.0-refactored
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { sleep } from '@stratix/core/async';
import type {
  INodeExecutionService,
  INodeInstanceRepository,
  ITemplateService,
  IWorkflowDefinitionService,
  IWorkflowInstanceService
} from '../interfaces/index.js';
import { getExecutor } from '../registerTask.js';
import type {
  ExecutionResult,
  LoopProgress,
  ServiceResult,
  WorkflowInstance
} from '../types/business.js';
import {
  NewWorkflowNodeInstance,
  WorkflowDefinitionTable
} from '../types/database.js';
import type { NodeInstance } from '../types/unified-node.js';
import {
  ExecutionContext,
  NodeDefinition,
  SubprocessNodeDefinition,
  WorkflowDefinitionData
} from '../types/workflow.js';

/**
 * 节点执行服务实现
 */
export default class NodeExecutionService implements INodeExecutionService {
  constructor(
    private readonly nodeInstanceRepository: INodeInstanceRepository,
    private readonly logger: Logger,
    private readonly databaseApi: DatabaseAPI,
    private readonly templateService: ITemplateService,
    private readonly workflowInstanceService: IWorkflowInstanceService,
    private readonly workflowDefinitionService: IWorkflowDefinitionService
  ) {}

  /**
   * 执行简单操作节点
   *
   * 1. 获取工作流实例和构建完整的变量上下文
   * 2. 执行基础操作节点逻辑
   * 3. 获取对应的执行器
   * 4. 调用执行器执行业务逻辑
   * 5. 返回执行结果
   */
  async executeSimpleNode(
    executionContext: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>> {
    const { nodeInstance, workflowInstance } = executionContext;
    try {
      this.logger.info('Executing simple node', {
        nodeId: nodeInstance.nodeId,
        workflowInstanceId: workflowInstance.id
      });

      const startTime = Date.now();

      // 更新节点状态为执行中
      await this.updateNodeStatus(nodeInstance.id, 'running');

      // 获取执行器
      if (!nodeInstance.executor) {
        return {
          success: false,
          error: 'No executor specified for node'
        };
      }

      const executor = getExecutor(nodeInstance.executor);
      if (!executor) {
        return {
          success: false,
          error: `Executor not found: ${nodeInstance.executor}`
        };
      }
      // 执行任务
      const result = await executor.execute(executionContext);
      const duration = Date.now() - startTime;

      if (result.success) {
        // 更新节点状态为完成
        await this.updateNodeStatus(nodeInstance.id, 'completed');
        await this.nodeInstanceRepository.updateNodeInstance(nodeInstance.id, {
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
        await this.updateNodeStatus(
          nodeInstance.id,
          'failed',
          result.error,
          result
        );

        return {
          success: false,
          error: result.error || 'Task execution failed',
          errorDetails: result
        };
      }
    } catch (error) {
      this.logger.error('Failed to execute simple node', {
        error,
        nodeInstance
      });
      await this.updateNodeStatus(
        nodeInstance.id,
        'failed',
        'Execution error',
        error
      );

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
   * 简化的两阶段执行流程：
   *
   * 1. 状态判断与创建流程：
   *    - 检查当前节点的progress.status
   *    - 如果状态是'creating'，执行子节点创建流程
   *    - 使用数据库事务批量创建所有子节点实例
   *    - 在同一事务中将父节点状态更新为'executing'
   *    - 直接修改本地progress对象状态为'executing'
   *
   * 2. 状态判断与执行流程：
   *    - 创建流程完成后，立即检查progress.status是否为'executing'
   *    - 如果是'executing'状态，进入子节点执行流程
   *    - 执行所有待处理的子节点
   *
   * 关键特性：
   * - 简单的if-else逻辑，避免嵌套的异步调用
   * - 移除复杂的状态同步逻辑（重新获取节点实例等）
   * - 创建和执行在同一个方法调用中顺序完成
   * - 支持断点续传：系统重启后能从正确步骤继续执行
   */
  async executeLoopNode(
    executionContext: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>> {
    const { nodeInstance } = executionContext;
    try {
      this.logger.info('Executing loop node', {
        nodeId: nodeInstance.nodeId,
        workflowInstanceId: nodeInstance.workflowInstanceId,
        currentStatus: nodeInstance.status
      });

      // 获取当前循环执行进度，支持断点续传
      let progress: LoopProgress = nodeInstance.loopProgress || {
        status: 'creating',
        totalCount: 0,
        completedCount: 0,
        failedCount: 0
      };

      this.logger.debug('Loop node progress status', {
        nodeId: nodeInstance.nodeId,
        progressStatus: progress.status,
        totalCount: progress.totalCount,
        completedCount: progress.completedCount,
        failedCount: progress.failedCount
      });

      // 第一步：子节点创建阶段
      if (progress.status === 'creating') {
        this.logger.info('Starting child node creation phase', {
          nodeId: nodeInstance.nodeId
        });

        const creationResult =
          await this.executeChildNodeCreationPhase(executionContext);
        if (!creationResult.success) {
          return creationResult;
        }

        // 直接更新本地progress对象状态，避免重新查询数据库
        progress = {
          status: 'executing',
          totalCount: creationResult.data?.data?.totalCount || 0,
          completedCount: 0,
          failedCount: 0
        };

        this.logger.info(
          'Child nodes created successfully, proceeding to execution phase',
          {
            nodeId: nodeInstance.nodeId,
            totalCount: progress.totalCount
          }
        );
      }

      // 第二步：子节点执行阶段
      if (progress.status === 'executing') {
        this.logger.info('Starting child node execution phase', {
          nodeId: nodeInstance.nodeId,
          totalCount: progress.totalCount,
          completedCount: progress.completedCount,
          failedCount: progress.failedCount
        });

        return await this.executeChildNodeExecutionPhase(
          executionContext,
          progress
        );
      }

      // 已完成状态
      if (progress.status === 'completed') {
        this.logger.info('Loop node already completed', {
          nodeId: nodeInstance.nodeId,
          progress
        });
        return {
          success: true,
          data: {
            success: true,
            data: { status: 'completed', progress }
          }
        };
      }

      // 未知状态
      return {
        success: false,
        error: `Unknown loop progress status: ${progress.status}`
      };
    } catch (error) {
      this.logger.error('Failed to execute loop node', {
        error,
        nodeId: nodeInstance.nodeId,
        workflowInstanceId: nodeInstance.workflowInstanceId
      });

      await this.updateNodeStatus(
        nodeInstance.id,
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
   * 第一步：子节点创建阶段
   *
   * 功能：
   * 1. 执行数据获取器执行器获取循环数据
   * 2. 使用数据库事务确保原子性操作：
   *    - 批量创建所有子节点记录
   *    - 在同一事务中将父节点状态更新为'executing'
   *    - 在同一事务中将progress.status更新为'executing'
   * 3. 确保在这个阶段不执行任何子节点，只负责节点实例的创建
   */
  private async executeChildNodeCreationPhase(
    executionContext: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>> {
    const { nodeInstance, nodeDefinition } = executionContext;

    this.logger.info('Starting child node creation phase', {
      nodeId: nodeInstance.nodeId,
      workflowInstanceId: nodeInstance.workflowInstanceId
    });

    try {
      // 1. 执行数据获取器执行器
      const dataFetchResult = await this.fetchLoopData(executionContext);
      if (!dataFetchResult.success) {
        return {
          success: false,
          error: dataFetchResult.error,
          errorDetails: dataFetchResult.errorDetails
        };
      }

      const { loopData, totalCount } = dataFetchResult.data!;

      // 2. 获取子节点定义
      const childNodeDefinition = this.getChildNodeDefinition(nodeDefinition);
      if (!childNodeDefinition) {
        return {
          success: false,
          error:
            'No child node definition found in loop node definition. Loop node must have either "node" or "taskTemplate" property.'
        };
      }

      // 3. 使用数据库事务确保原子性操作
      const transactionResult = await this.executeChildNodeCreationTransaction(
        executionContext,
        loopData,
        totalCount,
        childNodeDefinition
      );

      if (!transactionResult.success) {
        return transactionResult;
      }

      this.logger.info('Child node creation phase completed successfully', {
        nodeId: nodeInstance.nodeId,
        totalCount,
        childNodeType: childNodeDefinition.nodeType
      });

      return {
        success: true,
        data: {
          success: true,
          data: {
            status: 'child_nodes_created',
            phase: 'creation_completed',
            totalCount,
            childNodeDefinition: {
              nodeType: childNodeDefinition.nodeType,
              nodeName: childNodeDefinition.nodeName
            }
          }
        }
      };
    } catch (error) {
      this.logger.error('Child node creation phase failed', {
        error,
        nodeId: nodeInstance.nodeId,
        workflowInstanceId: nodeInstance.workflowInstanceId
      });

      await this.updateNodeStatus(
        nodeInstance.id,
        'failed',
        'Child node creation failed',
        error
      );

      return {
        success: false,
        error: 'Child node creation phase failed',
        errorDetails: error
      };
    }
  }

  /**
   * 第二步：子节点执行阶段
   *
   * 功能：
   * 1. 检查循环节点的当前状态，确认子节点已创建完成
   * 2. 根据子节点的执行状态（未开始、进行中、已完成、失败等）来决定执行策略
   * 3. 按照循环节点的配置（串行/并行执行）来调度子节点的执行
   * 4. 实现适当的错误处理和重试机制
   */
  private async executeChildNodeExecutionPhase(
    executionContext: ExecutionContext,
    progress: LoopProgress
  ): Promise<ServiceResult<ExecutionResult>> {
    const { nodeInstance } = executionContext;

    this.logger.info('Starting child node execution phase', {
      nodeId: nodeInstance.nodeId,
      workflowInstanceId: nodeInstance.workflowInstanceId,
      totalCount: progress.totalCount,
      completedCount: progress.completedCount,
      failedCount: progress.failedCount
    });

    try {
      // 1. 检查循环节点状态，确认子节点已创建完成
      if (progress.status !== 'executing') {
        return {
          success: false,
          error: `Invalid progress status for execution phase: ${progress.status}. Expected 'executing'.`
        };
      }

      // 2. 获取所有未执行的子节点
      const pendingChildrenResult =
        await this.nodeInstanceRepository.findPendingChildNodes(
          nodeInstance.id
        );
      if (!pendingChildrenResult.success) {
        return {
          success: false,
          error: 'Failed to get pending child nodes',
          errorDetails: pendingChildrenResult.error
        };
      }

      const pendingChildren = pendingChildrenResult.data || [];

      this.logger.debug('Found pending child nodes for execution', {
        nodeId: nodeInstance.nodeId,
        pendingChildrenCount: pendingChildren.length,
        totalCount: progress.totalCount
      });

      // 3. 如果没有待执行的子节点，检查是否所有子节点都已完成
      if (pendingChildren.length === 0) {
        return await this.handleAllChildNodesCompleted(nodeInstance, progress);
      }

      // 4. 根据配置决定执行策略（串行/并行）
      const executionMode = nodeInstance.executorConfig?.parallel
        ? 'parallel'
        : 'serial';

      this.logger.info('Executing child nodes', {
        nodeId: nodeInstance.nodeId,
        executionMode,
        pendingChildrenCount: pendingChildren.length
      });

      if (executionMode === 'parallel') {
        return await this.executeChildNodesInParallel(
          executionContext,
          pendingChildren,
          progress
        );
      } else {
        return await this.executeChildNodesInSerial(
          executionContext,
          pendingChildren,
          progress
        );
      }
    } catch (error) {
      this.logger.error('Child node execution phase failed', {
        error,
        nodeId: nodeInstance.nodeId,
        workflowInstanceId: nodeInstance.workflowInstanceId
      });

      await this.updateNodeStatus(
        nodeInstance.id,
        'failed',
        'Child node execution failed',
        error
      );

      return {
        success: false,
        error: 'Child node execution phase failed',
        errorDetails: error
      };
    }
  }

  /**
   * 获取循环数据
   * 执行数据获取器执行器获取循环数据
   */
  private async fetchLoopData(
    executionContext: ExecutionContext
  ): Promise<ServiceResult<{ loopData: any[]; totalCount: number }>> {
    const { nodeInstance } = executionContext;

    // 1. 验证执行器
    if (!nodeInstance.executor) {
      return {
        success: false,
        error: 'No data fetcher executor specified for loop node'
      };
    }

    const executor = getExecutor(nodeInstance.executor);
    if (!executor) {
      return {
        success: false,
        error: `Data fetcher executor not found: ${nodeInstance.executor}`
      };
    }

    this.logger.debug('Fetching loop data', {
      nodeId: nodeInstance.nodeId,
      executor: nodeInstance.executor
    });

    // 2. 执行数据获取器
    const dataResult = await executor.execute(executionContext);
    if (!dataResult.success) {
      return {
        success: false,
        error: 'Failed to fetch loop data',
        errorDetails: dataResult
      };
    }

    // 3. 处理返回的数据
    const loopData = Array.isArray(dataResult.data.items)
      ? dataResult.data.items
      : [dataResult.data.items];
    const totalCount = loopData.length;

    this.logger.info('Loop data fetched successfully', {
      nodeId: nodeInstance.nodeId,
      totalCount,
      executor: nodeInstance.executor
    });

    return {
      success: true,
      data: { loopData, totalCount }
    };
  }

  /**
   * 获取子节点定义
   * 从循环节点定义中提取子节点定义
   */
  private getChildNodeDefinition(
    nodeDefinition: NodeDefinition
  ): NodeDefinition | null {
    const loopDefinition = nodeDefinition as any; // LoopNodeDefinition
    const childNodeDefinition =
      loopDefinition.node || loopDefinition.taskTemplate;

    if (!childNodeDefinition) {
      this.logger.error('No child node definition found', {
        nodeDefinition: loopDefinition,
        hasNode: !!loopDefinition.node,
        hasTaskTemplate: !!loopDefinition.taskTemplate
      });
      return null;
    }

    this.logger.debug('Child node definition found', {
      nodeType: childNodeDefinition.nodeType,
      executor: childNodeDefinition.executor,
      nodeName: childNodeDefinition.nodeName,
      hasInputData: !!childNodeDefinition.inputData
    });

    return childNodeDefinition;
  }

  /**
   * 执行子节点创建事务
   * 使用数据库事务确保原子性操作：
   * 1. 批量创建所有子节点记录
   * 2. 在同一事务中将父节点状态更新为'executing'
   * 3. 在同一事务中将progress.status更新为'executing'
   */
  private async executeChildNodeCreationTransaction(
    executionContext: ExecutionContext,
    loopData: any[],
    totalCount: number,
    childNodeDefinition: any
  ): Promise<ServiceResult<ExecutionResult>> {
    const { nodeInstance } = executionContext;
    this.logger.info('Starting child node creation transaction', {
      nodeId: nodeInstance.nodeId,
      totalCount,
      childNodeType: childNodeDefinition.nodeType
    });

    try {
      const childNodeInstances = [] as NewWorkflowNodeInstance[];
      for (let index = 0; index < loopData.length; index += 1) {
        const data = loopData[index];
        const resolvedConfig = await this.resolveTemplateVariables(
          executionContext,
          data,
          childNodeDefinition.inputData
        );
        childNodeInstances.push({
          workflow_instance_id: nodeInstance.workflowInstanceId,
          node_id: `${nodeInstance.nodeId}_child_${index}`,
          node_name:
            childNodeDefinition.nodeName ||
            `${nodeInstance.nodeName} - Item ${index + 1}`,
          node_description:
            childNodeDefinition.nodeDescription ||
            `Child node ${index + 1} of ${nodeInstance.nodeName}`,
          node_type: childNodeDefinition.nodeType || 'simple',
          executor: childNodeDefinition.executor || null,
          status: 'pending' as const,
          input_data: {
            // 合并子节点定义中的输入数据
            ...resolvedConfig,
            // 合并循环数据
            iterationIndex: index,
            iterationData: data,
            parentNodeId: nodeInstance.nodeId
          },
          output_data: null,
          timeout_seconds: childNodeDefinition.timeoutSeconds || null,
          retry_delay_seconds: childNodeDefinition.retryDelaySeconds || null,
          execution_condition: childNodeDefinition.condition || null,
          error_message: null,
          error_details: null,
          started_at: null,
          completed_at: null,
          duration_ms: null,
          retry_count: 0,
          max_retries: childNodeDefinition.maxRetries || 3,
          parent_node_id: nodeInstance.id,
          child_index: index,
          loop_progress: null,
          loop_total_count: null,
          loop_completed_count: 0,
          parallel_group_id: null,
          parallel_index: null
        });
      }

      // 真正的数据库事务实现：确保ACID特性
      const updatedProgress: LoopProgress = {
        status: 'executing',
        totalCount,
        completedCount: 0,
        failedCount: 0
      };

      // 🎯 使用新的无感事务支持
      const transactionResult = await this.databaseApi.transaction(async () => {
        this.logger.debug(
          'Starting database transaction for child node creation',
          {
            nodeId: executionContext.nodeInstance.nodeId,
            totalCount
          }
        );

        // 1. 在事务中批量创建子节点实例
        // Repository 会自动检测并使用当前事务
        const createResult =
          await this.nodeInstanceRepository.createMany(childNodeInstances);
        if (!createResult.success) {
          throw new Error(
            `Failed to create child node instances: ${createResult.error}`
          );
        }

        this.logger.debug('Child nodes created in transaction', {
          nodeId: nodeInstance.nodeId,
          createdCount: createResult.data?.length || 0
        });

        // 2. 在同一事务中更新父循环节点的状态
        // Repository 会自动检测并使用当前事务
        const updateResult =
          await this.nodeInstanceRepository.updateLoopProgress(
            nodeInstance.id,
            updatedProgress,
            0
          );

        if (!updateResult.success) {
          throw new Error(
            `Failed to update loop progress: ${updateResult.error}`
          );
        }

        this.logger.debug('Loop progress updated in transaction', {
          nodeId: nodeInstance.nodeId,
          progress: updatedProgress
        });

        return {
          childNodes: createResult.data,
          progress: updatedProgress
        };
      });

      if (!transactionResult.success) {
        throw new Error(
          `Database transaction failed: ${transactionResult.error}`
        );
      }

      const { childNodes, progress } = transactionResult.data;

      this.logger.info(
        'Child node creation transaction completed successfully',
        {
          nodeId: nodeInstance.nodeId,
          totalCount,
          createdChildNodes: childNodes?.length || 0
        }
      );

      return {
        success: true,
        data: {
          success: true,
          data: {
            totalCount,
            childNodes,
            progress
          }
        }
      };
    } catch (error) {
      this.logger.error('Child node creation transaction failed', {
        error,
        nodeId: nodeInstance.nodeId,
        totalCount
      });

      return {
        success: false,
        error: 'Child node creation transaction failed',
        errorDetails: error
      };
    }
  }

  /**
   * 处理所有子节点已完成的情况
   */
  private async handleAllChildNodesCompleted(
    nodeInstance: any,
    progress: LoopProgress
  ): Promise<ServiceResult<ExecutionResult>> {
    this.logger.info('All child nodes completed, finalizing loop node', {
      nodeId: nodeInstance.nodeId,
      totalCount: progress.totalCount,
      completedCount: progress.completedCount,
      failedCount: progress.failedCount
    });

    // 更新循环节点状态为完成
    await this.updateNodeStatus(nodeInstance.id, 'completed');

    const finalProgress: LoopProgress = {
      ...progress,
      status: 'completed'
    };

    await this.nodeInstanceRepository.updateLoopProgress(
      nodeInstance.id,
      finalProgress,
      progress.completedCount
    );

    return {
      success: true,
      data: {
        success: true,
        data: {
          status: 'completed',
          progress: finalProgress,
          summary: {
            totalCount: progress.totalCount,
            completedCount: progress.completedCount,
            failedCount: progress.failedCount,
            successRate:
              progress.totalCount > 0
                ? (
                    (progress.completedCount / progress.totalCount) *
                    100
                  ).toFixed(2) + '%'
                : '0%'
          }
        }
      }
    };
  }

  /**
   * 并行执行子节点
   */
  private async executeChildNodesInParallel(
    executionContext: ExecutionContext,
    pendingChildren: any[],
    progress: LoopProgress
  ): Promise<ServiceResult<ExecutionResult>> {
    const { nodeInstance, nodeDefinition } = executionContext;

    this.logger.info('Executing child nodes in parallel', {
      nodeId: nodeInstance.nodeId,
      pendingChildrenCount: pendingChildren.length
    });

    // 获取子节点定义
    const childNodeDefinition = this.getChildNodeDefinition(nodeDefinition);
    if (!childNodeDefinition) {
      return {
        success: false,
        error: 'No child node definition found for parallel execution'
      };
    }

    // 并行执行所有子节点
    const childResults = await Promise.allSettled(
      pendingChildren.map((child) => {
        const childContext: ExecutionContext = {
          ...executionContext,
          nodeInstance: this.mapToBusinessModel(child),
          nodeDefinition: childNodeDefinition
        };
        return this.executeNode(childContext);
      })
    );

    let completedCount = progress.completedCount;
    let failedCount = progress.failedCount;

    childResults.forEach((result) => {
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
      nodeInstance.id,
      updatedProgress,
      completedCount
    );

    this.logger.info('Parallel execution completed', {
      nodeId: nodeInstance.nodeId,
      completedCount,
      failedCount,
      totalProcessed: pendingChildren.length
    });

    return {
      success: true,
      data: {
        success: true,
        data: {
          status: 'executing',
          progress: updatedProgress,
          executionMode: 'parallel',
          processedCount: pendingChildren.length
        }
      }
    };
  }

  /**
   * 串行执行子节点
   */
  private async executeChildNodesInSerial(
    executionContext: ExecutionContext,
    pendingChildren: any[],
    progress: LoopProgress
  ): Promise<ServiceResult<ExecutionResult>> {
    const { nodeInstance, nodeDefinition } = executionContext;

    this.logger.info('Executing child nodes in serial', {
      nodeId: nodeInstance.nodeId,
      pendingChildrenCount: pendingChildren.length
    });

    // 获取子节点定义
    const childNodeDefinition = this.getChildNodeDefinition(nodeDefinition);
    if (!childNodeDefinition) {
      return {
        success: false,
        error: 'No child node definition found for serial execution'
      };
    }

    let completedCount = progress.completedCount;
    let failedCount = progress.failedCount;
    const childResults: any[] = [];

    // 逐个串行执行子节点
    for (let i = 0; i < pendingChildren.length; i++) {
      const child = pendingChildren[i];

      this.logger.debug('Executing child node in serial mode', {
        parentNodeId: nodeInstance.nodeId,
        childNodeId: child.node_id,
        childIndex: i + 1,
        totalChildren: pendingChildren.length
      });

      const childContext = {
        ...executionContext,
        config: child.input_data,
        nodeInstance: this.mapToBusinessModel(child),
        nodeDefinition: childNodeDefinition
      };

      try {
        const childResult = await this.executeNode(childContext);
        childResults.push(childResult);

        if (childResult.success) {
          completedCount++;
          this.logger.debug('Child node completed successfully', {
            parentNodeId: nodeInstance.nodeId,
            childNodeId: child.node_id,
            completedCount
          });
        } else {
          failedCount++;
          this.logger.warn('Child node execution failed', {
            parentNodeId: nodeInstance.nodeId,
            childNodeId: child.node_id,
            error: childResult.error,
            failedCount
          });

          // 根据错误处理策略决定是否继续
          const errorHandling =
            nodeInstance.executorConfig?.errorHandling || 'continue';
          if (errorHandling === 'stop') {
            this.logger.warn(
              'Stopping serial execution due to child node failure',
              {
                parentNodeId: nodeInstance.nodeId,
                failedChildNodeId: child.node_id,
                errorHandling
              }
            );
            break;
          }
        }

        // 更新进度（每执行完一个子节点就更新一次）
        const currentProgress: LoopProgress = {
          ...progress,
          completedCount,
          failedCount
        };

        await this.nodeInstanceRepository.updateLoopProgress(
          nodeInstance.id,
          currentProgress,
          completedCount
        );
      } catch (error) {
        failedCount++;
        this.logger.error('Child node execution threw exception', {
          parentNodeId: nodeInstance.nodeId,
          childNodeId: child.node_id,
          error
        });

        childResults.push({
          success: false,
          error: 'Child node execution exception',
          errorDetails: error
        });

        // 根据错误处理策略决定是否继续
        const errorHandling =
          nodeInstance.executorConfig?.errorHandling || 'continue';
        if (errorHandling === 'stop') {
          this.logger.warn(
            'Stopping serial execution due to child node exception',
            {
              parentNodeId: nodeInstance.nodeId,
              failedChildNodeId: child.node_id,
              errorHandling
            }
          );
          break;
        }
      }
    }

    const finalProgress: LoopProgress = {
      ...progress,
      completedCount,
      failedCount
    };

    // 最终更新进度
    await this.nodeInstanceRepository.updateLoopProgress(
      nodeInstance.id,
      finalProgress,
      completedCount
    );

    this.logger.info('Serial execution of child nodes completed', {
      nodeId: nodeInstance.nodeId,
      totalChildren: pendingChildren.length,
      completedCount,
      failedCount,
      successRate: `${completedCount}/${pendingChildren.length}`
    });

    return {
      success: true,
      data: {
        success: true,
        data: {
          status: 'executing',
          progress: finalProgress,
          executionMode: 'serial',
          childResults,
          processedCount: pendingChildren.length
        }
      }
    };
  }

  /**
   * 执行子流程节点
   *
   * 1. 查询子工作流实例：首先使用external_id查询工作流实例
   * 2. 实例存在的处理：直接获取该实例并调用executeWorkflowInstance执行
   * 3. 实例不存在的处理：查询工作流定义、创建新实例、设置external_id、执行实例
   * 4. 错误处理：包含external_id查询失败、工作流定义不存在、实例创建失败等情况
   */
  async executeSubProcessNode(
    context: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>> {
    const { nodeInstance, workflowInstance, nodeDefinition } = context;
    const startTime = Date.now();

    try {
      this.logger.info('Executing subprocess node', {
        nodeId: nodeInstance.nodeId,
        workflowInstanceId: nodeInstance.workflowInstanceId
      });

      // 更新节点状态为执行中
      await this.updateNodeStatus(nodeInstance.id, 'running');

      // 1. 获取子流程节点定义
      const subprocessDef = nodeDefinition as SubprocessNodeDefinition;
      if (!subprocessDef) {
        throw new Error('Invalid subprocess node definition');
      }

      // 验证必需的配置
      if (!subprocessDef.workflowName) {
        throw new Error('subWorkflowName is required for subprocess node');
      }

      this.logger.info('Starting subprocess execution', {
        nodeId: nodeInstance.nodeId,
        subWorkflowName: subprocessDef.workflowName,
        subWorkflowVersion: subprocessDef.version
      });

      // 2. 首先通过external_id查询子工作流实例
      const existingInstanceResult =
        await this.findWorkflowInstanceByExternalId(nodeInstance.id.toString());

      if (!existingInstanceResult.success) {
        throw new Error(
          `Failed to query existing subprocess instance: ${existingInstanceResult.error}`
        );
      }

      let subWorkflowInstance: WorkflowInstance;
      let workflowDefinition: WorkflowDefinitionTable;

      if (existingInstanceResult.data) {
        // 3. 实例存在的处理：直接获取该实例
        subWorkflowInstance = existingInstanceResult.data;
        this.logger.info('Found existing subprocess instance', {
          nodeId: nodeInstance.nodeId,
          subWorkflowInstanceId: subWorkflowInstance.id,
          externalId: subWorkflowInstance.externalId
        });

        // 获取工作流定义
        const definitionResult = await this.workflowDefinitionService.getById(
          subWorkflowInstance.workflowDefinitionId
        );
        if (!definitionResult.success) {
          throw new Error(
            `Failed to get workflow definition: ${definitionResult.error}`
          );
        }
        workflowDefinition = definitionResult.data!;
      } else {
        // 4. 实例不存在的处理：查询工作流定义并创建新实例
        this.logger.info(
          'No existing subprocess instance found, creating new one',
          {
            nodeId: nodeInstance.nodeId,
            subWorkflowName: subprocessDef.workflowName,
            subWorkflowVersion: subprocessDef.version
          }
        );

        // 4.1 查询工作流定义
        const definitionResult = await this.getWorkflowDefinition(
          subprocessDef.workflowName,
          subprocessDef.version
        );

        if (!definitionResult.success) {
          throw new Error(
            `Workflow definition not found: ${subprocessDef.workflowName}${subprocessDef.version ? `@${subprocessDef.workflowName}` : ''} - ${definitionResult.error}`
          );
        }
        workflowDefinition = definitionResult.data!;

        // 4.2 处理输入映射
        const mappedInputData = this.mapSubprocessInputSimple(
          subprocessDef,
          context
        );

        // 4.3 创建新的子工作流实例
        const instanceResult = await this.createSubWorkflowInstance(
          workflowDefinition,
          mappedInputData,
          {
            externalId: nodeInstance.id.toString(), // 设置external_id为当前节点ID
            parentWorkflowInstanceId: workflowInstance.id,
            parentNodeId: nodeInstance.nodeId,
            createdBy: 'subprocess-node',
            ...nodeInstance.inputData
          }
        );

        if (!instanceResult.success) {
          throw new Error(
            `Failed to create subprocess instance: ${instanceResult.error}`
          );
        }
        subWorkflowInstance = instanceResult.data!;

        this.logger.info('Created new subprocess instance', {
          nodeId: nodeInstance.nodeId,
          subWorkflowInstanceId: subWorkflowInstance.id,
          subWorkflowName: subprocessDef.workflowName,
          externalId: subWorkflowInstance.externalId
        });
      }

      // 5. 执行子工作流实例
      this.logger.info('Executing subprocess workflow instance', {
        nodeId: nodeInstance.nodeId,
        subWorkflowInstanceId: subWorkflowInstance.id
      });

      const executionResult = await this.executeWorkflowInstance(
        workflowDefinition,
        subWorkflowInstance
      );

      if (!executionResult.success) {
        throw new Error(
          `Sub-workflow execution failed: ${executionResult.error}`
        );
      }

      // 6. 处理输出映射
      const mappedOutput = this.mapSubprocessOutputSimple(
        subprocessDef,
        subWorkflowInstance.outputData
      );

      const duration = Date.now() - startTime;

      // 7. 更新节点状态为完成
      await this.updateNodeStatus(nodeInstance.id, 'completed');
      await this.nodeInstanceRepository.updateNodeInstance(nodeInstance.id, {
        output_data: mappedOutput,
        completed_at: new Date(),
        duration_ms: duration
      });

      this.logger.info('Subprocess node execution completed', {
        nodeId: nodeInstance.nodeId,
        subWorkflowInstanceId: subWorkflowInstance.id,
        duration
      });

      return {
        success: true,
        data: {
          success: true,
          data: mappedOutput,
          duration
        }
      };
    } catch (error) {
      this.logger.error('Failed to execute subprocess node', {
        error,
        nodeId: nodeInstance.nodeId,
        workflowInstanceId: nodeInstance.workflowInstanceId
      });

      await this.updateNodeStatus(
        nodeInstance.id,
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
   * 通过external_id查询工作流实例
   */
  private async findWorkflowInstanceByExternalId(
    externalId: string
  ): Promise<ServiceResult<WorkflowInstance | null>> {
    try {
      this.logger.debug('Querying workflow instance by external_id', {
        externalId
      });

      // 使用WorkflowInstanceService的findByExternalId方法
      const result =
        await this.workflowInstanceService.findByExternalId(externalId);

      if (!result.success) {
        this.logger.warn('Failed to query workflow instance by external_id', {
          externalId,
          error: result.error
        });
        return {
          success: false,
          error: result.error,
          errorDetails: result.errorDetails
        };
      }

      this.logger.debug('Workflow instance query completed', {
        externalId,
        found: !!result.data,
        instanceId: result.data?.id
      });

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error('Error querying workflow instance by external_id', {
        externalId,
        error
      });
      return {
        success: false,
        error: 'Failed to query workflow instance by external_id',
        errorDetails: error
      };
    }
  }

  /**
   * 获取工作流定义
   */
  private async getWorkflowDefinition(
    workflowName: string,
    workflowVersion?: string
  ): Promise<ServiceResult<WorkflowDefinitionTable>> {
    try {
      this.logger.debug('Getting workflow definition', {
        workflowName,
        workflowVersion
      });

      const result = workflowVersion
        ? await this.workflowDefinitionService.getByNameAndVersion(
            workflowName,
            workflowVersion
          )
        : await this.workflowDefinitionService.getActiveByName(workflowName);

      if (!result.success) {
        this.logger.warn('Failed to get workflow definition', {
          workflowName,
          workflowVersion,
          error: result.error
        });
        return {
          success: false,
          error: result.error,
          errorDetails: result.errorDetails
        };
      }

      this.logger.debug('Workflow definition found', {
        workflowName,
        workflowVersion,
        definitionId: result.data!.id
      });

      return {
        success: true,
        data: result.data!
      };
    } catch (error) {
      this.logger.error('Error getting workflow definition', {
        workflowName,
        workflowVersion,
        error
      });
      return {
        success: false,
        error: 'Failed to get workflow definition',
        errorDetails: error
      };
    }
  }

  /**
   * 创建子工作流实例
   */
  private async createSubWorkflowInstance(
    workflowDefinition: WorkflowDefinitionTable,
    inputData: Record<string, any> = {},
    contextData: Record<string, any> = {}
  ): Promise<ServiceResult<WorkflowInstance>> {
    try {
      this.logger.debug('Creating subprocess workflow instance', {
        workflowDefinitionId: workflowDefinition.id
      });

      const result = await this.workflowInstanceService.getWorkflowInstance(
        workflowDefinition,
        {
          inputData,
          contextData
        }
      );

      if (!result.success) {
        this.logger.warn('Failed to create subprocess workflow instance', {
          workflowDefinitionId: workflowDefinition.id,
          error: result.error
        });
        return {
          success: false,
          error: result.error,
          errorDetails: result.errorDetails
        };
      }

      this.logger.debug('Subprocess workflow instance created', {
        workflowDefinitionId: workflowDefinition.id,
        instanceId: result.data!.id
      });

      return {
        success: true,
        data: result.data!
      };
    } catch (error) {
      this.logger.error('Error creating subprocess workflow instance', {
        workflowDefinitionId: workflowDefinition.id,
        error
      });
      return {
        success: false,
        error: 'Failed to create subprocess workflow instance',
        errorDetails: error
      };
    }
  }

  async executeWorkflowInstance(
    workflowDefinition: WorkflowDefinitionTable,
    workflowInstance: WorkflowInstance
  ): Promise<ServiceResult<any>> {
    // TODO: 实现工作流实例执行逻辑
    // 2. 更新工作流状态为执行中
    await this.workflowInstanceService.updateStatus(
      workflowInstance.id,
      'running'
    );

    // 3. 获取工作流的所有节点定义（按执行顺序，支持检查点恢复）
    const orderedNodes = await this.getOrderedNodes(
      workflowDefinition.definition,
      workflowInstance
    );

    if (orderedNodes.length === 0) {
      // 没有节点，工作流完成
      await this.completeWorkflow(workflowInstance);
      // 获取最后一个节点的输出作为工作流的输出
      return { success: true };
    }
    // 4. 构建执行上下文
    const executionContext = {
      workflowInstance
    } as ExecutionContext;
    // 5. For循环顺序执行每个节点
    for (const nodeDefinition of orderedNodes) {
      this.logger.info('Processing node', {
        nodeId: nodeDefinition.nodeId,
        nodeType: nodeDefinition.nodeType,
        instanceId: workflowInstance.id
      });
      // 5.1 获取或创建节点实例
      const nodeInstanceResult = await this.getOrCreateNodeInstance(
        workflowInstance.id,
        nodeDefinition
      );

      if (!nodeInstanceResult.success) {
        await this.handleWorkflowError(
          workflowInstance,
          `Failed to get or create node instance: ${nodeDefinition.nodeId}`,
          nodeInstanceResult.error
        );
        return { success: false, error: nodeInstanceResult.error };
      }

      const nodeInstance = nodeInstanceResult.data!;

      // 5.2 检查节点执行条件和状态
      if (!this.shouldExecuteNode(nodeInstance)) {
        this.logger.info('Skipping node execution', {
          nodeId: nodeInstance.nodeId,
          status: nodeInstance.status,
          reason: 'Node already completed or should not execute'
        });
        continue;
      }

      // 5.3 处理节点重试逻辑
      const retryResult = await this.handleNodeRetryLogic(nodeInstance);
      if (!retryResult.shouldContinue) {
        if (retryResult.shouldFail) {
          await this.handleWorkflowError(
            workflowInstance,
            `Node ${nodeInstance.nodeId} failed after ${nodeInstance.maxRetries} retries`
          );
          return { success: false, error: retryResult.error };
        }
        continue; // 跳过当前节点，继续下一个
      }

      // 5.4.1 检查和获取前置节点结果
      await this.loadPreviousNodeOutput(
        nodeInstance,
        executionContext,
        orderedNodes
      );

      // 5.4.2 进行模板变量替换（统一处理input_data）
      const resolvedConfig = await this.resolveTemplateVariables(
        executionContext,
        {},
        nodeDefinition.inputData
      );

      // 设置执行上下文（使用解析后的配置）
      executionContext.config = resolvedConfig || {};
      // 设置节点定义和实例
      executionContext.nodeDefinition = nodeDefinition;
      // 设置节点实例
      executionContext.nodeInstance = nodeInstance;

      // 5.5 根据节点类型执行不同逻辑
      const executionResult = await this.executeNode(executionContext);

      // 5.6 处理执行结果
      const handleResult = await this.handleNodeExecutionResult(
        nodeInstance,
        executionResult,
        workflowInstance,
        executionContext
      );

      if (!handleResult.success) {
        return { success: false, error: handleResult.error };
      }

      // 5.7 更新检查点
      await this.workflowInstanceService.updateCurrentNode(
        workflowInstance.id,
        nodeInstance.nodeId,
        { lastCompletedNode: nodeInstance.nodeId, timestamp: new Date() }
      );
    }
    // 6. 工作流完成
    await this.completeWorkflow(workflowInstance);
    return { success: true, data: executionContext.previousNodeOutput };
  }

  /**
   * 保存节点执行结果
   */
  private async saveNodeExecutionResult(
    nodeInstance: NodeInstance,
    executionResult: ServiceResult<any>,
    executionContext: ExecutionContext
  ): Promise<void> {
    try {
      if (!executionResult.success || !executionResult.data) {
        this.logger.debug('No output data to save', {
          nodeId: nodeInstance.nodeId,
          success: executionResult.success
        });
        return;
      }

      this.logger.debug('Saving node execution result', {
        nodeId: nodeInstance.nodeId,
        hasOutputData: !!executionResult.data
      });

      // 1. 更新数据库中的节点输出数据和状态
      const updateResult = await this.nodeInstanceRepository.updateNodeInstance(
        nodeInstance.id,
        executionResult.data
      );

      if (!updateResult.success) {
        this.logger.error('Failed to update node output data in database', {
          nodeId: nodeInstance.nodeId,
          error: updateResult.error
        });
        // 不抛出错误，继续执行
      }

      // 2. 更新执行上下文中的前置节点输出（为下一个节点准备）
      executionContext.previousNodeOutput = executionResult.data;

      // 3. 更新节点实例的输出数据（内存中）
      nodeInstance.outputData = executionResult.data;
      nodeInstance.status = 'completed';
      nodeInstance.completedAt = new Date();

      this.logger.debug('Node execution result saved successfully', {
        nodeId: nodeInstance.nodeId,
        outputDataKeys: Object.keys(executionResult.data || {})
      });
    } catch (error) {
      this.logger.error('Failed to save node execution result', {
        error,
        nodeId: nodeInstance.nodeId
      });
      // 不抛出错误，确保工作流能继续执行
    }
  }

  /**
   * 处理节点执行结果
   */
  private async handleNodeExecutionResult(
    nodeInstance: NodeInstance,
    executionResult: ServiceResult<any>,
    workflowInstance: WorkflowInstance,
    executionContext: ExecutionContext
  ): Promise<ServiceResult<void>> {
    try {
      if (!executionResult.success) {
        // 节点执行失败
        if (nodeInstance.retryCount < nodeInstance.maxRetries) {
          // 可以重试，更新重试计数
          nodeInstance.retryCount++;
          await this.updateNodeStatus(
            nodeInstance.id,
            'failed_retry',
            executionResult.error,
            executionResult.errorDetails
          );

          // 等待一段时间后重试
          await sleep(10000); // 5秒延迟
          return { success: true }; // 继续执行
        } else {
          // 重试次数已达上限
          await this.handleWorkflowError(
            workflowInstance,
            `Node ${nodeInstance.nodeId} execution failed`,
            executionResult.errorDetails
          );
          return {
            success: false,
            error: `Node ${nodeInstance.nodeId} execution failed after retries`
          };
        }
      }

      // 节点执行成功 - 保存执行结果
      await this.saveNodeExecutionResult(
        nodeInstance,
        executionResult,
        executionContext
      );

      this.logger.info('Node executed successfully', {
        nodeId: nodeInstance.nodeId,
        workflowInstanceId: workflowInstance.id,
        hasOutputData: !!executionResult.data
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to handle node execution result', {
        error,
        nodeId: nodeInstance.nodeId
      });

      return {
        success: false,
        error: 'Failed to handle node execution result',
        errorDetails: error
      };
    }
  }

  /**
   * 检查和加载前置节点输出数据
   * 优化版本：只查询直接前置节点，减少数据库查询
   */
  private async loadPreviousNodeOutput(
    nodeInstance: NodeInstance,
    executionContext: ExecutionContext,
    orderedNodes: any[]
  ): Promise<void> {
    try {
      if (!nodeInstance) {
        return;
      }

      const currentNodeId = nodeInstance.nodeId;
      const workflowInstanceId = executionContext.workflowInstance.id;

      this.logger.debug('Loading previous node output', {
        currentNodeId,
        workflowInstanceId
      });

      // 条件检查优化：只有当前置节点输出不存在时才查询
      if (
        executionContext.previousNodeOutput !== undefined &&
        executionContext.previousNodeOutput !== null
      ) {
        this.logger.debug(
          'Previous node output already exists in context, skipping database query'
        );
        return;
      }

      // 查找当前节点在有序列表中的位置
      const currentNodeIndex = orderedNodes.findIndex(
        (node) => (node.nodeId || node.id) === currentNodeId
      );

      if (currentNodeIndex <= 0) {
        // 第一个节点或未找到，没有前置节点
        this.logger.debug('No previous node for current node', {
          currentNodeId
        });
        return;
      }

      // 查询范围限制：只查询直接前置节点（当前节点的上一个节点）
      const directPreviousNodeDef = orderedNodes[currentNodeIndex - 1];
      const directPreviousNodeId =
        directPreviousNodeDef.nodeId || directPreviousNodeDef.id;

      this.logger.debug('Checking direct previous node', {
        currentNodeId,
        directPreviousNodeId,
        currentNodeIndex
      });

      const nodeInstanceResult = await this.getNodeInstance(
        workflowInstanceId,
        directPreviousNodeId
      );

      if (nodeInstanceResult.success && nodeInstanceResult.data) {
        const previousUnifiedNodeInstance = nodeInstanceResult.data;

        if (
          previousUnifiedNodeInstance.status === 'completed' &&
          previousUnifiedNodeInstance.outputData
        ) {
          // 找到直接前置节点的输出数据
          executionContext.previousNodeOutput =
            previousUnifiedNodeInstance.outputData;

          this.logger.debug('Loaded direct previous node output', {
            currentNodeId,
            directPreviousNodeId,
            hasOutputData: !!previousUnifiedNodeInstance.outputData,
            outputDataKeys: Object.keys(
              previousUnifiedNodeInstance.outputData || {}
            )
          });
        } else {
          this.logger.debug(
            'Direct previous node not completed or has no output',
            {
              currentNodeId,
              directPreviousNodeId,
              status: previousUnifiedNodeInstance.status,
              hasOutputData: !!previousUnifiedNodeInstance.outputData
            }
          );
        }
      } else {
        this.logger.debug('Direct previous node instance not found', {
          currentNodeId,
          directPreviousNodeId
        });
      }
    } catch (error) {
      this.logger.warn('Failed to load previous node output', {
        error,
        currentNodeId: nodeInstance?.nodeId,
        workflowInstanceId: executionContext.workflowInstance.id
      });
      // 不抛出错误，继续执行
    }
  }

  /**
   * 处理节点重试逻辑
   */
  private async handleNodeRetryLogic(nodeInstance: NodeInstance): Promise<{
    shouldContinue: boolean;
    shouldFail: boolean;
    error?: string;
  }> {
    if (nodeInstance.status === 'failed') {
      // 节点失败，检查是否需要重试
      if (nodeInstance.retryCount < nodeInstance.maxRetries) {
        this.logger.info('Retrying failed node', {
          nodeId: nodeInstance.nodeId,
          retryCount: nodeInstance.retryCount + 1,
          maxRetries: nodeInstance.maxRetries
        });

        // 重置节点状态为待重试
        await this.updateNodeStatus(nodeInstance.id, 'failed_retry');

        // 等待重试延迟
        if (nodeInstance.retryDelaySeconds) {
          await sleep(nodeInstance.retryDelaySeconds * 1000);
        }

        return { shouldContinue: true, shouldFail: false };
      } else {
        // 重试次数已达上限
        return {
          shouldContinue: false,
          shouldFail: true,
          error: `Node failed after ${nodeInstance.maxRetries} retries`
        };
      }
    }

    return { shouldContinue: true, shouldFail: false };
  }

  /**
   * 检查节点是否应该执行
   */
  private shouldExecuteNode(nodeInstance: NodeInstance): boolean {
    // 如果节点已完成，跳过执行
    if (nodeInstance.status === 'completed') {
      return false;
    }

    // 如果节点正在运行，跳过执行（避免重复执行）
    if (nodeInstance.status === 'running') {
      return false;
    }

    // 检查条件表达式（如果有的话）
    if (nodeInstance.condition) {
      // TODO: 实现条件表达式评估
      // 暂时返回true，后续可以集成表达式引擎
      return true;
    }

    return true;
  }

  /**
   * 处理工作流错误
   */
  public async handleWorkflowError(
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
   * 获取或创建节点实例
   */
  private async getOrCreateNodeInstance(
    workflowInstanceId: number,
    nodeDefinition: NodeDefinition
  ): Promise<ServiceResult<NodeInstance>> {
    try {
      const nodeId = nodeDefinition.nodeId;

      this.logger.debug('Getting or creating node instance', {
        workflowInstanceId,
        nodeId,
        nodeType: nodeDefinition.nodeType
      });

      // 1. 尝试获取已存在的节点实例
      const existingInstanceResult = await this.getNodeInstance(
        workflowInstanceId,
        nodeId
      );

      if (existingInstanceResult.success && existingInstanceResult.data) {
        this.logger.debug('Found existing node instance', {
          nodeId,
          instanceId: existingInstanceResult.data.id,
          status: existingInstanceResult.data.status
        });
        return existingInstanceResult;
      }

      // 2. 创建新的节点实例
      this.logger.debug('Creating new node instance', { nodeId });

      const newInstanceData = {
        workflowInstanceId,
        nodeId,
        nodeName: nodeDefinition.nodeName || nodeId,
        nodeDescription: nodeDefinition.nodeDescription,
        nodeType: nodeDefinition.nodeType,
        executor: (nodeDefinition as any).executor,
        inputData: nodeDefinition.inputData,
        timeoutSeconds: nodeDefinition.timeoutSeconds,
        maxRetries: nodeDefinition.maxRetries || 3,
        retryDelaySeconds: nodeDefinition.retryDelaySeconds,
        condition: nodeDefinition.condition,
        status: 'pending' as const,
        retryCount: 0,
        loopCompletedCount: 0
      };

      const createResult = await this.createNodeInstance(newInstanceData);

      if (createResult.success) {
        this.logger.debug('Created new node instance', {
          nodeId,
          instanceId: createResult.data!.id
        });
      }

      return createResult;
    } catch (error) {
      this.logger.error('Failed to get or create node instance', {
        error,
        workflowInstanceId,
        nodeId: nodeDefinition.nodeId
      });

      return {
        success: false,
        error: 'Failed to get or create node instance',
        errorDetails: error
      };
    }
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
   * 获取工作流的所有节点定义（按执行顺序）
   * 支持从检查点恢复执行
   */
  private async getOrderedNodes(
    workflowDefinition: WorkflowDefinitionData,
    workflowInstance?: WorkflowInstance
  ): Promise<NodeDefinition[]> {
    const nodes = workflowDefinition.nodes || [];
    const connections = workflowDefinition.connections || [];

    this.logger.debug('Getting ordered nodes', {
      totalNodes: nodes.length,
      totalConnections: connections.length,
      hasCheckpoint: !!workflowInstance?.currentNodeId
    });

    // 1. 获取基础有序节点列表
    let orderedNodes: any[] = [];

    if (connections.length > 0) {
      // 基于连接关系排序
      orderedNodes = this.topologicalSort(nodes, connections);
    } else if (nodes.some((node: any) => node.dependsOn?.length > 0)) {
      // 基于依赖关系排序
      orderedNodes = this.sortByDependencies(nodes);
    } else {
      // 默认按定义顺序执行
      orderedNodes = nodes;
    }

    // 2. 如果没有工作流实例或检查点，返回所有节点
    if (!workflowInstance || !workflowInstance.currentNodeId) {
      this.logger.debug('No checkpoint found, returning all nodes', {
        nodeCount: orderedNodes.length
      });
      return orderedNodes;
    }

    // 3. 从检查点恢复：过滤出待执行的节点
    return await this.filterNodesFromCheckpoint(orderedNodes, workflowInstance);
  }

  /**
   * 从检查点过滤待执行的节点
   */
  private async filterNodesFromCheckpoint(
    orderedNodes: any[],
    workflowInstance: WorkflowInstance
  ): Promise<any[]> {
    try {
      const currentNodeId = workflowInstance.currentNodeId;

      this.logger.debug('Filtering nodes from checkpoint', {
        currentNodeId,
        totalNodes: orderedNodes.length,
        workflowInstanceId: workflowInstance.id
      });

      // 1. 找到检查点节点在有序列表中的位置
      const checkpointIndex = orderedNodes.findIndex(
        (node) => (node.nodeId || node.id) === currentNodeId
      );

      if (checkpointIndex === -1) {
        this.logger.warn(
          'Checkpoint node not found in ordered nodes, starting from beginning',
          {
            currentNodeId,
            availableNodes: orderedNodes.map((n) => n.nodeId || n.id)
          }
        );
        // 检查点节点不存在，从第一个节点开始
        return orderedNodes;
      }

      // 2. 获取从检查点开始的所有节点
      const candidateNodes = orderedNodes.slice(checkpointIndex);

      // 3. 查询各节点的实际执行状态
      const filteredNodes: any[] = [];

      for (const node of candidateNodes) {
        const nodeId = node.nodeId || node.id;

        // 查询节点实例状态
        const nodeInstanceResult = await this.getNodeInstance(
          workflowInstance.id,
          nodeId
        );

        if (!nodeInstanceResult.success || !nodeInstanceResult.data) {
          // 节点实例不存在，说明未执行过，需要执行
          filteredNodes.push(node);
          this.logger.debug('Node instance not found, will execute', {
            nodeId
          });
        } else {
          const nodeInstance = nodeInstanceResult.data;
          const status = nodeInstance.status;

          // 只包含待执行的节点（pending、failed、failed_retry）
          if (['pending', 'failed', 'failed_retry'].includes(status)) {
            filteredNodes.push(node);
            this.logger.debug('Node needs execution', { nodeId, status });
          } else if (status === 'completed') {
            this.logger.debug('Node already completed, skipping', {
              nodeId,
              status
            });
          } else {
            // 其他状态（如running）也包含进来，让执行引擎处理
            filteredNodes.push(node);
            this.logger.debug(
              'Node in uncertain state, including for execution',
              { nodeId, status }
            );
          }
        }
      }

      this.logger.info('Filtered nodes from checkpoint', {
        checkpointNodeId: currentNodeId,
        checkpointIndex,
        totalCandidates: candidateNodes.length,
        filteredCount: filteredNodes.length,
        filteredNodeIds: filteredNodes.map((n) => n.nodeId || n.id)
      });

      return filteredNodes;
    } catch (error) {
      this.logger.error('Failed to filter nodes from checkpoint', {
        error,
        workflowInstanceId: workflowInstance.id,
        currentNodeId: workflowInstance.currentNodeId
      });

      // 出错时返回所有节点，确保工作流能继续执行
      return orderedNodes;
    }
  }

  /**
   * 拓扑排序（基于连接关系）
   */
  private topologicalSort(nodes: any[], connections: any[]): any[] {
    const nodeMap = new Map(
      nodes.map((node) => [node.nodeId || node.id, node])
    );
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // 初始化
    nodes.forEach((node) => {
      const nodeId = node.nodeId || node.id;
      inDegree.set(nodeId, 0);
      adjList.set(nodeId, []);
    });

    // 构建邻接表和入度
    connections.forEach((conn) => {
      const from = conn.source;
      const to = conn.target;

      if (adjList.has(from) && inDegree.has(to)) {
        adjList.get(from)!.push(to);
        inDegree.set(to, inDegree.get(to)! + 1);
      }
    });

    // 拓扑排序
    const queue: string[] = [];
    const result: any[] = [];

    // 找到所有入度为0的节点
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = nodeMap.get(currentId);

      if (currentNode) {
        result.push(currentNode);

        // 处理邻接节点
        adjList.get(currentId)?.forEach((neighborId) => {
          const newDegree = inDegree.get(neighborId)! - 1;
          inDegree.set(neighborId, newDegree);

          if (newDegree === 0) {
            queue.push(neighborId);
          }
        });
      }
    }

    return result;
  }

  /**
   * 按依赖关系排序
   */
  private sortByDependencies(nodes: any[]): any[] {
    const nodeMap = new Map(
      nodes.map((node) => [node.nodeId || node.id, node])
    );
    const visited = new Set<string>();
    const result: any[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;

      const node = nodeMap.get(nodeId);
      if (!node) return;

      // 先访问依赖节点
      const dependencies = node.dependsOn || [];
      dependencies.forEach((depId: string) => visit(depId));

      visited.add(nodeId);
      result.push(node);
    };

    // 访问所有节点
    nodes.forEach((node) => {
      const nodeId = node.nodeId || node.id;
      visit(nodeId);
    });

    return result;
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
        children.map((child) => {
          const childContext: ExecutionContext = {
            ...context,
            nodeInstance: this.mapToBusinessModel(child)
          };
          return this.executeNode(childContext);
        })
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
    executionContext: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>> {
    try {
      this.logger.info('Executing node', {
        nodeName: executionContext.nodeInstance.nodeName,
        nodeType: executionContext.nodeInstance.nodeType,
        workflowInstanceId: executionContext.workflowInstance.id
      });

      switch (executionContext.nodeInstance.nodeType) {
        case 'simple':
          return await this.executeSimpleNode(executionContext);
        case 'loop':
          return await this.executeLoopNode(executionContext);
        case 'subprocess':
          return await this.executeSubProcessNode(executionContext);
        case 'parallel':
          return await this.executeParallelNode(
            executionContext.nodeInstance,
            executionContext
          );
        default:
          return {
            success: false,
            error: `Unknown node type: ${executionContext.nodeInstance.nodeType}`
          };
      }
    } catch (error) {
      this.logger.error('Failed to execute node', {
        error,
        currentInstance: executionContext.nodeInstance
      });
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

    // 检查节点是否存在
    if (!result.data) {
      return {
        success: false,
        error: `Node instance not found: ${nodeId} in workflow ${workflowInstanceId}`
      };
    }

    return {
      success: true,
      data: this.mapToBusinessModel(result.data)
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
      node_description: null,
      node_type: nodeInstance.nodeType!,
      executor: nodeInstance.executor || null,
      status: 'pending' as const,
      input_data: nodeInstance.inputData || null,
      output_data: null,
      timeout_seconds: null,
      retry_delay_seconds: null,
      execution_condition: null,
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

  /**
   * 解析模板变量（根据节点类型智能选择目标字段）
   */
  public async resolveTemplateVariables(
    executionContext: ExecutionContext,
    variables: Record<string, any> = {},
    inputData?: Record<string, any>
  ): Promise<any> {
    const { workflowInstance } = executionContext;
    try {
      this.logger.debug('Resolving template variables', {
        workflowInstanceId: workflowInstance.id
      });

      // 1. 基础变量（扁平化）
      const flatVariables: Record<string, any> = {};

      // 工作流输入数据（优先级1）
      if (workflowInstance.inputData) {
        Object.assign(flatVariables, workflowInstance.inputData);
      }

      // 工作流上下文数据（优先级2）
      if (workflowInstance.contextData) {
        Object.assign(flatVariables, workflowInstance.contextData);
      }

      // 前置节点输出数据（优先级4，最高）
      if (
        executionContext.previousNodeOutput &&
        executionContext.previousNodeOutput.data
      ) {
        Object.assign(flatVariables, executionContext.previousNodeOutput.data);
      }

      // 工作流上下文数据（优先级2）
      if (variables) {
        Object.assign(flatVariables, variables);
      }

      this.logger.debug('Template variables built for node', {
        flatVariableCount: Object.keys(flatVariables).length
      });

      // 2. 根据节点类型确定需要解析的目标字段
      const resolvedConfig = await this.resolveNodeTypeSpecificFields(
        flatVariables,
        inputData
      );

      this.logger.debug('Template variables resolved successfully', {
        resolvedFields: Object.keys(resolvedConfig)
      });

      return resolvedConfig;
    } catch (error) {
      this.logger.warn('Failed to resolve template variables', {
        error,
        workflowInstanceId: workflowInstance.id
      });

      // 出错时返回空配置，确保工作流能继续执行
      return {};
    }
  }

  /**
   * 根据节点类型解析特定字段
   */
  private async resolveNodeTypeSpecificFields(
    templateVariables: Record<string, any>,
    inputData?: Record<string, any>
  ): Promise<any> {
    try {
      // 统一解析input_data，不再区分节点类型的配置处理
      let resolvedConfig = {};
      if (inputData) {
        resolvedConfig = this.templateService.resolveConfigVariables(
          inputData,
          templateVariables,
          { strict: false, defaultValue: undefined }
        );
      }
      return resolvedConfig;
    } catch (error) {
      this.logger.error('Failed to resolve node type specific fields', {
        error
      });
      return {};
    }
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

  /**
   * 简化版本：处理子流程输入映射
   */
  private mapSubprocessInputSimple(
    subprocessDef: SubprocessNodeDefinition,
    executionContext: ExecutionContext
  ): Record<string, any> {
    try {
      const { workflowInstance } = executionContext;

      // 构建基础变量上下文
      const baseVariables: Record<string, any> = {
        // 工作流输入数据
        ...workflowInstance.inputData,
        // 工作流上下文数据
        ...workflowInstance.contextData,
        // 前置节点输出数据
        ...executionContext.previousNodeOutput?.data
      };

      // 如果没有输入映射配置，返回基础变量
      if (!subprocessDef.outputData) {
        this.logger.debug('No input mapping defined, using base variables');
        return baseVariables;
      }

      // 应用输入映射
      const mappedInput: Record<string, any> = {};
      for (const [targetKey, sourceExpression] of Object.entries(
        subprocessDef.outputData
      )) {
        const resolveResult = this.templateService.evaluateExpression(
          sourceExpression,
          baseVariables
        );
        mappedInput[targetKey] = resolveResult.value;
      }

      this.logger.debug('Input mapping applied', {
        mappingCount: Object.keys(subprocessDef.outputData).length,
        mappedKeys: Object.keys(mappedInput)
      });

      return mappedInput;
    } catch (error) {
      this.logger.error('Error mapping subprocess input', {
        error,
        subprocessDef
      });
      return {};
    }
  }

  /**
   * 简化版本：处理子流程输出映射
   */
  private mapSubprocessOutputSimple(
    subprocessDef: SubprocessNodeDefinition,
    subWorkflowResult: any
  ): Record<string, any> {
    try {
      // 如果没有输出映射配置，返回原始结果
      if (!subprocessDef.outputData) {
        this.logger.debug('No output mapping defined, using raw result');
        return subWorkflowResult?.outputData || subWorkflowResult || {};
      }

      // 构建源数据上下文
      const sourceData = {
        // 子工作流的输出数据
        ...subWorkflowResult?.outputData,
        // 子工作流的完整结果
        subWorkflowResult,
        // 一些元数据
        executionTime: subWorkflowResult?.executionTime,
        status: subWorkflowResult?.status || 'completed'
      };

      // 应用输出映射
      const mappedOutput: Record<string, any> = {};
      for (const [targetKey, sourceExpression] of Object.entries(
        subprocessDef.outputData
      )) {
        const resolveResult = this.templateService.evaluateExpression(
          sourceExpression,
          sourceData
        );
        mappedOutput[targetKey] = resolveResult.value;
      }

      this.logger.debug('Output mapping applied', {
        mappingCount: Object.keys(subprocessDef.outputData).length,
        mappedKeys: Object.keys(mappedOutput)
      });

      return mappedOutput;
    } catch (error) {
      this.logger.error('Error mapping subprocess output', {
        error,
        subprocessDef
      });
      return subWorkflowResult?.outputData || {};
    }
  }
}
