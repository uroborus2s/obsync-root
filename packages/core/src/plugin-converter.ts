import { immutableDeepMerge } from '@stratix/utils';
import { isClass } from 'awilix';
import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions,
  RouteOptions
} from 'fastify';
import fp from 'fastify-plugin';
import type {
  DeclarativePlugin,
  PluginOptions,
  StratixPlugin,
  StratixPluginOptions
} from './types/plugin.js';

/**
 * 判断是否为声明式插件
 * @param plugin 插件对象
 * @returns 是否为声明式插件
 */
export function isDeclarativePlugin(
  plugin: StratixPlugin<any>
): plugin is DeclarativePlugin<any> {
  // 如果是函数，则是 Fastify 插件
  if (typeof plugin === 'function') {
    return false;
  }

  // 如果是对象且包含声明式插件的特征属性，则是声明式插件
  if (typeof plugin === 'object' && plugin !== null) {
    const declarativeKeys = [
      'name',
      'version',
      'description',
      'defaultOptions',
      'routes',
      'gets',
      'posts',
      'deletes',
      'heads',
      'patchs',
      'options',
      'alls',
      'hooks',
      'onRequests',
      'preParsings',
      'preValidations',
      'preHandlers',
      'preSerializations',
      'onSends',
      'onResponses',
      'onError',
      'onTimeouts',
      'decorators',
      'decorateRequests',
      'decorateResponses',
      'registers',
      'diRegisters',
      'skipOverride'
    ];

    // 如果包含任何声明式插件的属性，则认为是声明式插件
    return declarativeKeys.some((key) => key in plugin);
  }

  return false;
}

/**
 * 解析插件选项，支持函数形式
 * @param options 插件选项，可以是对象或函数
 * @param parentOptions 父插件的选项（用于函数形式）
 * @returns 解析后的选项
 */
export function resolvePluginOptions<T extends PluginOptions>(
  options: StratixPluginOptions<T>,
  parentOptions?: T
): T {
  if (typeof options === 'function') {
    // 如果是函数，则调用函数并传入父选项
    return options(parentOptions || ({} as T));
  }
  return options;
}

/**
 * 深度合并配置选项
 * @param defaultOptions 默认选项
 * @param userOptions 用户选项
 * @returns 合并后的选项
 */
export function mergeOptions<T extends PluginOptions>(
  defaultOptions: T | undefined,
  userOptions: T
): T {
  if (!defaultOptions) {
    return userOptions;
  }

  // 使用 @stratix/utils 的深度合并功能
  return immutableDeepMerge(defaultOptions, userOptions);
}

/**
 * 智能判断并注册 DI 依赖
 * @param fastify Fastify 实例
 * @param diRegisters DI 注册配置
 * @param options 插件选项，用于工厂函数创建对象
 */
export async function registerDependencies(
  fastify: FastifyInstance,
  diRegisters: { [dependencyName: string]: any } | undefined,
  options?: any
): Promise<void> {
  if (!diRegisters) {
    return;
  }

  // 使用 fastify.registerDI 进行智能注册
  for (const [name, value] of Object.entries(diRegisters)) {
    // 如果是注册项对象（包含 value 和 options）
    if (value && typeof value === 'object' && 'value' in value) {
      const registrationItem = value;
      let actualValue = registrationItem.value;

      // 如果 actualValue 是工厂函数，则调用它并传入 options 和 fastify 实例
      if (typeof actualValue === 'function' && !isClass(actualValue)) {
        try {
          // 检查函数参数数量来决定调用方式
          if (actualValue.length >= 2) {
            // 工厂函数期望接收 options 和 fastify 参数
            actualValue = await actualValue(options, fastify);
          } else if (actualValue.length === 1) {
            // 工厂函数只期望接收 options 参数
            actualValue = await actualValue(options);
          } else {
            // 无参数工厂函数
            actualValue = await actualValue();
          }
        } catch (error) {
          fastify.log.error(
            { error, dependencyName: name },
            `DI 依赖工厂函数创建失败: ${name}`
          );
          throw error;
        }
      }

      // 构建注册选项
      const diOptions = {
        name,
        lifetime:
          registrationItem.lifetime || registrationItem.options?.lifetime,
        override:
          registrationItem.override || registrationItem.options?.override,
        asyncInit:
          registrationItem.asyncInit || registrationItem.options?.asyncInit,
        asyncDispose:
          registrationItem.asyncDispose ||
          registrationItem.options?.asyncDispose,
        asyncInitPriority:
          registrationItem.asyncInitPriority ||
          registrationItem.options?.asyncInitPriority,
        asyncDisposePriority:
          registrationItem.asyncDisposePriority ||
          registrationItem.options?.asyncDisposePriority,
        eagerInject:
          registrationItem.eagerInject || registrationItem.options?.eagerInject,
        enabled:
          registrationItem.enabled !== undefined
            ? registrationItem.enabled
            : registrationItem.options?.enabled,
        tags: registrationItem.tags || registrationItem.options?.tags
      };

      // 使用 registerDI 智能注册
      fastify.registerDI(actualValue, diOptions);
    } else {
      // 直接值，检查是否为工厂函数
      let actualValue = value;

      if (typeof value === 'function' && !isClass(actualValue)) {
        try {
          // 检查函数参数数量来决定调用方式
          if (value.length >= 2) {
            // 工厂函数期望接收 options 和 fastify 参数
            actualValue = await value(options, fastify);
          } else if (value.length === 1) {
            // 工厂函数只期望接收 options 参数
            actualValue = await value(options);
          } else {
            // 可能是类构造函数或无参数工厂函数
            // 通过检查是否有原型来判断是否为类
            if (value.prototype && value.prototype.constructor === value) {
              // 这是一个类构造函数，直接使用
              actualValue = value;
            } else {
              // 这是一个无参数工厂函数
              actualValue = await value();
            }
          }
        } catch (error) {
          fastify.log.error(
            { error, dependencyName: name },
            `DI 依赖工厂函数创建失败: ${name}`
          );
          throw error;
        }
      }

      // 使用 registerDI 进行智能注册
      fastify.registerDI(actualValue, { name });
    }
  }
}

