/**
 * Stratix插件加载器
 * 负责从不同来源加载插件
 */
import fs from 'node:fs';
import path from 'node:path';
import { StratixPlugin } from './types.js';

/**
 * 插件加载选项
 */
export interface PluginLoaderOptions {
  /**
   * 插件目录路径
   */
  pluginsDir?: string;

  /**
   * 内部插件路径
   */
  internalPluginsDir?: string;

  /**
   * 自定义插件路径
   */
  customPluginsDir?: string;

  /**
   * 是否禁用内部插件
   */
  disableInternalPlugins?: boolean;

  /**
   * 是否启用自定义插件
   */
  enableCustomPlugins?: boolean;
}

/**
 * 加载插件结果
 */
export interface LoadPluginResult {
  /**
   * 插件对象
   */
  plugin: StratixPlugin;

  /**
   * 插件来源
   */
  source: 'internal' | 'custom' | 'external';
}

/**
 * 插件加载器类
 */
export class PluginLoader {
  /**
   * 应用实例
   */
  private readonly _app: any;

  /**
   * 插件目录路径
   */
  private readonly _pluginsDir: string;

  /**
   * 内部插件目录路径
   */
  private readonly _internalPluginsDir: string;

  /**
   * 自定义插件目录路径
   */
  private readonly _customPluginsDir: string;

  /**
   * 是否禁用内部插件
   */
  private readonly _disableInternalPlugins: boolean;

  /**
   * 是否启用自定义插件
   */
  private readonly _enableCustomPlugins: boolean;

  /**
   * 已加载的内部插件缓存
   */
  private readonly _internalPluginsCache: Map<string, StratixPlugin>;

  /**
   * 已加载的自定义插件缓存
   */
  private readonly _customPluginsCache: Map<string, StratixPlugin>;

  /**
   * 构造函数
   * @param app 应用实例
   * @param options 插件加载选项
   */
  constructor(app: any, options: PluginLoaderOptions = {}) {
    this._app = app;

    // 设置插件目录
    const appRoot = process.cwd();
    this._pluginsDir = options.pluginsDir || path.join(appRoot, 'plugins');
    this._internalPluginsDir =
      options.internalPluginsDir || path.join(appRoot, 'internal-plugins');
    this._customPluginsDir =
      options.customPluginsDir || path.join(appRoot, 'custom-plugins');

    // 配置选项
    this._disableInternalPlugins = options.disableInternalPlugins || false;
    this._enableCustomPlugins = options.enableCustomPlugins || false;

    // 初始化缓存
    this._internalPluginsCache = new Map();
    this._customPluginsCache = new Map();
  }

  /**
   * 加载插件
   * @param pluginName 插件名称
   * @returns 加载结果
   * @throws Error 加载失败时抛出
   */
  loadPlugin(pluginName: string): LoadPluginResult {
    this._app.logger.debug({ pluginName }, '尝试加载插件');

    // 1. 尝试加载内部插件
    if (!this._disableInternalPlugins) {
      const internalPlugin = this._loadInternalPlugin(pluginName);
      if (internalPlugin) {
        this._app.logger.debug({ pluginName }, '成功加载内部插件');
        return {
          plugin: internalPlugin,
          source: 'internal'
        };
      }
    }

    // 2. 尝试加载自定义插件
    if (this._enableCustomPlugins) {
      const customPlugin = this._loadCustomPlugin(pluginName);
      if (customPlugin) {
        this._app.logger.debug({ pluginName }, '成功加载自定义插件');
        return {
          plugin: customPlugin,
          source: 'custom'
        };
      }
    }

    // 3. 尝试加载外部插件
    const externalPlugin = this._loadExternalPlugin(pluginName);
    if (externalPlugin) {
      this._app.logger.debug({ pluginName }, '成功加载外部插件');
      return {
        plugin: externalPlugin,
        source: 'external'
      };
    }

    // 所有来源都加载失败
    throw new Error(`无法加载插件 ${pluginName}，所有来源都失败`);
  }

