/**
 * 工作流锁管理器
 *
 * 负责工作流锁的生命周期管理，包括注册、续期、释放等操作
 * 修复报告中锁续期机制缺失的问题
 */

import { RESOLVER, type AwilixContainer, type Logger } from '@stratix/core';
import { TasksPluginOptions } from 'src/index.js';
import type DatabaseLockService from './DatabaseLockService.js';

/**
 * 工作流锁信息
 */
export interface WorkflowLockInfo {
  lockKey: string;
  owner: string;
  workflowInstanceId: string;
  originalDuration: number;
  expiresAt: Date;
  isActive: boolean;
  renewalCount: number;
  maxRenewals: number;
  createdAt: Date;
}

/**
 * 锁续期策略配置
 */
export interface LockRenewalConfig {
  /** 续期阈值（剩余时间百分比） */
  renewalThreshold: number;
  /** 最大续期次数 */
  maxRenewals: number;
  /** 续期检查间隔（毫秒） */
  checkInterval: number;
  /** 默认锁定时长（毫秒） */
  defaultDuration: number;
}

/**
 * 工作流锁管理器接口
 */
export interface IWorkflowLockManager {
  /**
   * 注册工作流锁
   */
  registerWorkflowLock(
    workflowInstanceId: string,
    lockKey: string,
    owner: string,
    duration?: number
  ): Promise<void>;

  /**
   * 注销工作流锁
   */
  unregisterWorkflowLock(instanceId: string): Promise<void>;

  /**
   * 启动续期进程
   */
  startRenewalProcess(): Promise<void>;

  /**
   * 停止续期进程
   */
  stopRenewalProcess(): Promise<void>;

  /**
   * 获取锁统计信息
   */
  getLockStatistics(): {
    totalLocks: number;
    activeLocks: number;
    expiredLocks: number;
    totalRenewals: number;
  };
}

/**
 * 工作流锁管理器实现
 */
export default class WorkflowLockManager implements IWorkflowLockManager {
  private workflowLocks = new Map<string, WorkflowLockInfo>();
  private renewalTimer?: NodeJS.Timeout | undefined;
  private totalRenewals = 0;

  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      // 从插件配置中提取锁管理器配置
      const pluginConfig = container.resolve('config') as TasksPluginOptions;
      const userConfig =
        pluginConfig.distributed?.lockManager ||
        ({} as Partial<LockRenewalConfig>);

      // 提供完整的默认配置
      const options: LockRenewalConfig = {
        renewalThreshold: userConfig.renewalThreshold || 0.3,
        maxRenewals: userConfig.maxRenewals || 10,
        checkInterval: userConfig.checkInterval || 30000,
        defaultDuration: userConfig.defaultDuration || 300000
      };

