/**
 * 工作流定义相关类型
 *
 * 定义工作流结构、节点定义、连接关系等完整的类型系统
 * 版本: v3.0.0-refactored
 */

import { WorkflowInstance } from './business.js';
import type { NodeInstance } from './unified-node.js';

/**
 * 基础节点定义（统一字段命名）
 */
export interface BaseNodeDefinition {
  /** 节点唯一标识（统一命名：nodeId） */
  nodeId: string;
  /** 节点名称（统一命名：nodeName） */
  nodeName: string;
  /** 节点描述（统一命名：nodeDescription） */
  nodeDescription?: string;
  /** 依赖的节点ID列表 */
  dependsOn?: string[];
  /** 节点位置信息（用于可视化） */
  position?: {
    x: number;
    y: number;
  };
  /** 超时时间（秒，统一命名：timeoutSeconds） */
  timeoutSeconds?: number;
  /** 最大重试次数（统一为必需字段） */
  maxRetries: number;
  /** 重试延迟（秒，统一命名：retryDelaySeconds） */
  retryDelaySeconds?: number;
  /** 输入数据配置 */
  inputData?: Record<string, any>;
  /** 条件表达式（用于条件执行） */
  condition?: string;
}

/**
 * 简单任务节点定义（统一字段命名）
 */
export interface SimpleNodeDefinition extends BaseNodeDefinition {
  nodeType: 'simple';
  /** 执行器名称 */
  executor: string;
  /** 执行器配置（统一命名：executorConfig） */
  executorConfig?: Record<string, any>;
}

/**
 * 任务节点定义（简单节点的别名，用于向后兼容）
 */
export interface TaskNodeDefinition extends BaseNodeDefinition {
  nodeType: 'task';
  /** 执行器名称 */
  executor: string;
  /** 执行器配置（统一命名：executorConfig） */
  executorConfig?: Record<string, any>;
}

/**
 * 循环节点定义（统一字段命名）
 */
export interface LoopNodeDefinition extends BaseNodeDefinition {
  nodeType: 'loop';
  /** 循环类型 */
  loopType: 'static' | 'dynamic';
  /** 静态循环：循环次数 */
  loopCount?: number;
  /** 动态循环：数据源表达式 */
  sourceExpression?: string;
  /** 子节点定义列表 */
  node: NodeDefinition;
  /** 动态循环：任务模板 */
  taskTemplate?: TaskNodeDefinition;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 错误处理策略 */
  errorHandling?: 'stop' | 'continue' | 'retry';
  /** 连接类型 */
  joinType?: 'all' | 'any' | 'none';
  /** 批次大小 */
  batchSize?: number;
}

/**
 * 并行节点定义（统一字段命名）
 */
export interface ParallelNodeDefinition extends BaseNodeDefinition {
  nodeType: 'parallel';
  /** 并行子节点定义列表 */
  nodes: NodeDefinition[];
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 连接类型 */
  joinType?: 'all' | 'any' | 'none';
  /** 错误处理策略 */
  errorHandling?: 'stop' | 'continue' | 'retry';
}

/**
 * 子流程节点定义（统一字段命名）
 */
export interface SubprocessNodeDefinition extends BaseNodeDefinition {
  nodeType: 'subprocess';
  /** 子工作流名称和版本 */
  workflowName?: string;
  version?: string;
  /** 输入映射 */
  inputData?: Record<string, string>;
  /** 输出映射 */
  outputData?: Record<string, string>;
  /** 是否等待子流程完成 */
  waitForCompletion?: boolean;
}

/**
 * 联合节点定义类型
 */
export type NodeDefinition =
  | SimpleNodeDefinition
  | TaskNodeDefinition
  | LoopNodeDefinition
  | ParallelNodeDefinition
  | SubprocessNodeDefinition;

/**
 * 节点连接定义
 */
export interface NodeConnection {
  /** 连接唯一标识 */
  id: string;
  /** 源节点ID */
  source: string;
  /** 目标节点ID */
  target: string;
  /** 连接条件表达式 */
  condition?: string;
  /** 连接标签 */
  label?: string;
  /** 连接类型 */
  type?: 'success' | 'failure' | 'conditional' | 'default';
}

/**
 * 工作流输入定义
 */
