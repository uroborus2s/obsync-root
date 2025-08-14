/**
 * 适配器层接口定义
 *
 * 设计适配器服务接口，用于对外部插件或应用提供服务
 * 版本: v3.0.0-refactored
 */

import type {
  WorkflowOptions,
  WorkflowInstance,
  ServiceResult,
  QueryFilters,
  PaginationOptions
} from '../types/business.js';

/**
 * 定时器任务配置
 */
export interface ScheduleConfig {
  /** 任务名称 */
  name: string;
  /** Cron表达式 */
  cronExpression: string;
  /** 时区 */
  timezone?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 最大并发实例数 */
  maxInstances?: number;
  /** 输入数据 */
  inputData?: any;
  /** 工作流选项 */
  workflowOptions?: WorkflowOptions;
}

/**
 * 定时器任务信息
 */
export interface ScheduleInfo {
  /** 任务ID */
  id: number;
  /** 任务名称 */
  name: string;
  /** 工作流定义ID */
  workflowDefinitionId: number;
  /** Cron表达式 */
  cronExpression: string;
  /** 时区 */
  timezone: string;
  /** 是否启用 */
  enabled: boolean;
  /** 下次运行时间 */
  nextRunAt?: Date;
  /** 上次运行时间 */
  lastRunAt?: Date;
  /** 最大并发实例数 */
  maxInstances: number;
  /** 输入数据 */
  inputData?: any;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 工作流状态信息
 */
export interface WorkflowStatusInfo {
  /** 实例ID */
  instanceId: number;
  /** 工作流名称 */
  workflowName: string;
  /** 实例名称 */
  instanceName: string;
  /** 状态 */
  status: string;
  /** 当前节点ID */
  currentNodeId?: string;
  /** 进度百分比 */
  progress?: number;
  /** 开始时间 */
  startedAt?: Date;
  /** 完成时间 */
  completedAt?: Date;
  /** 错误信息 */
  errorMessage?: string;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
}

/**
 * 工作流执行统计
 */
export interface WorkflowStats {
  /** 总实例数 */
  totalInstances: number;
  /** 运行中实例数 */
  runningInstances: number;
  /** 完成实例数 */
  completedInstances: number;
  /** 失败实例数 */
  failedInstances: number;
  /** 中断实例数 */
  interruptedInstances: number;
  /** 平均执行时间（毫秒） */
  averageExecutionTime?: number;
  /** 成功率 */
  successRate?: number;
}

/**
 * Tasks工作流适配器接口
 * 
 * 适配器只能调用服务层，不能直接访问仓储层
 */
export interface ITasksWorkflowAdapter {
  /**
   * 创建定时器任务
   * 
   * @param workflowDefinitionId 工作流定义ID
   * @param scheduleConfig 定时器配置
   * @returns 创建的定时器任务信息
   */
  createSchedule(workflowDefinitionId: number, scheduleConfig: ScheduleConfig): Promise<ServiceResult<ScheduleInfo>>;

  /**
   * 修改定时器任务
   * 
   * @param scheduleId 定时器任务ID
   * @param updates 更新配置
   * @returns 更新后的定时器任务信息
   */
  updateSchedule(scheduleId: number, updates: Partial<ScheduleConfig>): Promise<ServiceResult<ScheduleInfo>>;

  /**
   * 删除定时器任务
   * 
   * @param scheduleId 定时器任务ID
   * @returns 删除结果
   */
  deleteSchedule(scheduleId: number): Promise<ServiceResult<boolean>>;

  /**
   * 启用/禁用定时器任务
   * 
   * @param scheduleId 定时器任务ID
   * @param enabled 是否启用
   * @returns 操作结果
   */
  toggleSchedule(scheduleId: number, enabled: boolean): Promise<ServiceResult<boolean>>;

  /**
   * 获取定时器任务列表
   * 
   * @param workflowDefinitionId 工作流定义ID（可选）
   * @param pagination 分页参数
   * @returns 定时器任务列表
   */
  getSchedules(workflowDefinitionId?: number, pagination?: PaginationOptions): Promise<ServiceResult<ScheduleInfo[]>>;

  /**
   * 手动启动工作流（创建工作流实例）
   * 
   * @param workflowDefinitionId 工作流定义ID
   * @param options 工作流选项
   * @returns 创建的工作流实例
   */
  startWorkflow(workflowDefinitionId: number, options?: WorkflowOptions): Promise<ServiceResult<WorkflowInstance>>;

  /**
   * 手动启动工作流（通过工作流名称）
   * 
   * @param workflowName 工作流名称
   * @param options 工作流选项
   * @returns 创建的工作流实例
   */
  startWorkflowByName(workflowName: string, options?: WorkflowOptions): Promise<ServiceResult<WorkflowInstance>>;

  /**
   * 恢复中断的工作流
   * 
   * @param instanceId 工作流实例ID
   * @returns 恢复结果
   */
  resumeWorkflow(instanceId: number): Promise<ServiceResult<boolean>>;

  /**
   * 停止工作流执行
   * 
   * @param instanceId 工作流实例ID
   * @param reason 停止原因
   * @returns 停止结果
   */
  stopWorkflow(instanceId: number, reason?: string): Promise<ServiceResult<boolean>>;

  /**
   * 取消工作流执行
   * 
   * @param instanceId 工作流实例ID
   * @param reason 取消原因
   * @returns 取消结果
   */
  cancelWorkflow(instanceId: number, reason?: string): Promise<ServiceResult<boolean>>;

  /**
   * 获取工作流实例状态
   * 
   * @param instanceId 工作流实例ID
   * @returns 工作流状态信息
   */
  getWorkflowStatus(instanceId: number): Promise<ServiceResult<WorkflowStatusInfo>>;

  /**
   * 获取工作流实例详情
   * 
   * @param instanceId 工作流实例ID
   * @returns 工作流实例详情
   */
  getWorkflowInstance(instanceId: number): Promise<ServiceResult<WorkflowInstance>>;

  /**
   * 查询工作流实例列表
   * 
   * @param filters 查询过滤器
   * @param pagination 分页参数
   * @returns 工作流实例列表
   */
  getWorkflowInstances(filters?: QueryFilters, pagination?: PaginationOptions): Promise<ServiceResult<WorkflowInstance[]>>;

  /**
   * 获取工作流执行统计
   * 
   * @param workflowDefinitionId 工作流定义ID（可选）
   * @param timeRange 时间范围（可选）
   * @returns 执行统计信息
   */
  getWorkflowStats(workflowDefinitionId?: number, timeRange?: { start: Date; end: Date }): Promise<ServiceResult<WorkflowStats>>;

  /**
   * 获取中断的工作流实例列表
   * 
   * @returns 中断的工作流实例列表
   */
  getInterruptedWorkflows(): Promise<ServiceResult<WorkflowInstance[]>>;

  /**
   * 批量恢复中断的工作流
   * 
   * @param instanceIds 工作流实例ID列表
   * @returns 恢复结果
   */
  batchResumeWorkflows(instanceIds: number[]): Promise<ServiceResult<{ success: number; failed: number }>>;

  /**
   * 清理过期的工作流实例
   * 
   * @param beforeDate 清理此日期之前的实例
   * @returns 清理结果
   */
  cleanupExpiredInstances(beforeDate: Date): Promise<ServiceResult<number>>;

  /**
   * 健康检查
   * 
   * @returns 健康状态
   */
  healthCheck(): Promise<ServiceResult<{ status: 'healthy' | 'unhealthy'; details?: any }>>;
}
