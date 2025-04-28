/**
 * @stratix/database 迁移比较器模块
 */

import { Knex } from 'knex';
import { SchemaInfo } from '../schema/info.js';
import { ColumnInfo, IndexInfo, TableInfo } from '../types/database.js';
import {
  FieldOptions,
  FieldType,
  ModelStatic,
  RelationDefinition
} from '../types/index.js';

/**
 * 表结构差异类型
 */
export enum DiffType {
  /**
   * 添加表
   */
  AddTable = 'add_table',

  /**
   * 删除表
   */
  DropTable = 'drop_table',

  /**
   * 添加列
   */
  AddColumn = 'add_column',

  /**
   * 修改列
   */
  ChangeColumn = 'change_column',

  /**
   * 删除列
   */
  DropColumn = 'drop_column',

  /**
   * 添加索引
   */
  AddIndex = 'add_index',

  /**
   * 删除索引
   */
  DropIndex = 'drop_index',

  /**
   * 添加外键
   */
  AddForeignKey = 'add_foreign_key',

  /**
   * 删除外键
   */
  DropForeignKey = 'drop_foreign_key'
}

/**
 * 表结构差异接口
 */
export interface SchemaDiff {
  /**
   * 差异类型
   */
  type: DiffType;

  /**
   * 表名
   */
  table: string;

  /**
   * 列名（适用于列操作）
   */
  column?: string;

  /**
   * 字段定义（适用于列添加/修改）
   */
  field?: FieldOptions;

  /**
   * 索引名（适用于索引操作）
   */
  indexName?: string;

  /**
   * 外键信息（适用于外键操作）
   */
  foreignKey?: {
    column: string;
    referenceTable: string;
    referenceColumn: string;
    onDelete?: string;
    onUpdate?: string;
  };

  /**
   * 目标模型架构（适用于表添加或架构比较）
   */
  target?: any;

  /**
   * 当前数据库中的状态（适用于表删除或架构比较）
   */
  current?: any;
}

/**
 * 迁移比较器选项
 */
export interface ComparatorOptions {
  /**
   * 是否比较外键
   */
  compareForeignKeys?: boolean;

  /**
   * 是否比较索引
   */
  compareIndexes?: boolean;

  /**
   * 表名前缀
   */
  tablePrefix?: string;

  /**
   * 是否忽略字段注释变更
   */
  ignoreComment?: boolean;

  /**
   * 是否忽略字段名称大小写
   */
  ignoreCase?: boolean;
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
 * 迁移对比器
 * 用于对比数据库结构与模型定义的差异
 */
export class MigrationComparator {
  /**
   * Knex实例
   */
  private knex: Knex;

  /**
   * 比较选项
   */
  private options: ComparatorOptions;

  /**
   * 构造函数
   *
   * @param knex Knex实例
   * @param options 比较选项
   */
  constructor(knex: Knex, options: ComparatorOptions = {}) {
    this.knex = knex;
    this.options = {
      compareForeignKeys: true,
      compareIndexes: true,
      tablePrefix: '',
      ignoreComment: false,
      ignoreCase: false,
      ...options
    };
  }

  /**
   * 对比模型与数据库结构差异
   * @param modelClass 模型类
   * @returns 差异列表
   */
  async compareModel(modelClass: ModelStatic): Promise<SchemaDiff[]> {
    const tableName = this.options.tablePrefix + modelClass.tableName;
    const schemaInfo = new SchemaInfo(this.knex);

    // 检查表是否存在
    const tableExists = await this.knex.schema.hasTable(tableName);
    if (!tableExists) {
      return [
        {
          type: DiffType.AddTable,
          table: tableName,
          target: modelClass.schema || {}
        }
      ];
    }

    // 获取表信息
    const tableInfo = await schemaInfo.getTableInfo(tableName);
    const differences: SchemaDiff[] = [];

    // 对比表结构
    differences.push(...this.compareColumns(tableName, tableInfo, modelClass));

    // 对比索引
    if (this.options.compareIndexes) {
      differences.push(
        ...this.compareIndexes(tableName, tableInfo, modelClass)
      );
    }

    return differences;
  }

