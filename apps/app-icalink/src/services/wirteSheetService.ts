import { Logger } from '@stratix/core';
import { sleep } from '@stratix/utils/async';
import { WpsDBSheetAdapter } from '@stratix/was-v7';
import {
  ABSENT_STUDENT_RELATION_FIELDS,
  COURSE_CHECKIN_STATS_FIELDS,
  getAbsenceTypeLabel,
  SHEET_LIST,
  type WpsDbSheetField
} from '../config/wps-dbsheet-fields.js';
import AbsentStudentRelationRepository from '../repositories/AbsentStudentRelationRepository.js';
import CourseCheckinStatsRepository from '../repositories/CourseCheckinStatsRepository.js';
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
 * 格式化日期为 MySQL DATETIME 格式
 * MySQL DATETIME 格式: YYYY-MM-DD HH:MM:SS
 * @param date 日期对象
 * @returns MySQL DATETIME 格式的字符串
 */
function formatDateTimeForMySQL(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * WPS 多维表写入服务
 * 负责将缺勤学生关系数据同步到 WPS 多维表
 */
export default class WriteSheetService {
  // WPS 多维表配置
  // TODO: 这些配置应该从系统配置表中读取
  private readonly WPS_FILE_ID: string;

  /**
   * 批量写入大小（每批写入的记录数）
   * 默认值为 100 条/批
   */
  private readonly batchSize: number;

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
    private readonly wpsFieldMappingRepository: WpsFieldMappingRepository,
    private readonly courseCheckinStatsRepository: CourseCheckinStatsRepository
  ) {
    // 初始化配置，使用传入的选项或默认值
    this.WPS_FILE_ID = '459309344199';
    this.batchSize = 100;

    // 验证批量大小
    this.validateBatchSize(this.batchSize);

    this.logger.info('WriteSheetService 初始化完成', {
      fileId: this.WPS_FILE_ID,
      batchSize: this.batchSize
    });
  }

  /**
   * 服务就绪时执行
   * 从数据库读取缺勤记录并写入 WPS 多维表
   */
  onReady() {
    const process = async () => {
      this.logger.info('WriteSheetService ready, starting incremental sync');
      try {
        const files = await this.wasV7ApiDbsheet.getSchemas(this.WPS_FILE_ID);
        console.log(files);

        for (const sheet of SHEET_LIST) {
          const res = await this.wasV7ApiDbsheet.createSheet(this.WPS_FILE_ID, {
            name: sheet.name,
            fields: sheet.wpsFileds.map((f) => ({
              name: f.name,
              type: f.type,
              data: f.data
            })),
            views: sheet.views.map((v) => ({
              name: v.name,
              type: v.type
            }))
          });
          console.log(res);
        }
        // this.wasV7ApiDbsheet.deleteSheet(this.WPS_FILE_ID, 1);
        // const file = await this.wasV7ApiDbsheet.createSheet(this.WPS_FILE_ID, {
        //   name: '教学班记录表',
        //   fields: COURSE_CHECKIN_STATS_FIELDS.map((f) => ({
        //     name: f.name,
        //     type: f.type,
        //     data: f.data
        //   })),
        //   views: [
        //     {
        //       name: '详细列表',
        //       type: 'grid'
        //     }
        //   ]
        // });

        while (true) {
          const record = await this.wasV7ApiDbsheet.queryRecords(
            this.WPS_FILE_ID,
            1
          );
          console.log(record);
          if (record.records.length === 0) {
            break;
          }
          await this.wasV7ApiDbsheet.deleteRecords(this.WPS_FILE_ID, 1, {
            records: record.records.map((r) => r.id)
          });
          await sleep(20);
        }
        await this.triggerSync();
      } catch (error) {
        this.logger.error(
          'Failed to sync absent student relations to WPS',
          error
        );
      }
    };
    process();
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
   * @param sheetId WPS Sheet ID
   * @param existingFields 已存在的字段列表
   * @param wpsFieldDefs WPS 字段定义列表
   * @returns 创建的字段数量
   */
  private async createMissingWpsFields(
    sheetId: number,
    existingFields: Array<{ id?: string; name: string; type: string }>,
    wpsFieldDefs: WpsDbSheetField[]
  ): Promise<number> {
    try {
      this.logger.info('检查并创建缺失的 WPS 字段', { sheetId });

      // 找出所有缺失的字段
      const missingFields = wpsFieldDefs.filter((fieldDef) => {
        const exists = existingFields.some((f) => f.name === fieldDef.name);
        return !exists;
      });

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

          await this.wasV7ApiDbsheet.createFields(this.WPS_FILE_ID, sheetId, {
            fields: [
              {
                name: fieldDef.name,
                type: fieldDef.type,
                data: fieldDef.data
              }
            ]
          });

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
   * 验证并同步字段映射
   * 在写入数据前调用，确保数据库字段映射与待写入数据一致，并与 WPS 实际字段同步
   * @param sheetId WPS Sheet ID
   * @param wpsFields WPS 字段定义列表
   * @param recordsToWrite 待写入的数据记录
   * @returns 是否验证成功
   */
  private async validateAndSyncFieldMapping(
    sheetId: number,
    wpsFields: WpsDbSheetField[],
    recordsToWrite: any[]
  ): Promise<boolean> {
    try {
      this.logger.info('开始验证并同步字段映射', {
        sheetId,
        fieldsCount: wpsFields.length,
        recordsCount: recordsToWrite.length
      });

      if (recordsToWrite.length === 0) {
        this.logger.warn('没有待写入的数据，跳过字段验证');
        return true;
      }

      // 1. 从数据库读取现有字段映射配置
      const existingMappings =
        await this.wpsFieldMappingRepository.findActiveByFileAndSheet(
          this.WPS_FILE_ID,
          sheetId
        );

      this.logger.info(
        `从数据库读取到 ${existingMappings.length} 个字段映射配置`
      );

      // 2. 构建字段名称映射（dbFieldName -> wpsFieldName）
      const fieldNameMapping: Record<string, string> = {};
      wpsFields.forEach((field) => {
        fieldNameMapping[field.dbFieldName] = field.name;
      });

      // 3. 获取待写入数据的所有字段
      const dataFields = new Set<string>();
      recordsToWrite.forEach((record) => {
        Object.keys(record).forEach((key) => {
          if (fieldNameMapping[key]) {
            dataFields.add(key);
          }
        });
      });

      this.logger.info(`待写入数据包含 ${dataFields.size} 个字段`);

      // 4. 检查字段映射是否需要更新
      const needsUpdate = await this.checkFieldMappingNeedsUpdate(
        existingMappings,
        dataFields
      );

      if (needsUpdate) {
        this.logger.info('检测到字段映射需要更新，开始更新数据库配置...');
        await this.updateDatabaseFieldMapping(
          sheetId,
          dataFields,
          fieldNameMapping
        );
      }

      // 5. 同步 WPS 字段
      const syncSuccess = await this.syncWpsFields(sheetId, wpsFields);

      if (!syncSuccess) {
        this.logger.error('WPS 字段同步失败');
        return false;
      }

      // 6. 重新加载字段映射缓存
      await this.loadFieldMappingCache(sheetId);

      this.logger.info('字段映射验证和同步完成');
      return true;
    } catch (error: any) {
      this.logger.error('验证并同步字段映射失败', error);
      return false;
    }
  }

  /**
   * 检查字段映射是否需要更新
   * @param existingMappings 现有映射配置
   * @param dataFields 待写入数据的字段集合
   * @returns 是否需要更新
   */
  private async checkFieldMappingNeedsUpdate(
    existingMappings: any[],
    dataFields: Set<string>
  ): Promise<boolean> {
    const existingDbFields = new Set(
      existingMappings.map((m) => m.db_field_name)
    );

    // 检查是否有新字段
    for (const field of dataFields) {
      if (!existingDbFields.has(field)) {
        this.logger.info(`发现新字段: ${field}`);
        return true;
      }
    }

    // 检查是否有删除的字段
    for (const existingField of existingDbFields) {
      if (!dataFields.has(existingField)) {
        this.logger.info(`发现删除的字段: ${existingField}`);
        return true;
      }
    }

    return false;
  }

  /**
   * 更新数据库字段映射记录
   * 只更新本地数据库字段信息，不写入 WPS 相关字段
   * @param sheetId WPS Sheet ID
   * @param dataFields 数据字段集合
   * @param fieldNameMapping 字段名称映射（dbFieldName -> wpsFieldName）
   */
  private async updateDatabaseFieldMapping(
    sheetId: number,
    dataFields: Set<string>,
    fieldNameMapping: Record<string, string>
  ): Promise<void> {
    try {
      this.logger.info('开始更新数据库字段映射记录');

      let addCount = 0;
      let deleteCount = 0;

      // 1. 处理新增字段
      for (const dbFieldName of dataFields) {
        const wpsFieldName = fieldNameMapping[dbFieldName];

        if (!wpsFieldName) {
          this.logger.warn(`字段 ${dbFieldName} 没有对应的 WPS 字段名映射`);
          continue;
        }

        // 检查是否已存在
        const existing = await this.wpsFieldMappingRepository.findByDbFieldName(
          this.WPS_FILE_ID,
          sheetId,
          dbFieldName
        );

        if (!existing) {
          // 创建新记录，不填充 WPS 相关字段（这些字段将在同步 WPS 字段时填充）
          await this.wpsFieldMappingRepository.upsertByDbFieldName(
            this.WPS_FILE_ID,
            sheetId,
            dbFieldName,
            {
              wps_field_id: '', // 空字符串，等待从 WPS API 获取
              wps_field_name: wpsFieldName,
              wps_field_type: '', // 空字符串，等待从 WPS API 获取
              is_active: 1,
              sort_order: 0
            }
          );

          addCount++;
          this.logger.info(
            `创建字段映射记录: ${dbFieldName} -> ${wpsFieldName}`
          );
        } else if (existing.is_active === 0) {
          // 如果字段之前被标记为不活跃，重新激活
          await this.wpsFieldMappingRepository.upsertByDbFieldName(
            this.WPS_FILE_ID,
            sheetId,
            dbFieldName,
            {
              wps_field_id: existing.wps_field_id,
              wps_field_name: wpsFieldName,
              wps_field_type: existing.wps_field_type,
              is_active: 1,
              sort_order: existing.sort_order
            }
          );

          this.logger.info(`重新激活字段映射记录: ${dbFieldName}`);
        }
      }

      // 2. 处理删除的字段（标记为不活跃）
      const allExistingMappings =
        await this.wpsFieldMappingRepository.findByFileAndSheet(
          this.WPS_FILE_ID,
          sheetId
        );

      for (const mapping of allExistingMappings) {
        if (!dataFields.has(mapping.db_field_name) && mapping.is_active === 1) {
          // 字段在配置中已删除，标记为不活跃
          await this.wpsFieldMappingRepository.upsertByDbFieldName(
            this.WPS_FILE_ID,
            sheetId,
            mapping.db_field_name,
            {
              wps_field_id: mapping.wps_field_id,
              wps_field_name: mapping.wps_field_name,
              wps_field_type: mapping.wps_field_type,
              is_active: 0,
              sort_order: mapping.sort_order
            }
          );

          deleteCount++;
          this.logger.info(
            `标记字段映射为不活跃: ${mapping.db_field_name} (已从配置中删除)`
          );
        }
      }

      this.logger.info(
        `数据库字段映射更新完成，新增 ${addCount} 条记录，标记删除 ${deleteCount} 条记录`
      );
    } catch (error: any) {
      this.logger.error('更新数据库字段映射失败', error);
      throw error;
    }
  }

  /**
   * 同步 WPS 字段
   * 1. 读取 WPS 实际字段
   * 2. 对比数据库映射配置
   * 3. 创建缺失字段
   * 4. 删除多余字段（可选）
   * 5. 更新数据库映射记录中的 WPS 字段信息
   * @param sheetId WPS Sheet ID
   * @param wpsFieldDefs WPS 字段定义列表
   * @returns 是否同步成功
   */
  private async syncWpsFields(
    sheetId: number,
    wpsFieldDefs: WpsDbSheetField[]
  ): Promise<boolean> {
    try {
      this.logger.info('开始同步 WPS 字段', { sheetId });

      // 1. 从 WPS API 获取实际字段列表
      const schemasResponse = await this.wasV7ApiDbsheet.getSchemas(
        this.WPS_FILE_ID
      );

      if (!schemasResponse || !schemasResponse.sheets) {
        this.logger.error('获取 WPS Schema 信息失败');
        return false;
      }

      const targetSheet = schemasResponse.sheets.find(
        (sheet) => sheet.id === sheetId
      );

      if (!targetSheet || !targetSheet.fields) {
        this.logger.error(`未找到 Sheet ID ${sheetId} 或字段信息`);
        return false;
      }

      const wpsFields = targetSheet.fields;
      this.logger.info(`从 WPS 获取到 ${wpsFields.length} 个实际字段`);

      // 2. 从数据库读取字段映射配置
      const dbMappings =
        await this.wpsFieldMappingRepository.findActiveByFileAndSheet(
          this.WPS_FILE_ID,
          sheetId
        );

      this.logger.info(`从数据库读取到 ${dbMappings.length} 个字段映射配置`);

      // 3. 对比差异并处理
      await this.handleFieldDifferences(
        sheetId,
        wpsFields,
        dbMappings,
        wpsFieldDefs
      );

      this.logger.info('WPS 字段同步完成');
      return true;
    } catch (error: any) {
      this.logger.error('同步 WPS 字段失败', error);
      return false;
    }
  }

  /**
   * 处理 WPS 字段与数据库映射的差异
   * @param sheetId WPS Sheet ID
   * @param wpsFields WPS 实际字段列表
   * @param dbMappings 数据库映射配置
   * @param wpsFieldDefs WPS 字段定义列表
   */
  private async handleFieldDifferences(
    sheetId: number,
    wpsFields: Array<{ id?: string; name: string; type: string }>,
    dbMappings: any[],
    wpsFieldDefs: WpsDbSheetField[]
  ): Promise<void> {
    try {
      // 构建 WPS 字段名称集合
      const wpsFieldNames = new Set(wpsFields.map((f) => f.name));
      const wpsFieldMap = new Map(
        wpsFields.map((f) => [f.name, { id: f.id, type: f.type }])
      );

      // 构建数据库配置的字段名称集合
      const dbFieldNames = new Set(dbMappings.map((m) => m.wps_field_name));

      // 找出需要在 WPS 中创建的字段（数据库有配置但 WPS 中不存在）
      const fieldsToCreate: string[] = [];
      for (const mapping of dbMappings) {
        if (!wpsFieldNames.has(mapping.wps_field_name)) {
          fieldsToCreate.push(mapping.wps_field_name);
        }
      }

      // 找出需要从 WPS 中删除的字段（WPS 中存在但数据库没有配置）
      const fieldsToDelete: Array<{ id?: string; name: string }> = [];
      for (const wpsField of wpsFields) {
        if (!dbFieldNames.has(wpsField.name)) {
          fieldsToDelete.push(wpsField);
        }
      }

      this.logger.info(
        `字段差异分析: 需要创建 ${fieldsToCreate.length} 个，需要删除 ${fieldsToDelete.length} 个`
      );

      // 创建缺失的字段
      if (fieldsToCreate.length > 0) {
        await this.createMissingFieldsInWps(
          sheetId,
          fieldsToCreate,
          wpsFieldDefs
        );
      }

      // 删除多余的字段（可选，根据业务需求决定是否启用）
      if (fieldsToDelete.length > 0) {
        await this.handleExtraFieldsInWps(sheetId, fieldsToDelete);
      }

      // 更新数据库映射记录中的 WPS 字段信息
      await this.updateWpsFieldInfoInDatabase(sheetId, wpsFields, dbMappings);
    } catch (error: any) {
      this.logger.error('处理字段差异失败', error);
      throw error;
    }
  }

  /**
   * 在 WPS 中创建缺失的字段
   * @param sheetId WPS Sheet ID
   * @param fieldNames 需要创建的字段名称列表
   * @param wpsFieldDefs WPS 字段定义列表
   */
  private async createMissingFieldsInWps(
    sheetId: number,
    fieldNames: string[],
    wpsFieldDefs: WpsDbSheetField[]
  ): Promise<void> {
    try {
      this.logger.info(`开始在 WPS 中创建 ${fieldNames.length} 个缺失字段`);

      let createdCount = 0;

      for (const fieldName of fieldNames) {
        // 从配置中查找字段定义
        const fieldDef = wpsFieldDefs.find((f) => f.name === fieldName);

        if (!fieldDef) {
          this.logger.warn(`未找到字段 ${fieldName} 的定义，跳过创建`);
          continue;
        }

        try {
          this.logger.info(`创建字段: ${fieldName} (${fieldDef.type})`);

          await this.wasV7ApiDbsheet.createFields(this.WPS_FILE_ID, sheetId, {
            fields: [
              {
                name: fieldDef.name,
                type: fieldDef.type,
                data: fieldDef.data
              }
            ]
          });

          createdCount++;
          this.logger.info(`✅ 字段 "${fieldName}" 创建成功`);

          // 延迟避免 API 频率限制
          await this.delay(200);
        } catch (error: any) {
          if (error.message?.includes('already exists')) {
            this.logger.warn(`⚠️ 字段 "${fieldName}" 已存在，跳过`);
          } else {
            this.logger.error(`❌ 字段 "${fieldName}" 创建失败`, error);
          }
        }
      }

      this.logger.info(`WPS 字段创建完成，成功创建 ${createdCount} 个字段`);
    } catch (error: any) {
      this.logger.error('在 WPS 中创建缺失字段失败', error);
      throw error;
    }
  }

  /**
   * 处理 WPS 中的多余字段
   * 可以选择删除或添加到数据库配置
   * @param sheetId WPS Sheet ID
   * @param extraFields 多余的字段列表
   */
  private async handleExtraFieldsInWps(
    sheetId: number,
    extraFields: Array<{ id?: string; name: string }>
  ): Promise<void> {
    try {
      this.logger.info(`发现 ${extraFields.length} 个 WPS 中的多余字段`);

      // 策略 1: 删除多余字段（谨慎使用）
      const shouldDelete = true; // 根据业务需求配置，默认不删除

      if (shouldDelete) {
        const fieldIdsToDelete = extraFields
          .filter((f) => f.id)
          .map((f) => f.id!);

        if (fieldIdsToDelete.length > 0) {
          await this.wasV7ApiDbsheet.deleteFields(this.WPS_FILE_ID, sheetId, {
            fields: fieldIdsToDelete
          });
          this.logger.info(`已删除 ${fieldIdsToDelete.length} 个多余字段`);
        }
      }

      // 策略 2: 将多余字段添加到数据库配置（推荐）
      for (const field of extraFields) {
        this.logger.info(
          `多余字段: ${field.name} (ID: ${field.id})，建议手动处理`
        );
        // 可以选择自动添加到数据库配置
        // 但需要确定对应的数据库字段名
      }
    } catch (error: any) {
      this.logger.error('处理 WPS 多余字段失败', error);
      throw error;
    }
  }

  /**
   * 更新数据库映射记录中的 WPS 字段信息
   * 将从 WPS API 获取的字段 ID、类型等信息更新到数据库
   * @param sheetId WPS Sheet ID
   * @param wpsFields WPS 实际字段列表
   * @param dbMappings 数据库映射配置
   */
  private async updateWpsFieldInfoInDatabase(
    sheetId: number,
    wpsFields: Array<{ id?: string; name: string; type: string }>,
    dbMappings: any[]
  ): Promise<void> {
    try {
      this.logger.info('开始更新数据库映射记录中的 WPS 字段信息');

      // 重新获取最新的 WPS Schema（因为可能创建了新字段）
      const schemasResponse = await this.wasV7ApiDbsheet.getSchemas(
        this.WPS_FILE_ID
      );

      const targetSheet = schemasResponse.sheets.find(
        (sheet) => sheet.id === sheetId
      );

      if (!targetSheet || !targetSheet.fields) {
        this.logger.error('重新获取 WPS Schema 失败');
        return;
      }

      const latestWpsFields = targetSheet.fields;
      const wpsFieldMap = new Map(
        latestWpsFields.map((f) => [f.name, { id: f.id, type: f.type }])
      );

      let updateCount = 0;

      for (const mapping of dbMappings) {
        const wpsFieldInfo = wpsFieldMap.get(mapping.wps_field_name);

        if (wpsFieldInfo && wpsFieldInfo.id) {
          // 更新 WPS 字段信息
          await this.wpsFieldMappingRepository.upsertByDbFieldName(
            this.WPS_FILE_ID,
            sheetId,
            mapping.db_field_name,
            {
              wps_field_id: wpsFieldInfo.id,
              wps_field_name: mapping.wps_field_name,
              wps_field_type: wpsFieldInfo.type as string,
              is_active: 1,
              sort_order: mapping.sort_order || 0
            }
          );

          updateCount++;
          this.logger.debug(
            `更新字段映射: ${mapping.db_field_name} -> ${wpsFieldInfo.id}`
          );
        } else {
          this.logger.warn(`未找到字段 ${mapping.wps_field_name} 的 WPS 信息`);
        }
      }

      this.logger.info(`成功更新 ${updateCount} 条字段映射的 WPS 信息`);
    } catch (error: any) {
      this.logger.error('更新数据库映射记录中的 WPS 字段信息失败', error);
      throw error;
    }
  }

  /**
   * 初始化字段映射（保留原有方法，用于首次初始化）
   * 从 WPS API 获取字段信息，并与数据库字段建立映射关系
   * 如果字段不存在，会自动创建
   * @param sheetId WPS Sheet ID
   * @param wpsFieldDefs WPS 字段定义列表
   * @returns 是否初始化成功
   */
  async initializeFieldMapping(
    sheetId: number,
    wpsFieldDefs: WpsDbSheetField[]
  ): Promise<boolean> {
    try {
      this.logger.info('开始初始化字段映射', { sheetId });

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
        (sheet) => sheet.id === sheetId
      );

      if (!targetSheet || !targetSheet.fields) {
        this.logger.error(`未找到 Sheet ID ${sheetId} 或字段信息`);
        return false;
      }

      this.logger.info(`从 WPS API 获取到 ${targetSheet.fields.length} 个字段`);

      // 2. 检查并创建缺失的字段
      const createdCount = await this.createMissingWpsFields(
        sheetId,
        targetSheet.fields,
        wpsFieldDefs
      );

      // 如果创建了新字段，重新获取 Schema
      if (createdCount > 0) {
        this.logger.info('重新获取 WPS Schema 信息...');
        schemasResponse = await this.wasV7ApiDbsheet.getSchemas(
          this.WPS_FILE_ID
        );

        targetSheet = schemasResponse.sheets.find(
          (sheet) => sheet.id === sheetId
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

      // 构建字段名称映射（dbFieldName -> wpsFieldName）
      const fieldNameMapping: Record<string, string> = {};
      wpsFieldDefs.forEach((field) => {
        fieldNameMapping[field.dbFieldName] = field.name;
      });

      // 遍历配置的字段定义，查找对应的 WPS 字段 ID
      wpsFieldDefs.forEach((fieldDef, index) => {
        const wpsFieldName = fieldDef.name;

        // 在 WPS API 返回的字段中查找匹配的字段
        const wpsField = targetSheet!.fields.find(
          (f) => f.name === wpsFieldName
        );

        if (wpsField && wpsField.id) {
          // 从 fieldNameMapping 中查找对应的数据库字段名
          const dbFieldName = Object.keys(fieldNameMapping).find(
            (key) => fieldNameMapping[key] === wpsFieldName
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
        sheetId,
        mappings
      );

      this.logger.info(`成功保存 ${savedCount} 个字段映射到数据库`);

      // 5. 加载字段映射到缓存
      await this.loadFieldMappingCache(sheetId);

      return savedCount > 0;
    } catch (error: any) {
      this.logger.error('初始化字段映射失败', error);
      return false;
    }
  }

  /**
   * 加载字段映射到缓存
   * 从数据库加载字段映射，构建 WPS 字段 ID -> 数据库字段名的映射
   * @param sheetId WPS Sheet ID
   */
  private async loadFieldMappingCache(sheetId: number): Promise<void> {
    try {
      this.logger.debug('加载字段映射到缓存', { sheetId });

      const mappings =
        await this.wpsFieldMappingRepository.findActiveByFileAndSheet(
          this.WPS_FILE_ID,
          sheetId
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
   * 手动触发同步（增量同步）
   * @returns 同步摘要
   */
  async triggerSync(): Promise<void> {
    this.logger.info('手动触发增量同步');
    for (const sheet of SHEET_LIST) {
      await this.syncAbsentStudentRelationsToWps(sheet);
    }
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
   * 创建课程签到统计 WPS 多维表
   * 使用 COURSE_CHECKIN_STATS_FIELDS 配置创建字段
   *
   * @param fileId WPS 文件 ID
   * @param sheetId WPS Sheet ID（多维表 ID）
   * @returns Promise<void>
   * @throws {Error} 如果字段创建失败
   */
  async createCourseCheckinStatsSheet(
    fileId: string,
    sheetId: number
  ): Promise<void> {
    this.logger.info('开始创建课程签到统计 WPS 多维表字段', {
      fileId,
      sheetId
    });

    // 跳过索引 0（ID），从索引 1 开始创建
    const fieldsToCreate = COURSE_CHECKIN_STATS_FIELDS.slice(1);
    const totalFields = fieldsToCreate.length;

    this.logger.info(`需要创建 ${totalFields} 个字段（跳过 ID 字段）`);

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
        await this.wasV7ApiDbsheet.createFields(fileId, sheetId, {
          fields: [field]
        });

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
    this.logger.info('课程签到统计 WPS 多维表字段创建完成', {
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

    this.logger.info('✅ 课程签到统计 WPS 多维表创建完成！');
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
              last_updated_at: formatDateTimeForMySQL(new Date())
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
        started_at: formatDateTimeForMySQL(new Date()),
        last_updated_at: formatDateTimeForMySQL(new Date()),
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
   * 更新同步进度（已废弃，保留用于兼容）
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
        last_updated_at: formatDateTimeForMySQL(new Date())
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
   * 获取上次同步的最大 ID
   * @returns 上次同步的最大 ID，如果没有记录则返回 0
   */
  private async getLastSyncedId(syncTaskName: string): Promise<number> {
    try {
      const progress =
        await this.syncProgressRepository.findByTaskName(syncTaskName);

      if (progress && progress.last_synced_id !== undefined) {
        this.logger.debug('从数据库读取上次同步的最大 ID', {
          lastSyncedId: progress.last_synced_id
        });
        return progress.last_synced_id;
      }

      this.logger.info('未找到同步进度记录，从 ID 0 开始');
      return 0;
    } catch (error: any) {
      this.logger.error('获取上次同步 ID 失败', error);
      return 0;
    }
  }

  /**
   * 初始化增量同步进度
   * @param sheetId WPS Sheet ID
   * @param syncTaskName 同步任务名称
   * @param lastSyncedId 上次同步的最大 ID
   * @param dbMaxId 数据库当前最大 ID
   */
  private async initializeSyncProgressForIncremental(
    sheetId: number,
    syncTaskName: string,
    lastSyncedId: number,
    dbMaxId: number
  ): Promise<void> {
    try {
      const newRecordsCount = dbMaxId - lastSyncedId;

      await this.syncProgressRepository.upsertByTaskName(syncTaskName, {
        file_id: this.WPS_FILE_ID,
        sheet_id: sheetId,
        status: 'in_progress',
        total_count: newRecordsCount,
        synced_count: 0,
        last_synced_id: lastSyncedId,
        current_offset: 0,
        batch_size: this.batchSize,
        started_at: formatDateTimeForMySQL(new Date()),
        last_updated_at: formatDateTimeForMySQL(new Date()),
        failure_count: 0
      });

      this.logger.info('初始化增量同步任务', {
        sheetId,
        syncTaskName,
        lastSyncedId,
        dbMaxId,
        newRecordsCount,
        batchSize: this.batchSize
      });
    } catch (error: any) {
      this.logger.error('初始化增量同步进度失败', error);
      throw error;
    }
  }

  /**
   * 更新同步进度（基于 ID）
   * @param syncTaskName 同步任务名称
   * @param lastSyncedId 当前同步的最大 ID
   * @param syncedCount 已同步数量
   */
  private async updateSyncProgressWithId(
    syncTaskName: string,
    lastSyncedId: number,
    syncedCount: number
  ): Promise<void> {
    try {
      await this.syncProgressRepository.upsertByTaskName(syncTaskName, {
        last_synced_id: lastSyncedId,
        synced_count: syncedCount,
        last_updated_at: formatDateTimeForMySQL(new Date())
      });

      this.logger.debug('同步进度已更新', {
        syncTaskName,
        lastSyncedId,
        syncedCount
      });
    } catch (error: any) {
      this.logger.error('更新同步进度失败', error);
    }
  }

  /**
   * 完成同步进度
   * @param syncTaskName 同步任务名称
   * @param success 是否成功
   */
  private async completeSyncProgress(
    syncTaskName: string,
    success: boolean
  ): Promise<void> {
    try {
      const status = success ? 'completed' : 'failed';
      const now = formatDateTimeForMySQL(new Date());

      await this.syncProgressRepository.upsertByTaskName(syncTaskName, {
        status,
        completed_at: now,
        last_updated_at: now
      });

      const progress =
        await this.syncProgressRepository.findByTaskName(syncTaskName);

      if (progress) {
        this.logger.info('同步任务完成', {
          syncTaskName,
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
   * @param syncTaskName 同步任务名称
   * @param errorMessage 错误信息
   */
  private async failSyncProgress(
    syncTaskName: string,
    errorMessage: string
  ): Promise<void> {
    try {
      const progress =
        await this.syncProgressRepository.findByTaskName(syncTaskName);

      const failureCount = progress ? progress.failure_count + 1 : 1;

      await this.syncProgressRepository.upsertByTaskName(syncTaskName, {
        status: 'failed',
        error_message: errorMessage,
        failure_count: failureCount,
        last_updated_at: formatDateTimeForMySQL(new Date())
      });

      this.logger.error('同步任务失败', {
        syncTaskName,
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
   * @param sheetId WPS Sheet ID
   * @param wpsRecords WPS 格式的记录
   * @param batchNumber 批次号
   */
  private async writeRecordsBatchToWps(
    sheetId: number,
    wpsRecords: Array<{ fields_value: string }>,
    batchNumber: number
  ): Promise<void> {
    try {
      this.logger.debug(
        `批次 ${batchNumber}: 准备写入 ${wpsRecords.length} 条记录`
      );

      const result = await this.wasV7ApiDbsheet.createRecords(
        this.WPS_FILE_ID,
        sheetId,
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
   * 同步缺勤学生关系数据到 WPS 多维表（增量同步）
   * 每次从上次同步的最大 ID 继续同步新增数据
   * @returns 同步摘要
   */
  private async syncAbsentStudentRelationsToWps({
    name,
    sheetId,
    wpsFileds,
    views,
    syncTaskName,
    dbTableName
  }: {
    name: string;
    sheetId: number;
    wpsFileds: WpsDbSheetField[];
    views: Array<{
      name: string;
      type: string;
    }>;
    syncTaskName: string;
    dbTableName: string;
  }): Promise<SyncSummary> {
    this.logger.info('开始增量同步缺勤学生关系数据到 WPS 多维表');

    const startTime = new Date();
    const errors: string[] = [];

    try {
      // 1. 获取上次同步的最大 ID
      let lastSyncedId = await this.getLastSyncedId(syncTaskName);
      this.logger.info(`上次同步的最大 ID: ${lastSyncedId}`);

      // 2. 获取数据库中的最大 ID
      // const dbMaxId = await this.absentStudentRelationRepository.getMaxId();
      const dbMaxId = await (
        this[dbTableName as keyof WriteSheetService] as any
      ).getMaxId();

      this.logger.info(`数据库当前最大 ID: ${dbMaxId}`);

      // 3. 检查是否有新数据
      if (dbMaxId <= lastSyncedId) {
        this.logger.info('没有新数据需要同步');
        return this.createSyncSummary(
          true,
          0,
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

      // 4. 获取第一批数据用于字段验证
      const sampleRecords = await (
        this[dbTableName as keyof WriteSheetService] as any
      ).findByIdGreaterThan(lastSyncedId, 1);

      if (sampleRecords.length > 0) {
        // 5. 验证并同步字段映射
        this.logger.info('开始验证并同步字段映射...');
        const validationSuccess = await this.validateAndSyncFieldMapping(
          sheetId,
          wpsFileds,
          sampleRecords
        );

        if (!validationSuccess) {
          throw new Error('字段映射验证失败，无法继续同步');
        }
      } else {
        // 如果没有样本数据，尝试加载现有字段映射
        if (!this.fieldMappingCache) {
          this.logger.info('字段映射缓存未加载，开始加载...');
          await this.loadFieldMappingCache(sheetId);
        }

        // 检查缓存是否加载成功
        if (!this.fieldMappingCache || this.fieldMappingCache.size === 0) {
          this.logger.warn('字段映射缓存为空，尝试初始化字段映射...');
          const initialized = await this.initializeFieldMapping(
            sheetId,
            wpsFileds
          );
          if (!initialized) {
            throw new Error('字段映射初始化失败，无法继续同步');
          }
        }
      }

      // 6. 计算新记录数量
      const newRecordsCount = dbMaxId - lastSyncedId;

      // 7. 初始化同步进度
      await this.initializeSyncProgressForIncremental(
        sheetId,
        syncTaskName,
        lastSyncedId,
        dbMaxId
      );

      this.logger.info(`从 ID ${lastSyncedId} 开始增量同步`, {
        lastSyncedId,
        dbMaxId,
        newRecordsCount,
        batchSize: this.batchSize,
        estimatedBatches: Math.ceil(newRecordsCount / this.batchSize)
      });

      // 7. 分批同步数据（基于 ID 的增量同步）
      let currentLastId = lastSyncedId;
      let syncedCount = 0; // 本次同步的数量
      let totalBatches = 0;
      let successBatches = 0;
      let failedBatches = 0;

      while (true) {
        totalBatches++;
        const batchNumber = totalBatches;
        const estimatedBatches = Math.ceil(newRecordsCount / this.batchSize);

        this.logger.info(
          `[${batchNumber}/${estimatedBatches}] 开始同步第 ${batchNumber} 批，从 ID ${currentLastId} 开始`
        );

        try {
          // 7.1 查询 ID > currentLastId 的记录
          const records = await (
            this[dbTableName as keyof WriteSheetService] as any
          ).findByIdGreaterThan(currentLastId, this.batchSize);

          if (records.length === 0) {
            this.logger.info(`没有更多新数据，同步完成`);
            break;
          }

          this.logger.info(
            `[${batchNumber}/${estimatedBatches}] 读取到 ${records.length} 条记录 (ID: ${records[0].id} - ${records[records.length - 1].id})`
          );

          // 7.2 转换为 WPS 格式
          const wpsRecords = this.convertToWpsRecords(records, wpsFileds);

          // 7.3 写入 WPS 多维表
          await this.writeRecordsBatchToWps(sheetId, wpsRecords, batchNumber);

          // 7.4 获取本批次的最大 ID
          const batchMaxId = Math.max(...records.map((r: any) => r.id));

          // 7.5 更新进度
          currentLastId = batchMaxId;
          syncedCount += records.length;
          successBatches++;

          await this.updateSyncProgressWithId(
            syncTaskName,
            currentLastId,
            syncedCount
          );

          this.logger.info(
            `[${batchNumber}/${estimatedBatches}] ✅ 第 ${batchNumber} 批同步成功，已同步 ${syncedCount} 条新记录，当前最大 ID: ${currentLastId}`
          );

          // 7.6 批次间延迟，避免 API 频率限制
          await this.delay(100);
        } catch (error: any) {
          failedBatches++;
          const errorMsg = `第 ${batchNumber} 批同步失败: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(
            `[${batchNumber}/${estimatedBatches}] ❌ ${errorMsg}`,
            error
          );

          // 记录失败但继续下一批（可选：根据需求决定是否中断）
          // throw error; // 如果需要失败即停止，取消注释这行
        }
      }

      // 8. 完成同步
      await this.completeSyncProgress(syncTaskName, failedBatches === 0);

      const endTime = new Date();
      const summary = this.createSyncSummary(
        failedBatches === 0,
        newRecordsCount,
        syncedCount, // 本次同步的数量
        newRecordsCount - syncedCount, // 失败数量
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
      await this.failSyncProgress(syncTaskName, error.message);
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
   * 获取 WPS 字段名称
   * 从 wpsFields 配置中查找数据库字段名对应的 WPS 字段名称
   * @param dbFieldName 数据库字段名
   * @param wpsFields WPS 字段定义列表
   * @returns WPS 字段名称（中文），如果未找到则返回数据库字段名
   */
  private getWpsFieldName(
    dbFieldName: string,
    wpsFields: WpsDbSheetField[]
  ): string {
    // 从 wpsFields 中查找匹配的字段
    const field = wpsFields.find((f) => f.dbFieldName === dbFieldName);
    return field ? field.name : dbFieldName;
  }

  /**
   * 将数据库记录转换为 WPS 多维表记录格式
   * 根据 wps_field_mapping 表中配置的字段进行过滤，只写入已配置的字段
   * 使用字段名称（中文）作为 key，符合 WPS API 的 createRecords 要求
   * 格式：{ fields_value: "{\"字段名\":\"值\"}" }
   * @param records 数据库记录数组
   * @param wpsFields WPS 字段定义列表
   */
  private convertToWpsRecords(
    records: any[],
    wpsFields: WpsDbSheetField[]
  ): Array<{ fields_value: string }> {
    return records.map((record) => {
      const fieldsObject: Record<string, any> = {};

      // 如果字段映射缓存未加载，记录警告
      if (!this.fieldMappingCache || this.fieldMappingCache.size === 0) {
        this.logger.warn('字段映射缓存未加载，无法过滤字段');
        return { fields_value: JSON.stringify({}) };
      }

      // 遍历字段映射缓存，只包含已配置的字段
      for (const [, dbFieldName] of this.fieldMappingCache.entries()) {
        // 获取 WPS 字段名称（中文）
        const wpsFieldName = this.getWpsFieldName(dbFieldName, wpsFields);

        // 根据数据库字段名获取对应的值
        const value = this.getRecordFieldValue(record, dbFieldName, wpsFields);

        // 只有当值不为 undefined 时才添加到字段对象中
        if (value !== undefined) {
          fieldsObject[wpsFieldName] = value;
        }
      }

      return {
        fields_value: JSON.stringify(fieldsObject)
      };
    });
  }

  /**
   * 获取记录中指定字段的值
   * 处理特殊字段的转换（如日期格式化、枚举值转换等）
   * @param record 数据库记录
   * @param dbFieldName 数据库字段名
   * @param wpsFields WPS 字段定义列表
   * @returns 字段值
   */
  private getRecordFieldValue(
    record: any,
    dbFieldName: string,
    wpsFields: WpsDbSheetField[]
  ): any {
    // 从 record 中获取原始值
    const rawValue = record[dbFieldName];

    // 如果值不存在，返回空字符串
    if (rawValue === undefined || rawValue === null) {
      return '';
    }

    // 查找字段定义以确定字段类型
    const fieldDef = wpsFields.find((f) => f.dbFieldName === dbFieldName);

    if (!fieldDef) {
      this.logger.warn(`未找到字段 ${dbFieldName} 的定义`);
      return rawValue;
    }

    // 根据字段名称进行特殊处理
    // 日期字段（stat_date）- 格式化为 YYYY-MM-DD
    if (dbFieldName === 'stat_date' || dbFieldName.endsWith('_date')) {
      return this.formatDateToText(rawValue);
    }

    // 时间字段（created_at, updated_at, start_time, end_time）- 格式化为 YYYY-MM-DD HH:mm:ss
    if (
      dbFieldName === 'created_at' ||
      dbFieldName === 'updated_at' ||
      dbFieldName === 'start_time' ||
      dbFieldName === 'end_time' ||
      dbFieldName.endsWith('_time')
    ) {
      return this.formatDateTimeToText(rawValue);
    }

    // 缺勤类型字段（特殊枚举）
    if (dbFieldName === 'absence_type') {
      return getAbsenceTypeLabel(rawValue);
    }

    // 其他类型直接返回原始值
    return rawValue;
  }

  /**
   * 格式化日期为文本格式 (YYYY-MM-DD)
   * @param date 日期对象或字符串
   * @returns 格式化后的日期文本
   */
  private formatDateToText(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 格式化日期时间为文本格式 (YYYY-MM-DD HH:mm:ss)
   * @param datetime 日期时间对象或字符串
   * @returns 格式化后的日期时间文本
   */
  private formatDateTimeToText(datetime: Date | string): string {
    if (!datetime) return '';
    const d = new Date(datetime);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * 批量写入记录到 WPS 多维表
   * @param sheetId WPS Sheet ID
   * @param records 要写入的记录数组（fields_value 为 JSON 字符串）
   */
  private async writeRecordsToWps(
    sheetId: number,
    records: Array<{ fields_value: string }>
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
          sheetId,
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
