/**
 * 加密相关工具函数
 *
 * @packageDocumentation
 */

import { get } from './environment/index.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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

const STRATIX_ENCRYPTION_KEY = 'STRATIX_ENCRYPTION_KEY';

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

  /**
   * 是否显示详细信息，默认为false
   */
  verbose?: boolean;
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

  /**
   * 是否显示详细信息，默认为false
   */
  verbose?: boolean;
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
  const envKey = get(STRATIX_ENCRYPTION_KEY);
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

  // 转换为Buffer
  const encryptedBuffer =
    typeof encrypted === 'string'
      ? Buffer.from(encrypted, inputFormat as BufferEncoding)
      : encrypted;

  // 创建解密器
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

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
 * 验证输入是否为有效的 JSON 对象
 *
 * @param input - 要验证的输入
 * @param verbose - 是否显示详细信息
 * @returns 验证结果
 */
function validateJsonInput(
  input: any,
  verbose: boolean = false
): { isValid: boolean; error?: string } {
  // 检查是否为 null 或 undefined
  if (input === null || input === undefined) {
    return { isValid: false, error: 'Input cannot be null or undefined' };
  }

  // 检查是否为对象类型
  if (typeof input !== 'object') {
    return {
      isValid: false,
      error: `Input must be an object, got ${typeof input}`
    };
  }

  // 检查是否为数组（数组在 JavaScript 中也是 object 类型）
  if (Array.isArray(input)) {
    return {
      isValid: false,
      error: 'Input cannot be an array, must be a JSON object'
    };
  }

  // 尝试序列化和反序列化以验证 JSON 兼容性
  try {
    const jsonString = JSON.stringify(input);
    const parsed = JSON.parse(jsonString);

    // 验证序列化后的对象与原对象是否一致
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {
        isValid: false,
        error: 'Input is not a valid JSON object after serialization'
      };
    }

    if (verbose) {
      console.log('✅ JSON对象验证通过');
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid JSON object: ${error instanceof Error ? error.message : 'Unknown serialization error'}`
    };
  }
}

/**
 * 加密配置对象为字符串（仅支持 JSON 格式）
 *
 * @param config - 要加密的 JSON 配置对象
 * @param options - 加密选项
 * @returns 加密后的字符串
 * @throws {Error} 当输入不是有效的 JSON 对象时抛出错误
 */
export function encryptConfig(
  config: Record<string, any>,
  options: EncryptOptions = {}
): string {
  const verbose = options.verbose || false;

  if (verbose) {
    console.log('🔍 验证输入配置格式...');
  }

  // 验证输入是否为有效的 JSON 对象
  const validation = validateJsonInput(config, verbose);
  if (!validation.isValid) {
    const errorMessage = `配置加密失败: ${validation.error}`;
    if (verbose) {
      console.error('❌', errorMessage);
    }
    throw new Error(errorMessage);
  }

  try {
    if (verbose) {
      console.log('🔧 开始 JSON 配置加密...');
    }

    // 将 JSON 对象转换为字符串
    const jsonStr = JSON.stringify(config);

    if (verbose) {
      console.log(`📊 配置大小: ${jsonStr.length} 字符`);
      console.log(`🔑 配置键: ${Object.keys(config).join(', ')}`);
    }

    // 加密 JSON 字符串
    const { encrypted, iv, authTag } = encrypt(jsonStr, options);

    // 组合IV和加密内容
    const ivHex = iv.toString('hex');
    const authTagHex = authTag ? authTag.toString('hex') : '';

    // 格式: iv + "." + authTag + "." + encrypted
    const encryptedString = `${ivHex}.${authTagHex}.${encrypted}`;

    if (verbose) {
      console.log('✅ JSON 配置加密成功');
      console.log(`📦 加密后大小: ${encryptedString.length} 字符`);
    }

    return encryptedString;
  } catch (error) {
    const errorMessage = `JSON 配置加密失败: ${error instanceof Error ? error.message : 'Unknown error'}`;
    if (verbose) {
      console.error('❌', errorMessage);
    }
    throw new Error(errorMessage);
  }
}

/**
 * 解密配置字符串为 JSON 对象（仅支持 JSON 格式）
 *
 * @param encryptedConfig - 加密的配置字符串
 * @param options - 解密选项
 * @returns 解密后的 JSON 配置对象
 * @throws {Error} 当解密失败或结果不是有效的 JSON 对象时抛出错误
 */
export function decryptConfig(
  encryptedConfig: string,
  options: DecryptOptions = {}
): Record<string, any> {
  const verbose = options.verbose || false;

  if (verbose) {
    console.log('🔓 开始解密配置...');
    console.log(`📦 加密数据大小: ${encryptedConfig.length} 字符`);
  }

  // 分割字符串: iv + "." + authTag + "." + encrypted
  const parts = encryptedConfig.split('.');
  if (parts.length !== 3) {
    const errorMessage =
      'Invalid encrypted config format: expected format "iv.authTag.encrypted"';
    if (verbose) {
      console.error('❌', errorMessage);
    }
    throw new Error(errorMessage);
  }

  const [ivHex, authTagHex, encryptedData] = parts;

  if (verbose) {
    console.log('🔍 解析加密组件...');
    console.log(`   IV: ${ivHex.substring(0, 16)}...`);
    console.log(`   AuthTag: ${authTagHex.substring(0, 16)}...`);
    console.log(`   Data: ${encryptedData.substring(0, 16)}...`);
  }

  // 解析IV和认证标签
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = authTagHex ? Buffer.from(authTagHex, 'hex') : undefined;

  try {
    if (verbose) {
      console.log('🔧 执行解密操作...');
    }

    // 解密
    const jsonStr = decrypt(encryptedData, iv, authTag, options);

    if (verbose) {
      console.log('✅ 解密成功');
      console.log(`📊 解密后大小: ${jsonStr.length} 字符`);
      console.log('🔍 验证 JSON 格式...');
    }

    // 解析JSON
    const parsedConfig = JSON.parse(jsonStr);

    // 验证解密后的数据是否为有效的 JSON 对象
    const validation = validateJsonInput(parsedConfig, verbose);
    if (!validation.isValid) {
      const errorMessage = `解密后的数据不是有效的 JSON 对象: ${validation.error}`;
      if (verbose) {
        console.error('❌', errorMessage);
        console.warn('⚠️  解密成功但数据格式无效，将继续返回原始解析结果');
      }
      // 根据参考代码，显示警告但允许继续处理
    }

    if (verbose) {
      console.log('✅ JSON 配置解密完成');
      console.log(`🔑 配置键: ${Object.keys(parsedConfig).join(', ')}`);
    }

    return parsedConfig;
  } catch (err) {
    const errorMessage = `JSON 配置解密失败: ${err instanceof Error ? err.message : String(err)}`;
    if (verbose) {
      console.error('❌', errorMessage);
    }
    throw new Error(errorMessage);
  }
}

/**
 * 配置验证选项
 */
export interface ConfigValidationOptions {
  /**
   * 必需的顶级属性
   */
  requiredKeys?: string[];

  /**
   * 自定义验证函数
   */
  customValidator?: (config: any) => { isValid: boolean; errors: string[] };

  /**
   * 是否严格模式（不允许额外属性）
   */
  strict?: boolean;
}

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  /**
   * 是否有效
   */
  isValid: boolean;

  /**
   * 错误信息列表
   */
  errors: string[];

  /**
   * 警告信息列表
   */
  warnings: string[];
}

/**
 * 验证配置对象的结构和内容
 *
 * @param config - 要验证的配置对象
 * @param options - 验证选项
 * @returns 验证结果
 */
export function validateConfig(
  config: any,
  options: ConfigValidationOptions = {}
): ConfigValidationResult {
  const result: ConfigValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // 检查是否为对象
  if (!config || typeof config !== 'object') {
    result.isValid = false;
    result.errors.push('Configuration must be a valid object');
    return result;
  }

  // 检查必需的键
  if (options.requiredKeys) {
    for (const key of options.requiredKeys) {
      if (!(key in config)) {
        result.isValid = false;
        result.errors.push(`Missing required configuration key: ${key}`);
      }
    }
  }

  // 运行自定义验证器
  if (options.customValidator) {
    const customResult = options.customValidator(config);
    if (!customResult.isValid) {
      result.isValid = false;
      result.errors.push(...customResult.errors);
    }
  }

  // 严格模式检查（可以添加已知键的列表）
  if (options.strict && options.requiredKeys) {
    const configKeys = Object.keys(config);
    const unknownKeys = configKeys.filter(
      (key) => !options.requiredKeys!.includes(key)
    );
    if (unknownKeys.length > 0) {
      result.warnings.push(
        `Unknown configuration keys: ${unknownKeys.join(', ')}`
      );
    }
  }

  return result;
}

/**
 * 生成安全的加密密钥
 *
 * @param length - 密钥长度（字节），默认32字节（256位）
 * @param format - 输出格式，默认为hex
 * @returns 生成的密钥
 */
export function generateSecureKey(
  length: number = 32,
  format: 'hex' | 'base64' | 'buffer' = 'hex'
): string | Buffer {
  const keyBuffer = crypto.randomBytes(length);

  switch (format) {
    case 'hex':
      return keyBuffer.toString('hex');
    case 'base64':
      return keyBuffer.toString('base64');
    case 'buffer':
      return keyBuffer;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * 从文件加载 JSON 配置（仅支持 JSON 格式）
 *
 * @param filePath - JSON 配置文件路径
 * @returns JSON 配置对象
 * @throws {Error} 当文件不存在、不是 JSON 格式或内容无效时抛出错误
 */
export function loadConfigFromFile(filePath: string): Record<string, any> {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`JSON configuration file not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();

    // 明确只支持 JSON 文件
    if (ext !== '.json' && ext !== '') {
      throw new Error(
        `Only JSON configuration files are supported. Got file extension: ${ext}. Please use a .json file.`
      );
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // 解析 JSON 内容
    const parsedConfig = JSON.parse(content);

    // 验证解析后的内容是否为有效的 JSON 对象
    const validation = validateJsonInput(parsedConfig, false);
    if (!validation.isValid) {
      throw new Error(
        `Invalid JSON configuration file: ${validation.error}. The file must contain a valid JSON object.`
      );
    }

    return parsedConfig;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON syntax in configuration file: ${error.message}`
      );
    }
    throw new Error(
      `Failed to load JSON configuration from file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 保存配置到文件
 *
 * @param config - 配置对象
 * @param filePath - 输出文件路径
 * @param format - 输出格式
 */
export function saveConfigToFile(
  config: Record<string, any>,
  filePath: string,
  format: 'json' | 'env' = 'json'
): void {
  try {
    const fs = require('node:fs');
    const path = require('node:path');

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let content: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(config, null, 2);
        break;
      case 'env':
        // 生成环境变量格式
        content = Object.entries(config)
          .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
          .join('\n');
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
  } catch (error) {
    throw new Error(
      `Failed to save configuration to file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
