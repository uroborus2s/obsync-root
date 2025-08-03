/**
 * 工作流引擎
 *
 * 负责工作流的执行、状态管理和生命周期控制
 */

import type { Logger } from '@stratix/core';
import * as executorRegistry from '../registerTask.js';
import WorkflowInstanceRepository from '../repositories/WorkflowInstanceRepository.js';
import type { NewWorkflowInstance } from '../types/database.js';
import type {
  NodeDefinition,
  TaskNodeDefinition,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStatus
} from '../types/workflow.js';

/**
 * 工作流引擎接口
 */
export interface WorkflowEngine {
  /**
   * 启动工作流实例
   * @param definition 工作流定义
   * @param inputs 输入数据
   * @returns 工作流实例
   */
  startWorkflow(
    definition: WorkflowDefinition,
    inputs: any
  ): Promise<WorkflowInstance>;

  /**
   * 恢复工作流执行
   * @param instanceId 实例ID
   */
  resumeWorkflow(instanceId: string): Promise<void>;

  /**
   * 暂停工作流
   * @param instanceId 实例ID
   */
  pauseWorkflow(instanceId: string): Promise<void>;

  /**
   * 取消工作流
   * @param instanceId 实例ID
   */
  cancelWorkflow(instanceId: string): Promise<void>;

  /**
   * 获取执行状态
   * @param instanceId 实例ID
   * @returns 工作流状态
   */
  getWorkflowStatus(instanceId: string): Promise<WorkflowStatus>;
}

/**
 * 执行上下文
 */
interface ExecutionContext {
  instance: WorkflowInstance;
  definition: WorkflowDefinition;
  executorRegistry: typeof executorRegistry;
  currentNode?: NodeDefinition;
  variables: Record<string, any>;
}

/**
 * 工作流引擎实现
 */
export class WorkflowEngineService implements WorkflowEngine {
  private readonly executionContexts = new Map<string, ExecutionContext>();

  constructor(
    private logger: Logger,
    private workflowInstanceRepository: WorkflowInstanceRepository
  ) {}

  /**
   * 启动工作流实例
   */
  async startWorkflow(
    definition: WorkflowDefinition,
    inputs: any
  ): Promise<WorkflowInstance> {
    this.logger.info(`Starting workflow: ${definition.name}`);

    // 验证工作流定义
    this.validateWorkflowDefinition(definition);

    // 验证输入参数
    this.validateInputs(definition, inputs);

    // 获取工作流定义ID
    const workflowDefinitionId = definition.id;
    if (!workflowDefinitionId) {
      throw new Error(
        `工作流定义缺少数据库ID，请确保工作流定义已保存到数据库: ${definition.name} v${definition.version}`
      );
    }

    // 创建工作流实例数据
    const newInstanceData: NewWorkflowInstance = {
      workflow_definition_id: workflowDefinitionId,
      name: definition.name,
      external_id: null,
      status: 'pending',
      input_data: inputs,
      output_data: null,
      context_data: {},
      started_at: null,
      completed_at: null,
      paused_at: null,
      error_message: null,
      error_details: null,
      retry_count: 0,
      max_retries: definition.config?.retryPolicy?.maxAttempts || 3,
      priority: definition.config?.priority || 0,
      scheduled_at: null,
      created_by: null
    };

    // 保存到数据库
    const createResult = await (this.workflowInstanceRepository as any).create(
      newInstanceData
    );
    if (!createResult.success) {
      throw new Error(
        `Failed to create workflow instance: ${createResult.error}`
      );
    }

    const instance = createResult.data as WorkflowInstance;

    // 创建执行上下文
    const context: ExecutionContext = {
      instance,
      definition,
      executorRegistry: executorRegistry,
      variables: { ...inputs }
    };

    // 保存执行上下文到内存（用于当前执行）
    this.executionContexts.set(instance.id.toString(), context);

    // 开始执行
    await this.executeWorkflow(context);

    return instance;
  }

  /**
   * 恢复工作流执行
   */
  async resumeWorkflow(instanceId: string): Promise<void> {
    const context = this.executionContexts.get(instanceId);
    if (!context) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (context.instance.status !== 'paused') {
      throw new Error(
        `Cannot resume workflow in status: ${context.instance.status}`
      );
    }

    this.logger.info(`Resuming workflow: ${instanceId}`);
    context.instance.status = 'running';
    context.instance.updatedAt = new Date();

    await this.executeWorkflow(context);
  }

  /**
   * 暂停工作流
   */
  async pauseWorkflow(instanceId: string): Promise<void> {
    const context = this.executionContexts.get(instanceId);
    if (!context) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (context.instance.status !== 'running') {
      throw new Error(
        `Cannot pause workflow in status: ${context.instance.status}`
      );
    }

    this.logger.info(`Pausing workflow: ${instanceId}`);
    context.instance.status = 'paused';
    context.instance.pausedAt = new Date();
    context.instance.updatedAt = new Date();
  }

