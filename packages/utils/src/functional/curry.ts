/**
 * 柯里化工具函数
 */
import type { AnyFunction, Curry2, Curry3, Curry4 } from './types.js';

/**
 * 通用柯里化函数
 * 将多参数函数转换为单参数函数的序列
 */
export const curry = <T extends AnyFunction>(fn: T): any => {
  return function curried(this: any, ...args: any[]): any {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    } else {
      return function (this: any, ...nextArgs: any[]) {
        return curried.apply(this, args.concat(nextArgs));
      };
    }
  };
};

/**
 * 二元函数柯里化
 */
export const curry2 = <A, B, C>(fn: (a: A, b: B) => C): Curry2<A, B, C> => {
  return (a: A) => (b: B) => fn(a, b);
};

/**
 * 三元函数柯里化
 */
export const curry3 = <A, B, C, D>(
  fn: (a: A, b: B, c: C) => D
): Curry3<A, B, C, D> => {
  return (a: A) => (b: B) => (c: C) => fn(a, b, c);
};

/**
 * 四元函数柯里化
 */
export const curry4 = <A, B, C, D, E>(
  fn: (a: A, b: B, c: C, d: D) => E
): Curry4<A, B, C, D, E> => {
  return (a: A) => (b: B) => (c: C) => (d: D) => fn(a, b, c, d);
};

/**
 * 反向柯里化 - 从右到左应用参数
 */
export const curryRight = <T extends AnyFunction>(fn: T): any => {
  return function curriedRight(this: any, ...args: any[]): any {
    if (args.length >= fn.length) {
      return fn.apply(this, args.reverse());
    } else {
      return function (this: any, ...nextArgs: any[]) {
        return curriedRight.apply(this, nextArgs.concat(args));
      };
    }
  };
};

/**
 * 部分应用函数
 * 固定函数的前几个参数
 */
export const partial = <T extends AnyFunction>(
  fn: T,
  ...fixedArgs: any[]
): ((...remainingArgs: any[]) => any) => {
  return (...remainingArgs: any[]) => {
    return fn(...fixedArgs, ...remainingArgs);
  };
};

/**
 * 右部分应用函数
 * 固定函数的后几个参数
 */
export const partialRight = <T extends AnyFunction>(
  fn: T,
  ...fixedArgs: any[]
): ((...remainingArgs: any[]) => any) => {
  return (...remainingArgs: any[]) => {
    return fn(...remainingArgs, ...fixedArgs);
  };
};

/**
 * 智能部分应用 - 根据参数位置智能应用
 */
export const partialAt = <T extends AnyFunction>(
  fn: T,
  positions: number[],
  ...fixedArgs: any[]
): ((...remainingArgs: any[]) => any) => {
  return (...remainingArgs: any[]) => {
    const args = new Array(
      Math.max(fn.length, positions[positions.length - 1] + 1)
    );

    // 填充固定参数
    positions.forEach((pos, index) => {
      args[pos] = fixedArgs[index];
    });

    // 填充剩余参数
    let remainingIndex = 0;
    for (let i = 0; i < args.length; i++) {
      if (!positions.includes(i) && remainingIndex < remainingArgs.length) {
        args[i] = remainingArgs[remainingIndex++];
      }
    }

    return fn(...args);
  };
};

/**
 * 条件部分应用 - 根据条件决定是否应用参数
 */
export const partialIf = <T extends AnyFunction>(
  condition: (args: any[]) => boolean,
  fn: T,
  ...fixedArgs: any[]
): ((...remainingArgs: any[]) => any) => {
  return (...remainingArgs: any[]) => {
    const allArgs = [...fixedArgs, ...remainingArgs];
    if (condition(allArgs)) {
      return fn(...allArgs);
    }
    // 条件不满足时，只使用剩余参数
    if (remainingArgs.length >= fn.length) {
      return fn(...remainingArgs);
    }
    // 如果剩余参数不够，返回默认值或抛出错误
    throw new Error('Insufficient arguments and condition not met');
  };
};

/**
 * 延迟部分应用 - 延迟执行直到满足条件
 */
