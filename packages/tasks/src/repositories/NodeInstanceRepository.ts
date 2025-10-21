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
import type {
  NewWorkflowNodeInstance,
  WorkflowNodeInstance,
  WorkflowNodeInstanceUpdate
} from '../types/database.js';
import type { NodeInstanceStatus } from '../types/unified-node.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 节点实例仓储实现
 */
class NodeInstanceRepository
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
   * 实现接口要求的findById方法 - 重命名避免与基类冲突
   */
  async findByIdBusiness(
    id: number
  ): Promise<DatabaseResult<WorkflowNodeInstance | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await super.findById(id);
      if (!result.success) {
        throw QueryError.create(`Failed to find node instance: ${id}`);
      }

      return this.convertOptionToNull(result.data);
    }, 'findByIdBusiness');
  }

  // 方法重载：支持接口要求的签名
  async findById(
    id: number
  ): Promise<DatabaseResult<WorkflowNodeInstance | null>>;
  // 方法重载：支持基类的签名
  async findById(id: string | number): Promise<DatabaseResult<any>>;
  // 实际实现
  async findById(id: string | number): Promise<DatabaseResult<any>> {
    if (typeof id === 'string') {
      // 如果是string类型的id，调用基类方法
      return super.findById(id);
    }
    // 如果是number类型的id，使用业务逻辑
    return this.findByIdBusiness(id);
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
   * 注意：当节点不存在时返回 { success: true, data: null }，这是正常情况
   * 只有在数据库错误时才返回 { success: false }
   */
  async findByWorkflowAndNodeId(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<DatabaseResult<WorkflowNodeInstance | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb
          .where('workflow_instance_id', '=', workflowInstanceId)
          .where('node_id', '=', nodeId)
          .where('parent_node_id', 'is', null); // 只查找顶级节点，不包括子节点

      const result = await this.findOneNullable(whereExpression);

      // 如果查询失败（数据库错误），抛出异常
      if (!result.success) {
        throw QueryError.create(
          `Database error while finding node instance: ${nodeId} in workflow ${workflowInstanceId}. Error: ${result.error}`
        );
      }

      // 查询成功，返回结果（可能是null，表示节点不存在，这是正常情况）
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
   * 根据工作流实例ID和节点ID查找特定节点实例（用于SQL层面的节点查询）
   * 第一步：获取根节点
   */
  async findSpecificNodeByWorkflowAndNodeId(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<DatabaseResult<WorkflowNodeInstance | null>> {
    return await DatabaseErrorHandler.execute(async () => {
      const whereExpression = (qb: any) =>
        qb
          .where('workflow_instance_id', '=', workflowInstanceId)
          .where('node_id', '=', nodeId);

      const result = await this.findOne(whereExpression);

      if (!result.success) {
        throw QueryError.create(
          `Failed to find specific node: workflowInstanceId=${workflowInstanceId}, nodeId=${nodeId}`
        );
      }

      // 转换Option类型为null
      return this.convertOptionToNull(result.data);
    }, 'findSpecificNodeByWorkflowAndNodeId');
  }

  /**
   * 根据父节点实例ID递归查找所有子节点（用于SQL层面的子节点查询）
   * 第二步：获取所有子节点
   * 递归查询所有层级的子节点
   */
  async findAllChildNodesByParentInstanceId(
    parentInstanceId: number
  ): Promise<DatabaseResult<WorkflowNodeInstance[]>> {
    return await DatabaseErrorHandler.execute(async () => {
      const allChildren: WorkflowNodeInstance[] = [];
      const processedIds = new Set<number>();
      const toProcess = [parentInstanceId];

      // 递归查找所有子节点
      while (toProcess.length > 0) {
        const currentParentId = toProcess.shift()!;

        if (processedIds.has(currentParentId)) {
          continue; // 避免循环引用
        }
        processedIds.add(currentParentId);

        // 查找当前父节点的直接子节点
        const childrenResult = await this.findChildNodes(currentParentId);

        if (!childrenResult.success) {
          throw QueryError.create(
            `Failed to find children for parent ${currentParentId}`
          );
        }

        const children = childrenResult.data;
        allChildren.push(...children);

        // 将子节点的ID加入待处理队列
        for (const child of children) {
          toProcess.push(child.id);
        }
      }

      // 按child_index和id排序
      allChildren.sort((a, b) => {
        const aIndex = a.child_index ?? 0;
        const bIndex = b.child_index ?? 0;
        if (aIndex !== bIndex) {
          return aIndex - bIndex;
        }
        return a.id - b.id;
      });

      return allChildren;
    }, 'findAllChildNodesByParentInstanceId');
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
   * 检查记录是否包含所有必需字段
   */
  private isCompleteRecord(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // 检查关键字段是否存在
    const requiredFields = [
      'id',
      'workflow_instance_id',
      'node_id',
      'node_name',
      'node_type',
      'status',
      'created_at',
      'updated_at'
    ];

    return requiredFields.every(
      (field) => data[field] !== undefined && data[field] !== null
    );
  }

  /**
   * 创建节点实例
   * 注意：确保返回完整的创建记录，而不仅仅是插入操作的结果
   */
  async create(
    nodeInstance: NewWorkflowNodeInstance
  ): Promise<DatabaseResult<WorkflowNodeInstance>> {
    return await DatabaseErrorHandler.execute(async () => {
      const result = await super.create(nodeInstance);
      if (!result.success) {
        throw QueryError.create('Failed to create node instance');
      }

      // 检查返回的数据是否完整
      const createdData = result.data;
      if (!createdData || !this.isCompleteRecord(createdData)) {
        // 如果返回的数据不完整，重新查询完整记录
        // 从插入结果中提取ID（可能是 insertId 或 id）
        // 使用类型断言处理运行时数据结构与类型定义的差异
        const insertResult = createdData as any;
        const recordId = insertResult?.insertId || insertResult?.id;

        this.logger.debug('Create result incomplete, fetching full record', {
          createdData,
          recordId,
          hasInsertId: !!insertResult?.insertId,
          hasId: !!insertResult?.id,
          isComplete: this.isCompleteRecord(createdData)
        });

        if (!recordId) {
          throw QueryError.create(
            'Create operation did not return record ID (checked both insertId and id fields)'
          );
        }

        // 将 BigInt 转换为 number（如果需要）
        const idValue =
          typeof recordId === 'bigint' ? Number(recordId) : recordId;

        const fullRecordResult = await this.findById(idValue);
        if (!fullRecordResult.success || !fullRecordResult.data) {
          throw QueryError.create(
            `Failed to fetch complete record after creation: ${idValue}`
          );
        }

        return fullRecordResult.data;
      }

      return createdData;
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

export default NodeInstanceRepository;
