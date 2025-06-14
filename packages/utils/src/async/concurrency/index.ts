/**
 * 并发控制模块，提供对异步操作的并发管理工具
 *
 * 此模块提供了用于控制异步操作并发执行的实用工具，
 * 帮助管理并发任务、限制并发数量，提高性能和资源利用率。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 并发控制
 *
 * @example
 * ```typescript
 * import { pMap, parallelLimit, limitConcurrency } from '@stratix/utils/async/concurrency';
 *
 * // 控制并发请求数量 - 使用pMap处理数组
 * const results = await pMap(
 *   urls,
 *   url => fetch(url).then(r => r.json()),
 *   { concurrency: 5 }
 * );
 *
 * // 并行执行多个异步函数，限制并发数
 * const [userResults, orderResults] = await parallelLimit(
 *   [fetchUsers, fetchOrders],
 *   2 // 最多同时执行2个
 * );
 *
 * // 限制任意异步函数的并发调用数
 * const fetchWithLimit = limitConcurrency(fetchData, 3);
 * const results = await Promise.all([
 *   fetchWithLimit('url1'),
 *   fetchWithLimit('url2'),
 *   fetchWithLimit('url3'),
 *   fetchWithLimit('url4') // 这个会等待前三个中的一个完成后才执行
 * ]);
 * ```
 *
 * @packageDocumentation
 */

export { limitConcurrency } from './limit-concurrency.js';
export { pMap, type PMapOptions } from './p-map.js';
export { parallelLimit } from './parallel-limit.js';
