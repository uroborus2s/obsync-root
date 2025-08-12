/**
 * 工作流引擎实例仓储
 *
 * 提供工作流引擎实例的数据访问方法
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type {
  NewWorkflowEngineInstance,
  WorkflowEngineInstance,
  WorkflowEngineInstanceUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 引擎实例状态类型
 */
export type EngineInstanceStatus = 'active' | 'inactive' | 'maintenance';

/**
 * 负载信息接口
 */
export interface LoadInfo {
  activeWorkflows: number;
  cpuUsage: number;
  memoryUsage: number;
  [key: string]: any;
}

/**
 * 工作流引擎实例仓储接口
 */
export interface IWorkflowEngineInstanceRepository {
  /**
   * 根据实例ID查找引擎实例
   * @param instanceId 实例ID
   * @returns 引擎实例或null
   */
  findByInstanceId(
    instanceId: string
  ): Promise<DatabaseResult<WorkflowEngineInstance | null>>;

  /**
   * 根据主机名查找引擎实例
   * @param hostname 主机名
   * @returns 引擎实例列表
   */
  findByHostname(
    hostname: string
  ): Promise<DatabaseResult<WorkflowEngineInstance[]>>;

  /**
   * 根据状态查找引擎实例
   * @param status 状态
   * @returns 引擎实例列表
   */
  findByStatus(
    status: EngineInstanceStatus
  ): Promise<DatabaseResult<WorkflowEngineInstance[]>>;

  /**
   * 查找活跃的引擎实例
   * @returns 活跃的引擎实例列表
   */
  findActiveInstances(): Promise<DatabaseResult<WorkflowEngineInstance[]>>;

  /**
   * 查找支持特定执行器的引擎实例
   * @param executorName 执行器名称
   * @returns 引擎实例列表
   */
  findByExecutor(
    executorName: string
  ): Promise<DatabaseResult<WorkflowEngineInstance[]>>;

  /**
   * 查找心跳超时的引擎实例
   * @param timeoutMinutes 超时时间（分钟）
   * @returns 超时的引擎实例列表
   */
  findStaleInstances(
    timeoutMinutes: number
  ): Promise<DatabaseResult<WorkflowEngineInstance[]>>;

  /**
   * 更新心跳时间
   * @param instanceId 实例ID
   * @param loadInfo 负载信息
   * @returns 更新结果
   */
  updateHeartbeat(
    instanceId: string,
    loadInfo?: LoadInfo
  ): Promise<DatabaseResult<WorkflowEngineInstance | null>>;

  /**
   * 更新引擎状态
   * @param instanceId 实例ID
   * @param status 新状态
   * @returns 更新结果
   */
  updateStatus(
    instanceId: string,
    status: EngineInstanceStatus
  ): Promise<DatabaseResult<WorkflowEngineInstance | null>>;

  /**
   * 注册引擎实例
   * @param data 引擎实例数据
   * @returns 创建的引擎实例
   */
  registerInstance(
    data: NewWorkflowEngineInstance
  ): Promise<DatabaseResult<WorkflowEngineInstance>>;

  /**
   * 注销引擎实例
   * @param instanceId 实例ID
   * @returns 删除结果
   */
  unregisterInstance(instanceId: string): Promise<DatabaseResult<boolean>>;

  /**
   * 获取引擎实例统计信息
   * @returns 统计信息
   */
  getStatistics(): Promise<
    DatabaseResult<{
      totalInstances: number;
      activeInstances: number;
      inactiveInstances: number;
      maintenanceInstances: number;
      averageLoad: number;
    }>
  >;
}

/**
 * 工作流引擎实例仓储实现
 */