export const partialLazy = <T extends AnyFunction>(
  fn: T,
  shouldExecute: (args: any[]) => boolean = (args) => args.length >= fn.length
): {
  apply: (...args: any[]) => any;
  reset: () => void;
  getArgs: () => any[];
} => {
  let accumulatedArgs: any[] = [];

  const apply = (...args: any[]) => {
    accumulatedArgs.push(...args);

    if (shouldExecute(accumulatedArgs)) {
      const result = fn(...accumulatedArgs);
      accumulatedArgs = [];
      return result;
    }

    return apply;
  };

  const reset = () => {
    accumulatedArgs = [];
  };

  const getArgs = () => [...accumulatedArgs];

  return { apply, reset, getArgs };
};

/**
 * 管道部分应用 - 将部分应用函数串联
 */
export const pipePartial = <T extends AnyFunction>(
  ...partialFns: Array<(fn: T) => any>
): ((fn: T) => any) => {
  return (fn: T) => {
    return partialFns.reduce((acc, partialFn) => partialFn(acc), fn);
  };
};

/**
 * 记忆化部分应用
 */
export const partialMemo = <T extends AnyFunction>(
  fn: T,
  ...fixedArgs: any[]
): ((...remainingArgs: any[]) => any) => {
  const cache = new Map<string, any>();

  return (...remainingArgs: any[]) => {
    const key = JSON.stringify([...fixedArgs, ...remainingArgs]);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...fixedArgs, ...remainingArgs);
    cache.set(key, result);
    return result;
  };
};

/**
 * 翻转函数参数顺序
 */
export const flip = <A, B, C>(fn: (a: A, b: B) => C): ((b: B, a: A) => C) => {
  return (b: B, a: A) => fn(a, b);
};

/**
 * 占位符柯里化
 * 支持使用占位符跳过某些参数
 */
export const placeholder = Symbol('curry-placeholder');

export const curryWithPlaceholder = <T extends AnyFunction>(fn: T): any => {
  return function curriedWithPlaceholder(this: any, ...args: any[]): any {
    const hasPlaceholder = args.some((arg) => arg === placeholder);

    if (!hasPlaceholder && args.length >= fn.length) {
      return fn.apply(this, args);
    }

    return function (this: any, ...nextArgs: any[]) {
      const mergedArgs = [];
      let nextIndex = 0;

      for (const arg of args) {
        if (arg === placeholder && nextIndex < nextArgs.length) {
          mergedArgs.push(nextArgs[nextIndex++]);
        } else {
          mergedArgs.push(arg);
        }
      }

      // 添加剩余的新参数
      while (nextIndex < nextArgs.length) {
        mergedArgs.push(nextArgs[nextIndex++]);
      }

      return curriedWithPlaceholder.apply(this, mergedArgs);
    };
  };
};

/**
 * 自动柯里化装饰器
 * 自动检测函数参数数量并进行柯里化
 */
export const autoCurry = <T extends AnyFunction>(fn: T): any => {
  if (fn.length <= 1) {
    return fn;
  }
  return curry(fn);
};

/**
 * 记忆化柯里化
 * 结合记忆化和柯里化
 */
export const memoizedCurry = <T extends AnyFunction>(
  fn: T,
  cache: Map<string, any> = new Map()
): any => {
  return function memoizedCurried(this: any, ...args: any[]): any {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    if (args.length >= fn.length) {
      const result = fn.apply(this, args);
      cache.set(key, result);
      return result;
    } else {
      const curriedFn = function (this: any, ...nextArgs: any[]) {
        return memoizedCurried.apply(this, args.concat(nextArgs));
      };
      cache.set(key, curriedFn);
      return curriedFn;
    }
  };
};

/**
 * 柯里化工具对象
 */
export const Curry = {
  curry,
  curry2,
  curry3,
  curry4,
  curryRight,
  partial,
  partialRight,
  flip,
  placeholder,
  curryWithPlaceholder,
  autoCurry,
  memoizedCurry
} as const;

/**
 * 常用的柯里化函数示例
 */

/**
 * 柯里化的加法函数
 */
export const add = curry2((a: number, b: number): number => a + b);

/**
 * 柯里化的乘法函数
 */
export const multiply = curry2((a: number, b: number): number => a * b);