  /**
   * 对比多个模型与数据库结构差异
   * @param models 模型列表
   * @returns 差异列表
   */
  async compareModels(models: ModelStatic[]): Promise<SchemaDiff[]> {
    const differences: SchemaDiff[] = [];

    for (const modelClass of models) {
      const modelDiffs = await this.compareModel(modelClass);
      differences.push(...modelDiffs);
    }

    return differences;
  }

  /**
   * 对比字段差异
   * @param tableName 表名
   * @param tableInfo 表信息
   * @param modelClass 模型类
   * @returns 差异列表
   */
  private compareColumns(
    tableName: string,
    tableInfo: TableInfo,
    modelClass: ModelStatic
  ): SchemaDiff[] {
    const differences: SchemaDiff[] = [];
    const schema = modelClass.schema || {};
    const dbColumns = tableInfo.columns;
    const modelColumns = schema.columns || {};

    // 检查需要添加的字段
    for (const columnName in modelColumns) {
      const modelColumn = modelColumns[columnName];
      const dbColumn = this.findColumn(dbColumns, columnName);

      if (!dbColumn) {
        // 数据库中不存在该字段，需要添加
        differences.push({
          type: DiffType.AddColumn,
          table: tableName,
          column: columnName,
          field: modelColumn
        });
        continue;
      }

      // 字段存在但定义可能不同，需要修改
      const isDifferent = this.isColumnDifferent(dbColumn, modelColumn);
      if (isDifferent) {
        differences.push({
          type: DiffType.ChangeColumn,
          table: tableName,
          column: columnName,
          field: modelColumn
        });
      }
    }

    // 检查需要删除的字段
    for (const dbColumn of dbColumns) {
      const columnName = dbColumn.name;
      if (!modelColumns[columnName] && !this.isSystemColumn(columnName)) {
        differences.push({
          type: DiffType.DropColumn,
          table: tableName,
          column: columnName
        });
      }
    }

    return differences;
  }

  /**
   * 对比索引差异
   * @param tableName 表名
   * @param tableInfo 表信息
   * @param modelClass 模型类
   * @returns 差异列表
   */
  private compareIndexes(
    tableName: string,
    tableInfo: TableInfo,
    modelClass: ModelStatic
  ): SchemaDiff[] {
    const differences: SchemaDiff[] = [];
    const schema = modelClass.schema || {};
    const dbIndexes = tableInfo.indexes || [];
    const modelIndexes = schema.indexes || [];

    // 检查需要添加的索引
    for (const modelIndex of modelIndexes) {
      const dbIndex = this.findIndex(dbIndexes, modelIndex);

      if (!dbIndex) {
        // 数据库中不存在该索引，需要添加
        differences.push({
          type: DiffType.AddIndex,
          table: tableName,
          indexName: modelIndex.name,
          target: modelIndex
        });
      }
    }

    // 检查需要删除的索引
    for (const dbIndex of dbIndexes) {
      // 跳过主键索引
      if (dbIndex.primary) continue;

      const modelIndex = this.findModelIndex(modelIndexes, dbIndex);
      if (!modelIndex) {
        differences.push({
          type: DiffType.DropIndex,
          table: tableName,
          indexName: dbIndex.name,
          current: dbIndex
        });
      }
    }

    return differences;
  }

  /**
   * 判断字段是否不同
   * @param dbColumn 数据库字段信息
   * @param modelColumn 模型字段信息
   * @returns 是否不同
   */
  private isColumnDifferent(dbColumn: ColumnInfo, modelColumn: any): boolean {
    // 类型不同
    if (
      this.normalizeType(dbColumn.type) !== this.normalizeType(modelColumn.type)
    ) {
      return true;
    }

    // 是否允许为空不同
    if (dbColumn.nullable !== modelColumn.nullable) {
      return true;
    }

    // 默认值不同（需要特殊处理null和undefined）
    const dbDefault = dbColumn.defaultValue;
    const modelDefault = modelColumn.defaultValue;

    if (
      (dbDefault === null &&
        modelDefault !== null &&
        modelDefault !== undefined) ||
      (dbDefault !== null &&
        (modelDefault === null || modelDefault === undefined)) ||
      (dbDefault !== null &&
        modelDefault !== null &&
        dbDefault.toString() !== modelDefault.toString())
    ) {
      return true;
    }

    // 注释不同（如果不忽略注释）
    if (
      !this.options.ignoreComment &&
      dbColumn.comment !== modelColumn.comment
    ) {
      return true;
    }

    return false;
  }

