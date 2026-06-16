/**
 * 函数式编程核心类型定义
 */

import { Either } from './either.js';

/**
 * Maybe类型 - 用于空值处理
 * 表示一个值可能存在（Some）或不存在（None）
 */
export type Maybe<T> = Some<T> | None;

export interface Some<T> {
  readonly _tag: 'Some';
  readonly value: T;
}

export interface None {
  readonly _tag: 'None';
}

/**
 * 函数组合工具类型
 */
export type Pipe = {
  <A>(value: A): A;
  <A, B>(value: A, fn1: (a: A) => B): B;
  <A, B, C>(value: A, fn1: (a: A) => B, fn2: (b: B) => C): C;
  <A, B, C, D>(
    value: A,
    fn1: (a: A) => B,
    fn2: (b: B) => C,
    fn3: (c: C) => D
  ): D;
  <A, B, C, D, E>(
    value: A,
    fn1: (a: A) => B,
    fn2: (b: B) => C,
    fn3: (c: C) => D,
    fn4: (d: D) => E
  ): E;
  <A, B, C, D, E, F>(
    value: A,
    fn1: (a: A) => B,
    fn2: (b: B) => C,
    fn3: (c: C) => D,
    fn4: (d: D) => E,
    fn5: (e: E) => F
  ): F;
};

/**
 * 柯里化函数类型
 */
export type Curry2<A, B, C> = (a: A) => (b: B) => C;
export type Curry3<A, B, C, D> = (a: A) => (b: B) => (c: C) => D;
export type Curry4<A, B, C, D, E> = (a: A) => (b: B) => (c: C) => (d: D) => E;

/**
 * 高阶函数装饰器类型
 */
export type WithRetry = <T extends any[], R>(
  retries: number,
  delay?: number
) => (fn: (...args: T) => Promise<R>) => (...args: T) => Promise<R>;

export type WithCache = <T extends any[], R>(
  cacheKey: (...args: T) => string
) => (fn: (...args: T) => Promise<R>) => (...args: T) => Promise<R>;

export type WithLogging = <T extends any[], R>(
  logger: { info: (msg: string) => void; error: (msg: string) => void },
  operationName: string
) => (fn: (...args: T) => Promise<R>) => (...args: T) => Promise<R>;

/**
 * 函数式验证器类型
 */
export type Validator<T> = (value: T) => Either<string, T>;

/**
 * 函数式转换器类型
 */
export type Transformer<A, B> = (value: A) => B;

/**
 * 函数式谓词类型
 */
export type Predicate<T> = (value: T) => boolean;

/**
 * 函数式映射器类型
 */
export type Mapper<A, B> = (value: A) => B;

/**
 * 函数式归约器类型
 */
export type Reducer<T, R> = (accumulator: R, current: T) => R;

/**
 * 函数式过滤器类型
 */
export type Filter<T> = Predicate<T>;

/**
 * 异步函数类型
 */
export type AsyncFunction<T extends any[], R> = (...args: T) => Promise<R>;

/**
 * 同步函数类型
 */
export type SyncFunction<T extends any[], R> = (...args: T) => R;

/**
 * 通用函数类型
 */
export type AnyFunction = (...args: any[]) => any;

/**
 * 记忆化缓存接口
 */
export interface MemoCache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
}

/**
 * 记忆化选项
 */
export interface MemoOptions<T extends any[]> {
  cache?: MemoCache<string, any>;
  keyGenerator?: (...args: T) => string;
  maxSize?: number;
  ttl?: number;
}

/**
 * 品牌类型定义
 */
export type Brand<T, B> = T & { readonly __brand: B };
export type BrandConstructor<T, B> = (value: T) => Brand<T, B>;
export type BrandValidator<T> = (value: unknown) => value is T;

/**
 * 流类型定义
 */
export interface Stream<T> {
  map<U>(fn: (value: T) => U): Stream<U>;
  filter(predicate: (value: T) => boolean): Stream<T>;
  flatMap<U>(fn: (value: T) => Stream<U>): Stream<U>;
  take(count: number): Stream<T>;
  skip(count: number): Stream<T>;
  reduce<U>(reducer: (acc: U, current: T) => U, initial: U): U;
  toArray(): T[];
  forEach(action: (value: T) => void): void;
  [Symbol.iterator](): Iterator<T>;
}

export interface AsyncStream<T> {
  map<U>(fn: (value: T) => U | Promise<U>): AsyncStream<U>;
  filter(predicate: (value: T) => boolean | Promise<boolean>): AsyncStream<T>;
  flatMap<U>(fn: (value: T) => AsyncStream<U>): AsyncStream<U>;
  take(count: number): AsyncStream<T>;
  reduce<U>(
    reducer: (acc: U, current: T) => U | Promise<U>,
    initial: U
  ): Promise<U>;
  toArray(): Promise<T[]>;
  forEach(action: (value: T) => void | Promise<void>): Promise<void>;
  [Symbol.asyncIterator](): AsyncIterator<T>;
}

/**
 * 性能监控类型
 */
export interface PerformanceOptions {
  name?: string;
  logger?: { info: (msg: string) => void; warn: (msg: string) => void };
  slowThreshold?: number;
}

/**
 * 缓存选项类型
 */
export interface CacheOptions<T extends any[]> {
  maxSize?: number;
  ttl?: number;
  keyGenerator?: (...args: T) => string;
}

/**
 * 并发控制类型
 */
export interface ConcurrencyController {
  execute<Args extends any[], R>(
    fn: (...args: Args) => Promise<R>,
    ...args: Args
  ): Promise<R>;
}

/**
 * 批处理器类型
 */
export interface BatchProcessor<T> {
  add(item: T): void;
  flush(): Promise<void>;
}

