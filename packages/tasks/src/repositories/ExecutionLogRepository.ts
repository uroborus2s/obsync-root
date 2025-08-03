/**
 * 执行记录仓储
 *
 * 负责执行日志的数据访问操作
 */

import { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type { ExecutionLog, NewExecutionLog } from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 执行记录仓储接口
 */
export interface IExecutionLogRepository {
  /**
   * 根据工作流实例ID查找执行记录
   */
  findByWorkflowInstanceId(
    workflowInstanceId: number
  ): Promise<DatabaseResult<ExecutionLog[]>>;

  /**
   * 根据任务节点ID查找执行记录
   */
  findByTaskNodeId(taskNodeId: number): Promise<DatabaseResult<ExecutionLog[]>>;

  /**
   * 根据日志级别查找执行记录
   */
  findByLogLevel(logLevel: string): Promise<DatabaseResult<ExecutionLog[]>>;

  /**
   * 根据执行阶段查找执行记录
   */
  findByExecutionPhase(phase: string): Promise<DatabaseResult<ExecutionLog[]>>;

  /**
   * 根据时间范围查找执行记录
   */
  findByTimeRange(
    startTime: Date,
    endTime: Date,
    workflowInstanceId?: number
  ): Promise<DatabaseResult<ExecutionLog[]>>;

  /**
   * 批量创建执行记录
   */
  createMany(data: NewExecutionLog[]): Promise<DatabaseResult<ExecutionLog[]>>;

  /**
   * 清理过期的执行记录
   */
  cleanupOldLogs(olderThanDays: number): Promise<DatabaseResult<number>>;
}

/**
 * 执行记录仓储实现
 */
export class ExecutionLogRepository
  extends BaseTasksRepository<
    'execution_logs',
    ExecutionLog,
    NewExecutionLog,
    Partial<ExecutionLog>
  >
  implements IExecutionLogRepository
{
  protected readonly tableName = 'execution_logs' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  /**
   * 根据工作流实例ID查找执行记录
   */
  async findByWorkflowInstanceId(
    workflowInstanceId: number
  ): Promise<DatabaseResult<ExecutionLog[]>> {
    const whereExpression = (qb: any) =>
      qb.where('workflow_instance_id', '=', workflowInstanceId);

    return await this.findMany(whereExpression, {
      orderBy: { field: 'timestamp', direction: 'desc' }
    });
  }

  /**
   * 根据任务节点ID查找执行记录
   */
  async findByTaskNodeId(
    taskNodeId: number
  ): Promise<DatabaseResult<ExecutionLog[]>> {
    const whereExpression = (qb: any) =>
      qb.where('task_node_id', '=', taskNodeId);

    return await this.findMany(whereExpression, {
      orderBy: { field: 'timestamp', direction: 'desc' }
    });
  }

  /**
   * 根据日志级别查找执行记录
   */
  async findByLogLevel(
    logLevel: string
  ): Promise<DatabaseResult<ExecutionLog[]>> {
    const whereExpression = (qb: any) => qb.where('log_level', '=', logLevel);

    return await this.findMany(whereExpression, {
      orderBy: { field: 'timestamp', direction: 'desc' }
    });
  }

  /**
   * 根据执行阶段查找执行记录
   */
  async findByExecutionPhase(
    phase: string
  ): Promise<DatabaseResult<ExecutionLog[]>> {
    const whereExpression = (qb: any) =>
      qb.where('execution_phase', '=', phase);

    return await this.findMany(whereExpression, {
      orderBy: { field: 'timestamp', direction: 'desc' }
    });
  }

  /**
   * 根据时间范围查找执行记录
   */
  async findByTimeRange(
    startTime: Date,
    endTime: Date,
    workflowInstanceId?: number
  ): Promise<DatabaseResult<ExecutionLog[]>> {
    const whereExpression = (qb: any) => {
      qb = qb
        .where('timestamp', '>=', startTime)
        .where('timestamp', '<=', endTime);

      if (workflowInstanceId) {
        qb = qb.where('workflow_instance_id', '=', workflowInstanceId);
      }

      return qb;
    };

    return await this.findMany(whereExpression, {
      orderBy: { field: 'timestamp', direction: 'desc' }
    });
  }

  /**
   * 批量创建执行记录
   */
  async createMany(
    data: NewExecutionLog[]
  ): Promise<DatabaseResult<ExecutionLog[]>> {
    return await super.createMany(data);
  }

  /**
   * 清理过期的执行记录
   */
  async cleanupOldLogs(olderThanDays: number): Promise<DatabaseResult<number>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const whereExpression = (qb: any) => qb.where('timestamp', '<', cutoffDate);

    return await this.deleteMany(whereExpression);
  }
}
