/**
 * 服务层接口定义
 *
 * 基于接口倒置原则设计的服务层接口
 * 版本: v3.0.0-refactored
 */

import type {
  ExecutionResult,
  PaginatedResult,
  PaginationOptions,
  QueryFilters,
  ServiceResult,
  WorkflowInstance,
  WorkflowOptions
} from '../types/business.js';
import type {
  NewWorkflowDefinitionTable,
  WorkflowDefinitionTable,
  WorkflowDefinitionTableUpdate
} from '../types/database.js';
import type { InputProcessingOptions } from '../types/input-validation.js';
import type {
  NodeInstance,
  NodeInstanceWithChildren
} from '../types/unified-node.js';
import type { ExecutionContext, WorkflowInput } from '../types/workflow.js';

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
  getWorkflowInstance(
    workflowDefinition: WorkflowDefinitionTable,
    opts: WorkflowOptions
  ): Promise<ServiceResult<WorkflowInstance>>;

  /**
   * 获取下一个执行节点
   *
   * 1. 检查下一个节点的定义配置
   * 2. 从数据库根据实例id和节点类型定义检查节点实例是否存在
   * 3. 如果节点实例存在，直接返回
   * 4. 如果节点实例不存在，根据节点定义创建并保存到数据库
   * 5. 返回节点实例
   */
  getNextNode(
    definition: WorkflowDefinitionTable,
    instance: WorkflowInstance,
    node: NodeInstance
  ): Promise<ServiceResult<NodeInstance | null>>;

  /**
   * 根据ID获取工作流实例
   */
  getById(id: number): Promise<ServiceResult<WorkflowInstance>>;

  /**
   * 根据external_id查询工作流实例
   * 用于子流程节点查找已存在的工作流实例
   */
  findByExternalId(
    externalId: string
  ): Promise<ServiceResult<WorkflowInstance | null>>;

  /**
   * 更新工作流实例状态
   */
  updateStatus(
    id: number,
    status: string,
    errorMessage?: string,
    errorDetails?: any
  ): Promise<ServiceResult<boolean>>;

  /**
   * 更新当前执行节点
   */
  updateCurrentNode(
    id: number,
    nodeId: string,
    checkpointData?: any
  ): Promise<ServiceResult<boolean>>;

  /**
   * 查询工作流实例列表
   */
  findMany(
    filters?: QueryFilters,
    pagination?: PaginationOptions
  ): Promise<
    ServiceResult<{
      items: WorkflowInstance[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }>
  >;

  /**
   * 获取流程分组列表
   * 按工作流定义聚合根实例，返回分组统计信息
   */
  getWorkflowGroups(
    filters?: QueryFilters,
    options?: {
      page?: number;
      pageSize?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<
    ServiceResult<{
      groups: Array<{
        workflowDefinitionId: number;
        workflowDefinitionName: string;
        workflowDefinitionDescription?: string;
        workflowDefinitionVersion?: string;
        rootInstanceCount: number;
        totalInstanceCount: number;
        runningInstanceCount: number;
        completedInstanceCount: number;
        failedInstanceCount: number;
        latestActivity?: string;
        latestInstanceStatus?: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }>
  >;

  /**
   * 查找中断的工作流实例
   */
  findInterruptedInstances(): Promise<ServiceResult<WorkflowInstance[]>>;

  /**
   * 获取工作流实例的节点实例（包含子节点层次结构）
   * 用于流程图展示，如果节点有子节点，会在节点中包含完整的子节点信息
   *
   * @param workflowInstanceId 工作流实例ID
   * @param nodeId 可选，指定节点ID。如果提供，则只返回该节点及其子节点；如果不提供，返回所有顶级节点
   */
  getNodeInstances(
    workflowInstanceId: number,
    nodeId?: string
  ): Promise<ServiceResult<NodeInstanceWithChildren[]>>;
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
  executeSimpleNode(
    executionContext: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>>;

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
  executeLoopNode(
    executionContext: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>>;

  /**
   * 执行子流程节点
   *
   * 1. 调用 executeWorkflowInstance 执行子工作流
   * 2. 根据子工作流完成状态更新当前节点状态
   */
  executeSubProcessNode(
    context: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>>;

  /**
   * 执行并行节点
   *
   * 1. 从定义中获取所有子节点定义
   * 2. 获取所有未执行的子节点实例
   * 3. 并行执行所有子节点 executeNode(childNode, context)
   * 4. 所有子节点完成后更新节点状态
   */
  executeParallelNode(
    node: NodeInstance,
    context: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>>;

  /**
   * 通用节点执行入口
   *
   * 1. 根据节点类型判断执行策略
   * 2. 简单类型：调用 executeSimpleNode
   * 3. 循环节点类型：调用 executeLoopNode
   * 4. 子流程节点类型：调用 executeSubProcessNode
   * 5. 并行节点类型：调用 executeParallelNode
   */
  executeNode(
    executionContext: ExecutionContext
  ): Promise<ServiceResult<ExecutionResult>>;

  executeWorkflowInstance(
    definition: WorkflowDefinitionTable,
    instance: WorkflowInstance
  ): Promise<ServiceResult<any>>;

  /**
   * 更新节点状态
   */
  updateNodeStatus(
    nodeId: number,
    status: string,
    errorMessage?: string,
    errorDetails?: any
  ): Promise<ServiceResult<boolean>>;

  /**
   * 获取节点实例
   */
  getNodeInstance(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<ServiceResult<NodeInstance>>;

  /**
   * 创建节点实例
   */
  createNodeInstance(
    nodeInstance: Partial<NodeInstance>
  ): Promise<ServiceResult<NodeInstance>>;

  /**
   * 解析模板变量
   */
  resolveTemplateVariables(
    executionContext: ExecutionContext,
    variables: Record<string, any>,
    inputData?: Record<string, any>
  ): Promise<any>;

  handleWorkflowError(
    instance: WorkflowInstance,
    error: string,
    errorDetails?: any
  ): Promise<void>;
}

/**
 * 工作流执行服务接口
 */
export interface IWorkflowExecutionService {
  /**
   * 执行工作流实例主流程
   */
  executeWorkflowInstance(
    definition: WorkflowDefinitionTable,
    instance: WorkflowInstance
  ): Promise<ServiceResult<void>>;

  /**
   * 启动工作流主入口
   *
   * 1. 创建或读取工作流运行实例
   * 2. 执行工作流
   */
  startWorkflow(
    definition: WorkflowDefinitionTable,
    opts: WorkflowOptions
  ): Promise<ServiceResult<WorkflowInstance>>;

  /**
   * 恢复中断的工作流
   */
  resumeWorkflow(instanceId: number): Promise<ServiceResult<void>>;

  /**
   * 停止工作流执行
   */
  stopWorkflow(
    instanceId: number,
    reason?: string
  ): Promise<ServiceResult<boolean>>;

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
  getById(id: number): Promise<ServiceResult<WorkflowDefinitionTable>>;

  /**
   * 根据名称获取活跃的工作流定义
   */
  getActiveByName(
    name: string
  ): Promise<ServiceResult<WorkflowDefinitionTable>>;

  /**
   * 根据名称和版本获取工作流定义
   */
  getByNameAndVersion(
    name: string,
    version: string
  ): Promise<ServiceResult<WorkflowDefinitionTable>>;

  /**
   * 创建工作流定义
   */
  create(
    definition: NewWorkflowDefinitionTable
  ): Promise<ServiceResult<WorkflowDefinitionTable>>;

  /**
   * 更新工作流定义
   */
  update(
    id: number,
    updates: WorkflowDefinitionTableUpdate
  ): Promise<ServiceResult<WorkflowDefinitionTable>>;

  /**
   * 删除工作流定义
   */
  delete(id: number): Promise<ServiceResult<boolean>>;

  /**
   * 查询工作流定义列表
   */
  findMany(
    filters?: {
      status?: string;
      category?: string;
      isActive?: boolean;
      search?: string;
    },
    pagination?: PaginationOptions
  ): Promise<ServiceResult<PaginatedResult<WorkflowDefinitionTable>>>;

  /**
   * 验证工作流定义
   */
  validate(definition: any): Promise<ServiceResult<boolean>>;

  /**
   * 验证和处理工作流输入参数
   */
  validateAndProcessInputs(
    workflowDefinition: WorkflowDefinitionTable,
    rawInputs: Record<string, any>,
    options?: InputProcessingOptions
  ): Promise<ServiceResult<Record<string, any>>>;

  /**
   * 获取工作流输入参数定义
   */
  getInputDefinitions(
    workflowDefinition: WorkflowDefinitionTable
  ): WorkflowInput[];

  /**
   * 验证工作流输入参数定义的有效性
   */
  validateInputDefinitions(
    inputDefinitions: WorkflowInput[]
  ): ServiceResult<boolean>;
}

/**
 * 执行锁服务接口
 */
export interface IExecutionLockService {
  /**
   * 获取工作流执行锁
   */
  acquireWorkflowLock(
    instanceId: number,
    owner: string,
    timeoutMs?: number
  ): Promise<ServiceResult<boolean>>;

  /**
   * 释放工作流执行锁
   */
  releaseWorkflowLock(
    instanceId: number,
    owner: string
  ): Promise<ServiceResult<boolean>>;

  /**
   * 续期工作流执行锁
   */
  renewWorkflowLock(
    instanceId: number,
    owner: string,
    timeoutMs?: number
  ): Promise<ServiceResult<boolean>>;

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): Promise<ServiceResult<number>>;
}

/**
 * 模板变量替换选项
 */
export interface TemplateOptions {
  /** 是否严格模式，未定义变量时抛出错误 */
  strict?: boolean;
  /** 未定义变量的默认值 */
  defaultValue?: any;
}

/**
 * 模板处理结果
 */
export interface TemplateResult {
  /** 处理后的值 */
  value: any;
  /** 是否有变量被替换 */
  hasVariables: boolean;
  /** 未找到的变量列表 */
  missingVariables: string[];
}

/**
 * 模板处理服务接口
 */
export interface ITemplateService {
  /**
   * 从对象路径获取值
   * 支持点号路径访问，如 'user.profile.name'
   */
  getValueFromPath(path: string, variables: Record<string, any>): any;

  /**
   * 解析单个模板表达式
   *
   * @param expression 模板表达式字符串
   * @param variables 变量对象
   * @param options 处理选项
   * @returns 解析结果
   */
  evaluateExpression(
    expression: string,
    variables: Record<string, any>,
    options?: TemplateOptions
  ): TemplateResult;

  /**
   * 递归解析配置对象中的所有模板变量
   *
   * @param config 配置对象
   * @param variables 变量对象
   * @param options 处理选项
   * @returns 解析后的配置对象
   */
  resolveConfigVariables(
    config: any,
    variables: Record<string, any>,
    options?: TemplateOptions
  ): any;

  /**
   * 批量处理多个配置对象
   *
   * @param configs 配置对象数组
   * @param variables 变量对象
   * @param options 处理选项
   * @returns 解析后的配置对象数组
   */
  resolveMultipleConfigs(
    configs: any[],
    variables: Record<string, any>,
    options?: TemplateOptions
  ): any[];

  /**
   * 验证模板表达式的语法
   *
   * @param expression 模板表达式
   * @returns 是否有效
   */
  validateTemplateExpression(expression: string): boolean;

  /**
   * 提取模板表达式中的所有变量名
   *
   * @param expression 模板表达式
   * @returns 变量名数组
   */
  extractVariableNames(expression: string): string[];
}
