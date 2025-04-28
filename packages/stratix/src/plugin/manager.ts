/**
 * Stratix插件管理器
 * 负责管理框架中所有已注册的插件
 */
import {
  LoadPluginResult,
  PluginLoader,
  PluginLoaderOptions
} from './loader.js';
import { resolvePluginDependencies } from './resolver.js';
import {
  PluginInstance,
  PluginLifecycleState,
  StratixPlugin
} from './types.js';

/**
 * 插件管理器选项
 */
export interface PluginManagerOptions extends PluginLoaderOptions {
  /**
   * 自动启用插件
   */
  autoEnable?: boolean;
}

/**
 * 插件信息
 */
export interface PluginInfo {
  /**
   * 插件名称
   */
  name: string;

  /**
   * 插件实例
   */
  plugin: StratixPlugin;

  /**
   * 插件状态
   */
  state: PluginLifecycleState;

  /**
   * 插件来源
   */
  source: 'internal' | 'custom' | 'external';

  /**
   * 错误信息（如果有）
   */
  error?: Error;
}

/**
 * 插件管理器类
 */
export class PluginManager {
  /**
   * 插件加载器
   */
  private readonly _loader: PluginLoader;

  /**
   * 插件映射表
   */
  private readonly _plugins: Map<string, PluginInfo>;

  /**
   * 应用实例
   */
  private readonly _app: any;

  /**
   * 自动启用插件
   */
  private readonly _autoEnable: boolean;

  /**
   * 构造函数
   * @param app 应用实例
   * @param options 插件管理器选项
   */
  constructor(app: any, options: PluginManagerOptions = {}) {
    this._app = app;
    this._plugins = new Map();
    this._loader = new PluginLoader(app, options);
    this._autoEnable = options.autoEnable ?? true;
  }

  /**
   * 注册插件
   * @param pluginName 插件名称
   * @returns 插件信息
   */
  register(pluginName: string): PluginInfo {
    // 检查插件是否已注册
    if (this._plugins.has(pluginName)) {
      return this._plugins.get(pluginName)!;
    }

    this._app.logger.debug({ pluginName }, '注册插件');

    try {
      // 加载插件
      const result: LoadPluginResult = this._loader.loadPlugin(pluginName);
      const plugin = result.plugin;

      // 验证插件格式
      this._validatePlugin(plugin, pluginName);

      // 创建插件信息
      const pluginInfo: PluginInfo = {
        name: pluginName,
        plugin,
        state: PluginLifecycleState.REGISTERED,
        source: result.source
      };

      // 存储插件信息
      this._plugins.set(pluginName, pluginInfo);

      // 如果配置了自动启用，则尝试启用插件
      if (this._autoEnable) {
        this.enable(pluginName);
      }

      return pluginInfo;
    } catch (error) {
      // 创建错误插件信息
      const pluginInfo: PluginInfo = {
        name: pluginName,
        plugin: {
          name: pluginName,
          version: '0.0.0',
          description: '加载失败的插件',
          register: () => {
            throw new Error(`插件 ${pluginName} 加载失败，无法注册`);
          }
        },
        state: PluginLifecycleState.FAILED,
        source: 'external',
        error: error instanceof Error ? error : new Error(String(error))
      };

      // 存储错误插件信息
      this._plugins.set(pluginName, pluginInfo);

      // 记录错误
      this._app.logger.error({ pluginName, error }, '注册插件失败');

      return pluginInfo;
    }
  }

  /**
   * 批量注册插件
   * @param pluginNames 插件名称数组
   * @returns 插件信息数组
   */
  registerAll(pluginNames: string[]): PluginInfo[] {
    return pluginNames.map((name) => this.register(name));
  }

  /**
   * 启用插件
   * @param pluginName 插件名称
   * @returns 插件信息
   */
  enable(pluginName: string): PluginInfo {
    // 获取插件信息
    const pluginInfo = this._getPluginInfo(pluginName);

    // 如果插件已经启用，则直接返回
    if (pluginInfo.state === PluginLifecycleState.ENABLED) {
      return pluginInfo;
    }

    try {
      // 获取插件实例
      const plugin = pluginInfo.plugin;

      // 检查依赖
      if (plugin.dependencies && plugin.dependencies.length > 0) {
        // 确保所有依赖已启用
        for (const depName of plugin.dependencies) {
          const depInfo = this._plugins.get(depName);
          if (depInfo && depInfo.state !== PluginLifecycleState.ENABLED) {
            this.enable(depName);
          }
        }
      }

      // 更新插件状态为启用
      pluginInfo.state = PluginLifecycleState.ENABLED;
      this._app.logger.info({ pluginName }, '成功启用插件');

      return pluginInfo;
    } catch (error) {
      // 更新插件状态为失败
      pluginInfo.state = PluginLifecycleState.FAILED;
      pluginInfo.error =
        error instanceof Error ? error : new Error(String(error));

      // 记录错误
      this._app.logger.error({ pluginName, error }, '启用插件失败');

      return pluginInfo;
    }
  }

