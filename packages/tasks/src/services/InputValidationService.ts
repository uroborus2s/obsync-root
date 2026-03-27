/**
 * 工作流输入参数验证服务
 *
 * 负责验证工作流启动时传入的参数，包括：
 * - 类型检查和转换
 * - 必填验证
 * - 格式验证（正则表达式）
 * - 默认值处理
 * - 参数合并
 *
 * 版本: v3.1.0-enhanced
 */

import type { Logger } from '@stratix/core';
import type {
  InputProcessingOptions,
  InputTypeConverter,
  InputValidationContext,
  InputValidationError,
  InputValidationReport,
  InputValidationResult,
  InputValidationStats
} from '../types/input-validation.js';
import type { WorkflowInput } from '../types/workflow.js';

/**
 * 输入参数验证服务实现
 */
export default class InputValidationService {
  private readonly typeConverter: InputTypeConverter;

  constructor(private readonly logger: Logger) {
    this.typeConverter = this.createTypeConverter();
  }

  /**
   * 验证和处理工作流输入参数
   *
   * @param inputDefinitions 输入定义列表
   * @param rawInputs 原始输入数据
   * @param options 处理选项
   * @returns 验证结果
   */
  async validateAndProcessInputs(
    inputDefinitions: WorkflowInput[],
    rawInputs: Record<string, any>,
    options: InputProcessingOptions = {}
  ): Promise<InputValidationResult> {
    const startTime = Date.now();

    const {
      strict = false,
      applyDefaults = true,
      typeCoercion = true
    } = options;

    this.logger.debug('Starting input validation', {
      inputDefinitionsCount: inputDefinitions.length,
      rawInputsKeys: Object.keys(rawInputs),
      options
    });

    const errors: InputValidationError[] = [];
    const warnings: string[] = [];
    const processedInputs: Record<string, any> = {};
    let defaultsApplied = 0;
    let typeConversions = 0;

    // 1. 处理定义的输入参数
    for (const inputDef of inputDefinitions) {
      const {
        name,
        type,
        required = false,
        defaultValue,
        validation
      } = inputDef;
      const rawValue = rawInputs[name];

      try {
        // 检查必填参数
        if (required && (rawValue === undefined || rawValue === null)) {
          errors.push({
            name,
            type: 'required',
            message: `Required parameter '${name}' is missing`,
            expected: `${type} value`,
            actual: rawValue
          });
          continue;
        }

        // 应用默认值
        let processedValue = rawValue;
        if (
          processedValue === undefined &&
          applyDefaults &&
          defaultValue !== undefined
        ) {
          processedValue = defaultValue;
          defaultsApplied++;
          this.logger.debug(`Applied default value for parameter '${name}'`, {
            defaultValue
          });
        }

        // 跳过未定义的可选参数
        if (processedValue === undefined) {
          continue;
        }

        // 类型验证和转换
        const typeValidationResult = this.validateAndConvertType(
          name,
          processedValue,
          type,
          typeCoercion
        );

        if (!typeValidationResult.valid) {
          errors.push(...typeValidationResult.errors);
          continue;
        }

        if (typeValidationResult.converted) {
          typeConversions++;
        }

        processedValue = typeValidationResult.value;

        // 格式验证
        const formatValidationResult = this.validateFormat(
          name,
          processedValue,
          validation
        );
        if (!formatValidationResult.valid) {
          errors.push(...formatValidationResult.errors);
          continue;
        }

        // 自定义验证（暂时移除，因为 WorkflowInput 类型中没有 customValidator 属性）
        // 可以在未来版本中通过扩展 WorkflowInput 类型来支持
        // if (validation?.customValidator && customValidators[validation.customValidator]) {
        //   const customError = customValidators[validation.customValidator](processedValue, inputDef);
        //   if (customError) {
        //     errors.push({
        //       name,
        //       type: 'custom',
        //       message: customError,
        //       actual: processedValue
        //     });
        //     continue;
        //   }
        // }

        processedInputs[name] = processedValue;
      } catch (error) {
        this.logger.error(`Error processing input parameter '${name}'`, {
          error,
          inputDef,
          rawValue
        });
        errors.push({
          name,
          type: 'custom',
          message: `Internal error processing parameter '${name}': ${error}`,
          actual: rawValue,
          details: { error: String(error) }
        });
      }
    }

    // 2. 严格模式：检查未定义的参数
    if (strict) {
      const definedNames = new Set(inputDefinitions.map((def) => def.name));
      const undefinedParams = Object.keys(rawInputs).filter(
        (name) => !definedNames.has(name)
      );

      for (const name of undefinedParams) {
        warnings.push(
          `Undefined parameter '${name}' will be ignored in strict mode`
        );
      }
    } else {
      // 非严格模式：保留未定义的参数
      const definedNames = new Set(inputDefinitions.map((def) => def.name));
      for (const [name, value] of Object.entries(rawInputs)) {
        if (!definedNames.has(name) && value !== undefined) {
          processedInputs[name] = value;
          warnings.push(
            `Parameter '${name}' is not defined in workflow inputs but will be preserved`
          );
        }
      }
    }

    const validationTime = Date.now() - startTime;

    this.logger.debug('Input validation completed', {
      valid: errors.length === 0,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      processedInputsCount: Object.keys(processedInputs).length,
      defaultsApplied,
      typeConversions,
      validationTime
    });

    return {
      valid: errors.length === 0,
      processedInputs,
      errors,
      warnings
    };
  }

