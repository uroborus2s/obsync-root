/**
 * 订阅函数模块索引
 * 提供所有事件订阅处理函数的统一导出
 */

// 状态同步订阅
export { handleStatusSync } from './statusSyncSubscribe.js';

// 节点创建订阅
export {
  handleNodeCreation,
  setupNodeCreationContext,
  validateNodeCreationParams
} from './nodeCreationSubscribe.js';

// 任务树清理订阅
export {
  getTreeCleanupStats,
  handleTreeCompletion,
  validateTreeCompletionEvent,
  type TreeCompletionEvent
} from './treeCleanupSubscribe.js';

/**
 * 所有订阅函数的集合
 * 便于批量操作和管理
 */
export const SUBSCRIBE_HANDLERS = {
  // 状态同步
  STATUS_SYNC: 'handleStatusSync',

  // 节点创建
  NODE_CREATION: 'handleNodeCreation',

  // 执行器管理
  EXECUTOR_REGISTRATION: 'handleExecutorRegistration',

  // 任务树清理
  TREE_COMPLETION: 'handleTreeCompletion',

  // 节点占位符转换
  PLACEHOLDER_CONVERSION: 'handleNodePlaceholderConversion'
} as const;

/**
 * 订阅函数类型联合
 */
export type SubscribeHandlerType =
  (typeof SUBSCRIBE_HANDLERS)[keyof typeof SUBSCRIBE_HANDLERS];

/**
 * 验证函数集合
 */
export const VALIDATION_FUNCTIONS = {
  NODE_CREATION: 'validateNodeCreationParams',
  EXECUTOR_REGISTRATION: 'validateExecutorRegistrationEvent',
  TREE_COMPLETION: 'validateTreeCompletionEvent',
  PLACEHOLDER_CONVERSION: 'validatePlaceholderConversionEvent'
} as const;

/**
 * 工具函数集合
 */
export const UTILITY_FUNCTIONS = {
  SETUP_NODE_CREATION_CONTEXT: 'setupNodeCreationContext',
  FORCE_CLEANUP_TASK_TREE: 'forceCleanupTaskTree',
  GET_TREE_CLEANUP_STATS: 'getTreeCleanupStats',
  REGISTER_CACHE_CLEANUP_CALLBACK: 'registerCacheCleanupCallback',
  GET_CONVERSION_STATS: 'getConversionStats',
  RESET_CONVERSION_STATS: 'resetConversionStats',
  CREATE_PLACEHOLDER_CONVERSION_EVENT: 'createPlaceholderConversionEvent'
} as const;
