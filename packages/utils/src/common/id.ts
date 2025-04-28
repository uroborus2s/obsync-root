/**
 * ID生成相关函数
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * 生成数字格式的唯一ID
 * @param min 最小值，默认为4
 * @param max 最大值，默认为16
 * @returns 数字格式的唯一ID字符串
 */
export function generateNumberId(min: number = 4, max: number = 16): string {
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * 通过UUID生成唯一ID
 * @returns UUID格式的唯一ID
 */
export function generateUUId(): string {
  return uuidv4();
}

/**
 * 生成唯一ID
 * @returns 唯一ID
 */
export function generateId(): string {
  return generateUUId();
}
