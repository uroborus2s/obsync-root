/**
 * Stratix Framework Core
 *
 * 函数式、插件驱动的Node.js应用框架
 *
 * @packageDocumentation
 */

// 导出StratixApp作为主要API
export { StratixApp as default } from './app.js';

// 导出核心类型
export type { IStratixApp } from './types/app.js';
export type { StratixConfig } from './types/config.js';

// 导出插件相关类型
export type {
  DeclarativePlugin,
  DIFactory,
  DIRegistrationConfig,
  DIRegistrationValue,
  PluginOptions,
  PluginRegistration,
  RegistrationOptions,
  StratixPlugin,
  StratixPluginOptions
} from './types/plugin.js';

// 导出扩展后的 Fastify 类型（包含 Stratix 装饰器）
export type {
  DIContainerManager,
  DIRegisterOptions,
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions,
  FastifyPluginWrapper,
  FastifyReply,
  FastifyRequest,
  SmartDIRegister
} from './types/fastify.js';

export type { Logger } from 'pino';

export { default as fp } from 'fastify-plugin';

// 上下文管理
export { AppContextManager } from './context/app-context.js';
export type {
  AppContextData,
  RequestContextData
} from './context/app-context.js';

// 缓存管理
export { createDefaultCache, DefaultCache } from './cache/default-cache.js';
export { CacheManager, MemoryCache } from './cache/memory-cache.js';
export type {
  CacheConfig,
  CacheEntry,
  CacheEvents,
  CacheStats
} from './cache/memory-cache.js';
