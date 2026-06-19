// Stratix Core - 主入口文件
// 导出所有公共API

// 主要类和接口
export { Stratix } from './stratix.js';
export * from './types/index.js';

// Bootstrap 功能
export * from './bootstrap/index.js';
export * from './contracts/index.js';
export * from './diagnostics/index.js';
export {
  ConfigurationError,
  DiscoveryError,
  PluginLoadError,
  RegistrationError,
  StratixError
} from './errors/index.js';

// 高级功能模块 - 装饰器
export {
  CONTROLLER_METADATA_KEY,
  Component,
  // 装饰器
  Controller,
  Delete,
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
  Repository,
  ROUTE_METADATA_KEY,
  Required,
  Service,
  type ComponentInjectionMode,
  type ComponentLifetime,
  type ComponentMetadata,
  type ComponentOptions,
  type ComponentType,
  type ControllerMetadata,
  type ControllerOptions,
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
  diagnoseServiceAdapterTokens,
  ensureAwilixPlugin,
  getCallerFilePath,
  getPluginName,
  isAsyncPlugin,
  // 服务发现和注册
  performAutoRegistration,
  // 统一模块处理器
  processModulesUnified,
  processPluginParameters,
  processSingleModule,
  registerControllerClassRoutes,
  // 控制器注册
  registerControllerRoutes,
  // 适配器注册
  registerServiceAdapters,
  resolveBasePath,
  // 主要的自动依赖注入插件
  withRegisterAutoDI,
  // 工具函数和类型
  type AutoDIConfig,
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
  type ServiceAdapterDiagnostic,
  type ServiceConfig
} from './plugin/index.js';

// 应用级 discovery
export {
  ApplicationDiscoveryPipeline,
  type ApplicationDiscoveryConfig,
  type ApplicationDiscoveryResult,
  type LoadedProductionManifest,
  type ProductionManifest,
  type ProductionManifestDiscoveryConfig
} from './discovery/index.js';

// Service 层功能模块
export * from './service/index.js';
export * as async from './utils/async/index.js';
export * as auth from './utils/auth/index.js';
export * as context from './utils/context/index.js';
export * as data from './utils/data/index.js';
export * as environment from './utils/environment/index.js';
export * as functional from './utils/functional/index.js';
export * from './utils/crypto.js';
export * from './utils/file-scanner.js';
export { createLogger, getLogger, LoggerFactory } from './logger/index.js';

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
export type { Logger } from './logger/index.js';
export type { LoggerOptions } from 'pino';