  /**
   * 批量启用插件
   * @param pluginNames 插件名称数组
   * @returns 插件信息数组
   */
  enableAll(pluginNames: string[]): PluginInfo[] {
    // 注册所有插件
    pluginNames.forEach((name) => this.register(name));

    // 创建映射表用于解析依赖关系
    const pluginsMap = new Map<string, PluginInstance>();

    // 填充映射表
    for (const name of pluginNames) {
      const info = this._plugins.get(name);
      if (info) {
        pluginsMap.set(name, {
          plugin: info.plugin,
          options: {},
          state: 'registered'
        });
      }
    }

    // 获取正确的启用顺序
    const order = resolvePluginDependencies(pluginsMap, pluginNames);

    // 按顺序启用插件
    return order.map((name) => this.enable(name));
  }

  /**
   * 禁用插件
   * @param pluginName 插件名称
   * @returns 插件信息
   */
  disable(pluginName: string): PluginInfo {
    // 获取插件信息
    const pluginInfo = this._getPluginInfo(pluginName);

    // 如果插件没有启用，则直接返回
    if (pluginInfo.state !== PluginLifecycleState.ENABLED) {
      return pluginInfo;
    }

    try {
      // 更新插件状态
      pluginInfo.state = PluginLifecycleState.REGISTERED;
      this._app.logger.info({ pluginName }, '成功禁用插件');

      return pluginInfo;
    } catch (error) {
      // 记录错误，但不更改插件状态
      this._app.logger.error({ pluginName, error }, '禁用插件失败');

      return pluginInfo;
    }
  }

  /**
   * 获取已注册的插件
   * @param includeFailedPlugins 是否包含加载失败的插件
   * @returns 插件信息数组
   */
  getPlugins(includeFailedPlugins = false): PluginInfo[] {
    const plugins: PluginInfo[] = [];

    this._plugins.forEach((info) => {
      if (includeFailedPlugins || info.state !== PluginLifecycleState.FAILED) {
        plugins.push(info);
      }
    });

    return plugins;
  }

  /**
   * 获取插件信息
   * @param pluginName 插件名称
   * @returns 插件信息
   * @throws Error 插件未注册时抛出
   */
  private _getPluginInfo(pluginName: string): PluginInfo {
    // 检查插件是否已注册
    if (!this._plugins.has(pluginName)) {
      this.register(pluginName);
    }

    return this._plugins.get(pluginName)!;
  }

  /**
   * 验证插件格式
   * @param plugin 插件对象
   * @param pluginName 插件名称
   * @throws Error 验证失败时抛出
   */
  private _validatePlugin(plugin: StratixPlugin, pluginName: string): void {
    // 检查必要字段
    if (!plugin.name) {
      throw new Error(`插件 ${pluginName} 缺少 name 字段`);
    }

    if (!plugin.version) {
      throw new Error(`插件 ${pluginName} 缺少 version 字段`);
    }

    // 验证注册函数
    if (!plugin.register || typeof plugin.register !== 'function') {
      throw new Error(`插件 ${pluginName} 的 register 必须是函数`);
    }

    // 验证依赖项格式
    if (plugin.dependencies && !Array.isArray(plugin.dependencies)) {
      throw new Error(`插件 ${pluginName} 的 dependencies 必须是数组`);
    }

    // 验证可选依赖项格式
    if (
      plugin.optionalDependencies &&
      !Array.isArray(plugin.optionalDependencies)
    ) {
      throw new Error(`插件 ${pluginName} 的 optionalDependencies 必须是数组`);
    }

    // 验证装饰器格式
    if (plugin.decorations && typeof plugin.decorations !== 'object') {
      throw new Error(`插件 ${pluginName} 的 decorations 必须是对象`);
    }

    // 验证schema格式
    if (plugin.schema && typeof plugin.schema !== 'object') {
      throw new Error(`插件 ${pluginName} 的 schema 必须是对象`);
    }
  }

  /**
   * 获取可用的内置和自定义插件
   * @returns 插件名称数组
   */
  getAvailablePlugins(): string[] {
    return this._loader.getAvailablePlugins();
  }
}
