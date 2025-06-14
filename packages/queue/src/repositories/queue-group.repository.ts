/**
 * @stratix/queue 队列分组仓储
 */

import type { Logger } from '@stratix/core';
import type { Kysely } from '@stratix/database';
import { randomUUID } from 'node:crypto';
import type {
  GroupStatus,
  QueueDatabase,
  QueueGroupInsert,
  QueueGroupSelect,
  QueueGroupUpdate
} from '../types/index.js';

/**
 * 队列分组仓储类
 */
export class QueueGroupRepository {
  constructor(
    private db: Kysely<QueueDatabase>,
    private log: Logger
  ) {}

  /**
   * 初始化仓储
   */
  async init(): Promise<void> {
    try {
      await this.db.selectFrom('queue_groups').select('id').limit(1).execute();
    } catch (error) {
      throw new Error(
        `队列分组仓储初始化失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 解析分组对象，将JSON字符串转换为对象
   */
  private parseGroup(group: QueueGroupSelect): QueueGroupSelect {
    return {
      ...group,
      metadata:
        typeof group.metadata === 'string'
          ? JSON.parse(group.metadata)
          : group.metadata
    };
  }

  /**
   * 解析分组数组
   */
  private parseGroups(groups: QueueGroupSelect[]): QueueGroupSelect[] {
    return groups.map((group) => this.parseGroup(group));
  }

  /**
   * 创建或更新分组
   */
  async upsert(
    queueName: string,
    groupId: string,
    metadata?: Record<string, unknown>
  ): Promise<QueueGroupSelect> {
    const existingGroup = await this.findByGroupId(queueName, groupId);

    if (existingGroup) {
      // 更新现有分组
      const [updatedGroup] = await this.db
        .updateTable('queue_groups')
        .set({
          updated_at: new Date(),
          metadata: metadata
            ? JSON.stringify(metadata)
            : typeof existingGroup.metadata === 'string'
              ? existingGroup.metadata
              : JSON.stringify(existingGroup.metadata)
        })
        .where('queue_name', '=', queueName)
        .where('group_id', '=', groupId)
        .returningAll()
        .execute();

      return this.parseGroup(updatedGroup);
    } else {
      // 创建新分组
      const groupData: QueueGroupInsert = {
        id: randomUUID(),
        queue_name: queueName,
        group_id: groupId,
        status: 'active',
        total_jobs: 0,
        completed_jobs: 0,
        failed_jobs: 0,
        metadata: metadata ? JSON.stringify(metadata) : null
      };

      const [createdGroup] = await this.db
        .insertInto('queue_groups')
        .values(groupData)
        .returningAll()
        .execute();

      return this.parseGroup(createdGroup);
    }
  }

  /**
   * 根据分组ID查找分组
   */
  async findByGroupId(
    queueName: string,
    groupId: string
  ): Promise<QueueGroupSelect | null> {
    const group = await this.db
      .selectFrom('queue_groups')
      .selectAll()
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .executeTakeFirst();

    return group ? this.parseGroup(group) : null;
  }

  /**
   * 获取队列中的所有分组
   */
  async findByQueue(queueName: string): Promise<QueueGroupSelect[]> {
    const groups = await this.db
      .selectFrom('queue_groups')
      .selectAll()
      .where('queue_name', '=', queueName)
      .orderBy('created_at', 'asc')
      .execute();

    return this.parseGroups(groups);
  }

  /**
   * 获取指定状态的分组
   */
  async findByStatus(
    queueName: string,
    status: GroupStatus
  ): Promise<QueueGroupSelect[]> {
    const groups = await this.db
      .selectFrom('queue_groups')
      .selectAll()
      .where('queue_name', '=', queueName)
      .where('status', '=', status)
      .orderBy('created_at', 'asc')
      .execute();

    return this.parseGroups(groups);
  }

  /**
   * 获取暂停的分组ID列表
   */
  async getPausedGroupIds(queueName: string): Promise<string[]> {
    const groups = await this.db
      .selectFrom('queue_groups')
      .select('group_id')
      .where('queue_name', '=', queueName)
      .where('status', '=', 'paused')
      .execute();

    return groups.map((group) => group.group_id);
  }

  /**
   * 暂停分组
   */
  async pauseGroup(
    queueName: string,
    groupId: string
  ): Promise<QueueGroupSelect | null> {
    const [updatedGroup] = await this.db
      .updateTable('queue_groups')
      .set({
        status: 'paused',
        updated_at: new Date()
      })
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .returningAll()
      .execute();

    return updatedGroup ? this.parseGroup(updatedGroup) : null;
  }

  /**
   * 恢复分组
   */
  async resumeGroup(
    queueName: string,
    groupId: string
  ): Promise<QueueGroupSelect | null> {
    const [updatedGroup] = await this.db
      .updateTable('queue_groups')
      .set({
        status: 'active',
        updated_at: new Date()
      })
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .returningAll()
      .execute();

    return updatedGroup ? this.parseGroup(updatedGroup) : null;
  }

  /**
   * 更新分组统计信息
   */
  async updateStatistics(
    queueName: string,
    groupId: string,
    statistics: {
      totalJobs?: number;
      completedJobs?: number;
      failedJobs?: number;
    }
  ): Promise<QueueGroupSelect | null> {
    const updateData: QueueGroupUpdate = {
      updated_at: new Date()
    };

    if (statistics.totalJobs !== undefined) {
      updateData.total_jobs = statistics.totalJobs;
    }
    if (statistics.completedJobs !== undefined) {
      updateData.completed_jobs = statistics.completedJobs;
    }
    if (statistics.failedJobs !== undefined) {
      updateData.failed_jobs = statistics.failedJobs;
    }

    const [updatedGroup] = await this.db
      .updateTable('queue_groups')
      .set(updateData)
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .returningAll()
      .execute();

    return updatedGroup ? this.parseGroup(updatedGroup) : null;
  }

  /**
   * 增加分组的总任务数
   */
  async incrementTotalJobs(
    queueName: string,
    groupId: string,
    count: number = 1
  ): Promise<void> {
    await this.db
      .updateTable('queue_groups')
      .set((eb) => ({
        total_jobs: eb('total_jobs', '+', count),
        updated_at: new Date()
      }))
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .execute();
  }

  /**
   * 增加分组的完成任务数
   */
  async incrementCompletedJobs(
    queueName: string,
    groupId: string,
    count: number = 1
  ): Promise<void> {
    await this.db
      .updateTable('queue_groups')
      .set((eb) => ({
        completed_jobs: eb('completed_jobs', '+', count),
        updated_at: new Date()
      }))
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .execute();
  }

  /**
   * 增加分组的失败任务数
   */
  async incrementFailedJobs(
    queueName: string,
    groupId: string,
    count: number = 1
  ): Promise<void> {
    await this.db
      .updateTable('queue_groups')
      .set((eb) => ({
        failed_jobs: eb('failed_jobs', '+', count),
        updated_at: new Date()
      }))
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .execute();
  }

  /**
   * 删除分组
   */
  async delete(queueName: string, groupId: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom('queue_groups')
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .execute();

    return Number(result[0]?.numDeletedRows || 0) > 0;
  }

  /**
   * 清理空分组
   */
  async cleanupEmptyGroups(queueName?: string): Promise<number> {
    let query = this.db.deleteFrom('queue_groups').where('total_jobs', '=', 0);

    if (queueName) {
      query = query.where('queue_name', '=', queueName);
    }

    const result = await query.execute();
    return Number(result[0]?.numDeletedRows || 0);
  }

  /**
   * 获取分组统计信息
   */
  async getGroupStatistics(queueName?: string): Promise<{
    totalGroups: number;
    activeGroups: number;
    pausedGroups: number;
    groupsByQueue: Record<
      string,
      { total: number; active: number; paused: number }
    >;
  }> {
    let baseQuery = this.db.selectFrom('queue_groups');

    if (queueName) {
      baseQuery = baseQuery.where('queue_name', '=', queueName);
    }

    // 获取总体统计
    const totalResult = await baseQuery
      .select((eb) => [
        eb.fn.count('id').as('total'),
        eb.fn.countAll().filterWhere('status', '=', 'active').as('active'),
        eb.fn.countAll().filterWhere('status', '=', 'paused').as('paused')
      ])
      .executeTakeFirst();

    // 获取按队列分组的统计
    const queueStats = await this.db
      .selectFrom('queue_groups')
      .select((eb) => [
        'queue_name',
        eb.fn.count('id').as('total'),
        eb.fn.countAll().filterWhere('status', '=', 'active').as('active'),
        eb.fn.countAll().filterWhere('status', '=', 'paused').as('paused')
      ])
      .groupBy('queue_name')
      .execute();

    return {
      totalGroups: Number(totalResult?.total || 0),
      activeGroups: Number(totalResult?.active || 0),
      pausedGroups: Number(totalResult?.paused || 0),
      groupsByQueue: queueStats.reduce(
        (acc, stat) => {
          acc[stat.queue_name] = {
            total: Number(stat.total),
            active: Number(stat.active),
            paused: Number(stat.paused)
          };
          return acc;
        },
        {} as Record<string, any>
      )
    };
  }

  /**
   * 同步分组统计信息（从任务表重新计算）
   */
  async syncGroupStatistics(
    queueName: string,
    groupId: string
  ): Promise<QueueGroupSelect | null> {
    // 从任务表计算统计信息
    const stats = await this.db
      .selectFrom('queue_jobs')
      .select((eb) => [eb.fn.count('id').as('total_jobs')])
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .executeTakeFirst();

    const successStats = await this.db
      .selectFrom('queue_success')
      .select((eb) => [eb.fn.count('id').as('completed_jobs')])
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .executeTakeFirst();

    const failureStats = await this.db
      .selectFrom('queue_failures')
      .select((eb) => [eb.fn.count('id').as('failed_jobs')])
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .executeTakeFirst();

    // 更新分组统计
    const [updatedGroup] = await this.db
      .updateTable('queue_groups')
      .set({
        total_jobs: Number(stats?.total_jobs || 0),
        completed_jobs: Number(successStats?.completed_jobs || 0),
        failed_jobs: Number(failureStats?.failed_jobs || 0),
        updated_at: new Date()
      })
      .where('queue_name', '=', queueName)
      .where('group_id', '=', groupId)
      .returningAll()
      .execute();

    return updatedGroup ? this.parseGroup(updatedGroup) : null;
  }
}
