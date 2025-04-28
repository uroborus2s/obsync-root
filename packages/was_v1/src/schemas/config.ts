import { z } from 'zod';
import { WasV1Options } from '../types/config.js';

/**
 * WPS API V1插件配置验证模式
 */
export const wasV1ConfigSchema = z.object({
  // 必填项
  appId: z.string().min(1, '应用ID不能为空'),
  appKey: z.string().min(1, '应用密钥不能为空'),

  // 可选项
  baseUrl: z.string().url().optional().default('https://openapi.wps.cn'),
  tokenCacheEnabled: z.boolean().optional().default(true),
  tokenCacheTTL: z.number().positive().optional().default(3600000), // 默认1小时
  requestTimeout: z.number().positive().optional().default(10000), // 默认10秒
  maxRetries: z.number().min(0).optional().default(3),
  retryDelay: z.number().positive().optional().default(1000), // 默认1秒
  logLevel: z
    .enum(['debug', 'info', 'warn', 'error'])
    .optional()
    .default('info')
});

/**
 * 验证并补充默认配置
 * @param options 配置选项
 * @returns 验证后的配置
 */
export function validateConfig(options: WasV1Options): WasV1Options {
  return wasV1ConfigSchema.parse(options);
}
