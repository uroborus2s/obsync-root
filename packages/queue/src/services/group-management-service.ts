/**
 * @stratix/queue 分组管理服务
 */

import type { Logger } from '@stratix/core';
import { EventEmitter } from 'node:events';
import type {
  QueueGroupRepository,
  QueueJobRepository
} from '../repositories/index.js';
import type {
  GroupManagementConfig,
  GroupStatus,
  QueueGroupSelect
} from '../types/index.js';

/**
 * 分组管理事件
 */
interface GroupManagementEvents {
  'group:paused': { queueName: string; groupId: string; reason: string };
  'group:resumed': { queueName: string; groupId: string; reason: string };
  'group:created': { queueName: string; groupId: string };
  'group:statistics:updated': {
    queueName: string;
    groupId: string;
    statistics: GroupStatistics;
  };
  'group:cleanup:completed': { queueName: string; cleanedGroups: number };
}

/**
 * 分组统计信息
 */
interface GroupStatistics {
  queueName: string;
  groupId: string;
  status: GroupStatus;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 分组操作结果
 */
interface GroupOperationResult {
  success: boolean;
  affectedJobs: number;
  message: string;
}

/**
 * 分组管理服务
 * 负责队列分组的暂停/恢复功能和分组状态管理
 */
export class GroupManagementService extends EventEmitter {
  private cleanupInterval?: NodeJS.Timeout;
  private statisticsUpdateInterval?: NodeJS.Timeout;
  private config: GroupManagementConfig = {
    enabled: true,
    statusSyncInterval: 5000,
    statisticsUpdateInterval: 10000,
    autoCreateGroups: true,
    cleanup: {
      enabled: true,
      interval: 60000,
      emptyGroupRetentionTime: 300000
    }
  };

  constructor(
    private groupRepository: QueueGroupRepository,
    private jobRepository: QueueJobRepository,
    private log: Logger
  ) {
    super();
  }

  /**
   * 启动分组管理服务
   */
  async start(): Promise<void> {
    // 启动定期清理
    if (this.config.cleanup?.enabled && this.config.cleanup.interval > 0) {
      this.startCleanupSchedule();
    }

    // 启动统计信息更新
    if (
      this.config.statisticsUpdateInterval &&
      this.config.statisticsUpdateInterval > 0
    ) {
      this.startStatisticsUpdateSchedule();
    }

    this.log.info(
      {
        cleanupInterval: this.config.cleanup?.interval,
        statisticsUpdateInterval: this.config.statisticsUpdateInterval
      },
      '分组管理服务已启动'
    );
  }

  /**
   * 停止分组管理服务
   */
  async stop(): Promise<void> {
    // 停止定期清理
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // 停止统计信息更新
    if (this.statisticsUpdateInterval) {
      clearInterval(this.statisticsUpdateInterval);
      this.statisticsUpdateInterval = undefined;
    }

    this.log.info('分组管理服务已停止');
  }

