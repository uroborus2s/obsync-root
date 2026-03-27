/**
 * Lens和Optics实现 - 不可变数据更新工具
 * 提供类型安全的嵌套对象操作能力
 */

/**
 * Lens类型定义
 */
export interface Lens<S, A> {
  get: (source: S) => A;
  set: (value: A) => (source: S) => S;
}

/**
 * Prism类型定义 - 用于可选值的操作
 */
export interface Prism<S, A> {
  getOption: (source: S) => A | undefined;
  set: (value: A) => (source: S) => S;
}

/**
 * Traversal类型定义 - 用于集合操作
 */
export interface Traversal<S, A> {
  getAll: (source: S) => A[];
  modify: (fn: (value: A) => A) => (source: S) => S;
}

/**
 * Iso类型定义 - 同构类型转换
 */
export interface Iso<S, A> {
  from: (source: S) => A;
  to: (value: A) => S;
}

/**
 * 创建简单属性Lens
 */
export function lensProp<T, K extends keyof T>(prop: K): Lens<T, T[K]> {
  return {
    get: (source: T) => source[prop],
    set: (value: T[K]) => (source: T) => ({ ...source, [prop]: value })
  };
}

/**
 * 创建路径Lens
 */
export function lensPath<T>(path: string[]): Lens<T, any> {
  return {
    get: (source: T) => {
      return path.reduce((current: any, key) => current?.[key], source);
    },
    set: (value: any) => (source: T) => {
      if (path.length === 0) return value;

      const setNested = (obj: any, keys: string[], val: any): any => {
        if (keys.length === 1) {
          return { ...obj, [keys[0]]: val };
        }

        const [head, ...tail] = keys;
        return {
          ...obj,
          [head]: setNested(obj[head] || {}, tail, val)
        };
      };

      return setNested(source, path, value) as T;
    }
  };
}

/**
 * 创建索引Lens
 */
export function lensIndex<T>(index: number): Lens<T[], T | undefined> {
  return {
    get: (source: T[]) => source[index],
    set: (value: T | undefined) => (source: T[]) => {
      const newArray = [...source];
      if (value !== undefined) {
        newArray[index] = value;
      }
      return newArray;
    }
  };
}

/**
 * Lens组合
 */
export function composeLens<A, B, C>(
  outer: Lens<A, B>,
  inner: Lens<B, C>
): Lens<A, C> {
  return {
    get: (source: A) => inner.get(outer.get(source)),
    set: (value: C) => (source: A) => {
      const outerValue = outer.get(source);
      const newInnerValue = inner.set(value)(outerValue);
      return outer.set(newInnerValue)(source);
    }
  };
}

/**
 * 修改操作 - 使用函数更新值
 */
export function modify<S, A>(lens: Lens<S, A>, fn: (value: A) => A) {
  return (source: S): S => {
    const currentValue = lens.get(source);
    const newValue = fn(currentValue);
    return lens.set(newValue)(source);
  };
}

/**
 * 视图操作 - 获取值
 */
export function view<S, A>(lens: Lens<S, A>) {
  return (source: S): A => lens.get(source);
}

/**
 * 设置操作 - 设置值
 */
export function set<S, A>(lens: Lens<S, A>, value: A) {
  return (source: S): S => lens.set(value)(source);
}

/**
 * 创建数组Prism
 */
export function prismArray<T>(): Prism<(T | undefined)[], T[]> {
  return {
    getOption: (source: (T | undefined)[]) => {
      const filtered = source.filter((x): x is T => x !== undefined);
      return filtered.length === source.length ? filtered : undefined;
    },
    set: (value: T[]) => () => value
  };
}

/**
 * 创建可选值Prism
 */
export function prismOptional<T>(): Prism<T | undefined, T> {
  return {
    getOption: (source: T | undefined) => source,
    set: (value: T) => () => value
  };
}

/**
 * 创建数组Traversal
 */
export function traversalArray<T>(): Traversal<T[], T> {
  return {
    getAll: (source: T[]) => [...source],
    modify: (fn: (value: T) => T) => (source: T[]) => source.map(fn)
  };
}

/**
 * 创建对象值Traversal
 */
export function traversalValues<T>(): Traversal<Record<string, T>, T> {
  return {
    getAll: (source: Record<string, T>) => Object.values(source),
    modify: (fn: (value: T) => T) => (source: Record<string, T>) => {
      const result: Record<string, T> = {};
      for (const [key, value] of Object.entries(source)) {
        result[key] = fn(value);
      }
      return result;
    }
  };
}

/**
 * 创建过滤Traversal
 */
export function traversalFilter<T>(
  predicate: (value: T) => boolean
): Traversal<T[], T> {
  return {
    getAll: (source: T[]) => source.filter(predicate),
    modify: (fn: (value: T) => T) => (source: T[]) =>
      source.map((x) => (predicate(x) ? fn(x) : x))
  };
}

/**
 * 创建Iso
 */
export function iso<S, A>(
  from: (source: S) => A,
  to: (value: A) => S
): Iso<S, A> {
  return { from, to };
}

/**
 * Lens工具类
 */
export class LensBuilder<T> {
  constructor(private readonly lens: Lens<T, any>) {}