  /**
   * 在数据库字段列表中查找指定名称的字段
   * @param columns 数据库字段列表
   * @param name 字段名
   * @returns 找到的字段或undefined
   */
  private findColumn(
    columns: ColumnInfo[],
    name: string
  ): ColumnInfo | undefined {
    if (this.options.ignoreCase) {
      return columns.find((c) => c.name.toLowerCase() === name.toLowerCase());
    }
    return columns.find((c) => c.name === name);
  }

  /**
   * 查找匹配的索引
   * @param dbIndexes 数据库索引列表
   * @param modelIndex 模型索引定义
   * @returns 找到的索引或undefined
   */
  private findIndex(
    dbIndexes: IndexInfo[],
    modelIndex: any
  ): IndexInfo | undefined {
    // 先按名称匹配
    const byName = dbIndexes.find((idx) => idx.name === modelIndex.name);
    if (byName) return byName;

    // 按字段匹配
    return dbIndexes.find((idx) => {
      if (idx.columns.length !== modelIndex.columns.length) return false;

      // 确保所有字段都匹配
      return modelIndex.columns.every((col: string) =>
        idx.columns.includes(this.options.ignoreCase ? col.toLowerCase() : col)
      );
    });
  }

  /**
   * 查找匹配数据库索引的模型索引
   * @param modelIndexes 模型索引列表
   * @param dbIndex 数据库索引
   * @returns 找到的模型索引或undefined
   */
  private findModelIndex(
    modelIndexes: any[],
    dbIndex: IndexInfo
  ): any | undefined {
    // 先按名称匹配
    const byName = modelIndexes.find((idx) => idx.name === dbIndex.name);
    if (byName) return byName;

    // 按字段匹配
    return modelIndexes.find((idx) => {
      if (idx.columns.length !== dbIndex.columns.length) return false;

      // 确保所有字段都匹配
      return dbIndex.columns.every((col: string) =>
        idx.columns.includes(this.options.ignoreCase ? col.toLowerCase() : col)
      );
    });
  }

  /**
   * 检查是否为系统字段
   * @param columnName 字段名
   * @returns 是否为系统字段
   */
  private isSystemColumn(columnName: string): boolean {
    const systemColumns = ['id', 'created_at', 'updated_at'];
    return systemColumns.includes(columnName);
  }

  /**
   * 标准化字段类型
   * @param type 字段类型
   * @returns 标准化后的类型
   */
  private normalizeType(type: string): string {
    type = type.toLowerCase();

    // 移除长度信息
    type = type.replace(/\(\d+\)/, '');

    // 标准化常见类型
    const typeMap: { [key: string]: string } = {
      varchar: 'string',
      char: 'string',
      text: 'text',
      int: 'integer',
      integer: 'integer',
      tinyint: 'boolean',
      smallint: 'integer',
      mediumint: 'integer',
      bigint: 'bigInteger',
      float: 'float',
      double: 'double',
      decimal: 'decimal',
      datetime: 'datetime',
      timestamp: 'timestamp',
      date: 'date',
      time: 'time',
      blob: 'binary',
      json: 'json',
      jsonb: 'jsonb'
    };

    return typeMap[type] || type;
  }

