import { StratixApp } from './types/app.js';
import {
  PluginOptions,
  PluginRegisterFunction,
  StratixPlugin
} from './types/plugin.js';

export class PluginManager {
  private plugins: Map<string, StratixPlugin> = new Map();
  private app: StratixApp;

  constructor(app: StratixApp) {
    this.app = app;
  }

  /**
   * 规范化插件对象
   */
  private normalizePlugin(
    plugin: StratixPlugin | Function,
    options: PluginOptions = {}
  ): StratixPlugin {
    if (typeof plugin === 'function') {
      return {
        name: plugin.name || `anonymous-${Date.now()}`,
        register: plugin as PluginRegisterFunction,
        options
      };
    }

    return {
      ...plugin,
      options: { ...plugin.options, ...options }
    };
  }

  /**
   * 检查插件依赖
   */
  private checkPluginDependencies(plugin: StratixPlugin): void {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      return;
    }

    for (const dependency of plugin.dependencies) {
      if (!this.plugins.has(dependency)) {
        throw new Error(
          `Plugin '${plugin.name}' depends on '${dependency}', but it is not registered.`
        );
      }
    }
  }

  /**
   * 注册插件
   */
  async register(
    plugin: StratixPlugin | Function,
    options: PluginOptions = {}
  ): Promise<void> {
    // 规范化插件
    const normalizedPlugin = this.normalizePlugin(plugin, options);

    // 检查插件依赖
    this.checkPluginDependencies(normalizedPlugin);

    // 执行钩子
    await this.app.runHook('beforeRegister', { plugin: normalizedPlugin });

    // 执行插件注册函数
    await normalizedPlugin.register(this.app, normalizedPlugin.options || {});

    // 存储插件
    this.plugins.set(normalizedPlugin.name, normalizedPlugin);

    // 执行钩子
    await this.app.runHook('afterRegister', { plugin: normalizedPlugin });
  }

  /**
   * 获取已注册的插件
   */
  getPlugin(name: string): StratixPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * 获取所有已注册的插件
   */
  getAllPlugins(): StratixPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 检查插件是否已注册
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }
}
