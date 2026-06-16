/**
 * 数据选择工具函数，提供对象属性选择操作
 *
 * 该模块提供了从对象中选择或排除特定属性的工具函数，用于创建对象的子集或排除
 * 指定属性的新对象，常用于数据过滤、API请求参数构建等场景。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 数据处理
 *
 * @example
 * ```typescript
 * import { pick, omit } from '@stratix/utils/data/select';
 *
 * const user = { id: 1, name: 'Alice', email: 'alice@example.com', password: 'secret' };
 *
 * // 只保留指定属性
 * pick(user, ['id', 'name']); // { id: 1, name: 'Alice' }
 *
 * // 排除指定属性
 * omit(user, ['password', 'email']); // { id: 1, name: 'Alice' }
 * ```
 *
 * @packageDocumentation
 */

/**
 * 创建一个由选中属性组成的对象
 *
 * 从源对象中选择指定的属性，创建一个新对象，只包含指定的属性。
 * 如果指定的属性在源对象中不存在，则不会包含在结果中。
 *
 * @param object - 源对象
 * @param paths - 要选择的属性路径数组
 * @returns 包含选中属性的新对象
 * @throws `TypeError` 如果paths不是数组，则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象选择
 *
 * @example
 * ```typescript
 * // 基本用法
 * const object = { a: 1, b: 2, c: 3, d: 4 };
 * pick(object, ['a', 'c']);
 * // 输出: { a: 1, c: 3 }
 *
 * // 处理不存在的属性
 * pick(object, ['a', 'x']);
 * // 输出: { a: 1 }
 *
 * // 用于API数据过滤
 * const user = { id: 1, name: 'Alice', email: 'alice@example.com', password: 'secret' };
 * pick(user, ['id', 'name', 'email']);
 * // 输出: { id: 1, name: 'Alice', email: 'alice@example.com' }
 * ```
 * @public
 */
export function pick<T extends object, K extends keyof T>(
  object: T,
  paths: K[]
): Pick<T, K> {
  if (object == null) {
    return {} as Pick<T, K>;
  }

  if (!Array.isArray(paths)) {
    throw new TypeError('Paths must be an array');
  }

  const result = {} as Pick<T, K>;

  for (const path of paths) {
    if (Object.prototype.hasOwnProperty.call(object, path)) {
      result[path] = object[path];
    }
  }

  return result;
}

/**
 * 创建一个不包含指定属性的对象
 *
 * 从源对象中排除指定的属性，创建一个新对象，包含除指定属性外的所有属性。
 * 如果指定的属性在源对象中不存在，则不会影响结果。
 *
 * @param object - 源对象
 * @param paths - 要排除的属性路径数组
 * @returns 不包含指定属性的新对象
 * @throws `TypeError` 如果paths不是数组，则抛出错误
 * @remarks
 * 版本: 1.0.0
 * 分类: 对象选择
 *
 * @example
 * ```typescript
 * // 基本用法
 * const object = { a: 1, b: 2, c: 3, d: 4 };
 * omit(object, ['a', 'c']);
 * // 输出: { b: 2, d: 4 }
 *
 * // 处理不存在的属性
 * omit(object, ['a', 'x']);
 * // 输出: { b: 2, c: 3, d: 4 }
 *
 * // 用于移除敏感信息
 * const user = { id: 1, name: 'Alice', email: 'alice@example.com', password: 'secret' };
 * omit(user, ['password']);
 * // 输出: { id: 1, name: 'Alice', email: 'alice@example.com' }
 * ```
 * @public
 */
export function omit<T extends object, K extends keyof T>(
  object: T,
  paths: K[]
): Omit<T, K> {
  if (object == null) {
    return {} as Omit<T, K>;
  }

  if (!Array.isArray(paths)) {
    throw new TypeError('Paths must be an array');
  }

  const result = { ...object } as any;

  for (const path of paths) {
    delete result[path];
  }

  return result as Omit<T, K>;
}
