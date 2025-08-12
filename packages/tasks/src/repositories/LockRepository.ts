/**
 * 分布式锁仓储层
 *
 * 负责工作流锁的数据访问操作，遵循Stratix框架的Repository层规范
 */

import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { BaseRepository, QueryError, sql } from '@stratix/database';
import type {
  NewWorkflowLock,
  TasksDatabase,
  WorkflowLock,
  WorkflowLockUpdate
} from '../types/database.js';

/**
 * 锁记录接口
 */
export interface LockRecord {
  id: number;
  lock_key: string;
  owner: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * 新建锁记录接口
 */
export interface NewLockRecord {
  lock_key: string;
  owner: string;
  expires_at: Date;
}

/**
 * 锁记录更新接口
 */
export interface LockRecordUpdate {
  owner?: string;
  expires_at?: Date;
  updated_at?: Date;
}

/**
 * 锁仓储接口
 */
export interface ILockRepository {
  /**
   * 尝试获取锁（原子操作）
   */
  acquireLock(
    key: string,
    owner: string,
    expiresAt: Date,
    lockType?: 'workflow' | 'node' | 'resource',
    lockData?: any
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 释放锁
   */
  releaseLock(key: string, owner?: string): Promise<DatabaseResult<boolean>>;

  /**
   * 检查锁是否存在
   */
  hasLock(key: string, owner?: string): Promise<DatabaseResult<boolean>>;

  /**
   * 获取锁详细信息
   */
  checkLock(key: string): Promise<DatabaseResult<WorkflowLock | null>>;

  /**
   * 强制释放锁（不检查owner）
   */
  forceReleaseLock(key: string): Promise<DatabaseResult<boolean>>;

  /**
   * 续约锁
   */
  renewLock(
    key: string,
    owner: string,
    newExpiresAt: Date,
    lockData?: any
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 根据锁类型查找锁
   */
  findByLockType(
    lockType: 'workflow' | 'node' | 'resource'
  ): Promise<DatabaseResult<WorkflowLock[]>>;

  /**
   * 根据拥有者查找锁
   */
  findByOwner(owner: string): Promise<DatabaseResult<WorkflowLock[]>>;

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): Promise<DatabaseResult<number>>;

  /**
   * 释放特定拥有者的所有锁
   */
  releaseAllLocksForOwner(
    ownerPattern: string
  ): Promise<DatabaseResult<number>>;

  /**
   * 获取锁统计信息
   */
  getStatistics(): Promise<
    DatabaseResult<{
      totalLocks: number;
      workflowLocks: number;
      nodeLocks: number;
      resourceLocks: number;
      expiredLocks: number;
    }>
  >;
}

/**
 * 锁仓储实现
 *
 * 继承BaseRepository，使用原生SQL实现高性能的分布式锁操作
 */
export default class LockRepository
  extends BaseRepository<
    TasksDatabase,
    'workflow_locks',
    WorkflowLock,
    NewWorkflowLock,
    WorkflowLockUpdate
  >
  implements ILockRepository
{
  protected readonly tableName = 'workflow_locks' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  /**
   * 尝试获取锁（原子操作）
   * 使用MySQL的INSERT ... ON DUPLICATE KEY UPDATE实现
   */
  async acquireLock(
    key: string,
    owner: string,
    expiresAt: Date,
    lockType: 'workflow' | 'node' | 'resource' = 'workflow',
    lockData?: any
  ): Promise<DatabaseResult<boolean>> {
    try {
      // 首先清理过期锁
      await this.cleanupExpiredLocks();

      // 尝试插入新锁记录，如果键已存在且未过期则失败
      const lockDataJson = lockData ? JSON.stringify(lockData) : null;
      const insertResult = await this.databaseApi.executeQuery(async (db) => {
        return await sql`
          INSERT INTO ${sql.table(this.tableName)} (lock_key, owner, lock_type, expires_at, lock_data, created_at, updated_at)
          VALUES (${key}, ${owner}, ${lockType}, ${expiresAt}, ${lockDataJson}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            owner = CASE
              WHEN expires_at < NOW() THEN VALUES(owner)
              ELSE owner
            END,
            lock_type = CASE
              WHEN expires_at < NOW() THEN VALUES(lock_type)
              ELSE lock_type
            END,
            expires_at = CASE
              WHEN expires_at < NOW() THEN VALUES(expires_at)
              ELSE expires_at
            END,
            lock_data = CASE
              WHEN expires_at < NOW() THEN VALUES(lock_data)
              ELSE lock_data
            END,
            updated_at = CASE
              WHEN expires_at < NOW() THEN NOW()
              ELSE updated_at
            END
        `.execute(db);
      });

      if (!insertResult.success) {
        this.logger.error('获取数据库锁失败', {
          key,
          error: insertResult.error
        });
        return { success: false, error: insertResult.error };
      }

      // 检查是否成功获取锁
      const checkResult = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom(this.tableName)
          .select('owner')
          .where('lock_key', '=', key)
          .where('owner', '=', owner)
          .where('expires_at', '>', new Date())
          .execute();
      });

      if (!checkResult.success) {
        return { success: false, error: checkResult.error };
      }

      const acquired = checkResult.data && checkResult.data.length > 0;

      if (acquired) {
        this.logger.debug('获取数据库锁成功', { key, owner, expiresAt });
      } else {
        this.logger.debug('获取数据库锁失败，锁已被其他进程持有', { key });
      }

      return { success: true, data: acquired };
    } catch (error) {
      this.logger.error('获取数据库锁异常', { key, error });
      return {
        success: false,
        error: new QueryError(
          '获取数据库锁异常',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }

  /**
   * 释放锁
   */
  async releaseLock(
    key: string,
    owner?: string
  ): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        let query = db.deleteFrom(this.tableName).where('lock_key', '=', key);

        if (owner) {
          // 只有锁的拥有者才能释放
          query = query.where('owner', '=', owner);
        }

        return await query.execute();
      });

