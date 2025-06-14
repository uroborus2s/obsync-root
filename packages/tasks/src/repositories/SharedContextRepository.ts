/**
 * SharedContext 数据库仓储
 * 负责共享上下文数据的数据库持久化操作
 */

import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { SharedContextData } from '../entity/SharedContext.js';
import { ExtendedDatabase } from './types.js';

/**
 * 共享上下文数据库记录接口
 */
export interface SharedContextRecord {
  rootTaskId: string;
  contextData: SharedContextData;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SharedContext 仓储接口
 */
export interface ISharedContextRepository {
  /**
   * 保存共享上下文到数据库
   */
  saveContext(rootTaskId: string, data: SharedContextData): Promise<void>;

  /**
   * 从数据库加载共享上下文
   */
  loadContext(rootTaskId: string): Promise<SharedContextData | null>;

  /**
   * 从数据库删除共享上下文
   */
  deleteContext(rootTaskId: string): Promise<void>;

  /**
   * 检查共享上下文是否存在
   */
  existsContext(rootTaskId: string): Promise<boolean>;

  /**
   * 获取所有共享上下文的根任务ID
   */
  getAllRootTaskIds(): Promise<string[]>;

  /**
   * 清理过期的共享上下文
   */
  cleanupExpiredContexts(olderThanDays: number): Promise<number>;
}

/**
 * SharedContext 仓储实现
 */
export class SharedContextRepository implements ISharedContextRepository {
  constructor(
    private db: Kysely<ExtendedDatabase>,
    private log: Logger
  ) {
    this.log.debug('SharedContextRepository 已初始化');
  }

  /**
   * 保存共享上下文到数据库
   */
  async saveContext(
    rootTaskId: string,
    data: SharedContextData
  ): Promise<void> {
    try {
      const now = new Date();

      // 检查是否已存在
      const existing = await this.db
        .selectFrom('shared_contexts')
        .select(['id', 'created_at'])
        .where('root_task_id', '=', rootTaskId)
        .executeTakeFirst();

      if (existing) {
        // 更新现有记录
        await this.db
          .updateTable('shared_contexts')
          .set({
            data: JSON.stringify(data),
            updated_at: now
          })
          .where('root_task_id', '=', rootTaskId)
          .execute();

        this.log.debug(
          {
            rootTaskId,
            dataKeys: Object.keys(data).length,
            isUpdate: true
          },
          'SharedContext 已更新到数据库'
        );
      } else {
        // 插入新记录
        await this.db
          .insertInto('shared_contexts')
          .values({
            id: `ctx_${rootTaskId}`,
            root_task_id: rootTaskId,
            data: JSON.stringify(data),
            created_at: now,
            updated_at: now,
            version: 1
          })
          .execute();

        this.log.debug(
          {
            rootTaskId,
            dataKeys: Object.keys(data).length,
            isUpdate: false
          },
          'SharedContext 已保存到数据库'
        );
      }
    } catch (error) {
      this.log.error(
        {
          rootTaskId,
          error,
          dataKeys: Object.keys(data).length
        },
        'SharedContext 保存失败'
      );
      throw error;
    }
  }

  /**
   * 从数据库加载共享上下文
   */
  async loadContext(rootTaskId: string): Promise<SharedContextData | null> {
    try {
      const record = await this.db
        .selectFrom('shared_contexts')
        .select(['data', 'created_at', 'updated_at'])
        .where('root_task_id', '=', rootTaskId)
        .executeTakeFirst();

      if (record) {
        const contextData = record.data as SharedContextData;

        this.log.debug(
          {
            rootTaskId,
            dataKeys: Object.keys(contextData).length,
            createdAt: record.created_at,
            updatedAt: record.updated_at
          },
          'SharedContext 已从数据库加载'
        );

        return contextData;
      }

      this.log.debug(
        {
          rootTaskId
        },
        'SharedContext 在数据库中不存在'
      );

      return null;
    } catch (error) {
      this.log.error(
        {
          rootTaskId,
          error
        },
        'SharedContext 加载失败'
      );
      throw error;
    }
  }

  /**
   * 从数据库删除共享上下文
   */
  async deleteContext(rootTaskId: string): Promise<void> {
    try {
      const result = await this.db
        .deleteFrom('shared_contexts')
        .where('root_task_id', '=', rootTaskId)
        .execute();

      const existed = result.length > 0;

      this.log.debug(
        {
          rootTaskId,
          existed
        },
        'SharedContext 已从数据库删除'
      );
    } catch (error) {
      this.log.error(
        {
          rootTaskId,
          error
        },
        'SharedContext 删除失败'
      );
      throw error;
    }
  }

