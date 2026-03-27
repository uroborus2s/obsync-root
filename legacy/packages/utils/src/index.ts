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

// 导出实际使用的模块
export * as async from './async/index.js';
export * as context from './context/index.js';
export * as data from './data/index.js';
export * as environment from './environment/index.js';

// 导出函数式编程工具
export * as functional from './functional/index.js';

export * as auth from './auth/index.js';
