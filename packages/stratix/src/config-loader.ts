import fs from 'fs';
import path from 'path';
import { AppConfig, ConfigLoader, Context } from './types/config.js';

/**
 * 默认配置文件路径
 */
const DEFAULT_CONFIG_PATHS = [
  'stratix.config.js',
  'stratix.config.ts',
  'stratix.config.mjs',
  'stratix.config.cjs'
];

/**
 * 创建应用上下文
 */
export function createContext(): Context {
  return {
    env: process.env as Record<string, string>
  };
}

/**
 * 查找配置文件
 */
export async function findConfigFile(
  cwd = process.cwd()
): Promise<string | null> {
  for (const file of DEFAULT_CONFIG_PATHS) {
    const configPath = path.resolve(cwd, file);
    try {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    } catch (err) {
      // 忽略错误，继续查找下一个文件
    }
  }
  return null;
}

/**
 * 加载配置
 */
export async function loadConfig(configPath?: string): Promise<AppConfig> {
  const cwd = process.cwd();
  const configFile = configPath || (await findConfigFile(cwd));

  if (!configFile) {
    throw new Error(
      `找不到配置文件。请在项目根目录创建 stratix.config.js 或其他支持的配置文件格式。`
    );
  }

  try {
    // 动态导入配置文件
    const config = await import(configFile);
    const configLoader = config.default as ConfigLoader;

    if (typeof configLoader !== 'function') {
      throw new Error(`配置文件必须导出一个默认函数。`);
    }

    // 创建上下文并执行配置加载器
    const context = createContext();
    const appConfig = configLoader(context);

    return appConfig;
  } catch (err: any) {
    throw new Error(`加载配置文件失败: ${err.message}`);
  }
}
