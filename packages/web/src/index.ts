/**
 * @stratix/web 插件
 * 基于Fastify构建的高性能Web服务组件
 */

import { register } from './core/plugin.js';
import { WebPluginOptions } from './types/options.js';

// 导出类型
export * from './types/index.js';

// 导出核心组件
export { Server } from './core/server.js';
export { HooksManager, HookType } from './hooks/manager.js';
export { MiddlewareManager } from './middleware/middleware.js';
export { PluginManager } from './plugins/manager.js';
export { Router } from './router/router.js';
export {
  addSchema,
  SchemaManager,
  transformSchema
} from './schema/validator.js';

// 导出Helmet插件
export { DEFAULT_HELMET_OPTIONS, registerHelmet } from './plugins/helmet.js';

// 导出基础插件集成
export {
  configureHttps,
  registerCompression,
  registerCors,
  registerIntegrations,
  registerStatic,
  registerSwagger
} from './plugins/integrations.js';

/**
 * Stratix Web插件定义
 */
const webPlugin = {
  name: 'web',
  dependencies: ['core'],
  optionalDependencies: ['logger'],
  register: register,

  /**
   * 验证配置的Schema
   */
  schema: {
    type: 'object',
    properties: {
      server: {
        type: 'object',
        properties: {
          port: { type: 'number' },
          host: { type: 'string' },
          logger: { type: ['boolean', 'object'] },
          https: { type: 'object' }
        }
      },
      routes: {
        type: 'object',
        properties: {
          prefix: { type: 'string' }
        }
      },
      middleware: {
        type: 'object'
      },
      plugins: {
        type: 'array'
      },
      errorHandler: {
        type: 'function'
      },
      healthCheck: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          handler: { type: 'function' }
        }
      },
      websocket: {
        type: ['boolean', 'object']
      },
      helmet: {
        type: ['boolean', 'object'],
        description: '配置Helmet安全插件，默认启用。设置为false禁用'
      },
      cors: {
        type: ['boolean', 'object'],
        description: '配置CORS，默认不启用。设置为true启用默认配置'
      },
      compression: {
        type: ['boolean', 'object'],
        description: '配置压缩，默认不启用。设置为true启用默认配置'
      },
      swagger: {
        type: ['boolean', 'object'],
        description: '配置Swagger文档，默认不启用。设置为true启用默认配置'
      },
      static: {
        type: ['object', 'array'],
        description: '配置静态文件服务'
      }
    }
  }
};

export default webPlugin;

/**
 * 工厂函数，用于创建带有自定义选项的插件实例
 * @param factoryOptions 工厂配置选项
 */
export function createWebPlugin(factoryOptions: WebPluginOptions = {}) {
  return {
    ...webPlugin,
    register: async (app: any, options: WebPluginOptions = {}) => {
      // 合并工厂选项和注册选项
      const mergedOptions = {
        ...factoryOptions,
        ...options,
        // 深度合并某些选项
        server: {
          ...(factoryOptions.server || {}),
          ...(options.server || {})
        }
      };

      await register(app, mergedOptions);
    }
  };
}
