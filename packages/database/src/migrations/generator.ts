/**
 * @stratix/database 迁移生成器模块
 */

import fs from 'fs';
import path from 'path';
import {
  FieldOptions,
  FieldType,
  ModelStatic,
  RelationType
} from '../types/index.js';

/**
 * 迁移生成器选项
 */
export interface MigrationGeneratorOptions {
  /**
   * 模型类
   */
  modelClass: ModelStatic;

  /**
   * 迁移文件目录
   */
  directory: string;

  /**
   * 迁移模板文件路径
   */
  templateFile?: string;

  /**
   * 表名前缀
   */
  tablePrefix?: string;

  /**
   * 是否强制重新生成（即使表已存在）
   */
  force?: boolean;
}

/**
 * 迁移生成器类
 * 用于从模型自动生成迁移文件
 */
export class MigrationGenerator {
  /**
   * 从单个模型生成迁移文件
   *
   * @param options 生成选项
   * @returns 生成的迁移文件路径
   */
  public static async generateFromModel(
    options: MigrationGeneratorOptions
  ): Promise<string> {
    const { modelClass, directory, tablePrefix = '', force = false } = options;

    // 确保目录存在
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    // 获取模型表名
    const tableName = tablePrefix + modelClass.tableName;

    // 生成迁移文件名
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}_create_${tableName}_table.js`;
    const filePath = path.join(directory, fileName);

    // 生成迁移内容
    const migrationContent = await this.generateMigrationContent(
      modelClass,
      tableName,
      options.templateFile
    );

    // 写入文件
    fs.writeFileSync(filePath, migrationContent);

    return filePath;
  }

  /**
   * 从多个模型生成迁移文件
   *
   * @param models 模型类数组
   * @param directory 迁移文件目录
   * @param tablePrefix 表名前缀
   * @param force 是否强制重新生成
   * @returns 生成的迁移文件路径数组
   */
  public static async generateFromModels(
    models: ModelStatic[],
    directory: string,
    tablePrefix: string = '',
    force: boolean = false
  ): Promise<string[]> {
    const paths: string[] = [];

    for (const modelClass of models) {
      const filePath = await this.generateFromModel({
        modelClass,
        directory,
        tablePrefix,
        force
      });
      paths.push(filePath);
    }

    return paths;
  }

  /**
   * 生成迁移文件内容
   *
   * @param modelClass 模型类
   * @param tableName 表名
   * @param templateFile 模板文件路径
   * @returns 迁移文件内容
   */
  private static async generateMigrationContent(
    modelClass: ModelStatic,
    tableName: string,
    templateFile?: string
  ): Promise<string> {
    // 如果提供了自定义模板，使用自定义模板
    if (templateFile && fs.existsSync(templateFile)) {
      let template = fs.readFileSync(templateFile, 'utf8');

      // 替换模板变量
      template = template
        .replace(/\{\{tableName\}\}/g, tableName)
        .replace(
          /\{\{schemaDefinition\}\}/g,
          this.generateSchemaDefinition(modelClass)
        )
        .replace(/\{\{foreignKeys\}\}/g, this.generateForeignKeys(modelClass));

      return template;
    }

    // 否则使用默认模板
    return `/**
 * 自动生成的迁移文件: ${tableName}
 */

/**
 * @param {import('knex')} knex
 * @returns {Promise}
 */
exports.up = async function(knex) {
  return knex.schema.createTable('${tableName}', function(table) {
${this.generateSchemaDefinition(modelClass)}
${this.generateForeignKeys(modelClass)}
  });
};

/**
 * @param {import('knex')} knex
 * @returns {Promise}
 */
exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('${tableName}');
};
`;
  }

  /**
   * 生成数据库表结构定义
   *
   * @param modelClass 模型类
   * @returns 表结构定义代码
   */
  private static generateSchemaDefinition(modelClass: ModelStatic): string {
    const { fields, primaryKey = 'id' } = modelClass;
    const lines: string[] = [];

    for (const [fieldName, fieldOptions] of Object.entries(fields)) {
      const {
        type,
        length,
        nullable,
        defaultValue,
        unique,
        unsigned,
        precision,
        scale
      } = fieldOptions as FieldOptions;

      // 根据字段类型生成对应的列定义
      let line = `    `;

      switch (type) {
        case FieldType.Increments:
          line += `table.increments('${fieldName}')`;
          break;
        case FieldType.Integer:
          line += `table.integer('${fieldName}')`;
          break;
        case FieldType.BigInteger:
          line += `table.bigInteger('${fieldName}')`;
          break;
        case FieldType.TinyInteger:
          line += `table.tinyint('${fieldName}')`;
          break;
        case FieldType.String:
          line += `table.string('${fieldName}'${length ? `, ${length}` : ''})`;
          break;
        case FieldType.Text:
          line += `table.text('${fieldName}')`;
          break;
        case FieldType.Decimal:
          line += `table.decimal('${fieldName}'${precision ? `, ${precision}` : ''}${scale ? `, ${scale}` : ''})`;
          break;
        case FieldType.Float:
          line += `table.float('${fieldName}'${precision ? `, ${precision}` : ''}${scale ? `, ${scale}` : ''})`;
          break;
        case FieldType.Boolean:
          line += `table.boolean('${fieldName}')`;
          break;
        case FieldType.Date:
          line += `table.date('${fieldName}')`;
          break;
        case FieldType.DateTime:
          line += `table.datetime('${fieldName}')`;
          break;
        case FieldType.Time:
          line += `table.time('${fieldName}')`;
          break;
        case FieldType.Timestamp:
          line += `table.timestamp('${fieldName}')`;
          break;
        case FieldType.Binary:
          line += `table.binary('${fieldName}')`;
          break;
        case FieldType.Enum:
          line += `table.enum('${fieldName}', ${JSON.stringify((fieldOptions as FieldOptions).values || [])})`;
          break;
        case FieldType.Json:
          line += `table.json('${fieldName}')`;
          break;
        case FieldType.JsonB:
          line += `table.jsonb('${fieldName}')`;
          break;
        case FieldType.Uuid:
          line += `table.uuid('${fieldName}')`;
          break;
        default:
          line += `table.string('${fieldName}')`;
      }

      // 添加约束
      if (fieldName === primaryKey && !type.toString().includes('increments')) {
        line += `.primary()`;
      }

      if (unsigned) {
        line += `.unsigned()`;
      }

      if (nullable === false) {
        line += `.notNullable()`;
      }

      if (defaultValue !== undefined) {
        if (typeof defaultValue === 'string') {
          line += `.defaultTo('${defaultValue}')`;
        } else if (typeof defaultValue === 'function') {
          line += `.defaultTo(knex.fn.now())`;
        } else {
          line += `.defaultTo(${defaultValue})`;
        }
      }

      if (unique) {
        line += `.unique()`;
      }

      line += `;`;
      lines.push(line);
    }

    // 添加时间戳列
    if (modelClass.timestamps) {
      if (!(modelClass.createdAtColumn in fields)) {
        lines.push(
          `    table.timestamp('${modelClass.createdAtColumn}').nullable();`
        );
      }

      if (!(modelClass.updatedAtColumn in fields)) {
        lines.push(
          `    table.timestamp('${modelClass.updatedAtColumn}').nullable();`
        );
      }
    }

    // 添加软删除列
    if (modelClass.softDeletes && !(modelClass.deletedAtColumn in fields)) {
      lines.push(
        `    table.timestamp('${modelClass.deletedAtColumn}').nullable();`
      );
    }

    return lines.join('\n');
  }

  /**
   * 生成外键约束
   *
   * @param modelClass 模型类
   * @returns 外键约束代码
   */
  private static generateForeignKeys(modelClass: ModelStatic): string {
    if (!modelClass.relations) {
      return '';
    }

    const lines: string[] = [];

    for (const [relationName, relation] of Object.entries(
      modelClass.relations
    )) {
      if (relation.type === RelationType.BelongsTo && relation.foreignKey) {
        const targetModel =
          typeof relation.model === 'string'
            ? relation.model
            : relation.model.tableName;

        const targetKey = relation.localKey || 'id';

        lines.push(
          `    table.foreign('${relation.foreignKey}').references('${targetKey}').inTable('${targetModel}').onDelete('${relation.onDelete || 'NO ACTION'}').onUpdate('${relation.onUpdate || 'NO ACTION'}');`
        );
      }
    }

    return lines.join('\n');
  }
}
