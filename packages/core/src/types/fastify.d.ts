/**
 * Fastify 类型扩展
 * 为 FastifyInstance 添加 Stratix 框架的装饰器类型定义
 */
import { AwilixContainer } from 'awilix';
import { FastifyBaseLogger } from 'fastify';
import type { DefaultCache } from '../cache/default-cache.js';
import type { CacheManager } from '../cache/memory-cache.js';
import type { AppContextManager } from '../context/app-context.js';

/**
 * DI 注册选项
 */
export interface DIRegisterOptions {
  /**
   * 注册名称（可选，默认从类名或函数名推导）
   */
  name?: string;

  /**
   * 生命周期
   */
  lifetime?: 'SINGLETON' | 'SCOPED' | 'TRANSIENT';

  /**
   * 是否覆盖已存在的注册
   */
  override?: boolean;

  /**
   * 异步初始化方法名称
   * 如果指定，将在容器初始化时调用此方法
   */
  asyncInit?: string | boolean;

  /**
   * 异步销毁方法名称
   * 如果指定，将在容器销毁时调用此方法
   */
  asyncDispose?: string | boolean;

  /**
   * 异步初始化优先级
   * 数值越小越早初始化，默认为 0
   */
  asyncInitPriority?: number;

  /**
   * 异步销毁优先级
   * 数值越小越早销毁，默认为 0
   */
  asyncDisposePriority?: number;

  /**
   * 是否立即注入
   * 如果为 true，将立即构造和缓存实例
   * 如果为字符串，将调用指定的同步方法
   */
  eagerInject?: boolean | string;

  /**
   * 是否启用此注册
   * 可用于条件性禁用某些依赖
   */
  enabled?: boolean;

  /**
   * 标签列表
   * 用于基于标签的依赖查找
   */
  tags?: string[];
}

/**
 * 智能 DI 注册方法类型
 */
export interface SmartDIRegister {
  /**
   * 智能注册单个依赖
   * 自动判断使用 asClass、asFunction 还是 asValue
   */
  (target: any, options?: DIRegisterOptions): void;

  /**
   * 批量智能注册依赖
   */
  (targets: Record<string, any>, options?: DIRegisterOptions): void;

  /**
   * 使用数组格式批量注册
   */
  (targets: Array<[string, any, DIRegisterOptions?]>): void;
}

/**
 * DI 容器管理器接口
 */
export interface DIContainerManager {
  /**
   * 执行异步初始化
   * 按优先级顺序初始化所有启用的依赖
   */
  executeInit(): Promise<void>;

  /**
   * 执行异步销毁
   * 按优先级顺序销毁所有启用的依赖
   */
  executeDispose(): Promise<void>;

  /**
   * 根据标签获取依赖
   */
  getWithTags(tags: string[]): Record<string, any>;

  /**
   * 根据谓词获取依赖
   */
  getByPredicate(predicate: (entry: any) => boolean): Record<string, any>;
}

/**
 * fastify-plugin 包装器选项
 */
export interface FastifyPluginOptions {
  /**
   * 插件名称
   */
  name?: string;

  /**
   * 支持的 Fastify 版本
   */
  fastify?: string;

  /**
   * 插件依赖
   */
  dependencies?: string[];

  /**
   * 装饰器依赖
   */
  decorators?: {
    fastify?: string[];
    reply?: string[];
    request?: string[];
  };

  /**
   * 是否保持封装
   */
  encapsulate?: boolean;
}

/**
 * fastify-plugin 包装器函数类型
 */
export interface FastifyPluginWrapper {
  /**
   * 包装 FastifyPluginCallback
   */
  <Options = Record<string, unknown>>(
    fn: FastifyPluginCallback<Options>,
    options?: FastifyPluginOptions
  ): FastifyPluginCallback<Options>;

  /**
   * 包装 FastifyPluginAsync
   */
  <Options = Record<string, unknown>>(
    fn: FastifyPluginAsync<Options>,
    options?: FastifyPluginOptions
  ): FastifyPluginAsync<Options>;
}

declare module 'fastify' {
  interface FastifyInstance {
    /**
     * Awilix DI 容器实例
     */
    diContainer: AwilixContainer;

    /**
     * 智能 DI 注册方法
     * 自动判断使用 asClass、asFunction 还是 asValue
     */
    registerDI: SmartDIRegister;

    /**
     * DI 容器管理器
     * 提供生命周期管理功能
     */
    diManager: DIContainerManager;

    /**
     * Fastify 日志记录器实例
     * 基于 Pino 的日志记录器，提供结构化日志功能
     */
    log: FastifyBaseLogger;

    /**
     * 上下文管理
     */
    contextManager: AppContextManager;

    /**
     *  内存缓存管理器
     */
    cacheManager: CacheManager;

    /**
     * 默认缓存实例
     */
    cache: DefaultCache;
  }
}

// 重新导出扩展后的 Fastify 类型，使其可以被其他模块导入
export type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest
} from 'fastify';
