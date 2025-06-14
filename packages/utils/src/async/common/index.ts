/**
 * 异步通用工具模块，提供异步操作通用的基础工具函数
 *
 * 此模块提供了在异步编程中常用的基础工具函数，如延迟函数等，
 * 可以被其他异步模块共享使用。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 异步工具
 *
 * @example
 * ```typescript
 * import { sleep } from '@stratix/utils/async/common';
 *
 * // 使用延迟函数
 * async function example() {
 *   console.log('开始');
 *   await sleep(1000); // 等待1秒
 *   console.log('1秒后');
 * }
 * ```
 *
 * @packageDocumentation
 */

export { sleep } from './sleep.js';
