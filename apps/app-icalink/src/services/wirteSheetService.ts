import { Logger } from '@stratix/core';
import { WpsDBSheetAdapter } from '@stratix/was-v7';
import {
  ABSENT_STUDENT_RELATION_FIELDS,
  FIELD_NAME_MAPPING,
  formatDateForWps,
  getAbsenceTypeLabel
} from '../config/wps-dbsheet-fields.js';
import AbsentStudentRelationRepository from '../repositories/AbsentStudentRelationRepository.js';
import SyncProgressRepository from '../repositories/SyncProgressRepository.js';
import WpsFieldMappingRepository from '../repositories/WpsFieldMappingRepository.js';
import type { IcalinkAbsentStudentRelation } from '../types/database.js';
import {
  SyncStatus,
  type SyncProgress,
  type SyncSummary
} from '../types/sync-progress.js';

/**
 * WPS 多维表写入服务配置选项
 */
export interface WriteSheetServiceOptions {
  /**
   * 批量写入大小（每批写入的记录数）
   * @default 100
   */
  batchSize?: number;

  /**
   * WPS 文件 ID
   * @default '459309344199'
   */
  fileId?: string;

  /**
   * WPS Sheet ID
   * @default 1
   */
  sheetId?: number;
}

/**
 * WPS 多维表写入服务
 * 负责将缺勤学生关系数据同步到 WPS 多维表
 */
export default class WriteSheetService {
  // WPS 多维表配置
  // TODO: 这些配置应该从系统配置表中读取
  private readonly WPS_FILE_ID: string;
  private readonly WPS_SHEET_ID: number;

  /**
   * 批量写入大小（每批写入的记录数）
   * 默认值为 100 条/批
   */
  private readonly batchSize: number;

  /**
   * 同步任务名称
   */
  private readonly SYNC_TASK_NAME = 'absent_student_relations_sync';

  /**
   * 字段映射缓存
   * 存储 WPS 字段 ID 与数据库字段名的映射关系
   */
  private fieldMappingCache: Map<string, string> | null = null;

  constructor(
    private readonly logger: Logger,
    private readonly wasV7ApiDbsheet: WpsDBSheetAdapter,
    private readonly absentStudentRelationRepository: AbsentStudentRelationRepository,
    private readonly syncProgressRepository: SyncProgressRepository,
    private readonly wpsFieldMappingRepository: WpsFieldMappingRepository
  ) {
    // 初始化配置，使用传入的选项或默认值
    this.WPS_FILE_ID = '459309344199';
    this.WPS_SHEET_ID = 1;
    this.batchSize = 100;

    // 验证批量大小
    this.validateBatchSize(this.batchSize);

    this.logger.info('WriteSheetService 初始化完成', {
      fileId: this.WPS_FILE_ID,
      sheetId: this.WPS_SHEET_ID,
      batchSize: this.batchSize
    });
  }

