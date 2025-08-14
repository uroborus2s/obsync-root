/**
 * Tasks插件业务类型定义
 *
 * 定义工作流业务逻辑相关的类型
 * 版本: v3.0.0-refactored
 */

/**
 * 工作流选项
 */
export interface WorkflowOptions {
  /** 业务键，用于业务实例锁检查 */
  businessKey?: string;
  /** 互斥键，用于互斥锁检查 */
  mutexKey?: string;
  /** 输入数据 */
  inputData?: any;
  /** 上下文数据 */
  contextData?: any;
  /** 检查点函数 */
  checkpointFunctions?: Record<string, (context: any) => Promise<boolean>>;
  /** 是否恢复中断的实例 */
  resume?: boolean;
}

/**
 * 工作流实例状态
 */
export type WorkflowInstanceStatus = 
  | 'pending'      // 待执行
  | 'running'      // 执行中
  | 'interrupted'  // 中断
  | 'completed'    // 完成
  | 'failed'       // 失败
  | 'cancelled';   // 取消

/**
 * 节点类型
 */
export type NodeType = 
  | 'simple'       // 简单操作节点
  | 'loop'         // 循环节点
  | 'parallel'     // 并行节点
  | 'subprocess';  // 子流程节点

/**
 * 节点实例状态
 */
export type NodeInstanceStatus = 
  | 'pending'      // 待执行
  | 'running'      // 执行中
  | 'completed'    // 成功
  | 'failed'       // 失败
  | 'failed_retry'; // 失败待重试

/**
 * 执行上下文
 */
export interface ExecutionContext {
  /** 工作流实例ID */
  workflowInstanceId: number;
  /** 工作流定义 */
  workflowDefinition: any;
  /** 输入数据 */
  inputData: any;
  /** 上下文数据 */
  contextData: any;
  /** 检查点函数 */
  checkpointFunctions?: Record<string, (context: any) => Promise<boolean>>;
  /** 执行器注册表 */
  executorRegistry: any;
  /** 日志记录器 */
  logger: any;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 输出数据 */
  data?: any;
  /** 错误信息 */
  error?: string;
  /** 错误详情 */
  errorDetails?: any;
  /** 执行时长（毫秒） */
  duration?: number;
}

/**
 * 工作流实例
 */
export interface WorkflowInstance {
  id: number;
  workflowDefinitionId: number;
  name: string;
  externalId?: string;
  status: WorkflowInstanceStatus;
  instanceType: string;
  inputData?: any;
  outputData?: any;
  contextData?: any;
  businessKey?: string;
  mutexKey?: string;
  startedAt?: Date;
  completedAt?: Date;
  interruptedAt?: Date;
  errorMessage?: string;
  errorDetails?: any;
  retryCount: number;
  maxRetries: number;
  currentNodeId?: string;
  checkpointData?: any;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 节点实例
 */
export interface NodeInstance {
  id: number;
  workflowInstanceId: number;
  nodeId: string;
  nodeName: string;
  nodeType: NodeType;
  executor?: string;
  executorConfig?: any;
  status: NodeInstanceStatus;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
  errorDetails?: any;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  retryCount: number;
  maxRetries: number;
  parentNodeId?: number;
  childIndex?: number;
  loopProgress?: any;
  loopTotalCount?: number;
  loopCompletedCount: number;
  parallelGroupId?: string;
  parallelIndex?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
  id: number;
  name: string;
  version: string;
  displayName?: string;
  description?: string;
  definition: any;
  category?: string;
  tags?: string[];
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  isActive: boolean;
  timeoutSeconds?: number;
  maxRetries: number;
  retryDelaySeconds: number;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 循环进度状态
 */
export interface LoopProgress {
  /** 循环状态：creating-创建中，executing-执行中，completed-完成 */
  status: 'creating' | 'executing' | 'completed';
  /** 总数 */
  totalCount: number;
  /** 已完成数 */
  completedCount: number;
  /** 失败数 */
  failedCount: number;
  /** 当前批次索引 */
  currentBatchIndex?: number;
  /** 批次大小 */
  batchSize?: number;
}

/**
 * 服务结果包装器
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorDetails?: any;
}

/**
 * 分页查询参数
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 查询过滤器
 */
export interface QueryFilters {
  status?: WorkflowInstanceStatus | WorkflowInstanceStatus[];
  instanceType?: string;
  businessKey?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}
