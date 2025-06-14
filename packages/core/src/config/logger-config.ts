import { env } from '@stratix/utils';
import { LogConfig } from '../types/config.js';

/**
 * 将简化的日志配置转换为完整的Fastify日志配置
 */
export function createLoggerConfig(config: LogConfig = {}) {
  // 使用 getEnv 获取环境变量
  const logLevel = config.level || (env.isProduction() ? 'info' : 'debug');

  let transport = {};
  // 处理格式化输出配置
  if (config.pretty || !env.isProduction()) {
    transport = {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    };
  }
  return {
    level: logLevel,
    ...transport
  };
}
