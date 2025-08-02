// @stratix/database 类型定义统一导出
// 导出所有类型定义，提供统一的类型访问入口

// 通用类型
export * from './common.js';

// 配置类型
export * from './configuration.js';

// 数据库管理类型
export * from './database.js';

// 仓储类型
export * from './repository.js';

// Kysely 重新导出常用类型
export type {
  CompiledQuery,
  DeleteResult,
  Expression,
  ExpressionBuilder,
  Insertable,
  InsertResult,
  Kysely,
  QueryResult,
  RawBuilder,
  Selectable,
  sql,
  SqlBool,
  Transaction,
  Updateable,
  UpdateResult
} from 'kysely';

// 基础工具类型 - 只保留必要的类型
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 基础函数类型
export type AsyncFunction<T extends any[], R> = (...args: T) => Promise<R>;
