/**
 * Collection模块 - 对象和Map操作工具函数
 * 提供对象属性选择、排除和转换等操作
 */

/**
 * 创建一个对象，对象的键是通过对集合中每个元素运行迭代函数得到的结果，每个键对应的值是生成该键的最后一个元素
 * @param array 要转换的数组
 * @param iteratee 迭代函数，用于生成键，或对象属性路径
 * @returns 由键值对组成的对象
 */
export function keyBy<T>(
  array: T[],
  iteratee: ((item: T) => any) | string
): Record<string, T> {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected array to be an array');
  }

  const iterateeFn =
    typeof iteratee === 'string'
      ? (item: T) => (item as any)[iteratee]
      : iteratee;

  return array.reduce((result: Record<string, T>, item) => {
    const key = String(iterateeFn(item));
    result[key] = item;
    return result;
  }, {});
}
