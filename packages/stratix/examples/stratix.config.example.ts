import { Context } from '../src/types/config.js';

// 插件工厂示例
function createCachePlugin(props: any) {
  return {
    name: '@obsync/stratix-cache',
    register: async (app: any, options: any) => {
      app.log.info('缓存插件已初始化', props);

      // 模拟缓存服务
      const cacheService = {
        set: async (key: string, value: any) => {
          app.log.info(`设置缓存: ${key}`);
          return true;
        },
        get: async (key: string) => {
          app.log.info(`获取缓存: ${key}`);
          return null;
        },
        del: async (key: string) => {
          app.log.info(`删除缓存: ${key}`);
          return true;
        }
      };

      // 装饰应用
      app.decorate('cache', cacheService);

      // 注册服务
      app.injectValue('cache', cacheService);
    }
  };
}

// ORM插件工厂示例
function createOrmPlugin(props: any) {
  return {
    name: '@obsync/stratix-orm',
    register: async (app: any, options: any) => {
      app.log.info('ORM插件已初始化', props);

      // 连接数据库
      const databases = props.Databases || [];

      // 遍历配置的数据库
      for (const dbConfig of databases) {
        app.log.info(`连接数据库: ${dbConfig.name}`, {
          host: dbConfig.connection.host,
          database: dbConfig.connection.database
        });
      }

      // 模拟ORM服务
      const ormService = {
        model: (name: string) => {
          return {
            findAll: async () => [],
            findById: async (id: string) => null,
            create: async (data: any) => ({ id: '1', ...data }),
            update: async (id: string, data: any) => ({ id, ...data }),
            delete: async (id: string) => true
          };
        }
      };

      // 装饰应用
      app.decorate('orm', ormService);

      // 注册服务
      app.injectValue('orm', ormService);
    }
  };
}

// 业务插件示例
function createAccountSyncPlugin(props: any) {
  return {
    name: 'account-sync',
    register: async (app: any, options: any) => {
      app.log.info('账户同步插件已初始化', props);

      // 使用ORM服务
      const userModel = app.orm.model('user');

      // 添加钩子
      app.addHook('afterStart', async () => {
        app.log.info('账户同步服务已启动');

        // 初始化同步服务
        if (props.autoSetup) {
          app.log.info('自动初始化同步服务');
        }
      });

      // 模拟同步服务
      const syncService = {
        syncAccounts: async () => {
          app.log.info('开始同步账户');
          return { success: true, count: 0 };
        }
      };

      // 装饰应用
      app.decorate('accountSync', syncService);

      // 注册服务
      app.injectValue('accountSync', syncService);
    }
  };
}

// 配置导出函数
export default (ctx: Context) => {
  const loggerPlugin = {
    name: 'logger',
    version: '0.0.1',
    type: 'plugin',
    description: 'Logger plugin',
    dependencies: [],
    props: {
      level: {
        type: 'string',
        default: 'info'
      }
    }
  };

  const cachePlugin = {
    name: '@obsync/stratix-cache',
    factory: createCachePlugin,
    type: 'plugin',
    description: 'Cache plugin',
    dependencies: ['logger']
  };

  const ormPlugin = {
    name: '@obsync/stratix-orm',
    factory: createOrmPlugin,
    type: 'plugin',
    description: 'ORM plugin',
    dependencies: ['@obsync/stratix-cache'],
    props: {
      Databases: [
        {
          name: 'default',
          client: 'mysql2',
          connection: {
            host: ctx.env.SOURCE_DB_HOST || 'localhost',
            port: parseInt(ctx.env.SOURCE_DB_PORT || '3306'),
            user: ctx.env.SOURCE_DB_USER || 'root',
            password: ctx.env.SOURCE_DB_PASSWORD || '',
            database: ctx.env.SOURCE_DB_DATABASE || 'source_db'
          },
          pool: {
            min: 2,
            max: 10
          }
        }
      ]
    }
  };

  const accountSyncPlugin = {
    name: 'account-sync',
    factory: createAccountSyncPlugin,
    dependencies: ['@obsync/stratix-orm'],
    props: {
      autoSetup: true,
      // 中间库配置
      intermediateDb: {
        name: 'default'
      }
    }
  };

  return {
    name: 'template-sync',
    type: 'app',
    version: '0.0.1',
    env: '.',
    plugins: [loggerPlugin, cachePlugin, ormPlugin, accountSyncPlugin]
  };
};
