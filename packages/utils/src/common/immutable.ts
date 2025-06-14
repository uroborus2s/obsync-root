/**
 * 不可变数据工具函数，提供对象和数组的不可变操作
 *
 * 此模块提供了对象和数组的不可变操作函数，使得在不修改原始数据的情况下
 * 创建数据的新副本并应用更改。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 不可变数据操作
 *
 * @packageDocumentation
 */

// 路径类型定义
export type Path = string | number | (string | number)[];

// ------------------- 数组不可变操作函数 -------------------

/**
 * 不可变地向数组末尾添加一个或多个元素
 *
 * @param array - 原始数组
 * @param elements - 要添加的元素
 * @returns 新数组
 */
export function immutablePush<T>(array: T[], ...elements: T[]): T[] {
  return [...array, ...elements];
}

/**
 * 不可变地从数组末尾移除一个元素
 *
 * @param array - 原始数组
 * @returns 新数组
 */
export function immutablePop<T>(array: T[]): T[] {
  return array.slice(0, -1);
}

/**
 * 不可变地向数组开头添加一个或多个元素
 *
 * @param array - 原始数组
 * @param elements - 要添加的元素
 * @returns 新数组
 */
export function immutableUnshift<T>(array: T[], ...elements: T[]): T[] {
  return [...elements, ...array];
}

/**
 * 不可变地从数组开头移除一个元素
 *
 * @param array - 原始数组
 * @returns 新数组
 */
export function immutableShift<T>(array: T[]): T[] {
  return array.slice(1);
}

/**
 * 不可变地反转数组
 *
 * @param array - 原始数组
 * @returns 新的反转后数组
 */
export function immutableReverse<T>(array: T[]): T[] {
  return [...array].reverse();
}

/**
 * 不可变地对数组进行排序
 *
 * @param array - 原始数组
 * @param compareFn - 比较函数
 * @returns 新的排序后数组
 */
export function immutableSort<T>(
  array: T[],
  compareFn?: (a: T, b: T) => number
): T[] {
  return [...array].sort(compareFn);
}

/**
 * 不可变地对数组进行splice操作
 *
 * @param array - 原始数组
 * @param start - 起始位置
 * @param deleteCount - 删除的元素数量
 * @param items - 插入的元素
 * @returns 新数组
 */
export function immutableSplice<T>(
  array: T[],
  start: number,
  deleteCount: number,
  ...items: T[]
): T[] {
  const result = [...array];
  result.splice(start, deleteCount, ...items);
  return result;
}

// ------------------- 对象不可变操作函数 -------------------

/**
 * 解析路径字符串、数字或路径数组
 *
 * @param path - 路径
 * @returns 标准化的路径数组
 */
function resolvePath(path: Path): (string | number)[] {
  if (Array.isArray(path)) {
    return path;
  }
  if (typeof path === 'number') {
    return [path];
  }
  return path.split('.');
}

/**
 * 不可变地设置对象的属性值
 *
 * @param obj - 原始对象
 * @param path - 属性路径
 * @param value - 要设置的值
 * @returns 新对象
 */
export function immutableSet<T extends Record<string, any>>(
  obj: T,
  path: Path,
  value: any
): T {
  const pathArray = resolvePath(path);

  if (pathArray.length === 0) {
    return value as unknown as T;
  }

  const result = { ...obj };
  let current = result;
  const lastIndex = pathArray.length - 1;

  for (let i = 0; i < lastIndex; i++) {
    const key = pathArray[i];
    const currentValue = current[key as keyof typeof current];

    if (Array.isArray(currentValue)) {
      current[key as keyof typeof current] = [...currentValue] as any;
    } else if (currentValue && typeof currentValue === 'object') {
      current[key as keyof typeof current] = { ...currentValue } as any;
    } else {
      current[key as keyof typeof current] = (
        typeof pathArray[i + 1] === 'number' ? [] : {}
      ) as any;
    }

    current = current[key as keyof typeof current];
  }

  const lastKey = pathArray[lastIndex];
  current[lastKey as keyof typeof current] = value;

  return result;
}

/**
 * 不可变地更新对象的属性值
 *
 * @param obj - 原始对象
 * @param path - 属性路径
 * @param updater - 更新函数
 * @returns 新对象
 */
export function immutableUpdate<T extends Record<string, any>>(
  obj: T,
  path: Path,
  updater: (value: any) => any
): T {
  const pathArray = resolvePath(path);

  const getValue = (obj: any, path: (string | number)[]): any => {
    let current = obj;
    for (const key of path) {
      if (current == null) return undefined;
      current = current[key];
    }
    return current;
  };

  const currentValue = getValue(obj, pathArray);
  return immutableSet(obj, path, updater(currentValue));
}

/**
 * 不可变地删除对象的属性
 *
 * @param obj - 原始对象
 * @param path - 要删除的属性路径
 * @returns 新对象
 */
