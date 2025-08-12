/**
 * ICAsync服务模块导出
 *
 * 统一导出所有ICAsync相关的服务，便于依赖注入和模块管理
 */

// 同步历史管理服务
export { default as ICAsyncSyncHistoryService } from './ICAsyncSyncHistoryService.js';
export type {
  IICAsyncSyncHistoryService,
  RunningSyncInfo,
  SemesterSyncHistory,
  ServiceResult,
  SyncType
} from './ICAsyncSyncHistoryService.js';

// 同步执行规则引擎
export { default as SyncExecutionRuleEngine } from './SyncExecutionRuleEngine.js';
export type {
  ISyncExecutionRule,
  ISyncExecutionRuleEngine,
  RuleValidationContext,
  RuleValidationResult
} from './SyncExecutionRuleEngine.js';

// 规则类导出
export {
  SemesterFullSyncLimitRule,
  SyncTypeMutexRule
} from './SyncExecutionRuleEngine.js';

// ICAsync互斥管理器
export { default as ICAsyncMutexManager } from './ICAsyncMutexManager.js';
export type {
  IICAsyncMutexManager,
  MutexWorkflowOptions,
  MutexWorkflowResult
} from './ICAsyncMutexManager.js';
