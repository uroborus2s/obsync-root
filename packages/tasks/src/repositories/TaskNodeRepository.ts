/**
 * 任务节点仓储
 *
 * 提供任务节点的数据访问方法
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type { QueryOptions } from '../types/common.js';
import type {
  NewTaskNode,
  TaskNode,
  TaskNodeUpdate
} from '../types/database.js';
import type { TaskStatus } from '../types/task.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 任务节点查询条件
 */
export interface TaskNodeQueryOptions extends QueryOptions {
  status?: TaskStatus | TaskStatus[];
  workflowInstanceId?: number;
  executorName?: string;
  nodeType?: string;
  parallelGroupId?: string;
}

/**
 * 任务节点仓储接口
 */
export interface ITaskNodeRepository {
  /**
   * 根据工作流实例ID查找任务节点
   * @param workflowInstanceId 工作流实例ID
   * @param options 查询选项
   * @returns 任务节点列表
   */
  findByWorkflowInstanceId(
    workflowInstanceId: number,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<TaskNode[]>>;

  /**
   * 根据状态查找任务节点
   * @param status 状态或状态列表
   * @param options 查询选项
   * @returns 任务节点列表
   */
  findByStatus(
    status: TaskStatus | TaskStatus[],
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<TaskNode[]>>;

  /**
   * 根据节点键查找任务节点
   * @param workflowInstanceId 工作流实例ID
   * @param nodeKey 节点键
   * @returns 任务节点或null
   */
  findByNodeKey(
    workflowInstanceId: number,
    nodeKey: string
  ): Promise<DatabaseResult<TaskNode | null>>;

  /**
   * 查找可执行的任务节点
   * @param limit 限制数量
   * @returns 任务节点列表
   */
  findExecutableNodes(limit?: number): Promise<DatabaseResult<TaskNode[]>>;

  /**
   * 查找依赖的任务节点
   * @param workflowInstanceId 工作流实例ID
   * @param nodeKey 节点键
   * @returns 依赖的任务节点列表
   */
  findDependencies(
    workflowInstanceId: number,
    nodeKey: string
  ): Promise<DatabaseResult<TaskNode[]>>;

  /**
   * 查找子任务节点
   * @param parentNodeId 父节点ID
   * @param options 查询选项
   * @returns 子任务节点列表
   */
  findChildNodes(
    parentNodeId: number,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<TaskNode[]>>;

  /**
   * 查找并行组中的任务节点
   * @param parallelGroupId 并行组ID
   * @param options 查询选项
   * @returns 任务节点列表
   */
  findByParallelGroup(
    parallelGroupId: string,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<TaskNode[]>>;

  /**
   * 更新任务状态
   * @param id 节点ID
   * @param status 新状态
   * @param additionalData 额外数据
   * @returns 更新的节点
   */
  updateStatus(
    id: number,
    status: TaskStatus,
    additionalData?: Partial<TaskNodeUpdate>
  ): Promise<DatabaseResult<TaskNode | null>>;

  /**
   * 批量更新状态
   * @param ids ID列表
   * @param status 新状态
   * @returns 更新的记录数
   */
  batchUpdateStatus(
    ids: number[],
    status: TaskStatus
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
    }>
  >;
}

/**
 * 任务节点仓储实现
 */
export default class TaskNodeRepository
  extends BaseTasksRepository<
    'task_nodes',
    TaskNode,
    NewTaskNode,
    TaskNodeUpdate
  >
  implements ITaskNodeRepository
{
  protected readonly tableName = 'task_nodes' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findByWorkflowInstanceId(
    workflowInstanceId: number,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<TaskNode[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('workflow_instance_id', workflowInstanceId);

      if (options?.status) {
        qb = this.queryByStatus(options.status)(qb);
      }

      if (options?.executorName) {
        qb = qb.where('executor_name', options.executorName);
      }

      if (options?.nodeType) {
        qb = qb.where('node_type', options.nodeType);
      }

      if (options?.parallelGroupId) {
        qb = qb.where('parallel_group_id', options.parallelGroupId);
      }

      return qb.orderBy('created_at', 'asc');
    });
  }

  async findByStatus(
    status: TaskStatus | TaskStatus[],
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<TaskNode[]>> {
    return await this.findMany((qb: any) => {
      qb = this.queryByStatus(status)(qb);

      if (options?.workflowInstanceId) {
        qb = qb.where('workflow_instance_id', options.workflowInstanceId);
      }

      if (options?.executorName) {
        qb = qb.where('executor_name', options.executorName);
      }

      return qb;
    });
  }

  async findByNodeKey(
    workflowInstanceId: number,
    nodeKey: string
  ): Promise<DatabaseResult<TaskNode | null>> {
    return await this.findOneNullable((qb: any) =>
      qb
        .where('workflow_instance_id', workflowInstanceId)
        .where('node_key', nodeKey)
    );
  }

  async findExecutableNodes(limit = 100): Promise<DatabaseResult<TaskNode[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('status', 'pending')
        .whereNull('parent_node_id')
        .orderBy('created_at', 'asc')
        .limit(limit)
    );
  }

  async findDependencies(
    workflowInstanceId: number,
    nodeKey: string
  ): Promise<DatabaseResult<TaskNode[]>> {
    // 首先获取当前节点的依赖信息
    const currentNodeResult = await this.findByNodeKey(
      workflowInstanceId,
      nodeKey
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
        .where('workflow_instance_id', workflowInstanceId)
        .whereIn('node_key', dependsOn)
    );
  }

  async findChildNodes(
    parentNodeId: number,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<TaskNode[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('parent_node_id', parentNodeId);

      if (options?.status) {
        qb = this.queryByStatus(options.status)(qb);
      }

      return qb.orderBy('created_at', 'asc');
    });
  }

  async findByParallelGroup(
    parallelGroupId: string,
    options?: TaskNodeQueryOptions
  ): Promise<DatabaseResult<TaskNode[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('parallel_group_id', parallelGroupId);

      if (options?.status) {
        qb = this.queryByStatus(options.status)(qb);
      }

      return qb.orderBy('parallel_index', 'asc');
    });
  }

