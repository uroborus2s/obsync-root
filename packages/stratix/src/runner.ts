import { StratixApp } from './app.js';
import { loadConfig } from './config-loader.js';
import { createApp } from './index.js';
import { createPluginFromConfig, resolvePlugin } from './plugin-factory.js';
import { AppConfig, PluginConfig } from './types/config.js';

/**
 * 加载并注册插件
 */
async function loadAndRegisterPlugins(
  app: StratixApp,
  plugins: PluginConfig[]
): Promise<void> {
  // 首先注册日志插件
  const loggerPluginConfig = plugins.find((p) => p.name === 'logger');

  try {
    if (loggerPluginConfig) {
      // 从配置创建日志插件
      const loggerPlugin = await createPluginFromConfig(loggerPluginConfig);
      await app.register(loggerPlugin, loggerPlugin.options || {});
    } else {
      // 使用外部@stratix/logger插件
      const loggerPlugin = await import('@stratix/logger');
      await app.register(loggerPlugin.default, { level: 'info' });
    }
  } catch (err: any) {
    console.warn(`注册日志插件失败: ${err.message}`);
    console.warn('将使用基本控制台日志记录');

    // 创建一个最基本的日志对象，以防插件加载失败
    const basicLogger = {
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
      trace: console.trace.bind(console),
      child: () => basicLogger
    };

    app.decorate('log', basicLogger);
    app.injectValue('logger', basicLogger);
  }

  // 记录应用启动信息
  app.log.info(`正在启动应用...`);

  // 注册其他插件
  for (const pluginConfig of plugins) {
    // 跳过已经注册的日志插件
    if (pluginConfig.name === 'logger') {
      continue;
    }

    app.log.info(`正在加载插件: ${pluginConfig.name}`);

    try {
      // 检查是否需要从外部加载插件
      if (
        pluginConfig.name.startsWith('@') ||
        pluginConfig.name.includes('/')
      ) {
        // 外部插件，尝试从包或本地路径加载
        const plugin = await resolvePlugin(
          pluginConfig.name,
          pluginConfig.props
        );
        await app.register(plugin, plugin.options || {});
      } else {
        // 内置插件或配置插件
        const plugin = await createPluginFromConfig(pluginConfig);
        await app.register(plugin, plugin.options || {});
      }

      app.log.info(`插件 ${pluginConfig.name} 加载成功`);
    } catch (err: any) {
      app.log.error(`加载插件 ${pluginConfig.name} 失败: ${err.message}`);
      throw err;
    }
  }
}

/**
 * 从配置启动应用
 */
export async function runFromConfig(config?: AppConfig): Promise<StratixApp> {
  // 如果没有提供配置，从文件加载
  const appConfig = config || (await loadConfig());

  // 创建应用实例
  const app = createApp({
    name: appConfig.name,
    env: appConfig.env
  });

  // 加载并注册插件
  await loadAndRegisterPlugins(app, appConfig.plugins);

  // 启动应用
  await app.start();
  app.log.info(`应用 ${appConfig.name} 已成功启动`);

  return app;
}

/**
 * 运行应用
 */
export async function run(configPath?: string): Promise<StratixApp> {
  try {
    // 从配置文件加载配置
    const config = await loadConfig(configPath);

    // 从配置启动应用
    return await runFromConfig(config);
  } catch (err: any) {
    console.error(`应用启动失败: ${err.message}`);
    throw err;
  }
}
