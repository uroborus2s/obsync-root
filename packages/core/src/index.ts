// Stratix Core - 主入口文件
// 导出所有公共API

// 主要类和接口
export { Stratix } from './stratix.js';
export * from './types/index.js';

// Bootstrap 功能
export * from './bootstrap/index.js';

// 高级功能模块 - 装饰器
export {
  CONTROLLER_METADATA_KEY,
  // 装饰器
  Controller,
  Delete,
  EXECUTOR_METADATA_KEY,
  Executor,
  Get,
  Head,
  IsEmail,
  IsNumber,
  IsString,
  METADATA_KEYS,
  // 元数据管理
  MetadataManager,
  Options,
  Patch,
  Post,
  Put,
  ROUTE_METADATA_KEY,
  Required,
  getExecutorMetadata,
  getExecutorName,
  isExecutor,
  type ControllerMetadata,
  type ControllerOptions,
  type ExecutorMetadata,
  type ExecutorOptions,
  type ParamValidationMetadata,
  type PropertyValidationMetadata, // 类型导出
  type RouteMetadata,
  type ValidationRule
} from './decorators/index.js';

// 高级功能模块 - 插件
export {
  // 生命周期管理
  ConventionBasedLifecycleManager,
  FASTIFY_LIFECYCLE_METHODS,
  // 模块发现和分类
  ensureAwilixPlugin,
  getCallerFilePath,
  getPluginName,
  isAsyncPlugin,
  // 服务发现和注册
  performAutoRegistration,
  // 执行器注册
  processExecutorRegistration,
  // 统一模块处理器
  processModulesUnified,
  processPluginParameters,
  processSingleModule,
  // 控制器注册
  registerControllerRoutes,
  registerExecutorDomain,
  // 适配器注册
  registerServiceAdapters,
  resolveBasePath,
  // 主要的自动依赖注入插件
  withRegisterAutoDI,
  // 工具函数和类型
  type AutoDIConfig,
  type ExecutorRegistrationResult,
  type FastifyLifecycleMethod,
  type LifecycleMethodResult,
  type LifecyclePhaseResult,
  type ModuleClassificationResult,
  type ModuleInfo,
  type ModuleProcessingResult,
  type PluginContainerContext,
  type RouteConfig,
  type ServiceAdapter,
  type ServiceAdapterClass,
  type ServiceConfig
} from './plugin/index.js';

// 应用级功能模块 - 引导和生命周期
export {
  // 应用级错误处理
  ApplicationErrorHandler,
  ApplicationErrorType,
  DEFAULT_APPLICATION_AUTO_DI_CONFIG,
  createApplicationLifecycleManager,
  // 应用级模块发现和处理
  discoverAndProcessApplicationModules,
  // 应用级自动依赖注入
  performApplicationAutoDI,
  safeExecute,
  type ApplicationAutoDIConfig,
  type ApplicationErrorDetails,
  type ApplicationModuleProcessingConfig,
  type ApplicationModuleProcessingResult,
  type ApplicationModuleRegistrationResult,
  type ErrorHandlingStrategy
  // 注意：ConventionBasedLifecycleManager等已在plugin模块中导出
} from './bootstrap/index.js';

// Service 层功能模块
export * from './service/index.js';

export { default as fp } from 'fastify-plugin';

export { RESOLVER } from 'awilix';

export type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest
} from 'fastify';

export { Lifetime, asFunction, asValue } from 'awilix';
export type { AwilixContainer, InjectorFunction } from 'awilix';

export type { Logger } from 'pino';
