/**
 * 对象处理工具函数模块
 * 提供对象操作相关的工具函数
 */

// 导出属性访问相关函数
export { get, has, isObject, set } from './property.js';

// 导出对象键值操作相关函数
export { entries, fromEntries, keys, values } from './keys.js';

// 导出对象合并相关函数
export { assign, assignDeep, defaults } from './assign.js';

// 导出对象映射相关函数
export { mapKeys, mapValues, transform } from './mapping.js';

// 导出对象比较相关函数
export { isEmpty, isEqual, isNotEmpty } from './compare.js';

// 导出对象克隆和深度合并函数
export { deepClone, deepMerge } from './merge.js';

// 导出对象属性选择函数
export { omit, pick } from './select.js';
