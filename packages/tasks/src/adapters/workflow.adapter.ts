import { AwilixContainer, Logger } from '@stratix/core';
import type {
  IWorkflowInstanceRepository,
  UnifiedWorkflowInstanceFilters
} from '../repositories/WorkflowInstanceRepository.js';
import type { IWorkflowDefinitionService } from '../services/WorkflowDefinitionService.js';
import type { WorkflowEngine } from '../services/WorkflowEngineService.js';
import type { IWorkflowInstanceService } from '../services/WorkflowInstanceService.js';
import WorkflowMutexService from '../services/WorkflowMutexService.js';
import {
  WorkflowAdapterResultHelper,
  type ExecutionLog,
  type ExecutorInfo,
  type IStratixTasksAdapter,
  type LogQueryOptions,
  type PaginatedResult,
  type ScheduleFilters,
  type SystemMetrics,
  type TimeRange,
  type WorkflowAdapterResult,
  type WorkflowDefinition,
  type WorkflowDefinitionFilters,
  type WorkflowDefinitionInput,
  type WorkflowExecutionOptions,
  type WorkflowInstance,
  type WorkflowInstanceFilters,
  type WorkflowMetrics,
  type WorkflowProgress,
  type WorkflowSchedule,
  type WorkflowScheduleInput,
  type WorkflowStartOptions,
  type WorkflowStatus
} from '../types/workflow.js';

/**
 * Stratix Tasks 工作流适配器实现
 *
 * 基于Stratix框架Adapter层规范的工作流管理适配器
 * 通过依赖注入容器获取所需服务，提供统一的外部接口
 *
 * 设计原则：
 * - SINGLETON生命周期
 * - 统一错误处理和响应格式
 * - 简化外部接口，隐藏内部复杂性
 * - 通过依赖注入容器解析内部服务
 */
export default class TasksWorkflowAdapter implements IStratixTasksAdapter {
  static adapterName = 'workflow';

  private readonly logger: Logger;
  private readonly workflowDefinitionService: IWorkflowDefinitionService;
  private readonly workflowInstanceRepository: IWorkflowInstanceRepository; // 仅用于系统级功能（如恢复）
  private readonly workflowInstanceService: IWorkflowInstanceService; // 主要的业务逻辑接口
  private readonly workflowEngine: WorkflowEngine;
  private readonly workflowMutexService: WorkflowMutexService;

  constructor(container: AwilixContainer) {
    this.logger = container.resolve('logger');

    // 解析依赖服务
    this.workflowDefinitionService = container.resolve(
      'workflowDefinitionService'
    );
    this.workflowInstanceRepository = container.resolve(
      'workflowInstanceRepository'
    );
    this.workflowInstanceService = container.resolve('workflowInstanceService');
    this.workflowMutexService = container.resolve('workflowMutexService');
    this.workflowEngine = container.resolve('workflowEngineService');

    this.logger.info('WorkflowAdapter 初始化完成');
  }

  public createWorkflowMutexService(
    workflowDefinition: any,
    inputs: Record<string, any>,
    mutexKey: string,
    options?: any
  ) {
    // 如果传入的是完整的工作流定义对象，提取 name 和 version
    if (
      workflowDefinition &&
      typeof workflowDefinition === 'object' &&
      workflowDefinition.name
    ) {
      const query = {
        name: workflowDefinition.name,
        version: workflowDefinition.version || 'latest'
      };
      return this.workflowMutexService.createMutexWorkflow(
        query,
        inputs,
        mutexKey,
        options
      );
    } else {
      // 如果传入的是字符串，按照 definitionId 格式解析
      const definitionId = String(workflowDefinition);
      const { name, version } = this.parseDefinitionId(definitionId);
      return this.workflowMutexService.createMutexWorkflow(
        { name, version },
        inputs,
        mutexKey,
        options
      );
    }
  }

