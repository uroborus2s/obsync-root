/**
 * 运行中任务Repository
 * 专门管理running_tasks表的CRUD操作
 * 只处理pending、running、paused状态的任务
 */

import { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { TaskStatus, TaskStatusUtils } from '../types/task.types.js';
import { ExtendedDatabase, RunningTaskEntity } from './types.js';

/**
 * 运行中任务Repository实现
 */
export class RunningTaskRepository {
  constructor(
    private db: Kysely<ExtendedDatabase>,
    private log: Logger
  ) {}

  /**
   * 解析 metadata 字段（从 JSON 字符串转换为对象）
   */
  private parseRunningTaskMetadata(task: RunningTaskEntity): RunningTaskEntity {
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
  private parseRunningTasksMetadata(
    tasks: RunningTaskEntity[]
  ): RunningTaskEntity[] {
    return tasks.map((task) => this.parseRunningTaskMetadata(task));
  }

  /**
   * 创建任务
   */
  async create(taskData: {
    id: string;
    parent_id?: string | null;
    name: string;
    description?: string | null;
    task_type: string;
    status: TaskStatus;
    priority: number;
    progress?: number;
    executor_name?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<void> {
    const now = new Date();

    const entity: RunningTaskEntity = {
      id: taskData.id,
      parent_id: taskData.parent_id || null,
      name: taskData.name,
      description: taskData.description || null,
      task_type: taskData.task_type,
      status: taskData.status,
      priority: taskData.priority,
      progress: taskData.progress || 0,
      executor_name: taskData.executor_name || null,
      metadata: taskData.metadata ? JSON.stringify(taskData.metadata) : null,
      created_at: now,
      updated_at: now,
      started_at: taskData.status === TaskStatus.RUNNING ? now : null,
      completed_at: null
    };

    await this.db.insertInto('running_tasks').values(entity).execute();

    this.log.debug({ taskId: taskData.id }, '运行中任务创建成功');
  }

  /**
   * 更新任务状态
   */
  async updateStatus(
    id: string,
    status: TaskStatus,
    progress?: number
  ): Promise<void> {
    const updateData: Partial<RunningTaskEntity> = {
      status,
      updated_at: new Date()
    };

    if (progress !== undefined) {
      updateData.progress = progress;
    }

    if (status === TaskStatus.RUNNING && !(await this.isStarted(id))) {
      updateData.started_at = new Date();
    }

    if (TaskStatusUtils.isCompleted(status)) {
      updateData.completed_at = new Date();
    }

    await this.db
      .updateTable('running_tasks')
      .set(updateData)
      .where('id', '=', id)
      .execute();

    this.log.debug({ taskId: id, status, progress }, '运行中任务状态更新成功');
  }

  /**
   * 更新任务的 metadata
   */
  async updateTaskMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const updateData: Partial<RunningTaskEntity> = {
      metadata: JSON.stringify(metadata),
      updated_at: new Date()
    };

    await this.db
      .updateTable('running_tasks')
      .set(updateData)
      .where('id', '=', id)
      .execute();

    this.log.debug({ taskId: id, metadata }, '运行中任务 metadata 更新成功');
  }

  /**
   * 根据ID获取任务
   */
  async findById(id: string): Promise<RunningTaskEntity | null> {
    const result = await this.db
      .selectFrom('running_tasks')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return result ? this.parseRunningTaskMetadata(result) : null;
  }

  /**
   * 根据父ID获取子任务
   */
  async findByParentId(parentId: string): Promise<RunningTaskEntity[]> {
    const results = await this.db
      .selectFrom('running_tasks')
      .selectAll()
      .where('parent_id', '=', parentId)
      .orderBy('created_at', 'asc')
      .execute();

    return this.parseRunningTasksMetadata(results);
  }

  /**
   * 获取根任务（没有父任务的任务）
   */
  async findRootTasks(): Promise<RunningTaskEntity[]> {
    const results = await this.db
      .selectFrom('running_tasks')
      .selectAll()
      .where('parent_id', 'is', null)
      .orderBy('created_at', 'asc')
      .execute();

    return this.parseRunningTasksMetadata(results);
  }

  /**
   * 获取特定状态的任务
   */
  async findByStatus(
    status: TaskStatus | TaskStatus[]
  ): Promise<RunningTaskEntity[]> {
    const statuses = Array.isArray(status) ? status : [status];

    const results = await this.db
      .selectFrom('running_tasks')
      .selectAll()
      .where('status', 'in', statuses)
      .orderBy('created_at', 'asc')
      .execute();

    return this.parseRunningTasksMetadata(results);
  }

  /**
   * 删除任务
   */
  async deleteTask(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('running_tasks')
      .where('id', '=', id)
      .execute();

    const deleted = result.length > 0 && result[0].numDeletedRows > BigInt(0);

    if (deleted) {
      this.log.info({ taskId: id }, '运行中任务删除成功');
    }

    return deleted;
  }

  /**
   * 检查父任务是否可以添加子任务
   */
  async canAddChild(parentId: string): Promise<boolean> {
    const parent = await this.findById(parentId);
    if (!parent) {
      return false;
    }

    // 只有PENDING和RUNNING状态的任务可以添加子任务
    return TaskStatusUtils.canAddChild(parent.status);
  }

  /**
   * 获取运行中任务使用的执行器名称列表（用于恢复）
   */
  async getActiveExecutorNames(): Promise<string[]> {
    const results = await this.db
      .selectFrom('running_tasks')
      .select('executor_name')
      .where('executor_name', 'is not', null)
      .groupBy('executor_name')
      .execute();

    return results
      .map((row) => row.executor_name)
      .filter((name): name is string => name !== null);
  }

  /**
   * 获取所有运行中任务
   */
  async findAll(): Promise<RunningTaskEntity[]> {
    const results = await this.db
      .selectFrom('running_tasks')
      .selectAll()
      .orderBy('created_at', 'asc')
      .execute();

    return this.parseRunningTasksMetadata(results);
  }

  /**
   * 根据根任务ID获取整个任务树
   */
  async findTaskTreeByRoot(rootTaskId: string): Promise<RunningTaskEntity[]> {
    const allTasks: RunningTaskEntity[] = [];
    const visited = new Set<string>();

    const findChildren = async (parentId: string): Promise<void> => {
      if (visited.has(parentId)) {
        return;
      }
      visited.add(parentId);

      // 查找当前任务
      const currentTask = await this.findById(parentId);
      if (currentTask) {
        allTasks.push(currentTask);

        // 查找子任务
        const children = await this.findByParentId(parentId);

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
   * 统计运行中任务数量
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    running: number;
    paused: number;
  }> {
    const results = await this.db
      .selectFrom('running_tasks')
      .select(['status', this.db.fn.count('id').as('count')])
      .groupBy('status')
      .execute();

    const stats = {
      total: 0,
      pending: 0,
      running: 0,
      paused: 0
    };

    for (const row of results) {
      const count = Number(row.count);
      stats.total += count;

      switch (row.status) {
        case TaskStatus.PENDING:
          stats.pending = count;
          break;
        case TaskStatus.RUNNING:
          stats.running = count;
          break;
        case TaskStatus.PAUSED:
          stats.paused = count;
          break;
      }
    }

    return stats;
  }

  /**
   * 获取任务的所有后代（递归查询子任务）
   */
  async getDescendants(rootId: string): Promise<RunningTaskEntity[]> {
    const descendants: RunningTaskEntity[] = [];
    const toProcess = [rootId];

    while (toProcess.length > 0) {
      const currentId = toProcess.shift()!;
      const children = await this.findByParentId(currentId);

      descendants.push(...children);
      toProcess.push(...children.map((child) => child.id));
    }

    return descendants;
  }

  /**
   * 删除任务及其所有后代
   */
  async deleteWithDescendants(id: string): Promise<number> {
    // 获取所有后代任务
    const descendants = await this.getDescendants(id);
    const allTaskIds = [id, ...descendants.map((d) => d.id)];

    // 使用事务删除所有任务
    let deletedCount = 0;
    await this.db.transaction().execute(async (trx) => {
      for (const taskId of allTaskIds) {
        const result = await trx
          .deleteFrom('running_tasks')
          .where('id', '=', taskId)
          .execute();

        if (result.length > 0 && result[0].numDeletedRows > BigInt(0)) {
          deletedCount++;
        }
      }
    });

    this.log.info(
      { rootId: id, deletedCount, totalTasks: allTaskIds.length },
      '任务树删除完成'
    );
    return deletedCount;
  }

  /**
   * 更新任务（通用更新方法）
   */
  async update(
    id: string,
    updates: Partial<RunningTaskEntity>
  ): Promise<RunningTaskEntity> {
    const updateData = {
      ...updates,
      updated_at: new Date()
    };

    const result = await this.db
      .updateTable('running_tasks')
      .set(updateData)
      .where('id', '=', id)
      .execute();

    if (result.length === 0 || result[0].numUpdatedRows === BigInt(0)) {
      throw new Error(`运行中任务 ${id} 不存在`);
    }

    // 返回更新后的任务
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error(`更新后未找到运行中任务 ${id}`);
    }

    return updated;
  }

  /**
   * 检查任务是否已开始
   */
  private async isStarted(id: string): Promise<boolean> {
    const result = await this.db
      .selectFrom('running_tasks')
      .select('started_at')
      .where('id', '=', id)
      .executeTakeFirst();

    return result?.started_at != null;
  }
}
