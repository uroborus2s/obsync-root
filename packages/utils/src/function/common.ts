/**
 * 函数工具基础函数
 */

/**
 * 创建一个预设了部分参数的函数
 * @param func 要预设参数的函数
 * @param partials 预设的参数
 * @returns 包装后的函数
 */
export function partial<T extends (...args: any[]) => any>(
  func: T,
  ...partials: any[]
): (...args: any[]) => ReturnType<T> {
  return function (...args: any[]): ReturnType<T> {
    return func(...partials, ...args);
  };
}

/**
 * 创建一个结果取反的函数
 * @param func 要取反的函数
 * @returns 取反后的函数
 */
export function negate<T extends (...args: any[]) => boolean>(
  func: T
): (...args: Parameters<T>) => boolean {
  return function (...args: Parameters<T>): boolean {
    return !func(...args);
  };
}

/**
 * 延迟一定时间后调用函数
 * @param func 要延迟的函数
 * @param wait 延迟时间（毫秒）
 * @param args 调用函数的参数
 * @returns 定时器ID
 */
export function delay<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  ...args: Parameters<T>
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    func(...args);
  }, wait);
}

/**
 * 推迟到当前调用栈清空后执行函数
 * @param func 要推迟的函数
 * @param args 调用函数的参数
 * @returns 定时器ID
 */
export function defer<T extends (...args: any[]) => any>(
  func: T,
  ...args: Parameters<T>
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    func(...args);
  }, 0);
}

/**
 * 创建一个函数，在调用n次之后执行原函数
 * @param n 需要调用的次数
 * @param func 延迟执行的函数
 * @returns 包装后的函数
 */
export function after<T extends (...args: any[]) => any>(
  n: number,
  func: T
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let count = 0;
  let result: ReturnType<T>;

  return function (...args: Parameters<T>): ReturnType<T> | undefined {
    count += 1;
    if (count >= n) {
      if (count === n) {
        result = func(...args);
      }
      return result;
    }
    return undefined;
  };
}

/**
 * 创建一个函数，在调用n次之前执行原函数，之后返回最后一次调用的结果
 * @param n 限制的调用次数
 * @param func 要限制执行的函数
 * @returns 包装后的函数
 */
export function before<T extends (...args: any[]) => any>(
  n: number,
  func: T
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let count = 0;
  let result: ReturnType<T>;

  return function (...args: Parameters<T>): ReturnType<T> | undefined {
    if (count < n) {
      count += 1;
      result = func(...args);
    }
    return result;
  };
}

/**
 * 创建一个调用func的函数，该函数最多接受n个参数，忽略多余的参数
 * @param func 要限制参数的函数
 * @param n 允许的参数数量
 * @returns 包装后的函数
 */
export function ary<T extends (...args: any[]) => any>(
  func: T,
  n: number
): (...args: any[]) => ReturnType<T> {
  return function (...args: any[]): ReturnType<T> {
    return func(...args.slice(0, n));
  };
}

/**
 * 创建一个最多接受一个参数的函数，忽略多余的参数
 * @param func 要限制参数的函数
 * @returns 包装后的函数
 */
export function unary<T extends (...args: any[]) => any>(
  func: T
): (arg: any) => ReturnType<T> {
  return function (arg: any): ReturnType<T> {
    return func(arg);
  };
}

/**
 * 返回传入的第一个参数
 * @param value 任意值
 * @returns 输入的值
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * 返回undefined，无论传入什么参数
 * @returns undefined
 */
export function noop(): undefined {
  return undefined;
}