/**
 * 柯里化的字符串包含检查
 */
export const includes = curry2((substring: string, str: string): boolean =>
  str.includes(substring)
);

/**
 * 柯里化的数组映射
 */
export const map = curry2(<T, U>(fn: (item: T) => U, array: T[]): U[] =>
  array.map(fn)
);

/**
 * 柯里化的数组过滤
 */
export const filter = curry2(
  <T>(predicate: (item: T) => boolean, array: T[]): T[] =>
    array.filter(predicate)
);

/**
 * 柯里化的数组归约
 */
export const reduce = curry3(
  <T, U>(reducer: (acc: U, current: T) => U, initial: U, array: T[]): U =>
    array.reduce(reducer, initial)
);

/**
 * 柯里化的属性获取
 */
export const prop = curry2(
  <T, K extends keyof T>(key: K, obj: T): T[K] => obj[key]
);

/**
 * 柯里化的属性设置
 */
export const setProp = curry3(
  <T, K extends keyof T>(key: K, value: T[K], obj: T): T => ({
    ...obj,
    [key]: value
  })
);

/**
 * 管道式柯里化 - 将柯里化函数组合成管道
 */
export const pipeCurried = (...fns: Array<(arg: any) => any>) => {
  return (initialValue: any) => {
    return fns.reduce((acc, fn) => fn(acc), initialValue);
  };
};

/**
 * 条件柯里化 - 根据条件决定是否应用函数
 */
export const curryIf = <T extends AnyFunction>(
  condition: (args: Parameters<T>) => boolean,
  fn: T,
  defaultValue?: ReturnType<T>
): any => {
  return curry((...args: Parameters<T>): ReturnType<T> => {
    if (condition(args)) {
      return fn(...args);
    }
    return defaultValue as ReturnType<T>;
  });
};

/**
 * 异步柯里化
 */
export const curryAsync = <T extends (...args: any[]) => Promise<any>>(
  fn: T
): any => {
  return function curriedAsync(this: any, ...args: any[]): any {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    } else {
      return function (this: any, ...nextArgs: any[]) {
        return curriedAsync.apply(this, args.concat(nextArgs));
      };
    }
  };
};

/**
 * 类型安全的柯里化 - 提供更好的类型推导
 */
export function curryTyped<A, R>(fn: (a: A) => R): (a: A) => R;
export function curryTyped<A, B, R>(
  fn: (a: A, b: B) => R
): (a: A) => (b: B) => R;
export function curryTyped<A, B, C, R>(
  fn: (a: A, b: B, c: C) => R
): (a: A) => (b: B) => (c: C) => R;
export function curryTyped<A, B, C, D, R>(
  fn: (a: A, b: B, c: C, d: D) => R
): (a: A) => (b: B) => (c: C) => (d: D) => R;
export function curryTyped(fn: AnyFunction): any {
  return curry(fn);
}

/**
 * 变参柯里化 - 支持可变参数数量
 */
export const curryN = <T extends AnyFunction>(arity: number, fn: T): any => {
  return function curriedN(this: any, ...args: any[]): any {
    if (args.length >= arity) {
      return fn.apply(this, args);
    } else {
      return function (this: any, ...nextArgs: any[]) {
        return curriedN.apply(this, args.concat(nextArgs));
      };
    }
  };
};

/**
 * 柯里化装饰器工厂
 */
export const createCurryDecorator = (options: {
  memoize?: boolean;
  placeholder?: boolean;
  async?: boolean;
}) => {
  return <T extends AnyFunction>(fn: T): any => {
    let curriedFn = fn;

    if (options.async) {
      curriedFn = curryAsync(curriedFn as any);
    } else if (options.placeholder) {
      curriedFn = curryWithPlaceholder(curriedFn);
    } else if (options.memoize) {
      curriedFn = memoizedCurry(curriedFn);
    } else {
      curriedFn = curry(curriedFn);
    }

    return curriedFn;
  };
};

/**
 * 柯里化函数组合器
 */
export const curriedCompose = (...fns: AnyFunction[]) => {
  return curry((value: any) => {
    return fns.reduceRight((acc, fn) => fn(acc), value);
  });
};

/**
 * 柯里化分支逻辑
 */
