/**
 * @stratix/database 插件实现
 */

import { createDatabaseAPI } from './api/factory.js';
import { DatabaseConfig } from './types/database.js';

// 默认配置
export const DEFAULT_DATABASE_OPTIONS: Partial<DatabaseConfig> = {
  debug: process.env.NODE_ENV === 'development',
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'stratix'
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    tableName: 'migrations'
  }
};

// 简单的对象合并函数
function merge<T extends Record<string, any>>(target: T, ...sources: any[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        merge(target[key] as Record<string, any>, source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return merge(target, ...sources);
}

// 检查是否为对象
function isObject(item: any): item is Record<string, any> {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 数据库插件注册函数
 */
export async function register(
  app: any,
  options: DatabaseConfig = {} as DatabaseConfig
): Promise<void> {
  // 合并配置选项
  const config = merge({} as DatabaseConfig, DEFAULT_DATABASE_OPTIONS, options);

  // 创建数据库API
  const database = createDatabaseAPI(config);

  // 注册到应用实例中
  app.decorate('database', database);

  // 如果应用有容器，注册为服务
  if (app.container) {
    app.container.registerInstance('database', database);
    app.container.registerValue('DatabaseAPI', database);
  }

  // 注册钩子，在应用退出前关闭数据库连接
  if (app.hook) {
    app.hook.register('beforeExit', async () => {
      try {
        await database.close();
      } catch (error) {
        console.error('关闭数据库连接时出错:', error);
      }
    });
  }

  // 初始化数据库连接
  try {
    // 获取默认连接并连接
    const defaultConnection = database.connection();
    await defaultConnection.connect();

    // 执行onConnect回调（如果存在）
    if (config.onConnect && typeof config.onConnect === 'function') {
      // 创建一个上下文对象传递给onConnect回调
      const context = {
        app,
        database,
        config
      };
      await config.onConnect(context);
    }

    // 记录连接成功
    if (app.log && app.log.info) {
      app.log.info('数据库连接成功');
    } else {
      console.log('数据库连接成功');
    }
  } catch (error) {
    // 记录连接错误
    if (app.log && app.log.error) {
      app.log.error('数据库连接失败:', error);
    } else {
      console.error('数据库连接失败:', error);
    }

    // 重新抛出错误
    throw error;
  }
}

/**
 * 数据库插件定义
 */
const databasePlugin = {
  name: 'database',
  dependencies: ['core'],
  optionalDependencies: ['logger', 'container', 'cache'],
  register,

  /**
   * 预置配置验证Schema
   */
  schema: {
    type: 'object',
    properties: {
      client: { type: 'string' },
      debug: { type: 'boolean' },
      connection: {
        oneOf: [
          { type: 'string' },
          {
            type: 'object',
            properties: {
              host: { type: 'string' },
              port: { type: 'number' },
              user: { type: 'string' },
              password: { type: 'string' },
              database: { type: 'string' }
            }
          }
        ]
      },
      pool: {
        type: 'object',
        properties: {
          min: { type: 'number' },
          max: { type: 'number' }
        }
      },
      migrations: {
        type: 'object',
        properties: {
          tableName: { type: 'string' },
          directory: { type: 'string' },
          autoGenerate: { type: 'boolean' }
        }
      },
      seeds: {
        type: 'object',
        properties: {
          directory: { type: 'string' }
        }
      },
      models: {
        type: 'object',
        properties: {
          directory: { type: 'string' },
          baseClass: { type: 'string' },
          autoRegister: { type: 'boolean' }
        }
      },
      cache: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          ttl: { type: 'number' }
        }
      }
    }
  }
};

export default databasePlugin;

/**
 * 工厂函数，用于创建带有自定义选项的插件实例
 * @param factoryOptions 工厂配置选项
 */
export function createDatabasePlugin(
  factoryOptions: DatabaseConfig = {} as DatabaseConfig
) {
  return {
    ...databasePlugin,
    register: async (
      app: any,
      options: DatabaseConfig = {} as DatabaseConfig
    ) => {
      // 合并工厂选项和注册选项
      const mergedOptions = merge(
        {} as DatabaseConfig,
        factoryOptions,
        options
      );
      await register(app, mergedOptions);
    }
  };
}
