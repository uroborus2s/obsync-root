/**
 * Stratix应用类实现
 */
import { FastifyInstance } from 'fastify';
import { ConfigAPI } from '../config/types.js';
import { HookManagerImpl } from '../hook/hook.js';
import { HookManager } from '../hook/types.js';
import { PluginInstance, StratixPlugin } from '../plugin/types.js';
import {
  DecoratorAlreadyExistsError,
  InvalidPluginError,
  PluginAlreadyExistsError,
  PluginDependencyError,
  PluginNotFoundError,
  PluginRegistrationError
} from '../types/errors.js';
import { HookName } from '../types/hook.js';
import { LoggerInstance } from '../types/logger.js';
import { StratixApp, StratixAppImplOptions } from './interface.js';

/**
 * Stratix应用实现类
 */
export class StratixAppImpl implements StratixApp {
  /**
   * 应用名称
   */
  readonly name: string;

  /**
   * Fastify实例
   */
  readonly fastify: FastifyInstance;

  /**
   * 配置API
   */
  readonly config: ConfigAPI;

  /**
   * 日志实例
   */
  readonly logger: LoggerInstance;

  /**
   * 插件映射表
   * 键为插件名称，值为插件实例信息
   */
  private readonly _plugins: Map<string, PluginInstance> = new Map();

  /**
   * 钩子管理器
   */
  private readonly _hooks: HookManager;

  /**
   * 装饰器映射表
   * 键为装饰器名称，值为装饰器值
   */
  private readonly _decorations: Map<string, any> = new Map();

  /**
   * 构造函数
   * @param options 应用选项
   */
  constructor(options: StratixAppImplOptions) {
    this.name = options.name;
    this.fastify = options.fastify;
    this.config = options.config;
    this.logger = options.logger;
    this._hooks = new HookManagerImpl();

    // 初始化装饰器
    this._initDecorations();

    this.logger.info({ name: this.name }, '应用实例已创建');
  }

  /**
   * 注册插件
   * @param plugin 插件
   * @param options 插件配置
   * @returns 应用实例，用于链式调用
   * @throws InvalidPluginError 无效的插件
   * @throws PluginAlreadyExistsError 插件已存在
   * @throws PluginDependencyError 插件依赖错误
   * @throws PluginRegistrationError 插件注册错误
   */
  register<T = any>(plugin: StratixPlugin<T>, options?: T): StratixApp {
    // 验证插件
    if (!plugin || typeof plugin !== 'object') {
      throw new InvalidPluginError('插件必须是一个有效的对象');
    }

    if (!plugin.name) {
      throw new InvalidPluginError('插件必须有一个名称');
    }

    // 检查插件是否已注册
    if (this._plugins.has(plugin.name)) {
      throw new PluginAlreadyExistsError(`插件 ${plugin.name} 已经注册`);
    }

    // 记录插件注册
    this.logger.debug({ plugin: plugin.name }, '注册插件');

    // 验证插件配置
    if (plugin.schema && options) {
      try {
        this.config.validate(plugin.name, plugin.schema, options);
      } catch (err) {
        this.logger.error(
          { plugin: plugin.name, error: err },
          '插件配置验证失败'
        );
        throw err;
      }
    }

    // 检查依赖
    if (plugin.dependencies && plugin.dependencies.length > 0) {
      for (const dep of plugin.dependencies) {
        if (!this._plugins.has(dep)) {
          throw new PluginDependencyError(
            `插件 ${plugin.name} 依赖 ${dep}，但它尚未注册`
          );
        }
      }
    }

    // 触发注册钩子
    this._hooks.trigger(HookName.OnRegister).catch((err) => {
      this.logger.error({ error: err }, '触发注册钩子时出错');
    });

    // 创建插件实例信息
    const pluginInstance: PluginInstance = {
      plugin,
      options: options || ({} as T),
      state: 'registered'
    };

    // 保存插件实例
    this._plugins.set(plugin.name, pluginInstance);

    // 执行插件注册函数
    try {
      const result = plugin.register(this, options || ({} as T));

      // 如果返回Promise，等待完成
      if (result instanceof Promise) {
        result.catch((err) => {
          this._plugins.delete(plugin.name);
          throw new PluginRegistrationError(
            `插件 ${plugin.name} 异步注册失败: ${err.message}`,
            err
          );
        });
      }

      // 添加插件提供的装饰器
      if (plugin.decorations) {
        for (const [key, value] of Object.entries(plugin.decorations)) {
          this.decorate(key, value);
        }
      }

      this.logger.debug({ plugin: plugin.name }, '插件注册成功');
      return this;
    } catch (err) {
      // 注册失败，从插件列表中删除
      this._plugins.delete(plugin.name);

      this.logger.error({ plugin: plugin.name, error: err }, '插件注册失败');

      throw new PluginRegistrationError(
        `插件 ${plugin.name} 注册失败: ${(err as Error).message}`,
        err as Error
      );
    }
  }

