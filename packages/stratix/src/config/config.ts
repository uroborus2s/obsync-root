/**
 * 配置管理类实现
 */
import { object } from '@stratix/utils';
import { JSONSchema } from '../types/common.js';
import { ConfigValidationError } from '../types/errors.js';
import { ConfigAPI } from './types.js';
import { validateSchema } from './validator.js';

/**
 * 配置管理类实现
 */
export class ConfigImpl implements ConfigAPI {
  /**
   * 配置数据
   */
  private _config: Record<string, any>;

  /**
   * 构造函数
   * @param config 初始配置
   */
  constructor(config: Record<string, any> = {}) {
    this._config = config;
  }

  /**
   * 获取配置值
   * @param path 配置路径，以点分隔
   * @param defaultValue 默认值
   * @returns 配置值或默认值
   */
  get<T = any>(path: string, defaultValue?: T): T {
    return object.get(this._config, path, defaultValue);
  }

  /**
   * 检查配置路径是否存在
   * @param path 配置路径，以点分隔
   * @returns 是否存在
   */
  has(path: string): boolean {
    return object.has(this._config, path);
  }

  /**
   * 设置配置值
   * @param path 配置路径，以点分隔
   * @param value 配置值
   */
  set(path: string, value: any): void {
    object.set(this._config, path, value);
  }

  /**
   * 验证配置是否符合schema
   * @param path 配置路径，以点分隔
   * @param schema JSON Schema
   * @param config 可选，要验证的配置对象，如果不提供则使用path指定的配置
   * @returns 是否有效
   * @throws ConfigValidationError 验证失败时抛出
   */
  validate(path: string, schema: JSONSchema, config?: any): boolean {
    try {
      const targetConfig = config || this.get(path, {});
      return validateSchema(targetConfig, schema);
    } catch (err) {
      if (err instanceof ConfigValidationError) {
        throw err;
      }
      throw new ConfigValidationError(
        `验证配置路径 "${path}" 失败: ${(err as Error).message}`
      );
    }
  }
}
