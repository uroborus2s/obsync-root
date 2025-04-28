/**
 * @stratix/database 查询缓存工具类
 */

import { createHash } from 'crypto';
import { Knex } from 'knex';
import { QueryOptions } from '../types/index.js';

/**
 * 查询缓存工具类
 * 提供查询缓存键生成和管理功能
 */
export class QueryCache {
  /**
   * 生成查询缓存键
   *
   * @param query Knex查询构建器
   * @param options 查询选项
   * @returns 缓存键
   */
  public static generateCacheKey(
    query: Knex.QueryBuilder,
    options?: QueryOptions
  ): string {
    // 获取查询SQL和绑定参数
    const { sql, bindings } = query.toSQL();

    // 创建包含查询信息的对象
    const queryData = {
      sql,
      bindings,
      connection: options?.connection || 'default'
    };

    // 转换为JSON字符串
    const queryString = JSON.stringify(queryData);

    // 使用SHA-256哈希生成缓存键
    return createHash('sha256').update(queryString).digest('hex');
  }

  /**
   * 生成模型查询缓存键
   *
   * @param modelName 模型名称
   * @param id 记录ID
   * @returns 缓存键
   */
  public static generateModelCacheKey(modelName: string, id: any): string {
    return `${modelName}:${id}`;
  }

  /**
   * 生成关系查询缓存键
   *
   * @param modelName 模型名称
   * @param id 记录ID
   * @param relationName 关系名称
   * @returns 缓存键
   */
  public static generateRelationCacheKey(
    modelName: string,
    id: any,
    relationName: string
  ): string {
    return `${modelName}:${id}:${relationName}`;
  }

  /**
   * 生成集合查询缓存键
   *
   * @param query Knex查询构建器
   * @param modelName 模型名称
   * @param options 查询选项
   * @returns 缓存键
   */
  public static generateCollectionCacheKey(
    query: Knex.QueryBuilder,
    modelName: string,
    options?: QueryOptions
  ): string {
    const queryKey = this.generateCacheKey(query, options);
    return `${modelName}:collection:${queryKey}`;
  }
}
