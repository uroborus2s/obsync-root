import { PluginConfig } from './types/config.js';
import { PluginOptions, StratixPlugin } from './types/plugin.js';

/**
 * 从配置创建插件
 */
export async function createPluginFromConfig(
  config: PluginConfig
): Promise<StratixPlugin> {
  // 如果有自定义工厂函数，使用它创建插件
  if (config.factory && typeof config.factory === 'function') {
    const plugin = await config.factory(config.props || {});

    // 确保插件有正确的名称
    if (plugin && typeof plugin === 'object') {
      plugin.name = plugin.name || config.name;
      return plugin as StratixPlugin;
    }
  }

  // 如果没有自定义工厂函数或工厂函数没有返回有效插件，创建一个基本插件
  const options: PluginOptions = config.options || {};

  // 将props合并到options
  if (config.props) {
    Object.assign(options, config.props);
  }

  return {
    name: config.name,
    dependencies: config.dependencies || [],
    options,
    register: async (app, opts) => {
      // 基本插件注册逻辑
      app.log && app.log.info(`插件 ${config.name} 已注册`);
    }
  };
}

/**
 * 尝试加载外部插件
 */
export async function resolvePlugin(
  pluginName: string,
  props?: Record<string, any>
): Promise<StratixPlugin> {
  try {
    // 尝试导入插件模块
    const pluginModule = await import(pluginName);

    // 检查模块是否有默认导出或工厂函数
    if (pluginModule.default) {
      if (typeof pluginModule.default === 'function') {
        // 如果默认导出是函数，调用它创建插件
        return await pluginModule.default(props || {});
      } else if (typeof pluginModule.default === 'object') {
        // 如果默认导出是对象，直接使用
        return pluginModule.default as StratixPlugin;
      }
    }

    // 如果模块有createPlugin导出，使用它
    if (
      pluginModule.createPlugin &&
      typeof pluginModule.createPlugin === 'function'
    ) {
      return await pluginModule.createPlugin(props || {});
    }

    throw new Error(`插件模块 ${pluginName} 没有有效的导出`);
  } catch (err: any) {
    throw new Error(`加载插件 ${pluginName} 失败: ${err.message}`);
  }
}
