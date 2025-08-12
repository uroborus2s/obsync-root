/**
 * 工作流执行日志仓储
 *
 * 提供工作流执行日志的数据访问方法
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type { QueryOptions } from '../types/common.js';
import type {
  NewWorkflowExecutionLog,
  WorkflowExecutionLog,
  WorkflowExecutionLogUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 日志级别类型
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志查询选项
 */
export interface LogQueryOptions extends QueryOptions {
  level?: LogLevel | LogLevel[];
  workflowInstanceId?: number;
  taskNodeId?: number;
  nodeId?: string;
  engineInstanceId?: string;
  startTime?: Date;
  endTime?: Date;
}

/**
 * 工作流执行日志仓储接口
 */
export interface IWorkflowExecutionLogRepository {
  /**
   * 根据工作流实例ID查找执行日志
   * @param workflowInstanceId 工作流实例ID
   * @param options 查询选项
   * @returns 执行日志列表
   */
  findByWorkflowInstanceId(
    workflowInstanceId: number,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 根据任务节点ID查找执行日志
   * @param taskNodeId 任务节点ID
   * @param options 查询选项
   * @returns 执行日志列表
   */
  findByTaskNodeId(
    taskNodeId: number,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 根据节点ID查找执行日志
   * @param nodeId 节点ID
   * @param options 查询选项
   * @returns 执行日志列表
   */
  findByNodeId(
    nodeId: string,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 根据日志级别查找执行日志
   * @param level 日志级别
   * @param options 查询选项
   * @returns 执行日志列表
   */
  findByLevel(
    level: LogLevel | LogLevel[],
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 根据引擎实例ID查找执行日志
   * @param engineInstanceId 引擎实例ID
   * @param options 查询选项
   * @returns 执行日志列表
   */
  findByEngineInstanceId(
    engineInstanceId: string,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 根据时间范围查找执行日志
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param options 查询选项
   * @returns 执行日志列表
   */
  findByTimeRange(
    startTime: Date,
    endTime: Date,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 搜索日志消息
   * @param keyword 关键词
   * @param options 查询选项
   * @returns 执行日志列表
   */
  searchLogs(
    keyword: string,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 批量创建执行日志
   * @param logs 日志数据列表
   * @returns 创建的日志列表
   */
  createLogs(
    logs: NewWorkflowExecutionLog[]
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>>;

  /**
   * 清理过期的执行日志
   * @param olderThanDays 保留天数
   * @returns 删除的记录数
   */
  cleanupOldLogs(olderThanDays: number): Promise<DatabaseResult<number>>;

  /**
   * 获取日志统计信息
   * @param workflowInstanceId 工作流实例ID（可选）
   * @returns 统计信息
   */
  getStatistics(workflowInstanceId?: number): Promise<
    DatabaseResult<{
      totalLogs: number;
      debugLogs: number;
      infoLogs: number;
      warnLogs: number;
      errorLogs: number;
      recentErrorCount: number;
    }>
  >;
}

/**
 * 工作流执行日志仓储实现
 */
export default class WorkflowExecutionLogRepository
  extends BaseTasksRepository<
    'workflow_execution_logs',
    WorkflowExecutionLog,
    NewWorkflowExecutionLog,
    WorkflowExecutionLogUpdate
  >
  implements IWorkflowExecutionLogRepository
{
  protected readonly tableName = 'workflow_execution_logs' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findByWorkflowInstanceId(
    workflowInstanceId: number,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('workflow_instance_id', '=', workflowInstanceId);

      if (options?.level) {
        qb = this.queryByLevel(options.level)(qb);
      }

      if (options?.startTime) {
        qb = qb.where('timestamp', '>=', options.startTime);
      }

      if (options?.endTime) {
        qb = qb.where('timestamp', '<=', options.endTime);
      }

      return qb.orderBy('timestamp', 'desc');
    });
  }

  async findByTaskNodeId(
    taskNodeId: number,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('task_node_id', '=', taskNodeId);

      if (options?.level) {
        qb = this.queryByLevel(options.level)(qb);
      }

      return qb.orderBy('timestamp', 'desc');
    });
  }

  async findByNodeId(
    nodeId: string,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('node_id', '=', nodeId);

      if (options?.level) {
        qb = this.queryByLevel(options.level)(qb);
      }

      if (options?.workflowInstanceId) {
        qb = qb.where('workflow_instance_id', '=', options.workflowInstanceId);
      }

      return qb.orderBy('timestamp', 'desc');
    });
  }

  async findByLevel(
    level: LogLevel | LogLevel[],
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await this.findMany((qb: any) => {
      qb = this.queryByLevel(level)(qb);

      if (options?.workflowInstanceId) {
        qb = qb.where('workflow_instance_id', '=', options.workflowInstanceId);
      }

      if (options?.engineInstanceId) {
        qb = qb.where('engine_instance_id', '=', options.engineInstanceId);
      }

      return qb.orderBy('timestamp', 'desc');
    });
  }

  async findByEngineInstanceId(
    engineInstanceId: string,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('engine_instance_id', '=', engineInstanceId);

      if (options?.level) {
        qb = this.queryByLevel(options.level)(qb);
      }

      if (options?.workflowInstanceId) {
        qb = qb.where('workflow_instance_id', '=', options.workflowInstanceId);
      }

      return qb.orderBy('timestamp', 'desc');
    });
  }

