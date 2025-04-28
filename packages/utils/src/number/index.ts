/**
 * 数字处理工具函数模块
 * 提供数字处理相关的工具函数
 */

// 导出数字格式化相关函数
export {
  ceil,
  floor,
  formatNumber,
  round,
  toFixed,
  type FormatNumberOptions
} from './format.js';

// 导出数学运算相关函数
export { average, max, min, sum } from './math.js';

// 导出数字验证相关函数
export { isFloat, isInteger, isNumber } from './validate.js';

// 导出数字范围相关函数
export { clamp, inRange } from './range.js';

// 导出随机数生成相关函数

export { random } from './random.js';
