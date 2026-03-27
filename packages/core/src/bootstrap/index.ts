// Bootstrap 模块 - 应用启动相关功能
// 负责应用的完整启动流程

// 应用级自动依赖注入
export {
  DEFAULT_APPLICATION_AUTO_DI_CONFIG,
  performApplicationAutoDI,
  type ApplicationAutoDIConfig,
  type ApplicationModuleRegistrationResult
} from './application-auto-di.js';

// 应用级模块发现和处理
export {
  createApplicationLifecycleManager,
  discoverAndProcessApplicationModules,
  type ApplicationModuleProcessingConfig,
  type ApplicationModuleProcessingResult
} from './application-module-discovery.js';

// 应用级错误处理
export {
  ApplicationErrorHandler,
  ApplicationErrorType,
  safeExecute,
  type ApplicationErrorDetails,
  type ErrorHandlingStrategy
} from './application-error-handler.js';

// 应用启动器
export * from './application-bootstrap.js';

// 重新导出插件级生命周期管理器相关类型，用于应用级使用
export {
  ConventionBasedLifecycleManager,
  FASTIFY_LIFECYCLE_METHODS,
  type FastifyLifecycleMethod,
  type LifecycleMethodResult,
  type LifecyclePhaseResult
} from '../plugin/lifecycle-manager.js';
