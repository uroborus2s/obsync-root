/**
 * 函数组合工具 - pipe和compose实现
 */
import type { AnyFunction, Pipe as PipeType } from './types.js';

/**
 * 管道操作符 - 从左到右执行函数
 * 将值通过一系列函数进行转换
 */
export const pipe: PipeType = (value: any, ...fns: AnyFunction[]): any => {
  return fns.reduce((acc, fn) => fn(acc), value);
};

/**
 * 函数组合 - 从右到左执行函数
 * 创建一个新函数，该函数是多个函数的组合
 */
export const compose = (...fns: AnyFunction[]): AnyFunction => {
  return (value: any) => fns.reduceRight((acc, fn) => fn(acc), value);
};

/**
 * 异步管道操作符 - 支持异步函数的管道
 */
export const pipeAsync = async (
  value: any,
  ...fns: Array<(value: any) => any | Promise<any>>
): Promise<any> => {
  let result = value;
  for (const fn of fns) {
    result = await fn(result);
  }
  return result;
};

/**
 * 异步函数组合 - 支持异步函数的组合
 */
export const composeAsync = (
  ...fns: Array<(value: any) => any | Promise<any>>
): ((value: any) => Promise<any>) => {
  return async (value: any) => {
    let result = value;
    for (let i = fns.length - 1; i >= 0; i--) {
      result = await fns[i](result);
    }
    return result;
  };
};

/**
 * 条件管道 - 根据条件决定是否执行函数
 */
export const pipeIf =
  <T>(condition: boolean | ((value: T) => boolean), fn: (value: T) => T) =>
  (value: T): T => {
    const shouldApply =
      typeof condition === 'function' ? condition(value) : condition;
    return shouldApply ? fn(value) : value;
  };

/**
 * 条件管道（函数版本）- 根据谓词决定是否执行函数
 */
export const pipeWhen =
  <T>(predicate: (value: T) => boolean, fn: (value: T) => T) =>
  (value: T): T => {
    return predicate(value) ? fn(value) : value;
  };

/**
 * 分支管道 - 根据条件选择不同的函数执行
 */
export const pipeBranch =
  <T>(
    condition: boolean | ((value: T) => boolean),
    trueFn: (value: T) => T,
    falseFn: (value: T) => T
  ) =>
  (value: T): T => {
    const shouldApplyTrue =
      typeof condition === 'function' ? condition(value) : condition;
    return shouldApplyTrue ? trueFn(value) : falseFn(value);
  };

/**
 * 尝试管道 - 如果函数抛出异常，返回原值
 */
export const pipeTry =
  <T>(fn: (value: T) => T, onError?: (error: Error, value: T) => T) =>
  (value: T): T => {
    try {
      return fn(value);
    } catch (error) {
      if (onError) {
        return onError(error as Error, value);
      }
      return value;
    }
  };

/**
 * 调试管道 - 在管道中插入调试函数，不改变值
 */
export const pipeDebug =
  <T>(debugFn: (value: T) => void, label?: string) =>
  (value: T): T => {
    if (label) {
      console.log(`[DEBUG ${label}]:`, value);
    }
    debugFn(value);
    return value;
  };

/**
 * 日志管道 - 在管道中记录值
 */
export const pipeLog =
  <T>(
    logger: { log: (message: string, data?: any) => void } = console,
    message?: string
  ) =>
  (value: T): T => {
    const logMessage = message || 'Pipe value';
    logger.log(logMessage, value);
    return value;
  };

/**
 * 计时管道 - 测量函数执行时间
 */
export const pipeTime =
  <T>(
    fn: (value: T) => T,
    label?: string,
    logger: { log: (message: string) => void } = console
  ) =>
  (value: T): T => {
    const startTime = performance.now();
    const result = fn(value);
    const endTime = performance.now();
    const duration = endTime - startTime;

    const logLabel = label || 'Function execution';
    logger.log(`${logLabel} took ${duration.toFixed(2)}ms`);

    return result;
  };

/**
 * 缓存管道 - 为函数添加缓存功能
 */
export const pipeCache =
  <T>(
    fn: (value: T) => T,
    cache: Map<string, T> = new Map(),
    keyFn: (value: T) => string = (v) => JSON.stringify(v)
  ) =>
  (value: T): T => {
    const key = keyFn(value);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(value);
    cache.set(key, result);
    return result;
  };

