/**
 * 工作流管理器
 * 用于创建和管理复杂的任务工作流
 */

import { Job, Queue } from '../types/index.js';
import { DependencyMode } from './dependency-manager.js';

/**
 * 工作流任务配置
 */
export interface WorkflowTaskConfig<T = any> {
  /**
   * 任务名称
   */
  name: string;

  /**
   * 任务数据
   */
  data: T;

  /**
   * 任务选项
   */
  options?: any;

  /**
   * 依赖的任务ID数组（已创建的任务）
   */
  dependencies?: string[];

  /**
   * 依赖的任务名称数组（同一工作流中的其他任务）
   */
  dependsOn?: string[];

  /**
   * 依赖处理模式
   */
  dependencyMode?: DependencyMode;
}

/**
 * 工作流配置
 */
export interface WorkflowConfig {
  /**
   * 工作流ID
   */
  id: string;

  /**
   * 工作流名称
   */
  name: string;

  /**
   * 工作流描述
   */
  description?: string;

  /**
   * 工作流任务配置
   */
  tasks: WorkflowTaskConfig[];
}

/**
 * 工作流状态
 */
export enum WorkflowStatus {
  /**
   * 创建中
   */
  CREATING = 'creating',

  /**
   * 运行中
   */
  RUNNING = 'running',

  /**
   * 已完成
   */
  COMPLETED = 'completed',

  /**
   * 失败
   */
  FAILED = 'failed',

  /**
   * 已暂停
   */
  PAUSED = 'paused'
}

/**
 * 工作流结果
 */
export interface WorkflowResult {
  /**
   * 工作流ID
   */
  id: string;

  /**
   * 工作流状态
   */
  status: WorkflowStatus;

  /**
   * 任务ID映射，键为任务名称，值为任务ID
   */
  taskIds: Record<string, string>;

  /**
   * 任务结果映射，键为任务名称，值为任务结果
   */
  results: Record<string, any>;

  /**
   * 错误信息（如果失败）
   */
  error?: string;
}

/**
 * 工作流管理器
 * 用于创建和管理复杂的任务工作流
 */
export class WorkflowManager {
  /**
   * 队列实例
   */
  private readonly queue: Queue;

  /**
   * 构造函数
   * @param queue 队列实例
   */
  constructor(queue: Queue) {
    this.queue = queue;
  }

  /**
   * 创建工作流
   * @param config 工作流配置
   * @returns 工作流结果
   */
  public async createWorkflow(config: WorkflowConfig): Promise<WorkflowResult> {
    // 创建工作流结果对象
    const result: WorkflowResult = {
      id: config.id,
      status: WorkflowStatus.CREATING,
      taskIds: {},
      results: {}
    };

    try {
      // 验证工作流配置
      this.validateWorkflowConfig(config);

      // 创建任务映射，用于解析依赖关系
      const taskConfigs = new Map<string, WorkflowTaskConfig>();
      for (const task of config.tasks) {
        taskConfigs.set(task.name, task);
      }

      // 创建任务拓扑排序，确保依赖任务先创建
      const sortedTasks = this.topologicalSort(config.tasks);

      // 开始创建任务
      result.status = WorkflowStatus.RUNNING;

      // 创建工作流中的每个任务
      for (const taskName of sortedTasks) {
        const taskConfig = taskConfigs.get(taskName)!;

        // 准备任务选项
        const options = { ...taskConfig.options };

        // 处理依赖
        const dependencies: string[] = [...(taskConfig.dependencies || [])];

        // 处理工作流内部依赖
        if (taskConfig.dependsOn && taskConfig.dependsOn.length > 0) {
          for (const depName of taskConfig.dependsOn) {
            if (!result.taskIds[depName]) {
              throw new Error(
                `任务 "${taskName}" 依赖的任务 "${depName}" 不存在或未创建`
              );
            }
            dependencies.push(result.taskIds[depName]);
          }
        }

        // 设置依赖关系
        if (dependencies.length > 0) {
          options.dependencies = dependencies;
        }

        // 设置依赖处理模式
        if (taskConfig.dependencyMode) {
          options.dependenciesMode = taskConfig.dependencyMode;
        }

        // 创建任务
        const job = await this.queue.add(
          taskConfig.name,
          taskConfig.data,
          options
        );

        // 保存任务ID
        result.taskIds[taskName] = job.id;
      }

      return result;
    } catch (error: any) {
      // 更新工作流状态为失败
      result.status = WorkflowStatus.FAILED;
      result.error = error.message;

      return result;
    }
  }

