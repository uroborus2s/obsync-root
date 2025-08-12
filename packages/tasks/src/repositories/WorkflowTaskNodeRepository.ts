/**
 * 工作流任务节点仓储
 *
 * 提供工作流任务节点的数据访问方法
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type { QueryOptions } from '../types/common.js';
import type {
  NewWorkflowTaskNode,
  WorkflowTaskNode,
  WorkflowTaskNodeUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 任务节点状态类型
 */
export type TaskNodeStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

/**
 * 任务节点类型
 */
export type TaskNodeType =
  | 'task'
  | 'loop'
  | 'parallel'
  | 'condition'
  | 'subprocess'
  | 'start'
  | 'end';

/**
 * 任务节点查询条件
 */
export interface TaskNodeQueryOptions extends QueryOptions {
  status?: TaskNodeStatus | TaskNodeStatus[];
  workflowInstanceId?: number;
  executor?: string;
  nodeType?: TaskNodeType;
  parallelGroupId?: string;
  assignedEngineId?: string;
}

/**
 * 工作流任务节点仓储接口
 */
export interface IWorkflowTaskNodeRepository {
  // 基础CRUD操作（继承自BaseTasksRepository）
  findByIdNullable(
    id: number
  ): Promise<DatabaseResult<WorkflowTaskNode | null>>;
  create(data: NewWorkflowTaskNode): Promise<DatabaseResult<WorkflowTaskNode>>;
  updateNullable(
    id: number,
    data: WorkflowTaskNodeUpdate
  ): Promise<DatabaseResult<WorkflowTaskNode | null>>;
  findMany(
    criteria?: any,
    options?: any
  ): Promise<DatabaseResult<WorkflowTaskNode[]>>;
  count(criteria?: any): Promise<DatabaseResult<number>>;
  delete(id: number): Promise<DatabaseResult<boolean>>;