export const curryBranch = curry3(
  <T, U>(
    predicate: (value: T) => boolean,
    trueHandler: (value: T) => U,
    falseHandler: (value: T) => U
  ) =>
    (value: T): U => {
      return predicate(value) ? trueHandler(value) : falseHandler(value);
    }
);

/**
 * 柯里化的对象深度获取
 */
export const getPath = curry2(<T>(path: string[], obj: any): T | undefined => {
  return path.reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
});

/**
 * 柯里化的对象深度设置
 */
export const setPath = curry3((path: string[], value: any, obj: any): any => {
  if (path.length === 0) return value;

  const [head, ...tail] = path;
  return {
    ...obj,
    [head]: tail.length === 0 ? value : setPath(tail)(value)(obj[head] || {})
  };
});

/**
 * 性能优化的柯里化函数缓存
 */
export class CurryCache {
  private static cache = new WeakMap<AnyFunction, any>();

  static get<T extends AnyFunction>(fn: T): any {
    if (!this.cache.has(fn)) {
      this.cache.set(fn, curry(fn));
    }
    return this.cache.get(fn);
  }

  static clear(): void {
    this.cache = new WeakMap();
  }
}

/**
 * 增强的柯里化工具对象
 */
export const CurryAdvanced = {
  // 基础柯里化
  curry,
  curry2,
  curry3,
  curry4,
  curryRight,
  curryN,
  curryTyped,

  // 部分应用
  partial,
  partialRight,
  partialAt,
  partialIf,
  partialLazy,
  pipePartial,
  partialMemo,
  flip,

  // 占位符支持
  placeholder,
  curryWithPlaceholder,

  // 增强功能
  autoCurry,
  memoizedCurry,
  curryAsync,
  curryIf,

  // 组合功能
  pipeCurried,
  curriedCompose,
  curryBranch,

  // 对象操作
  prop,
  setProp,
  getPath,
  setPath,

  // 工厂和缓存
  createCurryDecorator,
  CurryCache,

  // 常用函数
  add,
  multiply,
  includes,
  map,
  filter,
  reduce
} as const;

/**
 * 调试友好性增强
 */

/**
 * 调试柯里化函数 - 添加执行追踪
 */
export const debugCurry = <T extends AnyFunction>(
  fn: T,
  options: {
    name?: string;
    logArgs?: boolean;
    logResult?: boolean;
    logger?: { info: (msg: string) => void };
  } = {}
): any => {
  const {
    name = fn.name || 'anonymous',
    logArgs = true,
    logResult = true,
    logger = console
  } = options;

  return function debugCurried(this: any, ...args: any[]): any {
    if (logArgs) {
      logger.info(`[${name}] Called with args: ${JSON.stringify(args)}`);
    }

    if (args.length >= fn.length) {
      const result = fn.apply(this, args);
      if (logResult) {
        logger.info(`[${name}] Result: ${JSON.stringify(result)}`);
      }
      return result;
    } else {
      const remaining = fn.length - args.length;
      logger.info(
        `[${name}] Partially applied, ${remaining} arguments remaining`
      );

      return function (this: any, ...nextArgs: any[]) {
        return debugCurried.apply(this, args.concat(nextArgs));
      };
    }
  };
};

/**
 * 性能监控柯里化
 */
export const perfCurry = <T extends AnyFunction>(
  fn: T,
  options: {
    name?: string;
    threshold?: number;
    logger?: { warn: (msg: string) => void };
  } = {}
): any => {
  const {
    name = fn.name || 'anonymous',
    threshold = 100,
    logger = console
  } = options;

  return function perfCurried(this: any, ...args: any[]): any {
    const startTime = performance.now();

    if (args.length >= fn.length) {
      const result = fn.apply(this, args);
      const duration = performance.now() - startTime;

      if (duration > threshold) {
        logger.warn(`[${name}] Slow execution: ${duration.toFixed(2)}ms`);
      }

      return result;
    } else {
      return function (this: any, ...nextArgs: any[]) {
        return perfCurried.apply(this, args.concat(nextArgs));
      };
    }
  };
};

/**
 * 错误处理柯里化
 */
