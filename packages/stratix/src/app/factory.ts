/**
 * 应用工厂函数实现
 */
import { file } from '@stratix/utils';
import fastify, { FastifyLoggerOptions } from 'fastify';
import fs from 'node:fs';
import { resolve } from 'node:path';
import pino from 'pino';
import { ConfigImpl } from '../config/config.js';
import { ConfigLoader } from '../config/loader.js';
import { LoggerConfig } from '../logger/logger.js';
import { StratixAppImpl } from './app.js';
import { AppOptions, StratixApp } from './interface.js';

/**
 * 创建应用实例
 * @param options 应用选项
 * @returns 应用实例
 */
export function createApp(options: AppOptions): StratixApp {
  // 验证必要选项
  if (!options || typeof options !== 'object') {
    throw new Error('应用选项必须是一个对象');
  }

  if (!options.name) {
    throw new Error('应用必须有一个名称');
  }

  // 加载配置
  const configLoader = new ConfigLoader({
    config: options.config,
    configPath: options.configPath,
    env: options.env
  });

  const configData = configLoader.load();
  const config = new ConfigImpl(configData);

  // 创建Fastify实例，配置日志
  const loggerConfig = (options.logger ||
    config.get('logger', {})) as LoggerConfig;
  const fastifyInstance = fastify({
    logger: {
      level: loggerConfig.level || 'info',
      transport: loggerConfig.prettyPrint
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname'
            }
          }
        : undefined,
      serializers: {
        err: pino.stdSerializers.err,
        ...loggerConfig.serializers
      }
    } as FastifyLoggerOptions
  });

  // 创建应用实例，使用 Fastify 的内置日志
  const app = new StratixAppImpl({
    name: options.name,
    fastify: fastifyInstance,
    config,
    logger: fastifyInstance.log
  });

  // 注册内置插件
  if (options.plugins) {
    for (const [pluginName, pluginOptions] of Object.entries(options.plugins)) {
      try {
        // 尝试从node_modules加载内置插件
        const pluginPath = `@stratix/${pluginName}`;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const plugin = require(pluginPath);
        app.register(plugin, pluginOptions);
      } catch (err) {
        // 如果不是npm包，尝试从框架内部加载
        try {
          // 获取当前文件的目录
          const currentDir = file.getCurrentDirname(import.meta.url);

          // 构建内置插件路径
          const internalPluginPath = resolve(
            currentDir,
            `../plugins/${pluginName}/index.js`
          );

          // 使用同步版本的exists函数
          if (fs.existsSync(internalPluginPath)) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const plugin = require(internalPluginPath);
            app.register(plugin, pluginOptions);
          } else {
            fastifyInstance.log.warn(
              { plugin: pluginName },
              `无法加载内置插件: ${pluginName}`
            );
          }
        } catch (internalErr) {
          fastifyInstance.log.error(
            { plugin: pluginName, error: internalErr },
            `加载内置插件失败: ${pluginName}`
          );
        }
      }
    }
  }

  return app;
}

/**
 * 从配置文件创建应用
 * @param configPath 配置文件路径
 * @param options 额外选项
 * @returns 应用实例
 */
export async function createAppFromConfig(
  configPath: string,
  options: Partial<AppOptions> = {}
): Promise<StratixApp> {
  // 加载配置文件
  const configLoader = new ConfigLoader({
    configPath,
    env: options.env || true
  });

  const config = configLoader.load();

  // 合并选项
  const mergedOptions: AppOptions = {
    ...config,
    ...options,
    name: options.name || config.name
  };

  // 确保应用有名称
  if (!mergedOptions.name) {
    throw new Error('应用配置必须包含名称');
  }

  return createApp(mergedOptions);
}