  async updateStatus(
    id: number,
    status: TaskStatus,
    additionalData?: Partial<TaskNodeUpdate>
  ): Promise<DatabaseResult<TaskNode | null>> {
    const updateData: TaskNodeUpdate = {
      status,
      updated_at: new Date(),
      ...additionalData
    };

    // 根据状态设置相应的时间戳
    if (status === 'running' && !additionalData?.started_at) {
      updateData.started_at = new Date();
    } else if (status === 'completed' && !additionalData?.completed_at) {
      updateData.completed_at = new Date();
    }

    return await this.updateNullable(id, updateData);
  }

  async batchUpdateStatus(
    ids: number[],
    status: TaskStatus
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
    }>
  > {
    try {
      const totalResult = await this.count((qb: any) =>
        qb.where('workflow_instance_id', workflowInstanceId)
      );
      const completedResult = await this.count((qb: any) =>
        qb
          .where('workflow_instance_id', workflowInstanceId)
          .where('status', 'completed')
      );
      const failedResult = await this.count((qb: any) =>
        qb
          .where('workflow_instance_id', workflowInstanceId)
          .where('status', 'failed')
      );
      const runningResult = await this.count((qb: any) =>
        qb
          .where('workflow_instance_id', workflowInstanceId)
          .where('status', 'running')
      );
      const pendingResult = await this.count((qb: any) =>
        qb
          .where('workflow_instance_id', workflowInstanceId)
          .where('status', 'pending')
      );

      return {
        success: true,
        data: {
          totalNodes: totalResult.success ? totalResult.data : 0,
          completedNodes: completedResult.success ? completedResult.data : 0,
          failedNodes: failedResult.success ? failedResult.data : 0,
          runningNodes: runningResult.success ? runningResult.data : 0,
          pendingNodes: pendingResult.success ? pendingResult.data : 0
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
