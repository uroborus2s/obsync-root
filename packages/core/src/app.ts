import { fastifyAwilixPlugin } from '@fastify/awilix';
import { env } from '@stratix/utils';
import {
  asClass,
  asFunction,
  asValue,
  AwilixContainer,
  createContainer,
  InjectionMode,
  isClass,
  isFunction,
  Lifetime
} from 'awilix';
import { AwilixManager } from 'awilix-manager';
import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import { EventEmitter } from 'node:events';
import { Logger, pino } from 'pino';
import { DefaultCache } from './cache/default-cache.js';
import { CacheManager } from './cache/memory-cache.js';
import {
  EnvLoaderOptions,
  loadAndNormalizeConfig,
  loadEnv
} from './config/index.js';
import { ConfigLoaderOptions } from './config/loader.js';
import { createLoggerConfig } from './config/logger-config.js';
import { AppContextManager } from './context/app-context.js';
import {
  isDeclarativePlugin,
  registerDependencies,
  registerPlugin
} from './plugin-converter.js';
import type { IStratixApp } from './types/app.js';
import type { StratixConfig } from './types/config.js';
import { DIRegisterOptions } from './types/fastify.js';
import { version } from './version.js';

/**
 * Stratix应用实现类 - 轻量级包装，围绕Fastify实例构建
 */
export class StratixApplication extends EventEmitter implements IStratixApp {
  /**
   * 完整配置
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
   * 是否已初始化
   */
  private initialized: boolean;

  /**
   * 是否正在运行
   */
  private running: boolean;

  /**
   *
   */
  private awilixManager: AwilixManager;

  private container: AwilixContainer;

  /**
   * 构造函数
   *
   * @param config 应用配置
   */
  constructor(config: StratixConfig) {
    super();

    // 保存完整配置
    this.config = config;

    // 创建应用上下文管理器
    this.contextManager = new AppContextManager();

    // 创建内存缓存管理器
    this.cacheManager = new CacheManager({
      maxSize: config.cache?.maxSize || 1000,
      defaultTtl: config.cache?.defaultTtl || 300,
      maxMemory: config.cache?.maxMemory || 100 * 1024 * 1024,
      evictionPolicy: config.cache?.evictionPolicy || 'lru',
      cleanupInterval: config.cache?.cleanupInterval || 60000,
      enableStats: config.cache?.enableStats !== false
    });

    // 创建默认缓存实例
    this.cache = new DefaultCache();

    // 创建Fastify实例和配置logger
    const serverOptions: FastifyServerOptions = {};

    // 配置Fastify的logger
    serverOptions.logger = {
      ...createLoggerConfig(config.logger),
      base: {
        app: config.name,
        version: config.version
      }
    };

    // 合并用户自定义的Fastify选项
    if (config.server) {
      Object.assign(serverOptions, config.server);
    }

    // 创建Fastify实例
    this.server = fastify(serverOptions);

    // 设置初始状态
    this.initialized = false;
    this.running = false;

    // 装饰Fastify实例，添加上下文功能
    this.server.decorate('contextManager', this.contextManager);

    // 装饰Fastify实例，添加上下文功能
    this.server.decorate(
      'useContext',
      this.contextManager.getAppContext.bind(this.contextManager)
    );

    this.server.decorate('cache', this.cache);

    this.server.decorate('cacheManager', this.cacheManager);

    this.container = createContainer({
      strict: true,
      injectionMode: InjectionMode.CLASSIC
    });

    const smartRegister = this.createSmartDIRegister(this.container);

    this.server.decorate('registerDI', smartRegister);

    this.server.decorate('tryResolve', this.tryResolve.bind(this));

    // 注册@fastify/awilix插件以提供依赖注入能力
    this.server.register(fastifyAwilixPlugin, { container: this.container });

    this.awilixManager = new AwilixManager({
      diContainer: this.container,
      asyncInit: true,
      asyncDispose: true,
      strictBooleanEnforced: true
    });

    this.container.register({
      app: asValue(this)
    });

    // 注册logger到DI容器
    this.container.register({
      log: asValue(this.server.log)
    });

    // 注册logger到DI容器
    this.container.register({
      useContext: asFunction(
        this.contextManager.getAppContext.bind(this.contextManager)
      )
    });

    // 注册logger到DI容器
    this.container.register({
      cache: asValue(this.cache)
    });

    // 打印启动日志
    this.server.log.info(
      { app: this.config.name, version: this.config.version },
      `Stratix应用创建成功: ${this.config.name}@${this.config.version}`
    );
  }

