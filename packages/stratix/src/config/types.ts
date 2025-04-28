/**
 * Stratix配置系统类型定义
 */
import { EnvOptions, JSONSchema } from '../types/common.js';

/**
 * 配置API接口
 */
export interface ConfigAPI {
  /**
   * 获取配置值
   * @param path 配置路径，以点分隔
   * @param defaultValue 默认值
   * @returns 配置值或默认值
   */
  get<T = any>(path: string, defaultValue?: T): T;

  /**
   * 检查配置路径是否存在
   * @param path 配置路径，以点分隔
   * @returns 是否存在
   */
  has(path: string): boolean;

  /**
   * 设置配置值
   * @param path 配置路径，以点分隔
   * @param value 配置值
   */
  set(path: string, value: any): void;

  /**
   * 验证配置是否符合schema
   * @param path 配置路径，以点分隔
   * @param schema JSON Schema
   * @param config 可选，要验证的配置对象，如果不提供则使用path指定的配置
   * @returns 是否有效
   */
  validate(path: string, schema: JSONSchema, config?: any): boolean;
}

/**
 * 配置加载器选项
 */
export interface ConfigLoaderOptions {
  /**
   * 内联配置
   */
  config?: Record<string, any>;

  /**
   * 配置文件路径
   */
  configPath?: string;

  /**
   * 环境变量配置
   */
  env?: boolean | EnvOptions;
}