  /**
   * 检查插件是否已注册
   * @param pluginName 插件名称
   * @returns 是否已注册
   */
  hasPlugin(pluginName: string): boolean {
    return this._plugins.has(pluginName);
  }

  /**
   * 使用已注册的插件
   * @param pluginName 插件名称
   * @returns 插件实例
   * @throws PluginNotFoundError 插件未找到
   */
  use<T = any>(pluginName: string): T {
    if (!this._plugins.has(pluginName)) {
      throw new PluginNotFoundError(`插件 ${pluginName} 未注册`);
    }

    return this._plugins.get(pluginName) as unknown as T;
  }

  /**
   * 启动应用
   * @returns 启动后的应用实例
   */
  async start(): Promise<StratixApp> {
    this.logger.info('正在启动应用...');

    try {
      // 触发启动前钩子
      await this._hooks.trigger(HookName.BeforeStart);

      // 启动Fastify
      await this.fastify.ready();

      // 触发启动后钩子
      await this._hooks.trigger(HookName.AfterStart);

      this.logger.info('应用启动成功');
      return this;
    } catch (err) {
      this.logger.error({ error: err }, '应用启动失败');
      throw err;
    }
  }

  /**
   * 关闭应用
   */
  async close(): Promise<void> {
    this.logger.info('正在关闭应用...');

    try {
      // 触发关闭前钩子
      await this._hooks.trigger(HookName.BeforeClose);

      // 关闭Fastify
      await this.fastify.close();

      // 触发关闭后钩子
      await this._hooks.trigger(HookName.AfterClose);

      this.logger.info('应用已关闭');
    } catch (err) {
      this.logger.error({ error: err }, '应用关闭过程中出错');
      throw err;
    }
  }

  /**
   * 注册钩子
   * @param name 钩子名称
   * @param handler 处理函数
   * @returns 应用实例，用于链式调用
   */
  hook(
    name: string,
    handler: import('../types/hook.js').HookHandler
  ): StratixApp {
    this._hooks.register(name, handler);
    this.logger.debug({ hook: name }, '注册钩子');
    return this;
  }

  /**
   * 添加装饰器
   * @param name 装饰器名称
   * @param value 装饰器值
   * @returns 应用实例，用于链式调用
   * @throws DecoratorAlreadyExistsError 装饰器已存在
   */
  decorate(name: string, value: any): StratixApp {
    if (this.hasDecorator(name)) {
      throw new DecoratorAlreadyExistsError(`装饰器 ${name} 已存在`);
    }

    // 使用Object.defineProperty添加装饰器到实例
    Object.defineProperty(this, name, {
      value,
      writable: false,
      configurable: false,
      enumerable: true
    });

    // 同时保存在映射表中，便于查找
    this._decorations.set(name, value);

    this.logger.debug({ decorator: name }, '添加装饰器');
    return this;
  }

  /**
   * 检查装饰器是否存在
   * @param name 装饰器名称
   * @returns 是否存在
   */
  hasDecorator(name: string): boolean {
    return this._decorations.has(name);
  }

  /**
   * 初始化内置装饰器
   */
  private _initDecorations(): void {
    // 应用信息装饰器
    this._decorations.set('name', this.name);
    this._decorations.set('fastify', this.fastify);
    this._decorations.set('config', this.config);
    this._decorations.set('logger', this.logger);
  }
}
