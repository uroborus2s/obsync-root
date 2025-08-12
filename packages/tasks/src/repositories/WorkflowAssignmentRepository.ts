/**
 * 工作流分配记录仓储
 *
 * 提供工作流分配记录的数据访问方法
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type {
  NewWorkflowAssignment,
  WorkflowAssignment,
  WorkflowAssignmentUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 分配状态类型
 */
export type AssignmentStatus =
  | 'assigned'
  | 'running'
  | 'completed'
  | 'failed'
  | 'transferred';

/**
 * 工作流分配记录仓储接口
 */
export interface IWorkflowAssignmentRepository {
  /**
   * 根据工作流实例ID查找分配记录
   * @param workflowInstanceId 工作流实例ID
   * @returns 分配记录列表
   */
  findByWorkflowInstanceId(
    workflowInstanceId: number
  ): Promise<DatabaseResult<WorkflowAssignment[]>>;

  /**
   * 根据引擎ID查找分配记录
   * @param engineId 引擎实例ID
   * @returns 分配记录列表
   */
  findByEngineId(
    engineId: string
  ): Promise<DatabaseResult<WorkflowAssignment[]>>;

  /**
   * 根据状态查找分配记录
   * @param status 分配状态
   * @returns 分配记录列表
   */
  findByStatus(
    status: AssignmentStatus
  ): Promise<DatabaseResult<WorkflowAssignment[]>>;

  /**
   * 根据分配策略查找分配记录
   * @param strategy 分配策略
   * @returns 分配记录列表
   */
  findByStrategy(
    strategy: string
  ): Promise<DatabaseResult<WorkflowAssignment[]>>;

  /**
   * 查找当前活跃的分配记录
   * @param engineId 引擎实例ID（可选）
   * @returns 活跃的分配记录列表
   */
  findActiveAssignments(
    engineId?: string
  ): Promise<DatabaseResult<WorkflowAssignment[]>>;

  /**
   * 查找最新的分配记录
   * @param workflowInstanceId 工作流实例ID
   * @returns 最新的分配记录或null
   */
  findLatestAssignment(
    workflowInstanceId: number
  ): Promise<DatabaseResult<WorkflowAssignment | null>>;

  /**
   * 创建分配记录
   * @param data 分配记录数据
   * @returns 创建的分配记录
   */
  createAssignment(
    data: NewWorkflowAssignment
  ): Promise<DatabaseResult<WorkflowAssignment>>;

  /**
   * 更新分配状态
   * @param id 分配记录ID
   * @param status 新状态
   * @param additionalData 额外数据
   * @returns 更新的分配记录
   */
  updateStatus(
    id: number,
    status: AssignmentStatus,
    additionalData?: Partial<WorkflowAssignmentUpdate>
  ): Promise<DatabaseResult<WorkflowAssignment | null>>;

  /**
   * 完成分配
   * @param id 分配记录ID
   * @returns 更新的分配记录
   */
  completeAssignment(
    id: number
  ): Promise<DatabaseResult<WorkflowAssignment | null>>;

  /**
   * 转移分配
   * @param id 分配记录ID
   * @param newEngineId 新引擎实例ID
   * @param reason 转移原因
   * @returns 新的分配记录
   */
  transferAssignment(
    id: number,
    newEngineId: string,
    reason: string
  ): Promise<DatabaseResult<WorkflowAssignment>>;

  /**
   * 获取分配统计信息
   * @param engineId 引擎实例ID（可选）
   * @returns 统计信息
   */
  getStatistics(engineId?: string): Promise<
    DatabaseResult<{
      totalAssignments: number;
      activeAssignments: number;
      completedAssignments: number;
      failedAssignments: number;
      transferredAssignments: number;
      averageExecutionTime: number;
    }>
  >;
}

/**
 * 工作流分配记录仓储实现
 */