  /**
   * 从差异生成迁移内容
   *
   * @param diffs 差异列表
   * @returns 迁移内容
   */
  public generateMigrationFromDiff(diffs: SchemaDiff[]): string {
    // 按表分组
    const tableGroups = this.groupDiffsByTable(diffs);

    // 生成迁移内容
    let upContent = '';
    let downContent = '';

    for (const [tableName, tableDiffs] of Object.entries(tableGroups)) {
      // 检查是否有添加表操作
      const hasAddTable = tableDiffs.some(
        (diff) => diff.type === DiffType.AddTable
      );

      if (hasAddTable) {
        // 生成创建表的代码
        upContent += this.generateCreateTableCode(tableName, tableDiffs);
        // 生成删除表的代码
        downContent += `  await knex.schema.dropTableIfExists('${tableName}');\n\n`;
      } else {
        // 生成修改表的代码
        upContent += this.generateAlterTableCode(tableName, tableDiffs);
        // 生成回滚修改的代码
        downContent += this.generateReverseAlterTableCode(
          tableName,
          tableDiffs
        );
      }
    }

    return `/**
 * 自动生成的迁移文件
 */

/**
 * @param {import('knex')} knex
 * @returns {Promise}
 */
exports.up = async function(knex) {
${upContent}};

/**
 * @param {import('knex')} knex
 * @returns {Promise}
 */
exports.down = async function(knex) {
${downContent}};
`;
  }

  /**
   * 按表分组差异
   *
   * @param diffs 差异列表
   * @returns 按表分组的差异
   */
  private groupDiffsByTable(diffs: SchemaDiff[]): Record<string, SchemaDiff[]> {
    const groups: Record<string, SchemaDiff[]> = {};

    for (const diff of diffs) {
      if (!groups[diff.table]) {
        groups[diff.table] = [];
      }

      groups[diff.table].push(diff);
    }

    return groups;
  }

  /**
   * 生成创建表的代码
   *
   * @param tableName 表名
   * @param diffs 差异列表
   * @returns 创建表的代码
   */
  private generateCreateTableCode(
    tableName: string,
    diffs: SchemaDiff[]
  ): string {
    // 获取所有列差异
    const columnDiffs = diffs.filter(
      (diff) => diff.type === DiffType.AddColumn
    );

    // 获取所有外键差异
    const foreignKeyDiffs = diffs.filter(
      (diff) => diff.type === DiffType.AddForeignKey
    );

    let code = `  await knex.schema.createTable('${tableName}', function(table) {\n`;

    // 添加列
    for (const diff of columnDiffs) {
      if (!diff.column || !diff.field) continue;

      const columnCode = this.generateColumnDefinition(diff.column, diff.field);
      code += `    ${columnCode}\n`;
    }

    // 添加外键
    for (const diff of foreignKeyDiffs) {
      if (!diff.foreignKey) continue;

      const fk = diff.foreignKey;
      code += `    table.foreign('${fk.column}').references('${fk.referenceColumn}').inTable('${fk.referenceTable}')`;

      if (fk.onDelete) {
        code += `.onDelete('${fk.onDelete}')`;
      }

      if (fk.onUpdate) {
        code += `.onUpdate('${fk.onUpdate}')`;
      }

      code += `;\n`;
    }

    code += `  });\n\n`;

    return code;
  }

