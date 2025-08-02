// Stratix Core - 主入口文件
// 导出所有公共API

// 主要类和接口
export { Stratix } from './stratix.js';
export * from './types/index.js';

// 工具模块
export { NamingConvention } from './utils/index.js';

// 高级功能模块 - 装饰器
export {
  // 装饰器
  Controller,
  CONTROLLER_METADATA_KEY,
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
  Required,
  ROUTE_METADATA_KEY,
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
  ensureAwilixPlugin,
  FASTIFY_LIFECYCLE_METHODS,
  getCallerFilePath,
  getPluginName,
  isAsyncPlugin,
  // 服务发现和注册
  performAutoRegistration,
  processPluginParameters,
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
  type InjectorFunction,
  type LifecycleMethodResult,
  type LifecyclePhaseResult,
  type PluginContainerContext,
  type RouteConfig,
  type ServiceAdapter,
  type ServiceAdapterClass,
  type ServiceConfig
} from './plugin/index.js';

export { default as fp } from 'fastify-plugin';

export { RESOLVER } from 'awilix';

export type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest
} from 'fastify';

export type { AwilixContainer } from 'awilix';

export type { Logger } from 'pino';
