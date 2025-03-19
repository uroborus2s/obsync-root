import { AwilixContainer } from 'awilix';
import { HookHandler } from './hooks.js';
import { PluginOptions, StratixPlugin } from './plugin.js';

export interface AppOptions {
  name?: string;
  env?: string;
  defaultPlugins?: string[];
  plugins?: Record<string, any>;
}

export interface ErrorOptions {
  statusCode?: number;
  code?: string;
  [key: string]: any;
}

export type ErrorHandler = (err: Error, req: any, reply: any) => void;
export type ErrorConstructor = new (message: string) => Error;

export interface StratixApp {
  // 基本属性
  name: string;
  env: string;

  // 插件注册
  register(
    plugin: StratixPlugin | Function,
    options?: PluginOptions
  ): StratixApp;

  // 依赖注入
  inject(
    name: string,
    factory: (container: AwilixContainer) => any
  ): StratixApp;
  injectValue(name: string, value: any): StratixApp;
  injectClass(name: string, constructor: any, options?: any): StratixApp;
  resolve<T>(name: string): Promise<T>;

  // 钩子系统
  addHook(name: string, handler: HookHandler): StratixApp;
  runHook(name: string, payload?: any): Promise<void>;

  // 装饰器
  decorate(name: string, value: any): StratixApp;
  hasDecorator(name: string): boolean;

  // 生命周期
  start(): Promise<void>;
  close(): Promise<void>;

  // 错误处理
  setErrorHandler(handler: ErrorHandler): StratixApp;
  createError(name: string, options?: ErrorOptions): ErrorConstructor;

  // 配置
  config<T>(key?: string, defaultValue?: T): T;
  setConfig(key: string, value: any): StratixApp;

  // 索引签名，支持动态属性（插件服务代理）
  [key: string]: any;
}
