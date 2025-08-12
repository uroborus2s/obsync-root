/**
 * 分布式锁管理器
 *
 * 负责管理工作流和节点的分布式锁，防止重复执行
 */

import type { Logger } from '@stratix/core';
import type { ILockRepository } from '../repositories/LockRepository.js';
import type { DistributedLock } from '../types/distributed.js';

/**
 * 锁续期信息接口
 */
export interface LockRenewalInfo {
  lockKey: string;
  owner: string;
  lockType: 'workflow' | 'node' | 'resource';
  renewalInterval: number;
  maxRenewalCount: number | undefined;
  currentRenewalCount: number;
  lastRenewalAt: Date;
  expiresAt: Date;
}

/**
 * 分布式锁管理器接口
 */
export interface IDistributedLockManager {
  /**
   * 获取锁
   */
  acquireLock(
    lockKey: string,
    owner: string,
    lockType: 'workflow' | 'node' | 'resource',
    timeoutMs: number,
    lockData?: Record<string, any>
  ): Promise<boolean>;

  /**
   * 释放锁
   */
  releaseLock(lockKey: string, owner: string): Promise<boolean>;

  /**
   * 续期锁
   */
  renewLock(
    lockKey: string,
    owner: string,
    timeoutMs: number
  ): Promise<boolean>;

  /**
   * 检查锁状态
   */
  checkLock(lockKey: string): Promise<DistributedLock | null>;

  /**
   * 强制释放锁（用于故障恢复）
   */
  forceReleaseLock(lockKey: string): Promise<boolean>;

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): Promise<number>;

  /**
   * 启用自动续期
   */
  enableAutoRenewal(
    lockKey: string,
    owner: string,
    lockType: 'workflow' | 'node' | 'resource',
    renewalInterval: number,
    maxRenewalCount?: number
  ): Promise<boolean>;

  /**
   * 禁用自动续期
   */
  disableAutoRenewal(lockKey: string, owner: string): Promise<boolean>;

  /**
   * 获取续期状态
   */
  getRenewalStatus(lockKey: string): LockRenewalInfo | null;
}

/**
 * 基于数据库的分布式锁管理器实现
 */
export default class DistributedLockManager implements IDistributedLockManager {
  private readonly renewalTimers = new Map<string, NodeJS.Timeout>();
  private readonly renewalInfo = new Map<string, LockRenewalInfo>();
  private readonly defaultRenewalInterval = 30000; // 30秒

  constructor(
    private readonly lockRepository: ILockRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取锁
   */
  async acquireLock(
    lockKey: string,
    owner: string,
    lockType: 'workflow' | 'node' | 'resource',
    timeoutMs: number,
    // @ts-ignore - 为未来功能预留
    lockData?: Record<string, any>
  ): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + timeoutMs);

      // 使用Repository层获取锁
      const result = await this.lockRepository.acquireLock(
        lockKey,
        owner,
        expiresAt,
        lockType,
        lockData
      );

      if (!result.success) {
        this.logger.error(`获取锁失败: ${lockKey}`, {
          owner,
          error: result.error
        });
        return false;
      }

      const lockAcquired = result.data;
      if (lockAcquired) {
        this.logger.debug(`成功获取锁: ${lockKey}`, {
          owner,
          lockType,
          timeoutMs
        });
      } else {
        this.logger.debug(`获取锁失败: ${lockKey}`, {
          owner,
          lockType,
          reason: 'lock_already_held'
        });
      }

