/**
 * AutoSaveRepository - 增强的 BaseRepository 类
 * 支持动态表创建和数据批量写入功能
 */

import {
  type Either,
  eitherFold,
  eitherLeft,
  eitherMapLeft,
  eitherRight,
  isLeft,
  type Maybe
} from '@stratix/core/functional';
import { sql } from 'kysely';
import {
  type DatabaseError,
  ErrorClassifier,
  ValidationError
} from '../utils/error-handler.js';
import {
  BaseRepository,
  type ColumnDefinition,
  DataColumnType,
  TableCreator,
  type TableSchema
} from './base-repository.js';

/**
 * 动态表创建选项
 */
export interface CreateTableFromDataOptions {
  /** 指定主键字段，默认添加自增id */
  primaryKeyField?: string;
  /** 字符串字段长度，默认255 */
  stringFieldLength?: number;
  /** 是否覆盖已存在的表，默认false */
  overwriteIfExists?: boolean;
  /** 是否启用自动时间戳，默认true */
  enableAutoTimestamps?: boolean;
}

/**
 * 批次表创建选项
 */
export interface CreateTableWithBatchOptions {
  /** 指定主键字段，默认添加自增id */
  primaryKeyField?: string;
  /** 字符串字段长度，默认255 */
  stringFieldLength?: number;
  /** 最大保留批次数量，默认3 */
  maxBatchesToKeep?: number;
}

/**
 * 批次操作结果
 */
export interface BatchResult<T> {
  /** 插入的数据 */
  data: T[];
  /** 批次号 */
  batchId: string;
}

/**
 * AutoSaveRepository - 增强的 BaseRepository 类
 * 继承 BaseRepository 的所有功能，并添加动态表创建和数据批量写入功能
 */
export abstract class AutoSaveRepository<
  DB = any,
  TB extends keyof DB & string = any,
  T = any,
  CreateT = any,
  UpdateT = any
