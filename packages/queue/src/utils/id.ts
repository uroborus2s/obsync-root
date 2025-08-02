/**
 * ID生成工具函数
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * 生成消息ID
 * @param prefix ID前缀
 * @returns 生成的消息ID
 */
export const generateMessageId = (prefix = 'msg'): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * 生成UUID
 * @returns UUID字符串
 */
export const generateUUID = (): string => {
  return uuidv4();
};

/**
 * 生成Redis Stream消息ID格式
 * @returns Redis Stream ID格式的字符串
 */
export const generateStreamId = (): string => {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

/**
 * 生成短ID（用于临时标识）
 * @param length ID长度
 * @returns 短ID字符串
 */
export const generateShortId = (length = 8): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
