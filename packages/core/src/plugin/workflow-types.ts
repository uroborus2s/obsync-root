/**
 * @stratix/core - Workflow Base Types
 * 
 * 工作流引擎的基础类型定义，供跨插件使用。
 * 这些类型定义了工作流系统的核心接口和数据结构。
 */

/**
 * 日志接口
 */
export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

/**
 * 任务执行结果
 */
export interface TaskResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    retryable?: boolean;
    details?: any;
  };
  metadata?: {
    executionTime?: number;
    memoryUsage?: number;
    fromCache?: boolean;
    [key: string]: any;
  };
}

/**
 * 执行上下文接口
 * 
 * 提供任务执行时的上下文信息和工具方法
 */
export interface ExecutionContext {
  // 基本信息
  workflowInstanceId: string;
  taskInstanceId: string;
  
  // 数据访问
  input: Record<string, any>;
  variables: Record<string, any>;
  
  // 工具方法
  logger: Logger;
  signal: AbortSignal;
  
  // 状态管理
  reportProgress(percentage: number): void;
  setVariable(key: string, value: any): void;
  getVariable(key: string): any;
  
  // 检查点支持
  saveCheckpoint(data: any): Promise<void>;
  loadCheckpoint(): Promise<any>;
  
  // 状态检查
  isPaused(): boolean;
  isCancelled(): boolean;
  isDebugMode(): boolean;
  
  // 调试支持
  debug(message: string, data?: any): void;
  waitForDebugger(): Promise<void>;
  
  // 时间信息
  startTime: number;
}

/**
 * 任务执行器接口
 * 
 * 所有任务执行器必须实现此接口
 */
export interface TaskExecutor<TInput = any, TOutput = any> {
  /**
   * 执行器名称，用于注册和查找
   */
  name: string;
  
  /**
   * 执行任务
   * 
   * @param input 输入数据
   * @param context 执行上下文
   * @returns 执行结果
   */
  execute(input: TInput, context: ExecutionContext): Promise<TaskResult<TOutput>>;
}

/**
 * 工作流定义基础接口
 * 
 * 定义工作流的基本结构，具体实现在 @stratix/tasks 中扩展
 */
export interface WorkflowDefinitionBase {
  id: string;
  name: string;
  version: string;
  description?: string;
  
  // 元数据
  metadata?: {
    sourcePlugin?: string;
    loadedAt?: Date;
    moduleName?: string;
    persist?: boolean;
    [key: string]: any;
  };
}

/**
 * 任务定义基础接口
 */
export interface TaskDefinitionBase {
  id: string;
  name: string;
  type: string;
  executor?: string;
  dependencies?: string[];
  parameters?: Record<string, any>;
}

/**
 * 工作流配置接口
 * 
 * 插件声明工作流组件时使用的配置
 */
export interface WorkflowConfig {
  enabled: boolean;
  patterns: string[];
  metadata?: {
    category?: string;
    provides?: {
      definitions?: string[];
      executors?: string[];
      services?: string[];
    };
  };
}

/**
 * 跨插件工作流加载器接口
 */
export interface CrossPluginWorkflowLoader {
  /**
   * 加载所有插件的工作流组件
   */
  loadAllPluginWorkflows(): Promise<void>;
  
  /**
   * 加载特定插件的工作流组件
   * 
   * @param pluginName 插件名称
   */
  loadPluginWorkflows(pluginName: string): Promise<void>;
}

/**
 * 执行器注册表接口
 */
export interface ExecutorRegistry {
  /**
   * 获取执行器
   * 
   * @param executorName 执行器名称
   * @returns 执行器实例或 null
   */
  getExecutor(executorName: string): Promise<TaskExecutor | null>;
  
  /**
   * 注册执行器
   * 
   * @param executor 执行器实例
   */
  registerExecutor(executor: TaskExecutor): Promise<void>;
  
  /**
   * 获取所有已注册的执行器
   */
  getAllExecutors(): Map<string, TaskExecutor>;
}

/**
 * 工作流定义注册表接口
 */
export interface WorkflowDefinitionRegistry {
  /**
   * 获取工作流定义
   * 
   * @param definitionId 定义ID
   * @returns 工作流定义或 null
   */
  getDefinition(definitionId: string): Promise<WorkflowDefinitionBase | null>;
  