  /**
   * 验证批量大小参数
   * @param batchSize 批量大小
   * @throws {Error} 如果批量大小无效
   */
  private validateBatchSize(batchSize: number): void {
    if (!Number.isInteger(batchSize) || batchSize <= 0) {
      const errorMsg = `批量大小必须是大于 0 的整数，当前值: ${batchSize}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (batchSize > 1000) {
      this.logger.warn(
        `批量大小 ${batchSize} 较大，可能导致 API 请求超时，建议设置为 1000 以下`
      );
    }
  }

  /**
   * 创建缺失的 WPS 字段
   * 根据配置自动创建 WPS 多维表中不存在的字段
   * @param existingFields 已存在的字段列表
   * @returns 创建的字段数量
   */
  private async createMissingWpsFields(
    existingFields: Array<{ id?: string; name: string; type: string }>
  ): Promise<number> {
    try {
      this.logger.info('检查并创建缺失的 WPS 字段');

      // 找出所有缺失的字段
      const missingFields = ABSENT_STUDENT_RELATION_FIELDS.filter(
        (fieldDef) => {
          const exists = existingFields.some((f) => f.name === fieldDef.name);
          return !exists;
        }
      );

      if (missingFields.length === 0) {
        this.logger.info('所有字段都已存在，无需创建');
        return 0;
      }

      this.logger.info(`发现 ${missingFields.length} 个缺失字段，开始创建...`);

      let createdCount = 0;

      // 逐个创建字段（避免批量创建可能的问题）
      for (let i = 0; i < missingFields.length; i++) {
        const fieldDef = missingFields[i];

        try {
          this.logger.info(
            `[${i + 1}/${missingFields.length}] 创建字段: ${fieldDef.name} (${fieldDef.type})`
          );

          await this.wasV7ApiDbsheet.createFields(
            this.WPS_FILE_ID,
            this.WPS_SHEET_ID,
            {
              fields: [
                {
                  name: fieldDef.name,
                  type: fieldDef.type,
                  data: fieldDef.data
                }
              ]
            }
          );

          createdCount++;
          this.logger.info(
            `[${i + 1}/${missingFields.length}] ✅ 字段 "${fieldDef.name}" 创建成功`
          );

          // 延迟避免 API 频率限制
          if (i < missingFields.length - 1) {
            await this.delay(200);
          }
        } catch (error: any) {
          // 如果字段已存在，记录警告但继续
          if (error.message?.includes('already exists')) {
            this.logger.warn(
              `[${i + 1}/${missingFields.length}] ⚠️ 字段 "${fieldDef.name}" 已存在，跳过`
            );
          } else {
            this.logger.error(
              `[${i + 1}/${missingFields.length}] ❌ 字段 "${fieldDef.name}" 创建失败`,
              error
            );
            // 继续创建下一个字段
          }
        }
      }

      this.logger.info(
        `字段创建完成，成功创建 ${createdCount}/${missingFields.length} 个字段`
      );

      return createdCount;
    } catch (error: any) {
      this.logger.error('创建缺失字段失败', error);
      return 0;
    }
  }

  /**
   * 初始化字段映射
   * 从 WPS API 获取字段信息，并与数据库字段建立映射关系
   * 如果字段不存在，会自动创建
   * @returns 是否初始化成功
   */
  async initializeFieldMapping(): Promise<boolean> {
    try {
      this.logger.info('开始初始化字段映射');

      // 1. 从 WPS API 获取字段信息
      let schemasResponse = await this.wasV7ApiDbsheet.getSchemas(
        this.WPS_FILE_ID
      );

      if (!schemasResponse || !schemasResponse.sheets) {
        this.logger.error('获取 WPS Schema 信息失败');
        return false;
      }

      // 查找目标 Sheet
      let targetSheet = schemasResponse.sheets.find(
        (sheet) => sheet.id === this.WPS_SHEET_ID
      );

      if (!targetSheet || !targetSheet.fields) {
        this.logger.error(`未找到 Sheet ID ${this.WPS_SHEET_ID} 或字段信息`);
        return false;
      }

      this.logger.info(`从 WPS API 获取到 ${targetSheet.fields.length} 个字段`);

      // 2. 检查并创建缺失的字段
      const createdCount = await this.createMissingWpsFields(
        targetSheet.fields
      );

      // 如果创建了新字段，重新获取 Schema
      if (createdCount > 0) {
        this.logger.info('重新获取 WPS Schema 信息...');
        schemasResponse = await this.wasV7ApiDbsheet.getSchemas(
          this.WPS_FILE_ID
        );

        targetSheet = schemasResponse.sheets.find(
          (sheet) => sheet.id === this.WPS_SHEET_ID
        );

        if (!targetSheet || !targetSheet.fields) {
          this.logger.error('重新获取 Schema 失败');
          return false;
        }

        this.logger.info(`重新获取后共有 ${targetSheet.fields.length} 个字段`);
      }

      // 3. 构建字段映射数据
      const mappings: Array<{
        dbFieldName: string;
        wpsFieldId: string;
        wpsFieldName: string;
        wpsFieldType: string;
        sortOrder: number;
      }> = [];

      // 遍历配置的字段定义，查找对应的 WPS 字段 ID
      ABSENT_STUDENT_RELATION_FIELDS.forEach((fieldDef, index) => {
        const wpsFieldName = fieldDef.name;

        // 在 WPS API 返回的字段中查找匹配的字段
        const wpsField = targetSheet!.fields.find(
          (f) => f.name === wpsFieldName
        );

        if (wpsField && wpsField.id) {
          // 从 FIELD_NAME_MAPPING 中查找对应的数据库字段名
          const dbFieldName = Object.keys(FIELD_NAME_MAPPING).find(
            (key) => FIELD_NAME_MAPPING[key] === wpsFieldName
          );

          if (dbFieldName) {
            mappings.push({
              dbFieldName,
              wpsFieldId: wpsField.id,
              wpsFieldName: wpsField.name,
              wpsFieldType: wpsField.type as string,
              sortOrder: index + 1
            });

            this.logger.debug(
              `字段映射: ${dbFieldName} -> ${wpsFieldName} (${wpsField.id})`
            );
          } else {
            this.logger.warn(`未找到字段 ${wpsFieldName} 对应的数据库字段名`);
          }
        } else {
          this.logger.warn(`WPS 中未找到字段: ${wpsFieldName}`);
        }
      });

      this.logger.info(`成功构建 ${mappings.length} 个字段映射`);

      // 4. 批量保存到数据库
      const savedCount = await this.wpsFieldMappingRepository.batchUpsert(
        this.WPS_FILE_ID,
        this.WPS_SHEET_ID,
        mappings
      );

      this.logger.info(`成功保存 ${savedCount} 个字段映射到数据库`);

      // 5. 加载字段映射到缓存
      await this.loadFieldMappingCache();

      return savedCount > 0;
    } catch (error: any) {
      this.logger.error('初始化字段映射失败', error);
      return false;
    }
  }

  /**
   * 加载字段映射到缓存
   * 从数据库加载字段映射，构建 WPS 字段 ID -> 数据库字段名的映射
   */
  private async loadFieldMappingCache(): Promise<void> {
    try {
      this.logger.debug('加载字段映射到缓存');

      const mappings =
        await this.wpsFieldMappingRepository.findActiveByFileAndSheet(
          this.WPS_FILE_ID,
          this.WPS_SHEET_ID
        );

      this.fieldMappingCache = new Map();

      mappings.forEach((mapping) => {
        this.fieldMappingCache!.set(
          mapping.wps_field_id,
          mapping.db_field_name
        );
      });

      this.logger.info(
        `字段映射缓存已加载，共 ${this.fieldMappingCache.size} 个映射`
      );
    } catch (error: any) {
      this.logger.error('加载字段映射缓存失败', error);
      this.fieldMappingCache = null;
    }
  }

  /**
   * 服务就绪时执行
   * 从数据库读取缺勤记录并写入 WPS 多维表
   */
  onReady() {
    const process = async () => {
      this.logger.info('WriteSheetService ready');

      try {
        // 自动触发一次同步（从头开始）
        await this.triggerSync(false);
      } catch (error) {
        this.logger.error(
          'Failed to sync absent student relations to WPS',
          error
        );
      }
    };
    // process();
  }

  /**
   * 手动触发同步
   * @param resumeFromLast 是否从上次中断位置继续（默认：false）
   * @returns 同步摘要
   */
  async triggerSync(resumeFromLast: boolean = false): Promise<SyncSummary> {
    this.logger.info('手动触发同步', { resumeFromLast });
    return await this.syncAbsentStudentRelationsToWps(resumeFromLast);
  }

  /**
   * 获取当前同步进度
   * @returns 同步进度信息
   */
  async getSyncProgress(): Promise<SyncProgress | null> {
    try {
      const entity = await this.syncProgressRepository.findByTaskName(
        this.SYNC_TASK_NAME
      );

      if (!entity) {
        return null;
      }

      // 将数据库实体转换为 SyncProgress 类型
      return {
        fileId: entity.file_id,
        sheetId: entity.sheet_id,
        status: entity.status as SyncStatus,
        totalCount: entity.total_count,
        syncedCount: entity.synced_count,
        currentOffset: entity.current_offset,
        batchSize: entity.batch_size,
        startedAt: entity.started_at ? new Date(entity.started_at) : undefined,
        completedAt: entity.completed_at
          ? new Date(entity.completed_at)
          : undefined,
        lastUpdatedAt: new Date(entity.last_updated_at),
        errorMessage: entity.error_message || undefined,
        failureCount: entity.failure_count
      };
    } catch (error: any) {
      this.logger.error('获取同步进度失败', error);
      return null;
    }
  }

  /**
   * 重置同步进度（清除断点信息）
   */
  async resetSyncProgress(): Promise<void> {
    try {
      this.logger.info('重置同步进度');
      await this.syncProgressRepository.deleteByTaskName(this.SYNC_TASK_NAME);
      this.logger.info('同步进度已重置');
    } catch (error: any) {
      this.logger.error('重置同步进度失败', error);
      throw error;
    }
  }

  /**
   * 批量创建 WPS 多维表字段
   * 从 ABSENT_STUDENT_RELATION_FIELDS 配置中读取字段定义
   * 跳过已创建的字段（ID 和 课程统计ID），从 课程ID 开始创建
   *
   * @returns Promise<void>
   * @throws {Error} 如果字段创建失败
   */
  async createWpsFields(): Promise<void> {
    this.logger.info('开始批量创建 WPS 多维表字段');

    // 跳过索引 0（ID）和索引 1（课程统计ID），从索引 2（课程ID）开始
    const fieldsToCreate = ABSENT_STUDENT_RELATION_FIELDS.slice(2);
    const totalFields = fieldsToCreate.length;

    this.logger.info(`需要创建 ${totalFields} 个字段（跳过 ID 和 课程统计ID）`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    // 逐个创建字段
    for (let i = 0; i < fieldsToCreate.length; i++) {
      const field = fieldsToCreate[i];
      const progress = `[${i + 1}/${totalFields}]`;

      try {
        this.logger.info(
          `${progress} 正在创建字段: ${field.name} (类型: ${field.type})`
        );

        // 调用 API 创建单个字段
        await this.wasV7ApiDbsheet.createFields(
          this.WPS_FILE_ID,
          this.WPS_SHEET_ID,
          {
            fields: [field]
          }
        );

        successCount++;
        this.logger.info(`${progress} ✅ 字段 "${field.name}" 创建成功`);

        // 添加延迟避免 API 频率限制（每个字段之间延迟 200ms）
        if (i < fieldsToCreate.length - 1) {
          await this.delay(200);
        }
      } catch (error: any) {
        // 检查是否是字段已存在的错误
        const errorMessage = error?.message || String(error);
        if (
          errorMessage.includes('已存在') ||
          errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate')
        ) {
          skipCount++;
          this.logger.warn(
            `${progress} ⚠️  字段 "${field.name}" 已存在，跳过创建`
          );
        } else {
          failCount++;
          this.logger.error(
            `${progress} ❌ 字段 "${field.name}" 创建失败`,
            error
          );
          // 继续创建下一个字段，不抛出异常
        }
      }
    }

    // 输出创建结果摘要
    this.logger.info('WPS 多维表字段创建完成', {
      总字段数: totalFields,
      成功创建: successCount,
      已存在跳过: skipCount,
      创建失败: failCount
    });

    // 如果有失败的字段，抛出异常
    if (failCount > 0) {
      throw new Error(
        `部分字段创建失败：成功 ${successCount}，失败 ${failCount}，跳过 ${skipCount}`
      );
    }
  }

  /**
   * 延迟执行
   * @param ms 延迟毫秒数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 初始化同步进度
   * @param totalCount 总记录数
   * @param resumeFromLast 是否从上次位置继续
   * @returns 起始偏移量
   */
  private async initializeSyncProgress(
    totalCount: number,
    resumeFromLast: boolean
  ): Promise<number> {
    try {
      // 如果要从上次位置继续，尝试从数据库加载进度
      if (resumeFromLast) {
        const existingProgress =
          await this.syncProgressRepository.findByTaskName(this.SYNC_TASK_NAME);

        if (existingProgress && existingProgress.status !== 'completed') {
          this.logger.info('从上次中断位置继续同步', {
            lastOffset: existingProgress.current_offset,
            syncedCount: existingProgress.synced_count
          });

          // 更新状态为进行中
          await this.syncProgressRepository.upsertByTaskName(
            this.SYNC_TASK_NAME,
            {
              status: 'in_progress',
              last_updated_at: new Date().toISOString()
            }
          );

          return existingProgress.current_offset;
        }
      }

      // 否则从头开始，创建新的进度记录
      await this.syncProgressRepository.upsertByTaskName(this.SYNC_TASK_NAME, {
        file_id: this.WPS_FILE_ID,
        sheet_id: this.WPS_SHEET_ID,
        status: 'in_progress',
        total_count: totalCount,
        synced_count: 0,
        current_offset: 0,
        batch_size: this.batchSize,
        started_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
        failure_count: 0
      });

      this.logger.info('初始化新的同步任务', {
        totalCount,
        batchSize: this.batchSize
      });

      return 0;
    } catch (error: any) {
      this.logger.error('初始化同步进度失败', error);
      return 0;
    }
  }

  /**
   * 更新同步进度
   * @param currentOffset 当前偏移量
   * @param syncedCount 已同步数量
   */
  private async updateSyncProgress(
    currentOffset: number,
    syncedCount: number
  ): Promise<void> {
    try {
      await this.syncProgressRepository.upsertByTaskName(this.SYNC_TASK_NAME, {
        current_offset: currentOffset,
        synced_count: syncedCount,
        last_updated_at: new Date().toISOString()
      });

      // 获取总数用于计算进度百分比
      const progress = await this.syncProgressRepository.findByTaskName(
        this.SYNC_TASK_NAME
      );

      if (progress) {
        const percentage = Math.round(
          (syncedCount / progress.total_count) * 100
        );
        this.logger.debug('同步进度已更新', {
          currentOffset,
          syncedCount,
          totalCount: progress.total_count,
          progress: `${percentage}%`
        });
      }
    } catch (error: any) {
      this.logger.error('更新同步进度失败', error);
    }
  }

  /**
   * 完成同步进度
   * @param success 是否成功
   */
  private async completeSyncProgress(success: boolean): Promise<void> {
    try {
      const status = success ? 'completed' : 'failed';
      const now = new Date().toISOString();

      await this.syncProgressRepository.upsertByTaskName(this.SYNC_TASK_NAME, {
        status,
        completed_at: now,
        last_updated_at: now
      });

      const progress = await this.syncProgressRepository.findByTaskName(
        this.SYNC_TASK_NAME
      );

      if (progress) {
        this.logger.info('同步任务完成', {
          status,
          syncedCount: progress.synced_count,
          totalCount: progress.total_count
        });
      }
    } catch (error: any) {
      this.logger.error('完成同步进度失败', error);
    }
  }

  /**
   * 标记同步失败
   * @param errorMessage 错误信息
   */
  private async failSyncProgress(errorMessage: string): Promise<void> {
    try {
      const progress = await this.syncProgressRepository.findByTaskName(
        this.SYNC_TASK_NAME
      );

      const failureCount = progress ? progress.failure_count + 1 : 1;

      await this.syncProgressRepository.upsertByTaskName(this.SYNC_TASK_NAME, {
        status: 'failed',
        error_message: errorMessage,
        failure_count: failureCount,
        last_updated_at: new Date().toISOString()
      });

      this.logger.error('同步任务失败', {
        errorMessage,
        failureCount,
        currentOffset: progress?.current_offset || 0
      });
    } catch (error: any) {
      this.logger.error('标记同步失败状态失败', error);
    }
  }

  /**
   * 创建同步摘要
   */
  private createSyncSummary(
    success: boolean,
    totalCount: number,
    syncedCount: number,
    failedCount: number,
    totalBatches: number,
    successBatches: number,
    failedBatches: number,
    startedAt: Date,
    completedAt: Date,
    errors: string[]
  ): SyncSummary {
    return {
      success,
      totalCount,
      syncedCount,
      failedCount,
      totalBatches,
      successBatches,
      failedBatches,
      startedAt,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      errors
    };
  }

  /**
   * 写入单个批次的记录到 WPS
   * @param wpsRecords WPS 格式的记录
   * @param batchNumber 批次号
   */
  private async writeRecordsBatchToWps(
    wpsRecords: Array<{ fields_value: Record<string, any> }>,
    batchNumber: number
  ): Promise<void> {
    try {
      this.logger.debug(
        `批次 ${batchNumber}: 准备写入 ${wpsRecords.length} 条记录`
      );

      const result = await this.wasV7ApiDbsheet.createRecords(
        this.WPS_FILE_ID,
        this.WPS_SHEET_ID,
        {
          records: wpsRecords
        }
      );

      this.logger.debug(`批次 ${batchNumber}: 写入成功`, {
        requestCount: wpsRecords.length,
        responseCount: result.records?.length || 0
      });
    } catch (error) {
      this.logger.error(`批次 ${batchNumber}: 写入失败`, error);
      throw error;
    }
  }

  /**
   * 同步缺勤学生关系数据到 WPS 多维表（支持断点续传）
   * @param resumeFromLast 是否从上次中断位置继续（默认：false，从头开始）
   * @returns 同步摘要
   */
  private async syncAbsentStudentRelationsToWps(
    resumeFromLast: boolean = false
  ): Promise<SyncSummary> {
    this.logger.info('开始同步缺勤学生关系数据到 WPS 多维表', {
      resumeFromLast
    });

    const startTime = new Date();
    const errors: string[] = [];

    try {
      // 1. 加载字段映射缓存
      if (!this.fieldMappingCache) {
        this.logger.info('字段映射缓存未加载，开始加载...');
        await this.loadFieldMappingCache();
      }

      // 检查缓存是否加载成功
      if (!this.fieldMappingCache || this.fieldMappingCache.size === 0) {
        this.logger.warn('字段映射缓存为空，尝试初始化字段映射...');
        const initialized = await this.initializeFieldMapping();
        if (!initialized) {
          throw new Error('字段映射初始化失败，无法继续同步');
        }
      }

      // 2. 获取总记录数
      const totalCount =
        await this.absentStudentRelationRepository.getTotalCount();

      if (totalCount === 0) {
        this.logger.info('没有找到缺勤记录，跳过同步');
        return this.createSyncSummary(
          true,
          totalCount,
          0,
          0,
          0,
          0,
          0,
          startTime,
          new Date(),
          []
        );
      }

      this.logger.info(`数据库中共有 ${totalCount} 条缺勤记录`);

      // 3. 初始化或恢复同步进度
      const startOffset = await this.initializeSyncProgress(
        totalCount,
        resumeFromLast
      );

      this.logger.info(`从偏移量 ${startOffset} 开始同步`, {
        totalCount,
        batchSize: this.batchSize,
        estimatedBatches: Math.ceil((totalCount - startOffset) / this.batchSize)
      });

      // 3. 分批同步数据
      let currentOffset = startOffset;
      let syncedCount = startOffset; // 已同步数量（包括之前的）
      let totalBatches = 0;
      let successBatches = 0;
      let failedBatches = 0;

      while (currentOffset < totalCount) {
        totalBatches++;
        const batchNumber = Math.floor(currentOffset / this.batchSize) + 1;
        const totalBatchesEstimate = Math.ceil(totalCount / this.batchSize);

        this.logger.info(
          `[${batchNumber}/${totalBatchesEstimate}] 开始同步第 ${batchNumber} 批，偏移量: ${currentOffset}`
        );

        try {
          // 3.1 从数据库分页读取数据
          const records =
            await this.absentStudentRelationRepository.findWithPagination(
              currentOffset,
              this.batchSize
            );

          if (records.length === 0) {
            this.logger.warn(
              `第 ${batchNumber} 批没有读取到数据，可能已到末尾`
            );
            break;
          }

          this.logger.info(
            `[${batchNumber}/${totalBatchesEstimate}] 读取到 ${records.length} 条记录`
          );

          // 3.2 转换为 WPS 格式
          const wpsRecords = this.convertToWpsRecords(records);

          // 3.3 写入 WPS 多维表
          await this.writeRecordsBatchToWps(wpsRecords, batchNumber);

          // 3.4 更新进度
          currentOffset += records.length;
          syncedCount += records.length;
          successBatches++;

          await this.updateSyncProgress(currentOffset, syncedCount);

          this.logger.info(
            `[${batchNumber}/${totalBatchesEstimate}] ✅ 第 ${batchNumber} 批同步成功，已同步 ${syncedCount}/${totalCount} 条记录 (${Math.round((syncedCount / totalCount) * 100)}%)`
          );

          // 3.5 批次间延迟，避免 API 频率限制
          if (currentOffset < totalCount) {
            await this.delay(100);
          }
        } catch (error: any) {
          failedBatches++;
          const errorMsg = `第 ${batchNumber} 批同步失败: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(
            `[${batchNumber}/${totalBatchesEstimate}] ❌ ${errorMsg}`,
            error
          );

          // 记录失败但继续下一批（可选：根据需求决定是否中断）
          // throw error; // 如果需要失败即停止，取消注释这行
          currentOffset += this.batchSize; // 跳过失败的批次
        }
      }