  /**
   * 获取可用插件列表
   * @returns 插件名称数组
   */
  getAvailablePlugins(): string[] {
    const plugins: string[] = [];

    // 加载内部插件列表
    if (!this._disableInternalPlugins) {
      try {
        if (fs.existsSync(this._internalPluginsDir)) {
          const internalPlugins = fs
            .readdirSync(this._internalPluginsDir)
            .filter((name) => {
              const stat = fs.statSync(
                path.join(this._internalPluginsDir, name)
              );
              return (
                stat.isDirectory() ||
                (stat.isFile() &&
                  (name.endsWith('.js') || name.endsWith('.ts')))
              );
            })
            .map((name) => name.replace(/\.(js|ts)$/, ''));

          plugins.push(...internalPlugins);
        }
      } catch (error) {
        this._app.logger.warn({ error }, '无法读取内部插件目录');
      }
    }

    // 加载自定义插件列表
    if (this._enableCustomPlugins) {
      try {
        if (fs.existsSync(this._customPluginsDir)) {
          const customPlugins = fs
            .readdirSync(this._customPluginsDir)
            .filter((name) => {
              const stat = fs.statSync(path.join(this._customPluginsDir, name));
              return (
                stat.isDirectory() ||
                (stat.isFile() &&
                  (name.endsWith('.js') || name.endsWith('.ts')))
              );
            })
            .map((name) => name.replace(/\.(js|ts)$/, ''));

          plugins.push(...customPlugins);
        }
      } catch (error) {
        this._app.logger.warn({ error }, '无法读取自定义插件目录');
      }
    }

    // 加载外部插件列表
    try {
      if (fs.existsSync(this._pluginsDir)) {
        const externalPlugins = fs
          .readdirSync(this._pluginsDir)
          .filter((name) => {
            const stat = fs.statSync(path.join(this._pluginsDir, name));
            return (
              stat.isDirectory() ||
              (stat.isFile() && (name.endsWith('.js') || name.endsWith('.ts')))
            );
          })
          .map((name) => name.replace(/\.(js|ts)$/, ''));

        plugins.push(...externalPlugins);
      }
    } catch (error) {
      this._app.logger.warn({ error }, '无法读取外部插件目录');
    }

    return [...new Set(plugins)]; // 去重
  }

  /**
   * 加载内部插件
   * @param pluginName 插件名称
   * @returns 加载的插件
   */
  private _loadInternalPlugin(pluginName: string): StratixPlugin | null {
    // 检查缓存
    if (this._internalPluginsCache.has(pluginName)) {
      return this._internalPluginsCache.get(pluginName)!;
    }

    try {
      // 查找插件路径
      const pluginPath = path.join(this._internalPluginsDir, pluginName);

      // 尝试加载插件
      const plugin = this._requirePlugin(pluginPath);

      if (plugin) {
        // 缓存插件
        this._internalPluginsCache.set(pluginName, plugin);
        return plugin;
      }
    } catch (error) {
      this._app.logger.debug({ pluginName, error }, '加载内部插件失败');
    }

    return null;
  }

  /**
   * 加载自定义插件
   * @param pluginName 插件名称
   * @returns 加载的插件
   */
  private _loadCustomPlugin(pluginName: string): StratixPlugin | null {
    // 检查缓存
    if (this._customPluginsCache.has(pluginName)) {
      return this._customPluginsCache.get(pluginName)!;
    }

    try {
      // 查找插件路径
      const pluginPath = path.join(this._customPluginsDir, pluginName);

      // 尝试加载插件
      const plugin = this._requirePlugin(pluginPath);

      if (plugin) {
        // 缓存插件
        this._customPluginsCache.set(pluginName, plugin);
        return plugin;
      }
    } catch (error) {
      this._app.logger.debug({ pluginName, error }, '加载自定义插件失败');
    }

    return null;
  }

  /**
   * 加载外部插件
   * @param pluginName 插件名称
   * @returns 加载的插件
   */
  private _loadExternalPlugin(pluginName: string): StratixPlugin | null {
    try {
      // 首先尝试从插件目录加载
      const pluginPath = path.join(this._pluginsDir, pluginName);
      const plugin = this._requirePlugin(pluginPath);

      if (plugin) {
        return plugin;
      }

      // 然后尝试直接加载模块
      return this._requirePlugin(pluginName);
    } catch (error) {
      this._app.logger.debug({ pluginName, error }, '加载外部插件失败');
      return null;
    }
  }

  /**
   * 加载插件模块
   * @param pluginPath 插件路径
   * @returns 加载的插件
   */
  private _requirePlugin(pluginPath: string): StratixPlugin | null {
    try {
      // 先尝试直接加载模块
      const plugin = require(pluginPath);

      // 如果插件导出了默认模块，则使用默认模块
      const pluginExport = plugin.default || plugin;

      // 检查是否是有效的插件
      if (this._isValidPlugin(pluginExport)) {
        return pluginExport;
      }
    } catch (error) {
      // 加载失败，尝试其他方式
    }

    return null;
  }

  /**
   * 检查是否是有效的插件
   * @param plugin 插件对象
   * @returns 是否是有效的插件
   */
  private _isValidPlugin(plugin: any): plugin is StratixPlugin {
    return (
      plugin && typeof plugin === 'object' && typeof plugin.name === 'string'
    );
  }
}
