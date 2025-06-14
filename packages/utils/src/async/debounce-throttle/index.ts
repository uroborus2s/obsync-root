/**
 * 函数调用频率控制模块，提供防抖和节流相关的工具函数
 *
 * 此模块提供了用于控制函数调用频率的实用工具，防抖(debounce)
 * 和节流(throttle)适用于处理高频事件如滚动、调整大小、输入等。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数控制
 *
 * @example
 * ```typescript
 * import { debounce, throttle } from '@stratix/utils/async/debounce-throttle';
 *
 * // 使用防抖处理用户输入
 * const debouncedSearch = debounce(searchAPI, 300);
 * searchInput.addEventListener('input', e => debouncedSearch(e.target.value));
 *
 * // 使用节流处理滚动事件
 * const throttledScroll = throttle(updateScrollIndicator, 200);
 * window.addEventListener('scroll', throttledScroll);
 * ```
 *
 * @packageDocumentation
 */

export { debounce, type DebounceOptions } from './debounce.js';
export { throttle, type ThrottleOptions } from './throttle.js';
