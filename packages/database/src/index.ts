/**
 * Stratix 数据库插件
 * 提供ORM功能、关系管理、事务支持和多数据库连接
 */

// 导出核心类
export { DatabaseManager } from './lib/database-manager.js';
export { Database } from './lib/database.js';
export { ModelRegistry } from './lib/model-registry.js';
export { QueryBuilder } from './lib/query-builder.js';

// 导出模型类
export { BaseModel } from './models/base-model.js';
export { SourceTrackableModel } from './models/source-trackable-model.js';

// 导出装饰器
export * from './decorators/index.js';

// 导出类型定义
export * from './types/index.js';

// 导出插件
import { databasePlugin } from './plugin.js';
export default databasePlugin;
