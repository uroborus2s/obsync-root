/**
 * 可追踪源的模型类
 * 用于跟踪数据来源和同步状态
 */

import { QueryOptions } from '../types/index.js';
import { BaseModel, ModelHooks } from './base-model.js';

/**
 * 源跟踪模型钩子接口
 */
export interface SourceTrackableModelHooks extends ModelHooks {
  beforeSync?: (
    sourceData: any,
    source: string,
    model: BaseModel | null
  ) => Promise<any> | any;
  afterSync?: (
    model: BaseModel,
    sourceData: any,
    source: string
  ) => Promise<void> | void;
  onSyncError?: (
    error: Error,
    sourceData: any,
    source: string
  ) => Promise<void> | void;
}

/**
 * 同步状态枚举
 */
export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed',
  OUTDATED = 'outdated'
}

/**
 * 可追踪源的模型类，提供数据同步和源跟踪功能
 */
export class SourceTrackableModel extends BaseModel {
  /**
   * 模型钩子
   */
  static hooks?: SourceTrackableModelHooks;

  /**
   * 源字段名
   */
  static sourceColumn: string = 'source';

  /**
   * 源ID字段名
   */
  static sourceIdColumn: string = 'source_id';

  /**
   * 源更新时间字段名
   */
  static sourceUpdatedAtColumn: string = 'source_updated_at';

  /**
   * 源数据字段名
   */
  static sourceDataColumn: string = 'source_data';

  /**
   * 同步状态字段名
   */
  static syncStatusColumn: string = 'sync_status';

  /**
   * 获取同步键（用于标识记录）
   * 子类可以覆盖此方法以提供自定义同步键
   * @param sourceData 源数据
   * @returns 同步键
   */
  static getSyncKey(sourceData: any): any {
    return sourceData.id || sourceData.uuid || sourceData.key;
  }

  /**
   * 转换源数据为模型数据
   * 子类应覆盖此方法以提供自定义转换逻辑
   * @param sourceData 源数据
   * @param existingModel 现有模型（如果存在）
   * @returns 转换后的模型数据
   */
  static transformSourceData(
    sourceData: any,
    existingModel: any = null
  ): Record<string, any> {
    // 基本实现，子类应覆盖
    return { ...sourceData };
  }

  /**
   * 从源数据同步单个记录
   * @param sourceData 源数据
   * @param source 源标识符
   * @param options 查询选项
   * @returns 同步的模型实例
   */
  static async syncFromSource(
    sourceData: any,
    source: string,
    options: QueryOptions = {}
  ): Promise<any> {
    // 调用同步前钩子
    if (this.hooks?.beforeSync) {
      sourceData = await this.hooks.beforeSync(sourceData, source, null);
    }

    try {
      // 获取同步键
      const syncKey = this.getSyncKey(sourceData);

      if (!syncKey) {
        throw new Error('Cannot sync record without sync key.');
      }

      // 查找现有记录
      const existingModel = await this.findBy(
        {
          [this.sourceColumn]: source,
          [this.sourceIdColumn]: syncKey
        },
        options
      );

      // 转换源数据
      const modelData = this.transformSourceData(sourceData, existingModel);

      // 添加源跟踪字段
      const sourceUpdatedAt =
        sourceData.updated_at || sourceData.updatedAt || new Date();
      const syncData = {
        ...modelData,
        [this.sourceColumn]: source,
        [this.sourceIdColumn]: syncKey,
        [this.sourceUpdatedAtColumn]: sourceUpdatedAt,
        [this.sourceDataColumn]: JSON.stringify(sourceData),
        [this.syncStatusColumn]: SyncStatus.SYNCED
      };

      let model;

      if (existingModel) {
        // 更新现有记录
        existingModel.fill(syncData);
        await existingModel.save(options);
        model = existingModel;
      } else {
        // 创建新记录
        model = await this.create(syncData, options);
      }

      // 调用同步后钩子
      if (this.hooks?.afterSync) {
        await this.hooks.afterSync(model, sourceData, source);
      }

      return model;
    } catch (error: unknown) {
      // 调用同步错误钩子
      if (this.hooks?.onSyncError) {
        await this.hooks.onSyncError(error as Error, sourceData, source);
      }

      throw error;
    }
  }

  /**
   * 批量同步源数据
   * @param sourceDataArray 源数据数组
   * @param source 源标识符
   * @param options 查询选项
   * @returns 同步的模型实例数组
   */
  static async syncBatchFromSource(
    sourceDataArray: any[],
    source: string,
    options: QueryOptions = {}
  ): Promise<any[]> {
    const models: any[] = [];

    // 使用事务确保原子性
    await this.getConnection().transaction(async (trx: any) => {
      const transactionOptions = { ...options, transaction: trx };

      for (const sourceData of sourceDataArray) {
        const model = await this.syncFromSource(
          sourceData,
          source,
          transactionOptions
        );
        models.push(model);
      }
    });

    return models;
  }

  /**
   * 查找未同步的记录
   * @param options 查询选项
   * @returns 未同步的模型实例数组
   */
  static async findUnsyncedRecords(options: QueryOptions = {}): Promise<any[]> {
    return this.query(options)
      .where(this.syncStatusColumn, SyncStatus.PENDING)
      .get();
  }

  /**
   * 查找特定源的记录
   * @param source 源标识符
   * @param options 查询选项
   * @returns 源的模型实例数组
   */
  static async findBySource(
    source: string,
    options: QueryOptions = {}
  ): Promise<any[]> {
    return this.query(options).where(this.sourceColumn, source).get();
  }

  /**
   * 查找需要更新的记录
   * @param source 源标识符
   * @param cutoffDate 截止日期，默认为一天前
   * @param options 查询选项
   * @returns 需要更新的模型实例数组
   */
  static async findOutdatedRecords(
    source: string,
    cutoffDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
    options: QueryOptions = {}
  ): Promise<any[]> {
    return this.query(options)
      .where(this.sourceColumn, source)
      .where(this.sourceUpdatedAtColumn, '<', cutoffDate)
      .get();
  }

  /**
   * 标记记录为特定同步状态
   * @param status 同步状态
   * @param options 查询选项
   * @returns 是否成功
   */
  public async markSyncStatus(
    status: SyncStatus,
    options: QueryOptions = {}
  ): Promise<boolean> {
    this.setAttribute(
      (this.constructor as typeof SourceTrackableModel).syncStatusColumn,
      status
    );
    return this.save(options);
  }

  /**
   * 获取源数据
   * @returns 解析后的源数据
   */
  public getSourceData(): any {
    const sourceDataColumn = (this.constructor as typeof SourceTrackableModel)
      .sourceDataColumn;
    const sourceData = this.getAttribute(sourceDataColumn);

    if (!sourceData) {
      return null;
    }

    try {
      return JSON.parse(sourceData);
    } catch (error) {
      return null;
    }
  }
}
