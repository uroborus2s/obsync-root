/**
 * Stratix应用接口定义
 */
import { FastifyInstance } from 'fastify';
import { ConfigAPI } from '../config/types.js';
import { StratixPlugin } from '../plugin/types.js';
import { EnvOptions } from '../types/common.js';
import { HookHandler } from '../types/hook.js';
import { LoggerInstance, LoggerOptions } from '../types/logger.js';

/**
 * Stratix应用实例接口
 */
export interface StratixApp {
  /**
   * 应用名称
   */
  readonly name: string;

  /**
   * 配置API
   */
  readonly config: ConfigAPI;

  /**
   * Fastify实例
   */
  readonly fastify: FastifyInstance;

  /**
   * 日志实例
   */
  readonly logger: LoggerInstance;

  /**
   * 注册插件
   * @param plugin 插件
   * @param options 插件配置
   * @returns 应用实例，用于链式调用
   */
  register<T = any>(plugin: StratixPlugin<T>, options?: T): StratixApp;

  /**
   * 检查插件是否已注册
   * @param pluginName 插件名称
   * @returns 是否已注册
   */
  hasPlugin(pluginName: string): boolean;

  /**
   * 使用已注册的插件
   * @param pluginName 插件名称
   * @returns 插件实例
   */
  use<T = any>(pluginName: string): T;

  /**
   * 启动应用
   * @returns 启动后的应用实例
   */
  start(): Promise<StratixApp>;

  /**
   * 关闭应用
   */
  close(): Promise<void>;

  /**
   * 注册钩子
   * @param name 钩子名称
   * @param handler 处理函数
   * @returns 应用实例，用于链式调用
   */
  hook(name: string, handler: HookHandler): StratixApp;

  /**
   * 添加装饰器
   * @param name 装饰器名称
   * @param value 装饰器值
   * @returns 应用实例，用于链式调用
   */
  decorate(name: string, value: any): StratixApp;

  /**
   * 检查装饰器是否存在
   * @param name 装饰器名称
   * @returns 是否存在
   */
  hasDecorator(name: string): boolean;
}

/**
 * 应用创建配置
 */
export interface AppOptions {
  /**
   * 应用名称
   */
  name: string;

  /**
   * 内置插件配置
   */
  plugins?: Record<string, any>;

  /**
   * 应用配置
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

  /**
   * 日志配置
   */
  logger?: LoggerOptions;
}

/**
 * 应用实现类构造选项
 */
export interface StratixAppImplOptions {
  /**
   * 应用名称
   */
  name: string;

  /**
   * Fastify实例
   */
  fastify: FastifyInstance;

  /**
   * 配置API
   */
  config: ConfigAPI;

  /**
   * 日志实例
   */
  logger: LoggerInstance;
}
