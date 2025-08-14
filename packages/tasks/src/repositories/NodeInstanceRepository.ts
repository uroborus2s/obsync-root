/**
 * 节点实例仓储实现
 *
 * 继承BaseRepository，实现节点实例的数据访问
 * 版本: v3.0.0-refactored
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { DatabaseErrorHandler, QueryError } from '@stratix/database';
import type { INodeInstanceRepository } from '../interfaces/repositories.js';
import type { NodeInstanceStatus } from '../types/business.js';
import type {
  NewWorkflowNodeInstance,
  WorkflowNodeInstance,
  WorkflowNodeInstanceUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 节点实例仓储实现
 */
export default class NodeInstanceRepository
  extends BaseTasksRepository<
    'workflow_node_instances',
    WorkflowNodeInstance,
    NewWorkflowNodeInstance,
    WorkflowNodeInstanceUpdate
  >
  implements INodeInstanceRepository
{
  protected readonly tableName = 'workflow_node_instances' as const;

  constructor(
    protected databaseApi: DatabaseAPI,
    protected logger: Logger
  ) {
    super();
  }

  /**
   * 实现接口要求的findById方法 - 使用组合模式避免类型冲突
   */
  async findById(
    id: number
  ): Promise<DatabaseResult<WorkflowNodeInstance | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await super.findById(id);
      if (!result.success) {
        throw QueryError.create(`Failed to find node instance: ${id}`);
      }

      return this.convertOptionToNull(result.data);
    }, 'findById');
  }

  /**
   * 类型转换工具方法：Option<T> -> T | null
   */
  private convertOptionToNull<T>(optionData: any): T | null {
    if (optionData && typeof optionData === 'object' && 'some' in optionData) {
      return optionData.some ? optionData.value : null;
    }
    return optionData as T | null;
  }

  /**
   * 根据工作流实例ID和节点ID查找节点实例
   */
  async findByWorkflowAndNodeId(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<DatabaseResult<WorkflowNodeInstance>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb
          .where('workflow_instance_id', '=', workflowInstanceId)
          .where('node_id', '=', nodeId)
          .where('parent_node_id', 'is', null); // 只查找顶级节点，不包括子节点

      const result = await this.findOneNullable(whereExpression);
      if (!result.success || !result.data) {
        throw QueryError.create(
          `Node instance not found: ${nodeId} in workflow ${workflowInstanceId}`
        );
      }

      return result.data;
    }, 'findByWorkflowAndNodeId');
  }

  /**
   * 批量创建节点实例
   */
  async createMany(
    nodeInstances: NewWorkflowNodeInstance[]
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      if (nodeInstances.length === 0) {
        return [];
      }

      const result = await super.createMany(nodeInstances);
      if (!result.success) {
        throw QueryError.create('Failed to create node instances');
      }

      return result.data;
    }, 'createMany');
  }

  /**
   * 查找工作流实例的所有节点实例
   */
  async findByWorkflowInstanceId(
    workflowInstanceId: number
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb.where('workflow_instance_id', '=', workflowInstanceId);

      const options = {
        orderBy: [{ field: 'created_at', direction: 'asc' as const }]
      };

      const result = await this.findMany(whereExpression, options);
      if (!result.success) {
        throw QueryError.create('Failed to find nodes by workflow instance ID');
      }

      return result.data;
    }, 'findByWorkflowInstanceId');
  }

  /**
   * 查找父节点的所有子节点实例
   */
  async findChildNodes(
    parentNodeId: number
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb.where('parent_node_id', '=', parentNodeId);

      const options = {
        orderBy: [{ field: 'child_index', direction: 'asc' as const }]
      };

      const result = await this.findMany(whereExpression, options);
      if (!result.success) {
        throw QueryError.create('Failed to find child nodes');
      }

      return result.data;
    }, 'findChildNodes');
  }

  /**
   * 查找未执行的子节点实例
   */
  async findPendingChildNodes(
    parentNodeId: number
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb
          .where('parent_node_id', '=', parentNodeId)
          .where('status', 'in', ['pending', 'failed_retry']);

      const options = {
        orderBy: [{ field: 'child_index', direction: 'asc' as const }]
      };

      const result = await this.findMany(whereExpression, options);
      if (!result.success) {
        throw QueryError.create('Failed to find pending child nodes');
      }

      return result.data;
    }, 'findPendingChildNodes');
  }

  /**
   * 更新节点状态
   */
  async updateStatus(
    id: number,
    status: NodeInstanceStatus,
    errorMessage?: string,
    errorDetails?: any
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const updateData: Partial<WorkflowNodeInstance> = {
        status,
        updated_at: new Date()
      };

      // 根据状态设置相应的时间戳
      if (status === 'running') {
        updateData.started_at = new Date();
      } else if (status === 'completed') {
        updateData.completed_at = new Date();
      }

      // 设置错误信息
      if (errorMessage) {
        updateData.error_message = errorMessage;
      }
      if (errorDetails) {
        updateData.error_details = errorDetails;
      }

      const whereExpression = (qb: any) => qb.where('id', '=', id);
      const result = await this.updateMany(whereExpression, updateData);

      if (!result.success) {
        throw QueryError.create(`Node instance not found: ${id}`);
      }

      const updated = result.data > 0;
      if (!updated) {
        throw QueryError.create(`Node instance not found: ${id}`);
      }

      return true;
    }, 'updateStatus');
  }

  /**
   * 更新循环进度
   */
  async updateLoopProgress(
    id: number,
    progress: any,
    completedCount: number
  ): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const updateData: Partial<WorkflowNodeInstance> = {
        loop_progress: progress,
        loop_completed_count: completedCount,
        updated_at: new Date()
      };

      const whereExpression = (qb: any) => qb.where('id', '=', id);
      const result = await this.updateMany(whereExpression, updateData);

      if (!result.success) {
        throw QueryError.create(`Node instance not found: ${id}`);
      }

      const updated = result.data > 0;
      if (!updated) {
        throw QueryError.create(`Node instance not found: ${id}`);
      }

      return true;
    }, 'updateLoopProgress');
  }

  /**
   * 根据状态查找节点实例
   */
  async findByStatus(
    workflowInstanceId: number,
    status: NodeInstanceStatus | NodeInstanceStatus[]
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) => {
        qb = qb.where('workflow_instance_id', '=', workflowInstanceId);

        if (Array.isArray(status)) {
          qb = qb.where('status', 'in', status);
        } else {
          qb = qb.where('status', '=', status);
        }

        return qb;
      };

      const result = await this.findMany(whereExpression);
      if (!result.success) {
        throw QueryError.create('Failed to find nodes by status');
      }

      return result.data;
    }, 'findByStatus');
  }

  /**
   * 创建节点实例
   */
  async create(
    nodeInstance: NewWorkflowNodeInstance
  ): Promise<DatabaseResult<WorkflowNodeInstance>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await super.create(nodeInstance);
      if (!result.success) {
        throw QueryError.create('Failed to create node instance');
      }

      return result.data;
    }, 'create');
  }

  /**
   * 更新节点实例 - 实现接口方法
   */
  async updateNodeInstance(
    id: number,
    updates: WorkflowNodeInstanceUpdate
  ): Promise<DatabaseResult<WorkflowNodeInstance | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await super.update(id, updates);
      if (!result.success) {
        throw QueryError.create(`Failed to update node instance: ${id}`);
      }

      // 转换Option<T>为T | null
      if (
        result.data &&
        typeof result.data === 'object' &&
        'some' in result.data
      ) {
        const optionData = result.data as any;
        return optionData.some ? optionData.value : null;
      }

      return result.data as WorkflowNodeInstance | null;
    }, 'updateNodeInstance');
  }

  /**
   * 删除节点实例
   */
  async delete(id: number): Promise<DatabaseResult<boolean>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await super.delete(id);
      if (!result.success) {
        throw QueryError.create(`Node instance not found: ${id}`);
      }

      return result.data;
    }, 'delete');
  }
}