  /**
   * 生成修改表的代码
   *
   * @param tableName 表名
   * @param diffs 差异列表
   * @returns 修改表的代码
   */
  private generateAlterTableCode(
    tableName: string,
    diffs: SchemaDiff[]
  ): string {
    let code = `  await knex.schema.alterTable('${tableName}', function(table) {\n`;
    let hasChanges = false;

    // 添加列
    const addColumnDiffs = diffs.filter(
      (diff) => diff.type === DiffType.AddColumn
    );
    for (const diff of addColumnDiffs) {
      if (!diff.column || !diff.field) continue;

      const columnCode = this.generateColumnDefinition(diff.column, diff.field);
      code += `    ${columnCode}\n`;
      hasChanges = true;
    }

    // 修改列
    const changeColumnDiffs = diffs.filter(
      (diff) => diff.type === DiffType.ChangeColumn
    );
    for (const diff of changeColumnDiffs) {
      if (!diff.column || !diff.field) continue;

      const columnCode = this.generateColumnDefinition(
        diff.column,
        diff.field,
        true
      );
      code += `    ${columnCode}\n`;
      hasChanges = true;
    }

    // 删除列
    const dropColumnDiffs = diffs.filter(
      (diff) => diff.type === DiffType.DropColumn
    );
    for (const diff of dropColumnDiffs) {
      if (!diff.column) continue;

      code += `    table.dropColumn('${diff.column}');\n`;
      hasChanges = true;
    }

    // 添加外键
    const addForeignKeyDiffs = diffs.filter(
      (diff) => diff.type === DiffType.AddForeignKey
    );
    for (const diff of addForeignKeyDiffs) {
      if (!diff.foreignKey) continue;

      const fk = diff.foreignKey;
      code += `    table.foreign('${fk.column}').references('${fk.referenceColumn}').inTable('${fk.referenceTable}')`;

      if (fk.onDelete) {
        code += `.onDelete('${fk.onDelete}')`;
      }

      if (fk.onUpdate) {
        code += `.onUpdate('${fk.onUpdate}')`;
      }

      code += `;\n`;
      hasChanges = true;
    }

    // 删除外键
    const dropForeignKeyDiffs = diffs.filter(
      (diff) => diff.type === DiffType.DropForeignKey
    );
    for (const diff of dropForeignKeyDiffs) {
      if (!diff.foreignKey) continue;

      code += `    table.dropForeign(['${diff.foreignKey.column}']);\n`;
      hasChanges = true;
    }

    code += `  });\n\n`;

    return hasChanges ? code : '';
  }

  /**
   * 生成回滚修改表的代码
   *
   * @param tableName 表名
   * @param diffs 差异列表
   * @returns 回滚修改表的代码
   */
  private generateReverseAlterTableCode(
    tableName: string,
    diffs: SchemaDiff[]
  ): string {
    let code = `  await knex.schema.alterTable('${tableName}', function(table) {\n`;
    let hasChanges = false;

    // 添加列 -> 删除列
    const addColumnDiffs = diffs.filter(
      (diff) => diff.type === DiffType.AddColumn
    );
    for (const diff of addColumnDiffs) {
      if (!diff.column) continue;

      code += `    table.dropColumn('${diff.column}');\n`;
      hasChanges = true;
    }

    // 修改列 -> 无法回滚，不处理

    // 删除列 -> 添加列（但无法准确恢复）
    // 这里我们不处理，因为无法准确地恢复列定义

    // 添加外键 -> 删除外键
    const addForeignKeyDiffs = diffs.filter(
      (diff) => diff.type === DiffType.AddForeignKey
    );
    for (const diff of addForeignKeyDiffs) {
      if (!diff.foreignKey) continue;

      code += `    table.dropForeign(['${diff.foreignKey.column}']);\n`;
      hasChanges = true;
    }

    // 删除外键 -> 添加外键
    const dropForeignKeyDiffs = diffs.filter(
      (diff) => diff.type === DiffType.DropForeignKey
    );
    for (const diff of dropForeignKeyDiffs) {
      if (!diff.foreignKey) continue;

      const fk = diff.foreignKey;
      code += `    table.foreign('${fk.column}').references('${fk.referenceColumn}').inTable('${fk.referenceTable}')`;

      if (fk.onDelete) {
        code += `.onDelete('${fk.onDelete}')`;
      }

      if (fk.onUpdate) {
        code += `.onUpdate('${fk.onUpdate}')`;
      }

      code += `;\n`;
      hasChanges = true;
    }

    code += `  });\n\n`;

    return hasChanges ? code : '';
  }

