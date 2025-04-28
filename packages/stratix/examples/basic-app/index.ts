/**
 * Stratix基础应用示例
 */
import { createApp } from '../../src/index.js';

/**
 * 启动示例应用
 */
async function startApp() {
  // 创建应用实例
  const app = createApp({
    name: '示例应用',
    config: {
      server: {
        port: 3000,
        host: '0.0.0.0'
      },
      logger: {
        level: 'debug',
        prettyPrint: true
      }
    },
    plugins: {
      // 使用核心插件
      core: {
        autoloadRoutes: true,
        routesDir: './routes'
      }
    }
  });

  // 注册路由
  app.fastify.get('/', async (request, reply) => {
    return { hello: 'world', framework: 'Stratix' };
  });

  app.fastify.get('/status', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      app: app.name
    };
  });

  // 添加自定义钩子
  app.hook('onServerStarted', () => {
    app.logger.info('服务器已启动，添加了自定义钩子');
  });

  // 添加自定义装饰器
  app.decorate('getVersion', () => '1.0.0');

  // 使用装饰器需要类型断言
  const appWithDecorators = app as unknown as {
    getVersion: () => string;
  } & typeof app;

  try {
    // 启动应用
    await app.start();

    // 获取服务器地址
    const address = app.fastify.server.address();
    const host =
      typeof address === 'string'
        ? address
        : `${address?.address}:${address?.port}`;

    app.logger.info(`服务器运行在: http://${host}`);
    app.logger.info(`应用版本: ${appWithDecorators.getVersion()}`);
  } catch (err) {
    app.logger.error({ error: err }, '应用启动失败');
    process.exit(1);
  }
}

// 启动示例应用
startApp();
