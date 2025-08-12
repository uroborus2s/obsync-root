/**
 * @stratix/tasks 工作流实例恢复和状态管理
 *
 * 处理服务重启后的工作流恢复、分布式锁定、互斥控制等核心功能
 */

import type { Logger } from '@stratix/core';
import type {
  IStratixTasksAdapter,
  WorkflowInstance
} from '../types/workflow.js';
import DatabaseLockService from './DatabaseLockService.js';

/**
 * 工作流实例恢复服务
 *
 * 负责在服务启动时恢复中断的工作流实例
 */
export class WorkflowRecoveryService {
  private readonly recoveryInterval = 30000; // 30秒检查一次
  private isRecovering = false;
  private recoveryTimer?: NodeJS.Timeout | undefined;

  constructor(
    private readonly workflowAdapter: IStratixTasksAdapter,
    private readonly lockService: DatabaseLockService, // 改为使用数据库锁
    private readonly logger: Logger
  ) {}

  /**
   * 启动恢复服务
   * 服务启动时调用，恢复所有中断的工作流实例
   */
  async startRecoveryService(): Promise<void> {
    this.logger.info('启动工作流恢复服务');

    try {
      // 立即执行一次恢复
      await this.recoverInterruptedWorkflows();

      // 启动定期检查
      this.startPeriodicRecovery();

      this.logger.info('工作流恢复服务启动成功');
    } catch (error) {
      this.logger.error('工作流恢复服务启动失败', { error });
      throw error;
    }
  }

  /**
   * 停止恢复服务
   */
  async stopRecoveryService(): Promise<void> {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = undefined;
    }
    this.logger.info('工作流恢复服务已停止');
  }

  /**
   * 恢复中断的工作流实例
   */
  private async recoverInterruptedWorkflows(): Promise<void> {
    if (this.isRecovering) {
      this.logger.debug('恢复过程正在进行中，跳过本次检查');
      return;
    }

    this.isRecovering = true;

    try {
      // 1. 获取所有可能需要恢复的工作流实例
      const interruptedInstances = await this.findInterruptedInstances();

      if (interruptedInstances.length === 0) {
        this.logger.debug('没有发现需要恢复的工作流实例');
        return;
      }

      this.logger.info(
        `发现 ${interruptedInstances.length} 个需要恢复的工作流实例`
      );

      // 2. 逐个尝试恢复
      const recoveryResults = await Promise.allSettled(
        interruptedInstances.map((instance) =>
          this.recoverSingleInstance(instance)
        )
      );

      // 3. 统计恢复结果
      const successful = recoveryResults.filter(
        (r) => r.status === 'fulfilled'
      ).length;
      const failed = recoveryResults.length - successful;

      this.logger.info('工作流恢复完成', {
        total: interruptedInstances.length,
        successful,
        failed
      });
    } catch (error) {
      this.logger.error('工作流恢复过程异常', { error });
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * 查找中断的工作流实例
   */
  private async findInterruptedInstances(): Promise<WorkflowInstance[]> {
    try {
      // 查找状态为 running 但可能已中断的实例
      const runningInstances = await this.workflowAdapter.listWorkflowInstances(
        {
          status: 'running',
          pageSize: 100
        }
      );

      if (!runningInstances.success) {
        throw new Error(`查询运行中实例失败: ${runningInstances.error}`);
      }

      const instances = runningInstances.data?.items || [];
      const interruptedInstances: WorkflowInstance[] = [];

      // 检查每个实例是否真的在运行
      for (const instance of instances) {
        if (await this.isInstanceInterrupted(instance)) {
          interruptedInstances.push(instance);
        }
      }

      return interruptedInstances;
    } catch (error) {
      this.logger.error('查找中断实例失败', { error });
      return [];
    }
  }

  /**
   * 检查实例是否中断
   */
  private async isInstanceInterrupted(
    instance: WorkflowInstance
  ): Promise<boolean> {
    try {
      // 检查实例是否有分布式锁
      const lockKey = this.getInstanceLockKey(instance.id.toString());
      const hasLock = await this.lockService.hasLock(lockKey);

      if (hasLock) {
        // 有锁说明正在其他节点运行
        return false;
      }

      // 检查最后更新时间
      const lastUpdate = new Date(instance.updatedAt);
      const now = new Date();
      const timeDiff = now.getTime() - lastUpdate.getTime();

      // 如果超过5分钟没有更新，认为可能已中断
      const INTERRUPT_THRESHOLD = 5 * 60 * 1000; // 5分钟
      return timeDiff > INTERRUPT_THRESHOLD;
    } catch (error) {
      this.logger.error('检查实例中断状态失败', {
        instanceId: instance.id,
        error
      });
      return false;
    }
  }

  /**
   * 恢复单个工作流实例
   */
  private async recoverSingleInstance(
    instance: WorkflowInstance
  ): Promise<void> {
    const instanceId = instance.id.toString();
    const lockKey = this.getInstanceLockKey(instanceId);
    const owner = `recovery-${process.pid}-${Date.now()}`;

    try {
      // 尝试获取分布式锁
      const lockAcquired = await this.lockService.acquireLock(
        lockKey,
        60000, // 1分钟锁定时间
        owner
      );

      if (!lockAcquired) {
        this.logger.debug('无法获取实例锁，可能正在其他节点运行', {
          instanceId
        });
        return;
      }

      this.logger.info('开始恢复工作流实例', {
        instanceId,
        name: instance.name,
        status: instance.status
      });

      // 恢复实例执行
      const result = await this.workflowAdapter.resumeWorkflow(instanceId);

      if (result.success) {
        this.logger.info('工作流实例恢复成功', { instanceId });
      } else {
        this.logger.error('工作流实例恢复失败', {
          instanceId,
          error: result.error
        });
      }
    } catch (error) {
      this.logger.error('恢复工作流实例异常', { instanceId, error });
    } finally {
      // 释放锁
      await this.lockService.releaseLock(lockKey, owner);
    }
  }

  /**
   * 启动定期恢复检查
   */
  private startPeriodicRecovery(): void {
    this.recoveryTimer = setInterval(async () => {
      try {
        await this.recoverInterruptedWorkflows();
      } catch (error) {
        this.logger.error('定期恢复检查异常', { error });
      }
    }, this.recoveryInterval);
  }

  /**
   * 获取实例锁定键
   */
  private getInstanceLockKey(instanceId: string): string {
    return `workflow:instance:${instanceId}`;
  }
}