  async findByTimeRange(
    startTime: Date,
    endTime: Date,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await this.findMany((qb: any) => {
      qb = qb
        .where('timestamp', '>=', startTime)
        .where('timestamp', '<=', endTime);

      if (options?.level) {
        qb = this.queryByLevel(options.level)(qb);
      }

      if (options?.workflowInstanceId) {
        qb = qb.where('workflow_instance_id', '=', options.workflowInstanceId);
      }

      if (options?.engineInstanceId) {
        qb = qb.where('engine_instance_id', '=', options.engineInstanceId);
      }

      return qb.orderBy('timestamp', 'desc');
    });
  }

  async searchLogs(
    keyword: string,
    options?: LogQueryOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('message', 'like', `%${keyword}%`);

      if (options?.level) {
        qb = this.queryByLevel(options.level)(qb);
      }

      if (options?.workflowInstanceId) {
        qb = qb.where('workflow_instance_id', '=', options.workflowInstanceId);
      }

      return qb.orderBy('timestamp', 'desc');
    });
  }

  async createLogs(
    logs: NewWorkflowExecutionLog[]
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    // 为每个日志添加时间戳
    const logsWithTimestamp = logs.map((log) => ({
      ...log,
      timestamp: log.timestamp || new Date()
    }));

    return await this.createMany(logsWithTimestamp);
  }

  async cleanupOldLogs(olderThanDays: number): Promise<DatabaseResult<number>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.deleteMany((qb: any) =>
      qb.where('timestamp', '<', cutoffDate)
    );

    if (result.success && result.data > 0) {
      this.logger.info('Cleaned up old execution logs', {
        deletedCount: result.data,
        cutoffDate
      });
    }

    return result;
  }

  async getStatistics(workflowInstanceId?: number): Promise<
    DatabaseResult<{
      totalLogs: number;
      debugLogs: number;
      infoLogs: number;
      warnLogs: number;
      errorLogs: number;
      recentErrorCount: number;
    }>
  > {
    try {
      const baseQuery = (qb: any) => {
        if (workflowInstanceId) {
          return qb.where('workflow_instance_id', '=', workflowInstanceId);
        }
        return qb;
      };

      const totalResult = await this.count(baseQuery);
      const debugResult = await this.count((qb: any) =>
        baseQuery(qb).where('level', '=', 'debug')
      );
      const infoResult = await this.count((qb: any) =>
        baseQuery(qb).where('level', '=', 'info')
      );
      const warnResult = await this.count((qb: any) =>
        baseQuery(qb).where('level', '=', 'warn')
      );
      const errorResult = await this.count((qb: any) =>
        baseQuery(qb).where('level', '=', 'error')
      );

      // 计算最近24小时的错误数量
      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const recentErrorResult = await this.count((qb: any) =>
        baseQuery(qb)
          .where('level', '=', 'error')
          .where('timestamp', '>=', last24Hours)
      );

      return {
        success: true,
        data: {
          totalLogs: totalResult.success ? totalResult.data : 0,
          debugLogs: debugResult.success ? debugResult.data : 0,
          infoLogs: infoResult.success ? infoResult.data : 0,
          warnLogs: warnResult.success ? warnResult.data : 0,
          errorLogs: errorResult.success ? errorResult.data : 0,
          recentErrorCount: recentErrorResult.success
            ? recentErrorResult.data
            : 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 根据日志级别查询的辅助方法
   */
  private queryByLevel(level: LogLevel | LogLevel[]) {
    if (Array.isArray(level)) {
      return (qb: any) => qb.whereIn('level', level);
    }
    return (qb: any) => qb.where('level', '=', level);
  }
}
