/**
 * Either类型实现 - 用于错误处理
 */
import type { Either as EitherType, Left, Right } from './types.js';

// 重新导出Either类型
export type Either<L, R> = EitherType<L, R>;
export type { Left, Right };

/**
 * 创建Left值（错误）
 */
export const left = <L>(value: L): Left<L> => ({ _tag: 'Left', left: value });

/**
 * 创建Right值（成功）
 */
export const right = <R>(value: R): Right<R> => ({
  _tag: 'Right',
  right: value
});

/**
 * 检查是否为Left
 */
export const isLeft = <L, R>(either: EitherType<L, R>): either is Left<L> =>
  either._tag === 'Left';

/**
 * 检查是否为Right
 */
export const isRight = <L, R>(either: EitherType<L, R>): either is Right<R> =>
  either._tag === 'Right';

/**
 * 映射Right值，Left值保持不变
 */
export const map =
  <L, R, B>(fn: (value: R) => B) =>
  (either: EitherType<L, R>): EitherType<L, B> => {
    return isRight(either) ? right(fn(either.right)) : left(either.left);
  };

/**
 * 映射Left值，Right值保持不变
 */
export const mapLeft =
  <L, R, B>(fn: (value: L) => B) =>
  (either: EitherType<L, R>): EitherType<B, R> => {
    return isLeft(either) ? left(fn(either.left)) : right(either.right);
  };

/**
 * 链式操作，用于连接多个可能失败的操作
 */
export const chain =
  <L, R, B>(fn: (value: R) => EitherType<L, B>) =>
  (either: EitherType<L, R>): EitherType<L, B> => {
    return isRight(either) ? fn(either.right) : left(either.left);
  };

/**
 * 折叠Either值，处理两种情况
 */
export const fold =
  <L, R, B>(onLeft: (left: L) => B, onRight: (right: R) => B) =>
  (either: EitherType<L, R>): B => {
    return isLeft(either) ? onLeft(either.left) : onRight(either.right);
  };

/**
 * 获取Right值，如果是Left则返回默认值
 */
export const getOrElse =
  <R>(defaultValue: R) =>
  <L>(either: EitherType<L, R>): R => {
    return isRight(either) ? either.right : defaultValue;
  };

/**
 * 获取Right值，如果是Left则使用函数计算默认值
 */
export const getOrElseW =
  <L, R, B>(onLeft: (left: L) => B) =>
  (either: EitherType<L, R>): R | B => {
    return isLeft(either) ? onLeft(either.left) : either.right;
  };

/**
 * 尝试执行函数，捕获异常并返回Either
 */
export const tryCatch = <E = Error, R = unknown>(
  fn: () => R,
  onError?: (error: unknown) => E
): EitherType<E, R> => {
  try {
    return right(fn());
  } catch (error) {
    const errorValue = onError ? onError(error) : (error as E);
    return left(errorValue);
  }
};

/**
 * 异步版本的tryCatch
 */
export const tryCatchAsync = async <E = Error, R = unknown>(
  fn: () => Promise<R>,
  onError?: (error: unknown) => E
): Promise<EitherType<E, R>> => {
  try {
    const result = await fn();
    return right(result);
  } catch (error) {
    const errorValue = onError ? onError(error) : (error as E);
    return left(errorValue);
  }
};

/**
 * 从可能抛出异常的函数创建Either返回的函数
 */
export const fromThrowable =
  <T extends any[], R, E = Error>(
    fn: (...args: T) => R,
    onError?: (error: unknown) => E
  ) =>
  (...args: T): EitherType<E, R> => {
    return tryCatch(() => fn(...args), onError);
  };

/**
 * 异步版本的fromThrowable
 */
export const fromThrowableAsync =
  <T extends any[], R, E = Error>(
    fn: (...args: T) => Promise<R>,
    onError?: (error: unknown) => E
  ) =>
  async (...args: T): Promise<EitherType<E, R>> => {
    return tryCatchAsync(() => fn(...args), onError);
  };

/**
 * 序列化Either数组，如果所有都是Right则返回Right数组，否则返回第一个Left
 */
export const sequence = <L, R>(
  eithers: EitherType<L, R>[]
): EitherType<L, R[]> => {
  const results: R[] = [];

  for (const either of eithers) {
    if (isLeft(either)) {
      return either;
    }
    results.push(either.right);
  }

  return right(results);
};

/**
 * 遍历数组并应用返回Either的函数，序列化结果
 */
export const traverse =
  <L, A, B>(fn: (value: A) => EitherType<L, B>) =>
  (array: A[]): EitherType<L, B[]> => {
    return sequence(array.map(fn));
  };

/**
 * flatMap别名 - 与其他函数式库保持一致
 */
export const flatMap = chain;

/**
 * 过滤Either值，如果是Right且满足条件则保持，否则转为Left
 */
export const filter =
  <L, R>(predicate: (value: R) => boolean, onFalse: () => L) =>
  (either: EitherType<L, R>): EitherType<L, R> => {
    return isRight(either) && predicate(either.right)
      ? either
      : left(onFalse());
  };

/**
 * 双向映射，同时处理Left和Right
 */
