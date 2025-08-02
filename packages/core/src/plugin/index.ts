// @stratix/core 插件模块导出
// 提供插件开发相关的工具和装饰器

// 主要的自动依赖注入插件
export { withRegisterAutoDI } from './auto-di-plugin.js';

// 生命周期管理
export {
  ConventionBasedLifecycleManager,
  FASTIFY_LIFECYCLE_METHODS,
  type FastifyLifecycleMethod,
  type LifecycleMethodResult,
  type LifecyclePhaseResult
} from './lifecycle-manager.js';

// 服务发现和注册
export {
  ensureAwilixPlugin,
  performAutoRegistration,
  type PluginContainerContext
} from './service-discovery.js';

// 控制器注册
export {
  registerControllerRoutes,
  type RouteConfig
} from './controller-registration.js';

// 适配器注册
export {
  registerServiceAdapters,
  type ServiceAdapter,
  type ServiceAdapterClass,
  type ServiceConfig
} from './adapter-registration.js';

// 工具函数和类型
export {
  getCallerFilePath,
  getPluginName,
  isAsyncPlugin,
  processPluginParameters,
  resolveBasePath,
  type AutoDIConfig
} from './utils.js';

// 重新导出 Awilix 的 InjectorFunction 类型
export { type InjectorFunction } from 'awilix';
