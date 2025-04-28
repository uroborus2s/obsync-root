/**
 * 性能优化相关函数
 */

/**
 * 创建一个带有结果缓存的函数，避免重复计算
 * @param fn 要缓存结果的函数
 * @param resolver 自定义解析器函数（可选），用于生成缓存键
 * @returns 缓存优化后的函数
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = resolver
      ? resolver.apply(this, args)
      : args[0]?.toString() || 'default';

    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };

  return memoized as T;
}

/**
 * 节流函数配置选项接口
 */
export interface ThrottleOptions {
  leading?: boolean; // 是否在开始边界触发（默认为true）
  trailing?: boolean; // 是否在结束边界触发（默认为true）
}

/**
 * 创建一个节流函数，限制函数在一定时间内只能执行一次
 * @param fn 要节流的函数
 * @param wait 等待时间（毫秒）
 * @param options 配置选项（可选）
 * @returns 节流后的函数，附加了cancel方法用于取消待执行的调用
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: ThrottleOptions = {}
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;
  let result: any;
  let args: any[] = [];
  let context: any;

  const { leading = true, trailing = true } = options;

  function later() {
    previous = leading === false ? 0 : Date.now();
    timeout = null;
    result = fn.apply(context, args);
    context = args = null as any;
  }

  function throttled(this: any, ...newArgs: Parameters<T>): ReturnType<T> {
    const now = Date.now();
    context = this;
    args = newArgs;

    if (!previous && leading === false) {
      previous = now;
    }

    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = fn.apply(context, args);
      context = args = null as any;
    } else if (!timeout && trailing !== false) {
      timeout = setTimeout(later, remaining);
    }

    return result;
  }

  throttled.cancel = function () {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    previous = 0;
    context = args = null as any;
  };

  return throttled as unknown as T & { cancel: () => void };
}

/**
 * 防抖函数配置选项接口
 */
export interface DebounceOptions {
  leading?: boolean; // 是否在延迟开始前调用函数（默认为false）
  trailing?: boolean; // 是否在延迟结束后调用函数（默认为true）
  maxWait?: number; // 最大等待时间（毫秒），超过该时间必定执行
}

/**
 * 创建一个防抖函数的返回类型，包含原函数类型和额外的方法
 */
export type DebouncedFunction<T extends (...args: any[]) => any> = T & {
  cancel: () => void;
  flush: () => ReturnType<T>;
};

/**
 * 创建一个防抖函数，延迟执行函数直到一定时间后没有再次调用
 * @param fn 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @param options 配置选项（可选）
 * @returns 防抖后的函数，附加了cancel和flush方法
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number,
  options: DebounceOptions = {}
): DebouncedFunction<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let result: ReturnType<T>;

  const { leading = false, trailing = true, maxWait } = options;

  function invokeFunc(time: number) {
    const args = lastArgs!;
    const thisArg = lastThis;

    lastArgs = lastThis = null;
    lastInvokeTime = time;
    result = fn.apply(thisArg, args);
    return result;
  }

  function startTimer(pendingFunc: () => void, wait: number) {
    return setTimeout(pendingFunc, wait);
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function trailingEdge(time: number) {
    timeout = null;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }

    lastArgs = lastThis = null;
    return result;
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timeout = startTimer(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function timerExpired() {
    const time = Date.now();

    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }

    timeout = startTimer(timerExpired, remainingWait(time));
  }

  function debounced(this: any, ...args: Parameters<T>): ReturnType<T> {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(time);
      }

      if (maxWait !== undefined) {
        timeout = startTimer(timerExpired, wait);
        return invokeFunc(time);
      }
    }

    if (timeout === null) {
      timeout = startTimer(timerExpired, wait);
    }

    return result;
  }

  debounced.cancel = function () {
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timeout = null;
  };

  debounced.flush = function () {
    return timeout === null ? result : trailingEdge(Date.now());
  };

  return debounced as unknown as DebouncedFunction<T>;
}

/**
 * 使用requestAnimationFrame优化动画和视觉更新操作
 * @param callback 在下一次重绘之前调用的函数
 * @returns 一个对象，包含cancel方法用于取消请求
 */
export function rAF(callback: FrameRequestCallback): { cancel: () => void } {
  let rafId: number;

  // 检查环境是否支持requestAnimationFrame
  const requestAnimationFrame =
    typeof window !== 'undefined'
      ? window.requestAnimationFrame ||
        (window as any).webkitRequestAnimationFrame ||
        (window as any).mozRequestAnimationFrame
      : (callback: FrameRequestCallback) => setTimeout(callback, 16);

  const cancelAnimationFrame =
    typeof window !== 'undefined'
      ? window.cancelAnimationFrame ||
        (window as any).webkitCancelAnimationFrame ||
        (window as any).mozCancelAnimationFrame
      : clearTimeout;

  rafId = requestAnimationFrame(callback);

  return {
    cancel: () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    }
  };
}

/**
 * 将回调函数延迟到下一个事件循环周期执行
 * @param callback 要延迟执行的回调函数
 */
export function nextTick(callback: () => void): void {
  if (
    typeof process !== 'undefined' &&
    typeof process.nextTick === 'function'
  ) {
    // Node.js环境
    process.nextTick(callback);
  } else if (typeof Promise !== 'undefined') {
    // 现代浏览器
    Promise.resolve().then(callback);
  } else if (typeof setImmediate !== 'undefined') {
    // IE和Node.js
    setImmediate(callback);
  } else {
    // 降级方案
    setTimeout(callback, 0);
  }
}
