/**
 * 完成任务Repository
 * 专门管理completed_tasks表的CRUD操作
 * 只处理success、failed、cancelled、completed状态的任务
 */

import { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { TaskStatus } from '../types/task.types.js';
import {
  CompletedTaskEntity,
  ExtendedDatabase,
  RunningTaskEntity
} from './types.js';

/**
 * 完成任务Repository实现
 */
export class CompletedTaskRepository {
  constructor(
    private db: Kysely<ExtendedDatabase>,
    private log: Logger
  ) {}

  /**
   * 解析 metadata 字段（从 JSON 字符串转换为对象）
   */
  private parseCompletedTaskMetadata(
    task: CompletedTaskEntity
  ): CompletedTaskEntity {
    if (task.metadata && typeof task.metadata === 'string') {
      try {
        return {
          ...task,
          metadata: JSON.parse(task.metadata)
        };
      } catch (error) {
        this.log.warn(
          { taskId: task.id, metadata: task.metadata },
          '解析 metadata 失败，保持原始字符串'
        );
      }
    }
    return task;
  }

  /**
   * 批量解析 metadata 字段
   */
  private parseCompletedTasksMetadata(
    tasks: CompletedTaskEntity[]
  ): CompletedTaskEntity[] {
    return tasks.map((task) => this.parseCompletedTaskMetadata(task));
  }

  /**
   * 备份任务树到完成任务表
   */
  async backupTaskTree(tasks: RunningTaskEntity[]): Promise<void> {
    if (tasks.length === 0) {
      return;
    }

    // 使用事务确保数据一致性
    await this.db.transaction().execute(async (trx) => {
      // 将运行中任务数据转换为完成任务数据
      const completedTasks: CompletedTaskEntity[] = tasks.map((task) => ({
        ...task,
        // 确保 metadata 是 JSON 字符串格式
        metadata: task.metadata ? JSON.stringify(task.metadata) : null,
        // 确保完成时间存在
        completed_at: task.completed_at || new Date()
      }));

      await trx.insertInto('completed_tasks').values(completedTasks).execute();
    });

    this.log.info(
      {
        taskCount: tasks.length,
        rootTaskId: tasks.find((t) => !t.parent_id)?.id
      },
      '任务树备份到完成任务表成功'
    );
  }

  /**
   * 根据ID查找完成的任务
   */
  async findById(id: string): Promise<CompletedTaskEntity | null> {
    const result = await this.db
      .selectFrom('completed_tasks')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result ? this.parseCompletedTaskMetadata(result) : null;
  }

  /**
   * 查找完成的根任务
   */
  async findCompletedRootTasks(options?: {
    limit?: number;
    offset?: number;
  }): Promise<CompletedTaskEntity[]> {
    let query = this.db
      .selectFrom('completed_tasks')
      .selectAll()
      .where('parent_id', 'is', null)
      .orderBy('completed_at', 'desc');

    if (options?.limit) {
      query = query.limit(options.limit);

      if (options?.offset) {
        query = query.offset(options.offset);
      }
    }

    const results = await query.execute();
    return this.parseCompletedTasksMetadata(results);
  }

  /**
   * 根据根任务ID获取完整任务树
   */
  async findTaskTreeByRootId(rootId: string): Promise<CompletedTaskEntity[]> {
    // 先找到根任务
    const rootTask = await this.findById(rootId);
    if (!rootTask || rootTask.parent_id !== null) {
      return [];
    }

    // 递归查询子任务 - 简化版本，暂时使用多次查询
    const allTasks: CompletedTaskEntity[] = [rootTask];
    const toProcess = [rootTask];

    while (toProcess.length > 0) {
      const currentTask = toProcess.shift()!;

      const children = await this.db
        .selectFrom('completed_tasks')
        .selectAll()
        .where('parent_id', '=', currentTask.id)
        .execute();

      const parsedChildren = this.parseCompletedTasksMetadata(children);
      allTasks.push(...parsedChildren);
      toProcess.push(...parsedChildren);
    }

    return allTasks;
  }

  /**
   * 统计完成任务数量
   */
  async getStats(): Promise<{
    total: number;
    success: number;
    failed: number;
    cancelled: number;
  }> {
    const results = await this.db
      .selectFrom('completed_tasks')
      .select(['status', this.db.fn.count('id').as('count')])
      .groupBy('status')
      .execute();

    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      cancelled: 0
    };

    for (const row of results) {
      const count = Number(row.count);
      stats.total += count;

      switch (row.status) {
        case TaskStatus.SUCCESS:
          stats.success = count;
          break;
        case TaskStatus.FAILED:
          stats.failed = count;
          break;
        case TaskStatus.CANCELLED:
          stats.cancelled = count;
          break;
      }
    }

    return stats;
  }

  /**
   * 清理旧的完成任务（可选功能）
   */
  async cleanupOldTasks(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.db
      .deleteFrom('completed_tasks')
      .where('completed_at', '<', cutoffDate)
      .execute();

    const deletedCount = result.reduce(
      (sum, r) => sum + Number(r.numDeletedRows),
      0
    );

    this.log.info(
      { deletedCount, daysToKeep, cutoffDate },
      '旧完成任务清理完成'
    );

    return deletedCount;
  }
}
