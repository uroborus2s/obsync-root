/**
 * Stratix工具库，提供各种常用工具函数
 *
 * 此库包含了丰富的工具函数集合，涵盖异步操作、集合操作、字符串处理、
 * 对象操作、类型转换、验证等多个领域。支持 Node.js 和浏览器环境。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 工具库
 *
 * @example
 * ```typescript
 * // 导入整个库
 * import * as utils from '@stratix/utils';
 * utils.string.camelCase('hello-world'); // 'helloWorld'
 *
 * // 导入特定模块
 * import { common, string } from '@stratix/utils';
 * common.deepClone({ a: 1 }); // { a: 1 }
 *
 * // 直接导入特定模块
 * import { deepClone } from '@stratix/utils/common';
 * deepClone({ a: 1 }); // { a: 1 }
 * ```
 *
 * @packageDocumentation
 */

// 按照功能领域导出所有工具函数
export * from './async/index.js';
export * from './common/index.js';
export * from './context/index.js';
export * as crypto from './crypto/index.js';
export * from './data/index.js';
export * from './environment/index.js';
export * from './number/index.js';
export * from './performance/index.js';
export * from './string/index.js';
export * from './time/index.js';