export const safeCurry = <T extends AnyFunction>(
  fn: T,
  options: {
    onError?: (error: Error, args: any[]) => any;
    retries?: number;
    logger?: { error: (msg: string) => void };
  } = {}
): any => {
  const { onError = () => undefined, retries = 0, logger = console } = options;

  return function safeCurried(this: any, ...args: any[]): any {
    if (args.length >= fn.length) {
      let attempt = 0;

      const tryExecute = (): any => {
        try {
          return fn.apply(this, args);
        } catch (error) {
          attempt++;
          logger.error(
            `Execution failed (attempt ${attempt}): ${(error as Error).message}`
          );

          if (attempt <= retries) {
            return tryExecute();
          }

          return onError(error as Error, args);
        }
      };

      return tryExecute();
    } else {
      return function (this: any, ...nextArgs: any[]) {
        return safeCurried.apply(this, args.concat(nextArgs));
      };
    }
  };
};

/**
 * 类型检查柯里化
 */
export const typedCurry = <T extends AnyFunction>(
  fn: T,
  validators: Array<(arg: any) => boolean>,
  options: {
    onTypeError?: (arg: any, index: number) => any;
    logger?: { error: (msg: string) => void };
  } = {}
): any => {
  const {
    onTypeError = () => {
      throw new Error('Type validation failed');
    },
    logger = console
  } = options;

  return function typedCurried(this: any, ...args: any[]): any {
    // 验证参数类型
    for (let i = 0; i < args.length; i++) {
      if (validators[i] && !validators[i](args[i])) {
        logger.error(
          `Type validation failed for argument ${i}: ${typeof args[i]}`
        );
        return onTypeError(args[i], i);
      }
    }

    if (args.length >= fn.length) {
      return fn.apply(this, args);
    } else {
      return function (this: any, ...nextArgs: any[]) {
        return typedCurried.apply(this, args.concat(nextArgs));
      };
    }
  };
};

/**
 * 统计信息收集柯里化
 */
export class CurryStats {
  private static readonly stats = new Map<
    string,
    {
      calls: number;
      totalTime: number;
      averageTime: number;
      errors: number;
    }
  >();

  static curry<T extends AnyFunction>(
    fn: T,
    name: string = fn.name || 'anonymous'
  ): any {
    if (!this.stats.has(name)) {
      this.stats.set(name, {
        calls: 0,
        totalTime: 0,
        averageTime: 0,
        errors: 0
      });
    }

    return function statsCurried(this: any, ...args: any[]): any {
      const stats = CurryStats.stats.get(name)!;
      const startTime = performance.now();

      if (args.length >= fn.length) {
        try {
          const result = fn.apply(this, args);
          const duration = performance.now() - startTime;

          stats.calls++;
          stats.totalTime += duration;
          stats.averageTime = stats.totalTime / stats.calls;

          return result;
        } catch (error) {
          stats.errors++;
          throw error;
        }
      } else {
        return function (this: any, ...nextArgs: any[]) {
          return statsCurried.apply(this, args.concat(nextArgs));
        };
      }
    };
  }

  static getStats(name?: string) {
    if (name) {
      return this.stats.get(name);
    }
    return Object.fromEntries(this.stats.entries());
  }

  static clearStats(name?: string) {
    if (name) {
      this.stats.delete(name);
    } else {
      this.stats.clear();
    }
  }
}

/**
 * 调试和监控工具集合
 */
export const CurryDebug = {
  debug: debugCurry,
  perf: perfCurry,
  safe: safeCurry,
  typed: typedCurry,
  stats: CurryStats
} as const;

/**
 * 函数组合工具
 */

/**
 * 右结合组合 - compose(f, g)(x) = f(g(x))
 */
export const compose = <T extends readonly AnyFunction[]>(...fns: T) => {
  return (value: any) => {
    return fns.reduceRight((acc, fn) => fn(acc), value);
  };
};

/**
 * 左结合组合 - pipe(f, g)(x) = g(f(x))
 */
export const pipe = <T extends readonly AnyFunction[]>(...fns: T) => {
  return (value: any) => {
    return fns.reduce((acc, fn) => fn(acc), value);
  };
};

/**
 * 异步函数组合
 */
