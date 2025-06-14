/**
 * 配置模块索引
 */
export * from './config-helper.js';
export * from './env-config.js';
export * from './env-loader.js';
export * from './schema.js';

/**
 * 配置模块 - 负责加载和规范化配置
 *
 * 提供纯函数式的配置处理方式，对外暴露清晰一致的API
 */

export { loadAndNormalizeConfig } from './loader.js';