  /**
   * 暂停分组
   */
  async pauseGroup(
    queueName: string,
    groupId: string,
    reason: string = '手动暂停'
  ): Promise<GroupOperationResult> {
    try {
      // 暂停分组中的所有任务
      const affectedJobs = await this.jobRepository.pauseGroup(
        queueName,
        groupId
      );

      // 更新分组状态
      await this.groupRepository.pauseGroup(queueName, groupId);

      this.log.info(
        {
          queueName,
          groupId,
          affectedJobs,
          reason
        },
        '分组已暂停'
      );

      return {
        success: true,
        affectedJobs,
        message: `分组 ${groupId} 已暂停，影响 ${affectedJobs} 个任务`
      };
    } catch (error) {
      this.log.error(
        {
          queueName,
          groupId,
          reason,
          error
        },
        '暂停分组失败'
      );

      return {
        success: false,
        affectedJobs: 0,
        message: `暂停分组失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 恢复分组
   */
  async resumeGroup(
    queueName: string,
    groupId: string,
    reason: string = '手动恢复'
  ): Promise<GroupOperationResult> {
    try {
      // 恢复分组中的所有任务
      const affectedJobs = await this.jobRepository.resumeGroup(
        queueName,
        groupId
      );

      // 更新分组状态
      await this.groupRepository.resumeGroup(queueName, groupId);

      this.log.info(
        {
          queueName,
          groupId,
          affectedJobs,
          reason
        },
        '分组已恢复'
      );

      this.emit('group:resumed', { queueName, groupId, reason });

      return {
        success: true,
        affectedJobs,
        message: `分组 ${groupId} 已恢复，影响 ${affectedJobs} 个任务`
      };
    } catch (error) {
      this.log.error(
        {
          queueName,
          groupId,
          reason,
          error
        },
        '恢复分组失败'
      );

      return {
        success: false,
        affectedJobs: 0,
        message: `恢复分组失败: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * 创建或更新分组
   */
  async upsertGroup(
    queueName: string,
    groupId: string,
    metadata?: Record<string, unknown>
  ): Promise<QueueGroupSelect> {
    try {
      const group = await this.groupRepository.upsert(
        queueName,
        groupId,
        metadata
      );

      this.log.info({ queueName, groupId }, '分组已创建或更新');

      this.emit('group:created', { queueName, groupId });

      return group;
    } catch (error) {
      this.log.error({ queueName, groupId, error }, '创建或更新分组失败');
      throw error;
    }
  }

  /**
   * 获取分组信息
   */
  async getGroup(
    queueName: string,
    groupId: string
  ): Promise<QueueGroupSelect | null> {
    try {
      return await this.groupRepository.findByGroupId(queueName, groupId);
    } catch (error) {
      this.log.error({ queueName, groupId, error }, '获取分组信息失败');
      return null;
    }
  }

  /**
   * 获取队列中的所有分组
   */
  async getQueueGroups(queueName: string): Promise<QueueGroupSelect[]> {
    try {
      return await this.groupRepository.findByQueue(queueName);
    } catch (error) {
      this.log.error({ queueName, error }, '获取队列分组列表失败');
      return [];
    }
  }

  /**
   * 获取暂停的分组ID列表
   */
  async getPausedGroupIds(queueName: string): Promise<string[]> {
    try {
      return await this.groupRepository.getPausedGroupIds(queueName);
    } catch (error) {
      this.log.error({ queueName, error }, '获取暂停分组列表失败');
      return [];
    }
  }

  /**
   * 获取分组统计信息
   */
  async getGroupStatistics(
    queueName: string,
    groupId: string
  ): Promise<GroupStatistics | null> {
    try {
      const group = await this.groupRepository.findByGroupId(
        queueName,
        groupId
      );
      if (!group) {
        return null;
      }

      // 计算待处理任务数
      const pendingJobs = Math.max(
        0,
        group.total_jobs - group.completed_jobs - group.failed_jobs
      );

      return {
        queueName: group.queue_name,
        groupId: group.group_id,
        status: group.status,
        totalJobs: group.total_jobs,
        completedJobs: group.completed_jobs,
        failedJobs: group.failed_jobs,
        pendingJobs,
        createdAt: group.created_at,
        updatedAt: group.updated_at
      };
    } catch (error) {
      this.log.error({ queueName, groupId, error }, '获取分组统计信息失败');
      return null;
    }
  }

  /**
   * 获取队列的所有分组统计信息
   */
  async getQueueGroupStatistics(queueName: string): Promise<GroupStatistics[]> {
    try {
      const groups = await this.groupRepository.findByQueue(queueName);
      const statistics: GroupStatistics[] = [];

      for (const group of groups) {
        const pendingJobs = Math.max(
          0,
          group.total_jobs - group.completed_jobs - group.failed_jobs
        );

        statistics.push({
          queueName: group.queue_name,
          groupId: group.group_id,
          status: group.status,
          totalJobs: group.total_jobs,
          completedJobs: group.completed_jobs,
          failedJobs: group.failed_jobs,
          pendingJobs,
          createdAt: group.created_at,
          updatedAt: group.updated_at
        });
      }

      return statistics;
    } catch (error) {
      this.log.error({ queueName, error }, '获取队列分组统计信息失败');
      return [];
    }
  }

  /**
   * 同步分组统计信息
   */
  async syncGroupStatistics(
    queueName?: string,
    groupId?: string
  ): Promise<void> {
    try {
      if (queueName && groupId) {
        // 同步特定分组
        await this.groupRepository.syncGroupStatistics(queueName, groupId);

        const statistics = await this.getGroupStatistics(queueName, groupId);
        if (statistics) {
          this.emit('group:statistics:updated', {
            queueName,
            groupId,
            statistics
          });
        }
      } else if (queueName) {
        // 同步队列中的所有分组
        const groups = await this.groupRepository.findByQueue(queueName);
        for (const group of groups) {
          await this.groupRepository.syncGroupStatistics(
            queueName,
            group.group_id
          );
        }
      } else {
        // 暂时跳过同步所有分组，需要实现获取所有分组的方法
        this.log.warn('同步所有分组功能暂未实现，请指定队列名称');
      }

      this.log.info({ queueName, groupId }, '分组统计信息同步完成');
    } catch (error) {
      this.log.error({ queueName, groupId, error }, '同步分组统计信息失败');
    }
  }

  /**
   * 清理空的分组
   */
  async cleanupEmptyGroups(queueName?: string): Promise<number> {
    try {
      const cleanedCount =
        await this.groupRepository.cleanupEmptyGroups(queueName);

      this.log.info({ queueName, cleanedCount }, '空分组清理完成');

      this.emit('group:cleanup:completed', {
        queueName: queueName || 'all',
        cleanedGroups: cleanedCount
      });

      return cleanedCount;
    } catch (error) {
      this.log.error({ queueName, error }, '清理空分组失败');
      return 0;
    }
  }

  /**
   * 启动定期清理计划
   */
  private startCleanupSchedule(): void {
    const interval = this.config.cleanup?.interval;
    if (!interval) return;

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupEmptyGroups();
      } catch (error) {
        this.log.error({ error }, '定期清理分组时发生错误');
      }
    }, interval);

    this.log.info({ interval }, '分组定期清理计划已启动');
  }

  /**
   * 启动统计信息更新计划
   */
  private startStatisticsUpdateSchedule(): void {
    const interval = this.config.statisticsUpdateInterval;
    if (!interval) return;

    this.statisticsUpdateInterval = setInterval(async () => {
      try {
        await this.syncGroupStatistics();
      } catch (error) {
        this.log.error({ error }, '定期更新分组统计信息时发生错误');
      }
    }, interval);

    this.log.info({ interval }, '分组统计信息更新计划已启动');
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): {
    isCleanupScheduleActive: boolean;
    isStatisticsUpdateScheduleActive: boolean;
    cleanupInterval: number | undefined;
    statisticsUpdateInterval: number | undefined;
  } {
    return {
      isCleanupScheduleActive: this.cleanupInterval !== undefined,
      isStatisticsUpdateScheduleActive:
        this.statisticsUpdateInterval !== undefined,
      cleanupInterval: this.config.cleanup?.interval,
      statisticsUpdateInterval: this.config.statisticsUpdateInterval
    };
  }

  /**
   * 销毁分组管理服务
   */
  async destroy(): Promise<void> {
    await this.stop();
    this.removeAllListeners();

    this.log.info('分组管理服务已销毁');
  }
}
