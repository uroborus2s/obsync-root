/**
 * 流式处理工具库 - 提供延迟计算和函数式数据处理
 */

import { type AsyncStream, type Stream } from './types.js';

// 重新导出类型
export type { AsyncStream, Stream };

/**
 * 同步流实现
 */
class StreamImpl<T> implements Stream<T> {
  constructor(private readonly iterator: () => Iterator<T>) {}

  map<U>(fn: (value: T) => U): Stream<U> {
    return new StreamImpl(() => {
      const it = this.iterator();
      return {
        next(): IteratorResult<U> {
          const result = it.next();
          if (result.done) {
            return { done: true, value: undefined };
          }
          return { done: false, value: fn(result.value) };
        }
      };
    });
  }

  filter(predicate: (value: T) => boolean): Stream<T> {
    return new StreamImpl(() => {
      const it = this.iterator();
      return {
        next(): IteratorResult<T> {
          while (true) {
            const result = it.next();
            if (result.done) {
              return { done: true, value: undefined };
            }
            if (predicate(result.value)) {
              return result;
            }
          }
        }
      };
    });
  }

  flatMap<U>(fn: (value: T) => Stream<U>): Stream<U> {
    return new StreamImpl(() => {
      const outerIt = this.iterator();
      let innerIt: Iterator<U> | null = null;

      return {
        next(): IteratorResult<U> {
          while (true) {
            if (innerIt) {
              const innerResult = innerIt.next();
              if (!innerResult.done) {
                return innerResult;
              }
              innerIt = null;
            }

            const outerResult = outerIt.next();
            if (outerResult.done) {
              return { done: true, value: undefined };
            }

            const innerStream = fn(outerResult.value);
            innerIt = innerStream[Symbol.iterator]();
          }
        }
      };
    });
  }

  take(count: number): Stream<T> {
    return new StreamImpl(() => {
      const it = this.iterator();
      let taken = 0;

      return {
        next(): IteratorResult<T> {
          if (taken >= count) {
            return { done: true, value: undefined };
          }
          taken++;
          return it.next();
        }
      };
    });
  }

  skip(count: number): Stream<T> {
    return new StreamImpl(() => {
      const it = this.iterator();
      let skipped = 0;

      return {
        next(): IteratorResult<T> {
          while (skipped < count) {
            const result = it.next();
            if (result.done) {
              return { done: true, value: undefined };
            }
            skipped++;
          }
          return it.next();
        }
      };
    });
  }

  reduce<U>(reducer: (acc: U, current: T) => U, initial: U): U {
    let accumulator = initial;
    const it = this.iterator();

    while (true) {
      const result = it.next();
      if (result.done) break;
      accumulator = reducer(accumulator, result.value);
    }

    return accumulator;
  }

  toArray(): T[] {
    const result: T[] = [];
    const it = this.iterator();

    while (true) {
      const next = it.next();
      if (next.done) break;
      result.push(next.value);
    }

    return result;
  }

  forEach(action: (value: T) => void): void {
    const it = this.iterator();

    while (true) {
      const result = it.next();
      if (result.done) break;
      action(result.value);
    }
  }

  [Symbol.iterator](): Iterator<T> {
    return this.iterator();
  }
}

/**
 * 异步流实现
 */
class AsyncStreamImpl<T> implements AsyncStream<T> {
  constructor(private readonly iterator: () => AsyncIterator<T>) {}

  map<U>(fn: (value: T) => U | Promise<U>): AsyncStream<U> {
    return new AsyncStreamImpl(
      async function* (this: AsyncStreamImpl<T>) {
        const it = this.iterator();

        while (true) {
          const result = await it.next();
          if (result.done) break;
          yield await fn(result.value);
        }
      }.bind(this)
    );
  }

  filter(predicate: (value: T) => boolean | Promise<boolean>): AsyncStream<T> {
    return new AsyncStreamImpl(
      async function* (this: AsyncStreamImpl<T>) {
        const it = this.iterator();

        while (true) {
          const result = await it.next();
          if (result.done) break;
          if (await predicate(result.value)) {
            yield result.value;
          }
        }
      }.bind(this)
    );
  }

