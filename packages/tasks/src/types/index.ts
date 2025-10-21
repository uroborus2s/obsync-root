/**
 * @stratix/tasks 核心类型定义
 *
 * 定义工作流任务管理系统的所有核心类型和接口
 * 版本: v3.0.0-refactored
 */

// 导出数据库类型
export * from './database.js';

// 导出业务类型（排除已弃用的类型）
export type {
  ExecutionResult,
  LoopProgress,
  PaginatedResult,
  PaginationOptions,
  QueryFilters,
  QueryOptions,
  ServiceResult,
  UnifiedWorkflowInstanceFilters,
  WorkflowInstance,
  WorkflowInstanceQueryOptions,
  WorkflowInstanceStatus,
  WorkflowOptions
} from './business.js';

// 导出统一的节点类型（推荐使用）
export type {
  NodeInstance,
  NodeInstanceStatus,
  NodeInstanceWithChildren,
  NodeType,
  WorkflowNodeInstancesTable as UnifiedWorkflowNodeInstancesTable
} from './unified-node.js';

// 导出工作流定义类型（排除冲突的类型）
export type {
  BaseNodeDefinition,
  LoopNodeDefinition,
  NodeConnection,
  ParallelNodeDefinition,
  SimpleNodeDefinition,
  SubprocessNodeDefinition,
  TaskNodeDefinition,
  WorkflowConfig,
  WorkflowDefinition,
  WorkflowDefinitionData,
  WorkflowDefinitionData as WorkflowDefinitionStructure,
  WorkflowDefinitionType,
  WorkflowInput,
  WorkflowNodeType,
  WorkflowNodeTypes,
  WorkflowOutput
} from './workflow.js';

// 重新导出 NodeDefinition 从 workflow.js（工作流定义中的节点定义）
export type { NodeDefinition as WorkflowNodeDefinition } from './workflow.js';

// 导出身份验证相关类型
export type { WorkflowPermission } from './identity.js';
