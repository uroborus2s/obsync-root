import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export enum EncryptionAlgorithm {
  AES_256_GCM = 'aes-256-gcm'
}

const DEFAULT_ENCRYPTION_KEY = new Uint8Array([
  0x7b, 0x41, 0xa2, 0xb3, 0xc5, 0xd8, 0xe7, 0xf1, 0x23, 0x45, 0x67, 0x89, 0xab,
  0xcd, 0xef, 0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10, 0x0f, 0x1e, 0x2d,
  0x3c, 0x4b, 0x5a, 0x69, 0x78, 0x87
]);

const STRATIX_ENCRYPTION_KEY = 'STRATIX_ENCRYPTION_KEY';

export interface EncryptOptions {
  algorithm?: EncryptionAlgorithm;
  key?: string | Buffer;
  iv?: Buffer;
  outputFormat?: 'base64' | 'hex' | 'buffer';
  useDefaultKey?: boolean;
  verbose?: boolean;
}

export interface DecryptOptions {
  algorithm?: EncryptionAlgorithm;
  key?: string | Buffer;
  inputFormat?: 'base64' | 'hex' | 'buffer';
  useDefaultKey?: boolean;
  verbose?: boolean;
}

export interface EncryptResult {
  encrypted: string | Buffer;
  iv: Buffer;
  authTag?: Buffer;
}

export interface ConfigValidationOptions {
  requiredKeys?: string[];
  customValidator?: (config: any) => { isValid: boolean; errors: string[] };
  strict?: boolean;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function getEncryptionKey(
  key?: string | Buffer,
  useDefaultKey?: boolean
): Buffer {
  if (useDefaultKey === true) {
    return Buffer.from(DEFAULT_ENCRYPTION_KEY);
  }

  if (key) {
    const rawKey = typeof key === 'string' ? Buffer.from(key) : key;
    return rawKey.length === 32
      ? rawKey
      : crypto.createHash('sha256').update(rawKey).digest();
  }

  const envKey = process.env[STRATIX_ENCRYPTION_KEY];
  if (envKey) {
    return crypto.createHash('sha256').update(Buffer.from(envKey)).digest();
  }

  return Buffer.from(DEFAULT_ENCRYPTION_KEY);
}

function validateJsonInput(input: any): { isValid: boolean; error?: string } {
  if (input === null || input === undefined) {
    return { isValid: false, error: 'Input cannot be null or undefined' };
  }

  if (typeof input !== 'object') {
    return {
      isValid: false,
      error: `Input must be an object, got ${typeof input}`
    };
  }

  if (Array.isArray(input)) {
    return {
      isValid: false,
      error: 'Input cannot be an array, must be a JSON object'
    };
  }

  try {
    const jsonString = JSON.stringify(input);
    const parsed = JSON.parse(jsonString);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        isValid: false,
        error: 'Input is not a valid JSON object after serialization'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid JSON object: ${error instanceof Error ? error.message : 'Unknown serialization error'}`
    };
  }
}

export function encrypt(
  data: string | Buffer,
  options: EncryptOptions = {}
): EncryptResult {
  const algorithm = options.algorithm || EncryptionAlgorithm.AES_256_GCM;
  const key = getEncryptionKey(options.key, options.useDefaultKey);
  const iv = options.iv || crypto.randomBytes(16);
  const outputFormat = options.outputFormat || 'base64';
  const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(dataBuffer);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = algorithm.includes('gcm') ? cipher.getAuthTag() : undefined;

  return {
    encrypted:
      outputFormat === 'buffer' ? encrypted : encrypted.toString(outputFormat),
    iv,
    authTag
  };
}

export function decrypt(
  encrypted: string | Buffer,
  iv: Buffer,
  authTag: Buffer | undefined,
  options: DecryptOptions = {}
): string {
  const algorithm = options.algorithm || EncryptionAlgorithm.AES_256_GCM;
  const key = getEncryptionKey(options.key, options.useDefaultKey);
  const inputFormat = options.inputFormat || 'base64';
  const encryptedBuffer =
    typeof encrypted === 'string'
      ? Buffer.from(encrypted, inputFormat as BufferEncoding)
      : encrypted;

  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  if (algorithm.includes('gcm') && authTag) {
    decipher.setAuthTag(authTag);
  }

  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

export function encryptConfig(
  config: Record<string, any>,
  options: EncryptOptions = {}
): string {
  const validation = validateJsonInput(config);
  if (!validation.isValid) {
    throw new Error(`配置加密失败: ${validation.error}`);
  }

  const jsonStr = JSON.stringify(config);
  const { encrypted, iv, authTag } = encrypt(jsonStr, options);
  const ivHex = iv.toString('hex');
  const authTagHex = authTag ? authTag.toString('hex') : '';

  return `${ivHex}.${authTagHex}.${encrypted}`;
}

export function decryptConfig(
  encryptedConfig: string,
  options: DecryptOptions = {}
): Record<string, any> {
  const parts = encryptedConfig.split('.');
  if (parts.length !== 3) {
    throw new Error(
      'Invalid encrypted config format: expected format "iv.authTag.encrypted"'
    );
  }

  const [ivHex, authTagHex, encryptedData] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = authTagHex ? Buffer.from(authTagHex, 'hex') : undefined;
  const jsonStr = decrypt(encryptedData, iv, authTag, options);
  const parsedConfig = JSON.parse(jsonStr);
  const validation = validateJsonInput(parsedConfig);

  if (!validation.isValid) {
    throw new Error(`解密后的数据不是有效的 JSON 对象: ${validation.error}`);
  }

  return parsedConfig;
}

export function validateConfig(
  config: any,
  options: ConfigValidationOptions = {}
): ConfigValidationResult {
  const result: ConfigValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!config || typeof config !== 'object') {
    result.isValid = false;
    result.errors.push('Configuration must be a valid object');
    return result;
  }

  if (options.requiredKeys) {
    for (const key of options.requiredKeys) {
      if (!(key in config)) {
        result.isValid = false;
        result.errors.push(`Missing required configuration key: ${key}`);
      }
    }
  }

  if (options.customValidator) {
    const customResult = options.customValidator(config);
    if (!customResult.isValid) {
      result.isValid = false;
      result.errors.push(...customResult.errors);
    }
  }

  if (options.strict && options.requiredKeys) {
    const configKeys = Object.keys(config);
    const unknownKeys = configKeys.filter(
      (key) => !options.requiredKeys!.includes(key)
    );

    if (unknownKeys.length > 0) {
      result.warnings.push(`Unknown configuration keys: ${unknownKeys.join(', ')}`);
    }
  }

  return result;
}

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

export function loadConfigFromFile(filePath: string): Record<string, any> {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`JSON configuration file not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.json' && ext !== '') {
      throw new Error(
        `Only JSON configuration files are supported. Got file extension: ${ext}. Please use a .json file.`
      );
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const parsedConfig = JSON.parse(content);
    const validation = validateJsonInput(parsedConfig);

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

function serializeEnvValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  return JSON.stringify(JSON.stringify(value));
}

export function saveConfigToFile(
  config: Record<string, any>,
  filePath: string,
  format: 'json' | 'env' = 'json'
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (format === 'env') {
    const content = Object.entries(config)
      .map(([key, value]) => `${key}=${serializeEnvValue(value)}`)
      .join('\n');
    fs.writeFileSync(filePath, `${content}\n`, 'utf8');
    return;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