  /**
   * 生成列定义代码
   *
   * @param columnName 列名
   * @param field 字段定义
   * @param isAlter 是否是修改列
   * @returns 列定义代码
   */
  private generateColumnDefinition(
    columnName: string,
    field: FieldOptions,
    isAlter: boolean = false
  ): string {
    let code = '';

    switch (field.type) {
      case FieldType.Increments:
        code = `table.increments('${columnName}')`;
        break;
      case FieldType.Integer:
        code = `table.integer('${columnName}')`;
        break;
      case FieldType.BigInteger:
        code = `table.bigInteger('${columnName}')`;
        break;
      case FieldType.TinyInteger:
        code = `table.tinyint('${columnName}')`;
        break;
      case FieldType.String:
        code = `table.string('${columnName}'${field.length ? `, ${field.length}` : ''})`;
        break;
      case FieldType.Text:
        code = `table.text('${columnName}')`;
        break;
      case FieldType.Decimal:
        code = `table.decimal('${columnName}'${field.precision ? `, ${field.precision}` : ''}${field.scale ? `, ${field.scale}` : ''})`;
        break;
      case FieldType.Float:
        code = `table.float('${columnName}'${field.precision ? `, ${field.precision}` : ''}${field.scale ? `, ${field.scale}` : ''})`;
        break;
      case FieldType.Boolean:
        code = `table.boolean('${columnName}')`;
        break;
      case FieldType.Date:
        code = `table.date('${columnName}')`;
        break;
      case FieldType.DateTime:
        code = `table.datetime('${columnName}')`;
        break;
      case FieldType.Time:
        code = `table.time('${columnName}')`;
        break;
      case FieldType.Timestamp:
        code = `table.timestamp('${columnName}')`;
        break;
      case FieldType.Binary:
        code = `table.binary('${columnName}')`;
        break;
      case FieldType.Enum:
        code = `table.enum('${columnName}', ${JSON.stringify(field.values || [])})`;
        break;
      case FieldType.Json:
        code = `table.json('${columnName}')`;
        break;
      case FieldType.JsonB:
        code = `table.jsonb('${columnName}')`;
        break;
      case FieldType.Uuid:
        code = `table.uuid('${columnName}')`;
        break;
      default:
        code = `table.string('${columnName}')`;
    }

    // 添加修改器
    if (isAlter) {
      code = code.replace(`table.`, `table.modify`);
    }

    if (field.unsigned) {
      code += `.unsigned()`;
    }

    if (field.nullable === false) {
      code += `.notNullable()`;
    } else {
      code += `.nullable()`;
    }

    if (field.default !== undefined || field.defaultValue !== undefined) {
      const defaultValue =
        field.default !== undefined ? field.default : field.defaultValue;

      if (typeof defaultValue === 'string') {
        code += `.defaultTo('${defaultValue}')`;
      } else if (typeof defaultValue === 'function') {
        code += `.defaultTo(knex.fn.now())`;
      } else if (defaultValue !== null) {
        code += `.defaultTo(${defaultValue})`;
      }
    }

    if (field.primary) {
      code += `.primary()`;
    }

    if (field.unique) {
      code += `.unique()`;
    }

    if (field.index) {
      code += `.index(${typeof field.index === 'string' ? `'${field.index}'` : ''})`;
    }

    return code + `;`;
  }

  /**
   * 检查表是否存在
   *
   * @param tableName 表名
   * @returns 是否存在
   */
  private async checkTableExists(tableName: string): Promise<boolean> {
    const exists = await this.knex.schema.hasTable(tableName);
    return exists;
  }

  /**
   * 获取表的列信息
   *
   * @param tableName 表名
   * @returns 列信息
   */
  private async getTableColumns(
    tableName: string
  ): Promise<Record<string, any>> {
    const columns: Record<string, any> = {};

    const columnInfo = await this.knex(tableName).columnInfo();

    for (const [columnName, info] of Object.entries(columnInfo)) {
      columns[columnName] = info;
    }

    return columns;
  }