  /**
   * 取消工作流
   */
  async cancelWorkflow(instanceId: string): Promise<void> {
    const context = this.executionContexts.get(instanceId);
    if (!context) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    this.logger.info(`Cancelling workflow: ${instanceId}`);
    context.instance.status = 'cancelled';
    context.instance.updatedAt = new Date();

    // 清理执行上下文
    this.executionContexts.delete(instanceId);
  }

  /**
   * 获取执行状态
   */
  async getWorkflowStatus(instanceId: string): Promise<WorkflowStatus> {
    const result = await this.workflowInstanceRepository.findByIdNullable(
      Number(instanceId)
    );
    if (!result.success || !result.data) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    return result.data.status as WorkflowStatus;
  }

  /**
   * 执行工作流
   */
  private async executeWorkflow(context: ExecutionContext): Promise<void> {
    try {
      context.instance.status = 'running';
      context.instance.startedAt = new Date();
      context.instance.updatedAt = new Date();

      // 执行所有节点
      for (const node of context.definition.nodes) {
        // 检查当前状态，如果不是运行状态则停止执行
        if (context.instance.status !== 'running') {
          break;
        }

        await this.executeNode(context, node);
      }

      // 如果没有被暂停或取消，标记为完成
      if (context.instance.status === 'running') {
        context.instance.status = 'completed';
        context.instance.completedAt = new Date();
        context.instance.updatedAt = new Date();

        this.logger.info(`Workflow completed: ${context.instance.id}`);
      }
    } catch (error) {
      this.logger.error(
        `Workflow execution failed: ${context.instance.id}`,
        error
      );

      context.instance.status = 'failed';
      context.instance.errorMessage =
        error instanceof Error ? error.message : String(error);
      context.instance.errorDetails = error;
      context.instance.updatedAt = new Date();

      // 检查是否需要重试
      if (context.instance.retryCount < context.instance.maxRetries) {
        context.instance.retryCount++;
        this.logger.info(
          `Retrying workflow: ${context.instance.id} (attempt ${context.instance.retryCount})`
        );

        // 延迟后重试
        setTimeout(() => {
          this.executeWorkflow(context).catch((err) => {
            this.logger.error(
              `Retry failed for workflow: ${context.instance.id}`,
              err
            );
          });
        }, this.calculateRetryDelay(context.instance.retryCount));
      }
    }
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    context: ExecutionContext,
    node: NodeDefinition
  ): Promise<void> {
    this.logger.info(`Executing node: ${node.id} (${node.type})`);

    context.currentNode = node;

    // 检查执行条件
    if (
      node.condition &&
      !this.evaluateCondition(node.condition, context.variables)
    ) {
      this.logger.info(
        `Skipping node ${node.id} due to condition: ${node.condition}`
      );
      return;
    }

    switch (node.type) {
      case 'task':
        await this.executeTaskNode(context, node as TaskNodeDefinition);
        break;
      case 'parallel':
        await this.executeParallelNode(context, node);
        break;
      case 'condition':
        await this.executeConditionNode(context, node);
        break;
      case 'loop':
        await this.executeLoopNode(context, node);
        break;
      default:
        this.logger.warn(`Unknown node type: ${node.type}`);
    }
  }

  /**
   * 执行并行节点
   */
  private async executeParallelNode(
    context: ExecutionContext,
    node: NodeDefinition
  ): Promise<void> {
    this.logger.info(`Executing parallel node: ${node.id}`);

    // 获取并行分支
    const branches = (node as any).branches || [];
    if (branches.length === 0) {
      this.logger.warn(`No branches found for parallel node: ${node.id}`);
      return;
    }

    try {
      // 并行执行所有分支
      const branchPromises = branches.map(
        async (branch: NodeDefinition[], branchIndex: number) => {
          this.logger.info(
            `Starting parallel branch ${branchIndex} for node: ${node.id}`
          );

          // 为每个分支创建独立的变量作用域
          const branchContext = {
            ...context,
            variables: { ...context.variables }
          };

          // 顺序执行分支内的节点
          for (const branchNode of branch) {
            // 检查工作流状态
            if (context.instance.status !== 'running') {
              this.logger.info(
                `Workflow stopped, cancelling branch ${branchIndex}`
              );
              break;
            }

            await this.executeNode(branchContext, branchNode);
          }

          this.logger.info(
            `Completed parallel branch ${branchIndex} for node: ${node.id}`
          );
          return branchContext.variables;
        }
      );

      // 等待所有分支完成
      const branchResults = await Promise.all(branchPromises);

      // 合并分支结果到主上下文
      branchResults.forEach((branchVars, index) => {
        // 将分支结果存储到特定的命名空间
        context.variables[`branches.${node.id}.${index}`] = branchVars;
      });

      this.logger.info(`Parallel node completed: ${node.id}`);
    } catch (error) {
      this.logger.error(`Parallel node execution failed: ${node.id}`, error);
      throw error;
    }
  }

