/**
 * Stratix插件系统类型定义
 */

/**
 * 插件注册函数类型
 * 使用any代替StratixApp以避免循环引用
 */
export type PluginRegisterFn<TOptions = any> = (
  app: any, // 应用实例
  options: TOptions // 插件配置
) => Promise<void> | void;

/**
 * 插件类型定义
 */

/**
 * 插件生命周期状态
 */
export enum PluginLifecycleState {
  /**
   * 已注册
   */
  REGISTERED = 'registered',

  /**
   * 已启用
   */
  ENABLED = 'enabled',

  /**
   * 已禁用
   */
  DISABLED = 'disabled',

  /**
   * 加载失败
   */
  FAILED = 'failed'
}

/**
 * 插件通用接口
 */
export interface StratixPlugin<T = any> {
  /**
   * 插件名称
   */
  name: string;

  /**
   * 插件版本
   */
  version: string;

  /**
   * 插件描述
   */
  description?: string;

  /**
   * 插件依赖
   */
  dependencies?: string[];

  /**
   * 可选依赖
   */
  optionalDependencies?: string[];

  /**
   * 插件注册函数
   * @param app 应用实例
   * @param options 插件选项
   */
  register: PluginRegisterFn<T>;

  /**
   * 插件配置验证schema
   */
  schema?: import('../types/common.js').JSONSchema;

  /**
   * 添加到应用实例的装饰器
   */
  decorations?: Record<string, any>;
}

/**
 * 内部插件接口
 * 继承自通用插件接口
 */
export interface InternalPlugin<T = any> extends StratixPlugin<T> {
  /**
   * 是否为内部插件
   */
  isInternal: true;
}

/**
 * 外部插件接口
 * 继承自通用插件接口
 */
export interface ExternalPlugin<T = any> extends StratixPlugin<T> {
  /**
   * 外部插件路径
   */
  path?: string;
}

/**
 * 插件配置
 */
export interface PluginConfig<T = any> {
  /**
   * 插件名称
   */
  name: string;

  /**
   * 插件版本
   */
  version: string;

  /**
   * 插件描述
   */
  description?: string;

  /**
   * 插件依赖
   */
  dependencies?: string[];

  /**
   * 插件作者
   */
  author?: string;

  /**
   * 插件许可证
   */
  license?: string;

  /**
   * 插件主页
   */
  homepage?: string;

  /**
   * 插件仓库
   */
  repository?: string;

  /**
   * 插件关键词
   */
  keywords?: string[];

  /**
   * 插件选项
   */
  options?: T;

  /**
   * 是否启用插件
   */
  enabled?: boolean;
}

/**
 * 插件工厂函数类型
 */
export type PluginFactory<TOptions = any> = (
  factoryOptions?: any // 工厂配置
) => StratixPlugin<TOptions>;

/**
 * 插件实例信息
 */
export interface PluginInstance {
  /**
   * 插件对象
   */
  plugin: StratixPlugin;

  /**
   * 插件配置
   */
  options: any;

  /**
   * 插件实例状态
   */
  state?: 'registered' | 'initialized' | 'ready';
}