> extends BaseRepository<DB, TB, T, CreateT, UpdateT> {
  /**
   * 创建带批次号的表并插入数据，自动管理批次表的生命周期
   */
  async createTableWithBatch<D extends Record<string, string | number | boolean>>(
    dataArray: D[],
    options: CreateTableWithBatchOptions = {}
  ): Promise<Either<DatabaseError, BatchResult<D>>> {
    try {
      // 🎯 1. 生成批次号
      const batchId = this.generateBatchId();

      // 🎯 2. 为数据添加批次字段
      const dataWithBatch = dataArray.map((item) => ({
        ...item,
        batch_id: batchId
      }));

      // 🎯 3. 检查表是否存在
      const tableExists = await this.checkTableExists(this.tableName);

      // 🎯 4. 如果表不存在，创建表（包含批次字段）
      if (!tableExists) {
        const schema = this.generateTableSchemaWithBatch(dataWithBatch, options);
        await this.createTableFromSchema(schema);
        this.logger.info(`成功创建带批次管理的表: ${this.tableName}`);
      }

      // 🎯 5. 清理旧批次数据（如果表已存在）
      if (tableExists) {
        await this.cleanupOldBatchData(options.maxBatchesToKeep || 3);
      }

      // 🎯 6. 插入新批次数据
      const insertResult = await this.createMany(dataWithBatch as any);
      if (isLeft(insertResult)) {
        this.logger.error(`批次 ${batchId} 数据插入失败`, insertResult.left);
        return eitherLeft(insertResult.left);
      }

      this.logger.info(
        `成功插入批次 ${batchId} 的数据，共 ${dataArray.length} 条记录`
      );

      // 🎯 7. 返回结果
      return eitherRight({
        data: insertResult.right as unknown as D[],
        batchId
      });
    } catch (error) {
      const dbError = ErrorClassifier.classify(error);
      this.logger.error(`创建带批次表失败`, { error: dbError });
      return eitherLeft(dbError);
    }
  }

  /**
   * 根据传入的数组对象自动分析数据结构并创建对应的数据库表
   * 然后将数组中的所有记录批量写入到新创建的表中
   */
  async createTableFromData<D extends Record<string, string | number | boolean>>(
    dataArray: D[],
    options: CreateTableFromDataOptions = {}
  ): Promise<Either<DatabaseError, D[]>> {
    try {
      // 🎯 1. 输入验证
      const validationResult = this.validateInput(dataArray);
      if (isLeft(validationResult)) {
        return eitherLeft(validationResult.left);
      }

      // 🎯 2. 检查表是否已存在
      const tableExists = await this.checkTableExists(this.tableName);

      // 🎯 3. 根据表存在情况决定是否创建表
      if (tableExists) {
        if (options.overwriteIfExists) {
          // 如果设置了覆盖选项，删除现有表并重新创建
          await this.dropTable(this.tableName);
          this.logger.info(`已删除现有表: ${this.tableName}，准备重新创建`);
        } else {
          // 表已存在且不覆盖，跳过表创建，直接插入数据
          this.logger.info(
            `表 '${this.tableName}' 已存在，跳过创建步骤，直接插入数据`
          );
        }
      }

      // 🎯 4. 只有在表不存在或需要覆盖时才创建表
      if (!tableExists || options.overwriteIfExists) {
        // 生成 TableSchema
        const schema = this.generateTableSchema(dataArray, options);

        // 创建表
        await this.createTableFromSchema(schema);
        this.logger.info(`成功创建表: ${this.tableName}`);
      }

      // 🎯 7. 清空表数据（如果表已存在）
      if (tableExists && !options.overwriteIfExists) {
        await this.clearTableData();
        this.logger.info(`已清空表 '${this.tableName}' 的数据`);
      }

      // 🎯 8. 批量插入数据
      return this.insertDataToTable(dataArray);
    } catch (error) {
      const dbError = ErrorClassifier.classify(error);
      this.logger.error(`从数据创建表失败`, { error: dbError });
      return eitherLeft(dbError);
    }
  }

  /**
   * 输入验证
   */
  private validateInput<D extends Record<string, any>>(
    dataArray: D[]
  ): Either<ValidationError, D[]> {
    // 检查数组
    if (!Array.isArray(dataArray)) {
      return eitherLeft(ValidationError.create('数据必须是数组格式'));
    }

    if (dataArray.length === 0) {
      return eitherLeft(ValidationError.create('数据数组不能为空'));
    }

    return eitherRight(dataArray);
  }

  /**
   * 生成 TableSchema - 简化版本，直接从第一条记录获取字段
   */
  private generateTableSchema<D extends Record<string, any>>(
    dataArray: D[],
    options: CreateTableFromDataOptions
  ): TableSchema {
    const { primaryKeyField, stringFieldLength = 255 } = options;
    const columns: ColumnDefinition[] = [];

    // 从第一条记录获取字段信息
    if (dataArray.length === 0) {
      throw new Error('数据数组不能为空');
    }

    const firstRecord = dataArray[0];

    // 添加主键字段（如果指定且不存在）
    if (primaryKeyField && !(primaryKeyField in firstRecord)) {
      columns.push({
        name: primaryKeyField,
        type: DataColumnType.INTEGER,
        constraints: {
          primaryKey: true,
          autoIncrement: true,
          nullable: false
        }
      });
    }

    // 添加数据字段
    for (const [fieldName, fieldValue] of Object.entries(firstRecord)) {
      // 根据值类型推断数据库字段类型
      let fieldType: DataColumnType;
      if (typeof fieldValue === 'string') {
        fieldType = DataColumnType.STRING;
      } else if (typeof fieldValue === 'number') {
        fieldType = Number.isInteger(fieldValue)
          ? DataColumnType.INTEGER
          : DataColumnType.DECIMAL;
      } else if (typeof fieldValue === 'boolean') {
        fieldType = DataColumnType.BOOLEAN;
      } else {
        // 其他类型转为字符串存储
        fieldType = DataColumnType.STRING;
      }

      const column: ColumnDefinition = {
        name: fieldName,
        type: fieldType,
        constraints: {
          nullable: true,
          ...(fieldType === DataColumnType.STRING && {
            length: stringFieldLength
          })
        }
      };

      // 如果这个字段被指定为主键，设置主键约束
      if (primaryKeyField === fieldName) {
        column.constraints = {
          ...column.constraints,
          primaryKey: true,
          nullable: false,
          ...(fieldType === DataColumnType.INTEGER && {
            autoIncrement: true
          })
        };
      }

      columns.push(column);
    }

    return {
      tableName: this.tableName,
      columns,
      indexes: []
    };
  }

  /**
   * 生成带批次字段的 TableSchema
   */
  private generateTableSchemaWithBatch<D extends Record<string, any>>(
    dataArray: D[],
    options: CreateTableFromDataOptions
  ): TableSchema {
    // 先生成基础 schema
    const baseSchema = this.generateTableSchema(dataArray, options);

    // 确保包含 batch_id 字段
    const hasBatchField = baseSchema.columns.some(
      (col) => col.name === 'batch_id'
    );
    if (!hasBatchField) {
      baseSchema.columns.push({
        name: 'batch_id',
        type: DataColumnType.STRING,
        constraints: {
          nullable: false,
          length: 50
        }
      });
    }

    return baseSchema;
  }

  /**
   * 根据 TableSchema 创建表
   */
  private async createTableFromSchema(schema: TableSchema): Promise<void> {
    try {
      const connection = await this.getWriteConnection();
      const databaseType = TableCreator.getDatabaseType(
        connection,
        this.connectionConfig.writeConnectionName
      );

      // 使用现有的 TableCreator 来创建表
      await TableCreator.createTable(connection, schema, databaseType, {
        forceRecreate: false
      });
    } catch (error) {
      this.logger.error(`创建表失败: ${this.tableName}`, { error });
      throw error;
    }
  }

  /**
   * 向当前表插入数据（支持分批插入以避免 SQLite 参数限制，自动清理字符串空白）
   */
  private async insertDataToTable<D extends Record<string, any>>(
    dataArray: D[]
  ): Promise<Either<DatabaseError, D[]>> {
    try {
      // 🎯 数据清理：去除所有字符串值的前后空白
      const cleanedDataArray = dataArray.map((item: any) => {
        const cleanedItem: any = {};
        for (const [key, value] of Object.entries(item)) {
          if (typeof value === 'string') {
            cleanedItem[key] = value.trim();
          } else {
            cleanedItem[key] = value;
          }
        }
        return cleanedItem as D;
      });

      const insertResult = await this.createMany(cleanedDataArray as any);

      if (isLeft(insertResult)) {
        this.logger.error(`数据插入失败: ${this.tableName}`, { error: insertResult.left });
        return eitherLeft(insertResult.left);
      }

      this.logger.info(`数据插入完成`,
        {
          tableName: this.tableName,
          totalRows: insertResult.right.length
        }
      );
      return eitherRight(insertResult.right as unknown as D[]);
    } catch (error) {
      this.logger.error(`数据插入失败: ${this.tableName}`, { error });
      return eitherLeft(ErrorClassifier.classify(error));
    }
  }

  /**
   * 检查表是否已存在
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const connection = await this.getQueryConnection();

      // 尝试查询表的第一行，如果表不存在会抛出错误
      await (connection as any)
        .selectFrom(tableName)
        .select('1 as exists')
        .limit(1)
        .execute();

      return true;
    } catch (error) {
      // 如果查询失败，假设表不存在
      return false;
    }
  }

  /**
   * 生成表创建的 SQL 预览（用于调试）
   */
  generateTableCreationPreview(
    dataArray: any[],
    options: CreateTableFromDataOptions = {}
  ): { schema: TableSchema; sqlPreview: string } {
    const schema = this.generateTableSchema(dataArray, options);

    // 生成简化的 SQL 预览
    const columns = schema.columns
      .map((col) => {
        let sql = `  ${col.name} `;

        switch (col.type) {
          case DataColumnType.STRING:
            sql += `VARCHAR(${col.constraints?.length || 255})`;
            break;
          case DataColumnType.INTEGER:
            sql += 'INTEGER';
            break;
          case DataColumnType.DECIMAL:
            sql += 'DECIMAL(10,2)';
            break;
          case DataColumnType.BOOLEAN:
            sql += 'BOOLEAN';
            break;
          default:
            sql += 'TEXT';
        }

        if (col.constraints?.primaryKey) {
          sql += ' PRIMARY KEY';
        }

        if (col.constraints?.autoIncrement) {
          sql += ' AUTO_INCREMENT';
        }

        if (!col.constraints?.nullable) {
          sql += ' NOT NULL';
        }

        return sql;
      })
      .join(',\n');

    const sqlPreview = `CREATE TABLE ${this.tableName} (\n${columns}\n);`;

    return { schema, sqlPreview };
  }

  // 🎯 批次管理功能

  /**
   * 生成基于时间戳的批次号
   * 格式：YYYYMMDDHHMM（如：202509101350）
   */
  private generateBatchId(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}${hour}${minute}`;
  }

  /**
   * 获取数据库中所有表名
   */
  private async getAllTableNames(): Promise<string[]> {
    try {
      // 使用通用的方法：尝试查询一个不存在的表来获取错误信息
      // 然后通过其他方式获取表列表
      // 这里简化处理，返回空数组，实际使用中可以根据具体数据库实现
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 删除指定的表
   */
  private async dropTable(tableName: string): Promise<void> {
    try {
      const connection = await this.getQueryConnection();

      // 使用 Kysely 的 schema 方法删除表
      await connection.schema.dropTable(tableName).ifExists().execute();
    } catch (error) {
      this.logger.error(`删除表失败: ${tableName}`, { error });
      throw error;
    }
  }

  /**
   * 清空当前表的所有数据
   */
  private async clearTableData(): Promise<void> {
    try {
      const connection = await this.getWriteConnection();

      // 使用 DELETE FROM 清空表数据
      await connection.deleteFrom(this.tableName as any).execute();

      this.logger.info(`成功清空表 '${this.tableName}' 的数据`);
    } catch (error) {
      this.logger.error(`清空表数据失败: ${this.tableName}`, { error });
      throw error;
    }
  }

  /**
   * 清理旧批次数据（在同一个表中按 batch_id 删除）
   * 获取表的批次号按大小排序，保留最后N个批次，删除其他批次的记录
   */
  private async cleanupOldBatchData(maxBatchesToKeep: number): Promise<void> {
    try {
      const connection = await this.getWriteConnection();

      // 🎯 1. 使用 sql 模板获取所有不同的批次号，按批次号降序排列（最新的在前）
      const batchQuery = sql`
        SELECT DISTINCT batch_id
        FROM ${sql.table(this.tableName)}
        ORDER BY batch_id DESC
      `;

      const result = await batchQuery.execute(connection);
      const batchIds = result.rows.map((row: any) => row.batch_id);

      // 🎯 2. 如果批次数量不超过限制，无需清理
      if (batchIds.length <= maxBatchesToKeep) {
        this.logger.debug(
          `无需清理批次数据，当前批次数量: ${batchIds.length}`,
          { tableName: this.tableName, maxBatchesToKeep, batchIds }
        );
        return;
      }

      // 🎯 3. 确定需要删除的批次（保留最新的N个，删除其余的）
      const batchesToDelete = batchIds.slice(maxBatchesToKeep);

      this.logger.info(`开始清理旧批次数据`,
        {
          tableName: this.tableName,
          totalBatches: batchIds.length,
          batchesToKeep: batchIds.slice(0, maxBatchesToKeep),
          batchesToDelete
        }
      );

      // 🎯 4. 删除旧批次数据（使用 sql 模板批量删除）
      if (batchesToDelete.length > 0) {
        try {
          const deleteQuery = sql`
            DELETE FROM ${sql.table(this.tableName)}
            WHERE batch_id IN (${sql.join(
              batchesToDelete.map((id: string) => sql.lit(id))
            )})
          `;

          const deleteResult = await deleteQuery.execute(connection);

          this.logger.info(`批量删除旧批次数据完成`,
            {
              tableName: this.tableName,
              deletedBatches: batchesToDelete,
              batchCount: batchesToDelete.length,
              affectedRows: deleteResult.numAffectedRows || 0
            }
          );
        } catch (error) {
          this.logger.error(`批量删除批次数据失败`,
            {
              tableName: this.tableName,
              batchesToDelete,
              error
            }
          );
          throw error;
        }
      }

      this.logger.info(`批次数据清理完成`,
        {
          tableName: this.tableName,
          totalBatches: batchIds.length,
          deletedBatches: batchesToDelete.length,
          remainingBatches: batchIds.length - batchesToDelete.length,
          keptBatches: batchIds.slice(0, maxBatchesToKeep)
        }
      );
    } catch (error) {
      this.logger.error(`清理批次数据失败`,
        {
          tableName: this.tableName,
          maxBatchesToKeep,
          error
        }
      );
      throw error;
    }
  }
}
