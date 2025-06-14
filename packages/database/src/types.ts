import type { Kysely } from 'kysely';

/**
 * 数据库提供者接口
 */
export interface DatabaseProvider {
  /**
   * 根据名称获取数据库实例
   * @param name 数据库名称，如果不提供则返回默认数据库
   * @returns Kysely 数据库实例
   */
  getDatabase(name?: string): Kysely<any>;

  /**
   * 获取所有数据库实例
   * @returns 包含所有数据库实例的对象
   */
  getAllDatabases(): Record<string, Kysely<any>>;

  /**
   * 检查是否存在指定名称的数据库
   * @param name 数据库名称
   * @returns 是否存在
   */
  hasDatabase(name: string): boolean;

  /**
   * 获取所有数据库名称
   * @returns 数据库名称数组
   */
  getDatabaseNames(): string[];

  /**
   * 销毁所有数据库连接
   */
  destroy(): Promise<void>;
}
