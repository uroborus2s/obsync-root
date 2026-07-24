// Stratix Core - stable application-developer entrypoint.
// Plugin-author, diagnostics, contracts, experimental and internal APIs are
// exposed through explicit package subpaths instead of the root export.

// 主要类和接口
export { Stratix, runApp } from './stratix.js';
export * from './types/index.js';

export * as experimental from './experimental/index.js';
export {
  ConfigurationError,
  DiscoveryError,
  HttpError,
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

export type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export type { Logger } from './logger/index.js';
export type { LoggerOptions } from 'pino';