  public resolve<T = any>(name: string): T;
  public resolve<T = any>(name: string, allowUnregistered: true): T | undefined;
  public resolve<T = any>(
    name: string,
    allowUnregistered?: boolean
  ): T | undefined {
    try {
      this.server.log.debug(`正在解析依赖: ${name}`);

      // 检查依赖是否已注册
      if (!this.container.hasRegistration(name)) {
        if (allowUnregistered) {
          this.server.log.warn(`依赖 '${name}' 未注册，返回 undefined`);
          return undefined;
        }

        const error = new Error(`依赖 '${name}' 未在 DI 容器中注册`);
        this.server.log.error({ error, dependencyName: name }, '依赖解析失败');
        throw error;
      }

      // 使用 DI 容器的 resolve 方法获取注册的对象
      const resolved = this.container.resolve<T>(name, {
        allowUnregistered: allowUnregistered || false
      });

      this.server.log.debug(`成功解析依赖: ${name}`);
      return resolved;
    } catch (error) {
      this.server.log.error(
        { error, dependencyName: name },
        `解析依赖 '${name}' 时发生错误`
      );

      // 如果允许未注册的依赖，返回 undefined
      if (allowUnregistered) {
        return undefined;
      }

      // 重新抛出错误，保持原有的错误处理行为
      throw error;
    }
  }

  /**
   * 检查依赖是否已注册
   * @param name 依赖名称
   * @returns 是否已注册
   */
  public hasRegistration(name: string): boolean {
    return this.container.hasRegistration(name);
  }

  /**
   * 获取所有已注册的依赖名称
   * @returns 依赖名称数组
   */
  public getRegistrationNames(): string[] {
    const registrations = this.container.registrations;
    return Object.keys(registrations);
  }

  /**
   * 安全解析依赖，如果不存在则返回 undefined
   * @param name 依赖名称
   * @returns 解析的依赖或 undefined
   */
  public tryResolve<T = any>(name: string): T | undefined {
    return this.resolve<T>(name, true);
  }

  /**
   * 从名称或函数中推导注册名称
   */
  deriveRegistrationName(target: any, providedName?: string): string {
    if (providedName) {
      return providedName;
    }

    if (typeof target === 'function') {
      const name = target.name;
      if (name) {
        // 将 PascalCase 转换为 camelCase
        return name.charAt(0).toLowerCase() + name.slice(1);
      }
    }

    if (typeof target === 'object' && target !== null) {
      if (target.constructor && target.constructor.name) {
        const name = target.constructor.name;
        return name.charAt(0).toLowerCase() + name.slice(1);
      }
    }

    throw new Error('无法推导注册名称，请提供明确的名称');
  }

  /**
   * 转换生命周期类型
   */
  convertLifetime(lifetime?: string) {
    switch (lifetime) {
      case 'SINGLETON':
        return Lifetime.SINGLETON;
      case 'SCOPED':
        return Lifetime.SCOPED;
      case 'TRANSIENT':
        return Lifetime.TRANSIENT;
      default:
        return Lifetime.SINGLETON;
    }
  }