  /**
   * 比较外键
   *
   * @param modelClass 模型类
   * @param tableName 表名
   * @returns 差异列表
   */
  private async compareForeignKeys(
    modelClass: ModelStatic,
    tableName: string
  ): Promise<SchemaDiff[]> {
    const diffs: SchemaDiff[] = [];

    // 获取表的外键信息
    const foreignKeys = await this.getTableForeignKeys(tableName);

    // 如果模型没有关系定义，返回空数组
    if (!modelClass.relations) {
      return diffs;
    }

    // 遍历模型的关系定义，检查是否需要添加外键
    for (const [relationName, relation] of Object.entries(
      modelClass.relations as Record<string, RelationDefinition>
    )) {
      if (relation.type === 'belongsTo' && relation.foreignKey) {
        const referenceTable =
          typeof relation.model === 'string'
            ? relation.model
            : relation.model.tableName;

        const referenceColumn = relation.localKey || 'id';

        // 检查外键是否存在
        const existingForeignKey = foreignKeys.find(
          (fk) =>
            fk.column === relation.foreignKey &&
            fk.referenceTable === referenceTable &&
            fk.referenceColumn === referenceColumn
        );

        if (!existingForeignKey) {
          // 外键不存在，需要添加
          diffs.push({
            type: DiffType.AddForeignKey,
            table: tableName,
            foreignKey: {
              column: relation.foreignKey,
              referenceTable,
              referenceColumn,
              onDelete: relation.onDelete as string | undefined,
              onUpdate: relation.onUpdate as string | undefined
            }
          });
        }
      }
    }

    // 遍历数据库的外键，检查是否需要删除
    for (const fk of foreignKeys) {
      // 检查外键是否在模型关系定义中
      const matchingRelation = Object.values(modelClass.relations || {}).find(
        (relation: RelationDefinition) =>
          relation.type === 'belongsTo' &&
          relation.foreignKey === fk.column &&
          ((typeof relation.model === 'string' &&
            relation.model === fk.referenceTable) ||
            (typeof relation.model !== 'string' &&
              relation.model.tableName === fk.referenceTable)) &&
          (relation.localKey || 'id') === fk.referenceColumn
      );

      if (!matchingRelation) {
        // 外键存在于数据库但不在模型定义中，需要删除
        diffs.push({
          type: DiffType.DropForeignKey,
          table: tableName,
          foreignKey: fk
        });
      }
    }

    return diffs;
  }

  /**
   * 获取表的外键信息
   *
   * @param tableName 表名
   * @returns 外键信息
   */
  private async getTableForeignKeys(tableName: string): Promise<
    Array<{
      column: string;
      referenceTable: string;
      referenceColumn: string;
      onDelete?: string;
      onUpdate?: string;
    }>
  > {
    // 不同数据库引擎获取外键信息的方式不同
    // 这里是一个简化的实现，实际应用中需要根据具体的数据库引擎调整

    // 对于PostgreSQL
    if (this.knex.client.config.client === 'pg') {
      const result = await this.knex.raw(
        `
        SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS reference_table,
          ccu.column_name AS reference_column,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = ?
      `,
        [tableName]
      );

      return result.rows.map((row: any) => ({
        column: row.column_name,
        referenceTable: row.reference_table,
        referenceColumn: row.reference_column,
        onUpdate: row.update_rule,
        onDelete: row.delete_rule
      }));
    }

    // 对于MySQL
    if (
      this.knex.client.config.client === 'mysql' ||
      this.knex.client.config.client === 'mysql2'
    ) {
      const result = await this.knex.raw(
        `
        SELECT
          COLUMN_NAME as column_name,
          REFERENCED_TABLE_NAME as reference_table,
          REFERENCED_COLUMN_NAME as reference_column
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `,
        [tableName]
      );

      return result[0].map((row: any) => ({
        column: row.column_name,
        referenceTable: row.reference_table,
        referenceColumn: row.reference_column
      }));
    }

    // 对于SQLite，没有直接的方式获取外键信息
    if (this.knex.client.config.client === 'sqlite3') {
      const result = await this.knex.raw(`PRAGMA foreign_key_list(?)`, [
        tableName
      ]);

      return result.map((row: any) => ({
        column: row.from,
        referenceTable: row.table,
        referenceColumn: row.to,
        onUpdate: row.on_update,
        onDelete: row.on_delete
      }));
    }

    return [];
  }
}
