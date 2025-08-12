/**
 * ICAsync同步历史管理服务
 *
 * 业务特定的同步历史管理服务，负责查询和管理学期级别的同步执行历史
 * 通过tasksWorkflow adapter访问@stratix/tasks插件功能，遵循跨插件访问限制
 */

import type { Logger } from '@stratix/core';
import type {
  IWorkflowAdapter,
  PaginatedResult,
  WorkflowInstance
} from '@stratix/tasks';

/**
 * 同步类型枚举
 */
export type SyncType = 'full' | 'incremental' | 'user';

/**
 * 学期同步历史记录
 */
export interface SemesterSyncHistory {
  /** 学年学期 */
  xnxq: string;
  /** 同步类型 */
  syncType: SyncType;
  /** 工作流实例 */
  instance: WorkflowInstance;
  /** 执行时间 */
  executedAt: Date;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 是否正在运行 */
  isRunning: boolean;
}

/**
 * 运行中的同步信息
 */
export interface RunningSyncInfo {
  /** 同步类型 */
  syncType: SyncType;
  /** 工作流实例 */
  instance: WorkflowInstance;
  /** 开始时间 */
  startedAt: Date;
}

/**
 * 服务结果类型
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * ICAsync同步历史管理服务接口
 */
export interface IICAsyncSyncHistoryService {
  /**
   * 获取学期的同步执行历史
   */
  getSemesterSyncHistory(
    xnxq: string
  ): Promise<ServiceResult<SemesterSyncHistory[]>>;

  /**
   * 检查学期是否已有全量同步记录
   */
  hasFullSyncRecord(xnxq: string): Promise<ServiceResult<boolean>>;

  /**
   * 获取学期当前运行中的同步实例
   */
  getRunningSync(xnxq: string): Promise<ServiceResult<RunningSyncInfo | null>>;

  /**
   * 查找指定学期和同步类型的最新实例
   */
  getLatestSyncInstance(
    xnxq: string,
    syncType: SyncType
  ): Promise<ServiceResult<WorkflowInstance | null>>;

  /**
   * 查找指定学期和同步类型的所有历史实例
   */
  getSyncInstancesByType(
    xnxq: string,
    syncType: SyncType
  ): Promise<ServiceResult<WorkflowInstance[]>>;
}

/**
 * ICAsync同步历史管理服务实现
 */