      // 4. 完成同步
      await this.completeSyncProgress(syncedCount >= totalCount);

      const endTime = new Date();
      const summary = this.createSyncSummary(
        failedBatches === 0,
        totalCount,
        syncedCount - startOffset, // 本次同步的数量
        totalCount - syncedCount, // 失败数量
        totalBatches,
        successBatches,
        failedBatches,
        startTime,
        endTime,
        errors
      );

      this.logger.info('同步完成', summary);

      return summary;
    } catch (error: any) {
      this.logger.error('同步缺勤学生关系数据到 WPS 多维表失败', error);
      await this.failSyncProgress(error.message);
      throw error;
    }
  }

  /**
   * 从数据库读取缺勤学生关系记录
   */
  private async fetchAbsentStudentRelations(): Promise<
    IcalinkAbsentStudentRelation[]
  > {
    this.logger.info('从数据库读取缺勤学生关系记录');

    try {
      // 使用 BaseRepository 的 findMany 方法查询所有记录
      // 可以根据需要添加查询条件，例如按日期范围查询
      const result = await this.absentStudentRelationRepository.findMany(
        (qb) => qb, // 查询所有记录，可以添加 where 条件
        {
          orderBy: { field: 'stat_date', direction: 'desc' }, // 按统计日期降序排序
          limit: 1000 // 限制返回数量，避免一次性加载过多数据
        }
      );

      return result as unknown as IcalinkAbsentStudentRelation[];
    } catch (error) {
      this.logger.error('从数据库读取缺勤记录失败', error);
      throw error;
    }
  }

  /**
   * 获取 WPS 字段 ID
   * 从字段映射缓存中查找数据库字段名对应的 WPS 字段 ID
   * @param dbFieldName 数据库字段名
   * @returns WPS 字段 ID，如果未找到则返回中文字段名（兼容旧逻辑）
   */
  private getWpsFieldId(dbFieldName: string): string {
    if (!this.fieldMappingCache) {
      // 如果缓存未加载，使用中文字段名（兼容旧逻辑）
      return FIELD_NAME_MAPPING[dbFieldName] || dbFieldName;
    }

    // 从缓存中查找 WPS 字段 ID
    // 注意：缓存的 key 是 wps_field_id，value 是 db_field_name
    // 所以需要反向查找
    for (const [
      wpsFieldId,
      cachedDbFieldName
    ] of this.fieldMappingCache.entries()) {
      if (cachedDbFieldName === dbFieldName) {
        return wpsFieldId;
      }
    }

    // 如果未找到，使用中文字段名（兼容旧逻辑）
    this.logger.warn(
      `未找到字段 ${dbFieldName} 的 WPS 字段 ID，使用中文字段名`
    );
    return FIELD_NAME_MAPPING[dbFieldName] || dbFieldName;
  }

  /**
   * 将数据库记录转换为 WPS 多维表记录格式
   * 使用字段映射缓存将数据库字段名转换为 WPS 字段 ID
   */
  private convertToWpsRecords(
    records: IcalinkAbsentStudentRelation[]
  ): Array<{ fields_value: Record<string, any> }> {
    return records.map((record) => ({
      fields_value: {
        // 使用字段映射缓存获取 WPS 字段 ID
        [this.getWpsFieldId('course_stats_id')]: record.course_stats_id,
        [this.getWpsFieldId('course_id')]: record.course_id,
        [this.getWpsFieldId('course_code')]: record.course_code,
        [this.getWpsFieldId('course_name')]: record.course_name,
        [this.getWpsFieldId('student_id')]: record.student_id,
        [this.getWpsFieldId('student_name')]: record.student_name,
        [this.getWpsFieldId('school_name')]: record.school_name || '',
        [this.getWpsFieldId('class_name')]: record.class_name || '',
        [this.getWpsFieldId('major_name')]: record.major_name || '',
        [this.getWpsFieldId('absence_type')]: getAbsenceTypeLabel(
          record.absence_type
        ),
        [this.getWpsFieldId('stat_date')]: formatDateForWps(record.stat_date),
        [this.getWpsFieldId('semester')]: record.semester,
        [this.getWpsFieldId('teaching_week')]: record.teaching_week,
        [this.getWpsFieldId('week_day')]: record.week_day,
        [this.getWpsFieldId('periods')]: record.periods || '',
        [this.getWpsFieldId('time_period')]: record.time_period,
        [this.getWpsFieldId('leave_reason')]: record.leave_reason || ''
      }
    }));
  }

  /**
   * 批量写入记录到 WPS 多维表
   * @param records 要写入的记录数组
   */
  private async writeRecordsToWps(
    records: Array<{ fields_value: Record<string, any> }>
  ): Promise<void> {
    if (records.length === 0) {
      this.logger.info('没有记录需要写入，跳过');
      return;
    }

    this.logger.info(
      `准备写入 ${records.length} 条记录到 WPS 多维表（批量大小: ${this.batchSize} 条/批）`
    );

    try {
      // 分批写入，避免单次请求数据量过大
      const batches = this.chunkArray(records, this.batchSize);
      const totalBatches = batches.length;

      this.logger.info(
        `总共 ${records.length} 条记录，分为 ${totalBatches} 批处理`
      );

      for (let i = 0; i < totalBatches; i++) {
        const batch = batches[i];
        const batchNumber = i + 1;

        this.logger.info(
          `[${batchNumber}/${totalBatches}] 开始写入第 ${batchNumber} 批，共 ${batch.length} 条记录`
        );

        // 调用 WPS DBSheet API 创建记录
        const result = await this.wasV7ApiDbsheet.createRecords(
          this.WPS_FILE_ID,
          this.WPS_SHEET_ID,
          {
            records: batch
          }
        );

        this.logger.info(
          `[${batchNumber}/${totalBatches}] 第 ${batchNumber} 批写入成功，返回 ${result.records.length} 条记录`
        );
      }

      this.logger.info(
        `✅ 所有记录写入完成！总计 ${records.length} 条记录，分 ${totalBatches} 批处理`
      );
    } catch (error) {
      this.logger.error('写入 WPS 多维表失败', error);
      throw error;
    }
  }

  /**
   * 将数组分批
   * @param array 要分批的数组
   * @param size 每批的大小
   * @returns 分批后的二维数组
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    // 验证参数
    if (size <= 0) {
      throw new Error(`分批大小必须大于 0，当前值: ${size}`);
    }

    if (array.length === 0) {
      return [];
    }

    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
