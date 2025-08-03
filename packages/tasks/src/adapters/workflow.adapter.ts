import { AwilixContainer, Logger } from '@stratix/core';
import { get } from '@stratix/utils/environment';
import type { IWorkflowInstanceRepository } from '../repositories/WorkflowInstanceRepository.js';
import type { IWorkflowDefinitionService } from '../services/WorkflowDefinitionService.js';
import type { WorkflowEngine } from '../services/WorkflowEngine.js';
import type {
  IWorkflowAdapter,
  WorkflowAdapterResult,
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowInstance,
  WorkflowStatus
} from '../types/workflow.js';

/**
 * 工作流适配器类型
 */
type AdapterType = 'memory' | 'database';

/**
 * 工作流适配器实现
 *
 * 通过依赖注入容器获取所需服务，支持 memory 和 database 两种存储后端
 */
export default class WorkflowAdapter implements IWorkflowAdapter {
  static adapterName = 'workflow';

  private readonly logger: Logger;
  private readonly adapterType: AdapterType;
  private readonly workflowDefinitionService: IWorkflowDefinitionService;
  private readonly workflowInstanceRepository: IWorkflowInstanceRepository;
  private readonly workflowEngine: WorkflowEngine;

  constructor(container: AwilixContainer) {
    this.logger = container.resolve('logger');

    // 通过环境变量确定适配器类型
    this.adapterType = this.determineAdapterType();

    // 解析依赖服务
    this.workflowDefinitionService = container.resolve(
      'workflowDefinitionService'
    );
    this.workflowInstanceRepository = container.resolve(
      'workflowInstanceRepository'
    );
    this.workflowEngine = container.resolve('workflowEngine');

    this.logger.info('WorkflowAdapter 初始化完成', {
      adapterType: this.adapterType
    });
  }