export default class WorkflowEngineInstanceRepository
  extends BaseTasksRepository<
    'workflow_engine_instances',
    WorkflowEngineInstance,
    NewWorkflowEngineInstance,
    WorkflowEngineInstanceUpdate
  >
  implements IWorkflowEngineInstanceRepository
{
  protected readonly tableName = 'workflow_engine_instances' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findByInstanceId(
    instanceId: string
  ): Promise<DatabaseResult<WorkflowEngineInstance | null>> {
    return await this.findOneNullable((qb: any) =>
      qb.where('instance_id', '=', instanceId)
    );
  }

  async findByHostname(
    hostname: string
  ): Promise<DatabaseResult<WorkflowEngineInstance[]>> {
    return await this.findMany((qb: any) =>
      qb.where('hostname', '=', hostname).orderBy('created_at', 'desc')
    );
  }

  async findByStatus(
    status: EngineInstanceStatus
  ): Promise<DatabaseResult<WorkflowEngineInstance[]>> {
    return await this.findMany((qb: any) =>
      qb.where('status', '=', status).orderBy('last_heartbeat', 'desc')
    );
  }

  async findActiveInstances(): Promise<
    DatabaseResult<WorkflowEngineInstance[]>
  > {
    return await this.findByStatus('active');
  }

  async findByExecutor(
    executorName: string
  ): Promise<DatabaseResult<WorkflowEngineInstance[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('status', '=', 'active')
        .whereRaw('JSON_CONTAINS(supported_executors, ?)', [
          `"${executorName}"`
        ])
        .orderBy('last_heartbeat', 'desc')
    );
  }

  async findStaleInstances(
    timeoutMinutes: number
  ): Promise<DatabaseResult<WorkflowEngineInstance[]>> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes);

    return await this.findMany((qb: any) =>
      qb
        .where('status', '=', 'active')
        .where('last_heartbeat', '<', cutoffTime)
        .orderBy('last_heartbeat', 'asc')
    );
  }

  async updateHeartbeat(
    instanceId: string,
    loadInfo?: LoadInfo
  ): Promise<DatabaseResult<WorkflowEngineInstance | null>> {
    const updateData: WorkflowEngineInstanceUpdate = {
      last_heartbeat: new Date(),
      updated_at: new Date()
    };

    if (loadInfo) {
      updateData.load_info = loadInfo;
    }

    const result = await this.updateMany(
      (qb: any) => qb.where('instance_id', '=', instanceId),
      updateData
    );

    if (result.success && result.data > 0) {
      return await this.findByInstanceId(instanceId);
    }

    return {
      success: false,
      error: 'Instance not found' as any
    };
  }

  async updateStatus(
    instanceId: string,
    status: EngineInstanceStatus
  ): Promise<DatabaseResult<WorkflowEngineInstance | null>> {
    const updateData: WorkflowEngineInstanceUpdate = {
      status,
      updated_at: new Date()
    };

    const result = await this.updateMany(
      (qb: any) => qb.where('instance_id', '=', instanceId),
      updateData
    );

    if (result.success && result.data > 0) {
      this.logger.info('Engine instance status updated', {
        instanceId,
        status
      });
      return await this.findByInstanceId(instanceId);
    }

    return {
      success: false,
      error: 'Instance not found' as any
    };
  }

  async registerInstance(
    data: NewWorkflowEngineInstance
  ): Promise<DatabaseResult<WorkflowEngineInstance>> {
    // 先检查是否已存在相同的实例ID
    const existingResult = await this.findByInstanceId(data.instance_id);
    if (existingResult.success && existingResult.data) {
      // 如果已存在，更新心跳和状态
      const updateResult = await this.updateHeartbeat(
        data.instance_id,
        data.load_info
      );
      if (updateResult.success && updateResult.data) {
        return {
          success: true,
          data: updateResult.data
        };
      }
    }

    // 创建新实例
    const createData = {
      ...data,
      started_at: new Date(),
      last_heartbeat: new Date()
    };

    return await this.create(createData);
  }

  async unregisterInstance(
    instanceId: string
  ): Promise<DatabaseResult<boolean>> {
    const result = await this.deleteMany((qb: any) =>
      qb.where('instance_id', '=', instanceId)
    );

    if (result.success && result.data > 0) {
      this.logger.info('Engine instance unregistered', { instanceId });
      return {
        success: true,
        data: true
      };
    }

    return {
      success: true,
      data: false
    };
  }

  async getStatistics(): Promise<
    DatabaseResult<{
      totalInstances: number;
      activeInstances: number;
      inactiveInstances: number;
      maintenanceInstances: number;
      averageLoad: number;
    }>
  > {
    try {
      const totalResult = await this.count();
      const activeResult = await this.count((qb: any) =>
        qb.where('status', '=', 'active')
      );
      const inactiveResult = await this.count((qb: any) =>
        qb.where('status', '=', 'inactive')
      );
      const maintenanceResult = await this.count((qb: any) =>
        qb.where('status', '=', 'maintenance')
      );

      // 计算平均负载（活跃工作流数量）
      const avgLoadResult = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom(this.tableName)
          .select(db.fn.avg('id').as('avg_load'))
          .where('status', '=', 'active')
          .execute();
      });

      const averageLoad =
        avgLoadResult.success && avgLoadResult.data?.[0]?.avg_load
          ? Number(avgLoadResult.data[0].avg_load)
          : 0;

      return {
        success: true,
        data: {
          totalInstances: totalResult.success ? totalResult.data : 0,
          activeInstances: activeResult.success ? activeResult.data : 0,
          inactiveInstances: inactiveResult.success ? inactiveResult.data : 0,
          maintenanceInstances: maintenanceResult.success
            ? maintenanceResult.data
            : 0,
          averageLoad
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
