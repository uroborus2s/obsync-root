/**
 * 容错分布式锁管理器
 *
 * 处理网络分区、数据库不可用等异常情况
 */

import type { Logger } from '@stratix/core';
// import type { DatabaseAPI } from '@stratix/database'; // 暂未使用
import type { DistributedLock } from '../types/distributed.js';
import type { IDistributedLockManager } from './DistributedLockManager.js';

// 注意：LockOperationResult 接口已移除，因为当前未使用
// 如需要可以重新添加：
// interface LockOperationResult {
//   success: boolean;
//   error?: string;
//   retryAfter?: number; // 建议重试间隔（毫秒）
// }

/**
 * 容错配置
 */
interface FaultToleranceConfig {
  maxRetries: number;
  baseRetryDelay: number;
  maxRetryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  degradedModeTimeout: number;
}

/**
 * 熔断器状态
 */
type CircuitBreakerState = 'closed' | 'open' | 'half-open';

/**
 * 容错分布式锁管理器
 */
export default class FaultTolerantLockManager
  implements IDistributedLockManager
{
  private circuitBreakerState: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private localLocks = new Map<string, { owner: string; expiresAt: Date }>();

  constructor(
    private readonly distributedLockManager: IDistributedLockManager,
    private readonly logger: Logger,
    private readonly config: FaultToleranceConfig = {
      maxRetries: 3,
      baseRetryDelay: 100,
      maxRetryDelay: 5000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      degradedModeTimeout: 60000
    }
  ) {}

  /**
   * 获取锁（带容错机制）
   */
  async acquireLock(
    lockKey: string,
    owner: string,
    lockType: 'workflow' | 'node' | 'resource',
    timeoutMs: number,
    lockData?: Record<string, any>
  ): Promise<boolean> {
    // 检查熔断器状态
    if (this.circuitBreakerState === 'open') {
      if (
        Date.now() - this.lastFailureTime >
        this.config.circuitBreakerTimeout
      ) {
        this.circuitBreakerState = 'half-open';
        this.logger.info('熔断器进入半开状态，尝试恢复');
      } else {
        // 熔断器开启，使用降级模式
        return this.acquireLockDegraded(lockKey, owner, timeoutMs);
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await this.distributedLockManager.acquireLock(
          lockKey,
          owner,
          lockType,
          timeoutMs,
          lockData
        );

        // 成功，重置熔断器
        if (this.circuitBreakerState === 'half-open') {
          this.circuitBreakerState = 'closed';
          this.failureCount = 0;
          this.logger.info('熔断器恢复到关闭状态');
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `锁获取失败，尝试 ${attempt + 1}/${this.config.maxRetries + 1}`,
          {
            lockKey,
            owner,
            error: lastError.message
          }
        );

        // 判断是否为可重试错误
        if (!this.isRetryableError(lastError)) {
          break;
        }

        // 最后一次尝试失败
        if (attempt === this.config.maxRetries) {
          break;
        }

        // 指数退避
        const delay = Math.min(
          this.config.baseRetryDelay * Math.pow(2, attempt),
          this.config.maxRetryDelay
        );
        await this.sleep(delay);
      }
    }

    // 所有重试失败，更新熔断器状态
    this.handleFailure();

    // 尝试降级模式
    if (this.shouldUseDegradedMode(lastError)) {
      this.logger.warn('使用降级模式获取锁', { lockKey, owner });
      return this.acquireLockDegraded(lockKey, owner, timeoutMs);
    }

    return false;
  }

  /**
   * 释放锁（带容错机制）
   */
  async releaseLock(lockKey: string, owner: string): Promise<boolean> {
    try {
      // 先尝试从主锁管理器释放
      if (this.circuitBreakerState !== 'open') {
        const result = await this.distributedLockManager.releaseLock(
          lockKey,
          owner
        );

        // 同时清理本地锁
        this.localLocks.delete(lockKey);

        return result;
      }
    } catch (error) {
      this.logger.warn('主锁管理器释放锁失败，尝试本地清理', {
        lockKey,
        owner,
        error: (error as Error).message
      });
    }

    // 降级模式：只清理本地锁
    return this.releaseLockDegraded(lockKey, owner);
  }

  /**
   * 续期锁（带容错机制）
   */
  async renewLock(
    lockKey: string,
    owner: string,
    timeoutMs: number
  ): Promise<boolean> {
    try {
      if (this.circuitBreakerState !== 'open') {
        const result = await this.distributedLockManager.renewLock(
          lockKey,
          owner,
          timeoutMs
        );

        // 同时更新本地锁
        const localLock = this.localLocks.get(lockKey);
        if (localLock && localLock.owner === owner) {
          localLock.expiresAt = new Date(Date.now() + timeoutMs);
        }

        return result;
      }
    } catch (error) {
      this.logger.warn('主锁管理器续期失败，使用本地续期', {
        lockKey,
        owner,
        error: (error as Error).message
      });
    }

    // 降级模式：本地续期
    return this.renewLockDegraded(lockKey, owner, timeoutMs);
  }

  /**
   * 检查锁状态
   */
  async checkLock(lockKey: string): Promise<DistributedLock | null> {
    try {
      if (this.circuitBreakerState !== 'open') {
        return await this.distributedLockManager.checkLock(lockKey);
      }
    } catch (error) {
      this.logger.warn('检查锁状态失败，使用本地状态', {
        lockKey,
        error: (error as Error).message
      });
    }

    // 降级模式：检查本地锁
    const localLock = this.localLocks.get(lockKey);
    if (localLock) {
      return {
        lockKey,
        owner: localLock.owner,
        lockType: 'workflow', // 简化处理
        expiresAt: localLock.expiresAt,
        createdAt: new Date() // 简化处理
      };
    }

    return null;
  }

  /**
   * 强制释放锁
   */
  async forceReleaseLock(lockKey: string): Promise<boolean> {
    try {
      if (this.circuitBreakerState !== 'open') {
        const result = await this.distributedLockManager.forceReleaseLock(lockKey);
        this.localLocks.delete(lockKey);
        return result;
      }
    } catch (error) {
      this.logger.warn('强制释放锁失败，清理本地锁', {
        lockKey,
        error: (error as Error).message
      });
    }

    // 降级模式：清理本地锁
    this.localLocks.delete(lockKey);
    return true;
  }

  /**
   * 清理过期锁
   */
  async cleanupExpiredLocks(): Promise<number> {
    let cleanedCount = 0;

    try {
      if (this.circuitBreakerState !== 'open') {
        cleanedCount = await this.distributedLockManager.cleanupExpiredLocks();
      }
    } catch (error) {
      this.logger.warn('清理远程过期锁失败', {
        error: (error as Error).message
      });
    }

    // 清理本地过期锁
    const now = new Date();
    for (const [lockKey, lock] of this.localLocks.entries()) {
      if (lock.expiresAt < now) {
        this.localLocks.delete(lockKey);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 降级模式：本地锁获取
   */
  private acquireLockDegraded(
    lockKey: string,
    owner: string,
    timeoutMs: number
  ): boolean {
    const existingLock = this.localLocks.get(lockKey);
    const now = new Date();

    if (existingLock) {
      // 检查锁是否过期
      if (existingLock.expiresAt > now) {
        return false; // 锁仍有效
      }
    }

    // 获取或更新锁
    this.localLocks.set(lockKey, {
      owner,
      expiresAt: new Date(Date.now() + timeoutMs)
    });

    this.logger.info('降级模式获取锁成功', { lockKey, owner });
    return true;
  }

  /**
   * 降级模式：本地锁释放
   */
  private releaseLockDegraded(lockKey: string, owner: string): boolean {
    const existingLock = this.localLocks.get(lockKey);

    if (existingLock && existingLock.owner === owner) {
      this.localLocks.delete(lockKey);
      this.logger.info('降级模式释放锁成功', { lockKey, owner });
      return true;
    }

    return false;
  }

  /**
   * 降级模式：本地锁续期
   */
  private renewLockDegraded(
    lockKey: string,
    owner: string,
    timeoutMs: number
  ): boolean {
    const existingLock = this.localLocks.get(lockKey);

    if (existingLock && existingLock.owner === owner) {
      existingLock.expiresAt = new Date(Date.now() + timeoutMs);
      this.logger.info('降级模式续期锁成功', { lockKey, owner });
      return true;
    }

    return false;
  }

  /**
   * 处理失败
   */
  private handleFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.circuitBreakerThreshold) {
      this.circuitBreakerState = 'open';
      this.logger.error('熔断器开启，切换到降级模式', {
        failureCount: this.failureCount,
        threshold: this.config.circuitBreakerThreshold
      });
    }
  }

  /**
   * 判断是否为可重试错误
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EHOSTUNREACH',
      'Lock wait timeout'
    ];

    return retryableErrors.some(
      (errorType) =>
        error.message.includes(errorType) || (error as any).code === errorType
    );
  }

  /**
   * 判断是否应该使用降级模式
   */
  private shouldUseDegradedMode(error: Error | null): boolean {
    if (!error) return false;

    const degradedModeErrors = ['ECONNREFUSED', 'EHOSTUNREACH', 'ENOTFOUND'];

    return degradedModeErrors.some(
      (errorType) =>
        error.message.includes(errorType) || (error as any).code === errorType
    );
  }

  /**
   * 启用自动续期
   */
  async enableAutoRenewal(
    lockKey: string,
    owner: string,
    lockType: 'workflow' | 'node' | 'resource',
    renewalInterval: number,
    maxRenewalCount?: number
  ): Promise<boolean> {
    try {
      if (this.circuitBreakerState === 'open') {
        this.logger.warn('熔断器开启，无法启用自动续期', { lockKey, owner });
        return false;
      }

      return await this.distributedLockManager.enableAutoRenewal(
        lockKey,
        owner,
        lockType,
        renewalInterval,
        maxRenewalCount
      );
    } catch (error) {
      this.handleFailure();
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
      if (this.circuitBreakerState === 'open') {
        this.logger.warn('熔断器开启，无法禁用自动续期', { lockKey, owner });
        return false;
      }

      return await this.distributedLockManager.disableAutoRenewal(lockKey, owner);
    } catch (error) {
      this.handleFailure();
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
  getRenewalStatus(
    lockKey: string
  ): import('./DistributedLockManager.js').LockRenewalInfo | null {
    try {
      if (this.circuitBreakerState === 'open') {
        this.logger.warn('熔断器开启，无法获取续期状态', { lockKey });
        return null;
      }

      return this.distributedLockManager.getRenewalStatus(lockKey);
    } catch (error) {
      this.handleFailure();
      this.logger.error('获取续期状态失败', {
        lockKey,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
