/**
 * @remarks
 * 模块: 
 *
 * 性能优化相关函数，提供优化代码执行性能的工具
 *
 * 此模块提供了用于优化代码执行性能的工具函数，包括帧动画优化和事件循环优化等。
 * 这些函数可以帮助减少不必要的计算和渲染，提高应用程序的响应性。
 *
 * @remarks
 * 版本: 1.0.0
 *
 * @example
 * ```typescript
 * import { rAF, nextTick } from '@stratix/utils/performance/optimize';
 *
 * // 使用requestAnimationFrame优化动画
 * const animation = rAF((timestamp) => {
 *   updateAnimationPosition(timestamp);
 *   renderFrame();
 * });
 *
 * // 推迟到下一个事件循环执行
 * nextTick(() => {
 *   processDeferredTask();
 * });
 * ```
 *
 * @packageDocumentation
 */

// 添加全局对象声明
declare const self: any | undefined;
declare const global: any | undefined;

/**
 * 使用requestAnimationFrame执行回调函数，并提供取消能力
 *
 * 此函数是对原生requestAnimationFrame的封装，增加了取消功能，适用于优化动画和视觉更新
 *
 * @param callback - 在下一个动画帧执行的回调函数
 * @returns 包含cancel方法的对象，用于取消请求
 * @remarks
 * 版本: 1.0.0
 * 分类: 动画优化
 *
 * @example
 * ```typescript
 * // 基本使用
 * const animation = rAF((timestamp) => {
 *   updateAnimationState(timestamp);
 *   render();
 * });
 *
 * // 取消动画帧请求
 * animation.cancel();
 * ```
 * @public
 */
export function rAF(callback: (timestamp: number) => void): {
  cancel: () => void;
} {
  // 简化实现，使用any类型避免类型错误
  // 声明全局对象和函数引用，使用类型断言处理不同环境
  const root: any =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof self !== 'undefined'
        ? self
        : typeof global !== 'undefined'
          ? global
          : {};

  const requestFrame =
    root.requestAnimationFrame ||
    root.webkitRequestAnimationFrame ||
    root.mozRequestAnimationFrame ||
    function (cb: any) {
      return setTimeout(() => cb(Date.now()), 16);
    };

  const cancelFrame =
    root.cancelAnimationFrame ||
    root.webkitCancelAnimationFrame ||
    root.mozCancelAnimationFrame ||
    clearTimeout;

  // 调用动画帧请求函数
  const id = requestFrame.call(root, callback);

  // 返回带有cancel方法的对象
  return {
    cancel: () => {
      cancelFrame.call(root, id);
    }
  };
}

/**
 * 将回调函数推迟到下一个事件循环周期执行
 *
 * 此函数是对平台特定延迟执行机制的封装，优先使用微任务（如Promise），然后是宏任务（如setTimeout）
 *
 * @param callback - 要延迟执行的回调函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 事件循环优化
 *
 * @example
 * ```typescript
 * // 基本使用
 * nextTick(() => {
 *   console.log('This runs after current execution context');
 * });
 * console.log('This runs first');
 *
 * // 在DOM更新后执行
 * updateDom();
 * nextTick(() => {
 *   measureUpdatedDom();
 * });
 * ```
 * @public
 */
export function nextTick(callback: () => void): void {
  // 优先使用Promise实现（微任务）
  if (typeof Promise !== 'undefined' && typeof Promise.resolve === 'function') {
    Promise.resolve().then(callback);
    return;
  }

  // 回退到setTimeout实现（宏任务）
  setTimeout(callback, 0);
}