export default class WorkflowAssignmentRepository
  extends BaseTasksRepository<
    'workflow_assignments',
    WorkflowAssignment,
    NewWorkflowAssignment,
    WorkflowAssignmentUpdate
  >
  implements IWorkflowAssignmentRepository
{
  protected readonly tableName = 'workflow_assignments' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findByWorkflowInstanceId(
    workflowInstanceId: number
  ): Promise<DatabaseResult<WorkflowAssignment[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('workflow_instance_id', '=', workflowInstanceId)
        .orderBy('assigned_at', 'desc')
    );
  }

  async findByEngineId(
    engineId: string
  ): Promise<DatabaseResult<WorkflowAssignment[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('assigned_engine_id', '=', engineId)
        .orderBy('assigned_at', 'desc')
    );
  }

  async findByStatus(
    status: AssignmentStatus
  ): Promise<DatabaseResult<WorkflowAssignment[]>> {
    return await this.findMany((qb: any) =>
      qb.where('status', '=', status).orderBy('assigned_at', 'desc')
    );
  }

  async findByStrategy(
    strategy: string
  ): Promise<DatabaseResult<WorkflowAssignment[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('assignment_strategy', '=', strategy)
        .orderBy('assigned_at', 'desc')
    );
  }

  async findActiveAssignments(
    engineId?: string
  ): Promise<DatabaseResult<WorkflowAssignment[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.whereIn('status', ['assigned', 'running']);

      if (engineId) {
        qb = qb.where('assigned_engine_id', '=', engineId);
      }

      return qb.orderBy('assigned_at', 'asc');
    });
  }

  async findLatestAssignment(
    workflowInstanceId: number
  ): Promise<DatabaseResult<WorkflowAssignment | null>> {
    return await this.findOneNullable((qb: any) =>
      qb
        .where('workflow_instance_id', '=', workflowInstanceId)
        .orderBy('assigned_at', 'desc')
    );
  }

  async createAssignment(
    data: NewWorkflowAssignment
  ): Promise<DatabaseResult<WorkflowAssignment>> {
    const createData = {
      ...data,
      assigned_at: new Date(),
      status: 'assigned' as AssignmentStatus
    };

    this.logger.info('Creating workflow assignment', {
      workflowInstanceId: data.workflow_instance_id,
      engineId: data.assigned_engine_id,
      strategy: data.assignment_strategy
    });

    return await this.create(createData);
  }

  async updateStatus(
    id: number,
    status: AssignmentStatus,
    additionalData?: Partial<WorkflowAssignmentUpdate>
  ): Promise<DatabaseResult<WorkflowAssignment | null>> {
    const updateData: WorkflowAssignmentUpdate = {
      status,
      updated_at: new Date(),
      ...additionalData
    };

    // 根据状态设置相应的时间戳
    if (status === 'completed' && !additionalData?.completed_at) {
      updateData.completed_at = new Date();
    }

    const result = await this.updateNullable(id, updateData);

    if (result.success && result.data) {
      this.logger.info('Assignment status updated', {
        id,
        status,
        workflowInstanceId: result.data.workflow_instance_id
      });
    }

    return result;
  }

  async completeAssignment(
    id: number
  ): Promise<DatabaseResult<WorkflowAssignment | null>> {
    return await this.updateStatus(id, 'completed', {
      completed_at: new Date()
    });
  }

  async transferAssignment(
    id: number,
    newEngineId: string,
    reason: string
  ): Promise<DatabaseResult<WorkflowAssignment>> {
    // 首先标记原分配为已转移
    const originalResult = await this.updateStatus(id, 'transferred');
    if (!originalResult.success || !originalResult.data) {
      return {
        success: false,
        error: 'Failed to mark original assignment as transferred' as any
      };
    }

    // 创建新的分配记录
    const newAssignmentData: NewWorkflowAssignment = {
      workflow_instance_id: originalResult.data.workflow_instance_id,
      assigned_engine_id: newEngineId,
      assignment_strategy: originalResult.data.assignment_strategy,
      assignment_reason: reason,
      status: 'assigned',
      assigned_at: new Date(),
      completed_at: null
    };

    this.logger.info('Transferring workflow assignment', {
      originalId: id,
      newEngineId,
      reason,
      workflowInstanceId: originalResult.data.workflow_instance_id
    });

    return await this.createAssignment(newAssignmentData);
  }

  async getStatistics(engineId?: string): Promise<
    DatabaseResult<{
      totalAssignments: number;
      activeAssignments: number;
      completedAssignments: number;
      failedAssignments: number;
      transferredAssignments: number;
      averageExecutionTime: number;
    }>
  > {
    try {
      const baseQuery = (qb: any) => {
        if (engineId) {
          return qb.where('assigned_engine_id', '=', engineId);
        }
        return qb;
      };

      const totalResult = await this.count(baseQuery);
      const activeResult = await this.count((qb: any) =>
        baseQuery(qb).whereIn('status', ['assigned', 'running'])
      );
      const completedResult = await this.count((qb: any) =>
        baseQuery(qb).where('status', '=', 'completed')
      );
      const failedResult = await this.count((qb: any) =>
        baseQuery(qb).where('status', '=', 'failed')
      );
      const transferredResult = await this.count((qb: any) =>
        baseQuery(qb).where('status', '=', 'transferred')
      );

      // 暂时返回0，实际计算平均执行时间需要更复杂的查询
      const averageExecutionTime = 0;

      return {
        success: true,
        data: {
          totalAssignments: totalResult.success ? totalResult.data : 0,
          activeAssignments: activeResult.success ? activeResult.data : 0,
          completedAssignments: completedResult.success
            ? completedResult.data
            : 0,
          failedAssignments: failedResult.success ? failedResult.data : 0,
          transferredAssignments: transferredResult.success
            ? transferredResult.data
            : 0,
          averageExecutionTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error as any
      };
    }
  }
}