/**
 * 注册路由
 * @param fastify Fastify 实例
 * @param routes 路由配置数组
 * @param prefix 路由前缀
 */
function registerRoutes(
  fastify: FastifyInstance,
  routes: RouteOptions[] | undefined
): void {
  if (!routes || !Array.isArray(routes)) {
    return;
  }

  routes.forEach((route) => {
    // 直接使用 Fastify 内置的 prefix 参数
    const routeConfig = { ...route };
    fastify.route(routeConfig);
  });
}

/**
 * 注册特定方法的路由
 * @param fastify Fastify 实例
 * @param method HTTP 方法
 * @param routeConfigs 路由配置数组
 * @param prefix 路由前缀
 */
function registerMethodRoutes(
  fastify: FastifyInstance,
  method: string,
  routeConfigs: Omit<RouteOptions, 'method'>[] | undefined
): void {
  if (!routeConfigs || !Array.isArray(routeConfigs)) {
    return;
  }

  routeConfigs.forEach((config) => {
    const routeConfig = { ...config };
    // 合并配置并直接传递 prefix 参数
    fastify.route({
      method: method.toUpperCase() as any,
      ...routeConfig
    });
  });
}

/**
 * 注册钩子函数
 * @param fastify Fastify 实例
 * @param hookName 钩子名称
 * @param handlers 处理函数数组
 */
function registerHooks(
  fastify: FastifyInstance,
  hookName: string,
  handlers: Function[] | undefined
): void {
  if (!handlers || !Array.isArray(handlers)) {
    return;
  }

  handlers.forEach((handler) => {
    (fastify as any).addHook(hookName, handler);
  });
}

/**
 * 注册装饰器
 * @param fastify Fastify 实例
 * @param decorators 装饰器配置数组
 */
function registerDecorators(
  fastify: FastifyInstance,
  decorators:
    | Array<{ name: string; value: any; dependencies?: string[] }>
    | undefined
): void {
  if (!decorators || !Array.isArray(decorators)) {
    return;
  }

  decorators.forEach((decorator) => {
    fastify.decorate(decorator.name, decorator.value);
  });
}

/**
 * 注册请求装饰器
 * @param fastify Fastify 实例
 * @param decorators 装饰器配置数组
 */
function registerRequestDecorators(
  fastify: FastifyInstance,
  decorators:
    | Array<{ name: string; value: any; dependencies?: string[] }>
    | undefined
): void {
  if (!decorators || !Array.isArray(decorators)) {
    return;
  }

  decorators.forEach((decorator) => {
    fastify.decorateRequest(decorator.name, decorator.value);
  });
}

/**
 * 注册响应装饰器
 * @param fastify Fastify 实例
 * @param decorators 装饰器配置数组
 */
function registerReplyDecorators(
  fastify: FastifyInstance,
  decorators:
    | Array<{ name: string; value: any; dependencies?: string[] }>
    | undefined
): void {
  if (!decorators || !Array.isArray(decorators)) {
    return;
  }

  decorators.forEach((decorator) => {
    fastify.decorateReply(decorator.name, decorator.value);
  });
}

