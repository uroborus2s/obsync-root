/**
 * 函数组合相关函数
 */

type AnyFn = (...args: any[]) => any;

/**
 * 从右到左组合函数
 * 例如：compose(f, g, h) 相当于 (...args) => f(g(h(...args)))
 *
 * @param fns 要组合的函数列表
 * @returns 组合后的函数
 */
export function compose<R>(...fns: AnyFn[]): AnyFn {
  if (fns.length === 0) {
    return (arg: any) => arg;
  }

  if (fns.length === 1) {
    return fns[0];
  }

  return fns.reduce(
    (prev, next) =>
      (...args: any[]) =>
        prev(next(...args))
  );
}

/**
 * 从左到右组合函数
 * 例如：pipe(f, g, h) 相当于 (...args) => h(g(f(...args)))
 *
 * @param fns 要组合的函数列表
 * @returns 组合后的函数
 */
export function pipe<R>(...fns: AnyFn[]): AnyFn {
  if (fns.length === 0) {
    return (arg: any) => arg;
  }

  if (fns.length === 1) {
    return fns[0];
  }

  return fns.reduce(
    (prev, next) =>
      (...args: any[]) =>
        next(prev(...args))
  );
}

/**
 * 支持异步函数的函数组合
 * 例如：composeAsync(f, g, h) 相当于 async (...args) => f(await g(await h(...args)))
 *
 * @param fns 要组合的函数列表（可以包含异步函数）
 * @returns 组合后的异步函数
 */
export function composeAsync<T = any, R = any>(
  ...fns: Array<(arg: any) => any | Promise<any>>
): (arg: T) => Promise<R> {
  return async (arg: T): Promise<R> => {
    let result: any = arg;
    for (let i = fns.length - 1; i >= 0; i--) {
      result = await fns[i](result);
    }
    return result as unknown as R;
  };
}

/**
 * 支持异步函数的管道
 * 例如：pipeAsync(f, g, h) 相当于 async (...args) => h(await g(await f(...args)))
 *
 * @param fns 要组合的函数列表（可以包含异步函数）
 * @returns 组合后的异步函数
 */
export function pipeAsync<T = any, R = any>(
  ...fns: Array<(arg: any) => any | Promise<any>>
): (arg: T) => Promise<R> {
  return async (arg: T): Promise<R> => {
    let result: any = arg;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result as unknown as R;
  };
}

/**
 * 函数柯里化
 * 将一个多参数函数转换为一系列单参数函数
 *
 * @param fn 要柯里化的函数
 * @param arity 函数参数数量，默认为fn.length
 * @returns 柯里化后的函数
 */
export function curry<T extends (...args: any[]) => any>(
  fn: T,
  arity: number = fn.length
): (...args: any[]) => any {
  return function curried(...args: any[]): any {
    if (args.length >= arity) {
      return fn(...args);
    }

    return (...moreArgs: any[]) => curried(...args, ...moreArgs);
  };
}

/**
 * 创建只执行一次的函数
 *
 * @param fn 原始函数
 * @returns 只执行一次的函数
 */
export function once<T extends (...args: any[]) => any>(fn: T): T {
  let called = false;
  let result: any;

  return function (this: any, ...args: any[]): any {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  } as T;
}
