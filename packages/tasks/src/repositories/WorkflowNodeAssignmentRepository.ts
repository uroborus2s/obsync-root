/**
 * 工作流节点分配记录仓储
 *
 * 提供工作流节点分配记录的数据访问方法
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type {
  NewWorkflowNodeAssignment,
  WorkflowNodeAssignment,
  WorkflowNodeAssignmentUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 节点分配状态类型
 */
export type NodeAssignmentStatus =
  | 'assigned'
  | 'running'
  | 'completed'
  | 'failed'
  | 'transferred';

/**
 * 工作流节点分配记录仓储接口
 */
export interface IWorkflowNodeAssignmentRepository {
  /**
   * 根据工作流实例ID查找节点分配记录
   * @param workflowInstanceId 工作流实例ID
   * @returns 节点分配记录列表
   */
  findByWorkflowInstanceId(
    workflowInstanceId: number
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>>;

  /**
   * 根据节点ID查找分配记录
   * @param workflowInstanceId 工作流实例ID
   * @param nodeId 节点ID
   * @returns 节点分配记录列表
   */
  findByNodeId(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>>;

  /**
   * 根据任务节点ID查找分配记录
   * @param taskNodeId 任务节点ID
   * @returns 节点分配记录或null
   */
  findByTaskNodeId(
    taskNodeId: number
  ): Promise<DatabaseResult<WorkflowNodeAssignment | null>>;

  /**
   * 根据引擎ID查找分配记录
   * @param engineId 引擎实例ID
   * @returns 节点分配记录列表
   */
  findByEngineId(
    engineId: string
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>>;

  /**
   * 根据状态查找分配记录
   * @param status 分配状态
   * @returns 节点分配记录列表
   */
  findByStatus(
    status: NodeAssignmentStatus
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>>;

  /**
   * 根据分配策略查找分配记录
   * @param strategy 分配策略
   * @returns 节点分配记录列表
   */
  findByStrategy(
    strategy: string
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>>;

  /**
   * 查找当前活跃的节点分配记录
   * @param engineId 引擎实例ID（可选）
   * @returns 活跃的节点分配记录列表
   */
  findActiveAssignments(
    engineId?: string
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>>;

  /**
   * 根据所需能力查找分配记录
   * @param capabilities 所需能力列表
   * @returns 节点分配记录列表
   */
  findByCapabilities(
    capabilities: string[]
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>>;

  /**
   * 创建节点分配记录
   * @param data 节点分配记录数据
   * @returns 创建的节点分配记录
   */
  createAssignment(
    data: NewWorkflowNodeAssignment
  ): Promise<DatabaseResult<WorkflowNodeAssignment>>;

  /**
   * 更新分配状态
   * @param id 分配记录ID
   * @param status 新状态
   * @param additionalData 额外数据
   * @returns 更新的分配记录
   */
  updateStatus(
    id: number,
    status: NodeAssignmentStatus,
    additionalData?: Partial<WorkflowNodeAssignmentUpdate>
  ): Promise<DatabaseResult<WorkflowNodeAssignment | null>>;

  /**
   * 开始执行节点
   * @param id 分配记录ID
   * @returns 更新的分配记录
   */
  startExecution(
    id: number
  ): Promise<DatabaseResult<WorkflowNodeAssignment | null>>;

  /**
   * 完成节点执行
   * @param id 分配记录ID
   * @returns 更新的分配记录
   */
  completeExecution(
    id: number
  ): Promise<DatabaseResult<WorkflowNodeAssignment | null>>;

  /**
   * 转移节点分配
   * @param id 分配记录ID
   * @param newEngineId 新引擎实例ID
   * @returns 新的分配记录
   */
  transferAssignment(
    id: number,
    newEngineId: string
  ): Promise<DatabaseResult<WorkflowNodeAssignment>>;

  /**
   * 获取节点分配统计信息
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
 * 工作流节点分配记录仓储实现
 */
export default class WorkflowNodeAssignmentRepository
  extends BaseTasksRepository<
    'workflow_node_assignments',
    WorkflowNodeAssignment,
    NewWorkflowNodeAssignment,
    WorkflowNodeAssignmentUpdate
  >
  implements IWorkflowNodeAssignmentRepository
{
  protected readonly tableName = 'workflow_node_assignments' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findByWorkflowInstanceId(
    workflowInstanceId: number
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('workflow_instance_id', '=', workflowInstanceId)
        .orderBy('assigned_at', 'desc')
    );
  }

  async findByNodeId(
    workflowInstanceId: number,
    nodeId: string
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('workflow_instance_id', '=', workflowInstanceId)
        .where('node_id', '=', nodeId)
        .orderBy('assigned_at', 'desc')
    );
  }

  async findByTaskNodeId(
    taskNodeId: number
  ): Promise<DatabaseResult<WorkflowNodeAssignment | null>> {
    return await this.findOneNullable((qb: any) =>
      qb.where('task_node_id', '=', taskNodeId)
    );
  }

  async findByEngineId(
    engineId: string
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('assigned_engine_id', '=', engineId)
        .orderBy('assigned_at', 'desc')
    );
  }

  async findByStatus(
    status: NodeAssignmentStatus
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>> {
    return await this.findMany((qb: any) =>
      qb.where('status', '=', status).orderBy('assigned_at', 'desc')
    );
  }

  async findByStrategy(
    strategy: string
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('assignment_strategy', '=', strategy)
        .orderBy('assigned_at', 'desc')
    );
  }

  async findActiveAssignments(
    engineId?: string
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.whereIn('status', ['assigned', 'running']);

      if (engineId) {
        qb = qb.where('assigned_engine_id', '=', engineId);
      }

      return qb.orderBy('assigned_at', 'asc');
    });
  }

  async findByCapabilities(
    capabilities: string[]
  ): Promise<DatabaseResult<WorkflowNodeAssignment[]>> {
    return await this.findMany((qb: any) => {
      capabilities.forEach((capability) => {
        qb = qb.whereRaw('JSON_CONTAINS(required_capabilities, ?)', [
          `"${capability}"`
        ]);
      });
      return qb.orderBy('assigned_at', 'desc');
    });
  }

  async createAssignment(
    data: NewWorkflowNodeAssignment
  ): Promise<DatabaseResult<WorkflowNodeAssignment>> {
    const createData = {
      ...data,
      assigned_at: new Date(),
      status: 'assigned' as NodeAssignmentStatus
    };

    this.logger.info('Creating node assignment', {
      workflowInstanceId: data.workflow_instance_id,
      nodeId: data.node_id,
      engineId: data.assigned_engine_id,
      strategy: data.assignment_strategy
    });

    return await this.create(createData);
  }

  async updateStatus(
    id: number,
    status: NodeAssignmentStatus,
    additionalData?: Partial<WorkflowNodeAssignmentUpdate>
  ): Promise<DatabaseResult<WorkflowNodeAssignment | null>> {
    const updateData: WorkflowNodeAssignmentUpdate = {
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

    const result = await this.updateNullable(id, updateData);

    if (result.success && result.data) {
      this.logger.info('Node assignment status updated', {
        id,
        status,
        nodeId: result.data.node_id
      });
    }

    return result;
  }

  async startExecution(
    id: number
  ): Promise<DatabaseResult<WorkflowNodeAssignment | null>> {
    return await this.updateStatus(id, 'running', {
      started_at: new Date()
    });
  }

  async completeExecution(
    id: number
  ): Promise<DatabaseResult<WorkflowNodeAssignment | null>> {
    return await this.updateStatus(id, 'completed', {
      completed_at: new Date()
    });
  }

  async transferAssignment(
    id: number,
    newEngineId: string
  ): Promise<DatabaseResult<WorkflowNodeAssignment>> {
    // 首先标记原分配为已转移
    const originalResult = await this.updateStatus(id, 'transferred');
    if (!originalResult.success || !originalResult.data) {
      return {
        success: false,
        error: 'Failed to mark original assignment as transferred' as any
      };
    }

    // 创建新的分配记录
    const newAssignmentData: NewWorkflowNodeAssignment = {
      workflow_instance_id: originalResult.data.workflow_instance_id,
      node_id: originalResult.data.node_id,
      task_node_id: originalResult.data.task_node_id,
      assigned_engine_id: newEngineId,
      required_capabilities: originalResult.data.required_capabilities,
      assignment_strategy: originalResult.data.assignment_strategy,
      estimated_duration: originalResult.data.estimated_duration,
      status: 'assigned',
      assigned_at: new Date(),
      started_at: null,
      completed_at: null
    };

    this.logger.info('Transferring node assignment', {
      originalId: id,
      newEngineId,
      nodeId: originalResult.data.node_id
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
