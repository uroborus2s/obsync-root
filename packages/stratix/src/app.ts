import { DIContainer } from './di/container.js';
import { ErrorManager } from './errors/handler.js';
import { HooksManager } from './hooks/manager.js';
import { PluginManager } from './plugin-manager.js';
import {
  AppOptions,
  ErrorConstructor,
  ErrorHandler,
  ErrorOptions,
  StratixApp as IStratixApp
} from './types/app.js';
import { HookHandler } from './types/hooks.js';
import { PluginOptions, StratixPlugin } from './types/plugin.js';

export class StratixApp implements IStratixApp {
  // 基本属性
  readonly name: string;
  readonly env: string;

  // 管理器
  private diContainer: DIContainer;
  private hooksManager: HooksManager;
  private errorManager: ErrorManager;
  private pluginManager: PluginManager;

  // 配置
  private configStore: Record<string, any> = {};

  // 装饰器
  private decorators: Map<string, any> = new Map();

  // 插件服务代理
  private pluginProxies: Record<string, any> = {};

  // 应用状态
  private started = false;
  private closed = false;

  constructor(options: AppOptions = {}) {
    // 设置基本属性
    this.name = options.name || 'stratix-app';
    this.env = options.env || process.env.NODE_ENV || 'development';

    // 初始化管理器
    this.diContainer = new DIContainer();
    this.hooksManager = new HooksManager();
    this.errorManager = new ErrorManager();
    this.pluginManager = new PluginManager(this);

    // 注册核心服务
    this.diContainer.injectValue('app', this);
    this.diContainer.inject('config', () => this.configStore);

    // 设置配置
    if (options.plugins) {
      this.configStore.plugins = options.plugins;
    }

    // 加载默认插件
    this.loadDefaultPlugins(options);
  }

  /**
   * 加载默认插件
   */
  private loadDefaultPlugins(options: AppOptions): void {
    const defaultPlugins = options.defaultPlugins || ['logger', 'cron'];

    // 检查是否禁用默认插件
    for (const pluginName of defaultPlugins) {
      const pluginConfig = options.plugins && options.plugins[pluginName];

      // 如果插件配置为false，则禁用
      if (pluginConfig === false) {
        continue;
      }

      // 尝试加载插件
      try {
        // 注意：这里实际项目中应该动态导入插件
        // 由于我们还没有实现默认插件，这里只是占位
        // const plugin = require(`@stratix/${pluginName}`);
        // this.register(plugin, pluginConfig || {});
      } catch (err) {
        console.warn(`Failed to load default plugin '${pluginName}':`, err);
      }
    }
  }

  /**
   * 注册插件
   */
  register(
    plugin: StratixPlugin | Function,
    options: PluginOptions = {}
  ): IStratixApp {
    // 使用插件管理器注册插件
    this.pluginManager.register(plugin, options).catch((err) => {
      console.error(`Failed to register plugin:`, err);
      throw err;
    });

    return this;
  }

  /**
   * 注入工厂函数
   */
  inject(name: string, factory: (container: any) => any): IStratixApp {
    this.diContainer.inject(name, factory);
    return this;
  }

  /**
   * 注入值
   */
  injectValue(name: string, value: any): IStratixApp {
    this.diContainer.injectValue(name, value);
    return this;
  }

  /**
   * 注入类
   */
  injectClass(name: string, constructor: any, options: any = {}): IStratixApp {
    this.diContainer.injectClass(name, constructor, options);
    return this;
  }

  /**
   * 解析依赖
   */
  async resolve<T>(name: string): Promise<T> {
    return this.diContainer.resolve<T>(name);
  }

  /**
   * 添加钩子
   */
  addHook(name: string, handler: HookHandler): IStratixApp {
    this.hooksManager.addHook(name, handler);
    return this;
  }

  /**
   * 执行钩子
   */
  async runHook(name: string, payload?: any): Promise<void> {
    return this.hooksManager.runHook(name, payload);
  }

  /**
   * 添加装饰器
   */
  decorate(name: string, value: any): IStratixApp {
    if (this.hasDecorator(name)) {
      throw new Error(`Decorator '${name}' already exists`);
    }

    this.decorators.set(name, value);

    // 添加到实例
    (this as any)[name] = value;

    return this;
  }

  /**
   * 检查装饰器是否存在
   */
  hasDecorator(name: string): boolean {
    return this.decorators.has(name) || name in this;
  }

  /**
   * 设置错误处理器
   */
  setErrorHandler(handler: ErrorHandler): IStratixApp {
    this.errorManager.setErrorHandler(handler);
    return this;
  }

  /**
   * 创建自定义错误
   */
  createError(name: string, options: ErrorOptions = {}): ErrorConstructor {
    return this.errorManager.createError(name, options);
  }

  /**
   * 获取配置
   */
  config<T>(key?: string, defaultValue?: T): T {
    if (!key) {
      return this.configStore as T;
    }

    const value = key.split('.').reduce((obj, part) => {
      return obj && obj[part] !== undefined ? obj[part] : undefined;
    }, this.configStore);

    return (value !== undefined ? value : defaultValue) as T;
  }

  /**
   * 设置配置
   */
  setConfig(key: string, value: any): IStratixApp {
    const parts = key.split('.');
    let current = this.configStore;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;

    return this;
  }

  /**
   * 启动应用
   */
  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    // 执行beforeStart钩子
    await this.runHook('beforeStart');

    // 标记为已启动
    this.started = true;

    // 执行afterStart钩子
    await this.runHook('afterStart');
  }

  /**
   * 关闭应用
   */
  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    // 执行beforeClose钩子
    await this.runHook('beforeClose');

    // 标记为已关闭
    this.closed = true;

    // 执行afterClose钩子
    await this.runHook('afterClose');
  }

  // 索引签名，支持动态属性（插件服务代理）
  [key: string]: any;
}
