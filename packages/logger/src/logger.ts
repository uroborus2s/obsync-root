import { createWriteStream } from 'fs';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import pino, { Logger as PinoLogger } from 'pino';
import { setupRotation } from './rotation';
import { defaultSerializers } from './serializers';
import { Logger, LoggerOptions } from './types';

/**
 * 默认日志选项
 */
const defaultOptions: Partial<LoggerOptions> = {
  level: 'info',
  base: {
    pid: process.pid,
    hostname: os.hostname()
  },
  serializers: defaultSerializers
};

/**
 * 创建多目标输出
 */
function createMultiStream(
  targets: { level: string; stream: NodeJS.WritableStream }[]
): any {
  // 简化实现，实际使用pino-multi-stream库更好
  return {
    write: (data: string) => {
      const obj = JSON.parse(data);
      const level = obj.level;

      for (const target of targets) {
        const targetLevel = pino.levels.values[target.level];

        // 只有当日志级别大于等于目标级别时才写入
        if (level >= targetLevel) {
          target.stream.write(data);
        }
      }

      return true;
    }
  };
}

/**
 * 创建日志记录器
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  // 合并默认选项
  const mergedOptions = { ...defaultOptions, ...options };

  // 处理输出目标
  let destination: NodeJS.WritableStream | undefined;
  let rotationCleanup: (() => void) | null = null;

  // 处理多目标输出
  if (options.targets && options.targets.length > 0) {
    const streams = options.targets.map((target) => {
      // 处理文件目标
      if (typeof target.target === 'string') {
        // 确保目录存在
        const dir = path.dirname(target.target);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        return {
          level: target.level,
          stream: createWriteStream(target.target, { flags: 'a' })
        };
      }

      // 处理流目标
      return {
        level: target.level,
        stream: target.target
      };
    });

    destination = createMultiStream(streams);
  }
  // 处理单一目标
  else if (options.destination) {
    // 如果是文件路径
    if (typeof options.destination === 'string') {
      // 确保目录存在
      const dir = path.dirname(options.destination);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 创建文件流
      destination = createWriteStream(options.destination, { flags: 'a' });

      // 设置日志轮转
      if (options.rotation) {
        rotationCleanup = setupRotation(options.destination, options.rotation);
      }
    } else {
      // 使用提供的流
      destination = options.destination;
    }
  }

  // 调整options来兼容pino的类型
  const pinoOptions: any = { ...mergedOptions };

  // 创建 pino 实例
  const pinoLogger: PinoLogger = destination
    ? pino(pinoOptions, destination)
    : pino(pinoOptions);

  // 确保在进程退出时清理资源
  if (rotationCleanup) {
    process.on('beforeExit', () => {
      if (rotationCleanup) {
        rotationCleanup();
      }
    });
  }

  // 强制类型转换，因为pino的Logger类型定义与我们的Logger接口有差异
  return pinoLogger as unknown as Logger;
}

/**
 * 创建缓冲区日志记录器，用于性能优化
 */
export function createBufferedLogger(
  logger: Logger,
  options: {
    bufferSize?: number;
    flushInterval?: number;
  } = {}
): Logger {
  const bufferSize = options.bufferSize || 10;
  const flushInterval = options.flushInterval || 1000;

  const buffer: Array<{ level: string; args: any[] }> = [];
  let timer: NodeJS.Timeout | null = null;

  // 创建包装的日志记录器
  const bufferedLogger = Object.create(logger) as Logger;

  // 重写日志方法
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

  levels.forEach((level) => {
    const originalMethod = (logger as any)[level];

    (bufferedLogger as any)[level] = function (...args: any[]) {
      buffer.push({ level, args });

      // 如果达到缓冲区大小或者是高级别日志，立即刷新
      if (buffer.length >= bufferSize || ['error', 'fatal'].includes(level)) {
        flushBuffer();
      } else if (!timer) {
        // 设置定时器定期刷新
        timer = setTimeout(flushBuffer, flushInterval);
      }
    };
  });

  // 刷新缓冲区
  function flushBuffer(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (buffer.length === 0) {
      return;
    }

    // 写入所有缓冲的日志
    for (const entry of buffer) {
      (logger as any)[entry.level].apply(logger, entry.args);
    }

    // 清空缓冲区
    buffer.length = 0;
  }

  // 确保在进程退出时刷新缓冲区
  process.on('beforeExit', flushBuffer);

  // 添加手动刷新方法
  bufferedLogger.flush = flushBuffer;

  return bufferedLogger;
}
