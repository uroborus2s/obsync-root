/**
 * 使用自定义插件的Stratix应用示例
 */
import { createApp } from '../../src/index.js';
import timerPlugin from './plugins/timer.js';

/**
 * 启动示例应用
 */
async function startApp() {
  try {
    // 创建应用实例
    const app = createApp({
      name: '自定义插件示例',
      config: {
        server: {
          port: 3002,
          host: '0.0.0.0'
        },
        logger: {
          level: 'debug',
          prettyPrint: true
        }
      },
      plugins: {
        // 使用核心插件
        core: {}
      }
    });

    // 手动注册自定义插件
    app.register(timerPlugin, {
      autoStart: true
    });

    // 定义类型断言，方便使用插件提供的装饰器
    interface AppWithTimer {
      timer: {
        addTask: (
          id: string,
          name: string,
          interval: number,
          callback: () => void | Promise<void>
        ) => void;
        startTask: (id: string) => void;
        stopTask: (id: string) => void;
        getTasks: () => any[];
      };
    }

    const appWithTimer = app as unknown as AppWithTimer & typeof app;

    // 添加一些定时任务
    appWithTimer.timer.addTask('task1', '每5秒打印一次', 5000, () => {
      app.logger.info('定时任务1执行');
    });

    appWithTimer.timer.addTask('task2', '每10秒打印一次', 10000, () => {
      app.logger.info('定时任务2执行');
    });

    // 添加API路由
    app.fastify.get('/tasks', async (request, reply) => {
      return {
        tasks: appWithTimer.timer.getTasks()
      };
    });

    app.fastify.post('/tasks/:id/start', async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        appWithTimer.timer.startTask(id);
        return { success: true, message: `任务 ${id} 已启动` };
      } catch (err) {
        reply.code(400);
        return { success: false, message: (err as Error).message };
      }
    });

    app.fastify.post('/tasks/:id/stop', async (request, reply) => {
      const { id } = request.params as { id: string };
      try {
        appWithTimer.timer.stopTask(id);
        return { success: true, message: `任务 ${id} 已停止` };
      } catch (err) {
        reply.code(400);
        return { success: false, message: (err as Error).message };
      }
    });

    // 启动应用
    await app.start();

    // 显示服务地址
    app.logger.info('服务器已启动，访问以下地址查看定时任务:');
    app.logger.info('- http://localhost:3002/tasks');
    app.logger.info('可使用以下命令控制任务:');
    app.logger.info('- curl -X POST http://localhost:3002/tasks/task1/stop');
    app.logger.info('- curl -X POST http://localhost:3002/tasks/task1/start');
  } catch (err) {
    console.error('应用启动失败:', err);
    process.exit(1);
  }
}

// 启动应用
startApp();
