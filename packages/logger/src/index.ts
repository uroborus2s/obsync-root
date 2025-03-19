import { createBufferedLogger, createLogger } from './logger';
import plugin from './plugin';
import { setupRotation } from './rotation';
import { defaultSerializers } from './serializers';
import type { Logger, LoggerOptions } from './types';

// 导出插件作为默认导出
export default plugin;

// 导出核心功能
export {
  createBufferedLogger,
  createLogger,
  defaultSerializers,
  setupRotation
};

// 导出类型
export type { Logger, LoggerOptions };
