import type { Logger } from '@stratix/core';
import type {
  ITemplateService,
  TemplateOptions,
  TemplateResult
} from '../interfaces/services.js';

/**
 * 模板处理服务
 *
 * 自实现模板字符串替换功能，支持：
 * - ${variable} 语法的变量替换
 * - 嵌套对象路径访问（通过扁平化对象实现）
 * - 递归处理配置对象
 * - 类型保持（字符串、布尔值、数字、数组等）
 * - 数组类型的完整性保持
 */
export default class TemplateService implements ITemplateService {
  private readonly defaultOptions: TemplateOptions;

  constructor(private logger: Logger) {
    this.defaultOptions = {
      strict: false,
      defaultValue: undefined
    };
  }

  /**
   * 从对象路径获取值
   * 支持点号路径访问，如 'user.profile.name'
   * 优化版本：先尝试扁平化访问，再回退到路径解析
   */
  getValueFromPath(path: string, variables: Record<string, any>): any {
    if (!path || typeof path !== 'string') {
      return undefined;
    }

    const cleanPath = path.trim();

    // 优化：先尝试直接访问（适用于已扁平化的对象）
    if (variables[cleanPath] !== undefined) {
      return variables[cleanPath];
    }

    // 回退：如果没有点号，直接访问
    if (!cleanPath.includes('.')) {
      return variables[cleanPath];
    }

    // 回退：传统的路径解析（适用于原始嵌套对象）
    const pathParts = cleanPath.split('.');
    let current = variables;

    for (const part of pathParts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 自实现的模板引擎
   * 替换字符串中的 ${variable} 模式
   * 直接使用扁平化后的变量对象，避免重复路径解析
   */
  private processTemplate(
    template: string,
    flatVariables: Record<string, any>
  ): string {
    // 使用正则表达式匹配 ${...} 模式
    return template.replace(/\$\{([^}]+)\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();

      // 直接从扁平化变量对象中获取值，无需路径解析
      const value = flatVariables[trimmedName];

      // 如果值未定义，保留原始模板字符串
      if (value === undefined) {
        return match;
      }

      // 将值转换为字符串
      if (value === null) {
        return '__STRATIX_NULL__';
      } else if (Array.isArray(value)) {
        try {
          return `__STRATIX_ARRAY__${JSON.stringify(value)}`;
        } catch (error) {
          // JSON序列化失败，使用默认的toString()
          return String(value);
        }
      } else {
        return String(value);
      }
    });
  }

  /**
   * 扁平化嵌套对象，将嵌套路径转换为平级键
   * 例如: {user: {name: 'John'}} => {'user.name': 'John'}
   * 对数组进行特殊处理，使用JSON序列化保持类型信息
   */
  private flattenObject(
    obj: Record<string, any>,
    prefix = ''
  ): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      // 处理特殊类型：使用特殊格式保持类型信息
      let processedValue = value;
      if (Array.isArray(value)) {
        try {
          // 使用特殊前缀标记数组，并用JSON序列化保持完整性
          processedValue = `__STRATIX_ARRAY__${JSON.stringify(value)}`;
        } catch (error) {
          // JSON序列化失败时，回退到默认的toString()行为
          this.logger.warn('Failed to serialize array in template variables', {
            key: newKey,
            error: error instanceof Error ? error.message : String(error)
          });
          processedValue = value;
        }
      } else if (value === null) {
        // 特殊处理 null 值，避免被转换为空字符串
        processedValue = '__STRATIX_NULL__';
      } else if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        // 递归处理嵌套对象
        Object.assign(flattened, this.flattenObject(value, newKey));
      }

