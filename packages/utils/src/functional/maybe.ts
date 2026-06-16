/**
 * Maybe类型实现 - 用于空值处理
 */
import type { Maybe as MaybeType, None, Some } from './types.js';

/**
 * 创建Some值（存在）
 */
export const some = <T>(value: T): Some<T> => ({ _tag: 'Some', value });

/**
 * 创建None值（不存在）
 */
export const none: None = { _tag: 'None' };

/**
 * 检查是否为Some
 */
export const isSome = <T>(maybe: MaybeType<T>): maybe is Some<T> =>
  maybe._tag === 'Some';

/**
 * 检查是否为None
 */
export const isNone = <T>(maybe: MaybeType<T>): maybe is None =>
  maybe._tag === 'None';

/**
 * 从可能为null或undefined的值创建Maybe
 */
export const fromNullable = <T>(value: T | null | undefined): MaybeType<T> => {
  return value != null ? some(value) : none;
};

/**
 * 从谓词函数创建Maybe
 */
export const fromPredicate =
  <T>(predicate: (value: T) => boolean) =>
  (value: T): MaybeType<T> => {
    return predicate(value) ? some(value) : none;
  };

/**
 * 映射Some值，None值保持不变
 */
export const map =
  <T, B>(fn: (value: T) => B) =>
  (maybe: MaybeType<T>): MaybeType<B> => {
    return isSome(maybe) ? some(fn(maybe.value)) : none;
  };

/**
 * 链式操作，用于连接多个可能为空的操作
 */
export const chain =
  <T, B>(fn: (value: T) => MaybeType<B>) =>
  (maybe: MaybeType<T>): MaybeType<B> => {
    return isSome(maybe) ? fn(maybe.value) : none;
  };

/**
 * 折叠Maybe值，处理两种情况
 */
export const fold =
  <T, B>(onNone: () => B, onSome: (value: T) => B) =>
  (maybe: MaybeType<T>): B => {
    return isSome(maybe) ? onSome(maybe.value) : onNone();
  };

/**
 * 获取Some值，如果是None则返回默认值
 */
export const getOrElse =
  <T>(defaultValue: T) =>
  (maybe: MaybeType<T>): T => {
    return isSome(maybe) ? maybe.value : defaultValue;
  };

/**
 * 获取Some值，如果是None则使用函数计算默认值
 */
export const getOrElseW =
  <T, B>(onNone: () => B) =>
  (maybe: MaybeType<T>): T | B => {
    return isSome(maybe) ? maybe.value : onNone();
  };

/**
 * 过滤Maybe值
 */
export const filter =
  <T>(predicate: (value: T) => boolean) =>
  (maybe: MaybeType<T>): MaybeType<T> => {
    return isSome(maybe) && predicate(maybe.value) ? maybe : none;
  };

/**
 * 转换为数组
 */
export const toArray = <T>(maybe: MaybeType<T>): T[] => {
  return isSome(maybe) ? [maybe.value] : [];
};

/**
 * 转换为可空值
 */
export const toNullable = <T>(maybe: MaybeType<T>): T | null => {
  return isSome(maybe) ? maybe.value : null;
};

/**
 * 转换为可undefined值
 */
export const toUndefined = <T>(maybe: MaybeType<T>): T | undefined => {
  return isSome(maybe) ? maybe.value : undefined;
};

/**
 * 序列化Maybe数组，如果所有都是Some则返回Some数组，否则返回None
 */
export const sequence = <T>(maybes: MaybeType<T>[]): MaybeType<T[]> => {
  const results: T[] = [];

  for (const maybe of maybes) {
    if (isNone(maybe)) {
      return none;
    }
    results.push(maybe.value);
  }

  return some(results);
};

/**
 * 遍历数组并应用返回Maybe的函数，序列化结果
 */
export const traverse =
  <A, B>(fn: (value: A) => MaybeType<B>) =>
  (array: A[]): MaybeType<B[]> => {
    return sequence(array.map(fn));
  };

/**
 * 合并两个Maybe值
 */
export const combine = <A, B>(
  maybeA: MaybeType<A>,
  maybeB: MaybeType<B>
): MaybeType<[A, B]> => {
  return isSome(maybeA) && isSome(maybeB)
    ? some([maybeA.value, maybeB.value])
    : none;
};

/**
 * 合并多个Maybe值
 */
export const combineAll = <T>(maybes: MaybeType<T>[]): MaybeType<T[]> => {
  return sequence(maybes);
};

