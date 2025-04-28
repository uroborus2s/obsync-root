/**
 * @stratix/cache 包主入口
 * 提供缓存功能的核心组件
 */

// 导出插件定义
export { default as cachePlugin, createCachePlugin } from './plugin.js';

// 导出类型定义
export * from './types/index.js';

// 导出API
export * from './api/index.js';

// 导出驱动
export * from './drivers/index.js';

// 导出工具
export * from './utils/index.js';

// 导出序列化器
export * from './serializers/index.js';

// 默认导出插件
export { default } from './plugin.js';
