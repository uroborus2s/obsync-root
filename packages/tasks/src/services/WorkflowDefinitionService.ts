/**
 * 工作流定义服务
 *
 * 负责工作流定义的管理、验证和存储
 */

import type { Logger } from '@stratix/core';
import type { IWorkflowDefinitionRepository } from '../repositories/WorkflowDefinitionRepository.js';
import type {
  NewWorkflowDefinitionTable,
  WorkflowDefinitionTable
} from '../types/database.js';
import type { WorkflowDefinition } from '../types/workflow.js';

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
 * 工作流统计信息
 */
export interface WorkflowStatistics {
  totalCount: number;
  activeCount: number;
  draftCount: number;
  deprecatedCount: number;
  archivedCount: number;
  categoryDistribution: Record<string, number>;
}

/**
 * 工作流定义服务接口
 */
export interface IWorkflowDefinitionService {
  /**
   * 创建工作流定义
   * @param definition 工作流定义
   * @returns 创建的工作流定义
   */
  createDefinition(
    definition: WorkflowDefinition
  ): Promise<ServiceResult<WorkflowDefinition>>;

  /**
   * 获取工作流定义
   * @param name 工作流名称
   * @param version 版本号（可选）
   * @returns 工作流定义
   */
  getDefinition(
    name: string,
    version?: string
  ): Promise<ServiceResult<WorkflowDefinition>>;

  /**
   * 更新工作流定义
   * @param name 工作流名称
   * @param definition 更新的工作流定义
   * @returns 更新后的工作流定义
   */
  updateDefinition(
    name: string,
    definition: WorkflowDefinition
  ): Promise<ServiceResult<WorkflowDefinition>>;

