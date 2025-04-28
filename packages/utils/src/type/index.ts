/**
 * 类型检查和转换工具函数模块
 * 提供类型检查和转换相关的工具函数
 */

// 类型检查函数
export {
  getPrimitiveType,
  getType,
  isArray,
  isBoolean,
  isDate,
  isError,
  isFunction,
  isInstanceOf,
  isIterable,
  isMap,
  isNil,
  isNull,
  isNumber,
  isObject,
  isPlainObject,
  isPromise,
  isRegExp,
  isSet,
  isString,
  isSymbol,
  isTypeOf,
  isUndefined,
  typeGuard
} from './check.js';

// 类型转换函数
export {
  ensureType,
  toArray,
  toBoolean,
  toDate,
  toInteger,
  toNumber,
  toObject,
  toString,
  typeCast
} from './convert.js';
