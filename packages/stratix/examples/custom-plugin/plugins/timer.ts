/**
 * 定时器插件
 * 提供定时执行任务的功能
 */
import { StratixPlugin } from '../../../src/plugin/types.js';

/**
 * 定时器插件选项
 */
interface TimerPluginOptions {
  /**
   * 是否在应用启动时自动启动所有定时器
   */
  autoStart?: boolean;
}

/**
 * 定时任务接口
 */
interface TimerTask {
  id: string;
  name: string;
  interval: number;
  callback: () => void | Promise<void>;
  enabled: boolean;
  timer?: NodeJS.Timeout;
}

/**
 * 创建定时器插件
 */
export function createTimerPlugin(): StratixPlugin<TimerPluginOptions> {
  const tasks: Map<string, TimerTask> = new Map();

  return {
    name: 'timer',

    // 依赖核心插件
    dependencies: ['core'],

    // 插件配置验证模式
    schema: {
      type: 'object',
      properties: {
        autoStart: { type: 'boolean' }
      }
    },

    // 导出的装饰器
    decorations: {
      timer: {
        /**
         * 添加定时任务
         * @param id 任务ID
         * @param name 任务名称
         * @param interval 间隔时间(毫秒)
         * @param callback 回调函数
         */
        addTask(
          id: string,
          name: string,
          interval: number,
          callback: () => void | Promise<void>
        ): void {
          if (tasks.has(id)) {
            throw new Error(`任务ID已存在: ${id}`);
          }

          tasks.set(id, {
            id,
            name,
            interval,
            callback,
            enabled: false
          });
        },

        /**
         * 启动指定任务
         * @param id 任务ID
         */
        startTask(id: string): void {
          const task = tasks.get(id);
          if (!task) {
            throw new Error(`任务不存在: ${id}`);
          }

          if (task.enabled) {
            return; // 任务已启动
          }

          task.enabled = true;
          task.timer = setInterval(async () => {
            try {
              const result = task.callback();
              if (result instanceof Promise) {
                await result;
              }
            } catch (err) {
              console.error(`任务执行出错: ${task.name}`, err);
            }
          }, task.interval);
        },

        /**
         * 停止指定任务
         * @param id 任务ID
         */
        stopTask(id: string): void {
          const task = tasks.get(id);
          if (!task) {
            throw new Error(`任务不存在: ${id}`);
          }

          if (!task.enabled) {
            return; // 任务已停止
          }

          if (task.timer) {
            clearInterval(task.timer);
            task.timer = undefined;
          }

          task.enabled = false;
        },

        /**
         * 获取所有任务
         * @returns 任务列表
         */
        getTasks(): TimerTask[] {
          return Array.from(tasks.values()).map(({ timer, ...rest }) => rest);
        }
      }
    },

    /**
     * 注册函数
     * @param app 应用实例
     * @param options 插件配置
     */
    async register(app, options) {
      const { autoStart = false } = options;

      app.logger.debug({ plugin: 'timer' }, '正在初始化定时器插件');

      // 添加启动和关闭钩子
      app.hook('afterStart', async () => {
        if (autoStart) {
          // 自动启动所有任务
          for (const task of tasks.values()) {
            app.logger.debug(
              { plugin: 'timer', task: task.id },
              `自动启动任务: ${task.name}`
            );
            app.timer.startTask(task.id);
          }

          app.logger.info(
            { plugin: 'timer', taskCount: tasks.size },
            '已自动启动所有定时任务'
          );
        }
      });

      app.hook('beforeClose', async () => {
        // 停止所有任务
        for (const task of tasks.values()) {
          if (task.enabled) {
            app.logger.debug(
              { plugin: 'timer', task: task.id },
              `停止任务: ${task.name}`
            );
            app.timer.stopTask(task.id);
          }
        }

        app.logger.info({ plugin: 'timer' }, '所有定时任务已停止');
      });

      app.logger.debug({ plugin: 'timer' }, '定时器插件初始化完成');
    }
  };
}

/**
 * 默认导出定时器插件实例
 */
export default createTimerPlugin();