export const bimap =
  <L, R, L2, R2>(onLeft: (left: L) => L2, onRight: (right: R) => R2) =>
  (either: EitherType<L, R>): EitherType<L2, R2> => {
    return isLeft(either)
      ? left(onLeft(either.left))
      : right(onRight(either.right));
  };

/**
 * 应用函子 - 应用包装在Either中的函数
 */
export const ap =
  <L, A, B>(eitherFn: EitherType<L, (a: A) => B>) =>
  (either: EitherType<L, A>): EitherType<L, B> => {
    return isRight(eitherFn) && isRight(either)
      ? right(eitherFn.right(either.right))
      : isLeft(eitherFn)
        ? left(eitherFn.left)
        : left((either as Left<L>).left);
  };

/**
 * 提升函数到Either上下文
 */
export const lift =
  <A, B>(fn: (a: A) => B) =>
  <L>(either: EitherType<L, A>): EitherType<L, B> => {
    return isRight(either) ? right(fn(either.right)) : left(either.left);
  };

/**
 * 提升二元函数到Either上下文
 */
export const lift2 =
  <A, B, C>(fn: (a: A, b: B) => C) =>
  <L>(
    eitherA: EitherType<L, A>,
    eitherB: EitherType<L, B>
  ): EitherType<L, C> => {
    if (isRight(eitherA) && isRight(eitherB)) {
      return right(fn(eitherA.right, eitherB.right));
    }
    if (isLeft(eitherA)) {
      return left(eitherA.left);
    }
    return left((eitherB as Left<L>).left);
  };

/**
 * 提升三元函数到Either上下文
 */
export const lift3 =
  <A, B, C, D>(fn: (a: A, b: B, c: C) => D) =>
  <L>(
    eitherA: EitherType<L, A>,
    eitherB: EitherType<L, B>,
    eitherC: EitherType<L, C>
  ): EitherType<L, D> => {
    if (isRight(eitherA) && isRight(eitherB) && isRight(eitherC)) {
      return right(fn(eitherA.right, eitherB.right, eitherC.right));
    }
    return isLeft(eitherA)
      ? eitherA
      : isLeft(eitherB)
        ? eitherB
        : (eitherC as EitherType<L, D>);
  };

/**
 * Either的交换 - 将Left变为Right，Right变为Left
 */
export const swap = <L, R>(either: EitherType<L, R>): EitherType<R, L> => {
  return isLeft(either) ? right(either.left) : left(either.right);
};

/**
 * 组合多个Either值，全部成功才返回成功
 */
export const all = <L, R>(
  eithers: EitherType<L, R>[]
): EitherType<L[], R[]> => {
  const rights: R[] = [];
  const lefts: L[] = [];

  for (const either of eithers) {
    if (isLeft(either)) {
      lefts.push(either.left);
    } else {
      rights.push(either.right);
    }
  }

  return lefts.length > 0 ? left(lefts) : right(rights);
};

/**
 * 并行处理Either数组，收集所有错误
 */
export const sequenceParallel = async <L, R>(
  eithers: Promise<EitherType<L, R>>[]
): Promise<EitherType<L[], R[]>> => {
  const results = await Promise.allSettled(eithers);
  const rights: R[] = [];
  const lefts: L[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const either = result.value;
      if (isLeft(either)) {
        lefts.push(either.left);
      } else {
        rights.push(either.right);
      }
    } else {
      // Promise被拒绝，视为Left
      lefts.push(result.reason as L);
    }
  }

  return lefts.length > 0 ? left(lefts) : right(rights);
};

/**
 * Either的JSON序列化支持
 */
export const toJSON = <L, R>(
  either: EitherType<L, R>
): { _tag: 'Left' | 'Right'; value: L | R } => {
  return isLeft(either)
    ? { _tag: 'Left', value: either.left }
    : { _tag: 'Right', value: either.right };
};

/**
 * 从JSON反序列化Either
 */
export const fromJSON = <L, R>(json: {
  _tag: 'Left' | 'Right';
  value: L | R;
}): EitherType<L, R> => {
  return json._tag === 'Left' ? left(json.value as L) : right(json.value as R);
};

/**
 * Either验证链 - 连续应用多个验证函数
 */
export const validate = <T>(
  value: T,
  ...validators: Array<(value: T) => EitherType<string, T>>
): EitherType<string, T> => {
  let result: EitherType<string, T> = right(value);

  for (const validator of validators) {
    result = chain(validator)(result);
    if (isLeft(result)) {
      break;
    }
  }

  return result;
};

/**
 * Either的do记法 - 支持类似Haskell的do记法
 */
export const Do = <L>() => {
  return {
    bind: <K extends string, R>(key: K, either: EitherType<L, R>) => ({
      ...Do<L>(),
      [key]: either
    }),

    map:
      <R>(fn: (bindings: any) => R) =>
      (bindings: any): EitherType<L, R> => {
        // 检查所有绑定是否都是Right
        for (const [_, value] of Object.entries(bindings)) {
          if (isLeft(value as EitherType<L, any>)) {
            return value as EitherType<L, R>;
          }
        }

        // 提取所有Right值
        const extracted: any = {};
        for (const [key, value] of Object.entries(bindings)) {
          extracted[key] = (value as Right<any>).right;
        }

        return right(fn(extracted));
      }
  };
};
