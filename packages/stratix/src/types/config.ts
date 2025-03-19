import { PluginOptions } from './plugin.js';

/**
 * 应用上下文接口
 */
export interface Context {
  env: Record<string, string>;
  [key: string]: any;
}

/**
 * 插件属性类型
 */
export interface PropType {
  type: string;
  default?: any;
  required?: boolean;
  [key: string]: any;
}

/**
 * 插件配置接口
 */
export interface PluginConfig {
  name: string;
  version?: string;
  type?: string;
  description?: string;
  dependencies?: string[];
  factory?: Function;
  props?: Record<string, PropType | any>;
  options?: PluginOptions;
}

/**
 * 应用配置接口
 */
export interface AppConfig {
  name: string;
  type?: string;
  version?: string;
  env?: string;
  plugins: PluginConfig[];
  [key: string]: any;
}

/**
 * 配置加载器函数类型
 */
export type ConfigLoader = (ctx: Context) => AppConfig;
