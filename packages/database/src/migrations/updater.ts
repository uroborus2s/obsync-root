/**
 * @stratix/database 迁移更新器模块
 */

import fs from 'fs';
import { Knex } from 'knex';
import path from 'path';
import { DatabaseConfig, ModelStatic } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { MigrationComparator, SchemaDiff } from './comparator.js';
import { MigrationGenerator } from './generator.js';
import { MigrationManager } from './manager.js';

/**
 * 迁移更新器选项
 */
export interface MigrationUpdaterOptions {
  /**
   * 是否自动生成迁移文件
   */
  autoGenerate?: boolean;

  /**
   * 是否自动执行迁移
   */
  autoRun?: boolean;

  /**
   * 表名前缀
   */
  tablePrefix?: string;

  /**
   * 是否比较外键
   */
  compareForeignKeys?: boolean;

  /**
   * 是否比较索引
   */
  compareIndexes?: boolean;

  /**
   * 迁移目录
   */
  migrationDirectory?: string;

  /**
   * 模型类
   */
  modelClass?: ModelStatic;

  /**
   * 是否使用事务
   */
  useTransaction?: boolean;

  /**
   * 是否执行更改
   */
  execute?: boolean;

  /**
   * 是否自动确认更改
   */
  autoConfirm?: boolean;

  /**
   * 是否跳过危险操作
   */
  skipDangerous?: boolean;

  /**
   * 日志记录器
   */
  logger?: Logger;

  /**
   * Knex实例
   */
  knex?: Knex;

  /**
   * 迁移目录
   */
  directory?: string;
}

/**
 * 比较差异类型定义
 */
export interface CompareDifference {
  /**
   * 操作类型: 添加、修改、删除
   */
  operation: 'add' | 'modify' | 'remove';

  /**
   * 差异类型: 表、列、索引
   */
  type: 'table' | 'column' | 'index';

  /**
   * 表名
   */
  table: string;

  /**
   * 列名（适用于列操作）
   */
  column?: string;

  /**
   * 索引名（适用于索引操作）
   */
  indexName?: string;

  /**
   * 目标定义
   */
  target?: any;
}

/**
 * 迁移更新结果
 */
export interface MigrationUpdateResult {
  /**
   * 差异数量
   */
  diffCount: number;

  /**
   * 生成的迁移文件路径（如果生成）
   */
  generatedFile?: string;

  /**
   * 迁移执行结果（如果执行）
   */
  migrationResult?: any;

  /**
   * 差异列表
   */
  diffs: SchemaDiff[];
}

/**
 * 迁移更新器
 * 用于根据对比结果自动更新数据库结构
 */
export class MigrationUpdater {
  /**
   * Knex实例
   */
  private knex: Knex;

  /**
   * 迁移生成器
   */
  private generator: MigrationGenerator;

  /**
   * 迁移管理器
   */
  private manager: MigrationManager;

  /**
   * 迁移比较器
   */
  private comparator: MigrationComparator;

  /**
   * 更新器选项
   */
  private options: MigrationUpdaterOptions;

  private logger: Logger;

  /**
   * 构造函数
   *
   * @param knex Knex实例
   * @param options 更新器选项
   */
  constructor(knex: Knex, options: MigrationUpdaterOptions = {}) {
    this.knex = knex;
    this.options = {
      autoGenerate: true,
      autoRun: false,
      tablePrefix: '',
      compareForeignKeys: true,
      compareIndexes: true,
      ...options
    };

    // 这里我们可能需要在创建 MigrationGenerator 时手动传入所需的参数
    this.generator = new MigrationGenerator();

    // 创建 MigrationManager 时提供必要的配置
    this.manager = new MigrationManager(knex, {
      migrations: {
        directory: this.options.migrationDirectory
      }
    } as DatabaseConfig);

    this.comparator = new MigrationComparator(knex, {
      tablePrefix: this.options.tablePrefix,
      compareForeignKeys: this.options.compareForeignKeys,
      compareIndexes: this.options.compareIndexes
    });

    this.logger = options.logger || console;
  }

  /**
   * 更新单个模型的数据库结构
   *
   * @param modelClass 模型类
   * @returns 更新结果
   */
  public async updateModel(
    modelClass: ModelStatic
  ): Promise<MigrationUpdateResult> {
    return this.updateModels([modelClass]);
  }

