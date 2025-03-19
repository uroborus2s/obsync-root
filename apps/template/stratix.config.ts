import { Context } from '@obsync/stratix';

export default (ctx: Context) => {
  const loggerPlugin = {
    name: 'logger',
    version: '0.0.1',
    type: 'plugin',
    description: 'Logger plugin',
    dependencies: ['@obsync/stratix-logger'],
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
    dependencies: ['@obsync/stratix-logger']
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
    plugins: [loggerPlugin, ormPlugin, cachePlugin, accountSyncPlugin]
  };
};
