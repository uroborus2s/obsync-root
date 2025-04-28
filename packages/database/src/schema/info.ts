/**
 * @stratix/database 数据库Schema信息类
 */

import { Knex } from 'knex';
import { ColumnInfo, IndexInfo, TableInfo } from '../types/database.js';

/**
 * Schema信息类
 * 用于获取数据库表结构信息
 */
export class SchemaInfo {
  /**
   * Knex实例
   */
  private knex: Knex;

  /**
   * 构造函数
   * @param knex Knex实例
   */
  constructor(knex: Knex) {
    this.knex = knex;
  }

  /**
   * 获取表信息
   * @param tableName 表名
   * @returns 表信息
   */
  async getTableInfo(tableName: string): Promise<TableInfo> {
    const columns = await this.getTableColumns(tableName);
    const indexes = await this.getTableIndexes(tableName);

    return {
      name: tableName,
      columns,
      indexes
    };
  }

  /**
   * 获取表的列信息
   * @param tableName 表名
   * @returns 列信息数组
   */
  private async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    const columnInfo = await this.knex(tableName).columnInfo();
    const columns: ColumnInfo[] = [];

    for (const [name, info] of Object.entries(columnInfo)) {
      columns.push({
        name,
        type: (info as any).type || 'string',
        nullable: !(info as any).notNullable,
        defaultValue: (info as any).defaultValue,
        maxLength: (info as any).maxLength,
        comment: (info as any).comment
      });
    }

    return columns;
  }

  /**
   * 获取表的索引信息
   * @param tableName 表名
   * @returns 索引信息数组
   */
  private async getTableIndexes(tableName: string): Promise<IndexInfo[]> {
    // 索引查询依赖于具体的数据库类型
    const client = this.knex.client.config.client;

    if (client === 'pg' || client === 'postgresql') {
      return this.getPostgresIndexes(tableName);
    } else if (client === 'mysql' || client === 'mysql2') {
      return this.getMySQLIndexes(tableName);
    } else if (client === 'sqlite3') {
      return this.getSQLiteIndexes(tableName);
    }

    return [];
  }

  /**
   * 获取PostgreSQL数据库的索引信息
   * @param tableName 表名
   * @returns 索引信息数组
   */
  private async getPostgresIndexes(tableName: string): Promise<IndexInfo[]> {
    const result = await this.knex.raw(
      `
      SELECT
        i.relname as name,
        a.attname as column_name,
        ix.indisprimary as is_primary,
        ix.indisunique as is_unique
      FROM
        pg_catalog.pg_class i
        JOIN pg_catalog.pg_index ix ON ix.indexrelid = i.oid
        JOIN pg_catalog.pg_class t ON t.oid = ix.indrelid
        JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE
        t.relname = ?
      ORDER BY
        i.relname, a.attnum;
    `,
      [tableName]
    );

    const indexesMap = new Map<string, IndexInfo>();

    for (const row of result.rows) {
      const name = row.name;
      if (!indexesMap.has(name)) {
        indexesMap.set(name, {
          name,
          columns: [],
          unique: row.is_unique,
          primary: row.is_primary
        });
      }

      indexesMap.get(name)?.columns.push(row.column_name);
    }

    return Array.from(indexesMap.values());
  }

  /**
   * 获取MySQL数据库的索引信息
   * @param tableName 表名
   * @returns 索引信息数组
   */
  private async getMySQLIndexes(tableName: string): Promise<IndexInfo[]> {
    const result = await this.knex.raw(
      `
      SHOW INDEX FROM ??
    `,
      [tableName]
    );

    const indexesMap = new Map<string, IndexInfo>();

    for (const row of result[0]) {
      const name = row.Key_name;
      if (!indexesMap.has(name)) {
        indexesMap.set(name, {
          name,
          columns: [],
          unique: row.Non_unique === 0,
          primary: name === 'PRIMARY'
        });
      }

      indexesMap.get(name)?.columns.push(row.Column_name);
    }

    return Array.from(indexesMap.values());
  }

  /**
   * 获取SQLite数据库的索引信息
   * @param tableName 表名
   * @returns 索引信息数组
   */
  private async getSQLiteIndexes(tableName: string): Promise<IndexInfo[]> {
    const result = await this.knex.raw(
      `
      PRAGMA index_list(?)
    `,
      [tableName]
    );

    const indexes: IndexInfo[] = [];

    for (const indexInfo of result) {
      const columnsResult = await this.knex.raw(
        `
        PRAGMA index_info(?)
      `,
        [indexInfo.name]
      );

      const columns = columnsResult.map((col: any) => col.name);

      indexes.push({
        name: indexInfo.name,
        columns,
        unique: indexInfo.unique === 1,
        primary: indexInfo.origin === 'pk'
      });
    }

    return indexes;
  }
}
