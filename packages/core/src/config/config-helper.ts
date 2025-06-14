/**
 * 配置辅助函数
 */

import type { StratixConfig } from '../types/config.js';

/**
 * 定义Stratix应用配置的辅助函数
 * 此函数提供类型检查支持，但本身不执行任何特殊操作
 *
 * @param config Stratix应用配置对象
 * @returns 原始配置对象
 */
export function defineConfig(config: StratixConfig): StratixConfig {
  return config;
}
