/**
 * 哈希相关函数
 * 提供各种哈希算法和密码哈希功能
 *
 * 注意：项目使用bcryptjs依赖
 */

import crypto from 'crypto';
// 使用bcryptjs代替bcrypt，bcryptjs是纯JavaScript实现，兼容性更好
import bcrypt from 'bcryptjs';

/**
 * 计算字符串或数据的MD5哈希值
 * @param data 要计算哈希的字符串或二进制数据
 * @returns 32位十六进制的MD5哈希字符串
 */
export function md5(data: string | Buffer): string {
  return hash('md5', data);
}

/**
 * 计算字符串或数据的SHA-1哈希值
 * @param data 要计算哈希的字符串或二进制数据
 * @returns 40位十六进制的SHA-1哈希字符串
 */
export function sha1(data: string | Buffer): string {
  return hash('sha1', data);
}

/**
 * 计算字符串或数据的SHA-256哈希值
 * @param data 要计算哈希的字符串或二进制数据
 * @returns 64位十六进制的SHA-256哈希字符串
 */
export function sha256(data: string | Buffer): string {
  return hash('sha256', data);
}

/**
 * 计算字符串或数据的SHA-512哈希值
 * @param data 要计算哈希的字符串或二进制数据
 * @returns 128位十六进制的SHA-512哈希字符串
 */
export function sha512(data: string | Buffer): string {
  return hash('sha512', data);
}

/**
 * 使用指定的算法计算哈希值
 * @param algorithm 使用的哈希算法，支持Node.js crypto模块的所有算法
 * @param data 要计算哈希的数据
 * @returns 十六进制的哈希字符串
 */
export function hash(algorithm: string, data: string | Buffer): string {
  const hash = crypto.createHash(algorithm);
  hash.update(typeof data === 'string' ? data : data);
  return hash.digest('hex');
}

/**
 * 使用指定的密钥和算法创建HMAC（哈希消息认证码）
 * @param algorithm 使用的哈希算法，例如 'md5', 'sha1', 'sha256', 'sha512'
 * @param key 用于HMAC的密钥
 * @param data 要认证的数据
 * @returns 十六进制的HMAC字符串
 */
export function hmac(
  algorithm: string,
  key: string | Buffer,
  data: string | Buffer
): string {
  const hmac = crypto.createHmac(algorithm, key);
  hmac.update(typeof data === 'string' ? data : data);
  return hmac.digest('hex');
}

/**
 * 安全地哈希密码，使用随机盐和多次迭代
 * @param password 要哈希的明文密码
 * @param saltRounds 哈希的复杂度（可选，默认为10）
 * @returns 包含算法、迭代次数、盐和哈希值的完整哈希字符串
 */
export async function hashPassword(
  password: string,
  saltRounds: number = 10
): Promise<string> {
  return bcrypt.hash(password, saltRounds);
}

/**
 * 验证密码是否匹配存储的哈希值
 * @param password 要验证的明文密码
 * @param hashedPassword 存储的密码哈希（通过hashPassword生成）
 * @returns 如果密码匹配则为true，否则为false
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * 生成用于密码哈希的随机盐
 * @param length 盐的字节长度（可选，默认为16）
 * @returns Base64编码的随机盐
 */
export function generateSalt(length: number = 16): string {
  return crypto.randomBytes(length).toString('base64');
}
