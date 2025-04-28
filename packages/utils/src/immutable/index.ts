/**
 * 不可变数据工具函数模块
 * 提供不可变数据操作相关的工具函数
 */

// 导出数组操作函数
export {
  immutablePop,
  immutablePush,
  immutableReverse,
  immutableShift,
  immutableSort,
  immutableSplice,
  immutableUnshift
} from './array.js';

// 导出对象操作函数
export {
  deepFreeze,
  freeze,
  immutableDeepMerge,
  immutableDelete,
  immutableMerge,
  immutableSet,
  immutableUpdate,
  type Path
} from './object.js';

// 导出reducer相关函数
export { createReducer, produce } from './reducer.js';
