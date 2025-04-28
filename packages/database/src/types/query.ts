/**
 * @stratix/database 查询类型定义
 */

import { Knex } from 'knex';
import { PaginationResult } from './database.js';

/**
 * 查询构建器接口
 */
export interface QueryBuilder<T = any> {
  /**
   * 选择字段
   * @param columns 列名
   */
  select(...columns: string[]): QueryBuilder<T>;

  /**
   * 添加WHERE条件
   * @param column 列名
   * @param operator 操作符
   * @param value 值
   */
  where(column: string, operator: any, value?: any): QueryBuilder<T>;

  /**
   * 添加OR WHERE条件
   * @param column 列名
   * @param operator 操作符
   * @param value 值
   */
  orWhere(column: string, operator: any, value?: any): QueryBuilder<T>;

  /**
   * 添加WHERE IN条件
   * @param column 列名
   * @param values 值数组
   */
  whereIn(column: string, values: any[]): QueryBuilder<T>;

  /**
   * 添加WHERE NULL条件
   * @param column 列名
   */
  whereNull(column: string): QueryBuilder<T>;

  /**
   * 添加WHERE NOT NULL条件
   * @param column 列名
   */
  whereNotNull(column: string): QueryBuilder<T>;

  /**
   * 添加排序规则
   * @param column 列名
   * @param direction 排序方向
   */
  orderBy(column: string, direction?: 'asc' | 'desc'): QueryBuilder<T>;

  /**
   * 添加分组规则
   * @param columns 列名
   */
  groupBy(...columns: string[]): QueryBuilder<T>;

  /**
   * 限制结果数量
   * @param value 数量
   */
  limit(value: number): QueryBuilder<T>;

  /**
   * 设置结果偏移量
   * @param value 偏移量
   */
  offset(value: number): QueryBuilder<T>;

  /**
   * 获取记录数量
   * @param column 列名
   */
  count(column?: string): Promise<number>;

  /**
   * 获取最大值
   * @param column 列名
   */
  max(column: string): Promise<any>;

  /**
   * 获取最小值
   * @param column 列名
   */
  min(column: string): Promise<any>;

  /**
   * 获取合计值
   * @param column 列名
   */
  sum(column: string): Promise<number>;

  /**
   * 获取平均值
   * @param column 列名
   */
  avg(column: string): Promise<number>;

  /**
   * 预加载关系
   * @param relation 关系名称
   * @param callback 回调函数
   */
  with(relation: string, callback?: Function): QueryBuilder<T>;

  /**
   * 包含软删除的记录
   */
  withTrashed(): QueryBuilder<T>;

  /**
   * 只查询软删除的记录
   */
  onlyTrashed(): QueryBuilder<T>;

  /**
   * 插入记录
   * @param data 数据对象
   */
  insert(data: Record<string, any>): Promise<number[]>;

  /**
   * 更新记录
   * @param data 数据对象
   */
  update(data: Record<string, any>): Promise<number>;

  /**
   * 删除记录
   */
  delete(): Promise<number>;

  /**
   * 分页查询
   * @param page 页码
   * @param perPage 每页记录数
   */
  paginate(page: number, perPage?: number): Promise<PaginationResult<T>>;

  /**
   * 获取第一条记录
   */
  first(): Promise<T | null>;

  /**
   * 执行查询并获取结果
   */
  get(): Promise<T[]>;

  /**
   * 获取原始查询构建器
   */
  getKnexQuery(): Knex.QueryBuilder;
}
