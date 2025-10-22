import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import { isSome, type Maybe } from '@stratix/utils/functional';
import type {
  WpsFieldMapping,
  CreateWpsFieldMappingInput,
  UpdateWpsFieldMappingInput
} from '../types/wps-field-mapping.js';

/**
 * WPS 字段映射表 Schema 定义
 */
const schema = new SchemaBuilder('wps_field_mapping')
  .addColumn('id', DataColumnType.BIGINT, {
    primaryKey: true,
    autoIncrement: true
  })
  .addColumn('file_id', DataColumnType.STRING, { length: 50, nullable: false })
  .addColumn('sheet_id', DataColumnType.INTEGER, { nullable: false })
  .addColumn('wps_field_id', DataColumnType.STRING, {
    length: 50,
    nullable: false
  })
  .addColumn('wps_field_name', DataColumnType.STRING, {
    length: 100,
    nullable: false
  })
  .addColumn('wps_field_type', DataColumnType.STRING, {
    length: 50,
    nullable: false
  })
  .addColumn('db_field_name', DataColumnType.STRING, {
    length: 100,
    nullable: false
  })
  .addColumn('is_active', DataColumnType.BOOLEAN, { nullable: false })
  .addColumn('sort_order', DataColumnType.INTEGER, { nullable: false })
  .addUniqueIndex('idx_file_sheet_wps_field', [
    'file_id',
    'sheet_id',
    'wps_field_id'
  ])
  .addUniqueIndex('idx_file_sheet_db_field', [
    'file_id',
    'sheet_id',
    'db_field_name'
  ])
  .addIndex('idx_file_sheet', ['file_id', 'sheet_id'])
  .addIndex('idx_is_active', ['is_active'])
  .setComment('WPS多维表字段映射表-存储WPS字段与数据库字段的映射关系')
  .build();

/**
 * WPS 字段映射仓储实现
 * 负责管理 WPS 字段与数据库字段的映射关系
 */
export default class WpsFieldMappingRepository extends BaseRepository<
  any,
  'wps_field_mapping',
  WpsFieldMapping
