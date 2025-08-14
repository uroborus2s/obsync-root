/**
 * 服务层接口定义
 *
 * 基于接口倒置原则设计的服务层接口
 * 版本: v3.0.0-refactored
 */

import type {
  WorkflowOptions,
  WorkflowInstance,
  NodeInstance,
  ExecutionContext,
  ExecutionResult,
  ServiceResult,
  QueryFilters,
  PaginationOptions
} from '../types/business.js';

/**
 * 工作流实例管理服务接口
 */
export interface IWorkflowInstanceService {
  /**
   * 获取或创建工作流实例
   * 
   * 如果是创建工作流实例：
   * 1. 检查实例锁：根据实例type检查是否有运行中或中断的实例
   * 2. 检查业务实例锁：根据参数判断是否有已执行的实例锁（检查所有实例）
   * 3. 执行其他检查点验证
   * 4. 创建工作流实例并写入数据库，返回工作流实例
   * 
   * 如果是恢复工作流实例：
   * 1. 查找中断的工作流实例
   * 2. 如果存在则修改工作流状态为执行中，并返回工作流实例
   */
  getWorkflowInstance(definitionsId: string, opts: WorkflowOptions): Promise<ServiceResult<WorkflowInstance>>;

  /**
   * 获取下一个执行节点
   * 
   * 1. 检查下一个节点的定义配置
   * 2. 从数据库根据实例id和节点类型定义检查节点实例是否存在
   * 3. 如果节点实例存在，直接返回
   * 4. 如果节点实例不存在，根据节点定义创建并保存到数据库
   * 5. 返回节点实例
   */
  getNextNode(node: NodeInstance): Promise<ServiceResult<NodeInstance | null>>;

  /**
   * 根据ID获取工作流实例
   */
  getById(id: number): Promise<ServiceResult<WorkflowInstance>>;

  /**
   * 更新工作流实例状态
   */
  updateStatus(id: number, status: string, errorMessage?: string, errorDetails?: any): Promise<ServiceResult<boolean>>;

  /**
   * 更新当前执行节点
   */
  updateCurrentNode(id: number, nodeId: string, checkpointData?: any): Promise<ServiceResult<boolean>>;

  /**
   * 查询工作流实例列表
   */
  findMany(filters?: QueryFilters, pagination?: PaginationOptions): Promise<ServiceResult<WorkflowInstance[]>>;

  /**
   * 查找中断的工作流实例
   */
  findInterruptedInstances(): Promise<ServiceResult<WorkflowInstance[]>>;
}

/**
 * 节点执行服务接口
 */
export interface INodeExecutionService {
  /**
   * 执行简单操作节点
   * 
   * 1. 执行基础操作节点逻辑
   * 2. 获取对应的执行器
   * 3. 调用执行器执行业务逻辑
   * 4. 返回执行结果
   */
  executeSimpleNode(node: NodeInstance, context: ExecutionContext): Promise<ServiceResult<ExecutionResult>>;

  /**
   * 执行循环节点
   * 
   * 1. 获取当前循环执行进度
   * 如果是创建状态：
   * 1. 执行数据获取器执行器
   * 2. 根据结果在事务中创建所有子节点实例并保存到数据库，同时修改节点进度状态
   * 如果是执行阶段：
   * 1. 获取所有未执行的子节点
   * 2. 根据并行或串行配置循环执行子节点 executeNode(childNode, childContext)
   * 3. 子节点执行成功后，修改子节点状态并更新循环节点进度状态
   * 4. 所有节点完成后修改节点状态为完成
   */
  executeLoopNode(node: NodeInstance, context: ExecutionContext): Promise<ServiceResult<ExecutionResult>>;

  /**
   * 执行子流程节点
   * 
   * 1. 调用 executeWorkflowInstance 执行子工作流
   * 2. 根据子工作流完成状态更新当前节点状态
   */
  executeSubProcessNode(node: NodeInstance, context: ExecutionContext): Promise<ServiceResult<ExecutionResult>>;

  /**
   * 执行并行节点
   * 
   * 1. 从定义中获取所有子节点定义
   * 2. 获取所有未执行的子节点实例
   * 3. 并行执行所有子节点 executeNode(childNode, context)
   * 4. 所有子节点完成后更新节点状态
   */
  executeParallelNode(node: NodeInstance, context: ExecutionContext): Promise<ServiceResult<ExecutionResult>>;

  /**
   * 通用节点执行入口
   * 
   * 1. 根据节点类型判断执行策略
   * 2. 简单类型：调用 executeSimpleNode
   * 3. 循环节点类型：调用 executeLoopNode
   * 4. 子流程节点类型：调用 executeSubProcessNode
   * 5. 并行节点类型：调用 executeParallelNode
   */
  executeNode(node: NodeInstance, context: ExecutionContext): Promise<ServiceResult<ExecutionResult>>;

  /**
   * 更新节点状态
   */
  updateNodeStatus(nodeId: number, status: string, errorMessage?: string, errorDetails?: any): Promise<ServiceResult<boolean>>;

  /**
   * 获取节点实例
   */
  getNodeInstance(workflowInstanceId: number, nodeId: string): Promise<ServiceResult<NodeInstance>>;

  /**
   * 创建节点实例
   */
  createNodeInstance(nodeInstance: Partial<NodeInstance>): Promise<ServiceResult<NodeInstance>>;
}

/**
 * 工作流执行服务接口
 */
export interface IWorkflowExecutionService {
  /**
   * 执行工作流实例主流程
   */
  executeWorkflowInstance(instance: WorkflowInstance): Promise<ServiceResult<void>>;

  /**
   * 启动工作流主入口
   * 
   * 1. 创建或读取工作流运行实例
   * 2. 执行工作流
   */
  startWorkflow(definitionsId: string, opts: WorkflowOptions): Promise<ServiceResult<void>>;

  /**
   * 恢复中断的工作流
   */
  resumeWorkflow(instanceId: number): Promise<ServiceResult<void>>;

  /**
   * 停止工作流执行
   */
  stopWorkflow(instanceId: number, reason?: string): Promise<ServiceResult<boolean>>;

  /**
   * 获取工作流执行状态
   */
  getWorkflowStatus(instanceId: number): Promise<ServiceResult<any>>;
}

/**
 * 工作流定义服务接口
 */
export interface IWorkflowDefinitionService {
  /**
   * 根据ID获取工作流定义
   */
  getById(id: number): Promise<ServiceResult<any>>;

  /**
   * 根据名称获取活跃的工作流定义
   */
  getActiveByName(name: string): Promise<ServiceResult<any>>;

  /**
   * 创建工作流定义
   */
  create(definition: any): Promise<ServiceResult<any>>;

  /**
   * 更新工作流定义
   */
  update(id: number, updates: any): Promise<ServiceResult<any>>;

  /**
   * 删除工作流定义
   */
  delete(id: number): Promise<ServiceResult<boolean>>;

  /**
   * 验证工作流定义
   */
  validate(definition: any): Promise<ServiceResult<boolean>>;
}

/**
 * 执行锁服务接口
 */
export interface IExecutionLockService {
  /**
   * 获取工作流执行锁
   */
  acquireWorkflowLock(instanceId: number, owner: string, timeoutMs?: number): Promise<ServiceResult<boolean>>;

  /**
   * 释放工作流执行锁
   */
  releaseWorkflowLock(instanceId: number, owner: string): Promise<ServiceResult<boolean>>;

  /**
   * 续期工作流执行锁
   */
  renewWorkflowLock(instanceId: number, owner: string, timeoutMs?: number): Promise<ServiceResult<boolean>>;

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): Promise<ServiceResult<number>>;
}
