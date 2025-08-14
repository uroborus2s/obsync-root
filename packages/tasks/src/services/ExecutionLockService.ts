/**
 * 执行锁服务实现
 *
 * 实现工作流执行锁的业务逻辑
 * 版本: v3.0.0-refactored
 */

import type { AwilixContainer, Logger } from '@stratix/core';
import { RESOLVER } from '@stratix/core';
import type {
  IExecutionLockRepository,
  IExecutionLockService
} from '../interfaces/index.js';
import type { ServiceResult } from '../types/business.js';

/**
 * 执行锁服务实现
 */
export default class ExecutionLockService implements IExecutionLockService {
  /**
   * Stratix框架依赖注入配置
   */
  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      return {
        executionLockRepository: container.resolve('executionLockRepository'),
        logger: container.resolve('logger')
      };
    }
  };

  constructor(
    private readonly executionLockRepository: IExecutionLockRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取工作流执行锁
   */
  async acquireWorkflowLock(
    instanceId: number,
    owner: string,
    timeoutMs: number = 300000
  ): Promise<ServiceResult<boolean>> {
    try {
      const lockKey = `workflow:${instanceId}`;
      const expiresAt = new Date(Date.now() + timeoutMs);

      this.logger.info('Acquiring workflow lock', {
        instanceId,
        owner,
        timeoutMs
      });

      const result = await this.executionLockRepository.acquireLock(
        lockKey,
        owner,
        expiresAt,
        'workflow',
        { instanceId, acquiredAt: new Date() }
      );

      if (result.success) {
        this.logger.info('Workflow lock acquired successfully', {
          instanceId,
          owner
        });
      } else {
        this.logger.warn('Failed to acquire workflow lock', {
          instanceId,
          owner,
          error: result.error
        });
      }

      return {
        success: result.success,
        error: result.success
          ? undefined
          : result.error?.message || 'Failed to acquire workflow lock'
      };
    } catch (error) {
      this.logger.error('Error acquiring workflow lock', {
        error,
        instanceId,
        owner
      });
      return {
        success: false,
        error: 'Error acquiring workflow lock',
        errorDetails: error
      };
    }
  }

  /**
   * 释放工作流执行锁
   */
  async releaseWorkflowLock(
    instanceId: number,
    owner: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const lockKey = `workflow:${instanceId}`;

      this.logger.info('Releasing workflow lock', { instanceId, owner });

      const result = await this.executionLockRepository.releaseLock(
        lockKey,
        owner
      );

      if (result.success) {
        this.logger.info('Workflow lock released successfully', {
          instanceId,
          owner
        });
      } else {
        this.logger.warn('Failed to release workflow lock', {
          instanceId,
          owner,
          error: result.error
        });
      }

      return {
        success: result.success,
        error: result.success
          ? undefined
          : result.error?.message || 'Failed to release workflow lock'
      };
    } catch (error) {
      this.logger.error('Error releasing workflow lock', {
        error,
        instanceId,
        owner
      });
      return {
        success: false,
        error: 'Error releasing workflow lock',
        errorDetails: error
      };
    }
  }

  /**
   * 续期工作流执行锁
   */
  async renewWorkflowLock(
    instanceId: number,
    owner: string,
    timeoutMs: number = 300000
  ): Promise<ServiceResult<boolean>> {
    try {
      const lockKey = `workflow:${instanceId}`;
      const expiresAt = new Date(Date.now() + timeoutMs);

      this.logger.info('Renewing workflow lock', {
        instanceId,
        owner,
        timeoutMs
      });

      const result = await this.executionLockRepository.renewLock(
        lockKey,
        owner,
        expiresAt
      );

      if (result.success) {
        this.logger.info('Workflow lock renewed successfully', {
          instanceId,
          owner
        });
      } else {
        this.logger.warn('Failed to renew workflow lock', {
          instanceId,
          owner,
          error: result.error
        });
      }

      return {
        success: result.success,
        error: result.success
          ? undefined
          : result.error?.message || 'Failed to renew workflow lock'
      };
    } catch (error) {
      this.logger.error('Error renewing workflow lock', {
        error,
        instanceId,
        owner
      });
      return {
        success: false,
        error: 'Error renewing workflow lock',
        errorDetails: error
      };
    }
  }

  /**
   * 清理过期锁
   */
  async cleanupExpiredLocks(): Promise<ServiceResult<number>> {
    try {
      this.logger.info('Cleaning up expired locks');

      const result = await this.executionLockRepository.cleanupExpiredLocks();

      if (result.success) {
        this.logger.info('Expired locks cleaned up successfully', {
          deletedCount: result.data
        });
      } else {
        this.logger.warn('Failed to cleanup expired locks', {
          error: result.error
        });
      }

      return {
        success: result.success,
        data: result.success ? result.data : 0,
        error: result.success
          ? undefined
          : result.error?.message || 'Failed to cleanup expired locks'
      };
    } catch (error) {
      this.logger.error('Error cleaning up expired locks', { error });
      return {
        success: false,
        error: 'Error cleaning up expired locks',
        errorDetails: error
      };
    }
  }

  /**
   * 检查工作流锁状态
   */
  async checkWorkflowLock(
    instanceId: number
  ): Promise<
    ServiceResult<{ locked: boolean; owner?: string; expiresAt?: Date }>
  > {
    try {
      const lockKey = `workflow:${instanceId}`;

      const result = await this.executionLockRepository.checkLock(lockKey);
      if (!result.success) {
        return {
          success: false,
          error: result.error?.message || 'Failed to check lock'
        };
      }

      const lock = result.data;
      if (!lock) {
        return {
          success: true,
          data: { locked: false }
        };
      }

      // 检查锁是否过期
      const isExpired = lock.expires_at <= new Date();
      if (isExpired) {
        // 清理过期锁
        await this.executionLockRepository.forceReleaseLock(lockKey);
        return {
          success: true,
          data: { locked: false }
        };
      }

      return {
        success: true,
        data: {
          locked: true,
          owner: lock.owner,
          expiresAt: lock.expires_at
        }
      };
    } catch (error) {
      this.logger.error('Error checking workflow lock', { error, instanceId });
      return {
        success: false,
        error: 'Error checking workflow lock',
        errorDetails: error
      };
    }
  }

  /**
   * 强制释放工作流锁
   */
  async forceReleaseWorkflowLock(
    instanceId: number
  ): Promise<ServiceResult<boolean>> {
    try {
      const lockKey = `workflow:${instanceId}`;

      this.logger.warn('Force releasing workflow lock', { instanceId });

      const result =
        await this.executionLockRepository.forceReleaseLock(lockKey);

      if (result.success) {
        this.logger.info('Workflow lock force released successfully', {
          instanceId
        });
      } else {
        this.logger.warn('Failed to force release workflow lock', {
          instanceId,
          error: result.error
        });
      }

      return {
        success: result.success,
        error: result.success
          ? undefined
          : result.error?.message || 'Failed to force release workflow lock'
      };
    } catch (error) {
      this.logger.error('Error force releasing workflow lock', {
        error,
        instanceId
      });
      return {
        success: false,
        error: 'Error force releasing workflow lock',
        errorDetails: error
      };
    }
  }

  /**
   * 获取指定拥有者的所有锁
   */
  async getLocksByOwner(owner: string): Promise<ServiceResult<any[]>> {
    try {
      const result = await this.executionLockRepository.getLocksByOwner(owner);
      if (!result.success) {
        return result as ServiceResult<any[]>;
      }

      const locks = result.data!.map((lock) => ({
        lockKey: lock.lock_key,
        lockType: lock.lock_type,
        owner: lock.owner,
        expiresAt: lock.expires_at,
        lockData: lock.lock_data,
        createdAt: lock.created_at
      }));

      return {
        success: true,
        data: locks
      };
    } catch (error) {
      this.logger.error('Error getting locks by owner', { error, owner });
      return {
        success: false,
        error: 'Error getting locks by owner',
        errorDetails: error
      };
    }
  }

  /**
   * 释放指定拥有者的所有锁
   */
  async releaseAllLocksByOwner(owner: string): Promise<ServiceResult<number>> {
    try {
      this.logger.info('Releasing all locks by owner', { owner });

      const result =
        await this.executionLockRepository.releaseAllLocksByOwner(owner);

      if (result.success) {
        this.logger.info('All locks released successfully', {
          owner,
          releasedCount: result.data
        });
      } else {
        this.logger.warn('Failed to release all locks', {
          owner,
          error: result.error
        });
      }

      return result;
    } catch (error) {
      this.logger.error('Error releasing all locks by owner', { error, owner });
      return {
        success: false,
        error: 'Error releasing all locks by owner',
        errorDetails: error
      };
    }
  }

  /**
   * 检查锁是否被指定拥有者持有
   */
  async isWorkflowLockOwnedBy(
    instanceId: number,
    owner: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const lockKey = `workflow:${instanceId}`;

      const result = await this.executionLockRepository.isLockOwnedBy(
        lockKey,
        owner
      );

      return result;
    } catch (error) {
      this.logger.error('Error checking lock ownership', {
        error,
        instanceId,
        owner
      });
      return {
        success: false,
        error: 'Error checking lock ownership',
        errorDetails: error
      };
    }
  }

  /**
   * 获取所有活跃锁的统计信息
   */
  async getLockStatistics(): Promise<
    ServiceResult<{
      totalLocks: number;
      workflowLocks: number;
      instanceLocks: number;
    }>
  > {
    try {
      const result = await this.executionLockRepository.getActiveLocks();
      if (!result.success) {
        return result as ServiceResult<any>;
      }

      const locks = result.data!;
      const stats = {
        totalLocks: locks.length,
        workflowLocks: locks.filter((lock) => lock.lock_type === 'workflow')
          .length,
        instanceLocks: locks.filter((lock) => lock.lock_type === 'instance')
          .length
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error('Error getting lock statistics', { error });
      return {
        success: false,
        error: 'Error getting lock statistics',
        errorDetails: error
      };
    }
  }
}
