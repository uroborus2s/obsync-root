/**
 * 配置加载器实现
 */
import { object } from '@stratix/utils';
import fs from 'node:fs';
import path from 'node:path';
import { EnvOptions } from '../types/common.js';
import { ConfigFileError } from '../types/errors.js';
import { ConfigLoaderOptions } from './types.js';

/**
 * 配置加载器类
 * 负责从不同来源加载配置
 */
export class ConfigLoader {
  /**
   * 加载器选项
   */
  private readonly _options: ConfigLoaderOptions;

  /**
   * 构造函数
   * @param options 配置加载器选项
   */
  constructor(options: ConfigLoaderOptions = {}) {
    this._options = options;
  }

  /**
   * 加载配置
   * @returns 加载的配置对象
   */
  load(): Record<string, any> {
    // 基础配置
    let config: Record<string, any> = {};

    // 1. 加载配置文件
    if (this._options.configPath) {
      const fileConfig = this._loadConfigFile(this._options.configPath);
      config = object.deepMerge(config, fileConfig);
    }

    // 2. 合并内联配置
    if (this._options.config) {
      config = object.deepMerge(config, this._options.config);
    }

    // 3. 处理环境变量
    if (this._options.env) {
      const envConfig = this._loadEnvConfig(
        typeof this._options.env === 'object' ? this._options.env : {}
      );
      config = object.deepMerge(config, envConfig);
    }

    return config;
  }

  /**
   * 加载配置文件
   * @param filePath 配置文件路径
   * @returns 加载的配置对象
   * @throws ConfigFileError 配置文件加载失败时抛出
   */
  private _loadConfigFile(filePath: string): Record<string, any> {
    const resolvedPath = path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new ConfigFileError(`配置文件不存在: ${resolvedPath}`);
    }

    const ext = path.extname(resolvedPath).toLowerCase();

    try {
      // 根据文件扩展名处理不同类型的配置文件
      switch (ext) {
        case '.js':
        case '.cjs':
          // 加载CommonJS模块
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          return require(resolvedPath);
        case '.json':
          // 加载JSON文件
          return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        case '.yml':
        case '.yaml':
          // 加载YAML文件
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const yaml = require('js-yaml');
            return yaml.load(fs.readFileSync(resolvedPath, 'utf8'));
          } catch (err) {
            throw new ConfigFileError(
              `无法加载YAML配置文件: ${resolvedPath}. 请安装js-yaml包.`
            );
          }
        default:
          throw new ConfigFileError(`不支持的配置文件格式: ${ext}`);
      }
    } catch (err) {
      if (err instanceof ConfigFileError) {
        throw err;
      }
      throw new ConfigFileError(
        `加载配置文件失败: ${resolvedPath}. ${(err as Error).message}`
      );
    }
  }

  /**
   * 加载环境变量配置
   * @param options 环境变量选项
   * @returns 环境变量配置对象
   */
  private _loadEnvConfig(options: EnvOptions): Record<string, any> {
    // 支持dotenv
    if (options.dotenv) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('dotenv').config();
      } catch (err) {
        console.warn('无法加载dotenv，请安装dotenv包');
      }
    }

    // 检查必需的环境变量
    if (options.required) {
      for (const key of options.required) {
        if (process.env[key] === undefined) {
          throw new ConfigFileError(`缺少必需的环境变量: ${key}`);
        }
      }
    }

    // 提取匹配前缀的环境变量
    const prefix = options.prefix || '';
    const config: Record<string, any> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (prefix && !key.startsWith(prefix)) {
        continue;
      }

      // 移除前缀并转换为嵌套结构
      const configKey = prefix ? key.slice(prefix.length) : key;
      const keyPath = configKey.split('__').join('.');

      // 设置值并处理环境变量值类型
      const processedValue = this._processEnvValue(value);
      object.set(config, keyPath, processedValue);
    }

    return config;
  }

  /**
   * 处理环境变量值
   * @param value 环境变量值
   * @returns 处理后的值
   */
  private _processEnvValue(value: string | undefined): any {
    if (value === undefined) return undefined;

    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;

    // null值
    if (value === 'null') return null;

    // 数字
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }

    // 日期
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
      return new Date(value);
    }

    // 默认为字符串
    return value;
  }
}
