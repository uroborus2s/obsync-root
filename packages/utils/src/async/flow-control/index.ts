/**
 * 异步流程控制模块，提供异步流程管理的工具函数
 *
 * 此模块提供了用于管理异步流程的实用工具，包括串行执行、
 * 队列控制等功能，帮助简化复杂异步操作的流程管理。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 流程控制
 *
 * @example
 * ```typescript
 * import { waterfall, queue } from '@stratix/utils/async/flow-control';
 *
 * // 串行执行异步任务，每个任务使用前一个任务的结果
 * const result = await waterfall([
 *   async () => fetchUserData(userId),
 *   async (userData) => fetchUserPosts(userData.id),
 *   async (posts) => processPostsData(posts)
 * ]);
 *
 * // 创建控制并发的任务队列
 * const taskQueue = queue(async (url) => {
 *   const response = await fetch(url);
 *   return response.json();
 * }, 3); // 最多同时执行3个请求
 *
 * // 添加任务到队列
 * const results = await Promise.all([
 *   taskQueue.push('https://api.example.com/users'),
 *   taskQueue.push('https://api.example.com/posts'),
 *   taskQueue.push('https://api.example.com/comments'),
 *   taskQueue.push('https://api.example.com/todos')
 * ]);
 * ```
 *
 * @packageDocumentation
 */

export { queue, type Queue } from './queue.js';
export { waterfall } from './waterfall.js';
