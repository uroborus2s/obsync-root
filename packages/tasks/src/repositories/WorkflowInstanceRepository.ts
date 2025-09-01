/**
 * 工作流实例仓储
 *
 * 提供工作流实例的数据访问方法
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import type { IWorkflowInstanceRepository } from '../interfaces/repositories.js';
import type {
  PaginatedResult,
  QueryOptions,
  UnifiedWorkflowInstanceFilters,
  WorkflowInstanceQueryOptions,
  WorkflowInstanceStatus
} from '../types/business.js';
import type {
  NewWorkflowInstanceTable,
  WorkflowInstanceTable,
  WorkflowInstanceTableUpdate
} from '../types/database.js';
import { BaseTasksRepository } from './base/BaseTasksRepository.js';

// 类型别名，用于兼容性
type WorkflowStatus = WorkflowInstanceStatus;

/**
 * 工作流实例仓储实现
 */
export default class WorkflowInstanceRepository
  extends BaseTasksRepository<
    'workflow_instances',
    WorkflowInstanceTable,
    NewWorkflowInstanceTable,
    WorkflowInstanceTableUpdate
  >
  implements IWorkflowInstanceRepository
{
  protected readonly tableName = 'workflow_instances' as const;

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super();
  }

  async findByIdNullable(
    id: number
  ): Promise<DatabaseResult<WorkflowInstanceTable | null>> {
    return await this.findOneNullable((qb: any) => qb.where('id', '=', id));
  }

  async findByExternalId(
    externalId: string
  ): Promise<DatabaseResult<WorkflowInstanceTable | null>> {
    return await this.findOneNullable((qb: any) =>
      qb.where('external_id', '=', externalId)
    );
  }

  async findByWorkflowDefinitionId(
    workflowDefinitionId: number,
    options?: WorkflowInstanceQueryOptions
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    return await this.findMany((qb: any) => {
      qb = qb.where('workflow_definition_id', '=', workflowDefinitionId);

      if (options?.includeCompleted === false) {
        qb = qb.whereNot('status', '=', 'completed');
      }

      if (options?.includeFailed === false) {
        qb = qb.whereNot('status', '=', 'failed');
      }

      if (options?.priority !== undefined) {
        qb = qb.where('priority', '=', options.priority);
      }

      if (options?.startDate) {
        qb = qb.where('created_at', '>=', options.startDate);
      }

      if (options?.endDate) {
        qb = qb.where('created_at', '<=', options.endDate);
      }

      return qb;
    });
  }

  async findByStatus(
    status: WorkflowStatus | WorkflowStatus[],
    _options?: WorkflowInstanceQueryOptions
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    return await this.findMany(this.queryByStatus(status));
  }

  async findScheduledInstances(
    limit = 100
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('status', '=', 'scheduled')
        .where('scheduled_at', '<=', new Date())
        .orderBy('scheduled_at', 'asc')
        .limit(limit)
    );
  }

  async findInterruptedInstances(options?: {
    heartbeatTimeout?: Date;
    statuses?: WorkflowStatus[];
    limit?: number;
  }): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    return await this.findMany((qb: any) => {
      // 如果指定了状态，使用指定的状态，否则使用默认的中断状态
      // 包含'interrupted'状态以支持工作流实例恢复功能
      const statuses = options?.statuses || [
        'interrupted',
        'failed',
        'cancelled'
      ];
      qb = qb.where('status', 'in', statuses);

      // 如果指定了心跳超时时间，添加心跳超时条件
      if (options?.heartbeatTimeout) {
        qb = qb.where((eb: any) =>
          eb.or([
            eb('last_heartbeat', 'is', null),
            eb('last_heartbeat', '<', options.heartbeatTimeout)
          ])
        );
      }

      // 如果指定了限制数量
      if (options?.limit) {
        qb = qb.limit(options.limit);
      }

      return qb.orderBy('updated_at', 'asc');
    });
  }

  async findLongRunningInstances(
    thresholdMinutes: number,
    _options?: QueryOptions
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    const thresholdTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    return await this.findMany((qb: any) =>
      qb
        .where('status', '=', 'running')
        .where('started_at', '<=', thresholdTime)
    );
  }

  async updateStatus(
    id: number,
    status: WorkflowStatus,
    additionalData?: Partial<WorkflowInstanceTableUpdate>
  ): Promise<DatabaseResult<WorkflowInstanceTable | null>> {
    const updateData: WorkflowInstanceTableUpdate = {
      status,
      updated_at: new Date(),
      ...additionalData
    };

    // 根据状态设置相应的时间戳
    if (status === 'running' && !additionalData?.started_at) {
      updateData.started_at = new Date();
    } else if (status === 'completed' && !additionalData?.completed_at) {
      updateData.completed_at = new Date();
    } else if (status === 'interrupted' && !additionalData?.interrupted_at) {
      updateData.interrupted_at = new Date();
    }

    return await this.updateNullable(id, updateData);
  }

  async batchUpdateStatus(
    ids: number[],
    status: WorkflowStatus
  ): Promise<DatabaseResult<number>> {
    return await super.batchUpdateStatus(ids, status, {
      updated_at: new Date()
    });
  }

  /**
   * 更新当前节点
   * @param id 实例ID
   * @param nodeId 当前节点ID
   * @param checkpointData 检查点数据
   * @returns 更新结果
   */
  async updateCurrentNode(
    id: number,
    nodeId: string,
    checkpointData?: any
  ): Promise<DatabaseResult<boolean>> {
    try {
      this.logger.debug('Updating current node', {
        instanceId: id,
        nodeId,
        checkpointData
      });

      const updateData: Partial<WorkflowInstanceTableUpdate> = {
        current_node_id: nodeId,
        updated_at: new Date()
      };

      // 如果提供了检查点数据，序列化并保存
      if (checkpointData !== undefined) {
        updateData.checkpoint_data = checkpointData;
      }

      const result = await this.updateNullable(id, updateData);

      if (!result.success) {
        this.logger.error('Failed to update current node', {
          instanceId: id,
          nodeId,
          error: result.error
        });
        return {
          success: false,
          error: result.error
        };
      }

      this.logger.debug('Successfully updated current node', {
        instanceId: id,
        nodeId,
        updated: result.data !== null
      });

      return {
        success: true,
        data: result.data !== null
      };
    } catch (error) {
      this.logger.error('Error updating current node', {
        instanceId: id,
        nodeId,
        error
      });
      return {
        success: false,
        error: error as any
      };
    }
  }

  async findByBusinessKey(
    businessKey: string
  ): Promise<DatabaseResult<WorkflowInstanceTable | null>> {
    return await this.findOneNullable((qb: any) =>
      qb.where('business_key', '=', businessKey)
    );
  }

  async findByMutexKey(
    mutexKey: string
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    return await this.findMany((qb: any) =>
      qb.where('mutex_key', '=', mutexKey).orderBy('created_at', 'desc')
    );
  }

  async findByMutexKeyPattern(
    mutexKeyPattern: string
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    return await this.findMany((qb: any) =>
      qb
        .where('mutex_key', 'like', mutexKeyPattern)
        .orderBy('created_at', 'desc')
    );
  }

  async findByAssignedEngine(
    engineId: string
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    return await this.findMany((qb: any) =>
      qb.where('assigned_engine_id', '=', engineId)
    );
  }

  async findStaleInstances(
    timeoutMinutes: number
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes);

    return await this.findMany((qb: any) =>
      qb
        .where('status', '=', 'running')
        .where('last_heartbeat', '<', cutoffTime)
    );
  }

  /**
   * 检查实例锁 - 根据实例类型检查是否有运行中或中断的实例
   * @param instanceType 实例类型
   * @param excludeStatuses 排除的状态列表
   * @returns 匹配的工作流实例列表
   */
  async checkInstanceLock(
    instanceType: string,
    excludeStatuses: string[] = []
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    try {
      this.logger.debug('检查实例锁（增强版）', {
        instanceType,
        excludeStatuses
      });

      const result = await this.findMany((qb: any) => {
        qb = qb.where('instance_type', '=', instanceType);

        // 默认检查的状态：运行中、中断、待执行
        const defaultStatuses = ['running', 'interrupted', 'pending'];
        const checkStatuses = defaultStatuses.filter(
          (s) => !excludeStatuses.includes(s)
        );

        qb = qb.where('status', 'in', checkStatuses);

        return qb.orderBy('created_at', 'desc').limit(1); // 限制结果数量提升性能
      });

      if (result.success) {
        this.logger.debug('实例锁检查完成（增强版）', {
          instanceType,
          conflictCount: result.data?.length || 0,
          conflicts: result.data?.map((i) => ({
            id: i.id,
            status: i.status,
            createdAt: i.created_at
          }))
        });
      } else {
        this.logger.warn('实例锁检查失败', {
          instanceType,
          error: result.error
        });
      }

      return result;
    } catch (error) {
      this.logger.error('实例锁检查异常', {
        instanceType,
        error
      });
      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 检查业务实例锁 - 根据业务键检查是否有已执行的实例
   * @param businessKey 业务键
   * @returns 匹配的工作流实例列表
   */
  async checkBusinessInstanceLock(
    businessKey: string
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    try {
      this.logger.debug('检查业务实例锁', { businessKey });

      const result = await this.findMany(
        (qb: any) =>
          qb
            .where('business_key', '=', businessKey)
            .where('status', 'in', ['running', 'completed', 'interrupted'])
            .orderBy('created_at', 'desc')
            .limit(1) // 限制结果数量提升性能
      );

      if (result.success) {
        this.logger.debug('业务实例锁检查完成', {
          businessKey,
          conflictCount: result.data?.length || 0
        });
      } else {
        this.logger.warn('业务实例锁检查失败', {
          businessKey,
          error: result.error
        });
      }

      return result;
    } catch (error) {
      this.logger.error('业务实例锁检查异常', {
        businessKey,
        error
      });
      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 基于工作流名称的实例锁检查（备选方案）
   * @param workflowName 工作流名称
   * @returns 匹配的工作流实例列表
   */
  async checkInstanceLockByWorkflowName(
    workflowName: string
  ): Promise<DatabaseResult<WorkflowInstanceTable[]>> {
    try {
      this.logger.debug('检查工作流名称实例锁', { workflowName });

      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .selectFrom('workflow_instances as wi')
          .innerJoin(
            'workflow_definitions as wd',
            'wi.workflow_definition_id',
            'wd.id'
          )
          .selectAll('wi')
          .where('wd.name', '=', workflowName)
          .where('wi.status', 'in', ['running', 'interrupted', 'pending'])
          .orderBy('wi.created_at', 'desc')
          .limit(100)
          .execute();
      });

      if (result.success) {
        this.logger.debug('工作流名称实例锁检查完成', {
          workflowName,
          conflictCount: result.data?.length || 0
        });

        return {
          success: true,
          data: result.data as WorkflowInstanceTable[]
        };
      } else {
        this.logger.warn('工作流名称实例锁检查失败', {
          workflowName,
          error: result.error
        });

        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      this.logger.error('工作流名称实例锁检查异常', { workflowName, error });
      return {
        success: false,
        error: error as any
      };
    }
  }

  async getStatistics(): Promise<
    DatabaseResult<{
      totalCount: number;
      runningCount: number;
      completedCount: number;
      failedCount: number;
      pausedCount: number;
    }>
  > {
    try {
      const totalCountResult = await this.count();
      const runningCountResult = await this.count((qb: any) =>
        qb.where('status', '=', 'running')
      );
      const completedCountResult = await this.count((qb: any) =>
        qb.where('status', '=', 'completed')
      );
      const failedCountResult = await this.count((qb: any) =>
        qb.where('status', '=', 'failed')
      );
      const pausedCountResult = await this.count((qb: any) =>
        qb.where('status', '=', 'paused')
      );

      return {
        success: true,
        data: {
          totalCount: totalCountResult.success ? totalCountResult.data : 0,
          runningCount: runningCountResult.success
            ? runningCountResult.data
            : 0,
          completedCount: completedCountResult.success
            ? completedCountResult.data
            : 0,
          failedCount: failedCountResult.success ? failedCountResult.data : 0,
          pausedCount: pausedCountResult.success ? pausedCountResult.data : 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 创建工作流实例 - 自定义实现避免SQL语法错误
   * @param data 新工作流实例数据
   * @returns 创建的工作流实例
   */
  async create(
    data: NewWorkflowInstanceTable
  ): Promise<DatabaseResult<WorkflowInstanceTable>> {
    try {
      // 手动构建INSERT SQL，确保字段顺序和值正确
      const insertData = {
        workflow_definition_id: data.workflow_definition_id,
        name: data.name,
        external_id: data.external_id,
        status: data.status,
        instance_type: data.instance_type || 'default',
        input_data: data.input_data ? JSON.stringify(data.input_data) : null,
        output_data: data.output_data ? JSON.stringify(data.output_data) : null,
        context_data: data.context_data
          ? JSON.stringify(data.context_data)
          : '{}',
        started_at: data.started_at,
        completed_at: data.completed_at,
        interrupted_at: data.interrupted_at,
        error_message: data.error_message,
        error_details: data.error_details
          ? JSON.stringify(data.error_details)
          : null,
        retry_count: data.retry_count || 0,
        max_retries: data.max_retries || 3,
        current_node_id: data.current_node_id,
        checkpoint_data: data.checkpoint_data
          ? JSON.stringify(data.checkpoint_data)
          : null,
        business_key: data.business_key,
        mutex_key: data.mutex_key,
        created_by: data.created_by
      };

      // 使用数据库API执行INSERT操作
      const result = await this.databaseApi.executeQuery(async (db) => {
        return await db
          .insertInto('workflow_instances')
          .values({
            workflow_definition_id: insertData.workflow_definition_id,
            name: insertData.name,
            external_id: insertData.external_id,
            status: insertData.status,
            instance_type: insertData.instance_type,
            input_data: insertData.input_data,
            output_data: insertData.output_data,
            context_data: insertData.context_data,
            business_key: insertData.business_key,
            mutex_key: insertData.mutex_key,
            started_at: insertData.started_at,
            completed_at: insertData.completed_at,
            interrupted_at: insertData.interrupted_at,
            error_message: insertData.error_message,
            error_details: insertData.error_details,
            retry_count: insertData.retry_count,
            max_retries: insertData.max_retries,
            current_node_id: insertData.current_node_id,
            checkpoint_data: insertData.checkpoint_data,
            created_by: insertData.created_by
          })
          .executeTakeFirst();
      });

      if (result.success && result.data) {
        // 获取插入的ID
        const insertId = (result.data as any).insertId;
        if (insertId) {
          const getResult = await this.findByIdNullable(insertId);
          if (getResult.success && getResult.data) {
            return {
              success: true,
              data: getResult.data
            };
          }
        }
      }

      return {
        success: false,
        error: 'Insert failed' as any
      };
    } catch (error) {
      this.logger.error('Failed to create workflow instance', error);
      return {
        success: false,
        error: error as any
      };
    }
  }

  /**
   * 使用统一过滤器查找工作流实例（支持分页、排序、复杂过滤）
   */
  async updateWorkflowInstance(
    id: number,
    updates: WorkflowInstanceTableUpdate
  ): Promise<DatabaseResult<WorkflowInstanceTable | null>> {
    return await this.updateNullable(id, updates);
  }

  async deleteWorkflowInstance(id: number): Promise<DatabaseResult<boolean>> {
    try {
      const operation = async (db: any) => {
        const result = await db
          .deleteFrom(this.tableName)
          .where('id', '=', id)
          .execute();

        return result.length > 0;
      };

      return await this.databaseApi.executeQuery(operation, {
        readonly: false
      });
    } catch (error) {
      this.logger.error('Failed to delete workflow instance', { id, error });
      return {
        success: false,
        error: error as any
      };
    }
  }

  async findWithFilters(
    filters: UnifiedWorkflowInstanceFilters
  ): Promise<DatabaseResult<PaginatedResult<WorkflowInstanceTable>>> {
    try {
      this.logger.debug('查找工作流实例（统一过滤器）', { filters });
      console.log(
        '🔍 WorkflowInstanceRepository.findWithFilters - Input filters:',
        filters
      );

      // 设置默认分页参数
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 20;
      const offset = (page - 1) * pageSize;

      // 构建查询 - 简化版本，只使用确定存在的字段
      const result = await this.databaseApi.executeQuery(async (db) => {
        // 只选择基本字段，避免字段不存在的问题
        let query = db
          .selectFrom('workflow_instances')
          .select([
            'id',
            'workflow_definition_id',
            'status',
            'created_at',
            'updated_at',
            'started_at',
            'completed_at'
          ]);

        console.log('🔍 Repository - 开始构建查询，filters:', filters);

        // 状态过滤
        if (filters.status) {
          const statuses = Array.isArray(filters.status)
            ? filters.status
            : [filters.status];
          query = query.where('status', 'in', statuses);
          console.log('🔍 Repository - 添加状态过滤:', statuses);
        }

        // 工作流定义ID过滤
        if (filters.workflowDefinitionId) {
          query = query.where(
            'workflow_definition_id',
            '=',
            filters.workflowDefinitionId
          );
          console.log(
            '🔍 Repository - 添加工作流定义ID过滤:',
            filters.workflowDefinitionId
          );
        }

        // 暂时注释掉可能不存在的字段，避免SQL错误
        // 外部ID精确匹配（如果字段存在）
        // if (filters.externalId) {
        //   query = query.where('external_id', '=', filters.externalId);
        // }

        // 业务键精确匹配（如果字段存在）
        // if (filters.businessKey) {
        //   query = query.where('business_key', '=', filters.businessKey);
        // }

        // 注释掉可能不存在的字段查询，避免SQL错误
        // 名称模糊搜索 - workflow_instances表可能没有name字段
        // if (filters.name) {
        //   query = query.where('name', 'like', `%${filters.name}%`);
        // }

        // 创建者过滤 - 可能不存在created_by字段
        // if (filters.createdBy) {
        //   query = query.where('created_by', '=', filters.createdBy);
        // }

        // 分配的引擎ID过滤 - 可能不存在assigned_engine_id字段
        // if (filters.assignedEngineId) {
        //   query = query.where('assigned_engine_id', '=', filters.assignedEngineId);
        // }

        // 优先级过滤 - 可能不存在priority字段
        // if (filters.priority !== undefined) {
        //   query = query.where('priority', '=', filters.priority);
        // }

        // 创建时间范围过滤
        if (filters.createdAt?.from) {
          query = query.where('created_at', '>=', filters.createdAt.from);
        }
        if (filters.createdAt?.to) {
          query = query.where('created_at', '<=', filters.createdAt.to);
        }

        // 启动时间范围过滤
        if (filters.startedAt?.from) {
          query = query.where('started_at', '>=', filters.startedAt.from);
        }
        if (filters.startedAt?.to) {
          query = query.where('started_at', '<=', filters.startedAt.to);
        }

        // 完成时间范围过滤（使用completed_at字段）
        if (filters.completedAt?.from) {
          query = query.where('completed_at', '>=', filters.completedAt.from);
        }
        if (filters.completedAt?.to) {
          query = query.where('completed_at', '<=', filters.completedAt.to);
        }

        // 标签过滤（暂时跳过，需要根据实际数据库结构实现）
        // TODO: 实现标签过滤逻辑，根据实际的标签存储方式
        if (filters.tags && filters.tags.length > 0) {
          // 如果标签存储在单独的表中，需要使用 JOIN
          // 如果标签存储在 JSON 字段中，需要使用数据库特定的 JSON 查询语法
          this.logger.debug('标签过滤暂未实现', { tags: filters.tags });
        }

        // 排序
        const sortBy = filters.sortBy || 'created_at';
        const sortOrder = filters.sortOrder || 'desc';
        query = query.orderBy(sortBy as any, sortOrder);

        // 先获取总数
        const countQuery = query
          .clearSelect()
          .select(db.fn.count('id').as('total'));
        const countResult = await countQuery.execute();
        const total = Number(countResult[0]?.total || 0);

        console.log('🔍 WorkflowInstanceRepository - Count result:', {
          total,
          countResult
        });

        // 应用分页
        const dataQuery = query.limit(pageSize).offset(offset);
        const data = await dataQuery.execute();

        console.log('🔍 WorkflowInstanceRepository - Data result:', {
          dataLength: data.length,
          firstItem: data[0],
          page,
          pageSize,
          offset
        });

        // 计算分页信息
        const totalPages = Math.ceil(total / pageSize);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        const paginatedResult: PaginatedResult<WorkflowInstanceTable> = {
          items: data as unknown as WorkflowInstanceTable[],
          total,
          page,
          pageSize,
          totalPages,
          hasNext,
          hasPrev
        };

        console.log('🔍 WorkflowInstanceRepository - Final result:', {
          itemsCount: paginatedResult.items.length,
          total: paginatedResult.total,
          page: paginatedResult.page,
          pageSize: paginatedResult.pageSize
        });

        return paginatedResult;
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (error) {
      this.logger.error('查找工作流实例失败（统一过滤器）', { error, filters });
      return {
        success: false,
        error: error as any
      };
    }
  }
}