  // 业务特定方法
  /**
   * 根据工作流实例ID查找任务节点
   * @param workflowInstanceId 工作流实例ID
   * @param options 查询选项
   * @returns 任务节点列表
   */
  findByWorkflowInstanceId(
    workflowInstanceId: number,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<WorkflowTaskNode[]>>;

  /**
   * 根据状态查找任务节点
   * @param status 状态或状态列表
   * @param options 查询选项
   * @returns 任务节点列表
   */
  findByStatus(
    status: TaskNodeStatus | TaskNodeStatus[],
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<WorkflowTaskNode[]>>;

  /**
   * 根据节点ID查找任务节点
   * @param workflowInstanceId 工作流实例ID
   * @param nodeId 节点ID
   * @returns 任务节点或null
   */
  findByNodeId(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<DatabaseResult<WorkflowTaskNode | null>>;

  /**
   * 查找可执行的任务节点
   * @param limit 限制数量
   * @returns 任务节点列表
   */
  findExecutableNodes(
    limit?: number
  ): Promise<DatabaseResult<WorkflowTaskNode[]>>;

  /**
   * 查找依赖的任务节点
   * @param workflowInstanceId 工作流实例ID
   * @param nodeId 节点ID
   * @returns 依赖的任务节点列表
   */
  findDependencies(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<DatabaseResult<WorkflowTaskNode[]>>;

  /**
   * 查找子任务节点
   * @param parentNodeId 父节点ID
   * @param options 查询选项
   * @returns 子任务节点列表
   */
  findChildNodes(
    parentNodeId: number,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<WorkflowTaskNode[]>>;

  /**
   * 查找并行组中的任务节点
   * @param parallelGroupId 并行组ID
   * @param options 查询选项
   * @returns 任务节点列表
   */
  findByParallelGroup(
    parallelGroupId: string,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<WorkflowTaskNode[]>>;

  /**
   * 根据分配的引擎ID查找任务节点
   * @param engineId 引擎实例ID
   * @returns 任务节点列表
   */
  findByAssignedEngine(
    engineId: string
  ): Promise<DatabaseResult<WorkflowTaskNode[]>>;

  /**
   * 更新任务状态
   * @param id 节点ID
   * @param status 新状态
   * @param additionalData 额外数据
   * @returns 更新的节点
   */
  updateStatus(
    id: number,
    status: TaskNodeStatus,
    additionalData?: Partial<WorkflowTaskNodeUpdate>
  ): Promise<DatabaseResult<WorkflowTaskNode | null>>;

  /**
   * 批量更新状态
   * @param ids ID列表
   * @param status 新状态
   * @returns 更新的记录数
   */
  batchUpdateStatus(
    ids: number[],
    status: TaskNodeStatus
  ): Promise<DatabaseResult<number>>;

  /**
   * 获取执行统计信息
   * @param workflowInstanceId 工作流实例ID
   * @returns 统计信息
   */
  getExecutionStats(workflowInstanceId: number): Promise<
    DatabaseResult<{
      totalNodes: number;
      completedNodes: number;
      failedNodes: number;
      runningNodes: number;
      pendingNodes: number;
      averageDuration: number;
    }>
  >;
}

/**
 * 工作流任务节点仓储实现
 */
export default class WorkflowTaskNodeRepository
  extends BaseTasksRepository<
    'workflow_task_nodes',
    WorkflowTaskNode,
    NewWorkflowTaskNode,
    WorkflowTaskNodeUpdate
  >
  implements IWorkflowTaskNodeRepository
{
  protected readonly tableName = 'workflow_task_nodes' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findByWorkflowInstanceId(
    workflowInstanceId: number,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<WorkflowTaskNode[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('workflow_instance_id', '=', workflowInstanceId);

      if (options?.status) {
        qb = this.queryByStatus(options.status)(qb);
      }

      if (options?.executor) {
        qb = qb.where('executor', '=', options.executor);
      }

      if (options?.nodeType) {
        qb = qb.where('node_type', '=', options.nodeType);
      }

      if (options?.parallelGroupId) {
        qb = qb.where('parallel_group_id', '=', options.parallelGroupId);
      }

      if (options?.assignedEngineId) {
        qb = qb.where('assigned_engine_id', '=', options.assignedEngineId);
      }

      return qb.orderBy('created_at', 'asc');
    });
  }

  async findByStatus(
    status: TaskNodeStatus | TaskNodeStatus[],
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<WorkflowTaskNode[]>> {
    return await this.findMany((qb: any) => {
      qb = this.queryByStatus(status)(qb);

      if (options?.workflowInstanceId) {
        qb = qb.where('workflow_instance_id', '=', options.workflowInstanceId);
      }

      if (options?.executor) {
        qb = qb.where('executor', '=', options.executor);
      }

      return qb;
    });
  }

  async findByNodeId(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<DatabaseResult<WorkflowTaskNode | null>> {
    return await this.findOneNullable((qb: any) =>
      qb
        .where('workflow_instance_id', '=', workflowInstanceId)
        .where('node_id', '=', nodeId)
    );
  }

  async findExecutableNodes(
    limit = 100
  ): Promise<DatabaseResult<WorkflowTaskNode[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('status', '=', 'pending')
        .whereNull('parent_node_id')
        .orderBy('created_at', 'asc')
        .limit(limit)
    );
  }

  async findDependencies(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<DatabaseResult<WorkflowTaskNode[]>> {
    // 首先获取当前节点的依赖信息
    const currentNodeResult = await this.findByNodeId(
      workflowInstanceId,
      nodeId
    );
    if (!currentNodeResult.success || !currentNodeResult.data) {
      return {
        success: true,
        data: []
      };
    }

    const dependsOn = currentNodeResult.data.depends_on;
    if (!dependsOn || !Array.isArray(dependsOn) || dependsOn.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    return await this.findMany((qb: any) =>
      qb
        .where('workflow_instance_id', '=', workflowInstanceId)
        .whereIn('node_id', dependsOn)
    );
  }

  async findChildNodes(
    parentNodeId: number,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<WorkflowTaskNode[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('parent_node_id', '=', parentNodeId);

      if (options?.status) {
        qb = this.queryByStatus(options.status)(qb);
      }

      return qb.orderBy('created_at', 'asc');
    });
  }

  async findByParallelGroup(
    parallelGroupId: string,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<WorkflowTaskNode[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('parallel_group_id', '=', parallelGroupId);

      if (options?.status) {
        qb = this.queryByStatus(options.status)(qb);
      }

      return qb.orderBy('parallel_index', 'asc');
    });
  }

  async findByAssignedEngine(
    engineId: string
  ): Promise<DatabaseResult<WorkflowTaskNode[]>> {
    return await this.findMany((qb: any) =>
      qb.where('assigned_engine_id', '=', engineId)
    );
  }

  async updateStatus(
    id: number,
    status: TaskNodeStatus,
    additionalData?: Partial<WorkflowTaskNodeUpdate>
  ): Promise<DatabaseResult<WorkflowTaskNode | null>> {
    const updateData: WorkflowTaskNodeUpdate = {
      status,
      updated_at: new Date(),
      ...additionalData
    };

    // 根据状态设置相应的时间戳
    if (status === 'running' && !additionalData?.started_at) {
      updateData.started_at = new Date();
    } else if (status === 'completed' && !additionalData?.completed_at) {
      updateData.completed_at = new Date();
      // 计算执行时长
      if (updateData.started_at) {
        updateData.duration_ms =
          Date.now() - new Date(updateData.started_at).getTime();
      }
    }

    return await this.updateNullable(id, updateData);
  }

  async batchUpdateStatus(
    ids: number[],
    status: TaskNodeStatus
  ): Promise<DatabaseResult<number>> {
    return await super.batchUpdateStatus(ids, status, {
      updated_at: new Date()
    });
  }

  async getExecutionStats(workflowInstanceId: number): Promise<
    DatabaseResult<{
      totalNodes: number;
      completedNodes: number;
      failedNodes: number;
      runningNodes: number;
      pendingNodes: number;
      averageDuration: number;
    }>
  > {
    try {
      const totalResult = await this.count((qb: any) =>
        qb.where('workflow_instance_id', '=', workflowInstanceId)
      );
      const completedResult = await this.count((qb: any) =>
        qb
          .where('workflow_instance_id', '=', workflowInstanceId)
          .where('status', '=', 'completed')
      );
      const failedResult = await this.count((qb: any) =>
        qb
          .where('workflow_instance_id', '=', workflowInstanceId)
          .where('status', '=', 'failed')
      );
      const runningResult = await this.count((qb: any) =>
        qb
          .where('workflow_instance_id', '=', workflowInstanceId)
          .where('status', '=', 'running')
      );
      const pendingResult = await this.count((qb: any) =>
        qb
          .where('workflow_instance_id', '=', workflowInstanceId)
          .where('status', '=', 'pending')
      );

      // 计算平均执行时长
      const avgDurationResult = await this.databaseApi.executeQuery(
        async (db) => {
          return await db
            .selectFrom(this.tableName)
            .select(db.fn.avg('duration_ms').as('avg_duration'))
            .where('workflow_instance_id', '=', workflowInstanceId)
            .where('status', '=', 'completed')
            .where('duration_ms', 'is not', null)
            .execute();
        }
      );

      const averageDuration =
        avgDurationResult.success && avgDurationResult.data?.[0]?.avg_duration
          ? Number(avgDurationResult.data[0].avg_duration)
          : 0;

      return {
        success: true,
        data: {
          totalNodes: totalResult.success ? totalResult.data : 0,
          completedNodes: completedResult.success ? completedResult.data : 0,
          failedNodes: failedResult.success ? failedResult.data : 0,
          runningNodes: runningResult.success ? runningResult.data : 0,
          pendingNodes: pendingResult.success ? pendingResult.data : 0,
          averageDuration
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