  /**
   * 检查工作流状态
   * @param workflowId 工作流ID
   * @param taskIds 任务ID映射
   * @returns 工作流结果
   */
  public async checkWorkflowStatus(
    workflowId: string,
    taskIds: Record<string, string>
  ): Promise<WorkflowResult> {
    const result: WorkflowResult = {
      id: workflowId,
      status: WorkflowStatus.RUNNING,
      taskIds,
      results: {}
    };

    try {
      // 获取所有任务
      const jobs: Record<string, Job> = {};
      let hasFailedJobs = false;
      let hasActiveJobs = false;

      // 获取每个任务的状态
      for (const [taskName, jobId] of Object.entries(taskIds)) {
        const job = await this.queue.getJob(jobId);

        if (!job) {
          throw new Error(`任务 "${taskName}" (ID: ${jobId}) 不存在`);
        }

        jobs[taskName] = job;

        // 获取任务结果（如果已完成）
        if (job.returnvalue !== null) {
          result.results[taskName] = job.returnvalue;
        }

        // 检查任务状态
        switch (job.status) {
          case 'failed':
            hasFailedJobs = true;
            break;
          case 'waiting':
          case 'active':
          case 'delayed':
            hasActiveJobs = true;
            break;
        }
      }

      // 确定工作流状态
      if (hasFailedJobs) {
        result.status = WorkflowStatus.FAILED;
      } else if (!hasActiveJobs) {
        result.status = WorkflowStatus.COMPLETED;
      } else {
        result.status = WorkflowStatus.RUNNING;
      }

      return result;
    } catch (error: any) {
      result.status = WorkflowStatus.FAILED;
      result.error = error.message;
      return result;
    }
  }

  /**
   * 暂停工作流
   * @param workflowId 工作流ID
   * @param taskIds 任务ID映射
   * @returns 是否成功暂停
   */
  public async pauseWorkflow(
    workflowId: string,
    taskIds: Record<string, string>
  ): Promise<boolean> {
    try {
      // 暂停所有活跃的任务
      for (const jobId of Object.values(taskIds)) {
        const job = await this.queue.getJob(jobId);

        if (job && ['waiting', 'delayed'].includes(job.status)) {
          // 可以暂停等待中和延迟的任务
          // 这里需要实现具体的暂停逻辑，但目前BullMQ不直接支持暂停单个任务
          // 这里仅作为示例
          console.log(`暂停任务: ${job.id}`);
        }
      }

      return true;
    } catch (error) {
      console.error(`暂停工作流失败:`, error);
      return false;
    }
  }

  /**
   * 恢复工作流
   * @param workflowId 工作流ID
   * @param taskIds 任务ID映射
   * @returns 是否成功恢复
   */
  public async resumeWorkflow(
    workflowId: string,
    taskIds: Record<string, string>
  ): Promise<boolean> {
    try {
      // 恢复所有暂停的任务
      for (const jobId of Object.values(taskIds)) {
        const job = await this.queue.getJob(jobId);

        if (job && job.status === 'paused') {
          // 恢复暂停的任务
          // 这里需要实现具体的恢复逻辑，但目前BullMQ不直接支持恢复单个任务
          // 这里仅作为示例
          console.log(`恢复任务: ${job.id}`);
        }
      }

      return true;
    } catch (error) {
      console.error(`恢复工作流失败:`, error);
      return false;
    }
  }

