/**
 * 分布式调度器Repository层
 *
 * 负责分布式调度相关的数据访问操作，修复DistributedScheduler中的架构违规问题
 */

import type { Logger } from '@stratix/core';
import type {
  DatabaseAPI,
  DatabaseError,
  DatabaseResult
} from '@stratix/database';
import type { WorkflowInstancesTable } from '../types/database.js';
import type { WorkflowEngineInstance } from '../types/distributed.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

/**
 * 分布式调度器Repository接口
 */
export interface IDistributedSchedulerRepository {
  /**
   * 查找分配给指定引擎的工作流实例
   */
  findWorkflowsByEngineId(
    engineId: string
  ): Promise<DatabaseResult<WorkflowInstancesTable[]>>;

  /**
   * 查找分配给指定引擎的运行中节点
   */
  findNodesByEngineId(engineId: string): Promise<DatabaseResult<string[]>>;

  /**
   * 将工作流实例转移到目标引擎
   */
  transferWorkflowsToEngine(
    workflowIds: number[],
    targetEngineId: string
  ): Promise<DatabaseResult<number>>;

  /**
   * 重置运行中节点状态
   */
  resetNodeStatus(nodeIds: string[]): Promise<DatabaseResult<number>>;

  /**
   * 注册引擎实例到数据库
   */
  registerEngineInstance(
    instance: WorkflowEngineInstance
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 更新引擎心跳信息
   */
  updateEngineHeartbeat(
    instanceId: string,
    heartbeatData: any
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 查找活跃的引擎实例
   */
  findActiveEngines(): Promise<DatabaseResult<WorkflowEngineInstance[]>>;

  /**
   * 标记引擎为非活跃状态
   */
  markEngineInactive(instanceId: string): Promise<DatabaseResult<boolean>>;

  /**
   * 注销引擎实例
   */
  unregisterEngineInstance(
    instanceId: string
  ): Promise<DatabaseResult<boolean>>;

  /**
   * 查找过期的引擎实例
   */
  findStaleEngines(timeoutMinutes: number): Promise<DatabaseResult<any[]>>;

  /**
   * 更新引擎状态
   */
  updateEngineStatus(
    instanceId: string,
    status: 'active' | 'inactive' | 'maintenance'
  ): Promise<DatabaseResult<boolean>>;
}

/**
 * 分布式调度器Repository实现
 */
export default class DistributedSchedulerRepository
  extends BaseTasksRepository<'workflow_instances', any, any, any>
  implements IDistributedSchedulerRepository
{
  protected readonly tableName = 'workflow_instances' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  /**
   * 查找分配给指定引擎的工作流实例
   */
  async findWorkflowsByEngineId(
    engineId: string
  ): Promise<DatabaseResult<WorkflowInstancesTable[]>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom('workflow_instances')
          .selectAll()
          .where('assigned_engine_id', '=', engineId)
          .where('status', 'in', ['running', 'pending'])
          .execute();
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data as WorkflowInstancesTable[] };
    } catch (error) {
      this.logger.error('查询引擎工作流失败', { engineId, error });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }

