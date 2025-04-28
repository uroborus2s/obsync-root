/**
 * 加密解密相关函数
 * 提供对称加密、非对称加密和编码解码功能
 */

import crypto from 'crypto';

/**
 * 使用指定的算法和密钥加密数据
 *
 * @param data 要加密的数据
 * @param key 加密密钥
 * @param algorithm 加密算法，默认为'aes-256-cbc'
 * @returns Base64编码的加密数据
 */
export function encrypt(
  data: string,
  key: string,
  algorithm: string = 'aes-256-cbc'
): string {
  return aesEncrypt(data, key);
}

/**
 * 解密使用encrypt函数加密的数据
 *
 * @param encryptedData Base64编码的加密数据
 * @param key 解密密钥（必须与加密时相同）
 * @param algorithm 解密算法，默认为'aes-256-cbc'（必须与加密时相同）
 * @returns 解密后的原始数据
 */
export function decrypt(
  encryptedData: string,
  key: string,
  algorithm: string = 'aes-256-cbc'
): string {
  return aesDecrypt(encryptedData, key);
}

/**
 * 使用AES算法加密数据
 *
 * @param data 要加密的数据
 * @param key 加密密钥
 * @param iv 初始化向量（可选，如果不提供会自动生成）
 * @returns 格式为 'iv:encryptedData' 的字符串，两部分都是Base64编码
 */
export function aesEncrypt(data: string, key: string, iv?: Buffer): string {
  // 生成初始化向量（如果未提供）
  const initVector = iv || crypto.randomBytes(16);

  // 派生加密密钥（AES使用固定长度密钥）
  const keyBuffer = crypto.createHash('sha256').update(key).digest();

  // 创建加密器
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, initVector);

  // 加密数据
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  // 返回格式为 'iv:encrypted'，iv以base64编码
  return `${initVector.toString('base64')}:${encrypted}`;
}

/**
 * 解密使用aesEncrypt函数加密的数据
 *
 * @param encryptedData 通过aesEncrypt加密的数据
 * @param key 解密密钥（必须与加密时相同）
 * @returns 解密后的原始数据
 */
export function aesDecrypt(encryptedData: string, key: string): string {
  // 分离初始化向量和加密数据
  const [ivString, encrypted] = encryptedData.split(':');

  if (!ivString || !encrypted) {
    throw new Error('无效的加密数据格式');
  }

  // 从base64还原iv
  const iv = Buffer.from(ivString, 'base64');

  // 派生密钥（与加密时相同的派生方法）
  const keyBuffer = crypto.createHash('sha256').update(key).digest();

  // 创建解密器
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);

  // 解密数据
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * 使用RSA公钥加密数据
 *
 * @param data 要加密的数据
 * @param publicKey RSA公钥（PEM格式）
 * @returns Base64编码的加密数据
 */
export function rsaEncrypt(data: string, publicKey: string): string {
  // 对长字符串数据分段加密（RSA加密长度有限制）
  const buffer = Buffer.from(data);
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    buffer
  );

  return encrypted.toString('base64');
}

/**
 * 使用RSA私钥解密数据
 *
 * @param encryptedData 通过rsaEncrypt加密的数据
 * @param privateKey RSA私钥（PEM格式）
 * @returns 解密后的原始数据
 */
export function rsaDecrypt(encryptedData: string, privateKey: string): string {
  const buffer = Buffer.from(encryptedData, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    buffer
  );

  return decrypted.toString('utf8');
}

/**
 * 将字符串或二进制数据编码为Base64
 *
 * @param data 要编码的字符串或二进制数据
 * @returns Base64编码的字符串
 */
export function base64Encode(data: string | Buffer): string {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return buffer.toString('base64');
}

/**
 * 将Base64编码的字符串解码为原始数据
 *
 * @param encodedData Base64编码的字符串
 * @returns 解码后的原始字符串
 */
export function base64Decode(encodedData: string): string {
  return Buffer.from(encodedData, 'base64').toString('utf8');
}

/**
 * 将数据编码为URL安全的Base64格式
 *
 * @param data 要编码的字符串或二进制数据
 * @returns URL安全的Base64编码字符串（替换 '+' 为 '-'，'/' 为 '_'，并移除填充字符 '='）
 */
export function urlSafeBase64Encode(data: string | Buffer): string {
  const base64 = base64Encode(data);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 将URL安全的Base64编码字符串解码为原始数据
 *
 * @param encodedData URL安全的Base64编码字符串
 * @returns 解码后的原始字符串
 */
export function urlSafeBase64Decode(encodedData: string): string {
  // 还原标准base64格式
  let base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');

  // 添加填充字符
  while (base64.length % 4) {
    base64 += '=';
  }

  return base64Decode(base64);
}

/**
 * 生成指定长度的安全随机字节
 *
 * @param length 要生成的随机字节数
 * @returns 包含随机字节的Buffer
 */
export function generateSecureRandom(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * 生成一个安全的随机令牌
 *
 * @param length 令牌的字节长度（可选，默认为32）
 * @returns 十六进制编码的随机令牌
 */
export function generateToken(length: number = 32): string {
  return generateSecureRandom(length).toString('hex');
}

/**
 * 生成一个符合RFC4122的UUID（通用唯一标识符）
 *
 * @param version UUID版本，支持1或4（可选，默认为4）
 * @returns 格式化的UUID字符串
 */
export function generateUUID(version: 1 | 4 = 4): string {
  if (version === 1) {
    return crypto.randomUUID ? crypto.randomUUID() : generateUUIDv4();
  } else {
    return generateUUIDv4();
  }
}

/**
 * 生成一个UUID v4（随机）
 * @private
 */
function generateUUIDv4(): string {
  const bytes = crypto.randomBytes(16);

  // 设置版本为4
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // 设置变体为标准
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  // 格式化为标准UUID字符串
  return [
    bytes.slice(0, 4).toString('hex'),
    bytes.slice(4, 6).toString('hex'),
    bytes.slice(6, 8).toString('hex'),
    bytes.slice(8, 10).toString('hex'),
    bytes.slice(10, 16).toString('hex')
  ].join('-');
}
