/**
 * 数据处理工具函数模块，提供数组、对象等各类数据结构的操作工具
 *
 * 此模块整合了数组操作、对象操作、数据合并、数据比较和属性选择等丰富功能。
 * 包含对各种数据类型的处理，如数组、对象、集合等，帮助开发者高效地处理和转换数据。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 数据处理
 *
 * @example
 * ```typescript
 * import { array, object, merge } from '@stratix/utils/data';
 *
 * // 数组操作
 * array.unique([1, 1, 2, 2, 3]); // [1, 2, 3]
 * array.chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
 *
 * // 对象操作
 * const obj = { user: { profile: { name: 'Alice' } } };
 * object.get(obj, 'user.profile.name'); // 'Alice'
 * object.set(obj, 'user.profile.age', 30); // 添加新属性
 *
 * // 深度合并
 * merge.deepMerge(
 *   { a: { b: 1, c: 2 } },
 *   { a: { b: 3, d: 4 } }
 * ); // { a: { b: 3, c: 2, d: 4 } }
 *
 * // 数据比较
 * compare.isEqual([1, 2, 3], [1, 2, 3]); // true
 * compare.isEmpty([]); // true
 *
 * // 属性选择
 * select.pick({ a: 1, b: 2, c: 3 }, ['a', 'c']); // { a: 1, c: 3 }
 * select.omit({ a: 1, b: 2, c: 3 }, ['b']); // { a: 1, c: 3 }
 * ```
 *
 * @packageDocumentation
 */

// 导出各子模块的命名空间
export * as array from './array.js';
export * as compare from './compare.js';
export * as merge from './merge.js';
export * as object from './object.js';
export * as select from './select.js';
