/**
 * 节流函数实现
 */

/**
 * 节流选项接口
 */
export interface ThrottleOptions {
  /** 是否在节流开始前调用，默认为true */
  leading?: boolean;
  /** 是否在节流结束后调用，默认为true */
  trailing?: boolean;
}

/**
 * 创建节流函数
 *
 * @description 节流函数会限制函数的调用频率，确保函数在指定的时间间隔内最多执行一次。
 *
 * @param func 需要节流的函数
 * @param wait 延迟时间，单位毫秒
 * @param options 节流选项
 * @returns 节流后的函数，包含cancel方法用于取消等待的执行
 */
export function throttle<F extends (...args: any[]) => any>(
  func: F,
  wait: number = 0,
  options: ThrottleOptions = {}
): F & { cancel(): void } {
  const { leading = true, trailing = true } = options;

  let lastArgs: any[] | undefined;
  let lastThis: any;
  let result: any;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;

  // 确保wait是有效的数字
  const waitTime = Number(wait) || 0;

  function invokeFunc(time: number): any {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args as any[]);
    return result;
  }

  function shouldInvoke(time: number): boolean {
    // 首次调用
    if (lastCallTime === undefined) {
      return true;
    }

    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    // 特殊情况：
    // 1. 调用时间小于0，表示系统时间被调整
    // 2. 距离上次调用的时间超过了等待时间
    return (
      timeSinceLastCall < 0 ||
      timeSinceLastCall >= waitTime ||
      timeSinceLastInvoke >= waitTime
    );
  }

  function trailingEdge(time: number): any {
    timerId = undefined;

    // 只有在trailing=true且有最后一次调用参数时执行
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }

    lastArgs = lastThis = undefined;
    return result;
  }

  function timerExpired(): any {
    const time = Date.now();

    // 如果应该调用函数，且使用trailing edge，安排下一次调用
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }

    // 剩余等待时间
    const remaining = waitTime - (time - lastCallTime!);
    timerId = setTimeout(timerExpired, remaining);
    return undefined;
  }

  function leadingEdge(time: number): any {
    // 重置上次调用时间
    lastInvokeTime = time;

    // 如果使用trailing edge，为下一次trailing调用设置定时器
    if (trailing) {
      timerId = setTimeout(timerExpired, waitTime);
    }

    // 如果使用leading edge，执行函数
    return leading ? invokeFunc(time) : result;
  }

  function cancel(): void {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush(): any {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }

  function throttled(this: any, ...args: any[]): any {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      // 如果没有定时器，表示是leading或第一次调用
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }

      // 如果有定时器且使用leading，立即执行
      if (leading) {
        clearTimeout(timerId);
        timerId = setTimeout(timerExpired, waitTime);
        return invokeFunc(lastCallTime);
      }
    }

    // 如果没有定时器且使用trailing，为下一次trailing调用设置定时器
    if (timerId === undefined && trailing) {
      timerId = setTimeout(timerExpired, waitTime);
    }

    return result;
  }

  // 添加额外的方法
  throttled.cancel = cancel;
  throttled.flush = flush;

  // 使用类型断言确保返回类型正确
  return throttled as unknown as F & { cancel(): void };
}