  /**
   * 执行条件节点
   */
  private async executeConditionNode(
    context: ExecutionContext,
    node: NodeDefinition
  ): Promise<void> {
    this.logger.info(`Executing condition node: ${node.id}`);

    const conditionNode = node as any;
    const condition = conditionNode.condition;

    if (!condition) {
      this.logger.warn(`No condition specified for condition node: ${node.id}`);
      return;
    }

    try {
      // 评估条件
      const conditionResult = this.evaluateCondition(
        condition,
        context.variables
      );
      this.logger.info(
        `Condition result for node ${node.id}: ${conditionResult}`
      );

      // 根据条件结果选择执行分支
      const branchToExecute = conditionResult
        ? conditionNode.trueBranch
        : conditionNode.falseBranch;

      if (branchToExecute && Array.isArray(branchToExecute)) {
        this.logger.info(
          `Executing ${conditionResult ? 'true' : 'false'} branch for node: ${node.id}`
        );

        // 顺序执行分支内的节点
        for (const branchNode of branchToExecute) {
          // 检查工作流状态
          if (context.instance.status !== 'running') {
            this.logger.info(
              `Workflow stopped, cancelling condition branch execution`
            );
            break;
          }

          await this.executeNode(context, branchNode);
        }
      } else {
        this.logger.info(
          `No ${conditionResult ? 'true' : 'false'} branch defined for condition node: ${node.id}`
        );
      }

      this.logger.info(`Condition node completed: ${node.id}`);
    } catch (error) {
      this.logger.error(`Condition node execution failed: ${node.id}`, error);
      throw error;
    }
  }

  /**
   * 执行循环节点
   */
  private async executeLoopNode(
    context: ExecutionContext,
    node: NodeDefinition
  ): Promise<void> {
    this.logger.info(`Executing loop node: ${node.id}`);

    const loopNode = node as any;
    const loopType = loopNode.loopType || 'while'; // 'while', 'for', 'forEach'
    const maxIterations = loopNode.maxIterations || 1000; // 防止无限循环

    try {
      const iterationResults: any[] = [];

      switch (loopType) {
        case 'while':
          await this.executeWhileLoop(
            context,
            loopNode,
            maxIterations,
            iterationResults
          );
          break;

        case 'for':
          await this.executeForLoop(context, loopNode, iterationResults);
          break;

        case 'forEach':
          await this.executeForEachLoop(context, loopNode, iterationResults);
          break;

        default:
          throw new Error(`Unsupported loop type: ${loopType}`);
      }

      // 将循环结果存储到上下文
      context.variables[`loops.${node.id}.results`] = iterationResults;
      context.variables[`loops.${node.id}.count`] = iterationResults.length;

      this.logger.info(
        `Loop node completed: ${node.id}, iterations: ${iterationResults.length}`
      );
    } catch (error) {
      this.logger.error(`Loop node execution failed: ${node.id}`, error);
      throw error;
    }
  }

  /**
   * 执行 while 循环
   */
  private async executeWhileLoop(
    context: ExecutionContext,
    loopNode: any,
    maxIterations: number,
    iterationResults: any[]
  ): Promise<void> {
    let iteration = 0;

    while (iteration < maxIterations) {
      // 检查工作流状态
      if (context.instance.status !== 'running') {
        this.logger.info(`Workflow stopped, breaking while loop`);
        break;
      }

      // 评估循环条件
      const condition = loopNode.condition;
      if (!condition || !this.evaluateCondition(condition, context.variables)) {
        this.logger.info(`While loop condition false, breaking loop`);
        break;
      }

      // 执行循环体
      const iterationContext = {
        ...context,
        variables: {
          ...context.variables,
          $iteration: iteration,
          $loopId: loopNode.id
        }
      };

      await this.executeLoopBody(iterationContext, loopNode.body);
      iterationResults.push(iterationContext.variables);

      iteration++;
    }

    if (iteration >= maxIterations) {
      this.logger.warn(`While loop reached max iterations: ${maxIterations}`);
    }
  }