  /**
   * 更新多个模型的数据库结构
   *
   * @param models 模型类数组
   * @returns 更新结果
   */
  public async updateModels(
    models: ModelStatic[]
  ): Promise<MigrationUpdateResult> {
    // 比较模型与数据库结构
    const diffs = await this.comparator.compareModels(models);

    // 如果没有差异，返回结果
    if (diffs.length === 0) {
      return {
        diffCount: 0,
        diffs: []
      };
    }

    const result: MigrationUpdateResult = {
      diffCount: diffs.length,
      diffs
    };

    // 如果不自动生成迁移文件，返回结果
    if (!this.options.autoGenerate) {
      return result;
    }

    // 生成迁移文件名
    const modelNames = models.map((model) => model.tableName).join('_');
    const timestamp = new Date().getTime();
    const migrationName = `update_${modelNames}_${timestamp}`;

    // 生成迁移内容
    const migrationContent = this.comparator.generateMigrationFromDiff(diffs);

    // 确保迁移目录存在
    if (!this.options.migrationDirectory) {
      throw new Error('迁移目录未指定');
    }

    if (!fs.existsSync(this.options.migrationDirectory)) {
      fs.mkdirSync(this.options.migrationDirectory, { recursive: true });
    }

    // 写入迁移文件
    const migrationFilePath = path.join(
      this.options.migrationDirectory,
      `${migrationName}.js`
    );

    fs.writeFileSync(migrationFilePath, migrationContent, 'utf8');

    result.generatedFile = migrationFilePath;

    // 如果自动执行迁移，运行迁移
    if (this.options.autoRun) {
      const migrationResult = await this.manager.migrate();
      result.migrationResult = migrationResult;
    }

    return result;
  }

  /**
   * 生成并执行所有模型的迁移
   *
   * @param models 模型类数组
   * @returns 是否成功
   */
  public async migrateAll(models: ModelStatic[]): Promise<boolean> {
    // 生成所有模型的迁移文件
    const generationResults = await Promise.all(
      models.map((model) =>
        MigrationGenerator.generateFromModel({
          modelClass: model,
          directory: this.options.migrationDirectory || './migrations',
          tablePrefix: this.options.tablePrefix
        })
      )
    );

    // 运行所有迁移
    const migrationResult = await this.manager.migrate();

    return migrationResult.length > 0;
  }