      if (!result.success) {
        this.logger.error('释放数据库锁失败', { key, error: result.error });
        return { success: false, error: result.error };
      }

      const released = Boolean(
        result.data &&
          result.data[0]?.numDeletedRows &&
          Number(result.data[0].numDeletedRows) > 0
      );

      if (released) {
        this.logger.debug('释放数据库锁成功', { key, owner });
      } else {
        this.logger.debug('释放数据库锁失败，锁不存在或拥有者不匹配', {
          key,
          owner
        });
      }

      return { success: true, data: released };
    } catch (error) {
      this.logger.error('释放数据库锁异常', { key, error });
      return {
        success: false,
        error: new QueryError(
          '释放数据库锁异常',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }

  /**
   * 检查锁是否存在
   */
  async hasLock(key: string, owner?: string): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        let query = db
          .selectFrom(this.tableName)
          .select(sql`1`.as('exists'))
          .where('lock_key', '=', key)
          .where('expires_at', '>', new Date());

        if (owner) {
          query = query.where('owner', '=', owner);
        }

        return await query.execute();
      });

      if (!result.success) {
        this.logger.error('检查数据库锁状态失败', { key, error: result.error });
        return { success: false, error: result.error };
      }

      const hasLock = result.data && result.data.length > 0;
      return { success: true, data: hasLock };
    } catch (error) {
      this.logger.error('检查数据库锁状态异常', { key, error });
      return {
        success: false,
        error: new QueryError(
          '检查数据库锁状态异常',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }

  /**
   * 获取锁详细信息
   */
  async checkLock(key: string): Promise<DatabaseResult<WorkflowLock | null>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('lock_key', '=', key)
          .executeTakeFirst();
      });

      if (!result.success) {
        this.logger.error('获取锁详细信息失败', { key, error: result.error });
        return { success: false, error: result.error };
      }

      if (!result.data) {
        return { success: true, data: null };
      }

      const lockData = result.data;
      const lock: WorkflowLock = {
        id: lockData.id,
        lock_key: lockData.lock_key,
        owner: lockData.owner,
        lock_type: lockData.lock_type,
        expires_at: lockData.expires_at,
        lock_data: lockData.lock_data,
        created_at: lockData.created_at,
        updated_at: lockData.updated_at
      };

      return { success: true, data: lock };
    } catch (error) {
      this.logger.error('获取锁详细信息异常', { key, error });
      return {
        success: false,
        error: new QueryError(
          '获取锁详细信息异常',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }

  /**
   * 强制释放锁（不检查owner）
   */
  async forceReleaseLock(key: string): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .deleteFrom(this.tableName)
          .where('lock_key', '=', key)
          .executeTakeFirst();
      });

      if (!result.success) {
        this.logger.error('强制释放锁失败', { key, error: result.error });
        return { success: false, error: result.error };
      }

      const deleted = result.data.numDeletedRows > 0;
      return { success: true, data: deleted };
    } catch (error) {
      this.logger.error('强制释放锁异常', { key, error });
      return {
        success: false,
        error: new QueryError(
          '强制释放锁异常',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }

  /**
   * 续约锁
   */
  async renewLock(
    key: string,
    owner: string,
    newExpiresAt: Date,
    lockData?: any
  ): Promise<DatabaseResult<boolean>> {
    try {
      const updateData: any = {
        expires_at: newExpiresAt,
        updated_at: new Date()
      };

      if (lockData !== undefined) {
        updateData.lock_data = lockData;
      }

      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .updateTable(this.tableName)
          .set(updateData)
          .where('lock_key', '=', key)
          .where('owner', '=', owner)
          .where('expires_at', '>', new Date())
          .execute();
      });

      if (!result.success) {
        this.logger.error('续约数据库锁失败', { key, error: result.error });
        return { success: false, error: result.error };
      }

      const renewed = Boolean(
        result.data &&
          result.data[0]?.numUpdatedRows &&
          Number(result.data[0].numUpdatedRows) > 0
      );

      if (renewed) {
        this.logger.debug('续约数据库锁成功', { key, owner, newExpiresAt });
      } else {
        this.logger.debug('续约数据库锁失败', { key, owner });
      }

      return { success: true, data: renewed };
    } catch (error) {
      this.logger.error('续约数据库锁异常', { key, error });
      return {
        success: false,
        error: new QueryError(
          '续约数据库锁异常',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }

  /**
   * 清理过期锁
   */
  async cleanupExpiredLocks(): Promise<DatabaseResult<number>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .deleteFrom(this.tableName)
          .where('expires_at', '<', new Date())
          .execute();
      });

      if (!result.success) {
        this.logger.error('清理过期锁失败', { error: result.error });
        return { success: false, error: result.error };
      }

      const deletedCount = Number(result.data?.[0]?.numDeletedRows) || 0;
      if (deletedCount > 0) {
        this.logger.debug('清理过期锁', { deletedCount });
      }

      return { success: true, data: deletedCount };
    } catch (error) {
      this.logger.error('清理过期锁异常', { error });
      return {
        success: false,
        error: new QueryError(
          '清理过期锁异常',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }

  /**
   * 释放特定拥有者的所有锁
   */
  async releaseAllLocksForOwner(
    ownerPattern: string
  ): Promise<DatabaseResult<number>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .deleteFrom(this.tableName)
          .where('owner', 'like', ownerPattern)
          .execute();
      });

      if (!result.success) {
        this.logger.error('释放服务所有锁失败', {
          ownerPattern,
          error: result.error
        });
        return { success: false, error: result.error };
      }

      const deletedCount = Number(result.data?.[0]?.numDeletedRows) || 0;
      if (deletedCount > 0) {
        this.logger.info('释放服务所有锁', { ownerPattern, deletedCount });
      }

      return { success: true, data: deletedCount };
    } catch (error) {
      this.logger.error('释放服务所有锁异常', { ownerPattern, error });
      return {
        success: false,
        error: new QueryError(
          '释放服务所有锁异常',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }

  async findByLockType(
    lockType: 'workflow' | 'node' | 'resource'
  ): Promise<DatabaseResult<WorkflowLock[]>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('lock_type', '=', lockType)
          .where('expires_at', '>', new Date())
          .orderBy('created_at', 'desc')
          .execute();
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data as WorkflowLock[] };
    } catch (error) {
      return {
        success: false,
        error: new QueryError(
          '查询锁类型失败',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }

  async findByOwner(owner: string): Promise<DatabaseResult<WorkflowLock[]>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom(this.tableName)
          .selectAll()
          .where('owner', '=', owner)
          .where('expires_at', '>', new Date())
          .orderBy('created_at', 'desc')
          .execute();
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data as WorkflowLock[] };
    } catch (error) {
      return {
        success: false,
        error: new QueryError(
          '查询拥有者锁失败',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }

  async getStatistics(): Promise<
    DatabaseResult<{
      totalLocks: number;
      workflowLocks: number;
      nodeLocks: number;
      resourceLocks: number;
      expiredLocks: number;
    }>
  > {
    try {
      const now = new Date();

      const totalResult = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom(this.tableName)
          .select(db.fn.count('id').as('count'))
          .where('expires_at', '>', now)
          .execute();
      });

      const workflowResult = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom(this.tableName)
          .select(db.fn.count('id').as('count'))
          .where('lock_type', '=', 'workflow')
          .where('expires_at', '>', now)
          .execute();
      });

      const nodeResult = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom(this.tableName)
          .select(db.fn.count('id').as('count'))
          .where('lock_type', '=', 'node')
          .where('expires_at', '>', now)
          .execute();
      });

      const resourceResult = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom(this.tableName)
          .select(db.fn.count('id').as('count'))
          .where('lock_type', '=', 'resource')
          .where('expires_at', '>', now)
          .execute();
      });

      const expiredResult = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom(this.tableName)
          .select(db.fn.count('id').as('count'))
          .where('expires_at', '<=', now)
          .execute();
      });

      return {
        success: true,
        data: {
          totalLocks: totalResult.success
            ? Number(totalResult.data?.[0]?.count) || 0
            : 0,
          workflowLocks: workflowResult.success
            ? Number(workflowResult.data?.[0]?.count) || 0
            : 0,
          nodeLocks: nodeResult.success
            ? Number(nodeResult.data?.[0]?.count) || 0
            : 0,
          resourceLocks: resourceResult.success
            ? Number(resourceResult.data?.[0]?.count) || 0
            : 0,
          expiredLocks: expiredResult.success
            ? Number(expiredResult.data?.[0]?.count) || 0
            : 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: new QueryError(
          '获取锁统计信息失败',
          undefined,
          undefined,
          error instanceof Error ? error : new Error(String(error))
        ) as any
      };
    }
  }
}