/**
 * 将声明式插件转换为 Fastify 插件
 * @param declarativePlugin 声明式插件
 * @returns Fastify 插件函数
 */
export function convertDeclarativePlugin<T extends FastifyPluginOptions>(
  declarativePlugin: DeclarativePlugin<T>
): FastifyPluginAsync<T> {
  return async function convertedPlugin(
    fastify: FastifyInstance,
    options: T
  ): Promise<void> {
    // 合并默认选项和用户选项
    const mergedOptions = mergeOptions(
      declarativePlugin.defaultOptions,
      options
    );

    // 注册 DI 依赖
    await registerDependencies(
      fastify,
      declarativePlugin.diRegisters,
      mergedOptions
    );

    // 注册装饰器
    registerDecorators(fastify, declarativePlugin.decorators);
    registerRequestDecorators(fastify, declarativePlugin.decorateRequests);
    registerReplyDecorators(fastify, declarativePlugin.decorateResponses);

    // 注册钩子函数
    registerHooks(fastify, 'onRequest', declarativePlugin.onRequests);
    registerHooks(fastify, 'preParsing', declarativePlugin.preParsings);
    registerHooks(fastify, 'preValidation', declarativePlugin.preValidations);
    registerHooks(fastify, 'preHandler', declarativePlugin.preHandlers);
    registerHooks(
      fastify,
      'preSerialization',
      declarativePlugin.preSerializations
    );
    registerHooks(fastify, 'onSend', declarativePlugin.onSends);
    registerHooks(fastify, 'onResponse', declarativePlugin.onResponses);
    registerHooks(fastify, 'onError', declarativePlugin.onError);
    registerHooks(fastify, 'onTimeout', declarativePlugin.onTimeouts);

    // 注册自定义钩子
    if (declarativePlugin.hooks && Array.isArray(declarativePlugin.hooks)) {
      declarativePlugin.hooks.forEach((hook) => {
        (fastify as any).addHook(hook.name, hook.handler);
      });
    }

    // 注册路由（支持前缀）
    registerRoutes(fastify, declarativePlugin.routes);
    registerMethodRoutes(fastify, 'GET', declarativePlugin.gets);
    registerMethodRoutes(fastify, 'POST', declarativePlugin.posts);
    registerMethodRoutes(fastify, 'DELETE', declarativePlugin.deletes);
    registerMethodRoutes(fastify, 'HEAD', declarativePlugin.heads);
    registerMethodRoutes(fastify, 'PATCH', declarativePlugin.patchs);
    registerMethodRoutes(fastify, 'OPTIONS', declarativePlugin.options);
    registerMethodRoutes(fastify, 'ALL', declarativePlugin.alls);

    // 注册子插件
    if (
      declarativePlugin.registers &&
      Array.isArray(declarativePlugin.registers)
    ) {
      for (const [plugin, pluginOptions] of declarativePlugin.registers) {
        // 解析子插件选项（支持函数形式）
        const resolvedOptions = resolvePluginOptions(
          pluginOptions,
          mergedOptions
        );
        // 使用我们的 registerPlugin 函数来处理子插件
        await registerPlugin(fastify, plugin, resolvedOptions);
      }
    }
  };
}

/**
 * 处理插件注册
 * @param fastify Fastify 实例
 * @param plugin 插件
 * @param options 选项
 */
export async function registerPlugin<T extends FastifyPluginOptions>(
  fastify: FastifyInstance,
  plugin: StratixPlugin<T>,
  options: StratixPluginOptions<T>
): Promise<void> {
  // 解析插件选项（支持函数形式）
  const resolvedOptions = resolvePluginOptions(options);

  let convertedPlugin = plugin as
    | FastifyPluginAsync<T>
    | FastifyPluginCallback<T>;
  if (isDeclarativePlugin(plugin)) {
    // 声明式插件，转换后注册
    convertedPlugin = convertDeclarativePlugin(plugin);
    if (
      plugin.skipOverride === true ||
      typeof plugin.skipOverride === 'object'
    ) {
      // 使用 fastify-plugin 包装
      const fpOptions: any =
        typeof plugin.skipOverride === 'object'
          ? { name: plugin.name, ...plugin.skipOverride }
          : {
              fastify: '>=5.0.0',
              name: plugin.name
            };
      await fastify.register(fp(convertedPlugin, fpOptions), resolvedOptions);
      return;
    }
  }

  await fastify.register(convertedPlugin, resolvedOptions);
}