/**
 * 重试管道 - 为函数添加重试功能
 */
export const pipeRetry =
  <T>(fn: (value: T) => T, maxRetries: number = 3, delay: number = 1000) =>
  async (value: T): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return fn(value);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  };

/**
 * 性能优化的管道操作符 - 使用尾调用优化
 */
export const pipeTailCall = <T>(...fns: Array<(arg: T) => T>) => {
  const optimizedPipe = (value: T, index: number = 0): T => {
    if (index >= fns.length) {
      return value;
    }
    return optimizedPipe(fns[index](value), index + 1);
  };

  return (value: T): T => optimizedPipe(value);
};

/**
 * 并行管道 - 同时执行多个函数并组合结果
 */
export const pipeParallel =
  <T, R>(combiner: (...results: R[]) => T, ...fns: Array<(value: T) => R>) =>
  (value: T): T => {
    const results = fns.map((fn) => fn(value));
    return combiner(...results);
  };

/**
 * 分叉管道 - 根据条件选择不同的处理管道
 */
export const pipeFork =
  <T>(
    predicate: (value: T) => boolean,
    truePipe: Array<(value: T) => T>,
    falsePipe: Array<(value: T) => T>
  ) =>
  (value: T): T => {
    const selectedPipe = predicate(value) ? truePipe : falsePipe;
    return selectedPipe.reduce((acc, fn) => fn(acc), value);
  };

/**
 * 迭代管道 - 重复应用相同的函数直到满足条件
 */
export const pipeIterate =
  <T>(
    fn: (value: T) => T,
    predicate: (value: T) => boolean,
    maxIterations: number = 1000
  ) =>
  (value: T): T => {
    let result = value;
    let iterations = 0;

    while (!predicate(result) && iterations < maxIterations) {
      result = fn(result);
      iterations++;
    }

    return result;
  };

/**
 * 可中断管道 - 允许在中间停止执行
 */
export const pipeBreakable =
  <T>(
    shouldBreak: (value: T, index: number) => boolean,
    ...fns: Array<(arg: T) => T>
  ) =>
  (value: T): T => {
    let result = value;

    for (let i = 0; i < fns.length; i++) {
      if (shouldBreak(result, i)) {
        break;
      }
      result = fns[i](result);
    }

    return result;
  };

/**
 * 累积管道 - 保持所有中间结果
 */
export const pipeAccumulate =
  <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T[] => {
    const results: T[] = [value];

    for (const fn of fns) {
      const lastResult = results[results.length - 1];
      results.push(fn(lastResult));
    }

    return results;
  };

/**
 * 懒惰管道 - 只在需要时才执行
 */
export const pipeLazy =
  <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): (() => T) => {
    return () => fns.reduce((acc, fn) => fn(acc), value);
  };

/**
 * 事务性管道 - 在出错时回滚所有操作
 */
export const pipeTransaction =
  <T>(rollback: (value: T, error: Error) => T, ...fns: Array<(arg: T) => T>) =>
  (value: T): T => {
    const snapshots: T[] = [value];

    try {
      let result = value;
      for (const fn of fns) {
        result = fn(result);
        snapshots.push(result);
      }
      return result;
    } catch (error) {
      // 回滚到初始状态
      return rollback(value, error as Error);
    }
  };

/**
 * 条件组合 - 根据条件组合不同的函数
 */
export const composeIf =
  <T>(
    condition: boolean | ((value: T) => boolean),
    ...fns: Array<(arg: T) => T>
  ) =>
  (value: T): T => {
    const shouldApply =
      typeof condition === 'function' ? condition(value) : condition;
    return shouldApply ? compose(...fns)(value) : value;
  };

/**
 * 可配置组合 - 根据配置选择组合函数
 */
export const composeWith =
  <T>(
    config: { [key: string]: boolean },
    fns: { [key: string]: (arg: T) => T }
  ) =>
  (value: T): T => {
    const selectedFns = Object.entries(config)
      .filter(([_, enabled]) => enabled)
      .map(([key, _]) => fns[key])
      .filter(Boolean);

    return compose(...selectedFns)(value);
  };
