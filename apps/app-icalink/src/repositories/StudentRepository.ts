import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder,
  sql
} from '@stratix/database';
import type { IcalinkDatabase, OutXsxx } from '../types/database.js';

const schema = SchemaBuilder.create('out_xsxx')
  .addPrimaryKey('id')
  .addColumn('xh', DataColumnType.STRING, { nullable: true })
  .addColumn('xm', DataColumnType.STRING, { nullable: true })
  .addColumn('bjmc', DataColumnType.STRING, { nullable: true })
  .addColumn('zymc', DataColumnType.STRING, { nullable: true })
  .addColumn('xymc', DataColumnType.STRING, { nullable: true })
  .setComment('学生信息表')
  .build();

export default class StudentRepository extends BaseRepository<
  IcalinkDatabase,
  'out_xsxx',
  OutXsxx
> {
  protected readonly tableName = 'out_xsxx';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('syncdb'); // This repository uses the 'syncdb' connection
    this.logger.info('✅ StudentRepository initialized');
  }

  /**
   * 根据课程代码和学期查询学生列表
   *
   * 数据源：icalink_teaching_class 表（教学班表）
   * 注意：semester 参数已废弃，保留以保持接口兼容性
   *
   * @param courseCode - 课程代码
   * @param semester - 学期（已废弃，不再使用）
   * @returns 学生列表（错误时返回空数组）
   */
  async findByCourse(courseCode: string, semester: string): Promise<OutXsxx[]> {
    try {
      this.logger.info(
        { courseCode, semester: semester || 'N/A (deprecated)' },
        'Finding students by course'
      );

      const db = await this.getQueryConnection();
      const queryResult = await sql<OutXsxx>`
        SELECT DISTINCT s.*
        FROM icasync.icalink_teaching_class tc
        INNER JOIN out_xsxx s ON tc.student_id = s.xh
        WHERE tc.course_code = ${courseCode}
          AND (s.zt IS NULL OR (s.zt != '毕业' AND s.zt != '退学'))
        ORDER BY s.xh ASC
      `.execute(db);

      return queryResult.rows;
    } catch (error) {
      this.logError('findByCourse', error as Error, { courseCode, semester });
      // 遵循 BaseRepository 模式：错误时返回空数组
      return [];
    }
  }
}