  /**
   * 智能注册单个依赖
   */
  registerSingle(
    container: AwilixContainer,
    name: string,
    target: any,
    options: DIRegisterOptions = {}
  ): void {
    const lifetime = this.convertLifetime(options.lifetime);
    const registrationName = this.deriveRegistrationName(target, name);

    // 检查是否已存在且不允许覆盖
    if (container.hasRegistration(registrationName) && !options.override) {
      this.server.log.warn(
        `DI 注册名称 '${registrationName}' 已存在，跳过注册`
      );
      return;
    }

    let registration: any;

    if (isClass(target)) {
      // 使用 asClass 注册类
      registration = asClass(target, {
        lifetime,
        asyncInit: options.asyncInit,
        asyncDispose: options.asyncDispose,
        asyncInitPriority: options.asyncInitPriority,
        asyncDisposePriority: options.asyncDisposePriority,
        eagerInject: options.eagerInject,
        enabled: options.enabled
      });
      this.server.log.debug(`使用 asClass 注册: ${registrationName}`);
    } else if (isFunction(target)) {
      // 使用 asFunction 注册工厂函数
      registration = asFunction(target, {
        lifetime,
        asyncInit: options.asyncInit,
        asyncDispose: options.asyncDispose,
        asyncInitPriority: options.asyncInitPriority,
        asyncDisposePriority: options.asyncDisposePriority,
        eagerInject: options.eagerInject,
        enabled: options.enabled
      });
      this.server.log.debug(`使用 asFunction 注册: ${registrationName}`);
    } else {
      // 使用 asValue 注册值
      registration = asValue(target);
      this.server.log.debug(`使用 asValue 注册: ${registrationName}`);
    }

    container.register({
      [registrationName]: registration
    });

    this.server.log.info(`成功注册 DI 依赖: ${registrationName}`);
  }

  /**
   * 创建智能 DI 注册方法
   */
  createSmartDIRegister(container: AwilixContainer) {
    // 使用箭头函数自动绑定 this 上下文
    return (target: any, options?: DIRegisterOptions): void => {
      // 处理不同的输入格式
      if (Array.isArray(target)) {
        // 数组格式: [[name, target, options?], ...]
        for (const item of target) {
          if (Array.isArray(item)) {
            const [name, itemTarget, itemOptions] = item;
            this.registerSingle(container, name, itemTarget, {
              ...options,
              ...itemOptions
            });
          } else {
            throw new Error(
              '数组格式注册时，每个元素必须是 [name, target, options?] 格式'
            );
          }
        }
      } else if (
        typeof target === 'object' &&
        target !== null &&
        !isClass(target) &&
        !options?.name
      ) {
        // 对象格式: { name: target, ... }
        for (const [name, itemTarget] of Object.entries(target)) {
          this.registerSingle(container, name, itemTarget, options);
        }
      } else {
        // 单个目标
        if (!options?.name) {
          throw new Error('注册单个依赖时必须提供名称');
        }
        this.registerSingle(container, options.name, target, options);
      }
    };
  }

  /**
   * 从配置注册插件
   */
  async registerPluginsFromConfig(): Promise<void> {
    this.server.log.debug('从配置文件注册插件...');

    // 注册配置中的 DI 依赖
    if (this.config.diRegisters) {
      this.server.log.debug('注册配置中的 DI 依赖...');
      registerDependencies(this.server, this.config.diRegisters);
    }

    // 注册配置中的插件
    if (this.config.registers && Array.isArray(this.config.registers)) {
      this.server.log.debug(
        `注册配置中的插件: ${this.config.registers.length}个`
      );

      for (const [plugin, options] of this.config.registers) {
        try {
          const pluginName = this.getPluginName(plugin);
          this.server.log.debug(`注册插件: ${pluginName}`);

          await registerPlugin(this.server, plugin, options || {});
        } catch (err) {
          this.server.log.error({ err }, '注册插件失败');
          throw err;
        }
      }
    }
  }

  /**
   * 获取插件名称
   * @param plugin 插件对象
   * @returns 插件名称
   */
  private getPluginName(plugin: any): string {
    if (typeof plugin === 'function') {
      return (
        plugin[Symbol.for('plugin-meta')].name ||
        plugin.name ||
        'anonymous-function-plugin'
      );
    }

    if (typeof plugin === 'object' && plugin !== null) {
      if (plugin.name) {
        return plugin.name;
      }
      if (isDeclarativePlugin(plugin)) {
        return plugin.name;
      }
    }

    return 'unknown-plugin';
  }