  /**
   * 确定适配器类型
   */
  private determineAdapterType(): AdapterType {
    const configuredType = get(
      'STRATIX_WORKFLOW_ADAPTER_TYPE',
      'memory'
    ) as AdapterType;

    if (!['memory', 'database'].includes(configuredType)) {
      this.logger.warn(
        `不支持的适配器类型: ${configuredType}，将使用 memory 类型`
      );
      return 'memory';
    }

    this.logger.debug(`使用工作流适配器类型: ${configuredType}`);
    return configuredType;
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
        definition: this.getDefinitionName(definition),
        adapterType: this.adapterType
      });

      // 解析工作流定义
      const workflowDefinition =
        await this.resolveWorkflowDefinition(definition);

      // 验证工作流定义
      const validation =
        await this.workflowDefinitionService.validateDefinition(
          workflowDefinition
        );
      if (!validation.valid) {
        return {
          success: false,
          error: `工作流定义验证失败: ${validation.errors.join(', ')}`,
          errorDetails: validation
        };
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

      return {
        success: true,
        data: instance
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('创建工作流实例失败', { error: errorMessage });
      return {
        success: false,
        error: errorMessage,
        errorDetails: error
      };
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
        const dbDefinition = await this.workflowDefinitionService.getDefinition(
          workflowDef.name,
          workflowDef.version
        );

        // 返回数据库中的定义（包含ID）
        return dbDefinition;
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
      return await this.workflowDefinitionService.getDefinition(name, version);
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

      // 直接通过ID查询工作流实例（优化后的查询）
      const instanceResult =
        await this.workflowInstanceRepository.findByIdNullable(
          Number(instanceId)
        );

      if (!instanceResult.success) {
        return {
          success: false,
          error: `查询工作流实例失败: ${instanceResult.error}`
        };
      }

      const instance = instanceResult.data;
      if (!instance) {
        return {
          success: false,
          error: `工作流实例不存在: ${instanceId}`
        };
      }

      // 检查实例状态
      if (instance.status === 'running') {
        return {
          success: false,
          error: '工作流实例已在运行中'
        };
      }

      if (instance.status === 'completed') {
        return {
          success: false,
          error: '工作流实例已完成，无法重新执行'
        };
      }

      // 更新实例状态为运行中
      const updateResult = await this.workflowInstanceRepository.updateStatus(
        instance.id,
        'running',
        {
          started_at: new Date()
        }
      );

      if (!updateResult.success || !updateResult.data) {
        return {
          success: false,
          error: '更新工作流状态失败'
        };
      }

      this.logger.info('工作流实例执行成功', {
        instanceId,
        status: updateResult.data.status
      });

      return {
        success: true,
        data: updateResult.data as unknown as WorkflowInstance
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('执行工作流实例失败', {
        instanceId,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage,
        errorDetails: error
      };
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

      const updateResult = await this.workflowInstanceRepository.updateStatus(
        Number(instanceId),
        'paused',
        {
          paused_at: new Date()
        }
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: '暂停工作流失败'
        };
      }

      this.logger.info('工作流实例暂停成功', { instanceId });
      return {
        success: true,
        data: true
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('暂停工作流失败', { instanceId, error: errorMessage });
      return {
        success: false,
        error: errorMessage,
        errorDetails: error
      };
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

      const updateResult = await this.workflowInstanceRepository.updateStatus(
        Number(instanceId),
        'running',
        {
          paused_at: null
        }
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: '恢复工作流失败'
        };
      }

      this.logger.info('工作流实例恢复成功', { instanceId });
      return {
        success: true,
        data: true
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('恢复工作流失败', { instanceId, error: errorMessage });
      return {
        success: false,
        error: errorMessage,
        errorDetails: error
      };
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

      const updateResult = await this.workflowInstanceRepository.updateStatus(
        Number(instanceId),
        'cancelled'
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: '取消工作流失败'
        };
      }

      this.logger.info('工作流实例取消成功', { instanceId });
      return {
        success: true,
        data: true
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('取消工作流失败', { instanceId, error: errorMessage });
      return {
        success: false,
        error: errorMessage,
        errorDetails: error
      };
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

      // 这里需要修复类型问题，暂时使用基础方法
      const result = await this.workflowInstanceRepository.findByStatus([
        'pending',
        'running',
        'paused',
        'completed',
        'failed',
        'cancelled'
      ]);

      if (!result.success) {
        return {
          success: false,
          error: '获取工作流状态失败'
        };
      }

      // 查找指定ID的实例
      const instance = result.data?.find(
        (inst) => inst.id === Number(instanceId)
      );
      if (!instance) {
        return {
          success: false,
          error: `工作流实例不存在: ${instanceId}`
        };
      }

      return {
        success: true,
        data: instance.status as WorkflowStatus
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取工作流状态失败', {
        instanceId,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage,
        errorDetails: error
      };
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

      // 直接通过ID查询单个实例（优化后的查询）
      const result = await this.workflowInstanceRepository.findByIdNullable(
        Number(instanceId)
      );

      if (!result.success) {
        return {
          success: false,
          error: `查询工作流实例失败: ${result.error}`
        };
      }

      if (!result.data) {
        return {
          success: false,
          error: `工作流实例不存在: ${instanceId}`
        };
      }

      const instance = result.data;

      return {
        success: true,
        data: instance as unknown as WorkflowInstance
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('获取工作流实例详情失败', {
        instanceId,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage,
        errorDetails: error
      };
    }
  }

  /**
   * 列出工作流实例
   */
  async listWorkflowInstances(filters?: {
    status?: WorkflowStatus;
    name?: string;
    createdBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<WorkflowAdapterResult<WorkflowInstance[]>> {
    try {
      this.logger.debug('列出工作流实例', { filters });

      let result;

      if (filters?.status) {
        result = await this.workflowInstanceRepository.findByStatus(
          filters.status
        );
      } else {
        // 获取所有状态的实例
        result = await this.workflowInstanceRepository.findByStatus([
          'pending',
          'running',
          'paused',
          'completed',
          'failed',
          'cancelled'
        ]);
      }

      if (!result.success) {
        return {
          success: false,
          error: '获取工作流实例列表失败'
        };
      }

      let instances = result.data || [];

      // 应用过滤条件
      if (filters?.name) {
        instances = instances.filter((inst) =>
          inst.name?.includes(filters.name!)
        );
      }

      if (filters?.createdBy) {
        instances = instances.filter(
          (inst) => inst.created_by === filters.createdBy
        );
      }

      // 应用分页
      if (filters?.offset) {
        instances = instances.slice(filters.offset);
      }

      if (filters?.limit) {
        instances = instances.slice(0, filters.limit);
      }

      return {
        success: true,
        data: instances as unknown as WorkflowInstance[]
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('列出工作流实例失败', { error: errorMessage });
      return {
        success: false,
        error: errorMessage,
        errorDetails: error
      };
    }
  }

  /**
   * 删除工作流实例
   */
  async deleteWorkflowInstance(
    instanceId: string
  ): Promise<WorkflowAdapterResult<boolean>> {
    try {
      this.logger.info('删除工作流实例', { instanceId });

      // 这里需要调用仓储的删除方法，但当前接口中没有定义
      // 暂时通过更新状态为已删除来模拟删除
      const updateResult = await this.workflowInstanceRepository.updateStatus(
        Number(instanceId),
        'cancelled' // 使用取消状态来表示删除
      );

      if (!updateResult.success) {
        return {
          success: false,
          error: '删除工作流实例失败'
        };
      }

      this.logger.info('工作流实例删除成功', { instanceId });
      return {
        success: true,
        data: true
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('删除工作流实例失败', {
        instanceId,
        error: errorMessage
      });
      return {
        success: false,
        error: errorMessage,
        errorDetails: error
      };
    }
  }
}
