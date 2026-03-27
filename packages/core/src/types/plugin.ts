// 插件相关类型定义
// 定义 Stratix 插件系统的接口和类型

import type { AwilixContainer } from 'awilix';
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions
} from 'fastify';
import type { AutoLoadConfig } from './auto-load.js';

/**
 * Stratix 插件选项
 * 扩展 Fastify 插件选项，添加 Stratix 特性
 */
export interface StratixPluginOptions extends FastifyPluginOptions {
  /** 是否为全局插件 */
  isGlobal?: boolean;

  /** 插件路由前缀 */
  prefix?: string;

  /** 是否封装插件作用域 */
  encapsulate?: boolean;

  /** 自动扫描配置 */
  autoScan?: {
    controllers?: boolean | string;
    services?: boolean | string;
    repositories?: boolean | string;
  };

  /** DI 容器实例 */
  diContainer?: AwilixContainer;

  /** 插件配置 */
  config?: any;
}

/**
 * 标准 Fastify 插件类型
 * 支持 Fastify 生态系统中的所有插件
 */
export type FastifyCompatiblePlugin<
  T extends FastifyPluginOptions = FastifyPluginOptions
> = FastifyPluginAsync<T> | FastifyPluginCallback<T>;

/**
 * Stratix 增强插件函数类型
 * 基于 Fastify 插件，添加 Stratix 特性
 */
export interface StratixPlugin {
  /** 插件主函数 */
  (
    fastify: FastifyInstance,
    options: StratixPluginOptions
  ): Promise<void> | void;

  /** 插件元数据 - Fastify 标准 */
  [key: string]: any;

  /** Stratix 特定配置 */
  stratixConfig?: {
    /** 自动加载配置 */
    autoLoad?: AutoLoadConfig;

    /** 插件级别路由前缀 */
    prefix?: string;

    /** 显式指定的 Controller 类 */
    controllers?: Constructor[];

    /** 插件作用域类型 */
    scope?: 'global' | 'scoped';

    /** 全局服务列表 */
    globalServices?: string[];
  };
}

/**
 * 通用插件类型
 * 支持标准 Fastify 插件和 Stratix 增强插件
 *
 * 使用示例：
 * ```typescript
 * // 标准 Fastify 插件
 * import cors from '@fastify/cors';
 * import helmet from '@fastify/helmet';
 *
 * // Stratix 增强插件
 * import databasePlugin from '@stratix/database';
 * import authPlugin from './plugins/auth';
 *
 * const config: StratixConfig = {
 *   plugins: [
 *     { name: 'cors', plugin: cors },
 *     { name: 'helmet', plugin: helmet },
 *     { name: 'database', plugin: databasePlugin },
 *     { name: 'auth', plugin: authPlugin }
 *   ]
 * };
 * ```
 */
export type UniversalPlugin<
  T extends FastifyPluginOptions = FastifyPluginOptions
> = FastifyCompatiblePlugin<T> | StratixPlugin;

/**
 * 插件配置
 * 用于配置文件中的插件定义
 *
 * 支持两种插件类型：
 * 1. 标准 Fastify 插件：来自 Fastify 生态系统的插件（如 @fastify/cors, @fastify/helmet）
 * 2. Stratix 增强插件：通过 withRegisterAutoDI 包装的插件（如 @stratix/database）
 *
 * @example
 * ```typescript
 * import cors from '@fastify/cors';
 * import helmet from '@fastify/helmet';
 * import databasePlugin from '@stratix/database';
 *
 * const plugins: PluginConfig[] = [
 *   // 标准 Fastify 插件
 *   {
 *     name: 'cors',
 *     plugin: cors,
 *     options: { origin: true }
 *   },
 *   {
 *     name: 'helmet',
 *     plugin: helmet,
 *     options: { contentSecurityPolicy: false }
 *   },
 *   // Stratix 增强插件
 *   {
 *     name: 'database',
 *     plugin: databasePlugin,
 *     options: {
 *       connections: {
 *         default: { type: 'mysql', host: 'localhost' }
 *       }
 *     }
 *   }
 * ];
 * ```
 */
export interface PluginConfig<
  T extends FastifyPluginOptions = FastifyPluginOptions
> {
  /** 插件名称 */
  name: string;

  /**
   * 插件模块对象
   * 支持标准 Fastify 插件和 Stratix 增强插件
   */
  plugin: UniversalPlugin<T>;

  /** 插件选项 */
  options?: T;

  /** 是否启用插件 */
  enabled?: boolean;

  /** 插件作用域 */
  scope?: 'global' | 'scoped';

  /** 是否使用 fastify-plugin 封装 */
  encapsulate?: boolean;

  /** 插件级别的路由前缀 */
  prefix?: string;

  /** 插件依赖 */
  dependencies?: string[];

  /** 插件加载顺序 */
  order?: number;
}

/**
 * 插件注册选项
 */
export interface PluginRegistrationOptions {
  /** 是否强制重新注册 */
  force?: boolean;

  /** 注册超时时间 */
  timeout?: number;

  /** 是否跳过依赖检查 */
  skipDependencyCheck?: boolean;
}

/**
 * 插件元数据
 */
export interface PluginMetadata {
  /** 插件名称 */
  name: string;

  /** 插件版本 */
  version?: string;

  /** 插件描述 */
  description?: string;

  /** 插件作者 */
  author?: string;

  /** 插件依赖 */
  dependencies?: string[];

  /** 插件标签 */
  tags?: string[];

  /** 是否为核心插件 */
  isCore?: boolean;

  /** 插件状态 */
  status: 'registered' | 'loading' | 'loaded' | 'error';

  /** 加载时间 */
  loadTime?: number;

  /** 错误信息 */
  error?: Error;
}

/**
 * 插件生命周期钩子
 */
export interface PluginLifecycleHooks {
  /** 插件注册前 */
  beforeRegister?: (config: PluginConfig) => Promise<void> | void;

  /** 插件注册后 */
  afterRegister?: (config: PluginConfig) => Promise<void> | void;

  /** 插件加载前 */
  beforeLoad?: (config: PluginConfig) => Promise<void> | void;

  /** 插件加载后 */
  afterLoad?: (config: PluginConfig) => Promise<void> | void;

  /** 插件卸载前 */
  beforeUnload?: (config: PluginConfig) => Promise<void> | void;

  /** 插件卸载后 */
  afterUnload?: (config: PluginConfig) => Promise<void> | void;
}

/**
 * 插件上下文
 * 提供给插件的运行时上下文
 */
export interface PluginContext {
  /** 插件名称 */
  name: string;

  /** 插件配置 */
  config: PluginConfig;

  /** DI 容器 */
  container: AwilixContainer;

  /** Fastify 实例 */
  fastify: FastifyInstance;

  /** 日志器 */
  logger: any;

  /** 获取其他插件 */
  getPlugin: (name: string) => PluginMetadata | undefined;

  /** 发送插件事件 */
  emit: (event: string, ...args: any[]) => void;

  /** 监听插件事件 */
  on: (event: string, handler: (...args: any[]) => void) => void;
}

/**
 * 构造函数类型
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * 插件工厂函数类型
 */
export type PluginFactory<T = any> = (options?: T) => StratixPlugin;

/**
 * 插件加载器选项
 */
export interface PluginLoaderOptions {
  /** 插件搜索路径 */
  searchPaths?: string[];

  /** 插件文件模式 */
  patterns?: string[];

  /** 是否递归搜索 */
  recursive?: boolean;

  /** 排除模式 */
  exclude?: string[];

  /** 是否自动加载 */
  autoLoad?: boolean;
}
