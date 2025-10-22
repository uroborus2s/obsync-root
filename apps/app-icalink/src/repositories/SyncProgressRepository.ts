import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import { isSome, type Maybe } from '@stratix/utils/functional';
import type {
  SyncProgressEntity,
  CreateSyncProgressInput,
  UpdateSyncProgressInput
} from '../types/sync-progress-entity.js';

/**
 * 同步进度表 Schema 定义
 */
const schema = new SchemaBuilder('sync_progress')
  .addColumn('id', DataColumnType.BIGINT, {
    primaryKey: true,
    autoIncrement: true
  })
  .addColumn('task_name', DataColumnType.STRING, {
    length: 100,
    nullable: false,
    unique: true
  })
  .addColumn('file_id', DataColumnType.STRING, { length: 50, nullable: false })
  .addColumn('sheet_id', DataColumnType.INTEGER, { nullable: false })
  .addColumn('status', DataColumnType.STRING, { length: 20, nullable: false })
  .addColumn('total_count', DataColumnType.INTEGER, { nullable: false })
  .addColumn('synced_count', DataColumnType.INTEGER, { nullable: false })
  .addColumn('current_offset', DataColumnType.INTEGER, { nullable: false })
  .addColumn('batch_size', DataColumnType.INTEGER, { nullable: false })
  .addColumn('started_at', DataColumnType.TIMESTAMP, { nullable: true })
  .addColumn('completed_at', DataColumnType.TIMESTAMP, { nullable: true })
  .addColumn('last_updated_at', DataColumnType.TIMESTAMP, { nullable: false })
  .addColumn('error_message', DataColumnType.TEXT, { nullable: true })
  .addColumn('failure_count', DataColumnType.INTEGER, { nullable: false })
  .addUniqueIndex('idx_task_name', ['task_name'])
  .addIndex('idx_status', ['status'])
  .setComment('同步进度表-记录各种同步任务的进度信息')
  .build();

/**
 * 同步进度仓储实现
 * 负责持久化同步进度信息，支持断点续传
 */
export default class SyncProgressRepository extends BaseRepository<
  any,
  'sync_progress',
  SyncProgressEntity
> {
  protected readonly tableName = 'sync_progress';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ SyncProgressRepository initialized');
  }

  /**
   * 根据任务名称查找同步进度
   * @param taskName 任务名称
   * @returns 同步进度记录（可能不存在）
   */
  public async findByTaskName(
    taskName: string
  ): Promise<SyncProgressEntity | undefined> {
    if (!taskName) {
      this.logger.warn('findByTaskName called with empty taskName');
      return undefined;
    }

    this.logger.debug({ taskName }, 'Finding sync progress by task name');

    const result = (await this.findOne((qb) =>
      qb.where('task_name', '=', taskName)
    )) as unknown as Maybe<SyncProgressEntity>;

    return isSome(result) ? result.value : undefined;
  }

  /**
   * 根据状态查找同步进度列表
   * @param status 同步状态
   * @returns 同步进度列表
   */
  public async findByStatus(status: string): Promise<SyncProgressEntity[]> {
    if (!status) {
      this.logger.warn('findByStatus called with empty status');
      return [];
    }

    this.logger.debug({ status }, 'Finding sync progress by status');

    const result = (await this.findMany(
      (qb) => qb.where('status', '=', status),
      {
        orderBy: { field: 'last_updated_at', direction: 'desc' }
      }
    )) as unknown as SyncProgressEntity[];

    return result;
  }

  /**
   * 查找所有进行中的同步任务
   * @returns 进行中的同步任务列表
   */
  public async findInProgress(): Promise<SyncProgressEntity[]> {
    return this.findByStatus('in_progress');
  }

  /**
   * 查找所有失败的同步任务
   * @returns 失败的同步任务列表
   */
  public async findFailed(): Promise<SyncProgressEntity[]> {
    return this.findByStatus('failed');
  }

  /**
   * 创建或更新同步进度
   * 如果任务名称已存在则更新，否则创建新记录
   * @param taskName 任务名称
   * @param data 同步进度数据
   * @returns 同步进度记录
   */
  public async upsertByTaskName(
    taskName: string,
    data: Partial<CreateSyncProgressInput>
  ): Promise<SyncProgressEntity | undefined> {
    this.logger.debug({ taskName, data }, 'Upserting sync progress');

    // 查找现有记录
    const existing = await this.findByTaskName(taskName);

    if (existing) {
      // 更新现有记录
      this.logger.debug({ taskName }, 'Updating existing sync progress');

      const updateData: UpdateSyncProgressInput = {
        ...data,
        last_updated_at: new Date().toISOString()
      };

      const result = await this.update(existing.id, updateData as any);

      if (result && 'right' in result && result.right) {
        return result.right as unknown as SyncProgressEntity;
      }

      this.logger.error('Failed to update sync progress');
      return undefined;
    } else {
      // 创建新记录
      this.logger.debug({ taskName }, 'Creating new sync progress');

      const createData: CreateSyncProgressInput = {
        task_name: taskName,
        file_id: data.file_id || '',
        sheet_id: data.sheet_id || 0,
        status: data.status || 'not_started',
        total_count: data.total_count || 0,
        synced_count: data.synced_count || 0,
        current_offset: data.current_offset || 0,
        batch_size: data.batch_size || 100,
        started_at: data.started_at || null,
        completed_at: data.completed_at || null,
        last_updated_at: new Date().toISOString(),
        error_message: data.error_message || null,
        failure_count: data.failure_count || 0
      };

      const result = await this.create(createData as any);

      if (result && 'right' in result && result.right) {
        return result.right as unknown as SyncProgressEntity;
      }

      this.logger.error('Failed to create sync progress');
      return undefined;
    }
  }

  /**
   * 删除指定任务的同步进度
   * @param taskName 任务名称
   * @returns 是否删除成功
   */
  public async deleteByTaskName(taskName: string): Promise<boolean> {
    this.logger.debug({ taskName }, 'Deleting sync progress by task name');

    const existing = await this.findByTaskName(taskName);

    if (!existing) {
      this.logger.warn({ taskName }, 'Sync progress not found');
      return false;
    }

    const result = await this.delete(existing.id);

    if (result && 'right' in result) {
      this.logger.info({ taskName }, 'Sync progress deleted');
      return true;
    }

    this.logger.error({ taskName }, 'Failed to delete sync progress');
    return false;
  }

  /**
   * 清理已完成的同步进度（保留最近N天的记录）
   * @param daysToKeep 保留天数（默认7天）
   * @returns 删除的记录数
   */
  public async cleanupCompleted(daysToKeep: number = 7): Promise<number> {
    this.logger.info({ daysToKeep }, 'Cleaning up completed sync progress');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = (await this.deleteMany((qb) =>
      qb
        .where('status', '=', 'completed')
        .where('completed_at', '<', cutoffDate.toISOString())
    )) as any;

    const deletedCount =
      result && 'right' in result ? (result.right as number) : 0;

    this.logger.info({ deletedCount }, 'Cleanup completed');

    return deletedCount;
  }
}

