import { v4 as uuidv4 } from 'uuid';
import { createBufferedLogger, createLogger } from './logger';
import { Logger, LoggerOptions, StratixApp } from './types';

/**
 * 注册日志插件
 */
export async function register(
  app: StratixApp,
  options: LoggerOptions = {}
): Promise<void> {
  // 创建日志记录器
  const logger = createLogger(options);

  // 如果启用了性能优化，创建缓冲日志
  let optimizedLogger: Logger = logger;

  if (options.optimization) {
    optimizedLogger = createBufferedLogger(logger, options.optimization);
  }

  // 注册到依赖注入容器
  app.inject('logger', () => optimizedLogger);

  // 装饰应用实例
  app.decorate('log', optimizedLogger);

  // 请求级日志中间件
  app.addHook('onRequest', (req: any, reply: any, done: Function) => {
    // 为每个请求创建带请求ID的子日志
    const reqId = req.headers['x-request-id'] || uuidv4();
    const reqLogger = optimizedLogger.child({ reqId });

    // 装饰请求和响应对象
    req.log = reqLogger;
    reply.log = reqLogger;

    // 记录请求开始
    reqLogger.info({ req }, 'Request received');

    // 在请求结束时记录
    reply.onSend &&
      typeof reply.onSend === 'function' &&
      reply.onSend((payload: any, next: Function) => {
        reqLogger.info(
          {
            res: reply,
            responseTime:
              reply.getResponseTime &&
              typeof reply.getResponseTime === 'function'
                ? reply.getResponseTime()
                : undefined
          },
          'Request completed'
        );
        next(null, payload);
      });

    done();
  });

  // 错误日志中间件
  app.addHook(
    'onError',
    (req: any, reply: any, error: Error, done: Function) => {
      (req.log || optimizedLogger).error(
        {
          err: error,
          req,
          res: reply
        },
        'Request error'
      );

      done();
    }
  );

  // 应用关闭钩子 - 刷新缓冲区
  if (options.optimization && optimizedLogger.flush) {
    app.addHook('onClose', (instance: any, done: Function) => {
      if (optimizedLogger.flush) {
        optimizedLogger.flush();
      }
      done();
    });
  }
}

/**
 * 插件定义
 */
export default {
  name: 'logger',
  dependencies: [],
  register
};
