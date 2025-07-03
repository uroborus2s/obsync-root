/**
 * 基于 taskService 的同步任务服务
 * 支持全量同步和增量同步，采用函数式编程风格
 * 特点：断点续传、反复执行、任务树管理
 */

import { Logger } from '@stratix/core';
import { ITaskTreeService, TaskStatus } from '@stratix/tasks';
import { TaskType } from '@stratix/tasks/src/types/task.types.js';

/**
 * 同步配置接口
 */
interface SyncConfig {
  xnxq: string;
  batchSize?: number;
  maxRetries?: number;
  timeout?: number;
}

/**
 * 任务状态统计
 */
interface TaskChildrenStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
}

/**
 * 课程任务数据结构
 */
interface CourseTaskData {
  id: number;
  kkh: string;
  xnxq: string;
  kcmc: string;
  rq: string;
  jc_s: string;
  room_s: string;
  gh_s: string | null;
  xm_s: string | null;
  sj_f: string;
  sj_t: string;
  sjd: string;
  gx_zt?: number | null;
}

/**
 * 同步任务服务
 * 负责管理同步任务的创建、执行和状态跟踪
 */
export class SyncTaskService {
  constructor(
    private readonly taskTreeService: ITaskTreeService,
    private readonly log: Logger
  ) {}

  /**
   * 启动全量同步
   */
  async startFullSync(config: SyncConfig): Promise<string> {
    const { xnxq, batchSize = 100, maxRetries = 3, timeout = 300000 } = config;

    this.log.info({ config }, '开始创建全量同步任务树');

    try {
      // 创建根任务
      const rootTask = await this.taskTreeService.createTask({
        data: {
          name: `全量同步-${xnxq}`,
          description: `学年学期 ${xnxq} 的全量课程同步`,
          type: TaskType.DIRECTORY,
          metadata: {
            syncType: 'full',
            xnxq,
            batchSize,
            maxRetries,
            timeout
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        autoStart: false
      });

      this.log.info({ taskId: rootTask.id, xnxq }, '全量同步任务创建成功');
      return rootTask.id;
    } catch (error) {
      this.log.error({ error, config }, '创建全量同步任务失败');
      throw error;
    }
  }

  /**
   * 启动增量同步
   */
  async startIncrementalSync(config: SyncConfig): Promise<string> {
    const { xnxq, batchSize = 100, maxRetries = 3, timeout = 300000 } = config;

    this.log.info({ config }, '开始创建增量同步任务树');

    try {
      // 创建根任务
      const rootTask = await this.taskTreeService.createTask({
        data: {
          name: `增量同步-${xnxq}`,
          description: `学年学期 ${xnxq} 的增量课程同步`,
          type: TaskType.DIRECTORY,
          metadata: {
            syncType: 'incremental',
            xnxq,
            batchSize,
            maxRetries,
            timeout
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        autoStart: false
      });

      this.log.info({ taskId: rootTask.id, xnxq }, '增量同步任务创建成功');
      return rootTask.id;
    } catch (error) {
      this.log.error({ error, config }, '创建增量同步任务失败');
      throw error;
    }
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string) {
    try {
      const task = this.taskTreeService.getTask(taskId);
      if (!task) {
        return null;
      }

      // 检查是否为 TaskNode
      if ('data' in task) {
        return {
          id: task.id,
          name: task.data.name,
          description: task.data.description,
          status: task.status,
          type: task.data.type,
          metadata: task.data.metadata,
          createdAt: task.data.createdAt,
          updatedAt: task.data.updatedAt
        };
      }

      return null;
    } catch (error) {
      this.log.error({ error, taskId }, '获取任务状态失败');
      throw error;
    }
  }

  /**
   * 获取任务进度
   */
  async getTaskProgress(taskId: string) {
    try {
      const task = this.taskTreeService.getTask(taskId);
      if (!task) {
        return null;
      }

      return task.progress;
    } catch (error) {
      this.log.error({ error, taskId }, '获取任务进度失败');
      throw error;
    }
  }

  /**
   * 获取子任务统计
   */
  async getChildrenStats(taskId: string): Promise<TaskChildrenStats | null> {
    try {
      const children = await this.taskTreeService.getTaskChildren(taskId);
      if (!children) {
        return null;
      }

      const stats = {
        total: children.length,
        completed: 0,
        failed: 0,
        running: 0,
        pending: 0
      };

      children.forEach((child) => {
        switch (child.status) {
          case TaskStatus.SUCCESS:
            stats.completed++;
            break;
          case TaskStatus.FAILED:
            stats.failed++;
            break;
          case TaskStatus.RUNNING:
            stats.running++;
            break;
          case TaskStatus.PENDING:
            stats.pending++;
            break;
        }
      });

      return stats;
    } catch (error) {
      this.log.error({ error, taskId }, '获取子任务统计失败');
      throw error;
    }
  }

  /**
   * 暂停同步任务
   */
  async pauseSync(taskId: string, reason?: string) {
    try {
      this.log.info({ taskId, reason }, '暂停同步任务');
      return await this.taskTreeService.pauseTask(taskId, reason);
    } catch (error) {
      this.log.error({ error, taskId, reason }, '暂停同步任务失败');
      throw error;
    }
  }

  /**
   * 恢复同步任务
   */
  async resumeSync(taskId: string, reason?: string) {
    try {
      this.log.info({ taskId, reason }, '恢复同步任务');
      return await this.taskTreeService.resumeTask(taskId, reason);
    } catch (error) {
      this.log.error({ error, taskId, reason }, '恢复同步任务失败');
      throw error;
    }
  }

  /**
   * 取消同步任务
   */
  async cancelSync(taskId: string, reason?: string) {
    try {
      this.log.info({ taskId, reason }, '取消同步任务');
      return await this.taskTreeService.cancelTask(taskId, reason);
    } catch (error) {
      this.log.error({ error, taskId, reason }, '取消同步任务失败');
      throw error;
    }
  }

  /**
   * 重试同步任务
   */
  async retrySync(taskId: string, reason?: string) {
    try {
      this.log.info({ taskId, reason }, '重试同步任务');
      return await this.taskTreeService.retryTask(taskId, reason);
    } catch (error) {
      this.log.error({ error, taskId, reason }, '重试同步任务失败');
      throw error;
    }
  }
}

// 导出类型定义
export type { CourseTaskData, SyncConfig, TaskChildrenStats };
