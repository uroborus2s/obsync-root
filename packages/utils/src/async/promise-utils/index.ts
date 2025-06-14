/**
 * Promise工具模块，提供Promise操作相关的工具函数
 *
 * 此模块提供了用于处理Promise的实用工具，包括超时控制、
 * Promise转换、回调转Promise、异步包装等功能。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: Promise工具
 *
 * @example
 * ```typescript
 * import { withTimeout, promisify } from '@stratix/utils/async/promise-utils';
 *
 * // 为异步操作添加超时
 * const result = await withTimeout(
 *   fetchData('https://api.example.com'),
 *   5000,
 *   '请求超时'
 * );
 *
 * // 将回调函数转换为Promise
 * import * as fs from 'fs';
 * const readFileAsync = promisify(fs.readFile);
 * const data = await readFileAsync('config.json', 'utf8');
 * ```
 *
 * @packageDocumentation
 */

// 将回调函数转换为Promise
export {
  promisify,
  promisifyAll,
  type PromisifiedObject
} from './promisify.js';

// 将同步函数转换为异步函数
export { asyncify } from './asyncify.js';

// 超时控制函数
export { timeout, withTimeout } from './timeout.js';