  flatMap<U>(fn: (value: T) => AsyncStream<U>): AsyncStream<U> {
    return new AsyncStreamImpl(
      async function* (this: AsyncStreamImpl<T>) {
        const it = this.iterator();

        while (true) {
          const result = await it.next();
          if (result.done) break;

          const innerStream = fn(result.value);
          const innerIt = innerStream[Symbol.asyncIterator]();

          while (true) {
            const innerResult = await innerIt.next();
            if (innerResult.done) break;
            yield innerResult.value;
          }
        }
      }.bind(this)
    );
  }

  take(count: number): AsyncStream<T> {
    return new AsyncStreamImpl(
      async function* (this: AsyncStreamImpl<T>) {
        const it = this.iterator();
        let taken = 0;

        while (taken < count) {
          const result = await it.next();
          if (result.done) break;
          yield result.value;
          taken++;
        }
      }.bind(this)
    );
  }

  async reduce<U>(
    reducer: (acc: U, current: T) => U | Promise<U>,
    initial: U
  ): Promise<U> {
    let accumulator = initial;
    const it = this.iterator();

    while (true) {
      const result = await it.next();
      if (result.done) break;
      accumulator = await reducer(accumulator, result.value);
    }

    return accumulator;
  }

  async toArray(): Promise<T[]> {
    const result: T[] = [];
    const it = this.iterator();

    while (true) {
      const next = await it.next();
      if (next.done) break;
      result.push(next.value);
    }

    return result;
  }