export default class ICAsyncSyncHistoryService
  implements IICAsyncSyncHistoryService
{
  constructor(
    private readonly logger: Logger,
    private readonly tasksWorkflow: IWorkflowAdapter
  ) {}

  /**
   * 获取学期的同步执行历史
   */
  async getSemesterSyncHistory(
    xnxq: string
  ): Promise<ServiceResult<SemesterSyncHistory[]>> {
    try {
      this.logger.debug('获取学期同步历史', { xnxq });

      // 查询所有同步类型的实例
      const allTypes: SyncType[] = ['full', 'incremental', 'user'];
      const allHistory: SemesterSyncHistory[] = [];

      for (const syncType of allTypes) {
        const instancesResult = await this.getSyncInstancesByType(
          xnxq,
          syncType
        );

        if (instancesResult.success && instancesResult.data) {
          const typeHistory = instancesResult.data.map((instance) =>
            this.mapInstanceToHistory(instance, xnxq, syncType)
          );
          allHistory.push(...typeHistory);
        }
      }

      // 按创建时间倒序排列
      allHistory.sort(
        (a, b) =>
          new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
      );

      return {
        success: true,
        data: allHistory
      };
    } catch (error) {
      this.logger.error('获取学期同步历史异常', { xnxq, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'HISTORY_QUERY_ERROR'
      };
    }
  }

  /**
   * 检查学期是否已有全量同步记录
   */
  async hasFullSyncRecord(xnxq: string): Promise<ServiceResult<boolean>> {
    try {
      this.logger.debug('检查学期全量同步记录', { xnxq });

      const instancesResult = await this.getSyncInstancesByType(xnxq, 'full');

      if (!instancesResult.success) {
        return {
          success: false,
          error: instancesResult.error,
          errorCode: instancesResult.errorCode
        };
      }

      const hasRecord = (instancesResult.data?.length || 0) > 0;

      return {
        success: true,
        data: hasRecord
      };
    } catch (error) {
      this.logger.error('检查全量同步记录异常', { xnxq, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'RECORD_CHECK_ERROR'
      };
    }
  }

  /**
   * 获取学期当前运行中的同步实例
   */
  async getRunningSync(
    xnxq: string
  ): Promise<ServiceResult<RunningSyncInfo | null>> {
    try {
      this.logger.debug('获取运行中的同步实例', { xnxq });

      const allTypes: SyncType[] = ['full', 'incremental', 'user'];

      for (const syncType of allTypes) {
        const instancesResult = await this.getSyncInstancesByType(
          xnxq,
          syncType
        );

        if (instancesResult.success && instancesResult.data) {
          // 查找运行中的实例
          const runningInstance = instancesResult.data.find((instance) =>
            ['pending', 'running', 'paused'].includes(instance.status)
          );

          if (runningInstance) {
            return {
              success: true,
              data: {
                syncType,
                instance: runningInstance,
                startedAt:
                  runningInstance.startedAt || runningInstance.createdAt
              }
            };
          }
        }
      }

      return {
        success: true,
        data: null
      };
    } catch (error) {
      this.logger.error('获取运行中同步实例异常', { xnxq, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'RUNNING_SYNC_QUERY_ERROR'
      };
    }
  }

  /**
   * 查找指定学期和同步类型的最新实例
   */
  async getLatestSyncInstance(
    xnxq: string,
    syncType: SyncType
  ): Promise<ServiceResult<WorkflowInstance | null>> {
    try {
      this.logger.debug('获取最新同步实例', { xnxq, syncType });

      const instancesResult = await this.getSyncInstancesByType(xnxq, syncType);

      if (!instancesResult.success) {
        return {
          success: false,
          error: instancesResult.error,
          errorCode: instancesResult.errorCode
        };
      }

      const instances = instancesResult.data || [];
      const latestInstance = instances.length > 0 ? instances[0] : null; // 已按时间倒序

      return {
        success: true,
        data: latestInstance
      };
    } catch (error) {
      this.logger.error('获取最新同步实例异常', { xnxq, syncType, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'LATEST_INSTANCE_QUERY_ERROR'
      };
    }
  }

  /**
   * 查找指定学期和同步类型的所有历史实例
   */
  async getSyncInstancesByType(
    xnxq: string,
    syncType: SyncType
  ): Promise<ServiceResult<WorkflowInstance[]>> {
    try {
      this.logger.debug('查询同步实例', { xnxq, syncType });

      // 构建查询过滤器，使用业务键模式匹配
      const businessKeyPattern = `${syncType}-sync-${xnxq}`;

      // 通过tasksWorkflow adapter查询工作流实例
      const listResult = await this.tasksWorkflow.listWorkflowInstances({
        businessKey: businessKeyPattern
      });

      if (!listResult.success) {
        this.logger.error('查询工作流实例失败', {
          xnxq,
          syncType,
          error: listResult.error
        });
        return {
          success: false,
          error: listResult.error || '查询工作流实例失败',
          errorCode: 'WORKFLOW_QUERY_ERROR'
        };
      }

      // 提取实例数据（处理分页结果）
      let instances: WorkflowInstance[] = [];
      if (listResult.data) {
        // listWorkflowInstances返回PaginatedResult<WorkflowInstance>
        const paginatedResult =
          listResult.data as unknown as PaginatedResult<WorkflowInstance>;
        instances = paginatedResult.items || [];
      }

      // 按创建时间倒序排列
      instances.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      this.logger.debug('查询同步实例完成', {
        xnxq,
        syncType,
        count: instances.length
      });

      return {
        success: true,
        data: instances
      };
    } catch (error) {
      this.logger.error('查询同步实例异常', { xnxq, syncType, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'SYNC_INSTANCES_QUERY_ERROR'
      };
    }
  }

  /**
   * 将工作流实例映射为历史记录
   */
  private mapInstanceToHistory(
    instance: WorkflowInstance,
    xnxq: string,
    syncType: SyncType
  ): SemesterSyncHistory {
    const isCompleted = [
      'completed',
      'failed',
      'cancelled',
      'timeout'
    ].includes(instance.status);
    const isRunning = ['pending', 'running', 'paused'].includes(
      instance.status
    );

    return {
      xnxq,
      syncType,
      instance,
      executedAt: instance.createdAt,
      isCompleted,
      isRunning
    };
  }
}