  /**
   * 生成详细的验证报告
   */
  async generateValidationReport(
    workflowName: string,
    workflowVersion: string,
    inputDefinitions: WorkflowInput[],
    rawInputs: Record<string, any>,
    options: InputProcessingOptions = {}
  ): Promise<InputValidationReport> {
    const context: InputValidationContext = {
      workflowName,
      workflowVersion,
      inputDefinitions,
      rawInputs,
      options
    };

    const result = await this.validateAndProcessInputs(
      inputDefinitions,
      rawInputs,
      options
    );

    const stats: InputValidationStats = {
      totalInputs: inputDefinitions.length,
      requiredInputs: inputDefinitions.filter((def) => def.required).length,
      optionalInputs: inputDefinitions.filter((def) => !def.required).length,
      defaultsApplied: 0, // 这里需要从验证过程中获取
      typeConversions: 0, // 这里需要从验证过程中获取
      errorCount: result.errors.length,
      warningCount: result.warnings?.length || 0,
      validationTime: 0 // 这里需要从验证过程中获取
    };

    return {
      ...result,
      stats,
      context,
      timestamp: new Date(),
      validatorVersion: '3.1.0'
    };
  }

  /**
   * 类型验证和转换
   */
  private validateAndConvertType(
    name: string,
    value: any,
    expectedType: string,
    allowCoercion: boolean
  ): {
    valid: boolean;
    value: any;
    converted: boolean;
    errors: InputValidationError[];
  } {
    const errors: InputValidationError[] = [];

    // 检查当前类型
    const actualType = this.getValueType(value);

    if (actualType === expectedType) {
      return { valid: true, value, converted: false, errors: [] };
    }

    // 尝试类型转换
    if (allowCoercion) {
      const converter =
        this.typeConverter[expectedType as keyof InputTypeConverter];
      if (converter) {
        const convertedValue = converter(value);
        if (convertedValue !== null) {
          return {
            valid: true,
            value: convertedValue,
            converted: true,
            errors: []
          };
        }
      }
    }

    // 类型不匹配且无法转换
    errors.push({
      name,
      type: 'type',
      message: `Parameter '${name}' expected type '${expectedType}' but got '${actualType}'`,
      expected: expectedType,
      actual: actualType
    });

    return { valid: false, value, converted: false, errors };
  }

  /**
   * 格式验证
   */
  private validateFormat(
    name: string,
    value: any,
    validation?: WorkflowInput['validation']
  ): { valid: boolean; errors: InputValidationError[] } {
    const errors: InputValidationError[] = [];

    if (!validation) {
      return { valid: true, errors: [] };
    }

    // 正则表达式验证
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push({
          name,
          type: 'pattern',
          message: `Parameter '${name}' does not match required pattern: ${validation.pattern}`,
          expected: validation.pattern,
          actual: value
        });
      }
    }

    // 范围验证
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push({
          name,
          type: 'range',
          message: `Parameter '${name}' value ${value} is less than minimum ${validation.min}`,
          expected: `>= ${validation.min}`,
          actual: value
        });
      }

      if (validation.max !== undefined && value > validation.max) {
        errors.push({
          name,
          type: 'range',
          message: `Parameter '${name}' value ${value} is greater than maximum ${validation.max}`,
          expected: `<= ${validation.max}`,
          actual: value
        });
      }
    }

    // 字符串长度验证
    if (typeof value === 'string') {
      if (validation.min !== undefined && value.length < validation.min) {
        errors.push({
          name,
          type: 'range',
          message: `Parameter '${name}' length ${value.length} is less than minimum ${validation.min}`,
          expected: `length >= ${validation.min}`,
          actual: value.length
        });
      }

      if (validation.max !== undefined && value.length > validation.max) {
        errors.push({
          name,
          type: 'range',
          message: `Parameter '${name}' length ${value.length} is greater than maximum ${validation.max}`,
          expected: `length <= ${validation.max}`,
          actual: value.length
        });
      }
    }

    // 枚举值验证
    if (validation.enum && validation.enum.length > 0) {
      if (!validation.enum.includes(value)) {
        errors.push({
          name,
          type: 'enum',
          message: `Parameter '${name}' value '${value}' is not in allowed values: [${validation.enum.join(', ')}]`,
          expected: validation.enum,
          actual: value
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 获取值的类型
   */
  private getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * 创建类型转换器
   */
  private createTypeConverter(): InputTypeConverter {
    return {
      string: (value: any): string | null => {
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean')
          return String(value);
        return null;
      },

      number: (value: any): number | null => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = Number(value);
          return isNaN(parsed) ? null : parsed;
        }
        if (typeof value === 'boolean') return value ? 1 : 0;
        return null;
      },

      boolean: (value: any): boolean | null => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower === 'true' || lower === '1' || lower === 'yes') return true;
          if (lower === 'false' || lower === '0' || lower === 'no')
            return false;
        }
        if (typeof value === 'number') return value !== 0;
        return null;
      },

      object: (value: any): object | null => {
        if (value && typeof value === 'object' && !Array.isArray(value))
          return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && !Array.isArray(parsed)
              ? parsed
              : null;
          } catch {
            return null;
          }
        }
        return null;
      },

      array: (value: any): any[] | null => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : null;
          } catch {
            return null;
          }
        }
        return null;
      }
    };
  }
}
