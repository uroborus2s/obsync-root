// 环境配置加载工具
// 负责从环境变量中加载和解密敏感配置信息

import {
  validateConfig as coreValidateConfig,
  decryptConfig,
  encryptConfig,
  loadConfigFromFile,
  type ConfigValidationOptions
} from '@stratix/core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 敏感配置信息接口
 */
export interface SensitiveConfig {
  web: {
    port: number;
    host: string;
    https?: {
      key: string;
      cert: string;
    };
  };
  logger: {
    loglevle: string;
    disableRequestLogging: boolean;
  };
  databases: {
    default: {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };
    origin: {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };
  };
  wasV7: {
    appId: string;
    appSecret: string;
  };
  icalink_api: {
    appUrl: string;
    tokenSecret: string;
  };
}

/**
 * 环境配置加载器
 * 使用 @stratix/core 的加密功能
 */
export class EnvironmentLoader {
  /**
   * 获取项目根目录
   */
  private static getProjectRoot(): string {
    const currentDir =
      typeof __dirname !== 'undefined'
        ? __dirname
        : path.dirname(fileURLToPath(import.meta.url));

    return path.resolve(currentDir, '../..');
  }

  /**
   * 加密配置信息
   *
   * @param data - 要加密的配置对象
   * @returns 加密后的字符串
   */
  static encryptConfig(data: SensitiveConfig): string {
    try {
      return encryptConfig(data);
    } catch (error) {
      throw new Error(
        `配置加密失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 解密配置信息
   *
   * @param encryptedData - 加密的配置字符串
   * @returns 解密后的配置对象
   */
  static decryptConfig(encryptedData: string): SensitiveConfig {
    try {
      return decryptConfig(encryptedData) as SensitiveConfig;
    } catch (error) {
      throw new Error(
        `配置解密失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 从文件加载配置
   *
   * @param filePath - 配置文件路径
   * @returns 配置对象
   */
  static loadFromFile(filePath: string): SensitiveConfig {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(this.getProjectRoot(), filePath);

      // 使用 @stratix/core 的 loadConfigFromFile 功能
      return loadConfigFromFile(fullPath) as SensitiveConfig;
    } catch (error) {
      throw new Error(
        `从文件加载配置失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 验证配置对象的完整性
   *
   * @param config - 要验证的配置对象
   * @returns 验证是否通过
   */
  static validateConfig(config: any): config is SensitiveConfig {
    const validationOptions: ConfigValidationOptions = {
      requiredKeys: ['web', 'logger', 'databases', 'wasV7', 'icalink_api'],
      customValidator: (cfg) => {
        const errors: string[] = [];

        // 检查 web 配置
        if (!cfg.web?.port || !cfg.web?.host) {
          errors.push('web 配置缺少 port 或 host');
        }

        // 检查数据库配置
        const dbKeys = ['default', 'origin'];
        for (const dbKey of dbKeys) {
          const db = cfg.databases?.[dbKey];
          if (!db || !db.host || !db.user || !db.database) {
            errors.push(`数据库配置 ${dbKey} 不完整`);
          }
        }

        // 检查 wasV7 配置
        if (!cfg.wasV7?.appId || !cfg.wasV7?.appSecret) {
          errors.push('wasV7 配置缺少 appId 或 appSecret');
        }

        // 检查 icalink_api 配置
        if (!cfg.icalink_api?.appUrl || !cfg.icalink_api?.tokenSecret) {
          errors.push('icalink_api 配置缺少 appUrl 或 tokenSecret');
        }

        return { isValid: errors.length === 0, errors };
      }
    };

    try {
      const result = coreValidateConfig(config, validationOptions);
      if (!result.isValid) {
        console.error('配置验证失败:', result.errors);
      }
      return result.isValid;
    } catch (error) {
      console.error('配置验证失败:', error);
      return false;
    }
  }
}

/**
 * 加载环境配置的主函数
 *
 * @returns 解密后的敏感配置信息
 */
export function loadEnvironment(): SensitiveConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  try {
    // 1. 尝试从环境变量加载加密配置
    const encryptedConfig = process.env.STRATIX_SENSITIVE_CONFIG;

    if (encryptedConfig) {
      console.log('🔐 从环境变量加载加密配置...');
      const config = EnvironmentLoader.decryptConfig(encryptedConfig);

      if (EnvironmentLoader.validateConfig(config)) {
        console.log('✅ 加密配置加载和验证成功');
        return config;
      } else {
        throw new Error('加密配置验证失败');
      }
    }

    // 2. 如果没有加密配置，尝试从文件加载（开发环境）
    if (nodeEnv === 'development') {
      console.log('🔧 开发环境：从 prod.env.json 文件加载配置...');
      const config = EnvironmentLoader.loadFromFile('prod.env.json');

      if (EnvironmentLoader.validateConfig(config)) {
        console.log('✅ 文件配置加载和验证成功');
        return config;
      } else {
        throw new Error('文件配置验证失败');
      }
    }

    // 3. 生产环境必须使用加密配置
    throw new Error('生产环境必须设置 STRATIX_SENSITIVE_CONFIG 环境变量');
  } catch (error) {
    console.error('❌ 环境配置加载失败:', error);
    throw error;
  }
}

/**
 * 生成加密配置的工具函数
 * 用于将 prod.env.json 转换为加密的环境变量
 */
export function generateEncryptedConfig(): void {
  try {
    console.log('🔧 生成加密配置...');

    const config = EnvironmentLoader.loadFromFile('prod.env.json');
    const encrypted = EnvironmentLoader.encryptConfig(config);

    console.log('✅ 加密配置生成成功！');
    console.log('');
    console.log('请将以下内容设置为 STRATIX_SENSITIVE_CONFIG 环境变量：');
    console.log('');
    console.log(encrypted);
    console.log('');
    console.log('示例：');
    console.log(`export STRATIX_SENSITIVE_CONFIG="${encrypted}"`);
  } catch (error) {
    console.error('❌ 生成加密配置失败:', error);
    throw error;
  }
}