  /**
   * 查找分配给指定引擎的运行中节点
   */
  async findNodesByEngineId(
    engineId: string
  ): Promise<DatabaseResult<string[]>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom('workflow_node_instances as wni')
          .innerJoin(
            'workflow_instances as wi',
            'wni.workflow_instance_id',
            'wi.id'
          )
          .select(['wni.node_id'])
          .where('wi.assigned_engine_id', '=', engineId)
          .where('wni.status', '=', 'running')
          .execute();
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const nodeIds = result.data.map((row) => row.node_id);
      return { success: true, data: nodeIds };
    } catch (error) {
      this.logger.error('查询引擎节点失败', { engineId, error });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }

  /**
   * 将工作流实例转移到目标引擎
   */
  async transferWorkflowsToEngine(
    workflowIds: number[],
    targetEngineId: string
  ): Promise<DatabaseResult<number>> {
    try {
      let transferredCount = 0;

      // 使用事务确保原子性
      const result = await this.databaseApi.transaction(async (trx) => {
        for (const workflowId of workflowIds) {
          const updateResult = await trx
            .updateTable('workflow_instances')
            .set({
              assigned_engine_id: targetEngineId,
              updated_at: new Date()
            })
            .where('id', '=', workflowId)
            .execute();

          if (updateResult[0]?.numUpdatedRows) {
            transferredCount += Number(updateResult[0].numUpdatedRows);
          }
        }

        return transferredCount;
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (error) {
      this.logger.error('转移工作流失败', {
        workflowIds,
        targetEngineId,
        error
      });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }

  /**
   * 重置运行中节点状态
   */
  async resetNodeStatus(nodeIds: string[]): Promise<DatabaseResult<number>> {
    try {
      let resetCount = 0;

      // 使用事务确保原子性
      const result = await this.databaseApi.transaction(async (trx) => {
        for (const nodeId of nodeIds) {
          const updateResult = await trx
            .updateTable('workflow_node_instances')
            .set({
              status: 'pending',
              started_at: null,
              updated_at: new Date()
            })
            .where('node_id', '=', nodeId)
            .where('status', '=', 'running')
            .execute();

          if (updateResult[0]?.numUpdatedRows) {
            resetCount += Number(updateResult[0].numUpdatedRows);
          }
        }

        return resetCount;
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (error) {
      this.logger.error('重置节点状态失败', { nodeIds, error });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }

  /**
   * 注册引擎实例到数据库
   */
  async registerEngineInstance(
    instance: WorkflowEngineInstance
  ): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .insertInto('workflow_engine_instances')
          .values({
            instance_id: instance.instanceId,
            hostname: instance.hostname,
            process_id: instance.processId,
            status: instance.status,
            load_info: JSON.stringify(instance.load),
            supported_executors: JSON.stringify(instance.supportedExecutors),
            started_at: instance.startedAt,
            last_heartbeat: instance.lastHeartbeat
          })
          .onDuplicateKeyUpdate({
            status: instance.status,
            last_heartbeat: instance.lastHeartbeat,
            load_info: JSON.stringify(instance.load),
            updated_at: new Date()
          })
          .execute();
      });

      if (result.success) {
        return { success: true, data: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logger.error('注册引擎实例失败', {
        instanceId: instance.instanceId,
        error
      });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }

  /**
   * 更新引擎心跳信息
   */
  async updateEngineHeartbeat(
    instanceId: string,
    heartbeatData: any
  ): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .updateTable('workflow_engine_instances')
          .set({
            last_heartbeat: new Date(),
            load_info: JSON.stringify(heartbeatData),
            updated_at: new Date()
          })
          .where('instance_id', '=', instanceId)
          .execute();
      });

      if (result.success) {
        const updated = result.data[0]?.numUpdatedRows > 0;
        return { success: true, data: updated };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logger.error('更新引擎心跳失败', { instanceId, error });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }

  /**
   * 查找活跃的引擎实例
   */
  async findActiveEngines(): Promise<DatabaseResult<WorkflowEngineInstance[]>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom('workflow_engine_instances')
          .selectAll()
          .where('status', '=', 'active')
          .where('last_heartbeat', '>', new Date(Date.now() - 120000)) // 2分钟内有心跳
          .execute();
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const engines = result.data.map((row) => ({
        instanceId: row.instance_id,
        hostname: row.hostname,
        processId: row.process_id,
        status: row.status as 'active' | 'inactive' | 'maintenance',
        load: JSON.parse(row.load_info),
        supportedExecutors: JSON.parse(row.supported_executors),
        startedAt: row.started_at,
        lastHeartbeat: row.last_heartbeat
      }));

      return { success: true, data: engines };
    } catch (error) {
      this.logger.error('查询活跃引擎失败', { error });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }

  /**
   * 标记引擎为非活跃状态
   */
  async markEngineInactive(
    instanceId: string
  ): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .updateTable('workflow_engine_instances')
          .set({
            status: 'inactive',
            updated_at: new Date()
          })
          .where('instance_id', '=', instanceId)
          .execute();
      });

      if (result.success) {
        const updated = result.data[0]?.numUpdatedRows > 0;
        return { success: true, data: updated };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logger.error('标记引擎非活跃失败', { instanceId, error });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }

  /**
   * 注销引擎实例
   */
  async unregisterEngineInstance(
    instanceId: string
  ): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .deleteFrom('workflow_engine_instances')
          .where('instance_id', '=', instanceId)
          .execute();
      });

      if (result.success) {
        const deleted = result.data[0]?.numDeletedRows > 0;
        return { success: true, data: deleted };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logger.error('注销引擎实例失败', { instanceId, error });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }

  /**
   * 查找过期的引擎实例
   */
  async findStaleEngines(
    timeoutMinutes: number
  ): Promise<DatabaseResult<any[]>> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes);

      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom('workflow_engine_instances')
          .selectAll()
          .where('status', '=', 'active')
          .where('last_heartbeat', '<', cutoffTime)
          .orderBy('last_heartbeat', 'asc')
          .execute();
      });

      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logger.error('查找过期引擎实例失败', { timeoutMinutes, error });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }

  /**
   * 更新引擎状态
   */
  async updateEngineStatus(
    instanceId: string,
    status: 'active' | 'inactive' | 'maintenance'
  ): Promise<DatabaseResult<boolean>> {
    try {
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .updateTable('workflow_engine_instances')
          .set({
            status,
            updated_at: new Date()
          })
          .where('instance_id', '=', instanceId)
          .execute();
      });

      if (result.success) {
        const updated = result.data[0]?.numUpdatedRows > 0;
        return { success: true, data: updated };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      this.logger.error('更新引擎状态失败', { instanceId, status, error });
      return {
        success: false,
        error: error as DatabaseError
      };
    }
  }
}