  async forEach(action: (value: T) => void | Promise<void>): Promise<void> {
    const it = this.iterator();

    while (true) {
      const result = await it.next();
      if (result.done) break;
      await action(result.value);
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.iterator();
  }
}

/**
 * 流创建函数
 */

// 从数组创建流
export const fromArray = <T>(array: T[]): Stream<T> => {
  return new StreamImpl(() => {
    let index = 0;
    return {
      next(): IteratorResult<T> {
        if (index >= array.length) {
          return { done: true, value: undefined };
        }
        return { done: false, value: array[index++] };
      }
    };
  });
};

// 从生成器创建流
export const fromGenerator = <T>(generator: () => Generator<T>): Stream<T> => {
  return new StreamImpl(() => generator());
};

// 从Promise数组创建异步流
export const fromPromises = <T>(promises: Promise<T>[]): AsyncStream<T> => {
  return new AsyncStreamImpl(async function* () {
    for (const promise of promises) {
      yield await promise;
    }
  });
};

// 从异步生成器创建异步流
export const fromAsyncGenerator = <T>(
  generator: () => AsyncGenerator<T>
): AsyncStream<T> => {
  return new AsyncStreamImpl(() => generator());
};

// 范围流
export const range = (
  start: number,
  end?: number,
  step = 1
): Stream<number> => {
  return new StreamImpl(function* () {
    if (end === undefined) {
      end = start;
      start = 0;
    }

    for (let i = start; i < end; i += step) {
      yield i;
    }
  });
};

// 重复流
export const repeat = <T>(value: T, count?: number): Stream<T> => {
  return new StreamImpl(function* () {
    if (count === undefined) {
      while (true) {
        yield value;
      }
    } else {
      for (let i = 0; i < count; i++) {
        yield value;
      }
    }
  });
};

// 循环流
export const cycle = <T>(array: T[]): Stream<T> => {
  return new StreamImpl(function* () {
    if (array.length === 0) return;

    while (true) {
      for (const item of array) {
        yield item;
      }
    }
  });
};

// 斐波那契数列流
export const fibonacci = (): Stream<number> => {
  return new StreamImpl(function* () {
    let a = 0,
      b = 1;
    yield a;
    yield b;

    while (true) {
      const next = a + b;
      yield next;
      a = b;
      b = next;
    }
  });
};

// 质数流
export const primes = (): Stream<number> => {
  return new StreamImpl(function* () {
    yield 2;

    const sieve = new Set<number>();

    for (let candidate = 3; ; candidate += 2) {
      let isPrime = true;

      for (const prime of sieve) {
        if (prime * prime > candidate) break;
        if (candidate % prime === 0) {
          isPrime = false;
          break;
        }
      }

      if (isPrime) {
        sieve.add(candidate);
        yield candidate;
      }
    }
  });
};

/**
 * 流组合函数
 */

// 合并多个流
export const merge = <T>(...streams: Stream<T>[]): Stream<T> => {
  return new StreamImpl(function* () {
    const iterators = streams.map((s) => s[Symbol.iterator]());

    while (iterators.length > 0) {
      for (let i = iterators.length - 1; i >= 0; i--) {
        const result = iterators[i].next();
        if (result.done) {
          iterators.splice(i, 1);
        } else {
          yield result.value;
        }
      }
    }
  });
};

// 交错合并流
export const interleave = <T>(...streams: Stream<T>[]): Stream<T> => {
  return new StreamImpl(function* () {
    const iterators = streams.map((s) => s[Symbol.iterator]());

    while (iterators.length > 0) {
      for (let i = iterators.length - 1; i >= 0; i--) {
        const result = iterators[i].next();
        if (result.done) {
          iterators.splice(i, 1);
        } else {
          yield result.value;
          break;
        }
      }
    }
  });
};

// 分组
export const groupBy = <T, K>(
  stream: Stream<T>,
  keySelector: (value: T) => K
): Stream<[K, T[]]> => {
  return new StreamImpl(function* () {
    const groups = new Map<K, T[]>();

    stream.forEach((value) => {
      const key = keySelector(value);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(value);
    });

    for (const [key, values] of groups) {
      yield [key, values];
    }
  });
};

// 分块
export const chunk = <T>(stream: Stream<T>, size: number): Stream<T[]> => {
  return new StreamImpl(function* () {
    const it = stream[Symbol.iterator]();

    while (true) {
      const chunk: T[] = [];

      for (let i = 0; i < size; i++) {
        const result = it.next();
        if (result.done) {
          if (chunk.length > 0) {
            yield chunk;
          }
          return;
        }
        chunk.push(result.value);
      }

      yield chunk;
    }
  });
};

// 滑动窗口
export const window = <T>(stream: Stream<T>, size: number): Stream<T[]> => {
  return new StreamImpl(function* () {
    const buffer: T[] = [];

    for (const value of stream) {
      buffer.push(value);

      if (buffer.length === size) {
        yield [...buffer];
        buffer.shift();
      }
    }
  });
};

// 去重
export const distinct = <T>(stream: Stream<T>): Stream<T> => {
  return new StreamImpl(function* () {
    const seen = new Set<T>();

    for (const value of stream) {
      if (!seen.has(value)) {
        seen.add(value);
        yield value;
      }
    }
  });
};

// 排序
export const sort = <T>(
  stream: Stream<T>,
  compareFn?: (a: T, b: T) => number
): Stream<T> => {
  return fromArray(stream.toArray().sort(compareFn));
};

// 延迟
export const delay = <T>(
  stream: AsyncStream<T>,
  ms: number
): AsyncStream<T> => {
  return new AsyncStreamImpl(async function* () {
    for await (const value of stream) {
      await new Promise((resolve) => setTimeout(resolve, ms));
      yield value;
    }
  });
};

/**
 * 流管道操作符
 */
export const streamPipe = <T>(stream: Stream<T>) => ({
  map: <U>(fn: (value: T) => U) => streamPipe(stream.map(fn)),
  filter: (predicate: (value: T) => boolean) =>
    streamPipe(stream.filter(predicate)),
  take: (count: number) => streamPipe(stream.take(count)),
  skip: (count: number) => streamPipe(stream.skip(count)),
  toArray: () => stream.toArray(),
  get: () => stream
});

export const asyncStreamPipe = <T>(stream: AsyncStream<T>) => ({
  map: <U>(fn: (value: T) => U | Promise<U>) => asyncStreamPipe(stream.map(fn)),
  filter: (predicate: (value: T) => boolean | Promise<boolean>) =>
    asyncStreamPipe(stream.filter(predicate)),
  take: (count: number) => asyncStreamPipe(stream.take(count)),
  toArray: () => stream.toArray(),
  get: () => stream
});
