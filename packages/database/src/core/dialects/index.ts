// @stratix/database 数据库方言导出入口
// 按需加载的数据库方言实现

import type { DatabaseType } from '../../types/index.js';
import { BaseDialect, DialectRegistry } from './base-dialect.js';

/**
 * 懒加载方言实例的缓存
 */
const dialectCache = new Map<DatabaseType, BaseDialect>();

/**
 * 按需创建并缓存方言实例
 */
export async function getDialect(type: DatabaseType): Promise<BaseDialect> {
  // 检查缓存
  if (dialectCache.has(type)) {
    return dialectCache.get(type)!;
  }

  // 按需动态导入方言实现
  let dialect: BaseDialect;

  switch (type) {
    case 'postgresql': {
      const { PostgreSQLDialect } = await import('./postgresql-dialect.js');
      dialect = new PostgreSQLDialect();
      break;
    }
    case 'mysql': {
      const { MySQLDialect } = await import('./mysql-dialect.js');
      dialect = new MySQLDialect();
      break;
    }
    case 'sqlite': {
      const { SQLiteDialect } = await import('./sqlite-dialect.js');
      dialect = new SQLiteDialect();
      break;
    }
    case 'mssql': {
      const { MSSQLDialect } = await import('./mssql-dialect.js');
      dialect = new MSSQLDialect();
      break;
    }
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }

  // 缓存实例
  dialectCache.set(type, dialect);

  // 注册到全局注册表
  DialectRegistry.register(dialect);

  return dialect;
}

/**
 * 获取所有支持的数据库类型
 */
export function getSupportedDatabaseTypes(): DatabaseType[] {
  return ['postgresql', 'mysql', 'sqlite', 'mssql'];
}

/**
 * 检查是否支持指定的数据库类型
 */
export function isSupportedDatabaseType(type: string): type is DatabaseType {
  return getSupportedDatabaseTypes().includes(type as DatabaseType);
}

/**
 * 清理方言缓存（主要用于测试）
 */
export function clearDialectCache(): void {
  dialectCache.clear();
  DialectRegistry.clear();
}

/**
 * 获取已加载的方言类型列表
 */
export function getLoadedDialectTypes(): DatabaseType[] {
  return Array.from(dialectCache.keys());
}

// 重新导出核心类型和注册表
export { BaseDialect, DialectRegistry } from './base-dialect.js';