export interface WorkflowInput {
  /** 输入名称 */
  name: string;
  /** 输入类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 是否必需 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: any;
  /** 描述 */
  description?: string;
  /** 验证规则 */
  validation?: {
    /** 最小值/长度 */
    min?: number;
    /** 最大值/长度 */
    max?: number;
    /** 正则表达式 */
    pattern?: string;
    /** 枚举值 */
    enum?: any[];
  };
}

/**
 * 工作流输出定义
 */
export interface WorkflowOutput {
  /** 输出名称 */
  name: string;
  /** 输出类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** 数据源表达式 */
  source: string;
  /** 描述 */
  description?: string;
}

/**
 * 工作流配置
 */
export interface WorkflowConfig {
  /** 全局超时时间（秒） */
  timeout?: number;
  /** 全局最大重试次数 */
  maxRetries?: number;
  /** 全局重试延迟（秒） */
  retryDelay?: number;
  /** 并发控制 */
  concurrency?: {
    /** 最大并发节点数 */
    maxConcurrentNodes?: number;
    /** 资源限制 */
    resourceLimits?: {
      memory?: number;
      cpu?: number;
    };
  };
  /** 监控配置 */
  monitoring?: {
    /** 是否启用监控 */
    enabled?: boolean;
    /** 指标收集间隔（秒） */
    metricsInterval?: number;
  };
  /** 错误处理配置 */
  errorHandling?: {
    /** 全局错误处理策略 */
    strategy?: 'stop' | 'continue' | 'retry';
    /** 错误通知配置 */
    notifications?: {
      email?: string[];
      webhook?: string;
    };
  };
}

/**
 * 完整的工作流定义结构
 */
export interface WorkflowDefinitionData {
  /** 工作流名称 */
  name: string;
  /** 工作流版本 */
  version: string;
  /** 工作流描述 */
  description?: string;
  /** 节点定义列表 */
  nodes: NodeDefinition[];
  /** 节点连接关系 */
  connections?: NodeConnection[];
  /** 输入定义 */
  inputs?: WorkflowInput[];
  /** 输出定义 */
  outputs?: WorkflowOutput[];
  /** 工作流配置 */
  config?: WorkflowConfig;
  /** 元数据 */
  metadata?: {
    /** 创建者 */
    author?: string;
    /** 标签 */
    tags?: string[];
    /** 分类 */
    category?: string;
    /** 图标 */
    icon?: string;
    /** 颜色 */
    color?: string;
  };
}

/**
 * 工作流定义业务接口（用于API）
 */
export interface WorkflowDefinition {
  /** 工作流ID */
  id?: number;
  /** 工作流名称 */
  name: string;
  /** 工作流版本 */
  version: string;
  /** 显示名称 */
  displayName?: string;
  /** 工作流描述 */
  description?: string;
  /** 工作流定义结构 */
  definition: WorkflowDefinitionData;
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 状态 */
  status?: 'draft' | 'active' | 'deprecated' | 'archived';
  /** 是否激活 */
  isActive?: boolean;
  /** 超时时间（秒） */
  timeoutSeconds?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（秒） */
  retryDelaySeconds?: number;
  /** 创建者 */
  createdBy?: string;
  /** 创建时间 */
  createdAt?: Date;
  /** 更新时间 */
  updatedAt?: Date;
}

// 导出节点类型枚举（重命名以避免冲突）
export const WorkflowNodeTypes = {
  SIMPLE: 'simple' as const,
  TASK: 'task' as const,
  LOOP: 'loop' as const,
  PARALLEL: 'parallel' as const,
  SUBPROCESS: 'subprocess' as const
} as const;

export type WorkflowNodeType =
  (typeof WorkflowNodeTypes)[keyof typeof WorkflowNodeTypes];

// 重命名工作流定义以避免冲突
export type { WorkflowDefinition as WorkflowDefinitionType };

/**
 * 执行上下文
 */
export interface ExecutionContext<T = any> {
  /** 工作流实例 */
  workflowInstance: WorkflowInstance;
  /** 当前执行的节点实例 */
  nodeInstance: NodeInstance;
  /** 节点定义 */
  nodeDefinition: NodeDefinition;
  /** 前置节点的输出数据 */
  previousNodeOutput?: any;
  /** 统一的配置和输入数据 */
  config: T;
  /** 进度回调 */
  onProgress?: (progress: number, message?: string) => void;
}