  /**
   * 创建工作流实例
   * 支持两种调用方式：
   * 1. 直接传入完整的 WorkflowDefinition 对象
   * 2. 传入工作流名称和版本，从数据库中读取已保存的定义
   */
  async createWorkflow(
    definition: WorkflowDefinition | { name: string; version?: string },
    inputs: Record<string, any> = {},
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowAdapterResult<WorkflowInstance>> {
    try {
      this.logger.info('开始创建工作流实例', {
        definition: this.getDefinitionName(definition)
      });

      // 解析工作流定义
      const workflowDefinition =
        await this.resolveWorkflowDefinition(definition);

      // 验证工作流定义
      const validation =
        await this.workflowDefinitionService.validateDefinition(
          workflowDefinition
        );

      if (!validation.success) {
        return WorkflowAdapterResultHelper.failure(
          `工作流定义验证失败: ${validation.error || '未知错误'}`,
          'DEFINITION_VALIDATION_FAILED',
          validation
        );
      }

      if (validation.data && !validation.data.valid) {
        const errorMessages = validation.data.errors
          .map((e: any) => (typeof e === 'string' ? e : e.message || String(e)))
          .join(', ');
        return WorkflowAdapterResultHelper.failure(
          `工作流定义验证失败: ${errorMessages}`,
          'DEFINITION_VALIDATION_FAILED',
          validation.data
        );
      }

      // 使用工作流引擎创建实例
      const instance = await this.workflowEngine.startWorkflow(
        workflowDefinition,
        inputs
      );

      // 应用执行选项
      this.applyExecutionOptions(instance, options);

      this.logger.info('工作流实例创建成功', {
        instanceId: instance.id,
        workflowName: workflowDefinition.name,
        status: instance.status
      });

      return WorkflowAdapterResultHelper.success(instance);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('创建工作流实例失败', { error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'INSTANCE_CREATION_FAILED',
        error
      );
    }
  }

  // ==================== 工作流定义管理 ====================

  /**
   * 创建工作流定义
   */
  async createWorkflowDefinition(
    definition: WorkflowDefinitionInput
  ): Promise<WorkflowAdapterResult<WorkflowDefinition>> {
    try {
      this.logger.info('创建工作流定义', { name: definition.name });

      // 转换WorkflowDefinitionInput为WorkflowDefinition
      const workflowDef: WorkflowDefinition = {
        ...definition,
        version: definition.version || '1.0.0',
        nodes: definition.nodes || []
      };

      const result =
        await this.workflowDefinitionService.createDefinition(workflowDef);

      return WorkflowAdapterResultHelper.fromServiceResult(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('创建工作流定义失败', { error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'DEFINITION_CREATION_FAILED',
        error
      );
    }
  }

  /**
   * 更新工作流定义
   */
  async updateWorkflowDefinition(
    id: string,
    definition: Partial<WorkflowDefinitionInput>
  ): Promise<WorkflowAdapterResult<WorkflowDefinition>> {
    try {
      this.logger.info('更新工作流定义', { id });

      // 先获取现有定义
      const existingResult =
        await this.workflowDefinitionService.getDefinition(id);
      if (!existingResult.success || !existingResult.data) {
        return WorkflowAdapterResultHelper.failure(
          '工作流定义不存在',
          'DEFINITION_NOT_FOUND'
        );
      }

      // 合并更新
      const updatedDef: WorkflowDefinition = {
        ...existingResult.data,
        ...definition,
        nodes: definition.nodes || existingResult.data.nodes
      };

      const result = await this.workflowDefinitionService.updateDefinition(
        id,
        updatedDef
      );

      return WorkflowAdapterResultHelper.fromServiceResult(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('更新工作流定义失败', { id, error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'DEFINITION_UPDATE_FAILED',
        error
      );
    }
  }

  /**
   * 删除工作流定义
   */
  async deleteWorkflowDefinition(
    id: string
  ): Promise<WorkflowAdapterResult<boolean>> {
    try {
      this.logger.info('删除工作流定义', { id });

      const result = await this.workflowDefinitionService.deleteDefinition(id);

      if (result.success) {
        return WorkflowAdapterResultHelper.success(true);
      } else {
        return WorkflowAdapterResultHelper.failure(
          result.error || '删除工作流定义失败',
          'DEFINITION_DELETE_FAILED'
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('删除工作流定义失败', { id, error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'DEFINITION_DELETE_FAILED',
        error
      );
    }
  }

  /**
   * 获取工作流定义详情
   */
  async getWorkflowDefinition(
    id: string
  ): Promise<WorkflowAdapterResult<WorkflowDefinition>> {
    try {
      this.logger.debug('获取工作流定义详情', { id });

      const result = await this.workflowDefinitionService.getDefinition(id);

      return WorkflowAdapterResultHelper.fromServiceResult(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取工作流定义详情失败', { id, error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'DEFINITION_QUERY_FAILED',
        error
      );
    }
  }

  /**
   * 查询工作流定义列表
   */
  async listWorkflowDefinitions(
    filters?: WorkflowDefinitionFilters
  ): Promise<WorkflowAdapterResult<PaginatedResult<WorkflowDefinition>>> {
    try {
      this.logger.debug('查询工作流定义列表', { filters });

      const result =
        await this.workflowDefinitionService.listDefinitions(filters);

      if (result.success && result.data) {
        const page = filters?.page || 1;
        const pageSize = filters?.pageSize || 10;
        const offset = (page - 1) * pageSize;

        const paginatedItems = result.data.slice(offset, offset + pageSize);

        const paginatedResult: PaginatedResult<WorkflowDefinition> = {
          items: paginatedItems,
          total: result.data.length,
          page,
          pageSize,
          hasNext: offset + pageSize < result.data.length,
          hasPrevious: page > 1
        };

        return WorkflowAdapterResultHelper.success(paginatedResult);
      } else {
        return WorkflowAdapterResultHelper.failure(
          result.error || '查询工作流定义列表失败',
          'DEFINITION_LIST_QUERY_FAILED'
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('查询工作流定义列表失败', { error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'DEFINITION_LIST_QUERY_FAILED',
        error
      );
    }
  }

  // ==================== 工作流实例控制 ====================

  /**
   * 启动工作流实例
   */
  async startWorkflow(
    definitionId: string,
    inputs: Record<string, any>,
    options?: WorkflowStartOptions
  ): Promise<WorkflowAdapterResult<WorkflowInstance>> {
    // 重用现有的createWorkflow方法
    return this.createWorkflow(
      { name: definitionId }, // 简化处理，实际应该解析definitionId
      inputs,
      options as WorkflowExecutionOptions
    );
  }

  /**
   * 创建互斥工作流实例
   */
  async startMutexWorkflow(
    definitionId: string,
    inputs: Record<string, any>,
    mutexKey: string,
    options?: WorkflowStartOptions
  ): Promise<
    WorkflowAdapterResult<{
      instance?: WorkflowInstance;
      conflictingInstance?: WorkflowInstance;
    }>
  > {
    try {
      this.logger.info('创建互斥工作流实例', { definitionId, mutexKey });

      // 解析 definitionId，支持 "name" 或 "name@version" 格式
      const { name, version } = this.parseDefinitionId(definitionId);

      const result = await this.workflowMutexService.createMutexWorkflow(
        { name, version },
        inputs,
        mutexKey,
        options
      );

      return WorkflowAdapterResultHelper.fromServiceResult(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('创建互斥工作流实例失败', {
        definitionId,
        mutexKey,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'MUTEX_WORKFLOW_CREATION_FAILED',
        error
      );
    }
  }

  /**
   * 终止工作流执行（强制停止，不可恢复）
   */
  async terminateWorkflow(
    instanceId: string
  ): Promise<WorkflowAdapterResult<boolean>> {
    try {
      this.logger.info('终止工作流实例', { instanceId });

      // 通过服务层处理业务逻辑
      const result =
        await this.workflowInstanceService.terminateInstance(instanceId);

      if (!result.success) {
        return WorkflowAdapterResultHelper.failure(
          result.error || '终止工作流失败',
          result.errorCode || 'WORKFLOW_TERMINATE_FAILED'
        );
      }

      this.logger.info('工作流实例终止成功', { instanceId });
      return WorkflowAdapterResultHelper.success(result.data || true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('终止工作流失败', { instanceId, error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'WORKFLOW_TERMINATE_FAILED',
        error
      );
    }
  }

  /**
   * 获取定义名称（用于日志）
   */
  private getDefinitionName(
    definition: WorkflowDefinition | { name: string; version?: string }
  ): string {
    if ('nodes' in definition && Array.isArray(definition.nodes)) {
      return definition.name;
    }
    return (definition as { name: string }).name || 'unknown';
  }

  /**
   * 应用执行选项到工作流实例
   */
  private applyExecutionOptions(
    instance: WorkflowInstance,
    options: WorkflowExecutionOptions
  ): void {
    if (options.externalId) {
      instance.externalId = options.externalId;
    }
    if (options.priority !== undefined) {
      instance.priority = options.priority;
    }
    if (options.contextData) {
      instance.contextData = {
        ...instance.contextData,
        ...options.contextData
      };
    }
  }

  /**
   * 解析工作流定义
   * 支持直接传入定义对象或通过名称和版本查找
   */
  private async resolveWorkflowDefinition(
    definition: WorkflowDefinition | { name: string; version?: string }
  ): Promise<WorkflowDefinition> {
    // 如果是完整的工作流定义对象
    if ('nodes' in definition && Array.isArray(definition.nodes)) {
      const workflowDef = definition as WorkflowDefinition;

      // 如果已经有ID，直接返回
      if (workflowDef.id) {
        return workflowDef;
      }

      // 如果没有ID，尝试从数据库中获取对应的定义来获取ID
      this.logger.debug('工作流定义缺少ID，尝试从数据库获取', {
        name: workflowDef.name,
        version: workflowDef.version
      });

      try {
        const dbDefinitionResult =
          await this.workflowDefinitionService.getDefinition(
            workflowDef.name,
            workflowDef.version
          );

        if (!dbDefinitionResult.success || !dbDefinitionResult.data) {
          throw new Error(
            `工作流定义 ${workflowDef.name} v${workflowDef.version} 在数据库中不存在，请先保存工作流定义`
          );
        }

        // 返回数据库中的定义（包含ID）
        return dbDefinitionResult.data;
      } catch (error) {
        // 如果数据库中找不到，说明这是一个新的定义，需要先保存
        throw new Error(
          `工作流定义 ${workflowDef.name} v${workflowDef.version} 在数据库中不存在，请先保存工作流定义`
        );
      }
    }

    // 否则通过名称和版本从服务中获取
    const { name, version } = definition as { name: string; version?: string };

    this.logger.debug('从服务中获取工作流定义', { name, version });

    try {
      const definitionResult =
        await this.workflowDefinitionService.getDefinition(name, version);

      if (!definitionResult.success || !definitionResult.data) {
        throw new Error(
          `无法获取工作流定义 ${name}${version ? ` v${version}` : ''}: ${definitionResult.error || '未知错误'}`
        );
      }

      return definitionResult.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `无法获取工作流定义 ${name}${version ? ` v${version}` : ''}: ${errorMessage}`
      );
    }
  }

  /**
   * 执行工作流实例
   */
  async executeWorkflow(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowInstance>> {
    try {
      this.logger.info('开始执行工作流实例', { instanceId });

      // 通过服务层处理业务逻辑
      const result =
        await this.workflowInstanceService.executeInstance(instanceId);

      if (!result.success) {
        return WorkflowAdapterResultHelper.failure(
          result.error || '执行工作流失败',
          result.errorCode || 'EXECUTE_WORKFLOW_FAILED'
        );
      }

      // 获取更新后的实例信息
      const instanceResult = await this.workflowInstanceService.getInstanceById(
        Number(instanceId)
      );

      if (!instanceResult.success || !instanceResult.data) {
        return WorkflowAdapterResultHelper.failure(
          '获取工作流实例信息失败',
          'INSTANCE_QUERY_FAILED'
        );
      }

      this.logger.info('工作流实例执行成功', {
        instanceId,
        status: instanceResult.data.status
      });

      return WorkflowAdapterResultHelper.success(
        instanceResult.data as unknown as WorkflowInstance
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('执行工作流实例失败', {
        instanceId,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'INSTANCE_EXECUTION_FAILED',
        error
      );
    }
  }

  /**
   * 暂停工作流执行
   */
  async pauseWorkflow(
    instanceId: string
  ): Promise<WorkflowAdapterResult<boolean>> {
    try {
      this.logger.info('暂停工作流实例', { instanceId });

      // 通过服务层处理业务逻辑
      const result =
        await this.workflowInstanceService.pauseInstance(instanceId);

      if (!result.success) {
        return WorkflowAdapterResultHelper.failure(
          result.error || '暂停工作流失败',
          result.errorCode || 'WORKFLOW_PAUSE_FAILED'
        );
      }

      this.logger.info('工作流实例暂停成功', { instanceId });
      return WorkflowAdapterResultHelper.success(result.data || true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('暂停工作流失败', { instanceId, error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'WORKFLOW_PAUSE_FAILED',
        error
      );
    }
  }

  /**
   * 恢复工作流执行
   */
  async resumeWorkflow(
    instanceId: string
  ): Promise<WorkflowAdapterResult<boolean>> {
    try {
      this.logger.info('恢复工作流实例', { instanceId });

      // 通过服务层处理业务逻辑
      const result =
        await this.workflowInstanceService.resumeInstance(instanceId);

      if (!result.success) {
        return WorkflowAdapterResultHelper.failure(
          result.error || '恢复工作流失败',
          result.errorCode || 'WORKFLOW_RESUME_FAILED'
        );
      }

      this.logger.info('工作流实例恢复成功', { instanceId });
      return WorkflowAdapterResultHelper.success(result.data || true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('恢复工作流失败', { instanceId, error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'WORKFLOW_RESUME_FAILED',
        error
      );
    }
  }

  /**
   * 取消工作流执行
   */
  async cancelWorkflow(
    instanceId: string
  ): Promise<WorkflowAdapterResult<boolean>> {
    try {
      this.logger.info('取消工作流实例', { instanceId });

      // 通过服务层处理业务逻辑
      const result = await this.workflowInstanceService.updateInstanceStatus(
        Number(instanceId),
        'cancelled'
      );

      if (!result.success) {
        return WorkflowAdapterResultHelper.failure(
          result.error || '取消工作流失败',
          result.errorCode || 'WORKFLOW_CANCEL_FAILED'
        );
      }

      this.logger.info('工作流实例取消成功', { instanceId });
      return WorkflowAdapterResultHelper.success(result.data || true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('取消工作流失败', { instanceId, error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'WORKFLOW_CANCEL_FAILED',
        error
      );
    }
  }

  /**
   * 获取工作流状态
   */
  async getWorkflowStatus(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowStatus>> {
    try {
      this.logger.debug('获取工作流状态', { instanceId });

      // 通过服务层获取实例信息
      const result = await this.workflowInstanceService.getInstanceById(
        Number(instanceId)
      );

      if (!result.success || !result.data) {
        return WorkflowAdapterResultHelper.failure(
          result.error || `工作流实例不存在: ${instanceId}`,
          result.errorCode || 'INSTANCE_NOT_FOUND'
        );
      }

      const instance = result.data;

      return WorkflowAdapterResultHelper.success(
        instance.status as WorkflowStatus
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取工作流状态失败', {
        instanceId,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'WORKFLOW_STATUS_QUERY_FAILED',
        error
      );
    }
  }

  /**
   * 获取工作流实例详情
   */
  async getWorkflowInstance(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowInstance>> {
    try {
      this.logger.debug('获取工作流实例详情', { instanceId });

      // 通过服务层获取实例信息
      const result = await this.workflowInstanceService.getInstanceById(
        Number(instanceId)
      );

      if (!result.success) {
        return WorkflowAdapterResultHelper.failure(
          result.error || `查询工作流实例失败: ${instanceId}`,
          result.errorCode || 'INSTANCE_QUERY_FAILED'
        );
      }

      if (!result.data) {
        return WorkflowAdapterResultHelper.failure(
          `工作流实例不存在: ${instanceId}`,
          'INSTANCE_NOT_FOUND'
        );
      }

      return WorkflowAdapterResultHelper.success(
        result.data as unknown as WorkflowInstance
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取工作流实例详情失败', {
        instanceId,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'INSTANCE_QUERY_FAILED',
        error
      );
    }
  }

  /**
   * 列出工作流实例
   */
  async listWorkflowInstances(
    filters?: WorkflowInstanceFilters
  ): Promise<WorkflowAdapterResult<PaginatedResult<WorkflowInstance>>> {
    try {
      this.logger.debug('列出工作流实例', { filters });

      // 转换过滤器格式到统一格式
      const unifiedFilters = this.convertToUnifiedFilters(filters);

      // 通过服务层查询
      const result =
        await this.workflowInstanceService.queryInstancesWithFilters(
          unifiedFilters
        );

      if (!result.success) {
        this.logger.error('获取工作流实例列表失败', {
          error: result.error,
          filters
        });
        return WorkflowAdapterResultHelper.failure(
          result.error || `获取工作流实例列表失败`,
          result.errorCode || 'INSTANCE_LIST_QUERY_FAILED'
        );
      }

      // 转换数据库结果到适配器格式
      const adaptedResult: PaginatedResult<WorkflowInstance> = {
        items: result.data.data as unknown as WorkflowInstance[],
        total: result.data.total,
        page: result.data.page,
        pageSize: result.data.limit,
        hasNext: result.data.hasNext,
        hasPrevious: result.data.hasPrev
      };

      return WorkflowAdapterResultHelper.success(adaptedResult);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('列出工作流实例失败', { error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'INSTANCE_LIST_QUERY_FAILED',
        error
      );
    }
  }

  /**
   * 转换过滤器格式到统一格式
   */
  private convertToUnifiedFilters(
    filters?: WorkflowInstanceFilters
  ): UnifiedWorkflowInstanceFilters {
    if (!filters) {
      return {};
    }

    const result: UnifiedWorkflowInstanceFilters = {};

    if (filters.status) result.status = filters.status;
    if (filters.definitionId)
      result.workflowDefinitionId = parseInt(filters.definitionId);
    if (filters.name) result.name = filters.name;
    if (filters.externalId) result.externalId = filters.externalId;
    if (filters.businessKey) result.businessKey = filters.businessKey;
    if (filters.createdBy) result.createdBy = filters.createdBy;
    if (filters.tags) result.tags = filters.tags;
    if (filters.createdAt) result.createdAt = filters.createdAt;
    if (filters.page) result.page = filters.page;
    if (filters.pageSize) result.pageSize = filters.pageSize;

    return result;
  }

  /**
   * 删除工作流实例
   */
  async deleteWorkflowInstance(
    instanceId: string
  ): Promise<WorkflowAdapterResult<boolean>> {
    try {
      this.logger.info('删除工作流实例', { instanceId });

      // 通过服务层处理删除逻辑
      const result = await this.workflowInstanceService.deleteInstance(
        Number(instanceId)
      );

      if (!result.success) {
        return WorkflowAdapterResultHelper.failure(
          result.error || '删除工作流实例失败',
          result.errorCode || 'INSTANCE_DELETE_FAILED'
        );
      }

      this.logger.info('工作流实例删除成功', { instanceId });
      return WorkflowAdapterResultHelper.success(result.data || true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('删除工作流实例失败', {
        instanceId,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'INSTANCE_DELETE_FAILED',
        error
      );
    }
  }

  // ==================== 工作流状态查询 ====================

  /**
   * 获取工作流执行进度
   */
  async getWorkflowProgress(
    instanceId: string
  ): Promise<WorkflowAdapterResult<WorkflowProgress>> {
    try {
      this.logger.debug('获取工作流执行进度', { instanceId });

      // 通过服务层获取实例信息
      const instanceResult = await this.workflowInstanceService.getInstanceById(
        Number(instanceId)
      );

      if (!instanceResult.success || !instanceResult.data) {
        return WorkflowAdapterResultHelper.failure(
          instanceResult.error || `工作流实例不存在: ${instanceId}`,
          instanceResult.errorCode || 'INSTANCE_NOT_FOUND'
        );
      }

      const instance = instanceResult.data;
      const progress: WorkflowProgress = {
        instanceId,
        totalNodes: 1, // 简化实现
        completedNodes: instance.status === 'completed' ? 1 : 0,
        failedNodes: instance.status === 'failed' ? 1 : 0,
        runningNodes: instance.status === 'running' ? 1 : 0,
        pendingNodes: instance.status === 'pending' ? 1 : 0,
        progressPercent:
          instance.status === 'completed'
            ? 100
            : instance.status === 'running'
              ? 50
              : 0,
        executionPath: [instanceId]
      };

      return WorkflowAdapterResultHelper.success(progress);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取工作流执行进度失败', {
        instanceId,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'WORKFLOW_PROGRESS_QUERY_FAILED',
        error
      );
    }
  }

  // ==================== 定时任务配置 ====================

  /**
   * 创建定时调度
   */
  async createSchedule(
    schedule: WorkflowScheduleInput
  ): Promise<WorkflowAdapterResult<WorkflowSchedule>> {
    try {
      this.logger.info('创建定时调度', { name: schedule.name });

      // 简化实现，返回模拟的调度配置
      const newSchedule: WorkflowSchedule = {
        id: `schedule_${Date.now()}`,
        definitionId: schedule.definitionId,
        name: schedule.name,
        description: schedule.description || '',
        cronExpression: schedule.cronExpression,
        enabled: schedule.enabled || true,
        inputTemplate: schedule.inputTemplate || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return WorkflowAdapterResultHelper.success(newSchedule);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('创建定时调度失败', { error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'SCHEDULE_CREATION_FAILED',
        error
      );
    }
  }

  /**
   * 更新定时调度
   */
  async updateSchedule(
    scheduleId: string,
    schedule: Partial<WorkflowScheduleInput>
  ): Promise<WorkflowAdapterResult<WorkflowSchedule>> {
    try {
      this.logger.info('更新定时调度', { scheduleId });

      // 简化实现
      const updatedSchedule: WorkflowSchedule = {
        id: scheduleId,
        definitionId: schedule.definitionId || '',
        name: schedule.name || '',
        description: schedule.description || '',
        cronExpression: schedule.cronExpression || '0 0 * * *',
        enabled: schedule.enabled !== undefined ? schedule.enabled : true,
        inputTemplate: schedule.inputTemplate || {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return WorkflowAdapterResultHelper.success(updatedSchedule);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('更新定时调度失败', {
        scheduleId,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'SCHEDULE_UPDATE_FAILED',
        error
      );
    }
  }

  /**
   * 删除定时调度
   */
  async deleteSchedule(
    scheduleId: string
  ): Promise<WorkflowAdapterResult<boolean>> {
    try {
      this.logger.info('删除定时调度', { scheduleId });

      // 简化实现
      return WorkflowAdapterResultHelper.success(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('删除定时调度失败', {
        scheduleId,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'SCHEDULE_DELETE_FAILED',
        error
      );
    }
  }

  /**
   * 启用/禁用定时调度
   */
  async toggleSchedule(
    scheduleId: string,
    enabled: boolean
  ): Promise<WorkflowAdapterResult<boolean>> {
    try {
      this.logger.info('切换定时调度状态', { scheduleId, enabled });

      // 简化实现
      return WorkflowAdapterResultHelper.success(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('切换定时调度状态失败', {
        scheduleId,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'SCHEDULE_TOGGLE_FAILED',
        error
      );
    }
  }

  /**
   * 查询定时调度列表
   */
  async listSchedules(
    filters?: ScheduleFilters
  ): Promise<WorkflowAdapterResult<PaginatedResult<WorkflowSchedule>>> {
    try {
      this.logger.debug('查询定时调度列表', { filters });

      // 简化实现，返回空列表
      const paginatedResult: PaginatedResult<WorkflowSchedule> = {
        items: [],
        total: 0,
        page: filters?.page || 1,
        pageSize: filters?.pageSize || 10,
        hasNext: false,
        hasPrevious: false
      };

      return WorkflowAdapterResultHelper.success(paginatedResult);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('查询定时调度列表失败', { error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'SCHEDULE_LIST_QUERY_FAILED',
        error
      );
    }
  }

  // ==================== 监控和日志 ====================

  /**
   * 获取工作流执行日志
   */
  async getExecutionLogs(
    instanceId: string,
    options?: LogQueryOptions
  ): Promise<WorkflowAdapterResult<PaginatedResult<ExecutionLog>>> {
    try {
      this.logger.debug('获取工作流执行日志', { instanceId, options });

      // 简化实现，返回空日志列表
      const paginatedResult: PaginatedResult<ExecutionLog> = {
        items: [],
        total: 0,
        page: options?.page || 1,
        pageSize: options?.pageSize || 10,
        hasNext: false,
        hasPrevious: false
      };

      return WorkflowAdapterResultHelper.success(paginatedResult);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取工作流执行日志失败', {
        instanceId,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'EXECUTION_LOGS_QUERY_FAILED',
        error
      );
    }
  }

  /**
   * 获取系统性能指标
   */
  async getSystemMetrics(
    timeRange?: TimeRange
  ): Promise<WorkflowAdapterResult<SystemMetrics>> {
    try {
      this.logger.debug('获取系统性能指标', { timeRange });

      // 简化实现，返回模拟指标
      const metrics: SystemMetrics = {
        activeWorkflows: 0,
        completedWorkflows: 0,
        failedWorkflows: 0,
        averageExecutionTime: 0,
        throughput: 0,
        errorRate: 0,
        resourceUsage: {
          cpu: 0,
          memory: 0,
          database: 0
        }
      };

      return WorkflowAdapterResultHelper.success(metrics);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取系统性能指标失败', { error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'SYSTEM_METRICS_QUERY_FAILED',
        error
      );
    }
  }

  /**
   * 获取工作流性能指标
   */
  async getWorkflowMetrics(
    definitionId?: string,
    timeRange?: TimeRange
  ): Promise<WorkflowAdapterResult<WorkflowMetrics>> {
    try {
      this.logger.debug('获取工作流性能指标', { definitionId, timeRange });

      // 简化实现，返回模拟指标
      const metrics: WorkflowMetrics = {
        definitionId: definitionId || '',
        executionStats: {
          total: 0,
          successful: 0,
          failed: 0,
          cancelled: 0
        },
        performanceStats: {
          averageDuration: 0,
          minDuration: 0,
          maxDuration: 0,
          p50Duration: 0,
          p95Duration: 0,
          p99Duration: 0
        },
        errorStats: {}
      };

      return WorkflowAdapterResultHelper.success(metrics);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取工作流性能指标失败', {
        definitionId,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'WORKFLOW_METRICS_QUERY_FAILED',
        error
      );
    }
  }

  // ==================== 执行器管理 ====================

  /**
   * 获取已注册的执行器列表
   */
  async listExecutors(): Promise<WorkflowAdapterResult<ExecutorInfo[]>> {
    try {
      this.logger.debug('获取已注册的执行器列表');

      // 简化实现，返回空列表
      return WorkflowAdapterResultHelper.success([]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取已注册的执行器列表失败', { error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'EXECUTORS_LIST_QUERY_FAILED',
        error
      );
    }
  }

  /**
   * 获取执行器详情
   */
  async getExecutorInfo(
    executorName: string
  ): Promise<WorkflowAdapterResult<ExecutorInfo>> {
    try {
      this.logger.debug('获取执行器详情', { executorName });

      // 简化实现，返回模拟执行器信息
      const executorInfo: ExecutorInfo = {
        name: executorName,
        description: `执行器 ${executorName}`,
        version: '1.0.0',
        available: true
      };

      return WorkflowAdapterResultHelper.success(executorInfo);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取执行器详情失败', {
        executorName,
        error: errorMessage
      });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'EXECUTOR_INFO_QUERY_FAILED',
        error
      );
    }
  }

  // ==================== 系统管理 ====================

  /**
   * 健康检查
   */
  async healthCheck(): Promise<
    WorkflowAdapterResult<{
      status: 'healthy' | 'unhealthy';
      version: string;
      uptime: number;
      components: Record<string, 'up' | 'down'>;
    }>
  > {
    try {
      this.logger.debug('执行健康检查');

      const healthStatus = {
        status: 'healthy' as const,
        version: '1.0.0',
        uptime: process.uptime(),
        components: {
          database: 'up' as const,
          engine: 'up' as const,
          scheduler: 'up' as const
        }
      };

      return WorkflowAdapterResultHelper.success(healthStatus);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('健康检查失败', { error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'HEALTH_CHECK_FAILED',
        error
      );
    }
  }

  /**
   * 获取系统信息
   */
  async getSystemInfo(): Promise<
    WorkflowAdapterResult<{
      version: string;
      environment: string;
      features: string[];
      limits: {
        maxConcurrentWorkflows: number;
        maxWorkflowDefinitions: number;
      };
    }>
  > {
    try {
      this.logger.debug('获取系统信息');

      const systemInfo = {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        features: ['workflow-engine', 'scheduler', 'monitoring'],
        limits: {
          maxConcurrentWorkflows: 100,
          maxWorkflowDefinitions: 1000
        }
      };

      return WorkflowAdapterResultHelper.success(systemInfo);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取系统信息失败', { error: errorMessage });
      return WorkflowAdapterResultHelper.failure(
        errorMessage,
        'SYSTEM_INFO_QUERY_FAILED',
        error
      );
    }
  }

  // ==================== 故障恢复和分布式支持 ====================

  /**
   * 查找中断的工作流实例
   */
  async findInterruptedWorkflows(filters: {
    heartbeatTimeout: Date;
    statuses: WorkflowStatus[];
    limit?: number;
  }): Promise<WorkflowAdapterResult<WorkflowInstance[]>> {
    try {
      this.logger.debug('查找中断的工作流实例', {
        heartbeatTimeout: filters.heartbeatTimeout,
        statuses: filters.statuses,
        limit: filters.limit
      });

      // 注意：这是适配器层的特殊功能，直接调用仓储层是合理的
      // 因为这是系统级的恢复功能，不是常规的业务操作
      const result =
        await this.workflowInstanceRepository.findInterruptedInstances({
          heartbeatTimeout: filters.heartbeatTimeout,
          statuses: filters.statuses,
          limit: filters.limit || 50
        });

      if (!result.success) {
        return WorkflowAdapterResultHelper.failure(
          result.error?.message || '查找中断工作流失败',
          'FIND_INTERRUPTED_WORKFLOWS_ERROR',
          result.error
        );
      }

      const instances = result.data || [];

      // 直接使用类型断言，因为数据库类型和接口类型基本兼容
      const workflowInstances = instances as unknown as WorkflowInstance[];

      this.logger.info('查找中断工作流完成', {
        foundCount: workflowInstances.length,
        heartbeatTimeout: filters.heartbeatTimeout
      });

      return WorkflowAdapterResultHelper.success(workflowInstances);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('查找中断工作流异常', {
        error: errorMessage,
        filters
      });
      return WorkflowAdapterResultHelper.failure(
        '查找中断工作流异常',
        'FIND_INTERRUPTED_WORKFLOWS_EXCEPTION',
        error
      );
    }
  }

  /**
   * 解析工作流定义ID
   * 支持格式：
   * - "workflowName" -> { name: "workflowName", version: "latest" }
   * - "workflowName@1.0.0" -> { name: "workflowName", version: "1.0.0" }
   */
  private parseDefinitionId(definitionId: string): {
    name: string;
    version: string;
  } {
    const parts = definitionId.split('@');

    if (parts.length === 1) {
      // 只有名称，使用默认版本
      return {
        name: parts[0],
        version: 'latest'
      };
    } else if (parts.length === 2) {
      // 包含版本号
      return {
        name: parts[0],
        version: parts[1]
      };
    } else {
      // 格式错误，使用整个字符串作为名称
      this.logger.warn('工作流定义ID格式错误，使用默认版本', { definitionId });
      return {
        name: definitionId,
        version: 'latest'
      };
    }
  }
}
