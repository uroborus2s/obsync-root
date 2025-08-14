/**
 * 执行日志仓储实现
 *
 * 提供工作流执行日志的数据访问方法
 * 版本: v3.0.0-refactored
 */

import type { Logger } from '@stratix/core';
import type {
  DatabaseAPI,
  DatabaseResult,
  PaginationOptions
} from '@stratix/database';
import { DatabaseErrorHandler, QueryError } from '@stratix/database';
import type { IExecutionLogRepository } from '../interfaces/repositories.js';
import type {
  NewWorkflowExecutionLog,
  WorkflowExecutionLog,
  WorkflowExecutionLogUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 执行日志仓储实现
 */
export default class ExecutionLogRepository
  extends BaseTasksRepository<
    'workflow_execution_logs',
    WorkflowExecutionLog,
    NewWorkflowExecutionLog,
    WorkflowExecutionLogUpdate
  >
  implements IExecutionLogRepository
{
  protected readonly tableName = 'workflow_execution_logs' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super();
  }

  /**
   * 创建执行日志
   */
  async create(
    log: NewWorkflowExecutionLog
  ): Promise<DatabaseResult<WorkflowExecutionLog>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.logger.debug('Creating execution log', { log });

      const logData = {
        ...log,
        timestamp: log.timestamp || new Date(),
        details: log.details ? JSON.stringify(log.details) : null
      };

      const result = await super.create(logData);
      if (!result.success) {
        throw QueryError.create('Failed to create execution log');
      }

      return result.data;
    }, 'create execution log');
  }

  /**
   * 批量创建执行日志
   */
  async createMany(
    logs: NewWorkflowExecutionLog[]
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.logger.debug('Creating multiple execution logs', {
        count: logs.length
      });

      const processedLogs = logs.map((log) => ({
        ...log,
        timestamp: log.timestamp || new Date(),
        details: log.details ? JSON.stringify(log.details) : null
      }));

      const result = await super.createMany(processedLogs);
      if (!result.success) {
        throw QueryError.create('Failed to create multiple execution logs');
      }

      return result.data;
    }, 'create multiple execution logs');
  }

  /**
   * 根据工作流实例ID查找日志
   */
  async findByWorkflowInstanceId(
    workflowInstanceId: number,
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.logger.debug('Finding logs by workflow instance ID', {
        workflowInstanceId,
        pagination
      });

      const whereExpression = (qb: any) =>
        qb.where('workflow_instance_id', '=', workflowInstanceId);

      const options = {
        orderBy: [{ field: 'timestamp', direction: 'desc' as const }],
        ...(pagination && {
          limit: pagination.pageSize,
          offset: (pagination.page - 1) * pagination.pageSize
        })
      };

      const result = await this.findMany(whereExpression, options);
      if (!result.success) {
        throw QueryError.create('Failed to find logs by workflow instance ID');
      }

      return result.data;
    }, 'find logs by workflow instance ID');
  }

  /**
   * 根据节点实例ID查找日志
   */
  async findByNodeInstanceId(
    nodeInstanceId: number,
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.logger.debug('Finding logs by node instance ID', {
        nodeInstanceId,
        pagination
      });

      const whereExpression = (qb: any) =>
        qb.where('node_instance_id', '=', nodeInstanceId);

      const options = {
        orderBy: [{ field: 'timestamp', direction: 'desc' as const }],
        ...(pagination && {
          limit: pagination.pageSize,
          offset: (pagination.page - 1) * pagination.pageSize
        })
      };

      const result = await this.findMany(whereExpression, options);
      if (!result.success) {
        throw QueryError.create('Failed to find logs by node instance ID');
      }

      return result.data;
    }, 'find logs by node instance ID');
  }

  /**
   * 根据日志级别查找日志
   */
  async findByLevel(
    level: 'debug' | 'info' | 'warn' | 'error',
    pagination?: PaginationOptions
  ): Promise<DatabaseResult<WorkflowExecutionLog[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.logger.debug('Finding logs by level', { level, pagination });

      const whereExpression = (qb: any) => qb.where('level', '=', level);

      const options = {
        orderBy: [{ field: 'timestamp', direction: 'desc' as const }],
        ...(pagination && {
          limit: pagination.pageSize,
          offset: (pagination.page - 1) * pagination.pageSize
        })
      };

      const result = await this.findMany(whereExpression, options);
      if (!result.success) {
        throw QueryError.create('Failed to find logs by level');
      }

      return result.data;
    }, 'find logs by level');
  }

  /**
   * 删除过期日志 - 实现接口要求的方法
   */
  async deleteExpiredLogs(beforeDate: Date): Promise<DatabaseResult<number>> {
    return await DatabaseErrorHandler.execute(async () => {
      this.logger.info('Deleting expired logs', { beforeDate });

      const whereExpression = (qb: any) =>
        qb.where('timestamp', '<', beforeDate);
      const result = await this.deleteMany(whereExpression);

      if (!result.success) {
        throw QueryError.create('Failed to delete expired logs');
      }

      this.logger.info('Expired logs deleted', {
        deletedCount: result.data,
        beforeDate
      });
      return result.data;
    }, 'delete expired logs');
  }

  /**
   * 清理过期日志 - 便捷方法
   */
  async cleanupOldLogs(
    olderThanDays: number = 30
  ): Promise<DatabaseResult<number>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    return await this.deleteExpiredLogs(cutoffDate);
  }

  /**
   * 获取日志统计信息
   */
  async getLogStats(): Promise<
    DatabaseResult<{
      total: number;
      byLevel: Record<string, number>;
      recentCount: number;
    }>
  > {
    return await DatabaseErrorHandler.execute(async () => {
      this.logger.debug('Getting log statistics');

      // 获取总数
      const totalResult = await this.count();
      if (!totalResult.success) {
        throw QueryError.create('Failed to get total count');
      }

      // 按级别统计 - 使用简化的方法
      const levelStats = await this.databaseApi.executeQuery(
        async (db: any) => {
          return await db
            .selectFrom(this.tableName)
            .select(['level', db.fn.count('id').as('count')])
            .groupBy('level')
            .execute();
        }
      );

      if (!levelStats.success) {
        throw QueryError.create('Failed to get level statistics');
      }

      // 最近24小时的日志数量
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentWhereExpression = (qb: any) =>
        qb.where('timestamp', '>=', yesterday);
      const recentResult = await this.count(recentWhereExpression);

      if (!recentResult.success) {
        throw QueryError.create('Failed to get recent count');
      }

      // 处理级别统计数据
      const byLevel: Record<string, number> = {};
      if (levelStats.data) {
        for (const stat of levelStats.data as any[]) {
          byLevel[stat.level] = Number(stat.count);
        }
      }

      return {
        total: totalResult.data,
        byLevel,
        recentCount: recentResult.data
      };
    }, 'get log statistics');
  }
}