  /**
   * 执行 for 循环
   */
  private async executeForLoop(
    context: ExecutionContext,
    loopNode: any,
    iterationResults: any[]
  ): Promise<void> {
    const start = loopNode.start || 0;
    const end = loopNode.end || 0;
    const step = loopNode.step || 1;

    for (let i = start; i < end; i += step) {
      // 检查工作流状态
      if (context.instance.status !== 'running') {
        this.logger.info(`Workflow stopped, breaking for loop`);
        break;
      }

      // 执行循环体
      const iterationContext = {
        ...context,
        variables: {
          ...context.variables,
          $iteration: i,
          $loopId: loopNode.id,
          $index: i
        }
      };

      await this.executeLoopBody(iterationContext, loopNode.body);
      iterationResults.push(iterationContext.variables);
    }
  }

  /**
   * 执行 forEach 循环
   */
  private async executeForEachLoop(
    context: ExecutionContext,
    loopNode: any,
    iterationResults: any[]
  ): Promise<void> {
    const arrayPath = loopNode.arrayPath;
    if (!arrayPath) {
      throw new Error(`forEach loop requires arrayPath`);
    }

    // 获取要遍历的数组
    const array = this.getValueFromPath(arrayPath, context.variables);
    if (!Array.isArray(array)) {
      throw new Error(`Value at ${arrayPath} is not an array`);
    }

    for (let index = 0; index < array.length; index++) {
      // 检查工作流状态
      if (context.instance.status !== 'running') {
        this.logger.info(`Workflow stopped, breaking forEach loop`);
        break;
      }

      const item = array[index];

      // 执行循环体
      const iterationContext = {
        ...context,
        variables: {
          ...context.variables,
          $iteration: index,
          $loopId: loopNode.id,
          $index: index,
          $item: item
        }
      };

      await this.executeLoopBody(iterationContext, loopNode.body);
      iterationResults.push(iterationContext.variables);
    }
  }

  /**
   * 执行循环体
   */
  private async executeLoopBody(
    context: ExecutionContext,
    body: NodeDefinition[]
  ): Promise<void> {
    if (!body || !Array.isArray(body)) {
      return;
    }

    for (const bodyNode of body) {
      await this.executeNode(context, bodyNode);
    }
  }

  /**
   * 执行任务节点
   */
  private async executeTaskNode(
    context: ExecutionContext,
    node: TaskNodeDefinition
  ): Promise<void> {
    try {
      // 获取执行器
      const executor = context.executorRegistry.getExecutor(node.executor);

      if (!executor) {
        throw new Error(`Executor not found: ${node.executor}`);
      }
      // 准备执行上下文
      const executionContext = {
        taskId: parseInt(node.id),
        workflowInstanceId: context.instance.id,
        config: node.config,
        inputs: context.variables,
        context: context.instance.contextData,
        logger: this.logger
      };

      // 执行任务
      const result = await executor.execute(executionContext);

      if (result.success) {
        // 更新变量
        if (result.data) {
          context.variables[`nodes.${node.id}.output`] = result.data;
        }
        this.logger.info(`Task node completed: ${node.id}`);
      } else {
        throw new Error(result.error || 'Task execution failed');
      }
    } catch (error) {
      this.logger.error(`Task node failed: ${node.id}`, error);
      throw error;
    }
  }

  /**
   * 验证工作流定义
   */
  private validateWorkflowDefinition(definition: WorkflowDefinition): void {
    if (!definition.name) {
      throw new Error('Workflow name is required');
    }

    if (!definition.nodes || definition.nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    // 验证节点ID唯一性
    const nodeIds = new Set<string>();
    for (const node of definition.nodes) {
      if (nodeIds.has(node.id)) {
        throw new Error(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }
  }

  /**
   * 验证输入参数
   */
  private validateInputs(definition: WorkflowDefinition, inputs: any): void {
    if (!definition.inputs) {
      return;
    }

    for (const inputDef of definition.inputs) {
      if (inputDef.required && !(inputDef.name in inputs)) {
        throw new Error(`Required input missing: ${inputDef.name}`);
      }
    }
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(
    condition: string,
    variables: Record<string, any>
  ): boolean {
    try {
      // 简单的条件评估实现
      // 在实际项目中应该使用更安全的表达式引擎
      const func = new Function(
        'variables',
        `with(variables) { return ${condition}; }`
      );
      return Boolean(func(variables));
    } catch (error) {
      this.logger.error(`Condition evaluation failed: ${condition}`, error);
      return false;
    }
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(retryCount: number): number {
    // 指数退避策略
    return Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
  }

  /**
   * 从路径获取值
   */
  private getValueFromPath(path: string, variables: Record<string, any>): any {
    try {
      // 支持点号分隔的路径，如 'user.profile.name'
      const keys = path.split('.');
      let value = variables;

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return undefined;
        }
      }

      return value;
    } catch (error) {
      this.logger.error(`Failed to get value from path: ${path}`, error);
      return undefined;
    }
  }
}