/**
 * 应用函数到Maybe值
 */
export const ap =
  <A, B>(maybeFn: MaybeType<(value: A) => B>) =>
  (maybe: MaybeType<A>): MaybeType<B> => {
    return isSome(maybeFn) && isSome(maybe)
      ? some(maybeFn.value(maybe.value))
      : none;
  };

/**
 * flatMap别名 - 与其他函数式库保持一致
 */
export const flatMap = chain;

/**
 * 应用空值检查 - 对数组中的每个元素应用Maybe
 */
export const mapNullable =
  <A, B>(fn: (value: A) => B | null | undefined) =>
  (maybe: MaybeType<A>): MaybeType<B> => {
    return chain((value: A) => fromNullable(fn(value)))(maybe);
  };

/**
 * 双向过滤 - 同时检查值和类型
 */
export const filterMap =
  <A, B extends A>(predicate: (value: A) => value is B) =>
  (maybe: MaybeType<A>): MaybeType<B> => {
    return isSome(maybe) && predicate(maybe.value) ? some(maybe.value) : none;
  };

/**
 * 可选值的并集 - 用于选择第一个非空值
 */
export const alt =
  <T>(alternative: MaybeType<T>) =>
  (maybe: MaybeType<T>): MaybeType<T> => {
    return isSome(maybe) ? maybe : alternative;
  };

/**
 * 选择第一个非空值
 */
export const firstSome = <T>(maybes: MaybeType<T>[]): MaybeType<T> => {
  for (const maybe of maybes) {
    if (isSome(maybe)) {
      return maybe;
    }
  }
  return none;
};

/**
 * 按顺序尝试多个操作，返回第一个成功的结果
 */
export const tryAll = <T>(
  ...operations: Array<() => MaybeType<T>>
): MaybeType<T> => {
  for (const operation of operations) {
    const result = operation();
    if (isSome(result)) {
      return result;
    }
  }
  return none;
};

/**
 * Maybe的并行处理
 */
export const sequenceParallel = async <T>(
  maybes: Promise<MaybeType<T>>[]
): Promise<MaybeType<T[]>> => {
  const results = await Promise.allSettled(maybes);
  const values: T[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const maybe = result.value;
      if (isNone(maybe)) {
        return none;
      }
      values.push(maybe.value);
    } else {
      return none;
    }
  }

  return some(values);
};

/**
 * 从Promise创建Maybe
 */
export const fromPromise = async <T>(
  promise: Promise<T>
): Promise<MaybeType<T>> => {
  try {
    const result = await promise;
    return fromNullable(result);
  } catch {
    return none;
  }
};

/**
 * Maybe的JSON序列化支持
 */
export const toJSON = <T>(
  maybe: MaybeType<T>
): { _tag: 'Some' | 'None'; value?: T } => {
  return isSome(maybe)
    ? { _tag: 'Some', value: maybe.value }
    : { _tag: 'None' };
};

/**
 * 从JSON反序列化Maybe
 */
export const fromJSON = <T>(json: {
  _tag: 'Some' | 'None';
  value?: T;
}): MaybeType<T> => {
  return json._tag === 'Some' && json.value !== undefined
    ? some(json.value)
    : none;
};

/**
 * 条件性Maybe创建
 */
export const when = <T>(condition: boolean, value: () => T): MaybeType<T> => {
  return condition ? some(value()) : none;
};

/**
 * 惰性Maybe创建
 */
export const lazy = <T>(factory: () => MaybeType<T>): (() => MaybeType<T>) => {
  let cached: MaybeType<T> | undefined;
  let computed = false;

  return () => {
    if (!computed) {
      cached = factory();
      computed = true;
    }
    return cached!;
  };
};

/**
 * Maybe的do记法支持
 */
export const Do = () => {
  return {
    bind: <K extends string, T>(key: K, maybe: MaybeType<T>) => ({
      ...Do(),
      [key]: maybe
    }),

    map:
      <R>(fn: (bindings: any) => R) =>
      (bindings: any): MaybeType<R> => {
        // 检查所有绑定是否都是Some
        for (const [_, value] of Object.entries(bindings)) {
          if (isNone(value as MaybeType<any>)) {
            return none;
          }
        }

        // 提取所有Some值
        const extracted: any = {};
        for (const [key, value] of Object.entries(bindings)) {
          extracted[key] = (value as Some<any>).value;
        }

        return some(fn(extracted));
      }
  };
};
