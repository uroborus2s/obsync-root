import { StratixApp } from './app.js';
import { run, runFromConfig } from './runner.js';
import { AppOptions } from './types/app.js';

/**
 * 创建应用实例
 */
export function createApp(options: AppOptions = {}): StratixApp {
  return new StratixApp(options);
}

// 静态方法
const Stratix = {
  createApp,
  run,
  runFromConfig
};

export default Stratix;

// 导出类型
export * from './types/config.js';
export * from './types/index.js';

// 导出核心类
export { StratixApp } from './app.js';
export { DIContainer } from './di/index.js';
export { ErrorManager } from './errors/index.js';
export { HooksManager } from './hooks/index.js';
export { PluginManager } from './plugin-manager.js';
