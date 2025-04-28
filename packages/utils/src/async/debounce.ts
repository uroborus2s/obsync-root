/**
 * 防抖函数实现
 */

/**
 * 防抖选项接口
 */
export interface DebounceOptions {
  /** 是否在延迟开始前调用，默认为false */
  leading?: boolean;
  /** 是否在延迟结束后调用，默认为true */
  trailing?: boolean;
  /** 最大等待时间，默认为0（无限制） */
  maxWait?: number;
}

/**
 * 创建防抖函数
 *
 * @description 防抖函数会在指定的延迟时间后执行，如果在延迟时间内再次调用，则重新计时。
 *
 * @param func 需要防抖的函数
 * @param wait 延迟时间，单位毫秒
 * @param options 防抖选项
 * @returns 防抖后的函数，包含cancel方法用于取消等待的执行
 */
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  wait: number = 0,
  options: DebounceOptions = {}
): F & { cancel(): void } {
  const { leading = false, trailing = true } = options;

  let lastArgs: any[] | undefined;
  let lastThis: any;
  let maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
  let result: any;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;
  let isInvoked = false;

  // 确保wait是有效的数字
  const waitTime = Number(wait) || 0;
  // 确保maxWait是有效的数字
  const maxWaitTime = options.maxWait ? Number(options.maxWait) : 0;

  function invokeFunc(time: number): any {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    isInvoked = true;
    result = func.apply(thisArg, args as any[]);
    return result;
  }

  function startTimer(
    pendingFunc: () => any,
    delay: number
  ): ReturnType<typeof setTimeout> {
    return setTimeout(pendingFunc, delay);
  }

  function cancelTimer(timer: ReturnType<typeof setTimeout> | undefined): void {
    if (timer) {
      clearTimeout(timer);
    }
  }

  function shouldInvoke(time: number): boolean {
    if (!lastCallTime) return true;

    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    // 立即执行的情况
    return (
      timeSinceLastCall >= waitTime || // 已达到延迟时间
      timeSinceLastCall < 0 || // 系统时间被调整
      (maxWaitTime > 0 && timeSinceLastInvoke >= maxWaitTime) // 已达到最大等待时间
    );
  }

  function remainingWait(time: number): number {
    if (!lastCallTime) return 0;

    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = waitTime - timeSinceLastCall;

    // 如果设置了最大等待时间，则取最小值
    return maxWaitTime > 0
      ? Math.min(timeWaiting, maxWaitTime - timeSinceLastInvoke)
      : timeWaiting;
  }

  function trailingEdge(time: number): any {
    timerId = undefined;

    // 如果设置了trailing且有尚未处理的参数，则执行函数
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }

    lastArgs = lastThis = undefined;
    return result;
  }

  function leadingEdge(time: number): any {
    // 重置计时器
    lastInvokeTime = time;
    // 启动定时器等待trailing边缘的回调
    timerId = startTimer(() => trailingEdge(Date.now()), waitTime);
    // 如果设置了leading，则立即执行函数
    return leading ? invokeFunc(time) : result;
  }

  function timerExpired(): any {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // 如果还不应该执行，重新启动定时器等待剩余时间
    timerId = startTimer(timerExpired, remainingWait(time));
    return undefined;
  }

  function maxDelayTimeout(): void {
    timerId = undefined;
    // 只有在debounced函数至少调用过一次时才调用
    if (lastCallTime && lastArgs) {
      invokeFunc(Date.now());
    }
    maxWaitTimer = undefined;
  }

  function cancel(): void {
    if (timerId !== undefined) {
      cancelTimer(timerId);
    }
    if (maxWaitTimer !== undefined) {
      cancelTimer(maxWaitTimer);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = maxWaitTimer = undefined;
    isInvoked = false;
  }

  function flush(): any {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }

  function pending(): boolean {
    return timerId !== undefined;
  }

  function debounced(this: any, ...args: any[]): any {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }

      // 如果设置了最大等待时间，确保函数不会在超过最大等待时间后才执行
      if (maxWaitTime > 0 && !maxWaitTimer) {
        maxWaitTimer = startTimer(maxDelayTimeout, maxWaitTime);
      }

      // 重新启动定时器
      cancelTimer(timerId);
      timerId = startTimer(timerExpired, waitTime);

      return result;
    }

    if (timerId === undefined) {
      timerId = startTimer(timerExpired, waitTime);
    }

    return result;
  }

  // 添加额外的方法
  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  // 使用类型断言确保返回类型正确
  return debounced as unknown as F & { cancel(): void };
}
