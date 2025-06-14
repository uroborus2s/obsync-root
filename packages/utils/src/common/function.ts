/**
 * 函数操作工具函数，提供函数组合、记忆化等操作
 *
 * 此模块包含了所有函数操作相关的工具，从function模块合并而来，
 * 提供了函数组合、记忆化、柯里化、部分应用等功能。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数操作
 *
 * @packageDocumentation
 */

// 函数类型定义
type AnyFn = (...args: any[]) => any;

/**
 * 创建一个预设了部分参数的函数
 *
 * 返回一个新函数，该函数调用时会先使用预设的参数，再使用调用时传入的参数
 *
 * @param func - 要预设参数的函数
 * @param partials - 预设的参数
 * @returns 包装后的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数变换
 *
 * @example
 * ```typescript
 * // 创建一个预设了第一个参数的函数
 * const greet = (greeting, name) => `${greeting}, ${name}!`;
 * const greetHello = partial(greet, 'Hello');
 * greetHello('World'); // 输出: 'Hello, World!'
 * ```
 * @public
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
 *
 * 返回一个新函数，该函数执行原函数并对结果取反
 *
 * @param func - 要取反的函数
 * @returns 取反后的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数变换
 *
 * @example
 * ```typescript
 * // 创建一个判断非偶数的函数
 * const isEven = (n: number) => n % 2 === 0;
 * const isOdd = negate(isEven);
 * isOdd(3); // 输出: true
 * isOdd(2); // 输出: false
 * ```
 * @public
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
 *
 * 在指定的延迟时间后执行函数
 *
 * @param func - 要延迟的函数
 * @param wait - 延迟时间（毫秒）
 * @param args - 调用函数的参数
 * @returns 定时器ID，可用于清除定时器
 * @remarks
 * 版本: 1.0.0
 * 分类: 计时器
 *
 * @example
 * ```typescript
 * // 延迟1秒后打印消息
 * delay(() => console.log('延迟消息'), 1000);
 * console.log('立即消息');
 * // 输出:
 * // 立即消息
 * // (1秒后) 延迟消息
 * ```
 * @public
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
 *
 * 将函数的执行推迟到当前调用栈清空后（类似于setTimeout(fn, 0)的效果）
 *
 * @param func - 要推迟的函数
 * @param args - 调用函数的参数
 * @returns 定时器ID，可用于清除定时器
 * @remarks
 * 版本: 1.0.0
 * 分类: 计时器
 *
 * @example
 * ```typescript
 * // 推迟执行函数
 * console.log('开始');
 * defer(() => console.log('推迟执行'));
 * console.log('结束');
 * // 输出:
 * // 开始
 * // 结束
 * // 推迟执行
 * ```
 * @public
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
 *
 * 返回一个函数，该函数需要被调用n次后才会执行原函数
 *
 * @param n - 需要调用的次数
 * @param func - 延迟执行的函数
 * @returns 包装后的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数变换
 *
 * @example
 * ```typescript
 * // 创建一个需要调用3次后才执行的函数
 * const logger = after(3, () => console.log('函数被执行了!'));
 * logger(); // 无输出
 * logger(); // 无输出
 * logger(); // 输出: '函数被执行了!'
 * logger(); // 输出: '函数被执行了!'（再次调用仍然执行）
 * ```
 * @public
 */
