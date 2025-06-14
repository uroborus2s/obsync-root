export { wrapDatabasePlugin as default } from './plugin.js';

// 导出配置类型
export type {
  CacheConfig,
  DatabaseConfig,
  DatabaseConnectionConfig,
  ExtendedDatabaseConnectionConfig,
  PoolConfig,
  ReadWriteConfig
} from './config.js';

// 导出类型定义
export type { DatabaseProvider } from './types.js';

// 导出工厂类
export { DatabaseDialectFactory, KyselyFactory } from './factory.js';

export { sql } from 'kysely';
export type {
  ColumnType,
  Generated,
  Insertable,
  Kysely,
  Selectable,
  Updateable
} from 'kysely';
