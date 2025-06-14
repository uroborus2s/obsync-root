/**
 * 应用核心类型定义
 */
import { FastifyInstance } from 'fastify';
import { EventEmitter } from 'node:events';
import type { DefaultCache } from '../cache/default-cache.js';
import type { CacheManager } from '../cache/memory-cache.js';
import type { AppContextManager } from '../context/app-context.js';
import { StratixConfig } from './config.js';

/**
 * 上下文存储接口
 */
export interface ContextStore {
  /**
   * 设置值
   */
  set(key: string, value: any): void;

  /**
   * 获取值
   */
  get<T = any>(key: string): T;

  /**
   * 检查是否存在
   */
  has(key: string): boolean;

  /**
   * 删除值
   */
  delete(key: string): boolean;

  /**
   * 清空所有值
   */
  clear(): void;
}

/**
 * 扩展点接口
 */
export interface ExtensionPoint {
  /**
   * 扩展点名称
   */
  name: string;

  /**
   * 注册扩展
   */
  register(extension: any): void;

  /**
   * 获取所有扩展
   */
  getExtensions(): any[];

  /**
   * 清空扩展
   */
  clear(): void;
}

/**
 * Stratix应用接口
 */
export interface IStratixApp extends EventEmitter {
  /**
   * 应用配置
   */
  readonly config: StratixConfig;

  /**
   * Fastify实例
   */
  readonly server: FastifyInstance;

  /**
   * 应用上下文管理器
   */
  readonly contextManager: AppContextManager;

  /**
   * 内存缓存管理器
   */
  readonly cacheManager: CacheManager;

  /**
   * 默认缓存实例
   */
  readonly cache: DefaultCache;

  /**
   * 从DI容器解析依赖
   * @param name 依赖名称
   * @returns 解析的依赖实例
   */
  resolve<T = any>(name: string): T;

  /**
   * 从DI容器解析依赖，支持可选解析
   * @param name 依赖名称
   * @param allowUnregistered 是否允许未注册的依赖
   * @returns 解析的依赖实例或undefined
   */
  resolve<T = any>(name: string, allowUnregistered: true): T | undefined;

  /**
   * 检查依赖是否已注册
   * @param name 依赖名称
   * @returns 是否已注册
   */
  hasRegistration(name: string): boolean;

  /**
   * 获取所有已注册的依赖名称
   * @returns 依赖名称数组
   */
  getRegistrationNames(): string[];

  /**
   * 安全解析依赖，如果不存在则返回undefined
   * @param name 依赖名称
   * @returns 解析的依赖或undefined
   */
  tryResolve<T = any>(name: string): T | undefined;

  /**
   * 添加钩子
   */
  addHook(name: string, hook: Function): this;

  /**
   * 注册路由
   */
  route(options: any): this;

  /**
   * 装饰应用实例
   */
  decorate(name: string, value: any): this;

  /**
   * 检查装饰器是否存在
   */
  hasDecorator(name: string): boolean;

  /**
   * 获取装饰器名称列表
   */
  getDecoratorNames(): string[];

  /**
   * 运行应用
   */
  run(): Promise<this>;

  /**
   * 停止应用
   */
  stop(): Promise<void>;
}