      // 同时保留原始键和扁平化键
      flattened[newKey] = processedValue;
      if (!prefix) {
        flattened[key] = processedValue;
      }
    }

    return flattened;
  }

  /**
   * 解析单个模板表达式
   *
   * @param expression 模板表达式字符串
   * @param variables 变量对象
   * @param options 处理选项
   * @returns 解析结果
   */
  evaluateExpression(
    expression: string,
    variables: Record<string, any>,
    options: TemplateOptions = {}
  ): TemplateResult {
    const opts = { ...this.defaultOptions, ...options };
    const missingVariables: string[] = [];

    if (typeof expression !== 'string') {
      return {
        value: expression,
        hasVariables: false,
        missingVariables: []
      };
    }

    // 检查是否包含 ${} 模板变量
    const templateRegex = /\$\{([^}]+)\}/g;
    const matches = expression.match(templateRegex);

    if (!matches) {
      return {
        value: expression,
        hasVariables: false,
        missingVariables: []
      };
    }

    try {
      // 扁平化嵌套对象，让模板引擎可以访问嵌套属性
      const flatVariables = this.flattenObject(variables);

      // 使用自实现的模板引擎进行替换
      const result = this.processTemplate(expression, flatVariables);

      // 尝试转换为原始类型
      const convertedResult = this.convertToOriginalType(result);

      // 检查是否有未定义的变量
      const variableNames = this.extractVariableNames(expression);
      for (const varName of variableNames) {
        if (flatVariables[varName] === undefined) {
          missingVariables.push(varName);
        }
      }

      return {
        value: convertedResult,
        hasVariables: true,
        missingVariables
      };
    } catch (error) {
      this.logger.warn(
        `Template evaluation failed for expression: ${expression}`,
        {
          error: error instanceof Error ? error.message : String(error),
          variables: Object.keys(variables)
        }
      );

      if (opts.strict) {
        throw error;
      }

      return {
        value: opts.defaultValue !== undefined ? opts.defaultValue : expression,
        hasVariables: true,
        missingVariables
      };
    }
  }

  /**
   * 递归解析配置对象中的所有模板变量
   *
   * @param config 配置对象
   * @param variables 变量对象
   * @param options 处理选项
   * @returns 解析后的配置对象
   */
  resolveConfigVariables(
    config: any,
    variables: Record<string, any>,
    options: TemplateOptions = {}
  ): any {
    if (config === null || config === undefined) {
      return config;
    }

    // 处理字符串类型
    if (typeof config === 'string') {
      const result = this.evaluateExpression(config, variables, options);
      return result.value;
    }

    // 处理数组类型
    if (Array.isArray(config)) {
      return config.map((item) =>
        this.resolveConfigVariables(item, variables, options)
      );
    }

    // 处理对象类型
    if (typeof config === 'object') {
      const resolved: Record<string, any> = {};

      for (const [key, value] of Object.entries(config)) {
        resolved[key] = this.resolveConfigVariables(value, variables, options);
      }

      return resolved;
    }

    // 其他类型直接返回
    return config;
  }

  /**
   * 尝试将字符串转换为原始类型
   * 支持数组类型的反向转换
   */
  private convertToOriginalType(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // 检测并转换数组类型
    if (value.startsWith('__STRATIX_ARRAY__')) {
      try {
        const arrayJson = value.substring('__STRATIX_ARRAY__'.length);
        const parsedArray = JSON.parse(arrayJson);

        // 验证解析结果确实是数组
        if (Array.isArray(parsedArray)) {
          this.logger.debug('Successfully converted string back to array', {
            originalString: value,
            arrayLength: parsedArray.length
          });
          return parsedArray;
        } else {
          this.logger.warn(
            'Parsed result is not an array, returning original string',
            {
              originalString: value,
              parsedType: typeof parsedArray
            }
          );
          return value;
        }
      } catch (error) {
        // JSON解析失败，返回原始字符串
        this.logger.warn('Failed to parse array from template result', {
          originalString: value,
          error: error instanceof Error ? error.message : String(error)
        });
        return value;
      }
    }

    // 检测并转换 null 类型
    if (value === '__STRATIX_NULL__') {
      return null;
    }

    // 尝试转换为布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;

    // 尝试转换为 null
    if (value === 'null') return null;

    // 尝试转换为 undefined
    if (value === 'undefined') return undefined;

    // 返回原始字符串
    return value;
  }

  /**
   * 批量处理多个配置对象
   */
  resolveMultipleConfigs(
    configs: any[],
    variables: Record<string, any>,
    options: TemplateOptions = {}
  ): any[] {
    return configs.map((config) =>
      this.resolveConfigVariables(config, variables, options)
    );
  }

  /**
   * 验证模板表达式的语法
   */
  validateTemplateExpression(expression: string): boolean {
    if (typeof expression !== 'string') {
      return true;
    }

    try {
      // 检查是否包含有效的 ${} 模式
      const templateRegex = /\$\{([^}]+)\}/g;
      const matches = expression.match(templateRegex);

      if (!matches) {
        // 没有模板变量，认为是有效的
        return true;
      }

      // 检查每个变量名是否有效
      for (const match of matches) {
        const variableName = match
          .replace(/^\$\{/, '')
          .replace(/\}$/, '')
          .trim();
        if (!variableName) {
          // 空变量名无效
          return false;
        }
        // 检查变量名是否包含有效字符（字母、数字、点号、下划线）
        if (!/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(variableName)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 提取模板表达式中的所有变量名
   */
  extractVariableNames(expression: string): string[] {
    if (typeof expression !== 'string') {
      return [];
    }

    const regex = /\$\{([^}]+)\}/g;
    const matches = expression.match(regex);

    if (!matches) {
      return [];
    }

    return matches.map((match) => {
      // 提取 ${...} 中的变量名
      const variableName = match.replace(/^\$\{/, '').replace(/\}$/, '').trim();
      return variableName;
    });
  }
}
