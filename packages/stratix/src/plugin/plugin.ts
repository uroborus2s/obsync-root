/**
 * Stratix插件管理器
 * 负责插件的注册、初始化和管理
 */
import {
  InvalidPluginConfigError,
  InvalidPluginError,
  PluginAlreadyExistsError,
  PluginDependencyError,
  PluginNotFoundError,
  PluginRegistrationError
} from '../types/errors.js';
import { HookName } from '../types/hook.js';
import { PluginInstance, StratixPlugin } from './types.js';

/**
 * 插件管理器类
 */
export class PluginManager {
  /**
   * 插件映射表
   * 键为插件名称，值为插件实例信息
   */
  private readonly _plugins: Map<string, PluginInstance> = new Map();

  /**
   * 应用实例引用
   */
  private readonly _app: any;

  /**
   * 构造函数
   * @param app 应用实例
   */
  constructor(app: any) {
    this._app = app;
  }

  /**
   * 注册插件
   * @param plugin 插件
   * @param options 插件配置
   * @throws InvalidPluginError 无效的插件
   * @throws PluginAlreadyExistsError 插件已存在
   * @throws PluginDependencyError 插件依赖错误
   * @throws PluginRegistrationError 插件注册错误
   */
  register<T = any>(plugin: StratixPlugin<T>, options?: T): void {
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

    this._app.logger.debug({ plugin: plugin.name }, '注册插件');

    // 验证插件配置
    if (plugin.schema && options) {
      try {
        const isValid = this._app.config.validate(
          plugin.name,
          plugin.schema,
          options
        );
        if (!isValid) {
          throw new InvalidPluginConfigError(`插件 ${plugin.name} 配置无效`);
        }
      } catch (err) {
        this._app.logger.error(
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
    this._app.hook.trigger(HookName.OnRegister).catch((err: Error) => {
      this._app.logger.error({ error: err }, '触发注册钩子时出错');
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
      const result = plugin.register(this._app, options || ({} as T));

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
          this._app.decorate(key, value);
        }
      }

      this._app.logger.debug({ plugin: plugin.name }, '插件注册成功');
    } catch (err) {
      // 注册失败，从插件列表中删除
      this._plugins.delete(plugin.name);

      this._app.logger.error(
        { plugin: plugin.name, error: err },
        '插件注册失败'
      );

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
  has(pluginName: string): boolean {
    return this._plugins.has(pluginName);
  }

  /**
   * 获取插件实例
   * @param pluginName 插件名称
   * @returns 插件实例
   * @throws PluginNotFoundError 插件未找到
   */
  get<T = any>(pluginName: string): T {
    if (!this._plugins.has(pluginName)) {
      throw new PluginNotFoundError(`插件 ${pluginName} 未注册`);
    }

    return this._plugins.get(pluginName) as unknown as T;
  }

  /**
   * 获取所有注册的插件名称
   * @returns 插件名称数组
   */
  getPluginNames(): string[] {
    return Array.from(this._plugins.keys());
  }

  /**
   * 按依赖顺序获取所有插件
   * @returns 依赖顺序的插件数组
   */
  getOrderedPlugins(): PluginInstance[] {
    return Array.from(this._plugins.values());
  }
}
