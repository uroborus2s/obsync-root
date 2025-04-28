/**
 * 对象键值操作相关函数
 */

/**
 * 获取对象自身的可枚举属性名组成的数组
 * @param object 要获取键的对象
 * @returns 对象的键数组
 */
export function keys(object: Record<string, any>): string[] {
  if (object === null || object === undefined) {
    return [];
  }

  return Object.keys(object);
}

/**
 * 获取对象自身的可枚举属性值组成的数组
 * @param object 要获取值的对象
 * @returns 对象的值数组
 */
export function values(object: Record<string, any>): any[] {
  if (object === null || object === undefined) {
    return [];
  }

  return Object.values(object);
}

/**
 * 获取对象自身的可枚举属性的键值对数组
 * @param object 要获取键值对的对象
 * @returns 对象的键值对数组
 */
export function entries(object: Record<string, any>): Array<[string, any]> {
  if (object === null || object === undefined) {
    return [];
  }

  return Object.entries(object);
}

/**
 * 将键值对数组转换为对象
 * @param entries 键值对数组
 * @returns 由键值对数组创建的对象
 */
export function fromEntries(
  entries:
    | Array<[string | number | symbol, any]>
    | Iterable<readonly [string | number | symbol, any]>
): Record<string, any> {
  if (entries === null || entries === undefined) {
    return {};
  }

  return Object.fromEntries(entries);
}
