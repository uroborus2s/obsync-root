/**
 * 执行锁仓储实现
 *
 * 继承BaseRepository，实现执行锁的数据访问
 * 版本: v3.0.0-refactored
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { DatabaseErrorHandler, QueryError } from '@stratix/database';
import type { IExecutionLockRepository } from '../interfaces/repositories.js';
import type {
  NewWorkflowExecutionLock,
  WorkflowExecutionLock,
  WorkflowExecutionLockUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 执行锁仓储实现
 */
class ExecutionLockRepository
  extends BaseTasksRepository<
    'workflow_execution_locks',
    WorkflowExecutionLock,
    NewWorkflowExecutionLock,
    WorkflowExecutionLockUpdate
  >
  implements IExecutionLockRepository
{
  protected readonly tableName = 'workflow_execution_locks' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super();
  }

  /**
   * 尝试获取锁
   */
  async acquireLock(
    lockKey: string,
    owner: string,
    expiresAt: Date,
    lockType: 'workflow' | 'instance' = 'workflow',
    lockData?: any
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      // 首先检查是否已存在锁
      const existingLock = await this.checkLock(lockKey);
      if (existingLock.success && existingLock.data) {
        // 检查锁是否过期
        if (existingLock.data.expires_at > new Date()) {
          // 锁未过期，获取失败
          throw QueryError.create(
            `Lock already exists and not expired: ${lockKey}`
          );
        } else {
          // 锁已过期，删除旧锁
          await this.forceReleaseLock(lockKey);
        }
      }

      // 创建新锁
      const newLock: NewWorkflowExecutionLock = {
        lock_key: lockKey,
        lock_type: lockType,
        owner,
        expires_at: expiresAt,
        lock_data: lockData || null
      };

      const result = await this.create(newLock);
      if (!result.success) {
        throw QueryError.create('Failed to create lock');
      }

      return true;
    }, 'acquireLock');
  }

  /**
   * 释放锁
   */
  async releaseLock(
    lockKey: string,
    owner: string
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb.where('lock_key', '=', lockKey).where('owner', '=', owner);

      const result = await this.deleteMany(whereExpression);
      if (!result.success) {
        throw QueryError.create(
          `Lock not found or not owned by ${owner}: ${lockKey}`
        );
      }

      const deleted = result.data > 0;
      if (!deleted) {
        throw QueryError.create(
          `Lock not found or not owned by ${owner}: ${lockKey}`
        );
      }

      return true;
    }, 'releaseLock');
  }

  /**
   * 续期锁
   */
  async renewLock(
    lockKey: string,
    owner: string,
    expiresAt: Date
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb.where('lock_key', '=', lockKey).where('owner', '=', owner);

      const updateData = {
        expires_at: expiresAt,
        updated_at: new Date()
      };

      const result = await this.updateMany(whereExpression, updateData);
      if (!result.success) {
        throw QueryError.create(
          `Lock not found or not owned by ${owner}: ${lockKey}`
        );
      }

      const updated = result.data > 0;
      if (!updated) {
        throw QueryError.create(
          `Lock not found or not owned by ${owner}: ${lockKey}`
        );
      }

      return true;
    }, 'renewLock');
  }

  /**
   * 检查锁是否存在
   */
  async checkLock(
    lockKey: string
  ): Promise<DatabaseResult<WorkflowExecutionLock | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) => qb.where('lock_key', '=', lockKey);
      const result = await this.findOneNullable(whereExpression);

      if (!result.success) {
        return null;
      }

      return result.data;
    }, 'checkLock');
  }

  /**
   * 清理过期锁
   */
  async cleanupExpiredLocks(): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb.where('expires_at', '<', new Date());
      const result = await this.deleteMany(whereExpression);

      if (!result.success) {
        throw QueryError.create('Failed to cleanup expired locks');
      }

      return result.data;
    }, 'cleanupExpiredLocks');
  }

  /**
   * 强制释放锁
   */
  async forceReleaseLock(lockKey: string): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) => qb.where('lock_key', '=', lockKey);
      const result = await this.deleteMany(whereExpression);

      if (!result.success) {
        return false;
      }

      return result.data > 0;
    }, 'forceReleaseLock');
  }

  /**
   * 获取所有活跃锁
   */
  async getActiveLocks(): Promise<DatabaseResult<WorkflowExecutionLock[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb.where('expires_at', '>', new Date());
      const options = {
        orderBy: [{ field: 'created_at', direction: 'desc' as const }]
      };
      const result = await this.findMany(whereExpression, options);

      if (!result.success) {
        throw QueryError.create('Failed to get active locks');
      }

      return result.data;
    }, 'getActiveLocks');
  }

  /**
   * 获取指定拥有者的所有锁
   */
  async getLocksByOwner(
    owner: string
  ): Promise<DatabaseResult<WorkflowExecutionLock[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) => qb.where('owner', '=', owner);
      const options = {
        orderBy: [{ field: 'created_at', direction: 'desc' as const }]
      };
      const result = await this.findMany(whereExpression, options);

      if (!result.success) {
        throw QueryError.create('Failed to get locks by owner');
      }

      return result.data;
    }, 'getLocksByOwner');
  }

  /**
   * 批量释放指定拥有者的所有锁
   */
  async releaseAllLocksByOwner(owner: string): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) => qb.where('owner', '=', owner);
      const result = await this.deleteMany(whereExpression);

      if (!result.success) {
        throw QueryError.create('Failed to release locks by owner');
      }

      return result.data;
    }, 'releaseAllLocksByOwner');
  }

  /**
   * 检查锁是否被指定拥有者持有
   */
  async isLockOwnedBy(
    lockKey: string,
    owner: string
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb
          .where('lock_key', '=', lockKey)
          .where('owner', '=', owner)
          .where('expires_at', '>', new Date());

      const result = await this.findOneNullable(whereExpression);

      if (!result.success) {
        return false;
      }

      return !!result.data;
    }, 'isLockOwnedBy');
  }
}

/**
 * 默认导出
 */
export default ExecutionLockRepository;