> {
  protected readonly tableName = 'wps_field_mapping';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ WpsFieldMappingRepository initialized');
  }

  /**
   * 根据文件ID和Sheet ID查找所有字段映射
   * @param fileId WPS 文件 ID
   * @param sheetId WPS Sheet ID
   * @returns 字段映射列表
   */
  public async findByFileAndSheet(
    fileId: string,
    sheetId: number
  ): Promise<WpsFieldMapping[]> {
    if (!fileId || !sheetId) {
      this.logger.warn('findByFileAndSheet called with invalid parameters');
      return [];
    }

    this.logger.debug({ fileId, sheetId }, 'Finding field mappings');

    const result = (await this.findMany(
      (qb) => qb.where('file_id', '=', fileId).where('sheet_id', '=', sheetId),
      {
        orderBy: { field: 'sort_order', direction: 'asc' }
      }
    )) as unknown as WpsFieldMapping[];

    return result;
  }

  /**
   * 根据文件ID、Sheet ID和数据库字段名查找映射
   * @param fileId WPS 文件 ID
   * @param sheetId WPS Sheet ID
   * @param dbFieldName 数据库字段名
   * @returns 字段映射（可能不存在）
   */
  public async findByDbFieldName(
    fileId: string,
    sheetId: number,
    dbFieldName: string
  ): Promise<WpsFieldMapping | undefined> {
    if (!fileId || !sheetId || !dbFieldName) {
      this.logger.warn('findByDbFieldName called with invalid parameters');
      return undefined;
    }

    this.logger.debug(
      { fileId, sheetId, dbFieldName },
      'Finding field mapping by db field name'
    );

    const result = (await this.findOne((qb) =>
      qb
        .where('file_id', '=', fileId)
        .where('sheet_id', '=', sheetId)
        .where('db_field_name', '=', dbFieldName)
    )) as unknown as Maybe<WpsFieldMapping>;

    return isSome(result) ? result.value : undefined;
  }

  /**
   * 根据文件ID、Sheet ID和WPS字段ID查找映射
   * @param fileId WPS 文件 ID
   * @param sheetId WPS Sheet ID
   * @param wpsFieldId WPS 字段 ID
   * @returns 字段映射（可能不存在）
   */
  public async findByWpsFieldId(
    fileId: string,
    sheetId: number,
    wpsFieldId: string
  ): Promise<WpsFieldMapping | undefined> {
    if (!fileId || !sheetId || !wpsFieldId) {
      this.logger.warn('findByWpsFieldId called with invalid parameters');
      return undefined;
    }

    this.logger.debug(
      { fileId, sheetId, wpsFieldId },
      'Finding field mapping by wps field id'
    );

    const result = (await this.findOne((qb) =>
      qb
        .where('file_id', '=', fileId)
        .where('sheet_id', '=', sheetId)
        .where('wps_field_id', '=', wpsFieldId)
    )) as unknown as Maybe<WpsFieldMapping>;

    return isSome(result) ? result.value : undefined;
  }

  /**
   * 查找所有启用的字段映射
   * @param fileId WPS 文件 ID
   * @param sheetId WPS Sheet ID
   * @returns 启用的字段映射列表
   */
  public async findActiveByFileAndSheet(
    fileId: string,
    sheetId: number
  ): Promise<WpsFieldMapping[]> {
    if (!fileId || !sheetId) {
      this.logger.warn(
        'findActiveByFileAndSheet called with invalid parameters'
      );
      return [];
    }

    this.logger.debug(
      { fileId, sheetId },
      'Finding active field mappings'
    );

    const result = (await this.findMany(
      (qb) =>
        qb
          .where('file_id', '=', fileId)
          .where('sheet_id', '=', sheetId)
          .where('is_active', '=', 1),
      {
        orderBy: { field: 'sort_order', direction: 'asc' }
      }
    )) as unknown as WpsFieldMapping[];

    return result;
  }

  /**
   * 创建或更新字段映射
   * 如果映射已存在（根据 file_id, sheet_id, db_field_name）则更新，否则创建
   * @param fileId WPS 文件 ID
   * @param sheetId WPS Sheet ID
   * @param dbFieldName 数据库字段名
   * @param data 字段映射数据
   * @returns 字段映射记录
   */
  public async upsertByDbFieldName(
    fileId: string,
    sheetId: number,
    dbFieldName: string,
    data: Partial<CreateWpsFieldMappingInput>
  ): Promise<WpsFieldMapping | undefined> {
    this.logger.debug(
      { fileId, sheetId, dbFieldName, data },
      'Upserting field mapping'
    );

    // 查找现有记录
    const existing = await this.findByDbFieldName(fileId, sheetId, dbFieldName);

    if (existing) {
      // 更新现有记录
      this.logger.debug(
        { fileId, sheetId, dbFieldName },
        'Updating existing field mapping'
      );

      const updateData: UpdateWpsFieldMappingInput = {
        wps_field_id: data.wps_field_id,
        wps_field_name: data.wps_field_name,
        wps_field_type: data.wps_field_type,
        is_active: data.is_active,
        sort_order: data.sort_order
      };

      const result = await this.update(existing.id, updateData as any);

      if (result && 'right' in result && result.right) {
        return result.right as unknown as WpsFieldMapping;
      }

      this.logger.error('Failed to update field mapping');
      return undefined;
    } else {
      // 创建新记录
      this.logger.debug(
        { fileId, sheetId, dbFieldName },
        'Creating new field mapping'
      );

      const createData: CreateWpsFieldMappingInput = {
        file_id: fileId,
        sheet_id: sheetId,
        wps_field_id: data.wps_field_id || '',
        wps_field_name: data.wps_field_name || '',
        wps_field_type: data.wps_field_type || '',
        db_field_name: dbFieldName,
        is_active: data.is_active ?? 1,
        sort_order: data.sort_order ?? 0
      };

      const result = await this.create(createData as any);

      if (result && 'right' in result && result.right) {
        return result.right as unknown as WpsFieldMapping;
      }

      this.logger.error('Failed to create field mapping');
      return undefined;
    }
  }

  /**
   * 批量创建或更新字段映射
   * @param fileId WPS 文件 ID
   * @param sheetId WPS Sheet ID
   * @param mappings 字段映射列表
   * @returns 成功创建/更新的数量
   */
  public async batchUpsert(
    fileId: string,
    sheetId: number,
    mappings: Array<{
      dbFieldName: string;
      wpsFieldId: string;
      wpsFieldName: string;
      wpsFieldType: string;
      sortOrder: number;
    }>
  ): Promise<number> {
    this.logger.info(
      { fileId, sheetId, count: mappings.length },
      'Batch upserting field mappings'
    );

    let successCount = 0;

    for (const mapping of mappings) {
      const result = await this.upsertByDbFieldName(
        fileId,
        sheetId,
        mapping.dbFieldName,
        {
          wps_field_id: mapping.wpsFieldId,
          wps_field_name: mapping.wpsFieldName,
          wps_field_type: mapping.wpsFieldType,
          sort_order: mapping.sortOrder,
          is_active: 1
        }
      );

      if (result) {
        successCount++;
      }
    }

    this.logger.info(
      { successCount, total: mappings.length },
      'Batch upsert completed'
    );

    return successCount;
  }

  /**
   * 删除指定文件和Sheet的所有字段映射
   * @param fileId WPS 文件 ID
   * @param sheetId WPS Sheet ID
   * @returns 删除的记录数
   */
  public async deleteByFileAndSheet(
    fileId: string,
    sheetId: number
  ): Promise<number> {
    this.logger.info(
      { fileId, sheetId },
      'Deleting field mappings by file and sheet'
    );

    const result = (await this.deleteMany((qb) =>
      qb.where('file_id', '=', fileId).where('sheet_id', '=', sheetId)
    )) as any;

    const deletedCount =
      result && 'right' in result ? (result.right as number) : 0;

    this.logger.info({ deletedCount }, 'Field mappings deleted');

    return deletedCount;
  }
}