  /**
   * 注册事件监听器
   *
   * @param event 事件名称
   * @param listener 事件监听器
   * @returns 应用实例
   */
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  /**
   * 添加生命周期钩子
   *
   * @param name 钩子名称
   * @param hook 钩子函数
   * @returns 应用实例
   */
  addHook(name: string, hook: Function): this {
    // 使用类型断言处理不同类型的钩子
    (this.server as any).addHook(name, hook);
    return this;
  }

  /**
   * 注册路由
   *
   * @param options 路由选项
   * @returns 应用实例
   */
  route(options: any): this {
    this.server.route(options);
    return this;
  }

  /**
   * 装饰应用实例
   *
   * @param name 装饰器名称
   * @param value 装饰器值
   * @returns 应用实例
   */
  decorate(name: string, value: any): this {
    // 使用泛型类型来安全地装饰实例
    this.server.decorate<any>(name, value);
    return this;
  }

  /**
   * 判断是否存在装饰器
   *
   * @param name 装饰器名称
   * @returns 是否存在
   */
  hasDecorator(name: string): boolean {
    return this.server.hasDecorator(name);
  }

  /**
   * 获取所有装饰器名称
   *
   * @returns 装饰器名称数组
   */
  getDecoratorNames(): string[] {
    const names: string[] = [];
    // 只能获取公开的装饰器名称
    for (const key in this.server) {
      if (typeof key === 'string' && key !== 'prototype') {
        names.push(key);
      }
    }
    return names;
  }

  /**
   * 应用初始化
   * @private
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.server.log.debug('应用初始化...');

      // 发出初始化前事件
      this.emit('beforeInit', this);

      // 注册配置中定义的插件
      await this.registerPluginsFromConfig();

      // 注册配置中定义的路由
      await this.registerRoutesFromConfig();

      // 发出初始化后事件
      this.emit('afterInit', this);

      // 标记为已初始化
      this.initialized = true;
      this.server.log.info('应用初始化完成（DI 容器将在启动时初始化）');
    } catch (err) {
      this.server.log.error({ err }, '应用初始化失败');
      throw err;
    }
  }

  /**
   * 执行after回调
   *
   * @param fn 回调函数
   * @returns 应用实例
   */
  async after(fn?: (err?: Error) => void): Promise<this> {
    // 适配回调函数类型
    await this.server.after((err) => {
      if (fn) fn(err || undefined);
    });
    return this;
  }

  /**
   * 执行ready回调
   *
   * @param fn 回调函数
   * @returns 应用实例
   */
  async ready(fn?: (err?: Error) => void): Promise<this> {
    // 适配回调函数类型
    await this.server.ready((err) => {
      if (fn) fn(err || undefined);
    });
    return this;
  }

  /**
   * 启动应用服务器
   *
   * @returns 应用实例
   */
  async run(): Promise<this> {
    if (this.running) return this;

    // 首先初始化应用（注册插件和路由）
    if (!this.initialized) {
      await this.initialize();
    }

    // 🎯 等待所有插件完全就绪
    this.server.log.debug('等待所有插件完成加载...');

    // 发射启动前事件
    this.emit('beforeStart', this);

    // 检查是否有Web插件
    const hasWebPlugin = this.server.hasDecorator('_stratixWebEnabled');

    try {
      if (hasWebPlugin) {
        // Web服务模式 - 使用listen()启动
        // 获取Web配置
        const webConfig = (this.server as any)._stratixWebConfig;

        // 启动HTTP服务
        const address = await this.server.listen(webConfig);

        this.server.log.info(`服务器启动成功 - ${address}`);
      } else {
        // 容器模式 - 只使用ready()初始化
        await this.server.ready();

        this.server.log.info(`应用容器初始化完成`);
      }

      // 🎯 现在执行 DI 容器异步初始化
      try {
        this.server.log.debug('开始执行 DI 容器初始化...');
        await this.awilixManager.executeInit();
        this.running = true;
        this.server.log.info('DI 容器初始化完成');
      } catch (err) {
        this.server.log.error({ err }, 'DI 容器初始化失败');
        throw err;
      }
      return this;
    } catch (err) {
      this.server.log.error(
        { err },
        hasWebPlugin ? '服务器启动失败' : '容器初始化失败'
      );
      throw err;
    }
  }