  /**
   * 重置所有迁移并重新生成
   *
   * @param models 模型类数组
   * @returns 是否成功
   */
  public async resetAndMigrate(models: ModelStatic[]): Promise<boolean> {
    // 回滚所有迁移
    await this.manager.reset();

    // 删除所有迁移文件
    if (
      this.options.migrationDirectory &&
      fs.existsSync(this.options.migrationDirectory)
    ) {
      const files = fs.readdirSync(this.options.migrationDirectory);

      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          fs.unlinkSync(path.join(this.options.migrationDirectory, file));
        }
      }
    }

    // 重新生成并执行所有迁移
    return this.migrateAll(models);
  }

  /**
   * 应用差异更新到数据库
   * @param differences 差异列表
   * @returns 执行结果
   */
  async applyDifferences(differences: CompareDifference[]): Promise<boolean> {
    if (differences.length === 0) {
      this.logger.info('没有差异需要应用');
      return true;
    }

    this.logger.info(`发现 ${differences.length} 个差异需要应用`);

    // 按照安全顺序排序差异
    const sortedDiffs = this.sortDifferences(differences);

    let trx: Knex.Transaction | Knex = this.knex;

    try {
      // 使用事务
      if (this.options.useTransaction && this.options.execute) {
        trx = await this.knex.transaction();
      }

      for (const diff of sortedDiffs) {
        const canApply = await this.confirmChange(diff);
        if (!canApply) {
          this.logger.info(`跳过变更: ${this.describeDifference(diff)}`);
          continue;
        }

        if (this.options.execute) {
          await this.applyDifference(trx, diff);
          this.logger.info(`已应用: ${this.describeDifference(diff)}`);
        } else {
          this.logger.info(`模拟应用: ${this.describeDifference(diff)}`);
        }
      }

      if (
        this.options.useTransaction &&
        this.options.execute &&
        trx !== this.knex
      ) {
        await (trx as Knex.Transaction).commit();
      }

      return true;
    } catch (error) {
      this.logger.error('应用差异时出错:', error);

      if (
        this.options.useTransaction &&
        this.options.execute &&
        trx !== this.knex
      ) {
        await (trx as Knex.Transaction).rollback();
      }

      return false;
    }
  }

  /**
   * 根据模型自动更新数据库
   * @param models 模型类列表
   * @param compareDiffs 预先计算的差异（可选）
   * @returns 执行结果
   */
  async updateFromModels(
    models: ModelStatic[],
    compareDiffs?: SchemaDiff[]
  ): Promise<boolean> {
    try {
      const comparator = new MigrationComparator(this.knex);

      const differences =
        compareDiffs || (await comparator.compareModels(models));

      // 将SchemaDiff类型转换为CompareDifference类型
      const convertedDiffs: CompareDifference[] = differences.map((diff) => {
        // 简单转换，基于diff.type进行适配
        let operation: 'add' | 'modify' | 'remove';
        let diffType: 'table' | 'column' | 'index';

        switch (diff.type) {
          case 'add_table':
            operation = 'add';
            diffType = 'table';
            break;
          case 'drop_table':
            operation = 'remove';
            diffType = 'table';
            break;
          case 'add_column':
            operation = 'add';
            diffType = 'column';
            break;
          case 'change_column':
            operation = 'modify';
            diffType = 'column';
            break;
          case 'drop_column':
            operation = 'remove';
            diffType = 'column';
            break;
          case 'add_index':
            operation = 'add';
            diffType = 'index';
            break;
          case 'drop_index':
            operation = 'remove';
            diffType = 'index';
            break;
          default:
            operation = 'add';
            diffType = 'table';
        }

        return {
          operation,
          type: diffType,
          table: diff.table,
          column: diff.column,
          indexName: diff.indexName,
          target: diff.target || diff.field
        };
      });

      return await this.applyDifferences(convertedDiffs);
    } catch (error) {
      this.logger.error('从模型更新数据库时出错:', error);
      return false;
    }
  }

  /**
   * 对差异进行排序，确保安全执行顺序
   * @param differences 差异列表
   * @returns 排序后的差异列表
   */
  private sortDifferences(
    differences: CompareDifference[]
  ): CompareDifference[] {
    // 执行顺序：先创建，后修改，最后删除
    // 对于相同操作，按照表、索引、字段的顺序
    return [...differences].sort((a, b) => {
      // 先按操作排序
      const opOrder = { add: 0, modify: 1, remove: 2 };
      const opDiff =
        opOrder[a.operation as keyof typeof opOrder] -
        opOrder[b.operation as keyof typeof opOrder];
      if (opDiff !== 0) return opDiff;

      // 对于删除操作，要先删除索引，再删除字段，最后删除表
      if (a.operation === 'remove') {
        const typeOrder = { index: 0, column: 1, table: 2 };
        return (
          typeOrder[a.type as keyof typeof typeOrder] -
          typeOrder[b.type as keyof typeof typeOrder]
        );
      }

      // 对于添加操作，要先添加表，再添加字段，最后添加索引
      const typeOrder = { table: 0, column: 1, index: 2 };
      return (
        typeOrder[a.type as keyof typeof typeOrder] -
        typeOrder[b.type as keyof typeof typeOrder]
      );
    });
  }

  /**
   * 确认是否应用变更
   * @param diff 差异
   * @returns 是否应用
   */
  private async confirmChange(diff: CompareDifference): Promise<boolean> {
    // 自动确认
    if (this.options.autoConfirm) {
      return true;
    }

    // 跳过危险操作
    if (this.options.skipDangerous) {
      if (diff.operation === 'remove') {
        return false;
      }
    }

    // 如果没有自动确认，在实际使用中可以添加用户交互确认
    // 这里简化处理，返回true
    return true;
  }

  /**
   * 应用单个差异
   * @param trx 事务对象
   * @param diff 差异
   */
  private async applyDifference(
    trx: Knex | Knex.Transaction,
    diff: CompareDifference
  ): Promise<void> {
    switch (diff.type) {
      case 'table':
        await this.applyTableDifference(trx, diff);
        break;
      case 'column':
        await this.applyColumnDifference(trx, diff);
        break;
      case 'index':
        await this.applyIndexDifference(trx, diff);
        break;
    }
  }

  /**
   * 应用表差异
   * @param trx 事务对象
   * @param diff 差异
   */
  private async applyTableDifference(
    trx: Knex | Knex.Transaction,
    diff: CompareDifference
  ): Promise<void> {
    const { table, operation, target } = diff;

    if (operation === 'add') {
      await trx.schema.createTable(table, (t) => {
        this.createTableFromSchema(t, target);
      });
    } else if (operation === 'remove') {
      await trx.schema.dropTableIfExists(table);
    }
  }

  /**
   * 应用字段差异
   * @param trx 事务对象
   * @param diff 差异
   */
  private async applyColumnDifference(
    trx: Knex | Knex.Transaction,
    diff: CompareDifference
  ): Promise<void> {
    const { table, column, operation, target } = diff;

    if (!column) return;

    await trx.schema.alterTable(table, (t) => {
      if (operation === 'add') {
        this.addColumnFromDefinition(t, column, target);
      } else if (operation === 'modify') {
        t.dropColumn(column);
        this.addColumnFromDefinition(t, column, target);
      } else if (operation === 'remove') {
        t.dropColumn(column);
      }
    });
  }

  /**
   * 应用索引差异
   * @param trx 事务对象
   * @param diff 差异
   */
  private async applyIndexDifference(
    trx: Knex | Knex.Transaction,
    diff: CompareDifference
  ): Promise<void> {
    const { table, indexName, operation, target } = diff;

    if (!indexName) return;

    await trx.schema.alterTable(table, (t) => {
      if (operation === 'add') {
        this.addIndexFromDefinition(t, target);
      } else if (operation === 'remove') {
        t.dropIndex([], indexName);
      }
    });
  }

  /**
   * 根据模型定义创建表结构
   * @param tableBuilder 表构建器
   * @param schema 表结构定义
   */
  private createTableFromSchema(
    tableBuilder: Knex.CreateTableBuilder,
    schema: any
  ): void {
    const { columns, indexes } = schema;

    // 创建字段
    for (const columnName in columns) {
      const columnDef = columns[columnName];
      this.addColumnFromDefinition(tableBuilder, columnName, columnDef);
    }

    // 创建索引
    if (indexes && indexes.length) {
      for (const indexDef of indexes) {
        this.addIndexFromDefinition(tableBuilder, indexDef);
      }
    }
  }

  /**
   * 根据字段定义添加字段
   * @param tableBuilder 表构建器
   * @param columnName 字段名
   * @param columnDef 字段定义
   */
  private addColumnFromDefinition(
    tableBuilder: Knex.CreateTableBuilder | Knex.AlterTableBuilder,
    columnName: string,
    columnDef: any
  ): void {
    let column: any;

    switch (columnDef.type.toLowerCase()) {
      case 'string':
      case 'varchar':
        column = tableBuilder.string(columnName, columnDef.length);
        break;
      case 'text':
        column = tableBuilder.text(columnName, columnDef.textType);
        break;
      case 'integer':
        column = tableBuilder.integer(columnName);
        break;
      case 'biginteger':
        column = tableBuilder.bigInteger(columnName);
        break;
      case 'float':
        column = tableBuilder.float(
          columnName,
          columnDef.precision,
          columnDef.scale
        );
        break;
      case 'decimal':
        column = tableBuilder.decimal(
          columnName,
          columnDef.precision,
          columnDef.scale
        );
        break;
      case 'boolean':
        column = tableBuilder.boolean(columnName);
        break;
      case 'date':
        column = tableBuilder.date(columnName);
        break;
      case 'datetime':
        column = tableBuilder.dateTime(columnName, columnDef.options);
        break;
      case 'time':
        column = tableBuilder.time(columnName);
        break;
      case 'timestamp':
        column = tableBuilder.timestamp(columnName, columnDef.options);
        break;
      case 'binary':
        column = tableBuilder.binary(columnName, columnDef.length);
        break;
      case 'json':
        column = tableBuilder.json(columnName);
        break;
      case 'jsonb':
        column = tableBuilder.jsonb(columnName);
        break;
      default:
        column = tableBuilder.specificType(columnName, columnDef.type);
    }

    // 设置主键
    if (columnDef.primary) {
      column.primary();
    }

    // 设置是否可为空
    if (columnDef.nullable === false) {
      column.notNullable();
    } else {
      column.nullable();
    }

    // 设置默认值
    if (columnDef.defaultValue !== undefined) {
      column.defaultTo(columnDef.defaultValue);
    }

    // 设置是否自增
    if (columnDef.autoIncrement) {
      column.increments();
    }

    // 设置是否唯一
    if (columnDef.unique) {
      column.unique();
    }

    // 设置注释
    if (columnDef.comment) {
      column.comment(columnDef.comment);
    }
  }

  /**
   * 根据索引定义添加索引
   * @param tableBuilder 表构建器
   * @param indexDef 索引定义
   */
  private addIndexFromDefinition(
    tableBuilder: Knex.CreateTableBuilder | Knex.AlterTableBuilder,
    indexDef: any
  ): void {
    const { name, columns, unique } = indexDef;

    if (unique) {
      tableBuilder.unique(columns, { indexName: name });
    } else {
      tableBuilder.index(columns, name);
    }
  }

  /**
   * 生成差异描述
   * @param diff 差异
   * @returns 差异描述
   */
  private describeDifference(diff: CompareDifference): string {
    const { type, operation, table, column, indexName } = diff;

    const opText = {
      add: '添加',
      modify: '修改',
      remove: '移除'
    }[operation as 'add' | 'modify' | 'remove'];

    const typeText = {
      table: '表',
      column: '字段',
      index: '索引'
    }[type as 'table' | 'column' | 'index'];

    let target = table;
    if (type === 'column' && column) {
      target = `${table}.${column}`;
    } else if (type === 'index' && indexName) {
      target = `${table}.${indexName}`;
    }

    return `${opText}${typeText} ${target}`;
  }
}