      return { options };
    }
  };
  constructor(
    private readonly databaseLockService: DatabaseLockService,
    private readonly logger: Logger,
    private readonly options: LockRenewalConfig
  ) {}

  /**
   * 注册工作流锁
   */
  async registerWorkflowLock(
    workflowInstanceId: string,
    lockKey: string,
    owner: string,
    duration?: number
  ): Promise<void> {
    const lockDuration = duration || this.options.defaultDuration;

    const lockInfo: WorkflowLockInfo = {
      lockKey,
      owner,
      workflowInstanceId,
      originalDuration: lockDuration,
      expiresAt: new Date(Date.now() + lockDuration),
      isActive: true,
      renewalCount: 0,
      maxRenewals: this.options.maxRenewals,
      createdAt: new Date()
    };

    this.workflowLocks.set(workflowInstanceId, lockInfo);

    this.logger.debug('注册工作流锁', {
      workflowInstanceId,
      lockKey,
      owner,
      duration: lockDuration
    });
  }

  /**
   * 注销工作流锁
   */
  async unregisterWorkflowLock(instanceId: string): Promise<void> {
    const lockInfo = this.workflowLocks.get(instanceId);
    if (lockInfo) {
      // 标记为非活跃
      lockInfo.isActive = false;

      // 从内存中移除
      this.workflowLocks.delete(instanceId);

      // 释放数据库锁
      try {
        await this.databaseLockService.releaseLock(
          lockInfo.lockKey,
          lockInfo.owner
        );

        this.logger.debug('注销工作流锁', {
          instanceId,
          lockKey: lockInfo.lockKey,
          renewalCount: lockInfo.renewalCount
        });
      } catch (error) {
        this.logger.error('释放锁失败', {
          instanceId,
          lockKey: lockInfo.lockKey,
          error
        });
      }
    }
  }

  /**
   * 启动续期进程
   */
  async startRenewalProcess(): Promise<void> {
    if (this.renewalTimer) {
      this.logger.warn('锁续期进程已在运行');
      return;
    }

    this.renewalTimer = setInterval(async () => {
      await this.renewAllActiveLocks();
    }, this.options.checkInterval);

    this.logger.info('锁续期进程启动', {
      checkInterval: this.options.checkInterval,
      renewalThreshold: this.options.renewalThreshold
    });
  }

  /**
   * 停止续期进程
   */
  async stopRenewalProcess(): Promise<void> {
    if (this.renewalTimer) {
      clearInterval(this.renewalTimer);
      this.renewalTimer = undefined;
    }

    // 释放所有活跃锁
    const activeLocks = Array.from(this.workflowLocks.entries());
    for (const [instanceId, lockInfo] of activeLocks) {
      if (lockInfo.isActive) {
        try {
          await this.databaseLockService.releaseLock(
            lockInfo.lockKey,
            lockInfo.owner
          );
        } catch (error) {
          this.logger.error('停止时释放锁失败', {
            instanceId,
            lockKey: lockInfo.lockKey,
            error
          });
        }
      }
    }

    this.workflowLocks.clear();

    this.logger.info('锁续期进程停止', {
      releasedLocks: activeLocks.length,
      totalRenewals: this.totalRenewals
    });
  }

  /**
   * 续期所有活跃锁
   */
  private async renewAllActiveLocks(): Promise<void> {
    const activeLocks = Array.from(this.workflowLocks.entries()).filter(
      ([, lockInfo]) => lockInfo.isActive
    );

    if (activeLocks.length === 0) {
      return;
    }

    this.logger.debug('开始检查锁续期', {
      activeLocksCount: activeLocks.length
    });

    for (const [instanceId, lockInfo] of activeLocks) {
      if (this.shouldRenewLock(lockInfo)) {
        await this.renewLock(instanceId, lockInfo);
      }
    }
  }

  /**
   * 判断是否需要续期锁
   */
  private shouldRenewLock(lockInfo: WorkflowLockInfo): boolean {
    if (!lockInfo.isActive || lockInfo.renewalCount >= lockInfo.maxRenewals) {
      return false;
    }

    const now = Date.now();
    const remainingTime = lockInfo.expiresAt.getTime() - now;
    const renewalThreshold =
      lockInfo.originalDuration * this.options.renewalThreshold;

    return remainingTime < renewalThreshold && remainingTime > 0;
  }

  /**
   * 续期单个锁
   */
  private async renewLock(
    instanceId: string,
    lockInfo: WorkflowLockInfo
  ): Promise<void> {
    try {
      const renewed = await this.databaseLockService.renewLock(
        lockInfo.lockKey,
        lockInfo.owner,
        lockInfo.originalDuration
      );

      if (renewed) {
        // 更新锁信息
        lockInfo.expiresAt = new Date(Date.now() + lockInfo.originalDuration);
        lockInfo.renewalCount++;
        this.totalRenewals++;

        this.logger.debug('锁续期成功', {
          instanceId,
          lockKey: lockInfo.lockKey,
          renewalCount: lockInfo.renewalCount,
          newExpiresAt: lockInfo.expiresAt
        });
      } else {
        this.logger.warn('锁续期失败，标记为非活跃', {
          instanceId,
          lockKey: lockInfo.lockKey,
          renewalCount: lockInfo.renewalCount
        });

        // 标记锁为非活跃状态
        lockInfo.isActive = false;
      }
    } catch (error) {
      this.logger.error('锁续期异常', {
        instanceId,
        lockKey: lockInfo.lockKey,
        error
      });

      // 发生异常时标记为非活跃
      lockInfo.isActive = false;
    }
  }

  /**
   * 获取锁统计信息
   */
  getLockStatistics(): {
    totalLocks: number;
    activeLocks: number;
    expiredLocks: number;
    totalRenewals: number;
  } {
    const now = Date.now();
    const locks = Array.from(this.workflowLocks.values());

    const activeLocks = locks.filter((lock) => lock.isActive).length;
    const expiredLocks = locks.filter(
      (lock) => lock.expiresAt.getTime() < now && lock.isActive
    ).length;

    return {
      totalLocks: locks.length,
      activeLocks,
      expiredLocks,
      totalRenewals: this.totalRenewals
    };
  }

  /**
   * 获取指定工作流的锁信息
   */
  getLockInfo(instanceId: string): WorkflowLockInfo | undefined {
    return this.workflowLocks.get(instanceId);
  }

  /**
   * 强制释放指定锁
   */
  async forceReleaseLock(instanceId: string): Promise<boolean> {
    const lockInfo = this.workflowLocks.get(instanceId);
    if (!lockInfo) {
      return false;
    }

    try {
      await this.databaseLockService.releaseLock(
        lockInfo.lockKey,
        lockInfo.owner
      );
      this.workflowLocks.delete(instanceId);

      this.logger.info('强制释放锁成功', {
        instanceId,
        lockKey: lockInfo.lockKey
      });

      return true;
    } catch (error) {
      this.logger.error('强制释放锁失败', {
        instanceId,
        lockKey: lockInfo.lockKey,
        error
      });

      return false;
    }
  }
}
