/**
 * 对象比较相关函数
 */

/**
 * 检查值是否为空对象、集合、映射或集合
 * @param value 要检查的值
 * @returns 如果值为空，则返回true，否则返回false
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0;
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * 检查值是否为非空
 * @param value 要检查的值
 * @returns 如果值为非空，则返回true，否则返回false
 */
export function isNotEmpty(value: any): boolean {
  return !isEmpty(value);
}

/**
 * 执行深度比较，确定两个值是否相等
 * @param value 要比较的值
 * @param other 要比较的另一个值
 * @returns 如果值相等，则返回true，否则返回false
 */
export function isEqual(value: any, other: any): boolean {
  // 判断基本类型或引用相等
  if (value === other) {
    return true;
  }

  // 如果其中一个是null/undefined，另一个不是
  if (
    value === null ||
    other === null ||
    value === undefined ||
    other === undefined
  ) {
    return false;
  }

  // 类型不同
  const valueType = typeof value;
  const otherType = typeof other;

  if (valueType !== otherType) {
    return false;
  }

  // 处理日期对象
  if (value instanceof Date && other instanceof Date) {
    return value.getTime() === other.getTime();
  }

  // 处理正则表达式
  if (value instanceof RegExp && other instanceof RegExp) {
    return value.toString() === other.toString();
  }

  // 处理数组
  if (Array.isArray(value) && Array.isArray(other)) {
    if (value.length !== other.length) {
      return false;
    }

    for (let i = 0; i < value.length; i++) {
      if (!isEqual(value[i], other[i])) {
        return false;
      }
    }

    return true;
  }

  // 处理Map对象
  if (value instanceof Map && other instanceof Map) {
    if (value.size !== other.size) {
      return false;
    }

    for (const [key, val] of value.entries()) {
      if (!other.has(key) || !isEqual(val, other.get(key))) {
        return false;
      }
    }

    return true;
  }

  // 处理Set对象
  if (value instanceof Set && other instanceof Set) {
    if (value.size !== other.size) {
      return false;
    }

    // 将Set转为数组并排序后比较
    const valueArray = Array.from(value);
    const otherArray = Array.from(other);

    return isEqual(valueArray, otherArray);
  }

  // 处理普通对象
  if (valueType === 'object' && otherType === 'object') {
    const valueKeys = Object.keys(value);
    const otherKeys = Object.keys(other);

    if (valueKeys.length !== otherKeys.length) {
      return false;
    }

    for (const key of valueKeys) {
      if (
        !Object.prototype.hasOwnProperty.call(other, key) ||
        !isEqual(value[key], other[key])
      ) {
        return false;
      }
    }

    return true;
  }

  // 其他情况
  return false;
}