      return lockAcquired;
    } catch (error) {
      this.logger.error(`获取锁异常: ${lockKey}`, {
        owner,
        lockType,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 释放锁
   */
  async releaseLock(lockKey: string, owner: string): Promise<boolean> {
    try {
      const result = await this.lockRepository.releaseLock(lockKey, owner);

      if (!result.success) {
        this.logger.error(`释放锁失败: ${lockKey}`, {
          owner,
          error: result.error
        });
        return false;
      }

      const success = result.data;

      if (success) {
        this.logger.debug(`成功释放锁: ${lockKey}`, { owner });
      } else {
        this.logger.warn(`释放锁失败: ${lockKey}`, {
          owner,
          reason: 'lock_not_found_or_not_owner'
        });
      }

      return success;
    } catch (error) {
      this.logger.error(`释放锁异常: ${lockKey}`, {
        owner,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 续期锁
   */
  async renewLock(
    lockKey: string,
    owner: string,
    timeoutMs: number
  ): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + timeoutMs);

      const result = await this.lockRepository.renewLock(
        lockKey,
        owner,
        expiresAt
      );

      if (!result.success) {
        this.logger.error(`续期锁失败: ${lockKey}`, {
          owner,
          error: result.error
        });
        return false;
      }

      const success = result.data;

      if (success) {
        this.logger.debug(`成功续期锁: ${lockKey}`, { owner, timeoutMs });
      } else {
        this.logger.warn(`续期锁失败: ${lockKey}`, {
          owner,
          reason: 'lock_not_found_or_not_owner'
        });
      }

      return success;
    } catch (error) {
      this.logger.error(`续期锁异常: ${lockKey}`, {
        owner,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 检查锁状态
   */
  async checkLock(lockKey: string): Promise<DistributedLock | null> {
    try {
      const result = await this.lockRepository.checkLock(lockKey);

      if (!result.success) {
        this.logger.error(`检查锁状态失败: ${lockKey}`, {
          error: result.error
        });
        return null;
      }

      const lock = result.data;
      if (!lock) {
        return null;
      }

      return {
        lockKey: lock.lock_key,
        owner: lock.owner,
        lockType: lock.lock_type as 'workflow' | 'node' | 'resource',
        expiresAt: new Date(lock.expires_at),
        createdAt: new Date(lock.created_at),
        lockData: lock.lock_data
      };
    } catch (error) {
      this.logger.error(`检查锁状态异常: ${lockKey}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * 强制释放锁（用于故障恢复）
   */
  async forceReleaseLock(lockKey: string): Promise<boolean> {
    try {
      const result = await this.lockRepository.forceReleaseLock(lockKey);

      if (!result.success) {
        this.logger.error(`强制释放锁失败: ${lockKey}`, {
          error: result.error
        });
        return false;
      }

      const success = result.data;

      this.logger.info(`强制释放锁: ${lockKey}`, { success });

      return success;
    } catch (error) {
      this.logger.error(`强制释放锁异常: ${lockKey}`, {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 清理过期锁
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await this.lockRepository.cleanupExpiredLocks();

      if (!result.success) {
        this.logger.error('清理过期锁失败', {
          error: result.error
        });
        return 0;
      }

      const cleanedCount = result.data;

      if (cleanedCount > 0) {
        this.logger.info(`清理过期锁完成`, { cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error('清理过期锁异常', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * 启用自动续期
   */
  async enableAutoRenewal(
    lockKey: string,
    owner: string,
    lockType: 'workflow' | 'node' | 'resource',
    renewalInterval: number = this.defaultRenewalInterval,
    maxRenewalCount?: number
  ): Promise<boolean> {
    try {
      // 检查锁是否存在且属于当前owner
      const lockCheck = await this.checkLock(lockKey);
      if (!lockCheck || lockCheck.owner !== owner) {
        this.logger.warn('无法启用自动续期，锁不存在或不属于当前owner', {
          lockKey,
          owner,
          currentOwner: lockCheck?.owner
        });
        return false;
      }

      // 如果已经存在续期任务，先清理
      await this.disableAutoRenewal(lockKey, owner);

      // 创建续期信息
      const renewalInfo: LockRenewalInfo = {
        lockKey,
        owner,
        lockType,
        renewalInterval,
        maxRenewalCount,
        currentRenewalCount: 0,
        lastRenewalAt: new Date(),
        expiresAt: lockCheck.expiresAt
      };

      this.renewalInfo.set(lockKey, renewalInfo);

      // 启动续期定时器
      const timer = setInterval(async () => {
        await this.performRenewal(lockKey);
      }, renewalInterval);

      this.renewalTimers.set(lockKey, timer);

      this.logger.info('启用自动锁续期', {
        lockKey,
        owner,
        renewalInterval,
        maxRenewalCount
      });

      return true;
    } catch (error) {
      this.logger.error('启用自动续期失败', {
        lockKey,
        owner,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 禁用自动续期
   */
  async disableAutoRenewal(lockKey: string, owner: string): Promise<boolean> {
    try {
      const timer = this.renewalTimers.get(lockKey);
      if (timer) {
        clearInterval(timer);
        this.renewalTimers.delete(lockKey);
      }

      const renewalInfo = this.renewalInfo.get(lockKey);
      if (renewalInfo && renewalInfo.owner === owner) {
        this.renewalInfo.delete(lockKey);
        this.logger.info('禁用自动锁续期', { lockKey, owner });
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('禁用自动续期失败', {
        lockKey,
        owner,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 获取续期状态
   */
  getRenewalStatus(lockKey: string): LockRenewalInfo | null {
    return this.renewalInfo.get(lockKey) || null;
  }

  /**
   * 执行锁续期
   */
  private async performRenewal(lockKey: string): Promise<void> {
    const renewalInfo = this.renewalInfo.get(lockKey);
    if (!renewalInfo) {
      return;
    }

    try {
      // 检查是否达到最大续期次数
      if (
        renewalInfo.maxRenewalCount &&
        renewalInfo.currentRenewalCount >= renewalInfo.maxRenewalCount
      ) {
        this.logger.info('达到最大续期次数，停止自动续期', {
          lockKey: renewalInfo.lockKey,
          maxRenewalCount: renewalInfo.maxRenewalCount
        });
        await this.disableAutoRenewal(renewalInfo.lockKey, renewalInfo.owner);
        return;
      }

      // 执行续期
      const newTimeoutMs = renewalInfo.renewalInterval * 3; // 续期时间为间隔的3倍
      const success = await this.renewLock(
        renewalInfo.lockKey,
        renewalInfo.owner,
        newTimeoutMs
      );

      if (success) {
        renewalInfo.currentRenewalCount++;
        renewalInfo.lastRenewalAt = new Date();
        renewalInfo.expiresAt = new Date(Date.now() + newTimeoutMs);

        this.logger.debug('锁续期成功', {
          lockKey: renewalInfo.lockKey,
          owner: renewalInfo.owner,
          renewalCount: renewalInfo.currentRenewalCount,
          newExpiresAt: renewalInfo.expiresAt
        });
      } else {
        this.logger.warn('锁续期失败，可能锁已被释放或过期', {
          lockKey: renewalInfo.lockKey,
          owner: renewalInfo.owner
        });
        // 续期失败，停止自动续期
        await this.disableAutoRenewal(renewalInfo.lockKey, renewalInfo.owner);
      }
    } catch (error) {
      this.logger.error('执行锁续期异常', {
        lockKey: renewalInfo.lockKey,
        owner: renewalInfo.owner,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
