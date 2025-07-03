/**
 * TaskTreeService - 任务树服务
 * 提供任务树的创建、恢复、管理等核心功能
 */

import { Logger } from '@stratix/core';
import { createTaskFactory, TaskNode } from '../entity/taskNode.js';
import {
  TaskData,
  TaskNodePlaceholder,
  TaskStatus,
  TaskStatusUtils
} from '../entity/types.js';
import { RunningTaskRepository } from '../repositories/RunningTaskRepository.js';
import { TreeCompletionEvent } from '../subscribe/treeCleanupSubscribe.js';
import {
  ITaskTreeService,
  LayeredTaskTreesResult,
  TaskRecoveryResult,
  TaskStateChangeResult,
  TaskTree,
  TaskTreeNode,
  TaskTreeQueryOptions,
  TaskTreesResult,
  TaskTreeStatistics,
  TaskTreeView
} from './types.js';

/**
 * 扩展的任务创建参数
 */
export interface ExtendedCreateTaskParams {
  id?: string;
  data: TaskData;
  parentId?: string;
  autoStart?: boolean;
  contextData?: Record<string, any>;
  isRecovery?: boolean;
}

/**
 * 任务树服务实现
 */
export class TaskTreeService implements ITaskTreeService {
  /** 内存中的任务节点缓存 */
  private taskNodes = new Map<string, TaskNode | TaskNodePlaceholder>();

  constructor(
    private log: Logger,
    private runningTaskRepo: RunningTaskRepository,
    private createTaskNode: ReturnType<typeof createTaskFactory>
  ) {
    this.log.info('TaskTreeService 初始化完成');
  }

  /**
   * 创建任务节点
   */
  async createTask(params: ExtendedCreateTaskParams): Promise<TaskNode> {
    return this.createTaskNode(params);
  }

  /**
   * 从内存缓存获取任务节点
   */
  getTask(id: string): TaskNode | TaskNodePlaceholder | null {
    return this.taskNodes.get(id) || null;
  }

  /**
   * 从内存缓存获取任务节点。根据用户名称
   */
  getTaskByname(name: string): TaskNode | TaskNodePlaceholder | null {
    for (const taskNode of this.taskNodes.values()) {
      if (taskNode instanceof TaskNode && taskNode.data.name === name) {
        return taskNode;
      }
      if ('name' in taskNode && taskNode.name === name) {
        return taskNode;
      }
    }
    return null;
  }

  /**
   * 设置任务节点到内存缓存
   */
  setTask(id: string, taskNode: TaskNode): void {
    this.taskNodes.set(id, taskNode);
    this.log.debug({ taskId: id }, '任务节点已缓存');
  }

  /**
   * 获取根任务列表
   */
  async getRootTasks(): Promise<TaskNode[]> {
    const rootTasks: TaskNode[] = [];

    for (const taskNode of this.taskNodes.values()) {
      if (taskNode instanceof TaskNode && taskNode.isRoot()) {
        rootTasks.push(taskNode);
      }
    }

    return rootTasks;
  }

