/**
 * 类型处理工具函数
 */

import { getType, isInstanceOf, isTypeOf, typeGuard } from './check.js';
import { ensureType, typeCast } from './convert.js';

// 这个文件主要导出check.ts和convert.ts中已经实现的通用函数
// 以及一些额外的工具函数

export { ensureType, getType, isInstanceOf, isTypeOf, typeCast, typeGuard };