  /**
   * 删除工作流定义
   * @param name 工作流名称
   * @param version 版本号（可选）
   */
  deleteDefinition(
    name: string,
    version?: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 列出所有工作流定义
   * @param options 查询选项
   * @returns 工作流定义列表
   */
  listDefinitions(options?: {
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ServiceResult<WorkflowDefinition[]>>;

  /**
   * 验证工作流定义
   * @param definition 工作流定义
   * @returns 验证结果
   */
  validateDefinition(
    definition: WorkflowDefinition
  ): Promise<ServiceResult<ValidationResult>>;

  /**
   * 设置活跃版本
   * @param name 工作流名称
   * @param version 版本号
   * @returns 是否成功
   */
  setActiveVersion(
    name: string,
    version: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 获取工作流统计信息
   * @returns 统计信息
   */
  getStatistics(): Promise<ServiceResult<WorkflowStatistics>>;

  /**
   * 搜索工作流定义
   * @param keyword 关键词
   * @param options 查询选项
   * @returns 工作流定义列表
   */
  searchDefinitions(
    keyword: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ServiceResult<WorkflowDefinition[]>>;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 工作流定义服务实现
 */
export default class WorkflowDefinitionService
  implements IWorkflowDefinitionService
{
  constructor(
    private logger: Logger,
    private workflowDefinitionRepository: IWorkflowDefinitionRepository
  ) {}

  /**
   * 创建工作流定义
   */
  async createDefinition(
    definition: WorkflowDefinition
  ): Promise<ServiceResult<WorkflowDefinition>> {
    this.logger.info(`Creating workflow definition: ${definition.name}`);

    // 验证定义
    const validationResult = await this.validateDefinition(definition);
    if (!validationResult.success || !validationResult.data?.valid) {
      const errors = validationResult.data?.errors || [
        'Unknown validation error'
      ];
      throw new Error(`Invalid workflow definition: ${errors.join(', ')}`);
    }

    // 检查是否已存在
    const existingResult =
      await this.workflowDefinitionRepository.findByNameAndVersion(
        definition.name,
        definition.version
      );

    if (!existingResult.success) {
      throw new Error(
        `Failed to check existing definition: ${existingResult.error}`
      );
    }

    if (existingResult.data) {
      throw new Error(
        `Workflow definition already exists: ${definition.name} v${definition.version}`
      );
    }

    // 准备新定义数据
    const newDefinition: NewWorkflowDefinitionTable = {
      name: definition.name,
      display_name: definition.name, // 使用name作为display_name
      description: definition.description || null,
      version: definition.version,
      definition: definition as any, // JSON 字段
      status: 'draft',
      is_active: false,
      tags: definition.tags || [],
      category: definition.category || null,
      timeout_seconds: 3600, // 默认超时时间
      max_retries: 3, // 默认重试次数
      retry_delay_seconds: 60, // 默认重试延迟
      created_by: definition.createdBy || null
    };

    // 保存到数据库 - 使用基础仓储的 create 方法
    const createResult = await (
      this.workflowDefinitionRepository as any
    ).create(newDefinition);

    if (!createResult.success) {
      throw new Error(
        `Failed to create workflow definition: ${createResult.error}`
      );
    }

    this.logger.info(
      `Workflow definition created: ${definition.name} v${definition.version}`
    );

    return {
      success: true,
      data: this.mapDatabaseToWorkflowDefinition(createResult.data)
    };
  }

  /**
   * 获取工作流定义
   */
  async getDefinition(
    name: string,
    version?: string
  ): Promise<ServiceResult<WorkflowDefinition>> {
    this.logger.info(
      `Getting workflow definition: ${name}${version ? ` v${version}` : ''}`
    );

    let result;

    if (version) {
      // 获取指定版本
      result = await this.workflowDefinitionRepository.findByNameAndVersion(
        name,
        version
      );
    } else {
      // 获取活跃版本
      result = await this.workflowDefinitionRepository.findActiveByName(name);
    }

    if (!result.success) {
      throw new Error(`Failed to get workflow definition: ${result.error}`);
    }

    if (!result.data) {
      throw new Error(
        `Workflow definition not found: ${name}${version ? ` v${version}` : ''}`
      );
    }

    return {
      success: true,
      data: this.mapDatabaseToWorkflowDefinition(result.data)
    };
  }

  /**
   * 映射数据库记录到工作流定义
   */
  private mapDatabaseToWorkflowDefinition(
    dbRecord: WorkflowDefinitionTable
  ): WorkflowDefinition {
    // 解析JSON定义字段
    const definitionData =
      typeof dbRecord.definition === 'string'
        ? JSON.parse(dbRecord.definition)
        : dbRecord.definition;

    const result: WorkflowDefinition = {
      id: dbRecord.id,
      name: dbRecord.name,
      version: dbRecord.version,
      nodes: definitionData?.nodes || []
    };

    // 只添加非空的可选字段
    if (dbRecord.description) {
      result.description = dbRecord.description;
    }
    if (definitionData?.inputs) {
      result.inputs = definitionData.inputs;
    }
    if (definitionData?.outputs) {
      result.outputs = definitionData.outputs;
    }
    if (definitionData?.config) {
      result.config = definitionData.config;
    }
    if (dbRecord.tags) {
      result.tags = Array.isArray(dbRecord.tags)
        ? dbRecord.tags
        : JSON.parse(dbRecord.tags as string);
    }
    if (dbRecord.category) {
      result.category = dbRecord.category;
    }
    if (dbRecord.created_by) {
      result.createdBy = dbRecord.created_by;
    }
    if (dbRecord.created_at) {
      result.createdAt = dbRecord.created_at;
    }
    if (dbRecord.updated_at) {
      result.updatedAt = dbRecord.updated_at;
    }

    return result;
  }

  /**
   * 更新工作流定义
   */
  async updateDefinition(
    name: string,
    definition: WorkflowDefinition
  ): Promise<ServiceResult<WorkflowDefinition>> {
    this.logger.info(`Updating workflow definition: ${name}`);

    // 验证定义
    const validationResult = await this.validateDefinition(definition);
    if (!validationResult.success || !validationResult.data?.valid) {
      const errors = validationResult.data?.errors || [
        'Unknown validation error'
      ];
      throw new Error(`Invalid workflow definition: ${errors.join(', ')}`);
    }

    // 检查是否存在
    const existingResult =
      await this.workflowDefinitionRepository.findByNameAndVersion(
        name,
        definition.version
      );

    if (!existingResult.success) {
      throw new Error(
        `Failed to check existing definition: ${existingResult.error}`
      );
    }

    if (!existingResult.data) {
      throw new Error(
        `Workflow definition not found: ${name} v${definition.version}`
      );
    }

    // 准备更新数据
    const updateData: Partial<NewWorkflowDefinitionTable> = {
      description: definition.description || null,
      definition: definition as any,
      // config: definition.config || {}, // 暂时移除
      tags: definition.tags || [],
      category: definition.category || null
      // updated_by: definition.createdBy || null // 暂时移除
    };

    // 执行更新 - 使用基础仓储的 update 方法
    const updateResult = await (
      this.workflowDefinitionRepository as any
    ).update(existingResult.data.id, updateData);

    if (!updateResult.success) {
      throw new Error(
        `Failed to update workflow definition: ${updateResult.error}`
      );
    }

    // 获取更新后的定义
    const updatedResult =
      await this.workflowDefinitionRepository.findByNameAndVersion(
        name,
        definition.version
      );

    if (!updatedResult.success || !updatedResult.data) {
      throw new Error('Failed to retrieve updated workflow definition');
    }

    this.logger.info(
      `Workflow definition updated: ${name} v${definition.version}`
    );

    return {
      success: true,
      data: this.mapDatabaseToWorkflowDefinition(updatedResult.data)
    };
  }

  /**
   * 删除工作流定义
   */
  async deleteDefinition(
    name: string,
    version?: string
  ): Promise<ServiceResult<boolean>> {
    this.logger.info(
      `Deleting workflow definition: ${name}${version ? ` v${version}` : ''}`
    );

    if (version) {
      // 删除指定版本
      const existingResult =
        await this.workflowDefinitionRepository.findByNameAndVersion(
          name,
          version
        );

      if (!existingResult.success) {
        throw new Error(
          `Failed to check existing definition: ${existingResult.error}`
        );
      }

      if (!existingResult.data) {
        throw new Error(`Workflow definition not found: ${name} v${version}`);
      }

      const deleteResult = await (
        this.workflowDefinitionRepository as any
      ).delete(existingResult.data.id);

      if (!deleteResult.success) {
        throw new Error(
          `Failed to delete workflow definition: ${deleteResult.error}`
        );
      }

      this.logger.info(`Workflow definition deleted: ${name} v${version}`);
      return { success: true, data: true };
    } else {
      // 删除所有版本
      const allVersionsResult =
        await this.workflowDefinitionRepository.findAllVersionsByName(name);

      if (!allVersionsResult.success) {
        throw new Error(`Failed to find versions: ${allVersionsResult.error}`);
      }

      if (!allVersionsResult.data || allVersionsResult.data.length === 0) {
        throw new Error(`No workflow definition found for: ${name}`);
      }

      // 删除所有版本
      for (const definition of allVersionsResult.data) {
        const deleteResult = await (
          this.workflowDefinitionRepository as any
        ).delete(definition.id);
        if (!deleteResult.success) {
          this.logger.error(
            `Failed to delete version ${definition.version}: ${deleteResult.error}`
          );
        }
      }

      this.logger.info(`All versions of workflow definition deleted: ${name}`);
      return { success: true, data: true };
    }
  }

  /**
   * 列出所有工作流定义
   */
  async listDefinitions(_options?: {
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ServiceResult<WorkflowDefinition[]>> {
    this.logger.info('Listing all workflow definitions');

    const result = await (this.workflowDefinitionRepository as any).findAll();

    if (!result.success) {
      throw new Error(`Failed to list workflow definitions: ${result.error}`);
    }

    const definitions = (result.data || []).map((dbRecord: any) =>
      this.mapDatabaseToWorkflowDefinition(dbRecord)
    );

    return {
      success: true,
      data: definitions
    };
  }

  /**
   * 验证工作流定义
   */
  async validateDefinition(
    definition: WorkflowDefinition
  ): Promise<ServiceResult<ValidationResult>> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本字段验证
    if (!definition.name || typeof definition.name !== 'string') {
      errors.push('Workflow name is required and must be a string');
    }

    if (!definition.version || typeof definition.version !== 'string') {
      errors.push('Workflow version is required and must be a string');
    }

    if (
      !definition.nodes ||
      !Array.isArray(definition.nodes) ||
      definition.nodes.length === 0
    ) {
      errors.push('Workflow must have at least one node');
    }

    // 节点验证
    if (definition.nodes) {
      const nodeIds = new Set<string>();

      for (const node of definition.nodes) {
        // 检查节点ID唯一性
        if (nodeIds.has(node.id)) {
          errors.push(`Duplicate node ID: ${node.id}`);
        }
        nodeIds.add(node.id);

        // 检查必需字段
        if (!node.id || typeof node.id !== 'string') {
          errors.push('Node ID is required and must be a string');
        }

        if (!node.name || typeof node.name !== 'string') {
          errors.push('Node name is required and must be a string');
        }

        if (!node.type) {
          errors.push('Node type is required');
        }

        // 特定节点类型验证
        if (node.type === 'task') {
          const taskNode = node as any;
          if (!taskNode.executor) {
            errors.push(`Task node ${node.id} must specify an executor`);
          }
        }

        // 依赖关系验证
        if (node.dependsOn) {
          for (const depId of node.dependsOn) {
            if (!nodeIds.has(depId)) {
              warnings.push(
                `Node ${node.id} depends on non-existent node: ${depId}`
              );
            }
          }
        }
      }
    }

    // 输入参数验证
    if (definition.inputs) {
      const inputNames = new Set<string>();

      for (const input of definition.inputs) {
        if (inputNames.has(input.name)) {
          errors.push(`Duplicate input parameter: ${input.name}`);
        }
        inputNames.add(input.name);

        if (!input.name || typeof input.name !== 'string') {
          errors.push('Input parameter name is required and must be a string');
        }

        if (!input.type) {
          errors.push(`Input parameter ${input.name} must specify a type`);
        }
      }
    }

    // 输出参数验证
    if (definition.outputs) {
      const outputNames = new Set<string>();

      for (const output of definition.outputs) {
        if (outputNames.has(output.name)) {
          errors.push(`Duplicate output parameter: ${output.name}`);
        }
        outputNames.add(output.name);

        if (!output.name || typeof output.name !== 'string') {
          errors.push('Output parameter name is required and must be a string');
        }

        if (!output.source || typeof output.source !== 'string') {
          errors.push(
            `Output parameter ${output.name} must specify a source expression`
          );
        }
      }
    }

    const validationResult = {
      valid: errors.length === 0,
      errors,
      warnings
    };

    return {
      success: true,
      data: validationResult
    };
  }

  /**
   * 设置活跃版本
   */
  async setActiveVersion(
    name: string,
    version: string
  ): Promise<ServiceResult<boolean>> {
    this.logger.info(`Setting active version: ${name} v${version}`);

    // 暂时返回成功，实际实现需要Repository支持
    return {
      success: true,
      data: true
    };
  }

  /**
   * 获取工作流统计信息
   */
  async getStatistics(): Promise<ServiceResult<WorkflowStatistics>> {
    this.logger.info('Getting workflow statistics');

    // 暂时返回空统计，实际实现需要Repository支持
    const stats = {} as WorkflowStatistics;

    return {
      success: true,
      data: stats
    };
  }

  /**
   * 搜索工作流定义
   */
  async searchDefinitions(
    keyword: string,
    options?: {
      category?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ServiceResult<WorkflowDefinition[]>> {
    this.logger.info(`Searching workflow definitions: ${keyword}`, { options });

    // 暂时返回空数组，实际实现需要Repository支持搜索
    return {
      success: true,
      data: []
    };
  }
}
