/**
 * 数据库锁服务
 *
 * 基于数据库实现的分布式锁服务，使用LockRepository进行数据访问
 */

import { Logger } from '@stratix/core';
import { type ILockRepository } from '../repositories/LockRepository.js';

/**
 * 锁配置接口
 */
export interface LockOptions {
  /** 锁的过期时间（毫秒） */
  expirationMs?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 重试间隔（毫秒） */
  retryDelayMs?: number;
}

/**
 * 数据库锁服务
 *
 * 提供分布式锁功能，确保在多个进程/服务之间的互斥访问
 */
export default class DatabaseLockService {
  private readonly defaultExpirationMs = 300000; // 5分钟
  private readonly defaultRetryCount = 3;
  private readonly defaultRetryDelayMs = 1000; // 1秒

  constructor(
    private readonly lockRepository: ILockRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取锁
   */
  async acquireLock(
    key: string,
    expirationMs?: number,
    owner?: string,
    options?: LockOptions
  ): Promise<boolean> {
    const lockOwner = owner || this.generateOwner();
    const expiration =
      expirationMs || options?.expirationMs || this.defaultExpirationMs;
    const expiresAt = new Date(Date.now() + expiration);
    const retryCount = options?.retryCount || this.defaultRetryCount;
    const retryDelay = options?.retryDelayMs || this.defaultRetryDelayMs;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const result = await this.lockRepository.acquireLock(
          key,
          lockOwner,
          expiresAt
        );

        if (result.success && result.data) {
          this.logger.debug('成功获取数据库锁', {
            key,
            owner: lockOwner,
            expiresAt
          });
          return true;
        }

        if (!result.success) {
          this.logger.error('获取数据库锁失败', {
            key,
            owner: lockOwner,
            attempt: attempt + 1,
            error: result.error
          });
        }

        // 如果不是最后一次尝试，等待后重试
        if (attempt < retryCount) {
          this.logger.debug('等待重试获取锁', {
            key,
            attempt: attempt + 1,
            retryDelay
          });
          await this.sleep(retryDelay);
        }
      } catch (error) {
        this.logger.error('获取数据库锁异常', {
          key,
          owner: lockOwner,
          attempt: attempt + 1,
          error
        });

        if (attempt < retryCount) {
          await this.sleep(retryDelay);
        }
      }
    }

    this.logger.warn('获取数据库锁失败，已达到最大重试次数', {
      key,
      owner: lockOwner,
      retryCount
    });
    return false;
  }

  /**
   * 释放锁
   */
  async releaseLock(key: string, owner?: string): Promise<boolean> {
    try {
      const result = await this.lockRepository.releaseLock(key, owner);

      if (result.success && result.data) {
        this.logger.debug('成功释放数据库锁', { key, owner });
        return true;
      }

      if (!result.success) {
        this.logger.error('释放数据库锁失败', {
          key,
          owner,
          error: result.error
        });
      } else {
        this.logger.debug('释放数据库锁失败，锁不存在或拥有者不匹配', {
          key,
          owner
        });
      }

      return false;
    } catch (error) {
      this.logger.error('释放数据库锁异常', { key, owner, error });
      return false;
    }
  }

  /**
   * 检查锁是否存在
   */
  async hasLock(key: string, owner?: string): Promise<boolean> {
    try {
      const result = await this.lockRepository.hasLock(key, owner);

      if (result.success) {
        return result.data || false;
      }

      this.logger.error('检查数据库锁状态失败', {
        key,
        owner,
        error: result.error
      });
      return false;
    } catch (error) {
      this.logger.error('检查数据库锁状态异常', { key, owner, error });
      return false;
    }
  }

  /**
   * 续约锁
   */
  async renewLock(
    key: string,
    owner: string,
    expirationMs?: number
  ): Promise<boolean> {
    try {
      const expiration = expirationMs || this.defaultExpirationMs;
      const newExpiresAt = new Date(Date.now() + expiration);

      const result = await this.lockRepository.renewLock(
        key,
        owner,
        newExpiresAt
      );

      if (result.success && result.data) {
        this.logger.debug('成功续约数据库锁', { key, owner, newExpiresAt });
        return true;
      }

      if (!result.success) {
        this.logger.error('续约数据库锁失败', {
          key,
          owner,
          error: result.error
        });
      } else {
        this.logger.debug('续约数据库锁失败，锁不存在或拥有者不匹配', {
          key,
          owner
        });
      }

      return false;
    } catch (error) {
      this.logger.error('续约数据库锁异常', { key, owner, error });
      return false;
    }
  }

  /**
   * 清理过期锁
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const result = await this.lockRepository.cleanupExpiredLocks();

      if (result.success) {
        const deletedCount = result.data || 0;
        if (deletedCount > 0) {
          this.logger.info('清理过期锁', { deletedCount });
        }
        return deletedCount;
      }

      this.logger.error('清理过期锁失败', { error: result.error });
      return 0;
    } catch (error) {
      this.logger.error('清理过期锁异常', { error });
      return 0;
    }
  }

  /**
   * 释放特定拥有者的所有锁
   */
  async releaseAllLocksForOwner(ownerPattern: string): Promise<number> {
    try {
      const result =
        await this.lockRepository.releaseAllLocksForOwner(ownerPattern);

      if (result.success) {
        const deletedCount = result.data || 0;
        if (deletedCount > 0) {
          this.logger.info('释放拥有者所有锁', { ownerPattern, deletedCount });
        }
        return deletedCount;
      }

      this.logger.error('释放拥有者所有锁失败', {
        ownerPattern,
        error: result.error
      });
      return 0;
    } catch (error) {
      this.logger.error('释放拥有者所有锁异常', { ownerPattern, error });
      return 0;
    }
  }

  /**
   * 生成锁拥有者标识
   */
  private generateOwner(): string {
    return `${process.pid}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * 等待指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
