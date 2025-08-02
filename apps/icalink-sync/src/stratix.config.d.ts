import { type StratixConfig } from '@stratix/core';
import { type SensitiveConfig } from './config/environment.js';
/**
 * 主配置导出函数
 *
 * 支持两种使用方式：
 * 1. 传入敏感配置信息：export default createStratixConfig(sensitiveInfo)
 * 2. 自动加载环境配置：export default createStratixConfig()
 *
 * @param sensitiveInfo - 可选的敏感配置信息，如果不提供则自动从环境变量加载
 * @returns Stratix 配置对象
 */
export default function createConfigWithEnvironment(sensitiveInfo?: SensitiveConfig): StratixConfig;
//# sourceMappingURL=stratix.config.d.ts.map