  /**
   * 聚焦到属性
   */
  focus<K extends keyof any>(prop: K): LensBuilder<T> {
    return new LensBuilder(composeLens(this.lens, lensProp(prop)));
  }

  /**
   * 聚焦到路径
   */
  focusPath(path: string[]): LensBuilder<T> {
    return new LensBuilder(composeLens(this.lens, lensPath(path)));
  }

  /**
   * 聚焦到索引
   */
  focusIndex(index: number): LensBuilder<T> {
    return new LensBuilder(composeLens(this.lens, lensIndex(index)));
  }

  /**
   * 获取值
   */
  get(source: T): any {
    return this.lens.get(source);
  }

  /**
   * 设置值
   */
  set(value: any): (source: T) => T {
    return this.lens.set(value);
  }

  /**
   * 修改值
   */
  modify(fn: (value: any) => any): (source: T) => T {
    return modify(this.lens, fn);
  }

  /**
   * 获取Lens
   */
  build(): Lens<T, any> {
    return this.lens;
  }
}

/**
 * 创建Lens构建器
 */
export function lensBuilder<T>(): LensBuilder<T> {
  // 身份Lens
  const identityLens: Lens<T, T> = {
    get: (source: T) => source,
    set: (value: T) => () => value
  };
  return new LensBuilder(identityLens);
}

/**
 * 函数式更新工具
 */
export const update = {
  /**
   * 更新对象属性
   */
  prop:
    <T, K extends keyof T>(prop: K, value: T[K]) =>
    (obj: T): T => ({ ...obj, [prop]: value }),

  /**
   * 修改对象属性
   */
  modifyProp:
    <T, K extends keyof T>(prop: K, fn: (value: T[K]) => T[K]) =>
    (obj: T): T => ({ ...obj, [prop]: fn(obj[prop]) }),

  /**
   * 更新数组元素
   */
  index:
    <T>(index: number, value: T) =>
    (arr: T[]): T[] => {
      const newArr = [...arr];
      newArr[index] = value;
      return newArr;
    },

  /**
   * 修改数组元素
   */
  modifyIndex:
    <T>(index: number, fn: (value: T) => T) =>
    (arr: T[]): T[] => {
      const newArr = [...arr];
      newArr[index] = fn(newArr[index]);
      return newArr;
    },

  /**
   * 在数组末尾添加元素
   */
  append:
    <T>(value: T) =>
    (arr: T[]): T[] => [...arr, value],

  /**
   * 在数组开头添加元素
   */
  prepend:
    <T>(value: T) =>
    (arr: T[]): T[] => [value, ...arr],

  /**
   * 从数组中移除元素
   */
  remove:
    <T>(index: number) =>
    (arr: T[]): T[] =>
      arr.filter((_, i) => i !== index),

  /**
   * 深度合并对象
   */
  merge:
    <T extends Record<string, any>>(updates: Partial<T>) =>
    (obj: T): T => {
      const result = { ...obj };
      for (const [key, value] of Object.entries(updates)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key as keyof T] = { ...result[key as keyof T], ...value };
        } else {
          result[key as keyof T] = value;
        }
      }
      return result;
    }
};

/**
 * 不可变操作助手
 */
export const immutable = {
  /**
   * 设置嵌套属性
   */
  setIn:
    <T>(path: string[], value: any) =>
    (obj: T): T => {
      return lensPath<T>(path).set(value)(obj);
    },

  /**
   * 获取嵌套属性
   */
  getIn:
    <T>(path: string[]) =>
    (obj: T): any => {
      return lensPath<T>(path).get(obj);
    },

  /**
   * 更新嵌套属性
   */
  updateIn:
    <T>(path: string[], fn: (value: any) => any) =>
    (obj: T): T => {
      return modify(lensPath<T>(path), fn)(obj);
    },

  /**
   * 删除属性
   */
  deleteIn:
    <T>(path: string[]) =>
    (obj: T): T => {
      if (path.length === 0) return obj;
      if (path.length === 1) {
        const { [path[0]]: deleted, ...rest } = obj as any;
        return rest as T;
      }

      const [head, ...tail] = path;
      return {
        ...obj,
        [head]: immutable.deleteIn(tail)(obj[head as keyof T] as any)
      } as T;
    }
};

/**
 * 预定义的常用Lens
 */
export const commonLenses = {
  /**
   * 数组第一个元素
   */
  head: <T>(): Lens<T[], T | undefined> => lensIndex(0),

  /**
   * 数组最后一个元素
   */
  tail: <T>(): Lens<T[], T | undefined> => ({
    get: (arr: T[]) => arr[arr.length - 1],
    set: (value: T | undefined) => (arr: T[]) => {
      if (value === undefined) return arr.slice(0, -1);
      const newArr = [...arr];
      newArr[newArr.length - 1] = value;
      return newArr;
    }
  }),

  /**
   * 数组长度
   */
  length: <T>(): Lens<T[], number> => ({
    get: (arr: T[]) => arr.length,
    set: (length: number) => (arr: T[]) => {
      if (length < arr.length) {
        return arr.slice(0, length);
      } else {
        return [...arr, ...new Array(length - arr.length)];
      }
    }
  })
};