  /**
   * 注册工作流定义
   * 
   * @param definition 工作流定义
   */
  registerDefinition(definition: WorkflowDefinitionBase): Promise<void>;
  
  /**
   * 获取所有已注册的定义
   */
  getAllDefinitions(): Map<string, WorkflowDefinitionBase>;
}

/**
 * 工作流引擎基础接口
 */
export interface WorkflowEngineBase {
  /**
   * 启动工作流
   * 
   * @param definitionId 工作流定义ID
   * @param input 输入数据
   * @param options 启动选项
   * @returns 工作流实例
   */
  startWorkflow(
    definitionId: string, 
    input?: any, 
    options?: any
  ): Promise<any>;
  
  /**
   * 获取工作流状态
   * 
   * @param instanceId 实例ID
   * @returns 工作流状态
   */
  getWorkflowStatus(instanceId: string): Promise<string>;
  
  /**
   * 获取工作流实例
   * 
   * @param instanceId 实例ID
   * @returns 工作流实例或 null
   */
  getInstance(instanceId: string): Promise<any | null>;
}

/**
 * 工作流中间件接口
 */
export interface WorkflowMiddleware {
  /**
   * 工作流执行前的钩子
   * 
   * @param context 执行上下文
   */
  beforeWorkflow?(context: ExecutionContext): Promise<void>;
  
  /**
   * 工作流执行后的钩子
   * 
   * @param result 执行结果
   * @param context 执行上下文
   */
  afterWorkflow?(result: any, context: ExecutionContext): Promise<void>;
  
  /**
   * 任务执行前的钩子
   * 
   * @param taskId 任务ID
   * @param context 执行上下文
   */
  beforeTask?(taskId: string, context: ExecutionContext): Promise<void>;
  
  /**
   * 任务执行后的钩子
   * 
   * @param taskId 任务ID
   * @param result 执行结果
   * @param context 执行上下文
   */
  afterTask?(taskId: string, result: any, context: ExecutionContext): Promise<void>;
}

/**
 * 条件表达式求值器接口
 */
export interface ConditionEvaluator {
  /**
   * 求值条件表达式
   * 
   * @param expression 条件表达式
   * @param context 上下文数据
   * @returns 求值结果
   */
  evaluate(expression: string, context: any): boolean;
}

/**
 * 工作流模板接口
 */
export interface WorkflowTemplate {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: any;
    options?: any[];
  }>;
  
  /**
   * 生成工作流定义
   * 
   * @param params 模板参数
   * @returns 工作流定义
   */
  generate(params: any): WorkflowDefinitionBase;
}

/**
 * 工作流事件接口
 */
export interface WorkflowEvent {
  type: string;
  workflowInstanceId: string;
  taskInstanceId?: string;
  timestamp: Date;
  data?: any;
}

/**
 * 工作流事件监听器接口
 */
export interface WorkflowEventListener {
  /**
   * 处理工作流事件
   * 
   * @param event 工作流事件
   */
  onEvent(event: WorkflowEvent): Promise<void>;
}

/**
 * 类型守卫：检查对象是否为任务执行器
 * 
 * @param obj 待检查对象
 * @returns 是否为任务执行器
 */
export function isTaskExecutor(obj: any): obj is TaskExecutor {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.name === 'string' &&
         typeof obj.execute === 'function';
}

/**
 * 类型守卫：检查对象是否为工作流定义
 * 
 * @param obj 待检查对象
 * @returns 是否为工作流定义
 */
export function isWorkflowDefinition(obj: any): obj is WorkflowDefinitionBase {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.id === 'string' &&
         typeof obj.name === 'string' &&
         typeof obj.version === 'string';
}

/**
 * 类型守卫：检查对象是否为工作流中间件
 * 
 * @param obj 待检查对象
 * @returns 是否为工作流中间件
 */
export function isWorkflowMiddleware(obj: any): obj is WorkflowMiddleware {
  return obj && 
         typeof obj === 'object' && 
         (typeof obj.beforeWorkflow === 'function' ||
          typeof obj.afterWorkflow === 'function' ||
          typeof obj.beforeTask === 'function' ||
          typeof obj.afterTask === 'function');
}
