/**
 * 环境变量配置加载器
 *
 * @packageDocumentation
 */

import { crypto } from '@stratix/utils';
import { StratixConfig } from '../types/config.js';

/**
 * 环境变量名称常量
 */
export const ENV_VARS = {
  /**
   * Stratix加密密钥环境变量名
   */
  ENCRYPTION_KEY: 'STRATIX_ENCRYPTION_KEY',

  /**
   * Stratix敏感信息环境变量名
   */
  SENSITIVE_CONFIG: 'STRATIX_SENSITIVE_CONFIG'
};

/**
 * 加密配置为环境变量格式
 *
 * @param config 配置对象
 * @returns 加密后的配置字符串
 */
export function encryptConfigForEnv(config: Record<string, any>): string {
  try {
    return crypto.encryptConfig(config);
  } catch (err) {
    throw new Error(
      `Failed to encrypt config: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * 验证环境变量配置
 *
 * @param config 配置对象
 * @returns 验证后的配置对象
 */
export function validateEnvConfig(
  config: Partial<StratixConfig>
): Partial<StratixConfig> {
  // 这里可以添加验证逻辑
  return config;
}

/**
 * 将敏感信息加密并打印为环境变量设置命令
 *
 * @param sensitiveInfo 敏感信息对象
 * @returns 环境变量设置命令
 */
export function printSensitiveEnvConfig(
  sensitiveInfo: Record<string, any>
): string {
  const encrypted = encryptConfigForEnv(sensitiveInfo);
  return `export ${ENV_VARS.SENSITIVE_CONFIG}="${encrypted}"`;
}

/**
 * 默认导出
 */
export default {
  encryptConfigForEnv,
  printSensitiveEnvConfig
};
