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
  TaskRecoveryResult,
  TaskStateChangeResult,
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
      // 1. 获取所有运行中的任务
      const runningTasks = await this.runningTaskRepo.findAll();

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
        { taskCount: runningTasks.length },
        '找到需要恢复的运行中任务'
      );

      // 2. 按层级恢复任务（先恢复根任务，再恢复子任务）
      const rootTasks = runningTasks.filter((task) => !task.parent_id);
      const childTasks = runningTasks.filter((task) => task.parent_id);

      // 3. 恢复子任务（按层级递归恢复）
      const recoverChildren = async (
        parentNode: TaskNode | TaskNodePlaceholder
      ): Promise<void> => {
        if (parentNode instanceof TaskNode) {
          const parentId = parentNode.id;
          const children = childTasks.filter(
            (task) => task.parent_id === parentId
          );
          for (const childEntity of children) {
            try {
              const taskNode = await this.recoverSingleTask(
                childEntity,
                parentId
              );
              recoveredCount++;

              this.log.debug(
                {
                  taskId: childEntity.id,
                  name: childEntity.name,
                  parentId
                },
                '子任务恢复成功'
              );

              // 递归恢复该子任务的子任务
              await recoverChildren(taskNode);
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
      for (const rootTask of rootTasks) {
        const taskNode = await this.recoverSingleTask(rootTask, null);
        await recoverChildren(taskNode);
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

    try {
      // 获取要转换的节点
      const targetNode = this.getTask(node.id);
      if (!(targetNode instanceof TaskNode)) {
        this.log.warn({ nodeId: node.id }, '要转换的节点是占位符，跳过处理');
        return;
      }
      if (!targetNode) {
        this.log.warn(
          { nodeId: node.id },
          '要转换的节点不存在于缓存中，跳过处理'
        );
        return;
      }

      const nodeName = targetNode.data.name;

      // 收集所有需要从缓存中删除的节点ID（包括该节点及其所有下级节点）
      const nodeIdsToRemove = new Set<string>();

      // 递归收集所有下级节点
      const collectDescendantIds = (node: TaskNode): void => {
        const descendants = node.getDescendants();
        for (const descendant of descendants) {
          nodeIdsToRemove.add(descendant.id);
        }
      };

      collectDescendantIds(targetNode as TaskNode);

      // 从缓存中删除所有收集到的节点
      let removedCount = 0;
      for (const idToRemove of nodeIdsToRemove) {
        this.taskNodes.delete(idToRemove);
      }
      this.taskNodes.set(node.id, node);

      this.log.info(
        {
          nodeId: node.id,
          nodeName,
          removedCount,
          totalNodesToRemove: nodeIdsToRemove.size,
          remainingCacheSize: this.taskNodes.size
        },
        '节点占位符转换处理完成，已从缓存中删除节点及其下级节点'
      );
    } catch (error) {
      this.log.error(
        {
          nodeId: node.id,
          error: error instanceof Error ? error.message : String(error)
        },
        '处理节点占位符转换事件失败'
      );
    }
  }
}
