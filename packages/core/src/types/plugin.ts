import { InjectionModeType, LifetimeType } from 'awilix';
import type {
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions,
  onErrorAsyncHookHandler,
  onErrorHookHandler,
  onRequestAsyncHookHandler,
  onRequestHookHandler,
  onResponseAsyncHookHandler,
  onResponseHookHandler,
  onSendAsyncHookHandler,
  onSendHookHandler,
  onTimeoutAsyncHookHandler,
  onTimeoutHookHandler,
  preHandlerAsyncHookHandler,
  preHandlerHookHandler,
  preParsingAsyncHookHandler,
  preParsingHookHandler,
  preSerializationAsyncHookHandler,
  preSerializationHookHandler,
  preValidationAsyncHookHandler,
  preValidationHookHandler,
  RouteOptions
} from 'fastify';

import type { PluginMetadata } from 'fastify-plugin';

export const META_PLUGIN = Symbol('plugin-meta');

export type PluginOptions = FastifyPluginOptions & {
  /**
   * 插件前缀
   */
  prefix?: string;

  META_PLUGIN?: PluginMetadata | string;
};

/**
 * StratixPlugin的参数的定义
 */
export type StratixPluginOptions<
  Options extends PluginOptions = PluginOptions
> = Options | ((options: Options) => Options);

/**
 * 泛型插件元组类型，允许任意类型的插件和对应的选项
 */
export type PluginRegistration = readonly [
  plugin: StratixPlugin<StratixPluginOptions<any>>,
  options: StratixPluginOptions<any>
];

/**
 * DI 工厂函数类型定义
 * 支持通过插件选项创建依赖实例
 */
export type DIFactory<T = any, Options = any> =
  | ((
      options?: Options,
      fastify?: import('fastify').FastifyInstance
    ) => T | Promise<T>)
  | ((options?: Options) => T | Promise<T>)
  | (() => T | Promise<T>);

/**
 * DI 注册值类型
 * 支持直接值、类、工厂函数等多种形式
 */
export type DIRegistrationValue<T = any, Options = any> =
  | T // 直接值
  | (new (...args: any[]) => T) // 类构造函数
  | DIFactory<T, Options>; // 工厂函数

/**
 * 扩展的注册项，支持工厂函数
 */
interface ExtendedRegistrationItem<T = any, Options = any> {
  value: DIRegistrationValue<T, Options>;
  options?: RegistrationOptions;
  // 快捷方式
  lifetime?: LifetimeType;
  injectionMode?: InjectionModeType;
}

/**
 * DI 注册配置类型
 */
export type DIRegistrationConfig<Options = any> = {
  [dependencyName: string]:
    | DIRegistrationValue<any, Options>
    | ExtendedRegistrationItem<any, Options>;
};

/**
 * DI 注册选项
 */
export interface RegistrationOptions {
  /**
   * 生命周期
   */
  lifetime?: LifetimeType;

  /**
   * 注入模式
   */
  injectionMode?: InjectionModeType;

  /**
   * 是否覆盖已存在的注册
   */
  override?: boolean;

  /**
   * 异步初始化方法名称
   */
  asyncInit?: string | boolean;

  /**
   * 异步销毁方法名称
   */
  asyncDispose?: string | boolean;

  /**
   * 异步初始化优先级
   */
  asyncInitPriority?: number;

  /**
   * 异步销毁优先级
   */
  asyncDisposePriority?: number;

  /**
   * 是否立即注入
   */
  eagerInject?: boolean | string;

  /**
   * 是否启用此注册
   */
  enabled?: boolean;

  /**
   * 标签列表
   */
  tags?: string[];
}

/**
 * 声明式插件定义
 */
export interface DeclarativePlugin<
  Options extends PluginOptions = Record<never, never>
> {
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
  description: string;

  /**
   * 跳过覆盖
   */
  skipOverride?: boolean | PluginMetadata;

  /**
   * 默认选项
   */
  defaultOptions?: Options;

  /**
   * 路由定义
   */
  routes?: RouteOptions[];

  /**
   * 获取路由定义的函数
   */
  gets?: Omit<RouteOptions, 'method'>[];

  /**
   * 获取路由定义的函数
   */
  posts?: Omit<RouteOptions, 'method'>[];

  /**
   * 删除路由定义的函数
   */
  deletes?: Omit<RouteOptions, 'method'>[];

  /**
   * 获取路由定义的函数
   */
  heads?: Omit<RouteOptions, 'method'>[];

  /**
   * 获取路由定义的函数
   */
  patchs?: Omit<RouteOptions, 'method'>[];

  /**
   * 获取路由定义的函数
   */
  options?: Omit<RouteOptions, 'method'>[];

  /**
   * 获取路由定义的函数
   */
  alls?: Omit<RouteOptions, 'method'>[];

  /**
   * 获取路由定义的函数
   */
  hooks?: {
    name: string;
    handler: (...args: any[]) => any;
  }[];

  /**
   * 请求处理函数
   */
  onRequests?: (onRequestHookHandler | onRequestAsyncHookHandler)[];

  /**
   * 请求预处理函数
   */
  preParsings?: (preParsingHookHandler | preParsingAsyncHookHandler)[];

  /**
   * 请求预验证函数
   */
  preValidations?: (preValidationHookHandler | preValidationAsyncHookHandler)[];

  /**
   * 请求预验证函数
   */
  preHandlers?: (preHandlerHookHandler | preHandlerAsyncHookHandler)[];

  /**
   * 请求预序列化函数
   */
  preSerializations?: (
    | preSerializationHookHandler
    | preSerializationAsyncHookHandler
  )[];

  /**
   * 请求发送函数
   */
  onSends?: (onSendHookHandler | onSendAsyncHookHandler)[];

  /**
   * 请求响应函数
   */
  onResponses?: (onResponseHookHandler | onResponseAsyncHookHandler)[];

  /**
   * 请求错误函数
   */
  onError?: (onErrorHookHandler | onErrorAsyncHookHandler)[];

  /**
   * 请求超时函数
   */
  onTimeouts?: (onTimeoutHookHandler | onTimeoutAsyncHookHandler)[];

  /**
   * 装饰器定义
   */
  decorators?: {
    name: string;
    value: any;
    dependencies?: string[];
  }[];

  /**
   * 装饰请求函数
   */
  decorateRequests?: {
    name: string;
    value: any;
    dependencies?: string[];
  }[];

  /**
   * 装饰响应函数
   */
  decorateResponses?: {
    name: string;
    value: any;
    dependencies?: string[];
  }[];

  /**
   * 注册
   */
  registers?: PluginRegistration[];

  /**
   * DI注册
   */
  diRegisters?: DIRegistrationConfig<Options>;
}

export type StratixPlugin<
  Options extends PluginOptions = Record<never, never>
> =
  | DeclarativePlugin<Options>
  | FastifyPluginAsync<Options>
  | FastifyPluginCallback<Options>;