  /**
   * 停止应用
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    // 发射停止前事件
    this.emit('beforeStop', this);

    try {
      // 执行 DI 容器异步销毁
      await this.awilixManager.executeDispose();
    } catch (err) {
      this.server.log.error({ err }, 'DI 容器销毁失败');
    }

    // 如果有HTTPS服务器，先关闭它
    if ((this.server as any)._httpsServer) {
      await new Promise<void>((resolve) => {
        (this.server as any)._httpsServer.close(() => {
          this.server.log.info('HTTPS服务器已关闭');
          resolve();
        });
      });
    }

    // 关闭Fastify服务器
    await this.server.close();

    this.running = false;

    // 发射停止后事件
    this.emit('afterStop', this);
  }

  /**
   * 从配置注册路由
   * @private
   */
  private async registerRoutesFromConfig(): Promise<void> {
    // 处理全局路由配置
    if (this.config.routes) {
      this.server.log.debug('从配置注册全局路由...');

      // 判断routes是数组还是对象
      if (Array.isArray(this.config.routes)) {
        // 如果routes是数组，直接作为definitions处理
        await this.registerRouteDefinitions(this.config.routes, '');
      } else {
        // 如果routes是对象，解构其属性
        const {
          definitions = [],
          prefix = '',
          autoload = false,
          dir = './routes'
        } = this.config.routes;

        // 处理前缀
        if (prefix) {
          this.server.log.debug(`设置全局路由前缀: ${prefix}`);
        }

        // 注册路由定义
        if (definitions && definitions.length > 0) {
          await this.registerRouteDefinitions(definitions, prefix);
        }

        // 处理自动加载路由
        if (autoload) {
          this.server.log.debug(`自动加载路由目录: ${dir}`);
          try {
            // 暂不实现自动加载路由文件，后续可以添加
            // TODO: 实现自动加载路由文件功能
          } catch (err) {
            this.server.log.error({ err }, `自动加载路由文件失败: ${dir}`);
          }
        }
      }
    }
  }

  /**
   * 注册路由定义
   * @param definitions 路由或路由组定义数组
   * @param globalPrefix 全局前缀
   * @private
   */
  private async registerRouteDefinitions(
    definitions: any[],
    globalPrefix: string = ''
  ): Promise<void> {
    if (
      !definitions ||
      !Array.isArray(definitions) ||
      definitions.length === 0
    ) {
      return;
    }

    for (const definition of definitions) {
      if (!definition) continue;

      // 处理路由组
      if (definition.prefix && Array.isArray(definition.routes)) {
        this.server.log.debug(`注册路由组: ${definition.prefix}`);

        // 合并路由组前缀与全局前缀
        const groupPrefix = globalPrefix
          ? `${globalPrefix}${definition.prefix}`
          : definition.prefix;

        // 注册路由组中的每个路由
        for (const route of definition.routes) {
          await this.registerSingleRoute(route, {
            prefix: groupPrefix,
            preHandler: definition.preHandler,
            config: definition.config
          });
        }
      }
      // 处理单个路由
      else if (
        definition.method &&
        definition.path &&
        (definition.handler || typeof definition.handler === 'string')
      ) {
        await this.registerSingleRoute(definition, { prefix: globalPrefix });
      }
    }
  }

