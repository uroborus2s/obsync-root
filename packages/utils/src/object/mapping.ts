/**
 * 对象映射相关函数
 */

/**
 * 创建一个新对象，对象的值是通过运行原对象值的迭代函数而产生的
 * @param object 要迭代的对象
 * @param iteratee 迭代函数，接收(value, key, object)作为参数
 * @returns 新对象
 */
export function mapValues<T extends object, R>(
  object: T,
  iteratee: (value: any, key: string, object: T) => R
): Record<string, R> {
  if (object === null || object === undefined) {
    return {};
  }

  const result: Record<string, R> = {};

  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      result[key] = iteratee((object as Record<string, any>)[key], key, object);
    }
  }

  return result;
}

/**
 * 创建一个新对象，对象的键是通过运行原对象键的迭代函数而产生的
 * @param object 要迭代的对象
 * @param iteratee 迭代函数，接收(value, key, object)作为参数
 * @returns 新对象
 */
export function mapKeys<T extends object>(
  object: T,
  iteratee: (value: any, key: string, object: T) => string
): Record<string, any> {
  if (object === null || object === undefined) {
    return {};
  }

  const result: Record<string, any> = {};

  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      const newKey = iteratee(
        (object as Record<string, any>)[key],
        key,
        object
      );
      result[newKey] = (object as Record<string, any>)[key];
    }
  }

  return result;
}

/**
 * 对象的 reduce 操作，将对象转换为新的累加值
 * @param object 要迭代的对象
 * @param iteratee 迭代函数，接收(accumulator, value, key, object)作为参数
 * @param accumulator 初始累加值
 * @returns 累加结果
 */
export function transform<T extends object, R>(
  object: T,
  iteratee: (accumulator: R, value: any, key: string, object: T) => R | void,
  accumulator: R
): R {
  if (object === null || object === undefined) {
    return accumulator;
  }

  let result = accumulator;

  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      const iterateeResult = iteratee(
        result,
        (object as Record<string, any>)[key],
        key,
        object
      );

      // 如果迭代函数返回值，则更新结果
      if (iterateeResult !== undefined) {
        result = iterateeResult;
      }
    }
  }

  return result;
}