  /**
   * 启动任务
   */
  async startTask(id: string, reason?: string): Promise<TaskStateChangeResult> {
    const startTime = Date.now();
    const taskNode = this.getTask(id);

    if (!taskNode) {
      return {
        success: false,
        taskId: id,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        error: `任务 ${id} 不存在`,
        executionTime: Date.now() - startTime
      };
    }

    const fromStatus = taskNode.status;

    try {
      if (taskNode instanceof TaskNode) {
        await taskNode.start(reason);
      }

      this.log.info(
        {
          taskId: id,
          fromStatus,
          toStatus: taskNode.status,
          reason
        },
        '任务启动成功'
      );

      return {
        success: true,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      this.log.error(
        {
          taskId: id,
          fromStatus,
          reason,
          error: error instanceof Error ? error.message : String(error)
        },
        '任务启动失败'
      );

      return {
        success: false,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 暂停任务
   */
  async pauseTask(id: string, reason?: string): Promise<TaskStateChangeResult> {
    const startTime = Date.now();
    const taskNode = this.getTask(id);

    if (!taskNode) {
      return {
        success: false,
        taskId: id,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        error: `任务 ${id} 不存在`,
        executionTime: Date.now() - startTime
      };
    }

    const fromStatus = taskNode.status;

    try {
      if (taskNode instanceof TaskNode) {
        await taskNode.pause(reason);
      }

      this.log.info(
        {
          taskId: id,
          fromStatus,
          toStatus: taskNode.status,
          reason
        },
        '任务暂停成功'
      );

      return {
        success: true,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      this.log.error(
        {
          taskId: id,
          fromStatus,
          reason,
          error: error instanceof Error ? error.message : String(error)
        },
        '任务暂停失败'
      );

      return {
        success: false,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 恢复任务
   */
  async resumeTask(
    id: string,
    reason?: string
  ): Promise<TaskStateChangeResult> {
    const startTime = Date.now();
    const taskNode = this.getTask(id);

    if (!taskNode) {
      return {
        success: false,
        taskId: id,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        error: `任务 ${id} 不存在`,
        executionTime: Date.now() - startTime
      };
    }

    const fromStatus = taskNode.status;

    try {
      if (taskNode instanceof TaskNode) {
        await taskNode.resume(reason);
      }

      this.log.info(
        {
          taskId: id,
          fromStatus,
          toStatus: taskNode.status,
          reason
        },
        '任务恢复成功'
      );

      return {
        success: true,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      this.log.error(
        {
          taskId: id,
          fromStatus,
          reason,
          error: error instanceof Error ? error.message : String(error)
        },
        '任务恢复失败'
      );

      return {
        success: false,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(
    id: string,
    reason?: string
  ): Promise<TaskStateChangeResult> {
    const startTime = Date.now();
    const taskNode = this.getTask(id);

    if (!taskNode) {
      return {
        success: false,
        taskId: id,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        error: `任务 ${id} 不存在`,
        executionTime: Date.now() - startTime
      };
    }

    const fromStatus = taskNode.status;

    try {
      if (taskNode instanceof TaskNode) {
        await taskNode.cancel(reason);
      }

      this.log.info(
        {
          taskId: id,
          fromStatus,
          toStatus: taskNode.status,
          reason
        },
        '任务取消成功'
      );

      return {
        success: true,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      this.log.error(
        {
          taskId: id,
          fromStatus,
          reason,
          error: error instanceof Error ? error.message : String(error)
        },
        '任务取消失败'
      );

      return {
        success: false,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 重试失败的任务
   */
  async retryTask(
    id: string,
    reason?: string,
    resetProgress: boolean = true
  ): Promise<TaskStateChangeResult> {
    const startTime = Date.now();
    const taskNode = this.getTask(id);

    if (!taskNode) {
      return {
        success: false,
        taskId: id,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        error: `任务 ${id} 不存在`,
        executionTime: Date.now() - startTime
      };
    }

    const fromStatus = taskNode.status;

    try {
      if (taskNode instanceof TaskNode) {
        await taskNode.retry(reason, resetProgress);
      } else {
        throw new Error(`任务 ${id} 是占位符，无法重试`);
      }

      this.log.info(
        {
          taskId: id,
          fromStatus,
          toStatus: taskNode.status,
          reason,
          resetProgress,
          currentRetries: taskNode.data.metadata?.currentRetries || 0
        },
        '任务重试成功'
      );

      return {
        success: true,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      this.log.error(
        {
          taskId: id,
          fromStatus,
          reason,
          resetProgress,
          error: error instanceof Error ? error.message : String(error)
        },
        '任务重试失败'
      );

      return {
        success: false,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 完成任务
   */
  async success(
    id: string,
    reason?: string,
    result?: any
  ): Promise<TaskStateChangeResult> {
    const startTime = Date.now();
    const taskNode = this.getTask(id);

    if (!taskNode) {
      return {
        success: false,
        taskId: id,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        error: `任务 ${id} 不存在`,
        executionTime: Date.now() - startTime
      };
    }

    const fromStatus = taskNode.status;

    try {
      if (taskNode instanceof TaskNode) {
        await taskNode.success(reason, result);
      }
      this.log.info(
        {
          taskId: id,
          fromStatus,
          toStatus: taskNode.status,
          reason
        },
        '任务完成成功'
      );

      return {
        success: true,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      this.log.error(
        {
          taskId: id,
          fromStatus,
          reason,
          error: error instanceof Error ? error.message : String(error)
        },
        '任务完成失败'
      );

      return {
        success: false,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 任务失败
   */
  async fail(
    id: string,
    reason?: string,
    error?: Error
  ): Promise<TaskStateChangeResult> {
    const startTime = Date.now();
    const taskNode = this.getTask(id);

    if (!taskNode) {
      return {
        success: false,
        taskId: id,
        fromStatus: TaskStatus.PENDING,
        toStatus: TaskStatus.PENDING,
        error: `任务 ${id} 不存在`,
        executionTime: Date.now() - startTime
      };
    }

    const fromStatus = taskNode.status;

    try {
      if (taskNode instanceof TaskNode) {
        await taskNode.fail(reason, error);
      }

      this.log.info(
        {
          taskId: id,
          fromStatus,
          toStatus: taskNode.status,
          reason
        },
        '任务失败处理成功'
      );

      return {
        success: true,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        executionTime: Date.now() - startTime
      };
    } catch (err) {
      this.log.error(
        {
          taskId: id,
          fromStatus,
          reason,
          error: err instanceof Error ? err.message : String(err)
        },
        '任务失败处理失败'
      );

      return {
        success: false,
        taskId: id,
        fromStatus,
        toStatus: taskNode.status,
        error: err instanceof Error ? err.message : String(err),
        executionTime: Date.now() - startTime
      };
    }
  }

  async run(id: string, reason?: string) {
    const startTime = Date.now();
    const taskNode = this.getTask(id);

    if (!taskNode) {
      return {
        success: false,
        taskId: id
      };
    }

    try {
      if (taskNode instanceof TaskNode) {
        await taskNode.run();
      }
    } catch (error) {
      this.log.error({ taskId: id, reason, error }, '任务运行失败');
    }
    const duration = Date.now() - startTime;
    this.log.info({ taskId: id, reason, duration }, '任务完成');
  }

  /**
   * 从数据库恢复运行中的任务树
   */
  async recoverRunningTasks(): Promise<TaskRecoveryResult> {
    const startTime = Date.now();
    const errors: Array<{ taskId: string; error: string }> = [];
    let recoveredCount = 0;
    let rootTasksCount = 0;

    this.log.info('开始从数据库恢复运行中的任务树');

    try {
      // 1. 获取所有运行中的任务（添加超时保护）
      this.log.debug('正在从数据库获取运行中任务...');
      const queryStartTime = Date.now();

      const runningTasks = await this.runningTaskRepo.findAll();
      const queryDuration = Date.now() - queryStartTime;

      this.log.debug(
        { queryDuration, taskCount: runningTasks.length },
        '数据库查询完成'
      );

      if (runningTasks.length === 0) {
        this.log.info('没有需要恢复的运行中任务');
        return {
          recoveredCount: 0,
          rootTasksCount: 0,
          errors: [],
          duration: Date.now() - startTime
        };
      }

      this.log.info(
        { taskCount: runningTasks.length, queryDuration },
        '找到需要恢复的运行中任务'
      );

      // 2. 按层级恢复任务（先恢复根任务，再恢复子任务）
      const rootTasks = runningTasks.filter((task) => !task.parent_id);
      const childTasks = runningTasks.filter((task) => task.parent_id);

      rootTasksCount = rootTasks.length;

      this.log.info(
        { rootTasksCount, childTasksCount: childTasks.length },
        '开始恢复任务树'
      );

      // 3. 恢复子任务（按层级递归恢复）
      const recoverChildren = async (
        parentNode: TaskNode | TaskNodePlaceholder,
        depth = 0
      ): Promise<void> => {
        if (depth > 10) {
          this.log.warn(
            { parentId: parentNode.id, depth },
            '任务树深度过深，停止递归恢复'
          );
          return;
        }

        if (parentNode instanceof TaskNode) {
          const parentId = parentNode.id;
          const children = childTasks.filter(
            (task) => task.parent_id === parentId
          );

          this.log.debug(
            { parentId, childrenCount: children.length, depth },
            '恢复子任务'
          );

          for (const childEntity of children) {
            try {
              const childStartTime = Date.now();

              const taskNode = await this.recoverSingleTask(
                childEntity,
                parentId
              );
              recoveredCount++;

              const childDuration = Date.now() - childStartTime;

              this.log.debug(
                {
                  taskId: childEntity.id,
                  name: childEntity.name,
                  parentId,
                  depth,
                  duration: childDuration
                },
                '子任务恢复成功'
              );

              // 递归恢复该子任务的子任务
              await recoverChildren(taskNode, depth + 1);
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              errors.push({
                taskId: childEntity.id,
                error: errorMsg
              });

              this.log.error(
                {
                  taskId: childEntity.id,
                  name: childEntity.name,
                  parentId,
                  depth,
                  error: errorMsg
                },
                '子任务恢复失败'
              );
            }
          }
        } else {
          return;
        }
      };

      // 为每个根任务恢复其子任务
      for (let i = 0; i < rootTasks.length; i++) {
        const rootTask = rootTasks[i];
        const rootStartTime = Date.now();

        this.log.info(
          {
            taskId: rootTask.id,
            name: rootTask.name,
            index: i + 1,
            total: rootTasks.length
          },
          '开始恢复根任务'
        );

        try {
          const taskNode = await this.recoverSingleTask(rootTask, null);
          recoveredCount++;

          await recoverChildren(taskNode, 0);

          const rootDuration = Date.now() - rootStartTime;
          this.log.info(
            { taskId: rootTask.id, duration: rootDuration },
            '根任务及其子任务恢复完成'
          );
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          errors.push({
            taskId: rootTask.id,
            error: errorMsg
          });

          this.log.error(
            { taskId: rootTask.id, error: errorMsg },
            '根任务恢复失败'
          );
        }
      }

      const duration = Date.now() - startTime;

      this.log.info(
        {
          recoveredCount,
          rootTasksCount,
          errorCount: errors.length,
          duration
        },
        '任务树恢复完成'
      );

      return {
        recoveredCount,
        rootTasksCount,
        errors,
        duration
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error({ error: errorMsg }, '任务树恢复过程中发生错误');

      return {
        recoveredCount,
        rootTasksCount,
        errors: [{ taskId: 'RECOVERY_PROCESS', error: errorMsg }],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 恢复单个任务
   */
  private async recoverSingleTask(
    taskEntity: any,
    parentId: string | null
  ): Promise<TaskNode | TaskNodePlaceholder> {
    // 检查任务是否已经在内存中
    const existingTask = this.getTask(taskEntity.id);
    if (existingTask) {
      this.log.debug({ taskId: taskEntity.id }, '任务已存在于内存中，跳过恢复');
      return existingTask as TaskNode;
    }

    if (TaskStatusUtils.isCompleted(taskEntity.status)) {
      return this.createTaskPlaceholder(taskEntity);
    } else {
      // 转换数据库实体为 TaskData
      const taskData: TaskData = {
        name: taskEntity.name,
        description: taskEntity.description,
        type: taskEntity.task_type,
        status: taskEntity.status,
        progress: taskEntity.progress,
        executorName: taskEntity.executor_name || undefined,
        priority: taskEntity.priority,
        createdAt: taskEntity.created_at,
        updatedAt: taskEntity.updated_at,
        metadata: taskEntity.metadata ? taskEntity.metadata : {}
      };

      // 如果是根任务，需要恢复共享上下文
      let contextData: Record<string, any> = {};

      const extendedParams: ExtendedCreateTaskParams = {
        id: taskEntity.id,
        data: taskData,
        parentId: parentId || undefined,
        autoStart: false, // 恢复时不自动启动
        contextData,
        isRecovery: true
      };

      // 使用工厂方法创建任务节点
      const taskNode = await this.createTaskNode(extendedParams);

      this.log.debug(
        {
          taskId: taskEntity.id,
          name: taskEntity.name,
          status: taskEntity.status,
          parentId
        },
        '单个任务恢复成功'
      );

      return taskNode;
    }
  }

  /**
   * 创建任务占位符
   */
  private createTaskPlaceholder(completedTask: any): TaskNodePlaceholder {
    return {
      id: completedTask.id,
      name: completedTask.name,
      status: completedTask.status,
      progress: Number(completedTask.progress) || 100, // 已完成任务进度为100%，确保是数字类型
      completedAt: completedTask.completed_at || completedTask.updated_at,
      isPlaceholder: true
    };
  }

  /**
   * 获取任务树统计信息
   */
  async getStatistics(): Promise<TaskTreeStatistics> {
    const tasks = Array.from(this.taskNodes.values());

    const statistics: TaskTreeStatistics = {
      totalTasks: tasks.length,
      runningTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      pendingTasks: 0,
      pausedTasks: 0,
      cancelledTasks: 0,
      rootTasksCount: 0
    };

    for (const task of tasks) {
      switch (task.status) {
        case TaskStatus.RUNNING:
          statistics.runningTasks++;
          break;
        case TaskStatus.SUCCESS:
        case TaskStatus.COMPLETED:
          statistics.completedTasks++;
          break;
        case TaskStatus.FAILED:
          statistics.failedTasks++;
          break;
        case TaskStatus.PENDING:
          statistics.pendingTasks++;
          break;
        case TaskStatus.PAUSED:
          statistics.pausedTasks++;
          break;
        case TaskStatus.CANCELLED:
          statistics.cancelledTasks++;
          break;
      }

      if (task instanceof TaskNode && task.isRoot()) {
        statistics.rootTasksCount++;
      }
    }

    return statistics;
  }

  /**
   * 获取内存中的任务数量
   */
  getTaskCount(): number {
    return this.taskNodes.size;
  }

  /**
   * 获取完整任务树视图
   * 返回包含运行中任务和已完成任务占位符的完整树结构
   */
  async getCompleteTaskTreeView(): Promise<TaskTreeView> {
    this.log.debug('开始获取完整任务树视图');

    try {
      // 获取所有根任务（运行中的和占位符的）
      const rootTaskNodes: Array<TaskNode | TaskNodePlaceholder> = [];
      let runningNodes = 0;
      let placeholderNodes = 0;

      // 遍历所有缓存的任务节点
      for (const taskNode of this.taskNodes.values()) {
        // 检查是否为根任务
        if (this.isRootTask(taskNode)) {
          rootTaskNodes.push(taskNode);

          // 计算节点统计
          const { running, placeholders } = this.calculateTreeMetrics(taskNode);
          runningNodes += running;
          placeholderNodes += placeholders;
        }
      }

      // 按创建时间排序根任务
      rootTaskNodes.sort((a, b) => {
        const aTime = a instanceof TaskNode ? a.data.createdAt : a.completedAt;
        const bTime = b instanceof TaskNode ? b.data.createdAt : b.completedAt;
        return aTime.getTime() - bTime.getTime();
      });

      // 转换为 TaskTreeView 格式
      const rootTasks = rootTaskNodes.map((taskNode) => {
        if (taskNode instanceof TaskNode) {
          return {
            id: taskNode.id,
            name: taskNode.data.name,
            status: taskNode.status,
            progress: taskNode.progress,
            isPlaceholder: false,
            children: taskNode.children.map((child) => {
              if (child instanceof TaskNode) {
                return {
                  id: child.id,
                  name: child.data.name,
                  status: child.status,
                  progress: child.progress,
                  isPlaceholder: false
                };
              } else {
                // TaskNodePlaceholder
                return {
                  id: child.id,
                  name: undefined,
                  status: child.status,
                  progress: child.progress,
                  isPlaceholder: true
                };
              }
            })
          };
        } else {
          return {
            id: taskNode.id,
            name: undefined,
            status: taskNode.status,
            progress: taskNode.progress,
            isPlaceholder: true,
            children: []
          };
        }
      });

      const result: TaskTreeView = {
        rootTasks,
        statistics: {
          totalNodes: this.taskNodes.size,
          runningNodes,
          placeholderNodes,
          rootCount: rootTasks.length
        }
      };

      this.log.info(
        {
          rootTasksCount: result.statistics.rootCount,
          totalNodes: result.statistics.totalNodes,
          runningNodes: result.statistics.runningNodes,
          placeholderNodes: result.statistics.placeholderNodes
        },
        '完整任务树视图获取成功'
      );

      return result;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error)
        },
        '获取完整任务树视图失败'
      );

      throw new Error(
        `获取完整任务树视图失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 检查任务是否为根任务
   */
  private isRootTask(taskNode: TaskNode | TaskNodePlaceholder): boolean {
    if (taskNode instanceof TaskNode) {
      return taskNode.isRoot();
    } else {
      // 对于占位符，检查是否有父任务在缓存中
      for (const otherNode of this.taskNodes.values()) {
        if (otherNode instanceof TaskNode) {
          const hasChild = otherNode.children.some(
            (child) => child.id === taskNode.id
          );
          if (hasChild) {
            return false; // 找到父任务，不是根任务
          }
        }
      }
      return true; // 没有找到父任务，是根任务
    }
  }

  /**
   * 计算任务树的度量信息（运行中节点数、占位符节点数）
   */
  private calculateTreeMetrics(rootNode: TaskNode | TaskNodePlaceholder): {
    running: number;
    placeholders: number;
  } {
    let runningCount = 0;
    let placeholderCount = 0;

    // 统计当前节点
    if (rootNode instanceof TaskNode) {
      runningCount = 1;

      // 递归计算子树 - 处理混合类型的子节点
      const calculateSubtree = (node: TaskNode): void => {
        for (const child of node.children) {
          if (child instanceof TaskNode) {
            // 运行中的任务节点
            runningCount++;
            calculateSubtree(child);
          } else {
            // 占位符节点
            placeholderCount++;
          }
        }
      };

      calculateSubtree(rootNode);
    } else {
      placeholderCount = 1;
    }

    return {
      running: runningCount,
      placeholders: placeholderCount
    };
  }

  public async handleClearTree(event: TreeCompletionEvent): Promise<void> {
    this.log.debug({ taskId: event.rootTaskId }, '任务树完成');
    const task = this.getTask(event.rootTaskId);
    if (task instanceof TaskNode) {
      task.cleanupNodeMemory(task);
      task.children.forEach((child) => {
        this.taskNodes.delete(child.id);
      });
    }
    this.taskNodes.delete(event.rootTaskId);
    this.log.info({ taskId: event.rootTaskId }, '任务树完成');
  }

  /**
   * 处理节点占位符转换事件
   * 当节点被转换为占位符时，从缓存中删除该节点及其所有下级节点
   */
  public async handleNodePlaceholderConversion(
    node: TaskNodePlaceholder
  ): Promise<void> {
    this.log.debug({ nodeId: node.id }, '开始处理节点占位符转换事件');

    // try {
    //   // 获取要转换的节点
    //   const targetNode = this.getTask(node.id);
    //   if (!(targetNode instanceof TaskNode)) {
    //     this.log.warn({ nodeId: node.id }, '要转换的节点是占位符，跳过处理');
    //     return;
    //   }
    //   if (!targetNode) {
    //     this.log.warn(
    //       { nodeId: node.id },
    //       '要转换的节点不存在于缓存中，跳过处理'
    //     );
    //     return;
    //   }

    //   const nodeName = targetNode.data.name;

    //   // 收集所有需要从缓存中删除的节点ID（包括该节点及其所有下级节点）
    //   const nodeIdsToRemove = new Set<string>();

    //   // 递归收集所有下级节点
    //   const collectDescendantIds = (node: TaskNode): void => {
    //     const descendants = node.getDescendants();
    //     for (const descendant of descendants) {
    //       nodeIdsToRemove.add(descendant.id);
    //     }
    //   };

    //   collectDescendantIds(targetNode as TaskNode);

    //   // 从缓存中删除所有收集到的节点
    //   let removedCount = 0;
    //   for (const idToRemove of nodeIdsToRemove) {
    //     this.taskNodes.delete(idToRemove);
    //   }
    //   this.taskNodes.set(node.id, node);

    //   this.log.info(
    //     {
    //       nodeId: node.id,
    //       nodeName,
    //       removedCount,
    //       totalNodesToRemove: nodeIdsToRemove.size,
    //       remainingCacheSize: this.taskNodes.size
    //     },
    //     '节点占位符转换处理完成，已从缓存中删除节点及其下级节点'
    //   );
    // } catch (error) {
    //   this.log.error(
    //     {
    //       nodeId: node.id,
    //       error: error instanceof Error ? error.message : String(error)
    //     },
    //     '处理节点占位符转换事件失败'
    //   );
    // }
  }

  /**
   * 获取所有任务树的完整结构
   * 返回每个根任务对应的完整树形结构，有几颗树就返回几颗树
   */
  async getTaskTrees(): Promise<TaskTreesResult> {
    const startTime = Date.now();
    this.log.debug('开始获取所有任务树结构');

    try {
      // 获取所有根任务节点
      const rootTaskNodes: Array<TaskNode | TaskNodePlaceholder> = [];

      for (const taskNode of this.taskNodes.values()) {
        if (this.isRootTask(taskNode)) {
          rootTaskNodes.push(taskNode);
        }
      }

      this.log.debug(
        { rootTasksCount: rootTaskNodes.length },
        '找到根任务节点'
      );

      // 按创建时间排序根任务
      rootTaskNodes.sort((a, b) => {
        const aTime = a instanceof TaskNode ? a.data.createdAt : a.completedAt;
        const bTime = b instanceof TaskNode ? b.data.createdAt : b.completedAt;
        return aTime.getTime() - bTime.getTime();
      });

      // 构建每个任务树
      const trees: TaskTree[] = [];
      let globalStats = {
        totalNodes: 0,
        totalRunningNodes: 0,
        totalCompletedNodes: 0,
        totalFailedNodes: 0,
        totalPlaceholderNodes: 0,
        totalProgressSum: 0
      };

      for (const rootNode of rootTaskNodes) {
        const tree = await this.buildSingleTaskTree(rootNode);
        trees.push(tree);

        // 累计全局统计
        globalStats.totalNodes += tree.statistics.totalNodes;
        globalStats.totalRunningNodes += tree.statistics.runningNodes;
        globalStats.totalCompletedNodes += tree.statistics.completedNodes;
        globalStats.totalFailedNodes += tree.statistics.failedNodes;
        globalStats.totalPlaceholderNodes += tree.statistics.placeholderNodes;
        globalStats.totalProgressSum +=
          tree.statistics.totalProgress * tree.statistics.totalNodes;
      }

      // 计算全局平均进度
      const globalProgress =
        globalStats.totalNodes > 0
          ? Math.round(globalStats.totalProgressSum / globalStats.totalNodes)
          : 0;

      const result: TaskTreesResult = {
        trees,
        globalStatistics: {
          totalTrees: trees.length,
          totalNodes: globalStats.totalNodes,
          totalRunningNodes: globalStats.totalRunningNodes,
          totalCompletedNodes: globalStats.totalCompletedNodes,
          totalFailedNodes: globalStats.totalFailedNodes,
          totalPlaceholderNodes: globalStats.totalPlaceholderNodes,
          globalProgress
        },
        timestamp: new Date()
      };

      const duration = Date.now() - startTime;
      this.log.info(
        {
          totalTrees: result.globalStatistics.totalTrees,
          totalNodes: result.globalStatistics.totalNodes,
          globalProgress: result.globalStatistics.globalProgress,
          duration
        },
        '任务树结构获取完成'
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error({ error: errorMsg }, '获取任务树结构失败');

      throw new Error(`获取任务树结构失败: ${errorMsg}`);
    }
  }

  /**
   * 构建单个任务树的完整结构
   * @param rootNode 根任务节点
   * @returns 完整的任务树结构
   */
  private async buildSingleTaskTree(
    rootNode: TaskNode | TaskNodePlaceholder
  ): Promise<TaskTree> {
    this.log.debug({ rootTaskId: rootNode.id }, '开始构建单个任务树结构');

    // 构建树形节点
    const treeRoot = this.buildTaskTreeNode(rootNode, 0, [rootNode.id]);

    // 计算树的统计信息
    const statistics = this.calculateTreeStatistics(treeRoot);

    // 构建树的元数据
    const metadata = {
      createdAt:
        rootNode instanceof TaskNode
          ? rootNode.data.createdAt
          : rootNode.completedAt || new Date(),
      lastUpdatedAt:
        rootNode instanceof TaskNode
          ? rootNode.data.updatedAt
          : rootNode.completedAt || new Date(),
      rootTaskName:
        rootNode instanceof TaskNode
          ? rootNode.data.name
          : rootNode.name || '未知任务',
      rootTaskType:
        rootNode instanceof TaskNode ? rootNode.data.type : '已完成任务'
    };

    return {
      root: treeRoot,
      statistics,
      metadata
    };
  }

  /**
   * 递归构建任务树节点
   * @param node 当前节点
   * @param depth 当前深度
   * @param path 从根节点到当前节点的路径
   * @returns 任务树节点
   */
  private buildTaskTreeNode(
    node: TaskNode | TaskNodePlaceholder,
    depth: number,
    path: string[]
  ): TaskTreeNode {
    if (node instanceof TaskNode) {
      // 处理运行中的任务节点
      const children: TaskTreeNode[] = node.children.map((child) => {
        const childPath = [...path, child.id];
        return this.buildTaskTreeNode(child, depth + 1, childPath);
      });

      return {
        id: node.id,
        name: node.data.name,
        description: node.data.description,
        status: node.status,
        progress: node.progress,
        priority: node.data.priority,
        type: node.data.type,
        executorName: node.data.executorName,
        createdAt: node.data.createdAt,
        updatedAt: node.data.updatedAt,
        isPlaceholder: false,
        metadata: { ...node.data.metadata },
        children,
        depth,
        path
      };
    } else {
      // 处理占位符节点
      return {
        id: node.id,
        name: node.name || '已完成任务',
        description: undefined,
        status: node.status,
        progress: node.progress,
        priority: 0,
        type: '已完成任务',
        executorName: undefined,
        createdAt: node.completedAt || new Date(),
        updatedAt: node.completedAt || new Date(),
        completedAt: node.completedAt,
        isPlaceholder: true,
        metadata: {},
        children: [], // 占位符节点没有子节点
        depth,
        path
      };
    }
  }

  /**
   * 计算任务树的统计信息
   * @param treeRoot 树的根节点
   * @returns 统计信息
   */
  private calculateTreeStatistics(
    treeRoot: TaskTreeNode
  ): TaskTree['statistics'] {
    let totalNodes = 0;
    let runningNodes = 0;
    let completedNodes = 0;
    let failedNodes = 0;
    let placeholderNodes = 0;
    let maxDepth = 0;
    let totalProgressSum = 0;

    // 递归遍历所有节点
    const traverseNode = (node: TaskTreeNode): void => {
      totalNodes++;
      totalProgressSum += node.progress;

      // 更新最大深度
      if (node.depth > maxDepth) {
        maxDepth = node.depth;
      }

      // 统计节点状态
      if (node.isPlaceholder) {
        placeholderNodes++;
      } else {
        switch (node.status) {
          case TaskStatus.RUNNING:
            runningNodes++;
            break;
          case TaskStatus.SUCCESS:
          case TaskStatus.COMPLETED:
            completedNodes++;
            break;
          case TaskStatus.FAILED:
            failedNodes++;
            break;
        }
      }

      // 递归处理子节点
      node.children.forEach(traverseNode);
    };

    traverseNode(treeRoot);

    // 计算平均进度
    const totalProgress =
      totalNodes > 0 ? Math.round(totalProgressSum / totalNodes) : 0;

    return {
      totalNodes,
      runningNodes,
      completedNodes,
      failedNodes,
      placeholderNodes,
      maxDepth,
      totalProgress
    };
  }

  /**
   * 分层获取任务树
   * 支持深度控制、分页和过滤，避免一次返回过多数据
   */
  async getLayeredTaskTrees(
    options: TaskTreeQueryOptions = {}
  ): Promise<LayeredTaskTreesResult> {
    const startTime = Date.now();
    const {
      maxDepth = 1,
      includePlaceholders = true,
      limit = 20,
      offset = 0,
      status
    } = options;

    this.log.debug({ options }, '开始分层获取任务树');

    try {
      // 获取所有根任务节点
      const rootTaskNodes: Array<TaskNode | TaskNodePlaceholder> = [];

      for (const taskNode of this.taskNodes.values()) {
        if (this.isRootTask(taskNode)) {
          // 状态过滤
          if (status) {
            const statusArray = Array.isArray(status) ? status : [status];
            if (!statusArray.includes(taskNode.status)) {
              continue;
            }
          }

          // 占位符过滤
          if (!includePlaceholders && !(taskNode instanceof TaskNode)) {
            continue;
          }

          rootTaskNodes.push(taskNode);
        }
      }

      // 按创建时间排序
      rootTaskNodes.sort((a, b) => {
        const aTime = a instanceof TaskNode ? a.data.createdAt : a.completedAt;
        const bTime = b instanceof TaskNode ? b.data.createdAt : b.completedAt;
        return aTime.getTime() - bTime.getTime();
      });

      // 应用分页
      const total = rootTaskNodes.length;
      const hasMore = offset + limit < total;
      const paginatedRoots = rootTaskNodes.slice(offset, offset + limit);

      // 构建每个任务树（限制深度）
      const trees = await Promise.all(
        paginatedRoots.map(async (rootNode) => {
          const treeRoot = this.buildLayeredTaskTreeNode(
            rootNode,
            0,
            [rootNode.id],
            maxDepth
          );

          // 计算统计信息
          const actualMaxDepth = this.calculateActualDepth(rootNode);
          const loadedNodes = this.countLoadedNodes(treeRoot);
          const totalNodes = this.countTotalNodes(rootNode);

          // 构建元数据
          const metadata = {
            createdAt:
              rootNode instanceof TaskNode
                ? rootNode.data.createdAt
                : rootNode.completedAt || new Date(),
            lastUpdatedAt:
              rootNode instanceof TaskNode
                ? rootNode.data.updatedAt
                : rootNode.completedAt || new Date(),
            rootTaskName:
              rootNode instanceof TaskNode
                ? rootNode.data.name
                : rootNode.name || '未知任务',
            rootTaskType:
              rootNode instanceof TaskNode ? rootNode.data.type : '已完成任务'
          };

          return {
            root: treeRoot,
            statistics: {
              totalNodes,
              loadedNodes,
              actualMaxDepth,
              currentMaxDepth: maxDepth
            },
            metadata
          };
        })
      );

      const result: LayeredTaskTreesResult = {
        trees,
        pagination: {
          total,
          limit,
          offset,
          hasMore
        },
        queryOptions: options,
        timestamp: new Date()
      };

      const duration = Date.now() - startTime;
      this.log.info(
        {
          treesCount: trees.length,
          total,
          maxDepth,
          duration
        },
        '分层任务树获取完成'
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error({ error: errorMsg }, '分层获取任务树失败');

      throw new Error(`分层获取任务树失败: ${errorMsg}`);
    }
  }

  /**
   * 获取指定任务的子任务列表
   */
  async getTaskChildren(parentId: string): Promise<TaskTreeNode[]> {
    this.log.debug({ parentId }, '获取任务子节点');

    try {
      const parentTask = this.getTask(parentId);

      if (!parentTask) {
        throw new Error(`父任务 ${parentId} 不存在`);
      }

      if (!(parentTask instanceof TaskNode)) {
        // 占位符节点没有子节点
        return [];
      }

      // 构建子任务树节点
      const children = parentTask.children.map((child, index) => {
        const childPath = [parentId, child.id];
        return this.buildTaskTreeNode(child, 1, childPath);
      });

      this.log.debug(
        { parentId, childrenCount: children.length },
        '任务子节点获取完成'
      );

      return children;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log.error({ parentId, error: errorMsg }, '获取任务子节点失败');

      throw new Error(`获取任务子节点失败: ${errorMsg}`);
    }
  }

  /**
   * 构建限制深度的任务树节点
   */
  private buildLayeredTaskTreeNode(
    node: TaskNode | TaskNodePlaceholder,
    currentDepth: number,
    path: string[],
    maxDepth: number
  ): TaskTreeNode {
    if (node instanceof TaskNode) {
      // 处理运行中的任务节点
      let children: TaskTreeNode[] = [];

      // 只有在没有达到最大深度时才加载子节点
      if (currentDepth < maxDepth) {
        children = node.children.map((child) => {
          const childPath = [...path, child.id];
          return this.buildLayeredTaskTreeNode(
            child,
            currentDepth + 1,
            childPath,
            maxDepth
          );
        });
      }

      return {
        id: node.id,
        name: node.data.name,
        description: node.data.description,
        status: node.status,
        progress: node.progress,
        priority: node.data.priority,
        type: node.data.type,
        executorName: node.data.executorName,
        createdAt: node.data.createdAt,
        updatedAt: node.data.updatedAt,
        isPlaceholder: false,
        metadata: { ...node.data.metadata },
        children,
        depth: currentDepth,
        path
      };
    } else {
      // 处理占位符节点
      return {
        id: node.id,
        name: node.name || '已完成任务',
        description: undefined,
        status: node.status,
        progress: node.progress,
        priority: 0,
        type: '已完成任务',
        executorName: undefined,
        createdAt: node.completedAt || new Date(),
        updatedAt: node.completedAt || new Date(),
        completedAt: node.completedAt,
        isPlaceholder: true,
        metadata: {},
        children: [], // 占位符节点没有子节点
        depth: currentDepth,
        path
      };
    }
  }

  /**
   * 计算任务树的实际最大深度
   */
  private calculateActualDepth(
    rootNode: TaskNode | TaskNodePlaceholder
  ): number {
    if (!(rootNode instanceof TaskNode)) {
      return 0;
    }

    let maxDepth = 0;

    const traverse = (node: TaskNode, currentDepth: number): void => {
      maxDepth = Math.max(maxDepth, currentDepth);

      for (const child of node.children) {
        if (child instanceof TaskNode) {
          traverse(child, currentDepth + 1);
        }
      }
    };

    traverse(rootNode, 0);
    return maxDepth;
  }

  /**
   * 计算树中已加载的节点数
   */
  private countLoadedNodes(treeNode: TaskTreeNode): number {
    let count = 1;
    for (const child of treeNode.children) {
      count += this.countLoadedNodes(child);
    }
    return count;
  }

  /**
   * 计算任务树的总节点数
   */
  private countTotalNodes(rootNode: TaskNode | TaskNodePlaceholder): number {
    if (!(rootNode instanceof TaskNode)) {
      return 1;
    }

    let count = 1;

    const traverse = (node: TaskNode): void => {
      for (const child of node.children) {
        count++;
        if (child instanceof TaskNode) {
          traverse(child);
        }
      }
    };

    traverse(rootNode);
    return count;
  }
}
