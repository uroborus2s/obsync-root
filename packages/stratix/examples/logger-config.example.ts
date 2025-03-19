import { Context } from '../src/types/config.js';

export default (ctx: Context) => {
  // 定制化日志插件配置
  const loggerPlugin = {
    name: 'logger',
    version: '0.1.0',
    type: 'plugin',
    description: '高性能、灵活的结构化日志记录库',
    // 可以指定依赖，但日志作为基础组件通常没有依赖
    dependencies: [],
    // 日志插件的配置项
    props: {
      // 日志级别，可以是 'trace', 'debug', 'info', 'warn', 'error', 'fatal'
      level: ctx.env.LOG_LEVEL || 'info',

      // 是否为开发环境优化显示
      prettyPrint: ctx.env.NODE_ENV !== 'production',

      // 输出目标，可以是 'console' 或者 'file'
      destination: ctx.env.LOG_DESTINATION || 'console',

      // 如果输出到文件，指定文件路径
      file: ctx.env.LOG_FILE || 'app.log',

      // 性能优化选项
      optimization: {
        // 缓冲区大小
        bufferSize: 1000,
        // 刷新间隔(ms)
        flushInterval: 10000
      },

      // 日志旋转配置
      rotation: {
        // 启用日志旋转
        enabled: true,
        // 单个日志文件最大大小
        size: '10M',
        // 保留的日志文件数量
        files: 5
      },

      // 是否记录请求和响应
      logRequest: true,
      logResponse: true,

      // 自定义序列化器，用于控制日志中包含的敏感信息
      serializers: {
        // 隐藏请求中的敏感信息
        req: (req: any) => ({
          method: req.method,
          url: req.url,
          headers: {
            ...req.headers,
            authorization: req.headers.authorization ? '[REDACTED]' : undefined,
            cookie: req.headers.cookie ? '[REDACTED]' : undefined
          }
        })
      }
    }
  };

  // 应用的其他插件...

  return {
    name: 'logger-example-app',
    type: 'app',
    version: '0.0.1',
    env: '.',
    plugins: [loggerPlugin]
  };
};
