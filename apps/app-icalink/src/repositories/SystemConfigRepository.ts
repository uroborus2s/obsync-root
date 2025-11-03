import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import { fromNullable, isSome, type Maybe } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  IcalinkSystemConfig
} from '../types/database.js';
import type { ISystemConfigRepository } from './interfaces/ISystemConfigRepository.js';

const schema = SchemaBuilder.create('icalink_system_configs')
  .addPrimaryKey('id')
  .addColumn('config_key', DataColumnType.STRING, { nullable: false })
  .addColumn('config_value', DataColumnType.TEXT, { nullable: true })
  .addColumn('config_type', DataColumnType.STRING, { nullable: false })
  .addColumn('config_group', DataColumnType.STRING, { nullable: false })
  .addColumn('description', DataColumnType.STRING, { nullable: true })
  .addColumn('is_system', DataColumnType.BOOLEAN, { defaultValue: false })
  .addColumn('is_encrypted', DataColumnType.BOOLEAN, { defaultValue: false })
  .addColumn('created_by', DataColumnType.STRING, { nullable: true })
  .addColumn('updated_by', DataColumnType.STRING, { nullable: true })
  .addIndex('uk_config_key', ['config_key'], { unique: true })
  .addIndex('idx_config_group', ['config_group'])
  .addIndex('idx_is_system', ['is_system'])
  .setComment('系统配置表-存储系统级配置参数')
  .build();

/**
 * 系统配置仓储实现
 * 负责系统配置数据的持久化和查询
 */
export default class SystemConfigRepository
  extends BaseRepository<
    IcalinkDatabase,
    'icalink_system_configs',
    IcalinkSystemConfig
  >
  implements ISystemConfigRepository
{
  protected readonly tableName = 'icalink_system_configs';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ SystemConfigRepository initialized');
  }

  public async findByKey(
    configKey: string
  ): Promise<Maybe<IcalinkSystemConfig>> {
    if (!configKey || configKey.trim() === '') {
      this.logger.warn('findByKey called with empty configKey');
      return fromNullable<IcalinkSystemConfig>(undefined);
    }

    this.logger.debug({ configKey }, 'Finding system config by key');

    const result = (await this.findOne((qb) =>
      qb.where('config_key', '=', configKey)
    )) as unknown as Maybe<IcalinkSystemConfig>;

    this.logger.debug(
      { configKey, found: isSome(result) },
      'Config lookup completed'
    );

    return result;
  }

  public async findByGroup(
    configGroup: string
  ): Promise<IcalinkSystemConfig[]> {
    if (!configGroup || configGroup.trim() === '') {
      this.logger.warn('findByGroup called with empty configGroup');
      return [];
    }

    this.logger.debug({ configGroup }, 'Finding system configs by group');

    const result = (await this.findMany((qb) =>
      qb.where('config_group', '=', configGroup)
    )) as unknown as IcalinkSystemConfig[];

    this.logger.debug(
      { configGroup, count: result.length },
      'Configs lookup completed'
    );

    return result;
  }

  public async findAll(): Promise<IcalinkSystemConfig[]> {
    this.logger.debug('Finding all system configs');

    const result = (await this.findMany((qb) => qb, {
      orderBy: { field: 'config_group', direction: 'asc' }
    })) as unknown as IcalinkSystemConfig[];

    this.logger.debug({ count: result.length }, 'All configs lookup completed');

    return result;
  }

  public async upsert(
    configKey: string,
    configValue: string,
    configType: string,
    configGroup: string = 'default',
    description?: string,
    updatedBy?: string
  ): Promise<number> {
    if (!configKey || configKey.trim() === '') {
      this.logger.warn('upsert called with empty configKey');
      return 0;
    }

    this.logger.debug(
      { configKey, configType, configGroup },
      'Upserting system config'
    );

    const db = await this.getQueryConnection();
    const existing = await this.findByKey(configKey);

    if (isSome(existing)) {
      const result = await db
        .updateTable(this.tableName)
        .set({
          config_value: configValue,
          config_type: configType as any,
          config_group: configGroup,
          description: description || undefined,
          updated_by: updatedBy || undefined,
          updated_at: new Date()
        })
        .where('config_key', '=', configKey)
        .executeTakeFirst();

      const affectedRows = Number(result.numUpdatedRows || 0);
      this.logger.debug(
        { configKey, affectedRows },
        'Config updated successfully'
      );

      return affectedRows;
    } else {
      const result = await db
        .insertInto(this.tableName)
        .values({
          config_key: configKey,
          config_value: configValue,
          config_type: configType as any,
          config_group: configGroup,
          description: description || undefined,
          is_system: false,
          is_encrypted: false,
          created_by: updatedBy || undefined,
          updated_by: updatedBy || undefined
        } as any)
        .executeTakeFirst();

      const affectedRows = Number(result.numInsertedOrUpdatedRows || 0);
      this.logger.debug(
        { configKey, affectedRows },
        'Config created successfully'
      );

      return affectedRows;
    }
  }

  public async deleteByKey(configKey: string): Promise<number> {
    if (!configKey || configKey.trim() === '') {
      this.logger.warn('deleteByKey called with empty configKey');
      return 0;
    }

    this.logger.debug({ configKey }, 'Deleting system config');

    const db = await this.getQueryConnection();
    const result = await db
      .deleteFrom(this.tableName)
      .where('config_key', '=', configKey)
      .executeTakeFirst();

    const affectedRows = Number(result.numDeletedRows || 0);
    this.logger.debug(
      { configKey, affectedRows },
      'Config deleted successfully'
    );

    return affectedRows;
  }

  public async findByKeys(
    configKeys: string[]
  ): Promise<IcalinkSystemConfig[]> {
    if (!configKeys || configKeys.length === 0) {
      this.logger.warn('findByKeys called with empty configKeys');
      return [];
    }

    this.logger.debug(
      { count: configKeys.length },
      'Finding system configs by keys'
    );

    const result = (await this.findMany((qb) =>
      qb.where('config_key', 'in', configKeys)
    )) as unknown as IcalinkSystemConfig[];

    this.logger.debug(
      { requestedCount: configKeys.length, foundCount: result.length },
      'Configs lookup completed'
    );

    return result;
  }
}