export const composeAsync = <
  T extends readonly ((...args: any[]) => Promise<any>)[]
>(
  ...fns: T
) => {
  return async (value: any) => {
    let result = value;
    for (let i = fns.length - 1; i >= 0; i--) {
      result = await fns[i](result);
    }
    return result;
  };
};

/**
 * 异步管道
 */
export const pipeAsync = <
  T extends readonly ((...args: any[]) => Promise<any>)[]
>(
  ...fns: T
) => {
  return async (value: any) => {
    let result = value;
    for (const fn of fns) {
      result = await fn(result);
    }
    return result;
  };
};

/**
 * 条件组合 - 根据条件选择不同的组合路径
 */
export const composeIf = <T>(
  condition: (value: T) => boolean,
  truePath: AnyFunction[],
  falsePath: AnyFunction[] = []
) => {
  return (value: T) => {
    const path = condition(value) ? truePath : falsePath;
    return compose(...path)(value);
  };
};

/**
 * 分支组合 - 将输入发送到多个分支并合并结果
 */
export const branchCompose = <T, U>(...branches: Array<(value: T) => U>) => {
  return (value: T): U[] => {
    return branches.map((fn) => fn(value));
  };
};

/**
 * 并行组合 - 并行执行多个函数
 */
export const parallel = <T extends readonly AnyFunction[]>(...fns: T) => {
  return async (value: any) => {
    return Promise.all(fns.map((fn) => fn(value)));
  };
};

/**
 * 竞争组合 - 返回最快完成的结果
 */
export const race = <T extends readonly AnyFunction[]>(...fns: T) => {
  return async (value: any) => {
    return Promise.race(fns.map((fn) => fn(value)));
  };
};

/**
 * 记忆化组合
 */
export const memoizeCompose = <T extends readonly AnyFunction[]>(...fns: T) => {
  const cache = new Map<string, any>();
  const composedFn = compose(...fns);

  return (value: any) => {
    const key = JSON.stringify(value);
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = composedFn(value);
    cache.set(key, result);
    return result;
  };
};

/**
 * 错误恢复组合 - 在任意步骤失败时提供恢复机制
 */
export const composeWithFallback = <T extends readonly AnyFunction[]>(
  fallbackFn: (error: Error, value: any, stepIndex: number) => any,
  ...fns: T
) => {
  return (value: any) => {
    let result = value;
    for (let i = fns.length - 1; i >= 0; i--) {
      try {
        result = fns[i](result);
      } catch (error) {
        result = fallbackFn(error as Error, result, i);
      }
    }
    return result;
  };
};

/**
 * 调试组合 - 在每个步骤记录值
 */
export const debugCompose = <T extends readonly AnyFunction[]>(
  logger: (value: any, stepIndex: number, fnName: string) => void = console.log,
  ...fns: T
) => {
  return (value: any) => {
    let result = value;
    logger(result, -1, 'initial');

    for (let i = fns.length - 1; i >= 0; i--) {
      result = fns[i](result);
      logger(
        result,
        fns.length - 1 - i,
        fns[i].name || `step${fns.length - 1 - i}`
      );
    }

    return result;
  };
};

/**
 * 点自由(Point-free)风格助手
 */
export const pointFree = {
  /**
   * 提取对象属性
   */
  get: curry2(<T, K extends keyof T>(prop: K, obj: T): T[K] => obj[prop]),

  /**
   * 调用对象方法
   */
  call: curry2(
    <T, K extends keyof T>(
      method: K,
      obj: T
    ): T[K] extends (...args: any[]) => any ? ReturnType<T[K]> : never => {
      const fn = obj[method];
      if (typeof fn === 'function') {
        return (fn as any).call(obj);
      }
      throw new Error(`${String(method)} is not a function`);
    }
  ),

  /**
   * 比较操作
   */
  eq: curry2(<T>(a: T, b: T): boolean => a === b),
  gt: curry2((a: number, b: number): boolean => a > b),
  lt: curry2((a: number, b: number): boolean => a < b),
  gte: curry2((a: number, b: number): boolean => a >= b),
  lte: curry2((a: number, b: number): boolean => a <= b),

  /**
   * 逻辑操作
   */
  not: (value: any): boolean => !value,
  and: curry2((a: any, b: any): boolean => a && b),
  or: curry2((a: any, b: any): boolean => a || b),

  /**
   * 数组操作
   */
  length: <T>(arr: T[]): number => arr.length,
  head: <T>(arr: T[]): T | undefined => arr[0],
  tail: <T>(arr: T[]): T[] => arr.slice(1),
  last: <T>(arr: T[]): T | undefined => arr[arr.length - 1],
  init: <T>(arr: T[]): T[] => arr.slice(0, -1),

  /**
   * 字符串操作
   */
  split: curry2((separator: string, str: string): string[] =>
    str.split(separator)
  ),
  join: curry2((separator: string, arr: string[]): string =>
    arr.join(separator)
  ),
  trim: (str: string): string => str.trim(),
  toLowerCase: (str: string): string => str.toLowerCase(),
  toUpperCase: (str: string): string => str.toUpperCase()
};

