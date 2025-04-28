/**
 * 使用配置文件的Stratix应用示例
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppFromConfig } from '../../src/index.js';

// 获取当前文件目录
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 启动示例应用
 */
async function startApp() {
  try {
    // 从配置文件创建应用
    const configPath = path.join(__dirname, 'app.config.js');
    const app = await createAppFromConfig(configPath, {
      // 可以覆盖配置文件中的部分参数
      env: {
        dotenv: true,
        prefix: 'APP_'
      }
    });

    // 在这里可以注册额外的路由
    app.fastify.get('/', async (request, reply) => {
      return {
        name: app.name,
        version: app.config.get('app.version'),
        description: app.config.get('app.description')
      };
    });

    // 读取和显示配置
    app.logger.info(`应用名称: ${app.name}`);
    app.logger.info(`应用版本: ${app.config.get('app.version')}`);
    app.logger.info(`应用描述: ${app.config.get('app.description')}`);

    // 启动应用
    await app.start();

    // 显示服务地址
    const port = app.config.get('server.port');
    const host = app.config.get('server.host');
    app.logger.info(`服务器运行在: http://${host}:${port}`);
  } catch (err) {
    console.error('应用启动失败:', err);
    process.exit(1);
  }
}

// 启动应用
startApp();
