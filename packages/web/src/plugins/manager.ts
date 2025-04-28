/**
 * 插件管理器 - 用于集成Fastify插件
 */

import {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRegisterOptions
} from 'fastify';
import { PluginConfig } from '../types/options.js';

/**
 * 插件管理器
 */
export class PluginManager {
  private fastify: FastifyInstance;
  private registeredPlugins: string[] = [];

  /**
   * 构造函数
   * @param fastify Fastify实例
   */
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * 注册插件
   * @param plugin 插件名称或配置
   * @param options 插件选项
   */
  public async register(
    plugin: string | PluginConfig,
    options?: FastifyPluginOptions
  ): Promise<void> {
    let pluginName: string;
    let pluginOptions: FastifyRegisterOptions<FastifyPluginOptions> = {};
    let isEnabled = true;

    // 处理不同的插件配置格式
    if (typeof plugin === 'string') {
      pluginName = plugin;
      if (options) {
        pluginOptions = { ...pluginOptions, ...options };
      }
    } else {
      pluginName = plugin.name;
      if (plugin.options) {
        pluginOptions = { ...pluginOptions, ...plugin.options };
      }
      if (options) {
        pluginOptions = { ...pluginOptions, ...options };
      }
      isEnabled = plugin.enabled !== false; // 默认启用
    }

    // 如果插件已禁用，则跳过
    if (!isEnabled) {
      return;
    }

    // 防止重复注册
    if (this.registeredPlugins.includes(pluginName)) {
      return;
    }

    try {
      // 尝试动态导入插件模块
      let pluginModule;

      try {
        // 首先尝试直接导入
        pluginModule = await import(pluginName);
      } catch (err) {
        // 如果失败，可能需要添加前缀
        if (!pluginName.startsWith('@fastify/')) {
          try {
            pluginModule = await import(`@fastify/${pluginName}`);
            pluginName = `@fastify/${pluginName}`;
          } catch (innerErr) {
            throw err; // 如果添加前缀后仍然无法导入，抛出原始错误
          }
        } else {
          throw err;
        }
      }

      // 获取默认导出
      const pluginFunction = pluginModule.default || pluginModule;

      // 注册到Fastify
      await this.fastify.register(pluginFunction, pluginOptions);

      // 记录已注册的插件
      this.registeredPlugins.push(pluginName);
    } catch (err) {
      console.error(`Failed to register plugin ${pluginName}:`, err);
      throw err;
    }
  }

  /**
   * 批量注册插件
   * @param plugins 插件配置数组
   */
  public async registerAll(
    plugins: Array<string | PluginConfig>
  ): Promise<void> {
    // 逐个注册插件
    for (const plugin of plugins) {
      await this.register(plugin);
    }
  }

  /**
   * 检查插件是否已注册
   * @param pluginName 插件名称
   */
  public isRegistered(pluginName: string): boolean {
    return this.registeredPlugins.includes(pluginName);
  }

  /**
   * 获取所有已注册的插件
   */
  public getRegisteredPlugins(): string[] {
    return [...this.registeredPlugins];
  }
}
