/**
 * Stratix框架主入口文件
 */

// 导出应用工厂函数
export { createApp, createAppFromConfig } from './app/factory.js';

// 导出应用接口和类型
export {
  AppOptions,
  StratixApp,
  StratixAppImplOptions
} from './app/interface.js';

// 导出插件接口和类型
export {
  PluginFactory,
  PluginInstance,
  PluginRegisterFn,
  StratixPlugin
} from './plugin/types.js';

// 导出配置接口和类型
export { ConfigAPI, ConfigLoaderOptions } from './config/types.js';

// 导出钩子接口和类型
export { HookManager } from './hook/types.js';

export { HookHandler, HookName } from './types/hook.js';

// 导出日志接口和类型
export { LogLevel, LoggerInstance, LoggerOptions } from './types/logger.js';

// 导出公共类型
export { EnvOptions, JSONSchema } from './types/common.js';

// 导出错误类
export * from './types/errors.js';
