/**
 * @stratix/database 包主入口
 * 提供数据库功能的核心组件
 */

// 导出插件定义
export { createDatabasePlugin, default as databasePlugin } from './plugin.js';

// 导出类型
export * from './types/index.js';

// 导出工厂函数
export { createDatabaseAPI } from './api/factory.js';