  /**
   * 检查共享上下文是否存在
   */
  async existsContext(rootTaskId: string): Promise<boolean> {
    try {
      const record = await this.db
        .selectFrom('shared_contexts')
        .select(['id'])
        .where('root_task_id', '=', rootTaskId)
        .executeTakeFirst();

      const exists = !!record;

      this.log.debug(
        {
          rootTaskId,
          exists
        },
        'SharedContext 存在性检查完成'
      );

      return exists;
    } catch (error) {
      this.log.error(
        {
          rootTaskId,
          error
        },
        'SharedContext 存在性检查失败'
      );
      throw error;
    }
  }

  /**
   * 获取所有共享上下文的根任务ID
   */
  async getAllRootTaskIds(): Promise<string[]> {
    try {
      const records = await this.db
        .selectFrom('shared_contexts')
        .select(['root_task_id'])
        .execute();

      const rootTaskIds = records.map((record) => record.root_task_id);

      this.log.debug(
        {
          count: rootTaskIds.length
        },
        '获取所有 SharedContext 根任务ID'
      );

      return rootTaskIds;
    } catch (error) {
      this.log.error(
        {
          error
        },
        '获取所有 SharedContext 根任务ID 失败'
      );
      throw error;
    }
  }

  /**
   * 清理过期的共享上下文
   */
  async cleanupExpiredContexts(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.db
        .deleteFrom('shared_contexts')
        .where('updated_at', '<', cutoffDate)
        .execute();

      const cleanedCount = result.length;

      this.log.info(
        {
          cleanedCount,
          olderThanDays,
          cutoffDate
        },
        'SharedContext 过期数据清理完成'
      );

      return cleanedCount;
    } catch (error) {
      this.log.error(
        {
          olderThanDays,
          error
        },
        'SharedContext 过期数据清理失败'
      );
      throw error;
    }
  }

  /**
   * 获取仓储统计信息
   */
  async getStats(): Promise<{
    totalContexts: number;
    oldestContext?: {
      rootTaskId: string;
      createdAt: Date;
    };
    newestContext?: {
      rootTaskId: string;
      updatedAt: Date;
    };
  }> {
    try {
      const countResult = await this.db
        .selectFrom('shared_contexts')
        .select(({ fn }) => [
          fn.count<number>('id').as('total'),
          fn.min('created_at').as('oldest_created'),
          fn.max('updated_at').as('newest_updated')
        ])
        .executeTakeFirst();

      const oldestRecord = await this.db
        .selectFrom('shared_contexts')
        .select(['root_task_id', 'created_at'])
        .orderBy('created_at', 'asc')
        .limit(1)
        .executeTakeFirst();

      const newestRecord = await this.db
        .selectFrom('shared_contexts')
        .select(['root_task_id', 'updated_at'])
        .orderBy('updated_at', 'desc')
        .limit(1)
        .executeTakeFirst();

      return {
        totalContexts: countResult?.total || 0,
        oldestContext: oldestRecord
          ? {
              rootTaskId: oldestRecord.root_task_id,
              createdAt: oldestRecord.created_at
            }
          : undefined,
        newestContext: newestRecord
          ? {
              rootTaskId: newestRecord.root_task_id,
              updatedAt: newestRecord.updated_at
            }
          : undefined
      };
    } catch (error) {
      this.log.error({ error }, '获取 SharedContext 统计信息失败');
      throw error;
    }
  }

  /**
   * 转换为JSON格式（用于调试）
   */
  async toJSON(): Promise<{
    totalContexts: number;
    contexts: Array<{
      rootTaskId: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }> {
    try {
      const records = await this.db
        .selectFrom('shared_contexts')
        .select(['root_task_id', 'created_at', 'updated_at'])
        .execute();

      const contexts = records.map((record) => ({
        rootTaskId: record.root_task_id,
        createdAt: record.created_at,
        updatedAt: record.updated_at
      }));

      return {
        totalContexts: contexts.length,
        contexts
      };
    } catch (error) {
      this.log.error({ error }, '转换 SharedContext 为JSON失败');
      throw error;
    }
  }
}
