/**
 * 工作流实例管理服务实现
 *
 * 实现工作流实例的核心业务逻辑
 * 版本: v3.0.0-refactored
 */

import type { Logger } from '@stratix/core';
import type {
  INodeInstanceRepository,
  ITemplateService,
  IWorkflowInstanceRepository,
  IWorkflowInstanceService
} from '../interfaces/index.js';
import type {
  PaginationOptions,
  QueryFilters,
  ServiceResult,
  WorkflowInstance,
  WorkflowInstanceStatus,
  WorkflowOptions
} from '../types/business.js';
import { WorkflowDefinitionTable } from '../types/database.js';
import type {
  NodeInstance,
  NodeInstanceWithChildren
} from '../types/unified-node.js';

/**
 * 工作流实例管理服务实现
 */
export default class WorkflowInstanceService
  implements IWorkflowInstanceService
{
  constructor(
    private readonly workflowInstanceRepository: IWorkflowInstanceRepository,
    private readonly nodeInstanceRepository: INodeInstanceRepository,
    private readonly logger: Logger,
    private readonly templateService: ITemplateService
  ) {}

  private getRepositoryErrorMessage(error: unknown): string {
    if (typeof error === 'string' && error.length > 0) {
      return error;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }

    return 'Database error';
  }

  /**
   * 获取或创建工作流实例
   *
   * 支持两种方式指定工作流定义：
   * 1. 通过definitionsId（数字ID或字符串ID）
   * 2. 通过opts中的workflowName和workflowVersion
   *
   * 如果是创建工作流实例：
   * 1. 解析工作流定义标识符
   * 2. 检查实例锁：根据实例type检查是否有运行中或中断的实例
   * 3. 检查业务实例锁：根据参数判断是否有已执行的实例锁（检查所有实例）
   * 4. 执行其他检查点验证
   * 5. 创建工作流实例并写入数据库，返回工作流实例
   *
   * 如果是恢复工作流实例：
   * 1. 查找中断的工作流实例
   * 2. 如果存在则修改工作流状态为执行中，并返回工作流实例
   */
  async getWorkflowInstance(
    workflowDefinition: WorkflowDefinitionTable,
    opts: WorkflowOptions
  ): Promise<ServiceResult<WorkflowInstance>> {
    try {
      this.logger.info('Getting workflow instance', {
        name: workflowDefinition.name,
        opts
      });

      this.logger.debug('Parsed workflow definition identifier', {
        name: workflowDefinition.name
      });

      // 如果是恢复模式，查找中断的实例
      if (opts.resume) {
        return await this.resumeInterruptedInstance(workflowDefinition, opts);
      }

      // 创建新实例模式
      return await this.createNewInstance(workflowDefinition, opts);
    } catch (error) {
      this.logger.error('Failed to get workflow instance', {
        error,
        name: workflowDefinition.name,
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
    definition: WorkflowDefinitionTable,
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
        instance.workflow_definition_id.toString() ===
          definition.id.toString() &&
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
    const instanceResult =
      await this.workflowInstanceRepository.findByIdNullable(
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
    definition: WorkflowDefinitionTable,
    opts: WorkflowOptions
  ): Promise<ServiceResult<WorkflowInstance>> {
    const instanceType = opts.contextData?.instanceType || definition.name;

    // 2. 检查实例锁：根据实例type检查是否有运行中或中断的实例
    this.logger.debug('开始实例锁检查', {
      instanceType,
      workflowName: definition.name,
      definitionId: definition.id
    });

    const instanceLockResult =
      await this.workflowInstanceRepository.checkInstanceLock(instanceType);
    if (!instanceLockResult.success) {
      this.logger.error('实例锁检查失败', {
        instanceType,
        error: instanceLockResult.error
      });
      return {
        success: false,
        error: 'Failed to check instance lock',
        errorDetails: instanceLockResult.error
      };
    }

    if (instanceLockResult.data && instanceLockResult.data.length > 0) {
      this.logger.warn('发现实例锁冲突', {
        instanceType,
        conflictCount: instanceLockResult.data.length,
        conflicts: instanceLockResult.data.map((i) => ({
          id: i.id,
          status: i.status,
          createdAt: i.created_at
        }))
      });
      return {
        success: false,
        error: `Instance lock conflict: ${instanceType} has running or interrupted instances`,
        errorDetails: instanceLockResult.data
      };
    }

    this.logger.debug('实例锁检查通过', { instanceType });

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

    const now = Date.now();

    // 5. 创建工作流实例并写入数据库
    const newInstance = {
      workflow_definition_id: definition.id,
      name: `${definition.name}-now`,
      external_id: opts.contextData?.externalId || null,
      status: 'pending' as const,
      instance_type: instanceType,
      input_data: opts.inputData || null,
      output_data: null,
      context_data: opts.contextData || null,
      business_key: opts.businessKey || null,
      mutex_key: opts.mutexKey || null,
      started_at: new Date(now),
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
    definition: WorkflowDefinitionTable,
    instance: WorkflowInstance,
    node: NodeInstance
  ): Promise<ServiceResult<NodeInstance | null>> {
    try {
      this.logger.info('Getting next node', {
        currentNodeId: node.nodeId,
        workflowInstanceId: node.workflowInstanceId
      });

      // 2. 根据当前节点找到下一个节点定义
      const nextNodeDef = this.findNextNodeDefinition(
        definition.definition,
        node.nodeId
      );
      if (!nextNodeDef) {
        // 没有下一个节点，工作流结束
        return {
          success: true,
          data: null
        };
      }
      let nodeInstance: NodeInstance;

      // 3. 检查节点实例是否已存在
      const existingNodeResult =
        await this.nodeInstanceRepository.findByWorkflowAndNodeId(
          node.workflowInstanceId,
          nextNodeDef.id
        );

      if (existingNodeResult.success && existingNodeResult.data) {
        nodeInstance = this.mapNodeToBusinessModel(existingNodeResult.data);
      } else {
        this.logger.debug('Enhanced template variables resolved for new node', {
          nodeId: nextNodeDef.nodeId || nextNodeDef.id,
          originalConfig: nextNodeDef.executorConfig || nextNodeDef.config,
          originalInputData: nextNodeDef.inputData
        });

        // 8. 创建新的节点实例（统一字段结构）
        const newNodeInstance = {
          workflow_instance_id: node.workflowInstanceId,
          node_id: nextNodeDef.nodeId || nextNodeDef.id, // 兼容旧字段名
          node_name: nextNodeDef.nodeName || nextNodeDef.name || nextNodeDef.id,
          node_description:
            nextNodeDef.nodeDescription || nextNodeDef.description || null,
          node_type: this.mapNodeType(nextNodeDef.nodeType || nextNodeDef.type),
          executor: nextNodeDef.executor || null,
          input_data: {
            // 合并executorConfig到inputData中（向后兼容）
            ...nextNodeDef.inputData,
            ...(nextNodeDef.executorConfig || {})
          },
          timeout_seconds:
            nextNodeDef.timeoutSeconds || nextNodeDef.timeout || null,
          max_retries: nextNodeDef.maxRetries || definition.max_retries || 3,
          retry_delay_seconds:
            nextNodeDef.retryDelaySeconds || nextNodeDef.retryDelay || null,
          execution_condition: nextNodeDef.condition || null,
          status: 'pending' as const,
          started_at: null,
          completed_at: null,
          duration_ms: null,
          output_data: null,
          error_message: null,
          error_details: null,
          retry_count: 0,
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

        nodeInstance = this.mapNodeToBusinessModel(createResult.data);
      }

      // 5. 构建增强的模板变量对象
      const variables = await this.buildEnhancedTemplateVariables(
        instance,
        node,
        nextNodeDef
      );

      // 6. 对节点配置进行模板变量替换
      const resolvedExecutorConfig =
        this.templateService.resolveConfigVariables(
          nextNodeDef.executorConfig || nextNodeDef.config || {},
          variables
        );
      nodeInstance.inputData = resolvedExecutorConfig;
      return {
        success: true,
        data: nodeInstance
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

  /**
   * 根据external_id查询工作流实例
   * 用于子流程节点查找已存在的工作流实例
   */
  async findByExternalId(
    externalId: string
  ): Promise<ServiceResult<WorkflowInstance | null>> {
    try {
      this.logger.debug('Finding workflow instance by external_id', {
        externalId
      });

      const result =
        await this.workflowInstanceRepository.findByExternalId(externalId);

      if (!result.success) {
        this.logger.warn('Failed to find workflow instance by external_id', {
          externalId,
          error: result.error
        });
        return {
          success: false,
          error: 'Failed to find workflow instance by external_id',
          errorDetails: result.error
        };
      }

      const workflowInstance = result.data
        ? this.mapToBusinessModel(result.data)
        : null;

      this.logger.debug('Workflow instance query by external_id completed', {
        externalId,
        found: !!workflowInstance,
        instanceId: workflowInstance?.id
      });

      return {
        success: true,
        data: workflowInstance
      };
    } catch (error) {
      this.logger.error('Error finding workflow instance by external_id', {
        externalId,
        error
      });
      return {
        success: false,
        error: 'Failed to find workflow instance by external_id',
        errorDetails: error
      };
    }
  }

  // 其他方法的简化实现...
  async getById(id: number): Promise<ServiceResult<WorkflowInstance>> {
    const result = await this.workflowInstanceRepository.findByIdNullable(id);
    if (!result.success) {
      return {
        success: false,
        error: this.getRepositoryErrorMessage(result.error),
        errorDetails: result.error
      };
    }

    if (!result.data) {
      return {
        success: false,
        error: 'Workflow instance not found'
      };
    }

    return {
      success: true,
      data: this.mapToBusinessModel(result.data)
    };
  }

  async updateStatus(
    id: number,
    status: string,
    errorMessage?: string,
    errorDetails?: any
  ): Promise<ServiceResult<boolean>> {
    const additionalData: any = {};
    if (errorMessage) {
      additionalData.error_message = errorMessage;
    }
    if (errorDetails) {
      additionalData.error_details = errorDetails;
    }

    const result = await this.workflowInstanceRepository.updateStatus(
      id,
      status as WorkflowInstanceStatus,
      additionalData
    );

    if (!result.success) {
      return {
        success: false,
        error: this.getRepositoryErrorMessage(result.error),
        errorDetails: result.error
      };
    }

    return {
      success: true,
      data: result.data !== null
    };
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
        error: this.getRepositoryErrorMessage(result.error),
        errorDetails: result.error
      };
    }

    return result;
  }

  async findMany(
    filters?: QueryFilters,
    pagination?: PaginationOptions
  ): Promise<
    ServiceResult<{
      items: WorkflowInstance[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }>
  > {
    // 添加调试日志
    console.log(
      '🔍 WorkflowInstanceService.findMany - Input filters:',
      filters
    );
    console.log(
      '🔍 WorkflowInstanceService.findMany - Input pagination:',
      pagination
    );

    const repositoryParams = {
      ...filters,
      ...pagination
    };
    console.log(
      '🔍 WorkflowInstanceService.findMany - Repository params:',
      repositoryParams
    );

    const result =
      await this.workflowInstanceRepository.findWithFilters(repositoryParams);
    if (!result.success) {
      return {
        success: false,
        error: this.getRepositoryErrorMessage(result.error),
        errorDetails: result.error
      };
    }
    return {
      success: true,
      data: {
        items: result.data!.items.map((item) => this.mapToBusinessModel(item)),
        total: result.data!.total,
        page: result.data!.page,
        pageSize: result.data!.pageSize,
        totalPages: result.data!.totalPages,
        hasNext: result.data!.hasNext,
        hasPrev: result.data!.hasPrev
      }
    };
  }

  /**
   * 获取流程分组列表
   * 按工作流定义聚合根实例，返回分组统计信息
   */
  async getWorkflowGroups(
    filters?: QueryFilters,
    options?: {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<
    ServiceResult<{
      groups: Array<{
        workflowDefinitionId: number;
        workflowDefinitionName: string;
        workflowDefinitionDescription?: string;
        workflowDefinitionVersion?: string;
        rootInstanceCount: number;
        totalInstanceCount: number;
        runningInstanceCount: number;
        completedInstanceCount: number;
        failedInstanceCount: number;
        latestActivity?: string;
        latestInstanceStatus?: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }>
  > {
    try {
      this.logger.info('Getting workflow groups', { filters, options });

      // 设置默认分页参数
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 20;
      const sortBy = options?.sortBy || 'latestActivity';
      const sortOrder = options?.sortOrder || 'desc';

      // 构建查询过滤器，只查询根实例
      const groupFilters = {
        ...filters,
        externalId: null // 只查询external_id为空的根实例
      };

      // 调用仓储层获取分组数据
      const result = await this.workflowInstanceRepository.getWorkflowGroups(
        groupFilters,
        { page, pageSize, sortBy, sortOrder }
      );

      if (!result.success) {
        this.logger.error('Failed to get workflow groups', {
          error: result.error
        });
        return {
          success: false,
          error: 'Failed to get workflow groups',
          errorDetails: result.error
        };
      }

      return {
        success: true,
        data: result.data!
      };
    } catch (error) {
      this.logger.error('Error getting workflow groups', { error });
      return {
        success: false,
        error: 'Internal error getting workflow groups',
        errorDetails: error
      };
    }
  }

  async findInterruptedInstances(): Promise<ServiceResult<WorkflowInstance[]>> {
    const result =
      await this.workflowInstanceRepository.findInterruptedInstances();
    if (!result.success) {
      return {
        success: false,
        error: this.getRepositoryErrorMessage(result.error),
        errorDetails: result.error
      };
    }
    return {
      success: true,
      data: result.data!.map((item) => this.mapToBusinessModel(item))
    };
  }

  /**
   * 获取工作流实例的节点实例（包含子节点层次结构）
   * 用于流程图展示，如果节点有子节点，会在节点中包含完整的子节点信息
   *
   * @param workflowInstanceId 工作流实例ID
   * @param nodeId 可选，指定节点ID。如果提供，则只返回该节点及其子节点；如果不提供，返回所有顶级节点
   */
  async getNodeInstances(
    workflowInstanceId: number,
    nodeId?: string
  ): Promise<ServiceResult<NodeInstanceWithChildren[]>> {
    try {
      this.logger.info('Getting node instances with children for workflow', {
        workflowInstanceId,
        nodeId
      });

      let nodeInstancesWithChildren: NodeInstanceWithChildren[];

      if (nodeId) {
        // SQL层面优化：只查询特定节点及其子节点
        // 第一步：通过SQL查询获取特定节点
        const targetNodeResult =
          await this.nodeInstanceRepository.findSpecificNodeByWorkflowAndNodeId(
            workflowInstanceId,
            nodeId
          );

        if (!targetNodeResult.success) {
          this.logger.error('Failed to find specific node', {
            workflowInstanceId,
            nodeId,
            error: targetNodeResult.error
          });
          return {
            success: false,
            error: 'Failed to find specific node',
            errorDetails: targetNodeResult.error
          };
        }

        if (!targetNodeResult.data) {
          this.logger.warn('Specified node not found', {
            workflowInstanceId,
            nodeId
          });
          return {
            success: false,
            error: `Node with ID '${nodeId}' not found in workflow instance ${workflowInstanceId}`
          };
        }

        const targetNode = this.mapNodeToBusinessModel(targetNodeResult.data);

        // 第二步：通过SQL查询获取该节点的所有子节点
        const childrenResult =
          await this.nodeInstanceRepository.findAllChildNodesByParentInstanceId(
            targetNode.id
          );

        if (!childrenResult.success) {
          this.logger.error('Failed to find child nodes', {
            workflowInstanceId,
            nodeId,
            parentNodeId: targetNode.id,
            error: childrenResult.error
          });
          return {
            success: false,
            error: 'Failed to find child nodes',
            errorDetails: childrenResult.error
          };
        }

        // 转换子节点为业务模型
        const childNodes = childrenResult.data.map((item) =>
          this.mapNodeToBusinessModel(item)
        );

        // 构建层次结构（使用SQL查询结果）
        const nodeWithChildren = await this.buildNodeWithChildrenFromSqlResult(
          targetNode,
          childNodes
        );

        nodeInstancesWithChildren = [nodeWithChildren];
      } else {
        // 如果没有指定nodeId，返回所有顶级节点（使用原有逻辑）
        // 查询工作流实例的所有节点实例
        const result =
          await this.nodeInstanceRepository.findByWorkflowInstanceId(
            workflowInstanceId
          );

        if (!result.success) {
          this.logger.error('Failed to get all node instances', {
            workflowInstanceId,
            error: result.error
          });
          return {
            success: false,
            error: 'Failed to get all node instances',
            errorDetails: result.error
          };
        }

        // 转换为业务模型
        const allNodeInstances = result.data.map((item) =>
          this.mapNodeToBusinessModel(item)
        );

        // 返回所有顶级节点
        const topLevelNodes = allNodeInstances.filter(
          (node) => !node.parentNodeId
        );
        nodeInstancesWithChildren = [];

        for (const topLevelNode of topLevelNodes) {
          const nodeWithChildren = await this.buildNodeWithChildren(
            topLevelNode,
            allNodeInstances
          );
          nodeInstancesWithChildren.push(nodeWithChildren);
        }
      }

      this.logger.info('Retrieved node instances with children', {
        workflowInstanceId,
        nodeId,
        returnedNodes: nodeInstancesWithChildren.length,
        queryType: nodeId ? 'specific-node' : 'all-top-level-nodes'
      });

      return {
        success: true,
        data: nodeInstancesWithChildren
      };
    } catch (error) {
      this.logger.error('Error getting node instances with children', {
        workflowInstanceId,
        nodeId,
        error
      });
      return {
        success: false,
        error: 'Internal error getting node instances',
        errorDetails: error
      };
    }
  }

  /**
   * 构建包含子节点的节点实例
   * 递归构建节点的层次结构
   */
  private async buildNodeWithChildren(
    node: NodeInstance,
    allNodes: NodeInstance[]
  ): Promise<NodeInstanceWithChildren> {
    // 查找当前节点的所有子节点
    const childNodes = allNodes.filter((n) => n.parentNodeId === node.id);

    const nodeWithChildren: NodeInstanceWithChildren = {
      ...node
    };

    if (childNodes.length > 0) {
      // 递归构建子节点
      const children: NodeInstanceWithChildren[] = [];
      for (const childNode of childNodes) {
        const childWithChildren = await this.buildNodeWithChildren(
          childNode,
          allNodes
        );
        children.push(childWithChildren);
      }

      // 按 childIndex 排序
      children.sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0));

      nodeWithChildren.children = children;

      // 计算子节点统计信息
      nodeWithChildren.childrenStats = {
        total: children.length,
        completed: children.filter((c) => c.status === 'completed').length,
        running: children.filter((c) => c.status === 'running').length,
        failed: children.filter((c) => c.status === 'failed').length,
        pending: children.filter((c) => c.status === 'pending').length
      };
    }

    return nodeWithChildren;
  }

  /**
   * 基于SQL查询结果构建包含子节点的节点实例
   * 用于处理已经通过SQL查询获取的子节点数据
   */
  private async buildNodeWithChildrenFromSqlResult(
    node: NodeInstance,
    allChildNodes: NodeInstance[]
  ): Promise<NodeInstanceWithChildren> {
    const nodeWithChildren: NodeInstanceWithChildren = {
      ...node
    };

    // 查找当前节点的直接子节点
    const directChildren = allChildNodes.filter(
      (n) => n.parentNodeId === node.id
    );

    if (directChildren.length > 0) {
      // 递归构建子节点
      const children: NodeInstanceWithChildren[] = [];
      for (const childNode of directChildren) {
        const childWithChildren = await this.buildNodeWithChildrenFromSqlResult(
          childNode,
          allChildNodes
        );
        children.push(childWithChildren);
      }

      // 按 childIndex 排序
      children.sort((a, b) => (a.childIndex || 0) - (b.childIndex || 0));

      nodeWithChildren.children = children;

      // 计算子节点统计信息
      nodeWithChildren.childrenStats = {
        total: children.length,
        completed: children.filter((c) => c.status === 'completed').length,
        running: children.filter((c) => c.status === 'running').length,
        failed: children.filter((c) => c.status === 'failed').length,
        pending: children.filter((c) => c.status === 'pending').length
      };
    }

    return nodeWithChildren;
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

  /**
   * 构建增强的模板变量对象（优化版：只获取直接依赖的节点）
   *
   * @param workflowInstance 工作流实例
   * @param currentNode 当前节点
   * @param nextNodeDef 下一个节点定义
   * @returns 增强的模板变量对象
   */
  private async buildEnhancedTemplateVariables(
    workflowInstance: WorkflowInstance,
    currentNode: NodeInstance,
    nextNodeDef: any
  ): Promise<Record<string, any>> {
    try {
      const previousNodeOutput = {
        ...currentNode.outputData,
        status: currentNode.status,
        completedAt: currentNode.completedAt,
        durationMs: currentNode.durationMs
      };

      const { inputData = {}, contextData = {} } = workflowInstance;
      // 1. 基础变量：工作流实例级别的数据
      const baseVariables: Record<string, any> = {
        ...inputData,
        ...contextData,
        ...nextNodeDef.inputData,
        ...previousNodeOutput
      };

      // // 3. 获取下一个节点的直接依赖节点输出（性能优化）
      // const dependencyResult = await this.getDependencyNodesOutput(
      //   workflowInstance.id,
      //   nextNodeDef,
      //   currentNode.nodeId
      // );

      // if (dependencyResult.success && dependencyResult.data) {
      //   const { dependencyNodes } = dependencyResult.data;

      //   // 添加依赖节点的输出数据
      //   for (const [nodeId, nodeData] of Object.entries(dependencyNodes)) {
      //     baseVariables.nodes[nodeId] = nodeData;

      //     // 扁平化节点输出以支持简单访问
      //     const nodePrefix = `nodes.${nodeId}`;
      //     this.flattenObject(
      //       nodeData.output,
      //       baseVariables,
      //       `${nodePrefix}.output`
      //     );
      //   }
      // }

      this.logger.debug('Enhanced template variables built (optimized)', {
        workflowInstanceId: workflowInstance.id,
        currentNodeId: currentNode.nodeId,
        nextNodeId: nextNodeDef.nodeId || nextNodeDef.id,
        variableKeys: Object.keys(baseVariables),
        optimized: true
      });

      return baseVariables;
    } catch (error) {
      this.logger.error('Failed to build enhanced template variables', {
        error,
        workflowInstanceId: workflowInstance.id,
        currentNodeId: currentNode.nodeId,
        nextNodeId: nextNodeDef.nodeId || nextNodeDef.id
      });

      // 回退到基础变量
      return {
        input: workflowInstance.inputData || {},
        context: workflowInstance.contextData || {},
        nodeInput: nextNodeDef.inputData || {},
        nodes: {},
        ...nextNodeDef.inputData,
        ...(currentNode.outputData && {
          previousNodeOutput: currentNode.outputData
        })
      };
    }
  }

  private findNextNodeDefinition(workflowDef: any, currentNodeId: string): any {
    const nodes = workflowDef.nodes || [];
    const edges = workflowDef.edges || [];

    this.logger.debug('Finding next node definition', {
      currentNodeId,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeIds: nodes.map((n: any) => n.id),
      edgeConnections: edges.map((e: any) => `${e.source} -> ${e.target}`)
    });

    // 处理起始节点的情况
    if (currentNodeId === '__start__' || currentNodeId === 'start') {
      this.logger.debug('Processing start node', { currentNodeId });

      // 查找起始节点
      const startNode = nodes.find(
        (node: any) => node.type === 'start' || node.id === 'start'
      );

      if (startNode) {
        this.logger.debug('Found start node', { startNodeId: startNode.id });

        // 从起始节点找到第一个连接的节点
        const firstEdge = edges.find(
          (edge: any) => edge.source === startNode.id
        );
        if (firstEdge) {
          const nextNode = nodes.find(
            (node: any) => node.id === firstEdge.target
          );
          this.logger.debug('Found next node via edge', {
            edgeId: firstEdge.id,
            nextNodeId: nextNode?.id
          });
          return nextNode;
        }
      }

      // 如果没有明确的起始节点或连接，返回第一个非起始/结束节点
      const firstExecutableNode =
        nodes.find(
          (node: any) => node.type !== 'start' && node.type !== 'end'
        ) || nodes[0];

      this.logger.debug('Using first executable node', {
        nodeId: firstExecutableNode?.id,
        nodeType: firstExecutableNode?.type
      });
      return firstExecutableNode;
    }

    // 处理普通节点的情况 - 通过edges查找下一个节点
    const outgoingEdge = edges.find(
      (edge: any) => edge.source === currentNodeId
    );
    if (outgoingEdge) {
      const nextNode = nodes.find(
        (node: any) => node.id === outgoingEdge.target
      );
      this.logger.debug('Found next node via edge', {
        currentNodeId,
        edgeId: outgoingEdge.id,
        nextNodeId: nextNode?.id
      });
      return nextNode;
    }

    // 如果没有edges定义，回退到简单的顺序查找（向后兼容）
    const currentIndex = nodes.findIndex(
      (node: any) => node.id === currentNodeId
    );
    const nextNode =
      currentIndex >= 0 && currentIndex < nodes.length - 1
        ? nodes[currentIndex + 1]
        : null;

    this.logger.debug('Using sequential fallback', {
      currentNodeId,
      currentIndex,
      nextNodeId: nextNode?.id
    });

    return nextNode;
  }

  private mapNodeType(
    type: string
  ): 'simple' | 'task' | 'loop' | 'parallel' | 'subprocess' {
    switch (type) {
      case 'task':
        return 'task';
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