/**
 * 高级类型推导工具类型
 */

/**
 * 函数参数类型推导
 */
export type Parameters<T extends (...args: any) => any> = T extends (
  ...args: infer P
) => any
  ? P
  : never;

/**
 * 函数返回类型推导
 */
export type ReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer R
  ? R
  : any;

/**
 * 高级柯里化类型 - 递归类型推导
 */
export type CurryFunction<T extends any[], R> = T extends []
  ? R
  : T extends [infer H, ...infer Rest]
    ? (arg: H) => CurryFunction<Rest, R>
    : never;

/**
 * 部分应用类型推导
 */
export type PartiallyApplied<
  T extends AnyFunction,
  U extends any[]
> = T extends (...args: [...infer P, ...infer R]) => infer Return
  ? U extends [...infer Applied, ...infer _]
    ? Applied extends P
      ? (...args: R) => Return
      : never
    : never
  : never;

/**
 * 管道函数类型推导
 */
export type PipeFunction<T> = T extends [
  (arg: infer A) => infer B,
  ...infer Rest
]
  ? Rest extends [(arg: B) => any, ...any[]]
    ? PipeFunction<Rest> extends (arg: B) => infer C
      ? (arg: A) => C
      : never
    : (arg: A) => B
  : never;

/**
 * 组合函数类型推导
 */
export type ComposeFunction<T> = T extends [
  ...infer Rest,
  (arg: infer A) => infer B
]
  ? Rest extends [...any[], (arg: any) => A]
    ? ComposeFunction<Rest> extends (arg: infer C) => A
      ? (arg: C) => B
      : never
    : (arg: A) => B
  : never;

/**
 * 柯里化函数头部类型提取
 */
export type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;

/**
 * 柯里化函数尾部类型提取
 */
export type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : [];

/**
 * 类型安全的柯里化函数定义
 */
export type TypeSafeCurry<F extends AnyFunction> = F extends (
  ...args: infer Args
) => infer Return
  ? CurryFunction<Args, Return>
  : never;

/**
 * 延迟执行的函数类型
 */
export type LazyFunction<T extends AnyFunction> = {
  (): LazyFunction<T>;
  force: () => ReturnType<T>;
  isForced: () => boolean;
};

/**
 * 记忆化函数类型
 */
export type MemoizedFunction<T extends AnyFunction> = T & {
  cache: Map<string, ReturnType<T>>;
  clear: () => void;
};

/**
 * 函数组合器类型
 */
export type FunctionCombinator<T extends AnyFunction, R = ReturnType<T>> = (
  fn: T
) => (...args: Parameters<T>) => R;

/**
 * 高阶函数类型
 */
export type HigherOrderFunction<
  T extends AnyFunction,
  U extends AnyFunction
> = (fn: T) => U;

/**
 * 深层类型安全的对象路径
 */
export type PathKeys<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T]-?: K extends string | number
          ? T[K] extends object
            ? `${K}` | `${K}.${PathKeys<T[K], Prev[D]>}`
            : `${K}`
          : never;
      }[keyof T]
    : never;

type Prev = [
  never,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  ...0[]
];

/**
 * 从路径获取类型
 */
export type PathValue<
  T,
  P extends string
> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends PathKeys<T[Key]>
      ? PathValue<T[Key], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never;

/**
 * 函数式透镜类型
 */
export type Lens<S, A> = {
  get: (source: S) => A;
  set: (value: A) => (source: S) => S;
};

/**
 * 高级函数式工具类型集合
 */
export interface FunctionalUtils {
  curry: <T extends AnyFunction>(fn: T) => TypeSafeCurry<T>;
  compose: <T extends AnyFunction[]>(...fns: T) => ComposeFunction<T>;
  pipe: <T extends AnyFunction[]>(...fns: T) => PipeFunction<T>;
  memoize: <T extends AnyFunction>(fn: T) => MemoizedFunction<T>;
  debounce: <T extends AnyFunction>(fn: T, delay: number) => T;
  throttle: <T extends AnyFunction>(fn: T, delay: number) => T;
}

/**
 * 类型级别的数学运算
 */
export type Add<A extends number, B extends number> = [
  ...Tuple<A>,
  ...Tuple<B>
]['length'] extends number
  ? [...Tuple<A>, ...Tuple<B>]['length']
  : never;

export type Subtract<A extends number, B extends number> =
  Tuple<A> extends [...infer Rest, ...Tuple<B>]
    ? Rest['length'] extends number
      ? Rest['length']
      : never
    : never;

type Tuple<T extends number, R extends unknown[] = []> = R['length'] extends T
  ? R
  : Tuple<T, [...R, unknown]>;

/**
 * 条件类型工具
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;
export type Not<T extends boolean> = T extends true ? false : true;
export type And<A extends boolean, B extends boolean> = A extends true
  ? B
  : false;
export type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B;

/**
 * 字符串操作类型
 */
export type Split<
  S extends string,
  D extends string
> = S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S];

export type Join<T extends string[], D extends string> = T extends [
  infer F extends string,
  ...infer R extends string[]
]
  ? R extends []
    ? F
    : `${F}${D}${Join<R, D>}`
  : '';

/**
 * 数组操作类型
 */
export type Length<T extends any[]> = T['length'];
export type First<T extends any[]> = T extends [infer F, ...any[]] ? F : never;
export type Last<T extends any[]> = T extends [...any[], infer L] ? L : never;
export type Reverse<T extends any[]> = T extends [...infer Rest, infer Last]
  ? [Last, ...Reverse<Rest>]
  : [];

/**
 * 对象操作类型
 */
export type Keys<T> = keyof T;
export type Values<T> = T[keyof T];
export type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T];

/**
 * 深度操作类型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};
