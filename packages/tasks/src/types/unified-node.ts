/**
 * 统一的节点类型定义
 *
 * 解决 NodeDefinition、NodeInstance 和 WorkflowNodeInstancesTable 之间的不一致性
 * 版本: v3.1.0-unified
 */

import { NodeDefinition } from './workflow.js';

/**
 * 节点类型枚举（统一定义）
 */
export type NodeType = 'simple' | 'task' | 'loop' | 'parallel' | 'subprocess';

/**
 * 节点实例状态枚举（统一定义）
 */
export type NodeInstanceStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'failed_retry';

/**
 * 基础节点字段（设计时 + 运行时共有）
 */
export interface BaseNodeFields {
  // === 节点标识 ===
  /** 节点唯一标识（在工作流定义中的ID） */
  nodeId: string;
  /** 节点名称 */
  nodeName: string;
  /** 节点描述 */
  nodeDescription?: string;
  /** 节点类型 */
  nodeType: NodeType;

  // === 执行配置 ===
  /** 执行器名称 */
  executor?: string;
  /** 执行器配置 */
  executorConfig?: Record<string, any>;
  /** 输入数据配置 */
  inputData?: Record<string, any>;

  // === 执行控制 ===
  /** 超时时间（秒） */
  timeoutSeconds?: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试延迟（秒） */
  retryDelaySeconds?: number;
  /** 条件表达式 */
  condition?: string;
}

/**

/**
 * 运行时特有字段
 */
export interface RuntimeFields {
  // === 实例标识 ===
  /** 数据库主键ID */
  id: number;
  /** 工作流实例ID */
  workflowInstanceId: number;

  // === 执行状态 ===
  /** 执行状态 */
  status: NodeInstanceStatus;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 执行时长（毫秒） */
  durationMs?: number;

  // === 执行结果 ===
  /** 输出数据 */
  outputData?: any;
  /** 错误信息 */
  errorMessage?: string;
  /** 错误详情 */
  errorDetails?: any;

  // === 重试控制 ===
  /** 当前重试次数 */
  retryCount: number;

  // === 层次结构（用于循环、并行等复杂节点） ===
  /** 父节点实例ID */
  parentNodeId?: number;
  /** 子节点索引 */
  childIndex?: number;

  // === 循环节点特有字段 ===
  /** 循环进度状态 */
  loopProgress?: any;
  /** 循环总数 */
  loopTotalCount?: number;
  /** 已完成循环数 */
  loopCompletedCount: number;

  // === 并行节点特有字段 ===
  /** 并行组ID */
  parallelGroupId?: string;
  /** 并行索引 */
  parallelIndex?: number;

  // === 审计字段 ===
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 统一的节点实例（运行时）
 */
export interface NodeInstance extends BaseNodeFields, RuntimeFields {
  // 继承基础字段和运行时字段
}

/**
 * 数据库表字段映射类型
 */
export interface WorkflowNodeInstancesTable {
  // === 实例标识 ===
  id: number;
  workflow_instance_id: number;

  // === 节点标识 ===
  node_id: string;
  node_name: string;
  node_description: string | null;
  node_type: NodeType;

  // === 执行配置 ===
  executor: string | null;
  input_data: any | null; // 统一的输入数据源
  timeout_seconds: number | null;
  max_retries: number;
  retry_delay_seconds: number | null;
  execution_condition: string | null;

  // === 执行状态 ===
  status: NodeInstanceStatus;
  started_at: Date | null;
  completed_at: Date | null;
  duration_ms: number | null;

  // === 执行结果 ===
  output_data: any | null;
  error_message: string | null;
  error_details: any | null;

  // === 重试控制 ===
  retry_count: number;

  // === 层次结构 ===
  parent_node_id: number | null;
  child_index: number | null;

  // === 循环节点特有字段 ===
  loop_progress: any | null;
  loop_total_count: number | null;
  loop_completed_count: number;

  // === 并行节点特有字段 ===
  parallel_group_id: string | null;
  parallel_index: number | null;

  // === 审计字段 ===
  created_at: Date;
  updated_at: Date;
}

/**
 * 字段映射工具类型
 */
export type NodeInstanceToTableMapping = {
  [K in keyof NodeInstance]: K extends keyof WorkflowNodeInstancesTable
    ? WorkflowNodeInstancesTable[K]
    : never;
};

/**
 * 包含子节点的节点实例类型
 * 用于层次结构展示，如果节点有子节点，会包含在 children 字段中
 */
export interface NodeInstanceWithChildren extends NodeInstance {
  /** 子节点列表（如果有的话） */
  children?: NodeInstanceWithChildren[];
  /** 子节点统计信息 */
  childrenStats?: {
    total: number;
    completed: number;
    running: number;
    failed: number;
    pending: number;
  };
}

/**
 * 类型转换工具函数类型
 */
export interface NodeTypeConverter {
  /** NodeDefinition → NodeInstance */
  definitionToInstance(
    definition: NodeDefinition,
    workflowInstanceId: number,
    additionalData?: Partial<RuntimeFields>
  ): Omit<NodeInstance, 'id' | 'createdAt' | 'updatedAt'>;

  /** NodeInstance → Database Table */
  instanceToTable(instance: NodeInstance): WorkflowNodeInstancesTable;

  /** Database Table → NodeInstance */
  tableToInstance(table: WorkflowNodeInstancesTable): NodeInstance;

  /** 字段名映射：驼峰 → 下划线 */
  camelToSnake(obj: Record<string, any>): Record<string, any>;

  /** 字段名映射：下划线 → 驼峰 */
  snakeToCamel(obj: Record<string, any>): Record<string, any>;
}
