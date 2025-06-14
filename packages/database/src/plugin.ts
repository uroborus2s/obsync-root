import type { FastifyInstance, StratixPlugin } from '@stratix/core';
import { fp } from '@stratix/core';
import { DatabaseConfig } from './config.js';
import { KyselyFactory } from './factory.js';
import type { DatabaseProvider } from './types.js';

/**
 * Stratix数据库插件
 * 基于Kysely提供多数据库支持，包括缓存和读写分离
 */
const databasePlugin: StratixPlugin<DatabaseConfig> = async (
  fastify: FastifyInstance,
  options: DatabaseConfig
) => {
  // 验证配置
  if (!options.databases || Object.keys(options.databases).length === 0) {
    throw new Error('数据库配置不能为空');
  }

  // 存储数据库实例，用于清理
  const databaseInstances = new Map<string, any>();
  let defaultDatabase: any = null;

  // 遍历配置中的每个数据库
  for (const [databaseName, databaseConfig] of Object.entries(
    options.databases
  )) {
    try {
      fastify.log.info(`正在初始化数据库连接: ${databaseName}`);

      // 创建 Kysely 实例
      const kyselyInstance = await KyselyFactory.createInstance(
        databaseConfig,
        fastify.log
      );

      // 验证数据库连接
      const isConnected =
        await KyselyFactory.validateConnection(kyselyInstance);
      if (!isConnected) {
        throw new Error(`数据库连接验证失败: ${databaseName}`);
      }

      // 存储实例引用
      databaseInstances.set(databaseName, kyselyInstance);

      // 设置默认数据库（第一个或名为 'default' 的）
      if (
        databaseName === 'default' ||
        Object.keys(options.databases).indexOf(databaseName) === 0
      ) {
        defaultDatabase = kyselyInstance;
      }

      fastify.log.info(`数据库连接初始化成功: ${databaseName}`);
    } catch (error) {
      fastify.log.error(error, `数据库连接初始化失败: ${databaseName}`);
      throw error;
    }
  }

  // 确保有默认数据库
  if (!defaultDatabase) {
    throw new Error('未找到默认数据库');
  }

  // 注册默认数据库实例到 DI 容器
  fastify.registerDI(defaultDatabase, {
    name: 'db',
    lifetime: 'SINGLETON'
  });

  // 创建数据库提供者
  const databaseProvider: DatabaseProvider = {
    getDatabase: (name?: string) => {
      if (!name) {
        return defaultDatabase;
      }

      // 如果指定了名称，尝试获取对应的数据库实例
      const database = databaseInstances.get(name);
      if (database) {
        return database;
      }

      // 如果找不到指定名称的数据库，返回默认数据库
      fastify.log.warn(`数据库 '${name}' 不存在，返回默认数据库`);
      return defaultDatabase;
    },

    getAllDatabases: () => {
      const databases: Record<string, any> = {};
      for (const [name, instance] of databaseInstances) {
        databases[name] = instance;
      }
      return databases;
    },

    hasDatabase: (name: string) => {
      return databaseInstances.has(name);
    },

    getDatabaseNames: () => {
      return Array.from(databaseInstances.keys());
    },

    destroy: async () => {
      for (const [name, instance] of databaseInstances) {
        try {
          await KyselyFactory.destroyInstance(instance);
          fastify.log.debug(`数据库连接已关闭: ${name}`);
        } catch (error) {
          fastify.log.error(error, `关闭数据库连接时出错: ${name}`);
        }
      }
      databaseInstances.clear();
      defaultDatabase = null;
    }
  };

  // 注册数据库提供者到 DI 容器
  fastify.registerDI(databaseProvider, {
    name: 'databaseProvider',
    lifetime: 'SINGLETON',
    asyncDispose: 'destroy', // 数据库实例的销毁方法
    asyncDisposePriority: 100 // 较高的销毁优先级，确保在其他服务之后销毁
  });

  // 注册健康检查（如果启用）
  if (options.global?.healthCheck?.enabled) {
    await registerHealthCheck(
      fastify,
      databaseInstances,
      options.global.healthCheck
    );
  }

  // 注册插件关闭钩子
  fastify.addHook('onClose', async () => {
    fastify.log.info('正在关闭数据库连接...');
    await databaseProvider.destroy();
    fastify.log.info('所有数据库连接已关闭');
  });

  // 装饰 Fastify 实例，添加便捷方法
  fastify.decorate('getDatabase', (name?: string) => {
    try {
      const provider = fastify.diContainer.resolve('databaseProvider');
      return provider.getDatabase(name);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`无法获取数据库提供者: ${errorMessage}`);
    }
  });

  // 添加获取所有数据库实例的方法
  fastify.decorate('getAllDatabases', () => {
    try {
      const provider = fastify.diContainer.resolve('databaseProvider');
      return provider.getAllDatabases();
    } catch (error) {
      fastify.log.error(error, '获取所有数据库实例失败');
      return {};
    }
  });

  fastify.log.info(
    `数据库插件初始化完成，共注册 ${databaseInstances.size} 个数据库连接，默认数据库已设置`
  );
};

/**
 * 注册健康检查
 */
async function registerHealthCheck(
  fastify: FastifyInstance,
  databaseInstances: Map<string, any>,
  healthCheckConfig: NonNullable<DatabaseConfig['global']>['healthCheck']
) {
  const timeout = healthCheckConfig?.timeout || 5000; // 默认5秒
  const retries = healthCheckConfig?.retries || 3; // 默认重试3次

  let healthCheckTimer: NodeJS.Timeout | null = null;

  const performHealthCheck = async () => {
    for (const [name, instance] of databaseInstances) {
      let attempts = 0;
      let isHealthy = false;

      while (attempts < retries && !isHealthy) {
        try {
          const startTime = Date.now();
          isHealthy = await Promise.race([
            KyselyFactory.validateConnection(instance),
            new Promise<boolean>((_, reject) =>
              setTimeout(
                () => reject(new Error('Health check timeout')),
                timeout
              )
            )
          ]);

          const duration = Date.now() - startTime;

          if (isHealthy) {
            fastify.log.debug(`数据库健康检查通过: ${name} (${duration}ms)`);
          }
        } catch (error) {
          attempts++;
          fastify.log.warn(
            `数据库健康检查失败: ${name}, 尝试 ${attempts}/${retries}`,
            error
          );

          if (attempts < retries) {
            // 等待一段时间后重试
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (!isHealthy) {
        fastify.log.error(`数据库健康检查最终失败: ${name}`);
        // 这里可以添加告警逻辑
      }
    }
  };

  // 启动健康检查定时器
  await performHealthCheck();
  // 注册关闭钩子清理定时器
  fastify.addHook('onClose', async () => {
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
      fastify.log.debug('数据库健康检查定时器已清理');
    }
  });

  fastify.log.info(`数据库健康检查已启用，检查间隔`);
}

Object.defineProperties(databasePlugin, {
  description: {
    value:
      'Stratix Database plugin powered by Kysely with caching and read-write splitting support',
    writable: false
  }
});

export const wrapDatabasePlugin: StratixPlugin<DatabaseConfig> = fp(
  databasePlugin,
  {
    name: '@stratix/database',
    fastify: '>=5.0.0'
  }
);
