/**
 * 字符串处理工具函数模块
 * 提供字符串处理相关的工具函数
 */

// 命名转换函数
export { camelCase, kebabCase, pascalCase, snakeCase } from './case.js';

// 格式化函数
export { escape, template, truncate, unescape } from './format.js';

// 复数形式函数
export { pluralize, singularize } from './pluralize.js';

// 字符串转换函数
export {
  capitalize,
  endsWith,
  padEnd,
  padStart,
  startsWith,
  trim
} from './transform.js';
