/**
 * 工作流定义服务实现
 *
 * 提供工作流定义的业务逻辑处理
 * 版本: v3.0.0-refactored
 */

import type { Logger } from '@stratix/core';
import type { IWorkflowDefinitionRepository } from '../interfaces/repositories.js';
import type { IWorkflowDefinitionService } from '../interfaces/services.js';
import type {
  PaginatedResult,
  PaginationOptions,
  ServiceResult
} from '../types/business.js';
import type {
  NewWorkflowDefinitionTable,
  WorkflowDefinitionTable,
  WorkflowDefinitionTableUpdate
} from '../types/database.js';
import type { InputProcessingOptions } from '../types/input-validation.js';
import type { WorkflowInput } from '../types/workflow.js';
import InputValidationService from './InputValidationService.js';

/**
 * 工作流定义服务实现
 */
export default class WorkflowDefinitionService
  implements IWorkflowDefinitionService
{
  constructor(
    private readonly workflowDefinitionRepository: IWorkflowDefinitionRepository,
    private readonly logger: Logger,
    private readonly inputValidationService: InputValidationService
  ) {}

  /**
   * 根据ID获取工作流定义
   */
  async getById(id: number): Promise<ServiceResult<WorkflowDefinitionTable>> {
    try {
      this.logger.debug('Getting workflow definition by ID', { id });

      const result = await this.workflowDefinitionRepository.findById(id);

      if (!result.success) {
        this.logger.warn('Failed to get workflow definition', {
          id,
          error: result.error
        });
        return {
          success: false,
          error: `Failed to get workflow definition: ${id}`,
          errorDetails: result.error
        };
      }

      if (!result.data) {
        this.logger.warn('Workflow definition not found', { id });
        return {
          success: false,
          error: `Workflow definition not found: ${id}`
        };
      }

      this.logger.debug('Workflow definition found', {
        id,
        name: result.data.name,
        version: result.data.version
      });

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error('Error getting workflow definition by ID', {
        id,
        error
      });
      return {
        success: false,
        error: 'Internal error getting workflow definition',
        errorDetails: error
      };
    }
  }

  /**
   * 根据名称获取活跃的工作流定义
   */
  async getActiveByName(
    name: string
  ): Promise<ServiceResult<WorkflowDefinitionTable>> {
    try {
      this.logger.debug('Getting active workflow definition by name', { name });

      const result =
        await this.workflowDefinitionRepository.findActiveByName(name);

      if (!result.success) {
        this.logger.warn('Failed to get active workflow definition', {
          name,
          error: result.error
        });
        return {
          success: false,
          error: `Failed to get active workflow definition: ${name}`,
          errorDetails: result.error
        };
      }

      if (!result.data) {
        this.logger.warn('Active workflow definition not found', { name });
        return {
          success: false,
          error: `Active workflow definition not found: ${name}`
        };
      }

      this.logger.debug('Active workflow definition found', {
        name,
        id: result.data.id,
        version: result.data.version
      });

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error('Error getting active workflow definition by name', {
        name,
        error
      });
      return {
        success: false,
        error: 'Internal error getting active workflow definition',
        errorDetails: error
      };
    }
  }

  /**
   * 根据名称和版本获取工作流定义
   */
  async getByNameAndVersion(
    name: string,
    version: string
  ): Promise<ServiceResult<WorkflowDefinitionTable>> {
    try {
      this.logger.debug('Getting workflow definition by name and version', {
        name,
        version
      });

      const result =
        await this.workflowDefinitionRepository.findByNameAndVersion(
          name,
          version
        );

      if (!result.success) {
        this.logger.warn(
          'Failed to get workflow definition by name and version',
          {
            name,
            version,
            error: result.error
          }
        );
        return {
          success: false,
          error: `Failed to get workflow definition: ${name}@${version}`,
          errorDetails: result.error
        };
      }

      if (!result.data) {
        this.logger.warn('Workflow definition not found by name and version', {
          name,
          version
        });
        return {
          success: false,
          error: `Workflow definition not found: ${name}@${version}`
        };
      }

      this.logger.debug('Workflow definition found by name and version', {
        name,
        version,
        id: result.data.id
      });

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error(
        'Error getting workflow definition by name and version',
        {
          name,
          version,
          error
        }
      );
      return {
        success: false,
        error: 'Internal error getting workflow definition',
        errorDetails: error
      };
    }
  }

  /**
   * 创建工作流定义
   */
  async create(
    definition: NewWorkflowDefinitionTable
  ): Promise<ServiceResult<WorkflowDefinitionTable>> {
    try {
      this.logger.info('Creating workflow definition', {
        name: definition.name,
        version: definition.version
      });

      // 验证工作流定义
      const validationResult = await this.validate(definition);
      if (!validationResult.success) {
        return {
          success: false,
          error: 'Workflow definition validation failed',
          errorDetails: validationResult.error
        };
      }

      const result = await this.workflowDefinitionRepository.create(definition);

      if (!result.success) {
        this.logger.error('Failed to create workflow definition', {
          definition,
          error: result.error
        });
        return {
          success: false,
          error: 'Failed to create workflow definition',
          errorDetails: result.error
        };
      }

      this.logger.info('Workflow definition created successfully', {
        id: result.data.id,
        name: result.data.name,
        version: result.data.version
      });

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error('Error creating workflow definition', {
        definition,
        error
      });
      return {
        success: false,
        error: 'Internal error creating workflow definition',
        errorDetails: error
      };
    }
  }

  /**
   * 更新工作流定义
   */
  async update(
    id: number,
    updates: WorkflowDefinitionTableUpdate
  ): Promise<ServiceResult<WorkflowDefinitionTable>> {
    try {
      this.logger.info('Updating workflow definition', { id, updates });

      // 如果更新了定义内容，需要验证
      if (updates.definition) {
        const validationResult = await this.validate(updates);
        if (!validationResult.success) {
          return {
            success: false,
            error: 'Workflow definition validation failed',
            errorDetails: validationResult.error
          };
        }
      }

      const result = await this.workflowDefinitionRepository.update(
        id,
        updates
      );

      if (!result.success) {
        this.logger.error('Failed to update workflow definition', {
          id,
          updates,
          error: result.error
        });
        return {
          success: false,
          error: 'Failed to update workflow definition',
          errorDetails: result.error
        };
      }

      if (!result.data) {
        this.logger.warn('Workflow definition not found for update', { id });
        return {
          success: false,
          error: `Workflow definition not found: ${id}`
        };
      }

      this.logger.info('Workflow definition updated successfully', {
        id,
        name: result.data.name,
        version: result.data.version
      });

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      this.logger.error('Error updating workflow definition', {
        id,
        updates,
        error
      });
      return {
        success: false,
        error: 'Internal error updating workflow definition',
        errorDetails: error
      };
    }
  }

  /**
   * 删除工作流定义
   */
  async delete(id: number): Promise<ServiceResult<boolean>> {
    try {
      this.logger.info('Deleting workflow definition', { id });

      // 检查是否存在运行中的实例
      // TODO: 添加实例检查逻辑

      const result = await this.workflowDefinitionRepository.delete(id);

      if (!result.success) {
        this.logger.error('Failed to delete workflow definition', {
          id,
          error: result.error
        });
        return {
          success: false,
          error: 'Failed to delete workflow definition',
          errorDetails: result.error
        };
      }

      this.logger.info('Workflow definition deleted successfully', { id });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('Error deleting workflow definition', { id, error });
      return {
        success: false,
        error: 'Internal error deleting workflow definition',
        errorDetails: error
      };
    }
  }

  /**
   * 查询工作流定义列表
   */
  async findMany(
    filters?: {
      status?: string;
      category?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination?: PaginationOptions
  ): Promise<ServiceResult<PaginatedResult<WorkflowDefinitionTable>>> {
    try {
      this.logger.debug('Finding workflow definitions', {
        filters,
        pagination
      });

      const result = await this.workflowDefinitionRepository.findMany(
        filters,
        pagination
      );

      if (!result.success) {
        this.logger.error('Failed to find workflow definitions', {
          filters,
          pagination,
          error: result.error
        });
        return {
          success: false,
          error: 'Failed to find workflow definitions',
          errorDetails: result.error
        };
      }

      this.logger.debug('Found workflow definitions', {
        count: result.data?.items?.length || 0,
        total: result.data?.total || 0
      });

      return {
        success: true,
        data: result.data || {
          items: [],
          total: 0,
          page: pagination?.page || 1,
          pageSize: pagination?.pageSize || 20,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    } catch (error) {
      this.logger.error('Error finding workflow definitions', {
        filters,
        pagination,
        error
      });
      return {
        success: false,
        error: 'Internal error finding workflow definitions',
        errorDetails: error
      };
    }
  }

  /**
   * 验证工作流定义
   */
  async validate(definition: any): Promise<ServiceResult<boolean>> {
    try {
      this.logger.debug('Validating workflow definition', {
        name: definition.name,
        version: definition.version
      });

      // 基本字段验证
      if (!definition.name || typeof definition.name !== 'string') {
        return {
          success: false,
          error: 'Workflow name is required and must be a string'
        };
      }

      if (!definition.version || typeof definition.version !== 'string') {
        return {
          success: false,
          error: 'Workflow version is required and must be a string'
        };
      }

      if (!definition.definition || typeof definition.definition !== 'object') {
        return {
          success: false,
          error: 'Workflow definition is required and must be an object'
        };
      }

      // 验证工作流定义结构
      const workflowDef = definition.definition;

      if (!workflowDef.nodes || !Array.isArray(workflowDef.nodes)) {
        return {
          success: false,
          error: 'Workflow definition must contain a nodes array'
        };
      }

      if (workflowDef.nodes.length === 0) {
        return {
          success: false,
          error: 'Workflow definition must contain at least one node'
        };
      }

      // 验证节点结构
      for (const node of workflowDef.nodes) {
        if (!node.id || typeof node.id !== 'string') {
          return {
            success: false,
            error: 'Each node must have a valid id'
          };
        }

        if (!node.type || typeof node.type !== 'string') {
          return {
            success: false,
            error: 'Each node must have a valid type'
          };
        }

        // 验证支持的节点类型
        const supportedTypes = ['simple', 'loop', 'parallel', 'subprocess'];
        if (!supportedTypes.includes(node.type)) {
          return {
            success: false,
            error: `Unsupported node type: ${node.type}. Supported types: ${supportedTypes.join(', ')}`
          };
        }
      }

      this.logger.debug('Workflow definition validation passed', {
        name: definition.name,
        version: definition.version,
        nodeCount: workflowDef.nodes.length
      });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('Error validating workflow definition', {
        definition,
        error
      });
      return {
        success: false,
        error: 'Internal error validating workflow definition',
        errorDetails: error
      };
    }
  }

  /**
   * 验证和处理工作流输入参数
   *
   * @param workflowDefinition 工作流定义
   * @param rawInputs 原始输入数据
   * @param options 处理选项
   * @returns 验证结果
   */
  async validateAndProcessInputs(
    workflowDefinition: WorkflowDefinitionTable,
    rawInputs: Record<string, any>,
    options: InputProcessingOptions = {}
  ): Promise<ServiceResult<Record<string, any>>> {
    try {
      this.logger.debug('Validating workflow inputs', {
        workflowId: workflowDefinition.id,
        workflowName: workflowDefinition.name,
        workflowVersion: workflowDefinition.version,
        rawInputsKeys: Object.keys(rawInputs),
        options
      });

      // 获取工作流定义中的输入参数定义
      const inputDefinitions = workflowDefinition.definition?.inputs || [];

      if (inputDefinitions.length === 0) {
        this.logger.debug('No input definitions found, returning raw inputs', {
          workflowId: workflowDefinition.id
        });

        return {
          success: true,
          data: rawInputs
        };
      }

      // 执行参数验证和处理
      const validationResult =
        await this.inputValidationService.validateAndProcessInputs(
          inputDefinitions,
          rawInputs,
          {
            strict: false, // 允许未定义的参数
            applyDefaults: true, // 应用默认值
            typeCoercion: true, // 允许类型转换
            ...options
          }
        );

      if (!validationResult.valid) {
        const errorMessages = validationResult.errors
          .map((error) => `${error.name}: ${error.message}`)
          .join('; ');

        this.logger.warn('Workflow input validation failed', {
          workflowId: workflowDefinition.id,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });

        return {
          success: false,
          error: `Input validation failed: ${errorMessages}`,
          errorDetails: {
            errors: validationResult.errors,
            warnings: validationResult.warnings
          }
        };
      }

      // 记录警告信息
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        this.logger.warn('Workflow input validation warnings', {
          workflowId: workflowDefinition.id,
          warnings: validationResult.warnings
        });
      }

      this.logger.debug('Workflow input validation successful', {
        workflowId: workflowDefinition.id,
        processedInputsKeys: Object.keys(validationResult.processedInputs),
        warningsCount: validationResult.warnings?.length || 0
      });

      return {
        success: true,
        data: validationResult.processedInputs
      };
    } catch (error) {
      this.logger.error('Error validating workflow inputs', {
        workflowId: workflowDefinition.id,
        error,
        rawInputs
      });

      return {
        success: false,
        error: 'Internal error validating workflow inputs',
        errorDetails: error
      };
    }
  }

  /**
   * 获取工作流输入参数定义
   *
   * @param workflowDefinition 工作流定义
   * @returns 输入参数定义列表
   */
  getInputDefinitions(
    workflowDefinition: WorkflowDefinitionTable
  ): WorkflowInput[] {
    return workflowDefinition.definition?.inputs || [];
  }

  /**
   * 验证工作流输入参数定义的有效性
   *
   * @param inputDefinitions 输入参数定义列表
   * @returns 验证结果
   */
  validateInputDefinitions(
    inputDefinitions: WorkflowInput[]
  ): ServiceResult<boolean> {
    try {
      const errors: string[] = [];
      const names = new Set<string>();

      for (const [index, inputDef] of inputDefinitions.entries()) {
        const prefix = `Input[${index}]`;

        // 验证名称
        if (!inputDef.name || typeof inputDef.name !== 'string') {
          errors.push(`${prefix}: name is required and must be a string`);
          continue;
        }

        if (names.has(inputDef.name)) {
          errors.push(`${prefix}: duplicate input name '${inputDef.name}'`);
          continue;
        }
        names.add(inputDef.name);

        // 验证类型
        const validTypes = ['string', 'number', 'boolean', 'object', 'array'];
        if (!inputDef.type || !validTypes.includes(inputDef.type)) {
          errors.push(
            `${prefix}(${inputDef.name}): type must be one of: ${validTypes.join(', ')}`
          );
        }

        // 验证正则表达式
        if (inputDef.validation?.pattern) {
          try {
            new RegExp(inputDef.validation.pattern);
          } catch (regexError) {
            errors.push(
              `${prefix}(${inputDef.name}): invalid regex pattern '${inputDef.validation.pattern}'`
            );
          }
        }

        // 验证范围
        if (
          inputDef.validation?.min !== undefined &&
          inputDef.validation?.max !== undefined
        ) {
          if (inputDef.validation.min > inputDef.validation.max) {
            errors.push(
              `${prefix}(${inputDef.name}): min value cannot be greater than max value`
            );
          }
        }

        // 验证默认值类型
        if (inputDef.defaultValue !== undefined) {
          const defaultType = this.getValueType(inputDef.defaultValue);
          if (
            defaultType !== inputDef.type &&
            !(inputDef.type === 'array' && Array.isArray(inputDef.defaultValue))
          ) {
            errors.push(
              `${prefix}(${inputDef.name}): default value type '${defaultType}' does not match declared type '${inputDef.type}'`
            );
          }
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: `Input definitions validation failed: ${errors.join('; ')}`
        };
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      this.logger.error('Error validating input definitions', {
        error,
        inputDefinitions
      });
      return {
        success: false,
        error: 'Internal error validating input definitions',
        errorDetails: error
      };
    }
  }

  /**
   * 获取值的类型
   */
  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}
