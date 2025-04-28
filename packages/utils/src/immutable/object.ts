/**
 * 不可变对象操作函数
 */

/**
 * 路径类型，可以是字符串路径（使用点号分隔）或字符串数组
 */
export type Path = string | string[];

/**
 * 冻结对象，防止对象属性被修改
 * @param obj 要冻结的对象
 * @returns 冻结后的对象
 */
export function freeze<T extends object>(obj: T): Readonly<T> {
  return Object.freeze(obj);
}

/**
 * 递归冻结对象及其所有嵌套属性，创建完全不可变的数据结构
 * @param obj 要深度冻结的对象
 * @returns 深度冻结后的对象
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  // 获取对象自身的属性描述符
  const propNames = Object.getOwnPropertyNames(obj);

  // 在冻结自身之前冻结属性
  for (const name of propNames) {
    const value = (obj as any)[name];

    // 如果值是对象且不是函数，则递归冻结
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  // 冻结对象本身
  return Object.freeze(obj);
}

/**
 * 将路径字符串转换为路径数组
 * @param path 路径
 * @returns 路径数组
 */
function toPathArray(path: Path): string[] {
  if (Array.isArray(path)) {
    return path;
  }
  return path.split('.');
}

/**
 * 以不可变方式设置对象指定路径的值
 * @param obj 源对象
 * @param path 属性路径
 * @param value 要设置的值
 * @returns 新对象，原对象不变
 */
export function immutableSet<T extends object>(
  obj: T,
  path: Path,
  value: any
): T {
  const pathArray = toPathArray(path);
  if (pathArray.length === 0) {
    return value;
  }

  const result = { ...obj };
  let current: any = result;
  const lastIndex = pathArray.length - 1;

  for (let i = 0; i < lastIndex; i++) {
    const key = pathArray[i];
    // 如果当前层级不存在或不是对象，则创建一个新对象
    if (current[key] === undefined || typeof current[key] !== 'object') {
      current[key] = {};
    } else {
      // 否则，创建当前层级的浅拷贝
      current[key] = { ...current[key] };
    }
    current = current[key];
  }

  // 设置最后一层的值
  current[pathArray[lastIndex]] = value;
  return result;
}

/**
 * 以不可变方式删除对象指定路径的属性
 * @param obj 源对象
 * @param path 属性路径
 * @returns 新对象，原对象不变
 */
export function immutableDelete<T extends object>(obj: T, path: Path): T {
  const pathArray = toPathArray(path);
  if (pathArray.length === 0) {
    return obj;
  }

  const result = { ...obj };
  let current: any = result;
  const lastIndex = pathArray.length - 1;

  for (let i = 0; i < lastIndex; i++) {
    const key = pathArray[i];
    if (current[key] === undefined || typeof current[key] !== 'object') {
      // 如果路径不存在，则直接返回原对象
      return obj;
    }
    // 创建当前层级的浅拷贝
    current[key] = { ...current[key] };
    current = current[key];
  }

  // 删除最后一层的属性
  const lastKey = pathArray[lastIndex];
  if (current[lastKey] !== undefined) {
    delete current[lastKey];
  }

  return result;
}

/**
 * 以不可变方式合并多个对象
 * @param target 目标对象
 * @param sources 源对象
 * @returns 合并后的新对象，原对象不变
 */
export function immutableMerge<T extends object>(
  target: T,
  ...sources: object[]
): T {
  return Object.assign({}, target, ...sources);
}

/**
 * 以不可变方式深度合并多个对象
 * @param target 目标对象
 * @param sources 源对象
 * @returns 深度合并后的新对象，原对象不变
 */
export function immutableDeepMerge<T extends object>(
  target: T,
  ...sources: object[]
): T {
  if (!sources.length) {
    return target;
  }

  const result: any = { ...target };

  sources.forEach((source) => {
    if (source === null || typeof source !== 'object') {
      return;
    }

    Object.keys(source).forEach((key) => {
      const targetValue = result[key];
      const sourceValue = (source as any)[key];

      if (
        targetValue &&
        typeof targetValue === 'object' &&
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(targetValue) &&
        !Array.isArray(sourceValue)
      ) {
        // 如果两者都是对象，进行递归深合并
        result[key] = immutableDeepMerge(targetValue, sourceValue);
      } else {
        // 否则直接赋值
        result[key] = sourceValue;
      }
    });
  });

  return result;
}

/**
 * 以不可变方式更新对象指定路径的值
 * @param obj 源对象
 * @param path 属性路径
 * @param updater 更新函数，接收当前值并返回新值
 * @returns 更新后的新对象，原对象不变
 */
export function immutableUpdate<T extends object>(
  obj: T,
  path: Path,
  updater: (value: any) => any
): T {
  const pathArray = toPathArray(path);
  if (pathArray.length === 0) {
    return updater(obj);
  }

  // 获取当前路径的值
  let currentValue: any = obj;
  for (const key of pathArray) {
    if (currentValue === undefined || currentValue === null) {
      currentValue = undefined;
      break;
    }
    currentValue = currentValue[key];
  }

  // 使用更新函数计算新值
  const newValue = updater(currentValue);

  // 使用immutableSet设置新值
  return immutableSet(obj, path, newValue);
}
