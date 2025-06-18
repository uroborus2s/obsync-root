/**
 * 环境变量加载器
 *
 * 在开发环境使用dotenv从文件中加载环境变量
 * 在生产环境直接从系统环境变量中获取
 * 当无法获取环境变量时，动态从文件加载
 *
 * @packageDocumentation
 */

import { env } from '@stratix/utils';
import fs from 'node:fs';
import path from 'node:path';
import { Logger } from 'pino';

/**
 * dotenv模块和dotenv-expand模块会动态导入
 * 避免在生产环境中加载不必要的依赖
 */

/**
 * 环境变量文件名前缀
 */
const ENV_FILE_PREFIX = '.env';

/**
 * 环境变量记录类型
 */
export type EnvRecord = Record<string, string | undefined>;

export interface EnvLoaderOptions {
  /**
   * 项目根目录路径，默认为process.cwd()
   */
  rootDir?: string;

  /**
   * 是否覆盖已存在的环境变量，默认为false
   */
  override?: boolean;

  /**
   * 需要从文件中加载的路径列表，覆盖默认的搜索路径
   */
  paths?: string[];

  /**
   * 严格模式 - 如果设置为true，当.env文件不存在时会抛出错误
   */
  strict?: boolean;
}

/**
 * 加载环境变量
 *
 * 在开发环境下，从.env文件加载
 * 在生产环境下，直接使用系统环境变量，如果缺少必要变量则从文件加载
 * 所有加载的环境变量都会被合并到process.env中
 *
 * @param options 环境变量加载选项
 */
export async function loadEnv(
  logger: Logger,
  options: EnvLoaderOptions = {}
): Promise<void> {
  // 使用utility函数判断环境
  const rootDir = options.rootDir || process.cwd();
  const override = options.override || false;
  const strict = options.strict || false;

  try {
    // 如果提供了自定义路径，或者不是生产环境，加载环境变量文件
    if (!env.isProduction() || options.paths) {
      logger.debug('从环境变量文件加载配置');
      // 动态导入依赖，无论是什么环境，都准备好dotenv
      const dotenv = await import('dotenv');
      const dotenvExpand = await import('dotenv-expand');
      // 获取环境变量文件路径
      const envFiles =
        options.paths || getDefaultEnvFiles(rootDir, env.getNodeEnv());

      // 尝试加载每个可能的环境变量文件 - 注意加载顺序
      // envFiles数组是按优先级从低到高排序的，后面加载的会覆盖前面的
      for (const filePath of envFiles) {
        if (!fs.existsSync(filePath)) {
          logger.debug(`环境变量文件不存在: ${filePath}`);
          // 如果在严格模式下且特定的必需文件不存在，则抛出错误
          if (strict && filePath === path.resolve(rootDir, `.env`)) {
            throw new Error(`必需的环境变量文件不存在: ${filePath}`);
          }
          continue;
        }

        logger.debug(`加载环境变量文件: ${filePath}`);

        // 使用dotenv加载文件
        const result = dotenv.config({
          path: filePath,
          override // 控制是否覆盖系统环境变量
        });

        // 扩展变量引用，如 DB_HOST=${HOST}
        dotenvExpand.expand(result);
      }
    } else {
      logger.debug('生产环境: 优先使用系统环境变量');
    }
  } catch (error) {
    logger.error('加载环境变量文件失败', error);
    if (strict) {
      throw error;
    }
  }
}

/**
 * 获取默认的环境变量文件路径列表
 *
 * @param rootDir 项目根目录
 * @param envName 环境名称
 * @returns 环境变量文件路径列表 (按优先级从低到高排序)
 */
function getDefaultEnvFiles(rootDir: string, envName: string): string[] {
  // 按优先级排序: .env < .env.${envName} < .env.${envName}.local < .env.local
  const suffixes = [
    '', // .env (最低优先级，基础配置)
    `.${envName}`, // 例如: .env.development (环境特定配置)
    `.${envName}.local`, // 例如: .env.development.local (本地环境特定配置)
    '.local' // .env.local (最高优先级，本地通用配置)
  ];

  return suffixes.map((suffix) =>
    path.resolve(rootDir, `${ENV_FILE_PREFIX}${suffix}`)
  );
}
