import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import type { IcalinkDatabase, OutJsxx } from '../types/database.js';

const teacherSchema = SchemaBuilder.create('out_jsxx')
  .addPrimaryKey('id')
  .addColumn('xm', DataColumnType.STRING, { length: 255, nullable: true })
  .addColumn('gh', DataColumnType.STRING, { length: 255, nullable: true })
  .addColumn('ssdwmc', DataColumnType.STRING, { length: 255, nullable: true })
  .addColumn('email', DataColumnType.STRING, { length: 255, nullable: true })
  .addColumn('sjh', DataColumnType.STRING, { length: 50, nullable: true })
  .setComment('教师信息表')
  .build();

export default class TeacherRepository extends BaseRepository<
  IcalinkDatabase,
  'out_jsxx',
  OutJsxx
> {
  protected readonly tableName = 'out_jsxx';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = teacherSchema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ TeacherRepository initialized');
  }
}
