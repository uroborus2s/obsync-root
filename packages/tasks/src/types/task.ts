/**
 * 任务相关类型定义
 */

/**
 * 任务状态枚举
 */
export type TaskStatus =
  | 'pending' // 等待执行
  | 'running' // 正在执行
  | 'completed' // 已完成
  | 'failed' // 执行失败
  | 'skipped' // 已跳过
  | 'cancelled'; // 已取消

/**
 * 任务节点
 */
export interface TaskNode {
  /** 任务ID */
  id: number;
  /** 工作流实例ID */
  workflowInstanceId: number;
  /** 节点键（在定义中的标识） */
  nodeKey: string;
  /** 节点名称 */
  nodeName: string;
  /** 节点类型 */
  nodeType: string;
  /** 执行器名称 */
  executorName?: string;
  /** 执行器配置 */
  executorConfig: Record<string, any>;
  /** 任务状态 */
  status: TaskStatus;
  /** 输入数据 */
  inputData: Record<string, any>;
  /** 输出数据 */
  outputData?: Record<string, any>;
  /** 父节点ID */
  parentNodeId?: number;
  /** 依赖的节点ID */
  dependsOn: number[];
  /** 并行组ID */
  parallelGroupId?: string;
  /** 并行索引 */
  parallelIndex?: number;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 错误信息 */
  errorMessage?: string;
  /** 错误详情 */
  errorDetails?: any;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 任务执行结果
 */
export interface TaskResult {
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
  /** 是否需要重试 */
  shouldRetry?: boolean;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
}

/**
 * 任务执行上下文
 */
export interface TaskExecutionContext {
  /** 任务节点 */
  task: TaskNode;
  /** 工作流实例 */
  workflowInstance: any; // WorkflowInstance
  /** 工作流定义 */
  workflowDefinition: any; // WorkflowDefinition
  /** 输入数据 */
  inputs: Record<string, any>;
  /** 上下文数据 */
  context: Record<string, any>;
  /** 日志记录器 */
  logger: any;
  /** 取消信号 */
  signal?: AbortSignal;
}

/**
 * 任务调度信息
 */
export interface TaskScheduleInfo {
  /** 任务ID */
  taskId: number;
  /** 调度时间 */
  scheduledAt: Date;
  /** 优先级 */
  priority: number;
  /** 依赖任务 */
  dependencies: number[];
  /** 是否可以执行 */
  canExecute: boolean;
}

/**
 * 任务执行统计
 */
export interface TaskExecutionStats {
  /** 总任务数 */
  totalTasks: number;
  /** 待执行任务数 */
  pendingTasks: number;
  /** 正在执行任务数 */
  runningTasks: number;
  /** 已完成任务数 */
  completedTasks: number;
  /** 失败任务数 */
  failedTasks: number;
  /** 平均执行时间 */
  averageExecutionTime: number;
  /** 成功率 */
  successRate: number;
}

/**
 * 任务查询条件
 */
export interface TaskQueryOptions {
  /** 工作流实例ID */
  workflowInstanceId?: string;
  /** 任务状态 */
  status?: TaskStatus | TaskStatus[];
  /** 执行器名称 */
  executorName?: string;
  /** 节点类型 */
  nodeType?: string;
  /** 创建时间范围 */
  createdAt?: {
    from?: Date;
    to?: Date;
  };
  /** 分页选项 */
  pagination?: {
    page: number;
    limit: number;
  };
  /** 排序选项 */
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

/**
 * 任务更新数据
 */
export interface TaskUpdateData {
  /** 状态 */
  status?: TaskStatus;
  /** 输出数据 */
  outputData?: Record<string, any>;
  /** 错误信息 */
  errorMessage?: string;
  /** 错误详情 */
  errorDetails?: any;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 重试次数 */
  retryCount?: number;
}