  /**
   * 取消工作流
   * @param workflowId 工作流ID
   * @param taskIds 任务ID映射
   * @returns 是否成功取消
   */
  public async cancelWorkflow(
    workflowId: string,
    taskIds: Record<string, string>
  ): Promise<boolean> {
    try {
      // 移除所有任务
      for (const jobId of Object.values(taskIds)) {
        try {
          await this.queue.removeJob(jobId);
        } catch (error) {
          // 忽略单个任务删除失败
          console.warn(`无法移除任务 ${jobId}:`, error);
        }
      }

      return true;
    } catch (error) {
      console.error(`取消工作流失败:`, error);
      return false;
    }
  }

  /**
   * 验证工作流配置
   * @param config 工作流配置
   */
  private validateWorkflowConfig(config: WorkflowConfig): void {
    // 验证ID和名称
    if (!config.id) {
      throw new Error('工作流ID不能为空');
    }

    if (!config.name) {
      throw new Error('工作流名称不能为空');
    }

    // 验证任务列表
    if (!config.tasks || config.tasks.length === 0) {
      throw new Error('工作流必须包含至少一个任务');
    }

    // 验证任务名称唯一性
    const taskNames = new Set<string>();
    for (const task of config.tasks) {
      if (!task.name) {
        throw new Error('任务名称不能为空');
      }

      if (taskNames.has(task.name)) {
        throw new Error(`任务名称 "${task.name}" 重复`);
      }

      taskNames.add(task.name);
    }

    // 验证依赖关系
    for (const task of config.tasks) {
      // 验证dependsOn引用的任务存在
      if (task.dependsOn) {
        for (const depName of task.dependsOn) {
          if (!taskNames.has(depName)) {
            throw new Error(
              `任务 "${task.name}" 依赖的任务 "${depName}" 不存在`
            );
          }
        }
      }
    }

    // 验证没有循环依赖
    try {
      this.topologicalSort(config.tasks);
    } catch (error: any) {
      throw new Error(`工作流包含循环依赖: ${error.message}`);
    }
  }

  /**
   * 拓扑排序任务
   * @param tasks 任务配置数组
   * @returns 排序后的任务名称数组
   */
  private topologicalSort(tasks: WorkflowTaskConfig[]): string[] {
    // 创建任务依赖图
    const graph: Record<string, string[]> = {};
    for (const task of tasks) {
      graph[task.name] = task.dependsOn || [];
    }

    // 拓扑排序结果
    const result: string[] = [];

    // 已访问节点集合
    const visited = new Set<string>();

    // 当前递归栈中的节点（用于检测循环依赖）
    const recursionStack = new Set<string>();

    // 对每个未访问的节点执行DFS
    for (const node of Object.keys(graph)) {
      if (!visited.has(node)) {
        if (
          this.topologicalSortDFS(node, graph, visited, recursionStack, result)
        ) {
          throw new Error(`检测到循环依赖，涉及任务: ${node}`);
        }
      }
    }

    // 反转结果，因为DFS添加的顺序是反的
    return result.reverse();
  }

  /**
   * 拓扑排序DFS
   * @param node 当前节点
   * @param graph 依赖图
   * @param visited 已访问节点集合
   * @param recursionStack 递归栈
   * @param result 排序结果
   * @returns 是否存在循环依赖
   */
  private topologicalSortDFS(
    node: string,
    graph: Record<string, string[]>,
    visited: Set<string>,
    recursionStack: Set<string>,
    result: string[]
  ): boolean {
    // 如果节点在当前递归栈中，说明存在循环依赖
    if (recursionStack.has(node)) {
      return true;
    }

    // 如果节点已访问，无需再次处理
    if (visited.has(node)) {
      return false;
    }

    // 标记节点为已访问，并加入递归栈
    visited.add(node);
    recursionStack.add(node);

    // 遍历所有依赖节点
    for (const dependency of graph[node]) {
      if (
        this.topologicalSortDFS(
          dependency,
          graph,
          visited,
          recursionStack,
          result
        )
      ) {
        return true;
      }
    }

    // 从递归栈中移除节点，并将其添加到结果中
    recursionStack.delete(node);
    result.push(node);

    return false;
  }
}
