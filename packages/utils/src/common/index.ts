/**
 * 通用工具函数模块，提供各种基础工具函数
 *
 * 包含常用的类型检查、验证、函数处理、ID生成等实用工具函数。
 * 所有函数都经过优化，确保在浏览器和Node.js环境中高效运行。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 通用工具
 *
 * @example
 * ```typescript
 * import { isString, isEmail, generateId } from '@stratix/utils/common';
 *
 * isString('test'); // true
 * isEmail('user@example.com'); // true
 * generateId(); // '8f7d1c9e-3b2a-4a5f-9d8c-7b6e5f4d3c2b'
 * ```
 *
 * @packageDocumentation
 */
// 导出其他模块的函数
export * as function from './function.js';
export * as ids from './id.js';
export * from './immutable.js';
export * as logger from './logger.js';
export * from './safe.js';
export * as type from './type.js';
export * as validator from './validator.js';