  /**
   * 注册单个路由
   * @param route 路由配置
   * @param options 额外选项，如前缀等
   * @private
   */
  private async registerSingleRoute(
    route: any,
    options: { prefix?: string; preHandler?: any; config?: any } = {}
  ): Promise<void> {
    try {
      // 构建完整路径
      const fullPath = options.prefix
        ? `${options.prefix}${route.path.startsWith('/') ? route.path : `/${route.path}`}`
        : route.path;

      // 处理字符串形式的处理函数
      let handler = route.handler;

      if (typeof handler === 'string') {
        try {
          // 动态导入处理函数
          const module = await import(handler);
          handler = module.default || module;

          if (typeof handler !== 'function') {
            throw new Error(`处理函数必须是函数类型: ${handler}`);
          }
        } catch (err) {
          this.server.log.error({ err }, `加载路由处理函数失败: ${handler}`);
          throw err;
        }
      }

      // 合并预处理中间件
      let preHandler = route.preHandler;

      if (options.preHandler) {
        if (!preHandler) {
          preHandler = options.preHandler;
        } else if (Array.isArray(preHandler)) {
          preHandler = Array.isArray(options.preHandler)
            ? [...options.preHandler, ...preHandler]
            : [options.preHandler, ...preHandler];
        } else {
          preHandler = Array.isArray(options.preHandler)
            ? [...options.preHandler, preHandler]
            : [options.preHandler, preHandler];
        }
      }

      // 合并配置
      const config = { ...(options.config || {}), ...(route.config || {}) };

      // 注册路由
      this.server.route({
        method: route.method,
        url: fullPath,
        handler,
        schema: route.schema,
        preHandler,
        config
      });

      this.server.log.debug(
        `注册路由: ${Array.isArray(route.method) ? route.method.join(', ') : route.method} ${fullPath}`
      );
    } catch (err) {
      this.server.log.error({ err }, `注册路由失败: ${route.path}`);
      throw err;
    }
  }
}

/**
 * Stratix运行选项
 */
export interface StratixRunOptions {
  /**
   * 配置文件路径或加载选项
   */
  config?: ConfigLoaderOptions | string;

  /**
   * 环境变量加载选项
   */
  envOptions?: EnvLoaderOptions;

  /**
   * 日志级别
   */
  loglevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

  /**
   * 生命周期钩子
   */
  hooks?: {
    /**
     * 在配置加载前调用
     */
    beforeConfig?: (logger: Logger) => void | Promise<void>;

    /**
     * 在配置加载后调用
     */
    afterConfig?: (
      config: StratixConfig,
      logger: Logger
    ) => void | Promise<void>;

    /**
     * 在应用创建后调用
     */
    afterCreate?: (app: IStratixApp, logger: Logger) => void | Promise<void>;

    /**
     * 在应用初始化前调用
     */
    beforeInit?: (app: IStratixApp, logger: Logger) => void | Promise<void>;

    /**
     * 在应用初始化后调用
     */
    afterInit?: (app: IStratixApp, logger: Logger) => void | Promise<void>;

    /**
     * 在应用启动前调用
     */
    beforeStart?: (app: IStratixApp, logger: Logger) => void | Promise<void>;

    /**
     * 在应用启动后调用
     */
    afterStart?: (app: IStratixApp, logger: Logger) => void | Promise<void>;
  };
}

/**
 * 运行Stratix应用
 *
 * @param options 运行选项
 * @returns Stratix应用实例
 */
/**
 * 运行Stratix应用（内部实现）
 *
 * @param options 运行选项
 * @returns Stratix应用实例
 * @private
 */
