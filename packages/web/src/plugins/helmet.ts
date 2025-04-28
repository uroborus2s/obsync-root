/**
 * Helmet安全插件集成
 */

import fastifyHelmet from '@fastify/helmet';
import { FastifyInstance } from 'fastify';
import { HelmetPluginOptions } from '../types/options.js';

/**
 * 默认Helmet配置选项
 */
export const DEFAULT_HELMET_OPTIONS: HelmetPluginOptions = {
  enabled: true,
  options: {
    // 默认启用所有安全标头
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    xssFilter: true,
    noSniff: true,
    hsts: {
      maxAge: 15552000, // 180天
      includeSubDomains: true
    }
  }
};

/**
 * 注册Helmet安全插件
 * @param fastify Fastify实例
 * @param options Helmet配置选项
 */
export async function registerHelmet(
  fastify: FastifyInstance,
  helmetConfig: boolean | HelmetPluginOptions = {}
): Promise<void> {
  // 如果为false，则禁用
  if (helmetConfig === false) {
    return;
  }

  // 根据配置合并选项
  const config: HelmetPluginOptions =
    helmetConfig === true || helmetConfig === undefined
      ? DEFAULT_HELMET_OPTIONS
      : {
          ...DEFAULT_HELMET_OPTIONS,
          ...helmetConfig,
          options: {
            ...(DEFAULT_HELMET_OPTIONS.options || {}),
            ...(helmetConfig.options || {})
          }
        };

  // 如果明确禁用，则跳过
  if (config.enabled === false) {
    return;
  }

  // 注册Helmet插件
  await fastify.register(fastifyHelmet, config.options);
}