export function after<T extends (...args: any[]) => any>(
  n: number,
  func: T
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let count = 0;
  let result: ReturnType<T> | undefined;

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
 *
 * 返回一个函数，该函数只会在前n次调用中执行原函数，之后的调用返回最后一次执行的结果
 *
 * @param n - 限制的调用次数
 * @param func - 要限制执行的函数
 * @returns 包装后的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数变换
 *
 * @example
 * ```typescript
 * // 创建一个最多执行2次的函数
 * let count = 0;
 * const counter = before(3, () => ++count);
 * counter(); // 输出: 1
 * counter(); // 输出: 2
 * counter(); // 输出: 2 (不再增加)
 * ```
 * @public
 */
export function before<T extends (...args: any[]) => any>(
  n: number,
  func: T
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let result: ReturnType<T> | undefined;
  let count = 0;

  return function (...args: Parameters<T>): ReturnType<T> | undefined {
    if (count < n) {
      count += 1;
      result = func(...args);
    }

    return result;
  };
}

/**
 * 限制函数接收的参数数量
 *
 * 返回一个函数，该函数最多接收指定数量的参数
 *
 * @param func - 原函数
 * @param n - 参数数量限制
 * @returns 参数数量受限的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数变换
 *
 * @example
 * ```typescript
 * // 限制函数只接受前两个参数
 * const sum = (...args) => args.reduce((a, b) => a + b, 0);
 * const sum2 = ary(sum, 2);
 * sum2(1, 2, 3, 4); // 输出: 3 (只使用了1和2)
 * ```
 * @public
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
 * 限制函数只接收一个参数
 *
 * 返回一个函数，该函数只接收第一个参数
 *
 * @param func - 原函数
 * @returns 只接收一个参数的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数变换
 *
 * @example
 * ```typescript
 * // 创建一个只使用第一个参数的函数
 * const numbers = ['1', '2', '3'];
 * const parsed = numbers.map(unary(parseInt)); // [1, 2, 3]
 * // 不使用unary: numbers.map(parseInt) 会得到 [1, NaN, NaN]
 * ```
 * @public
 */
export function unary<T extends (...args: any[]) => any>(
  func: T
): (arg: any) => ReturnType<T> {
  return function (arg: any): ReturnType<T> {
    return func(arg);
  };
}

/**
 * 返回输入的值本身
 *
 * 这个函数简单地返回传入的参数，在函数式编程和链式调用中很有用
 *
 * @param value - 任何值
 * @returns 传入的值本身
 * @remarks
 * 版本: 1.0.0
 * 分类: 工具函数
 *
 * @example
 * ```typescript
 * // 基本使用
 * identity(5); // 输出: 5
 * identity({ a: 1 }); // 输出: { a: 1 }
 *
 * // 在函数式编程中使用
 * [1, 2, 3].map(identity); // 输出: [1, 2, 3]
 * ```
 * @public
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * 不执行任何操作的函数
 *
 * 这个函数不执行任何操作，始终返回undefined，常用于占位和默认回调
 *
 * @returns undefined
 * @remarks
 * 版本: 1.0.0
 * 分类: 工具函数
 *
 * @example
 * ```typescript
 * // 作为默认回调
 * function processData(data, callback = noop) {
 *   // 处理数据...
 *   callback();
 * }
 *
 * // 作为占位函数
 * const events = {
 *   onSuccess: data => console.log(data),
 *   onError: noop // 不需要错误处理时
 * };
 * ```
 * @public
 */
export function noop(): undefined {
  return undefined;
}

/**
 * 从右到左组合多个函数
 *
 * 返回一个新函数，该函数是从右到左执行传入的所有函数的组合
 *
 * @param fns - 要组合的函数列表
 * @returns 组合后的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数组合
 *
 * @example
 * ```typescript
 * // 组合多个函数
 * const add5 = x => x + 5;
 * const multiply2 = x => x * 2;
 * const subtract3 = x => x - 3;
 *
 * // 从右到左执行: subtract3 -> multiply2 -> add5
 * const composed = compose(add5, multiply2, subtract3);
 * composed(10); // 输出: 19 = add5(multiply2(subtract3(10))) = add5(multiply2(7)) = add5(14) = 19
 * ```
 * @public
 */
export function compose<R>(...fns: AnyFn[]): AnyFn {
  if (fns.length === 0) {
    return identity;
  }

  if (fns.length === 1) {
    return fns[0];
  }

  return function (this: any, ...args: any[]): R {
    let result = fns[fns.length - 1].apply(this, args);

    for (let i = fns.length - 2; i >= 0; i--) {
      result = fns[i].call(this, result);
    }

    return result as R;
  };
}

/**
 * 从左到右组合多个函数
 *
 * 返回一个新函数，该函数是从左到右执行传入的所有函数的组合
 *
 * @param fns - 要组合的函数列表
 * @returns 组合后的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数组合
 *
 * @example
 * ```typescript
 * // 组合多个函数
 * const add5 = x => x + 5;
 * const multiply2 = x => x * 2;
 * const subtract3 = x => x - 3;
 *
 * // 从左到右执行: add5 -> multiply2 -> subtract3
 * const piped = pipe(add5, multiply2, subtract3);
 * piped(10); // 输出: 27 = subtract3(multiply2(add5(10))) = subtract3(multiply2(15)) = subtract3(30) = 27
 * ```
 * @public
 */
export function pipe<R>(...fns: AnyFn[]): AnyFn {
  if (fns.length === 0) {
    return identity;
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
 * 从右到左组合多个异步函数
 *
 * 返回一个新的异步函数，该函数是从右到左执行传入的所有函数的组合
 *
 * @param fns - 要组合的异步函数列表
 * @returns 组合后的异步函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数组合
 *
 * @example
 * ```typescript
 * // 组合多个异步函数
 * const fetchUser = async id => await api.getUser(id);
 * const getPermissions = async user => await api.getPermissions(user.id);
 * const formatData = async permissions => permissions.map(p => p.name);
 *
 * // 从右到左执行: fetchUser -> getPermissions -> formatData
 * const getUserPermissions = composeAsync(formatData, getPermissions, fetchUser);
 * const permissions = await getUserPermissions(123); // ['read', 'write', ...]
 * ```
 * @public
 */
export function composeAsync<T = any, R = any>(
  ...fns: Array<(arg: any) => any | Promise<any>>
): (arg: T) => Promise<R> {
  if (fns.length === 0) {
    return async (arg: T) => arg as unknown as R;
  }

  return async function (arg: T): Promise<R> {
    let result: any = arg;
    for (let i = fns.length - 1; i >= 0; i--) {
      result = await fns[i](result);
    }
    return result as R;
  };
}

/**
 * 从左到右组合多个异步函数
 *
 * 返回一个新的异步函数，该函数是从左到右执行传入的所有函数的组合
 *
 * @param fns - 要组合的异步函数列表
 * @returns 组合后的异步函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数组合
 *
 * @example
 * ```typescript
 * // 组合多个异步函数
 * const fetchUser = async id => await api.getUser(id);
 * const getPermissions = async user => await api.getPermissions(user.id);
 * const formatData = async permissions => permissions.map(p => p.name);
 *
 * // 从左到右执行: fetchUser -> getPermissions -> formatData
 * const getUserPermissions = pipeAsync(fetchUser, getPermissions, formatData);
 * const permissions = await getUserPermissions(123); // ['read', 'write', ...]
 * ```
 * @public
 */
export function pipeAsync<T = any, R = any>(
  ...fns: Array<(arg: any) => any | Promise<any>>
): (arg: T) => Promise<R> {
  if (fns.length === 0) {
    return async (arg: T) => arg as unknown as R;
  }

  return async function (arg: T): Promise<R> {
    let result: any = arg;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result as R;
  };
}

/**
 * 将函数转换为柯里化版本
 *
 * 返回一个函数，该函数接受一个或多个参数，如果参数不足以执行原函数，则返回一个接受剩余参数的新函数
 *
 * @param fn - 要柯里化的函数
 * @param arity - 函数的元数（参数数量），默认为函数的length属性
 * @returns 柯里化后的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数变换
 *
 * @example
 * ```typescript
 * // 柯里化一个函数
 * const add = (a, b, c) => a + b + c;
 * const curriedAdd = curry(add);
 *
 * // 可以一次传入所有参数
 * curriedAdd(1, 2, 3); // 输出: 6
 *
 * // 也可以分步传入参数
 * const add1 = curriedAdd(1);
 * const add1And2 = add1(2);
 * add1And2(3); // 输出: 6
 *
 * // 或者任意组合
 * curriedAdd(1)(2, 3); // 输出: 6
 * ```
 * @public
 */
export function curry<T extends (...args: any[]) => any>(
  fn: T,
  arity: number = fn.length
): (...args: any[]) => any {
  function curried(...args: any[]): any {
    if (args.length >= arity) {
      return fn(...args);
    }

    return function (...moreArgs: any[]): any {
      return curried(...args, ...moreArgs);
    };
  }

  return curried;
}

/**
 * 创建一个只执行一次的函数
 *
 * 返回一个新函数，该函数无论被调用多少次，原函数都只会执行一次，并返回第一次调用的结果
 *
 * @param fn - 需要只执行一次的函数
 * @returns 包装后的函数
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数变换
 *
 * @example
 * ```typescript
 * // 创建一个只执行一次的初始化函数
 * let counter = 0;
 * const initialize = once(() => ++counter);
 *
 * initialize(); // 输出: 1
 * initialize(); // 输出: 1（不再增加）
 * initialize(); // 输出: 1（不再增加）
 * ```
 * @public
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

/**
 * 默认的键解析器，将参数数组转换为缓存键
 *
 * @param args - 函数参数
 * @returns 缓存键字符串
 * @internal
 */
function defaultKeyResolver(...args: any[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join('::');
}

/**
 * 记忆化函数，缓存函数结果以提高性能
 *
 * 返回一个新函数，该函数会缓存之前的计算结果，如果使用相同的参数再次调用，则直接返回缓存的结果
 *
 * @param func - 要缓存结果的函数
 * @param resolver - 自定义缓存键生成函数，用于确定如何根据参数生成缓存键
 * @returns 记忆化后的函数，带有cache属性访问缓存对象
 * @throws 如果输入不是函数，则抛出TypeError
 * @remarks
 * 版本: 1.0.0
 * 分类: 性能优化
 *
 * @example
 * ```typescript
 * // 记忆化斐波那契函数
 * const fibonacci = memoize(n => {
 *   if (n <= 1) return n;
 *   return fibonacci(n - 1) + fibonacci(n - 2);
 * });
 *
 * fibonacci(40); // 快速计算，因为中间结果被缓存
 *
 * // 使用自定义键解析器
 * const getUser = memoize(
 *   (id, force) => api.fetchUser(id),
 *   (id, force) => force ? `user-${id}-${Date.now()}` : `user-${id}`
 * );
 *
 * // 访问缓存
 * console.log(fibonacci.cache); // Map { '5' => 5, '4' => 3, ... }
 * ```
 * @public
 */
export function memoize<F extends (...args: any[]) => any>(
  func: F,
  resolver?: (...args: any[]) => string
): F & { cache: Map<string, any> } {
  const keyResolver = resolver || defaultKeyResolver;
  const cache = new Map<string, any>();

  const memoized = function (this: any, ...args: any[]): any {
    const key = keyResolver(...args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  } as F & { cache: Map<string, any> };

  memoized.cache = cache;

  return memoized;
}