async function run(options?: StratixRunOptions): Promise<IStratixApp> {
  // 默认选项
  const opts = options || {};
  let logger: Logger | null = null;

  try {
    // 1. 配置日志级别
    const loglevel =
      opts.loglevel || (env.isProduction() ? 'info' : 'debug') || 'info';

    // 3. 创建临时日志记录器
    logger = pino({
      level: loglevel,
      base: {
        app: 'stratix-startup',
        version: version
      },
      transport: !env.isProduction()
        ? {
            target: 'pino-pretty',
            options: {
              ignore: 'app,version',
              translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
              colorize: true
            }
          }
        : undefined
    });

    // 2. 加载环境变量
    const envOptions = {
      override: env.isDevelopment(),
      ...opts.envOptions,
      loglevel
    };
    await loadEnv(logger, envOptions);

    logger.debug(`环境变量加载完成, NODE_ENV=${env.getNodeEnv()}`);

    // 4. 触发配置前钩子
    if (opts.hooks?.beforeConfig) {
      await opts.hooks.beforeConfig(logger);
    }

    // 5. 加载配置
    const configOptions = {
      logger,
      isProduction: !env.isProduction(),
      ...(typeof opts.config === 'object'
        ? opts.config
        : { configPath: opts.config })
    };
    const config = await loadAndNormalizeConfig(logger, configOptions);
    logger.debug('应用配置加载完成');

    // 6. 触发配置后钩子
    if (opts.hooks?.afterConfig) {
      await opts.hooks.afterConfig(config, logger);
    }

    // 7. 创建应用实例
    const app = new StratixApplication(config);
    logger.debug(`应用实例创建成功: ${config.name}@${config.version}`);

    // 8. 触发应用创建后钩子
    if (opts.hooks?.afterCreate) {
      await opts.hooks.afterCreate(app, logger);
    }

    // 9. 设置全局错误处理和优雅关闭
    setupGlobalErrorHandlers(app);
    handleGracefulShutdown(app);

    // 10. 注册生命周期钩子
    registerLifecycleHooks(app, logger, opts.hooks);

    // 11. 运行应用
    await app.run();

    // 12. 清理临时资源
    logger = null;

    return app;
  } catch (err) {
    if (logger) {
      logger.error(`启动Stratix应用失败: ${(err as Error).message}`);
    } else {
      console.error(`启动Stratix应用失败:`, err);
    }
    throw err;
  }
}

/**
 * 注册应用生命周期钩子
 *
 * @param app 应用实例
 * @param hooks 钩子配置
 * @private
 */
function registerLifecycleHooks(
  app: IStratixApp,
  logger: Logger,
  hooks?: StratixRunOptions['hooks']
): void {
  if (!hooks) return;

  if (hooks.beforeInit) {
    app.on('beforeInit', () => hooks.beforeInit?.(app, logger));
  }

  if (hooks.afterInit) {
    app.on('afterInit', () => hooks.afterInit?.(app, logger));
  }

  if (hooks.beforeStart) {
    app.on('beforeStart', () => hooks.beforeStart?.(app, logger));
  }

  if (hooks.afterStart) {
    app.on('afterStart', () => hooks.afterStart?.(app, logger));
  }
}

/**
 * 设置全局错误处理器
 */
const setupGlobalErrorHandlers = (app: IStratixApp) => {
  // 处理未捕获的异常
  process.on('uncaughtException', (err) => {
    app.server.log.fatal({ err }, '未捕获的异常');
    // 不立即退出，给日志一点时间写入
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  });

  // 处理未处理的Promise拒绝
  process.on('unhandledRejection', (reason, promise) => {
    app.server.log.error({ reason, promise }, '未处理的Promise拒绝');
  });

  // 处理警告
  process.on('warning', (warning) => {
    app.server.log.warn(warning, '警告');
  });
};

/**
 * 处理优雅关闭
 */
const handleGracefulShutdown = async (app: IStratixApp) => {
  // 在进程退出前关闭应用
  const shutdown = async (signal: string) => {
    app.server.log.info({ signal }, '接收到关闭信号，正在优雅关闭...');
    try {
      await app.stop();
      app.server.log.info('应用已优雅关闭');
      process.exit(0);
    } catch (err) {
      app.server.log.error({ err }, '关闭应用时出错');
      process.exit(1);
    }
  };

  // 监听SIGINT和SIGTERM信号
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

/**
 * Stratix应用类 - 提供基于配置文件的应用创建和运行功能
 *
 * 简化的应用API，只支持通过配置文件创建和运行应用
 */
export class StratixApp {
  /**
   * 运行应用
   *
   * @param options 运行选项，包含配置文件路径等
   * @returns 应用实例
   *
   * @example
   * ```typescript
   * // 使用默认配置文件运行应用
   * await StratixApp.run();
   *
   * // 指定配置文件路径
   * await StratixApp.run({
   *   config: './stratix.config.js'
   * });
   * ```
   */
  static async run(options?: StratixRunOptions): Promise<IStratixApp> {
    return run(options);
  }
}
