/**
 * 任务迁移Repository
 * 专门处理从running_tasks到completed_tasks的数据迁移
 * 使用数据库存储过程确保数据一致性
 */

import { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { TaskStatus } from '../types/task.types.js';
import { CompletedTaskEntity, ExtendedDatabase } from './types.js';

/**
 * 迁移结果
 */
export interface MigrationResult {
  success: boolean;
  message: string;
  migrated_count?: number;
}

/**
 * 任务迁移Repository实现
 */
export class TaskMigrationRepository {
  constructor(
    private db: Kysely<ExtendedDatabase>,
    private log: Logger
  ) {}

  /**
   * 迁移单个任务到完成状态
   */
  async migrateTask(
    taskId: string,
    finalStatus: 'success' | 'failed' | 'cancelled' | 'completed',
    finalProgress?: number
  ): Promise<MigrationResult> {
    try {
      // 使用手动迁移方式
      return await this.migrateTaskManual(taskId, finalStatus, finalProgress);
    } catch (error) {
      const errorMessage = `任务迁移失败: ${error instanceof Error ? error.message : String(error)}`;

      this.log.error({ taskId, finalStatus, error }, errorMessage);

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * 迁移整个任务树到完成状态
   */
  async migrateTaskTree(
    rootTaskId: string,
    finalStatus: 'success' | 'failed' | 'cancelled' | 'completed'
  ): Promise<MigrationResult> {
    try {
      let migratedCount = 0;

      await this.db.transaction().execute(async (trx) => {
        // 递归查找所有子任务
        const allTasks = await this.findTaskTreeRecursive(trx, rootTaskId);

        if (allTasks.length === 0) {
          return;
        }

        // 批量插入到完成任务表
        const completedTasks: CompletedTaskEntity[] = allTasks.map((task) => ({
          ...task,
          status: finalStatus as TaskStatus,
          progress: 100.0,
          // 注意：从数据库直接读取的metadata已经是JSON字符串，可以直接使用
          metadata: task.metadata,
          updated_at: new Date(),
          completed_at: new Date()
        }));

        await trx
          .insertInto('completed_tasks')
          .values(completedTasks)
          .execute();

        // 批量删除运行中任务
        const taskIds = allTasks.map((task) => task.id);
        await trx
          .deleteFrom('running_tasks')
          .where('id', 'in', taskIds)
          .execute();

        migratedCount = allTasks.length;
      });

      this.log.info(
        {
          rootTaskId,
          finalStatus,
          migratedCount
        },
        '任务树迁移成功'
      );

      return {
        success: true,
        message: '任务树迁移成功',
        migrated_count: migratedCount
      };
    } catch (error) {
      const errorMessage = `任务树迁移失败: ${error instanceof Error ? error.message : String(error)}`;

      this.log.error({ rootTaskId, finalStatus, error }, errorMessage);

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * 递归查找任务树中的所有任务
   */
  private async findTaskTreeRecursive(
    trx: any,
    rootTaskId: string
  ): Promise<any[]> {
    const allTasks: any[] = [];
    const visited = new Set<string>();

    const findChildren = async (parentId: string): Promise<void> => {
      if (visited.has(parentId)) {
        return;
      }
      visited.add(parentId);

      // 查找当前任务
      const currentTask = await trx
        .selectFrom('running_tasks')
        .selectAll()
        .where('id', '=', parentId)
        .executeTakeFirst();

      if (currentTask) {
        allTasks.push(currentTask);

        // 查找子任务
        const children = await trx
          .selectFrom('running_tasks')
          .selectAll()
          .where('parent_id', '=', parentId)
          .execute();

        // 递归处理子任务
        for (const child of children) {
          await findChildren(child.id);
        }
      }
    };

    await findChildren(rootTaskId);
    return allTasks;
  }

  /**
   * 手动迁移任务（不使用存储过程）
   */
  async migrateTaskManual(
    taskId: string,
    finalStatus: 'success' | 'failed' | 'cancelled' | 'completed',
    finalProgress?: number
  ): Promise<MigrationResult> {
    try {
      await this.db.transaction().execute(async (trx) => {
        // 查找运行中的任务
        const runningTask = await trx
          .selectFrom('running_tasks')
          .selectAll()
          .where('id', '=', taskId)
          .executeTakeFirst();

        if (!runningTask) {
          throw new Error(`运行中任务 ${taskId} 不存在`);
        }

        // 插入到完成任务表
        const completedTask: CompletedTaskEntity = {
          ...runningTask,
          status: finalStatus as TaskStatus,
          progress: finalProgress || 100.0,
          // 注意：从数据库直接读取的metadata已经是JSON字符串，可以直接使用
          metadata: runningTask.metadata,
          updated_at: new Date(),
          completed_at: new Date()
        };

        await trx.insertInto('completed_tasks').values(completedTask).execute();

        // 从运行中任务表删除
        await trx
          .deleteFrom('running_tasks')
          .where('id', '=', taskId)
          .execute();
      });

      this.log.info({ taskId, finalStatus }, '任务手动迁移成功');

      return {
        success: true,
        message: '任务手动迁移成功'
      };
    } catch (error) {
      const errorMessage = `任务手动迁移失败: ${error instanceof Error ? error.message : String(error)}`;

      this.log.error({ taskId, finalStatus, error }, errorMessage);

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * 批量迁移指定状态的任务
   */
  async migrateBatchByStatus(
    sourceStatus: TaskStatus,
    finalStatus: 'success' | 'failed' | 'cancelled' | 'completed'
  ): Promise<MigrationResult> {
    try {
      let migratedCount = 0;

      await this.db.transaction().execute(async (trx) => {
        // 查找指定状态的任务
        const tasksToMigrate = await trx
          .selectFrom('running_tasks')
          .selectAll()
          .where('status', '=', sourceStatus)
          .execute();

        if (tasksToMigrate.length === 0) {
          return;
        }

        // 批量插入到完成任务表
        const completedTasks: CompletedTaskEntity[] = tasksToMigrate.map(
          (task) => ({
            ...task,
            status: finalStatus as TaskStatus,
            progress: 100.0,
            // 注意：从数据库直接读取的metadata已经是JSON字符串，可以直接使用
            metadata: task.metadata,
            updated_at: new Date(),
            completed_at: new Date()
          })
        );

        await trx
          .insertInto('completed_tasks')
          .values(completedTasks)
          .execute();

        // 批量删除运行中任务
        const taskIds = tasksToMigrate.map((task) => task.id);
        await trx
          .deleteFrom('running_tasks')
          .where('id', 'in', taskIds)
          .execute();

        migratedCount = tasksToMigrate.length;
      });

      this.log.info(
        { sourceStatus, finalStatus, migratedCount },
        '批量任务迁移成功'
      );

      return {
        success: true,
        message: `成功迁移 ${migratedCount} 个任务`,
        migrated_count: migratedCount
      };
    } catch (error) {
      const errorMessage = `批量任务迁移失败: ${error instanceof Error ? error.message : String(error)}`;

      this.log.error({ sourceStatus, finalStatus, error }, errorMessage);

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * 获取迁移统计信息
   */
  async getMigrationStats(): Promise<{
    running_tasks_count: number;
    completed_tasks_count: number;
    pending_migrations: number;
  }> {
    const runningCount = await this.db
      .selectFrom('running_tasks')
      .select(this.db.fn.count('id').as('count'))
      .executeTakeFirst();

    const completedCount = await this.db
      .selectFrom('completed_tasks')
      .select(this.db.fn.count('id').as('count'))
      .executeTakeFirst();

    // 计算可能需要迁移的任务（非pending状态的运行中任务）
    const pendingMigrations = await this.db
      .selectFrom('running_tasks')
      .select(this.db.fn.count('id').as('count'))
      .where('status', 'in', [TaskStatus.RUNNING, TaskStatus.PAUSED])
      .executeTakeFirst();

    return {
      running_tasks_count: Number(runningCount?.count || 0),
      completed_tasks_count: Number(completedCount?.count || 0),
      pending_migrations: Number(pendingMigrations?.count || 0)
    };
  }
}