export function immutableDelete<T extends Record<string, any>>(
  obj: T,
  path: Path
): T {
  const pathArray = resolvePath(path);

  if (pathArray.length === 0) {
    return {} as T;
  }

  if (pathArray.length === 1) {
    const [key] = pathArray;
    const { [key as string]: _, ...rest } = obj;
    return rest as T;
  }

  const parentPath = pathArray.slice(0, -1);
  const key = pathArray[pathArray.length - 1];

  return immutableUpdate(obj, parentPath, (parent) => {
    if (Array.isArray(parent)) {
      const result = [...parent];
      result.splice(key as number, 1);
      return result;
    } else {
      const { [key as string]: _, ...rest } = parent;
      return rest;
    }
  });
}

/**
 * 不可变地合并对象
 *
 * @param target - 目标对象
 * @param source - 源对象
 * @returns 合并后的新对象
 */
export function immutableMerge<T extends Record<string, any>>(
  target: T,
  source: Record<string, any>
): T {
  return { ...target, ...source };
}

/**
 * 不可变地深度合并对象
 *
 * @param target - 目标对象
 * @param source - 源对象
 * @returns 深度合并后的新对象
 */
export function immutableDeepMerge<T extends Record<string, any>>(
  target: T,
  source: Record<string, any>
): T {
  // 使用类型断言创建一个新对象，避免直接操作泛型类型T
  const result = { ...target } as Record<string, any>;

  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = immutableDeepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result as T;
}

/**
 * 浅冻结对象，使其不可修改
 * @param obj - 要冻结的对象
 * @returns 冻结后的对象
 */
export function freeze<T extends object>(obj: T): Readonly<T> {
  return Object.freeze(obj);
}

/**
 * 深度冻结对象及其所有属性，使其不可修改
 * @param obj - 要冻结的对象
 * @returns 深度冻结后的对象
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  // 冻结对象
  Object.freeze(obj);

  // 递归冻结所有属性
  for (const prop of Object.getOwnPropertyNames(obj)) {
    const value = (obj as any)[prop];
    if (
      value !== null &&
      (typeof value === 'object' || typeof value === 'function') &&
      !Object.isFrozen(value)
    ) {
      deepFreeze(value);
    }
  }

  return obj;
}

/**
 * 创建一个reducer函数
 * @param handlers - 处理函数映射
 * @param initialState - 初始状态
 * @returns reducer函数
 */
export function createReducer<State, Action extends { type: string }>(
  handlers: Record<string, (state: State, action: Action) => State>,
  initialState: State
): (state: State | undefined, action: Action) => State {
  return (state = initialState, action: Action) => {
    const handler = handlers[action.type];
    return handler ? handler(state, action) : state;
  };
}

/**
 * 以不可变方式生成新的状态，类似immer的produce函数
 * @param baseState - 基础状态
 * @param recipe - 修改函数
 * @returns 新状态
 */
export function produce<T>(baseState: T, recipe: (draft: T) => void): T {
  // 创建代理处理器
  const createProxy = (target: any, path: (string | number)[] = []): any => {
    const handler = {
      get(target: any, prop: string | symbol): any {
        if (prop === '__isProxy') return true;

        const value = target[prop];
        if (value && typeof value === 'object' && !value.__isProxy) {
          return createProxy(value, [...path, prop as string]);
        }
        return value;
      },
      set(target: any, prop: string | number | symbol, value: any): boolean {
        changes.push({
          path: [...path, prop as string | number],
          value
        });
        return true;
      },
      deleteProperty(target: any, prop: string | symbol): boolean {
        changes.push({
          path: [...path, prop as string],
          deleted: true
        });
        return true;
      }
    };

    return new Proxy(target, handler);
  };

  // 存储所有变更
  const changes: Array<{
    path: (string | number)[];
    value?: any;
    deleted?: boolean;
  }> = [];

  // 创建草稿状态
  let baseStateCopy: T;

  if (Array.isArray(baseState)) {
    baseStateCopy = [...baseState] as unknown as T;
  } else if (baseState && typeof baseState === 'object') {
    baseStateCopy = { ...baseState };
  } else {
    baseStateCopy = baseState;
  }

  const draftState = createProxy(baseStateCopy);

  // 应用配方
  recipe(draftState);

  // 如果没有变更，直接返回原始状态
  if (changes.length === 0) {
    return baseState;
  }

  // 应用所有变更
  let finalState = baseStateCopy as any;

  for (const change of changes) {
    const { path, value, deleted } = change;

    if (deleted) {
      // 处理删除属性
      if (path.length === 1) {
        const [key] = path;
        if (Array.isArray(finalState)) {
          finalState = finalState.filter((_, i) => i !== key);
        } else {
          const { [key as string]: _, ...rest } = finalState;
          finalState = rest;
        }
      } else {
        finalState = immutableDelete(finalState, path);
      }
    } else {
      // 处理设置属性值
      finalState = immutableSet(finalState, path, value);
    }
  }

  return finalState;
}
