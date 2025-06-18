/**
 * 加密相关工具函数
 *
 * @packageDocumentation
 */

import crypto from 'node:crypto';

/**
 * 加密算法
 */
export enum EncryptionAlgorithm {
  /**
   * AES-256-GCM算法
   */
  AES_256_GCM = 'aes-256-gcm'
}

/**
 * 高强度默认密钥（256位/32字节）
 * 使用字节数组表示，而不是字符串，增加安全性
 * 注意：此数组每次构建时将被替换为随机值
 */
const DEFAULT_ENCRYPTION_KEY = new Uint8Array([
  0x7b, 0x41, 0xa2, 0xb3, 0xc5, 0xd8, 0xe7, 0xf1, 0x23, 0x45, 0x67, 0x89, 0xab,
  0xcd, 0xef, 0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10, 0x0f, 0x1e, 0x2d,
  0x3c, 0x4b, 0x5a, 0x69, 0x78, 0x87
]);

/**
 * 加密选项
 */
export interface EncryptOptions {
  /**
   * 加密算法，默认为AES-256-GCM
   */
  algorithm?: EncryptionAlgorithm;

  /**
   * 加密密钥，如果不提供，将使用环境变量STRATIX_ENCRYPTION_KEY或默认密钥
   */
  key?: string | Buffer;

  /**
   * 初始化向量(IV)，如果不提供，将自动生成
   */
  iv?: Buffer;

  /**
   * 输出格式，默认为base64
   */
  outputFormat?: 'base64' | 'hex' | 'buffer';

  /**
   * 是否使用默认密钥，默认为false
   * 如果为true，将忽略key参数和环境变量，直接使用内置的高强度默认密钥
   */
  useDefaultKey?: boolean;
}

/**
 * 解密选项
 */
export interface DecryptOptions {
  /**
   * 加密算法，默认为AES-256-GCM
   */
  algorithm?: EncryptionAlgorithm;

  /**
   * 加密密钥，如果不提供，将使用环境变量STRATIX_ENCRYPTION_KEY或默认密钥
   */
  key?: string | Buffer;

  /**
   * 输入格式，默认为base64
   */
  inputFormat?: 'base64' | 'hex' | 'buffer';

  /**
   * 是否使用默认密钥，默认为false
   * 如果为true，将忽略key参数和环境变量，直接使用内置的高强度默认密钥
   */
  useDefaultKey?: boolean;
}

/**
 * 加密结果
 */
export interface EncryptResult {
  /**
   * 加密后的内容
   */
  encrypted: string | Buffer;

  /**
   * 初始化向量(IV)
   */
  iv: Buffer;

  /**
   * 认证标签(auth tag)，仅GCM模式使用
   */
  authTag?: Buffer;
}

/**
 * 获取加密密钥
 *
 * @param key - 可选的提供的密钥
 * @returns Buffer格式的密钥
 */
function getEncryptionKey(
  key?: string | Buffer,
  useDefaultKey?: boolean
): Buffer {
  // 优先使用默认密钥选项
  if (useDefaultKey === true) {
    return Buffer.from(DEFAULT_ENCRYPTION_KEY);
  }

  // 其次使用传入的密钥
  if (key) {
    return typeof key === 'string' ? Buffer.from(key) : key;
  }

  // 从环境变量获取
  const envKey = process.env.STRATIX_ENCRYPTION_KEY;
  if (envKey) {
    return Buffer.from(envKey);
  }

  // 最后使用默认密钥作为后备选项
  return Buffer.from(DEFAULT_ENCRYPTION_KEY);
}

/**
 * 加密数据
 *
 * @param data - 待加密的数据
 * @param options - 加密选项
 * @returns 加密结果
 */
export function encrypt(
  data: string | Buffer,
  options: EncryptOptions = {}
): EncryptResult {
  const algorithm = options.algorithm || EncryptionAlgorithm.AES_256_GCM;
  const key = getEncryptionKey(options.key, options.useDefaultKey);
  const iv = options.iv || crypto.randomBytes(16);
  const outputFormat = options.outputFormat || 'base64';

  // 转换为Buffer
  const dataBuffer =
    typeof data === 'string' ? Buffer.from(data, 'utf8') : data;

  // 创建加密器
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  // 加密数据
  let encrypted = cipher.update(dataBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // 获取认证标签(GCM模式)
  const authTag = algorithm.includes('gcm') ? cipher.getAuthTag() : undefined;

  // 按照输出格式返回
  const result: EncryptResult = {
    encrypted:
      outputFormat === 'buffer' ? encrypted : encrypted.toString(outputFormat),
    iv,
    authTag
  };

  return result;
}

/**
 * 解密数据
 *
 * @param encrypted - 已加密的数据
 * @param iv - 初始化向量
 * @param authTag - 认证标签(GCM模式)
 * @param options - 解密选项
 * @returns 解密后的数据
 */
export function decrypt(
  encrypted: string | Buffer,
  iv: Buffer,
  authTag: Buffer | undefined,
  options: DecryptOptions = {}
): string {
  const algorithm = options.algorithm || EncryptionAlgorithm.AES_256_GCM;
  const key = getEncryptionKey(options.key, options.useDefaultKey);
  const inputFormat = options.inputFormat || 'base64';
  console.log(key);

  // 转换为Buffer
  const encryptedBuffer =
    typeof encrypted === 'string'
      ? Buffer.from(encrypted, inputFormat as BufferEncoding)
      : encrypted;

  // 创建解密器
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  console.log(decipher);
  // 设置认证标签(GCM模式)
  if (algorithm.includes('gcm') && authTag) {
    decipher.setAuthTag(authTag);
  }

  // 解密数据
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * 加密配置对象为字符串
 *
 * @param config - 配置对象或JSON字符串
 * @param options - 加密选项
 * @returns 加密后的字符串
 */
export function encryptConfig(
  config: Record<string, any> | string,
  options: EncryptOptions = {}
): string {
  // 将配置转换为JSON字符串
  const jsonStr = typeof config === 'string' ? config : JSON.stringify(config);

  // 加密
  const { encrypted, iv, authTag } = encrypt(jsonStr, options);

  // 组合IV和加密内容
  const ivHex = iv.toString('hex');
  const authTagHex = authTag ? authTag.toString('hex') : '';

  // 格式: iv + "." + authTag + "." + encrypted
  return `${ivHex}.${authTagHex}.${encrypted}`;
}

/**
 * 解密配置字符串为对象
 *
 * @param encryptedConfig - 加密的配置字符串
 * @param options - 解密选项
 * @returns 解密后的配置对象
 */
export function decryptConfig(
  encryptedConfig: string,
  options: DecryptOptions = {}
): Record<string, any> {
  console.log(encryptedConfig);
  // 分割字符串: iv + "." + authTag + "." + encrypted
  const parts = encryptedConfig.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted config format');
  }

  const [ivHex, authTagHex, encryptedData] = parts;

  // 解析IV和认证标签
  const iv = Buffer.from(ivHex, 'hex');
  console.log(iv.length);
  const authTag = authTagHex ? Buffer.from(authTagHex, 'hex') : undefined;
  try {
    console.log(iv);
    // 解密
    const jsonStr = decrypt(encryptedData, iv, authTag, options);
    console.log(jsonStr);
    // 解析JSON
    return JSON.parse(jsonStr);
  } catch (err) {
    console.log(err);
    throw new Error(
      `Invalid JSON in decrypted config: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
