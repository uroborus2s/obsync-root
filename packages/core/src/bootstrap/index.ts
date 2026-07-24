// Bootstrap 模块 - 应用启动相关功能
// 负责应用的完整启动流程

export type { ApplicationDiscoveryConfig } from '../types/config.js';

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