/**
 * 函数式编程常用组合子
 */
export const combinators = {
  /**
   * I - 恒等组合子
   */
  I: <T>(x: T): T => x,

  /**
   * K - 常量组合子
   */
  K: curry2(<T, U>(x: T, y: U): T => x),

  /**
   * S - 替换组合子
   */
  S: curry3(
    <A, B, C>(f: (a: A) => (b: B) => C, g: (a: A) => B, x: A): C => f(x)(g(x))
  ),

  /**
   * B - 组合组合子
   */
  B: curry3(<A, B, C>(f: (b: B) => C, g: (a: A) => B, x: A): C => f(g(x))),

  /**
   * C - 翻转组合子
   */
  C: curry3(<A, B, C>(f: (a: A) => (b: B) => C, y: B, x: A): C => f(x)(y)),

  /**
   * W - 重复组合子
   */
  W: curry2(<A, B>(f: (a: A) => (a: A) => B, x: A): B => f(x)(x)),

  /**
   * Y - 不动点组合子（用于递归）
   */
  Y: <T>(f: (fn: (x: T) => T) => (x: T) => T) => {
    const fn = (x: T): T => f(fn)(x);
    return fn;
  }
};

/**
 * 高阶函数工具
 */
export const higherOrder = {
  /**
   * 创建谓词的否定
   */
  negate:
    <T extends readonly any[]>(predicate: (...args: T) => boolean) =>
    (...args: T): boolean =>
      !predicate(...args),

  /**
   * 创建多个谓词的合取
   */
  allPass:
    <T extends readonly any[]>(...predicates: Array<(...args: T) => boolean>) =>
    (...args: T): boolean =>
      predicates.every((p) => p(...args)),

  /**
   * 创建多个谓词的析取
   */
  anyPass:
    <T extends readonly any[]>(...predicates: Array<(...args: T) => boolean>) =>
    (...args: T): boolean =>
      predicates.some((p) => p(...args)),

  /**
   * 当且仅当
   */
  ifElse: curry3(
    <T, U, V>(
      condition: (x: T) => boolean,
      onTrue: (x: T) => U,
      onFalse: (x: T) => V
    ) =>
      (x: T): U | V =>
        condition(x) ? onTrue(x) : onFalse(x)
  ),

  /**
   * 当条件满足时执行
   */
  when: curry2(
    <T>(condition: (x: T) => boolean, fn: (x: T) => T) =>
      (x: T): T =>
        condition(x) ? fn(x) : x
  ),

  /**
   * 当条件不满足时执行
   */
  unless: curry2(
    <T>(condition: (x: T) => boolean, fn: (x: T) => T) =>
      (x: T): T =>
        condition(x) ? x : fn(x)
  ),

  /**
   * 重复执行函数n次
   */
  times: curry2(<T>(n: number, fn: (index: number) => T): T[] =>
    Array.from({ length: n }, (_, i) => fn(i))
  ),

  /**
   * 直到条件满足为止重复执行
   */
  until: curry2(
    <T>(condition: (x: T) => boolean, fn: (x: T) => T) =>
      (initial: T): T => {
        let result = initial;
        while (!condition(result)) {
          result = fn(result);
        }
        return result;
      }
  )
};
