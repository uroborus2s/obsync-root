/**
 * 工作流定义服务
 *
 * 负责工作流定义的管理、验证和存储
 */

import type { AwilixContainer, Logger } from '@stratix/core';
import type { IWorkflowDefinitionRepository } from '../repositories/WorkflowDefinitionRepository.js';
import type { NewWorkflowDefinition } from '../types/database.js';
import type { WorkflowDefinition } from '../types/workflow.js';

/**
 * 工作流定义服务接口
 */
export interface IWorkflowDefinitionService {
  /**
   * 创建工作流定义
   * @param definition 工作流定义
   * @returns 创建的工作流定义
   */
  createDefinition(definition: WorkflowDefinition): Promise<WorkflowDefinition>;

  /**
   * 获取工作流定义
   * @param name 工作流名称
   * @param version 版本号（可选）
   * @returns 工作流定义
   */
  getDefinition(name: string, version?: string): Promise<WorkflowDefinition>;

  /**
   * 更新工作流定义
   * @param name 工作流名称
   * @param definition 更新的工作流定义
   * @returns 更新后的工作流定义
   */
  updateDefinition(
    name: string,
    definition: WorkflowDefinition
  ): Promise<WorkflowDefinition>;

  /**
   * 删除工作流定义
   * @param name 工作流名称
   * @param version 版本号（可选）
   */
  deleteDefinition(name: string, version?: string): Promise<void>;

  /**
   * 列出所有工作流定义
   * @returns 工作流定义列表
   */
  listDefinitions(): Promise<WorkflowDefinition[]>;

  /**
   * 验证工作流定义
   * @param definition 工作流定义
   * @returns 验证结果
   */
  validateDefinition(definition: WorkflowDefinition): Promise<ValidationResult>;
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
export class WorkflowDefinitionService implements IWorkflowDefinitionService {
  private readonly logger: Logger;
  private readonly workflowDefinitionRepository: IWorkflowDefinitionRepository;

  constructor(container: AwilixContainer) {
    this.logger = container.resolve('logger');
    this.workflowDefinitionRepository = container.resolve(
      'workflowDefinitionRepository'
    );
  }

  /**
   * 创建工作流定义
   */
  async createDefinition(
    definition: WorkflowDefinition
  ): Promise<WorkflowDefinition> {
    this.logger.info(`Creating workflow definition: ${definition.name}`);

    // 验证定义
    const validation = await this.validateDefinition(definition);
    if (!validation.valid) {
      throw new Error(
        `Invalid workflow definition: ${validation.errors.join(', ')}`
      );
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
    const newDefinition: NewWorkflowDefinition = {
      name: definition.name,
      description: definition.description || null,
      version: definition.version,
      definition: definition as any, // JSON 字段
      config: definition.config || {},
      status: 'draft',
      is_active: false,
      tags: definition.tags || [],
      category: definition.category || null,
      created_by: definition.createdBy || null,
      updated_by: definition.createdBy || null
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

    return this.mapDatabaseToWorkflowDefinition(createResult.data);
  }

  /**
   * 获取工作流定义
   */
  async getDefinition(
    name: string,
    version?: string
  ): Promise<WorkflowDefinition> {
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

    return this.mapDatabaseToWorkflowDefinition(result.data);
  }

  /**
   * 映射数据库记录到工作流定义
   */
  private mapDatabaseToWorkflowDefinition(dbRecord: any): WorkflowDefinition {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      description: dbRecord.description,
      version: dbRecord.version,
      nodes: dbRecord.definition.nodes || [],
      inputs: dbRecord.definition.inputs || [],
      outputs: dbRecord.definition.outputs || [],
      config: dbRecord.config || {},
      tags: dbRecord.tags || [],
      category: dbRecord.category,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
      createdBy: dbRecord.created_by
    };
  }

  /**
   * 更新工作流定义
   */
  async updateDefinition(
    name: string,
    definition: WorkflowDefinition
  ): Promise<WorkflowDefinition> {
    this.logger.info(`Updating workflow definition: ${name}`);

    // 验证定义
    const validation = await this.validateDefinition(definition);
    if (!validation.valid) {
      throw new Error(
        `Invalid workflow definition: ${validation.errors.join(', ')}`
      );
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
    const updateData: Partial<NewWorkflowDefinition> = {
      description: definition.description || null,
      definition: definition as any,
      config: definition.config || {},
      tags: definition.tags || [],
      category: definition.category || null,
      updated_by: definition.createdBy || null
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

    return this.mapDatabaseToWorkflowDefinition(updatedResult.data);
  }

  /**
   * 删除工作流定义
   */
  async deleteDefinition(name: string, version?: string): Promise<void> {
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
    }
  }

  /**
   * 列出所有工作流定义
   */
  async listDefinitions(): Promise<WorkflowDefinition[]> {
    this.logger.info('Listing all workflow definitions');

    const result = await (this.workflowDefinitionRepository as any).findAll();

    if (!result.success) {
      throw new Error(`Failed to list workflow definitions: ${result.error}`);
    }

    return (result.data || []).map((dbRecord: any) =>
      this.mapDatabaseToWorkflowDefinition(dbRecord)
    );
  }

  /**
   * 验证工作流定义
   */
  async validateDefinition(
    definition: WorkflowDefinition
  ): Promise<ValidationResult> {
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

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
