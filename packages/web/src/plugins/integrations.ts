/**
 * 基础插件集成 - HTTPS、CORS、Compression、Swagger等
 */

import { FastifyInstance } from 'fastify';
import { WebPluginOptions } from '../types/options.js';

/**
 * 配置HTTPS
 * @param fastify Fastify实例
 * @param options HTTPS配置
 */
export function configureHttps(
  fastify: FastifyInstance,
  httpsOptions: any
): void {
  if (!httpsOptions) return;

  // HTTPS配置在创建Fastify实例时传入，这里不需要额外操作
  // 但我们可以记录HTTPS已启用
  fastify.log.info('HTTPS已启用');
}

/**
 * 注册CORS插件
 * @param fastify Fastify实例
 * @param corsOptions CORS配置
 */
export async function registerCors(
  fastify: FastifyInstance,
  corsOptions: boolean | Record<string, any> = {}
): Promise<void> {
  // 如果为false，则禁用
  if (corsOptions === false) {
    return;
  }

  try {
    const corsPlugin = await import('@fastify/cors');

    // 根据配置注册CORS
    if (corsOptions === true) {
      // 默认配置
      await fastify.register(corsPlugin.default);
    } else {
      // 自定义配置
      await fastify.register(corsPlugin.default, corsOptions);
    }

    fastify.log.info('CORS插件已注册');
  } catch (err) {
    fastify.log.error('CORS插件注册失败:', err);
    throw err;
  }
}

/**
 * 注册Compression插件
 * @param fastify Fastify实例
 * @param compressionOptions Compression配置
 */
export async function registerCompression(
  fastify: FastifyInstance,
  compressionOptions: boolean | Record<string, any> = {}
): Promise<void> {
  // 如果为false，则禁用
  if (compressionOptions === false) {
    return;
  }

  try {
    const compressionPlugin = await import('@fastify/compress');

    // 根据配置注册Compression
    if (compressionOptions === true) {
      // 默认配置
      await fastify.register(compressionPlugin.default);
    } else {
      // 自定义配置
      await fastify.register(compressionPlugin.default, compressionOptions);
    }

    fastify.log.info('Compression插件已注册');
  } catch (err) {
    fastify.log.error('Compression插件注册失败:', err);
    throw err;
  }
}

/**
 * 注册Swagger插件
 * @param fastify Fastify实例
 * @param swaggerOptions Swagger配置
 */
export async function registerSwagger(
  fastify: FastifyInstance,
  swaggerOptions: boolean | Record<string, any> = {}
): Promise<void> {
  // 如果为false，则禁用
  if (swaggerOptions === false) {
    return;
  }

  try {
    // 加载Swagger插件
    const swaggerPlugin = await import('@fastify/swagger');
    const swaggerUIPlugin = await import('@fastify/swagger-ui');

    // 默认Swagger配置
    const defaultOptions = {
      swagger: {
        info: {
          title: 'API文档',
          description: '自动生成的API文档',
          version: '1.0.0'
        },
        tags: [{ name: 'default', description: '默认接口' }],
        consumes: ['application/json'],
        produces: ['application/json']
      }
    };

    // 默认SwaggerUI配置
    const defaultUIOptions = {
      routePrefix: '/documentation',
      uiConfig: {
        docExpansion: 'list' as 'list' | 'full' | 'none',
        deepLinking: true
      },
      staticCSP: true,
      transformStaticCSP: (header: string) => header,
      exposeRoute: true
    };

    // 注册Swagger
    if (swaggerOptions === true) {
      // 使用默认配置
      await fastify.register(swaggerPlugin.default, defaultOptions);
      await fastify.register(swaggerUIPlugin.default, defaultUIOptions);
    } else {
      // 合并自定义配置
      const mergedOptions = {
        ...defaultOptions,
        ...swaggerOptions
      };

      const mergedUIOptions = {
        ...defaultUIOptions,
        ...(swaggerOptions.ui || {})
      };

      await fastify.register(swaggerPlugin.default, mergedOptions);
      await fastify.register(swaggerUIPlugin.default, mergedUIOptions);
    }

    fastify.log.info('Swagger插件已注册');
  } catch (err) {
    fastify.log.error('Swagger插件注册失败:', err);
    throw err;
  }
}

/**
 * 注册静态文件服务
 * @param fastify Fastify实例
 * @param staticOptions 静态文件服务配置
 */
export async function registerStatic(
  fastify: FastifyInstance,
  staticOptions: any | any[]
): Promise<void> {
  if (!staticOptions) {
    return;
  }

  try {
    const staticPlugin = await import('@fastify/static');

    // 处理多个静态目录配置
    if (Array.isArray(staticOptions)) {
      for (const options of staticOptions) {
        await fastify.register(staticPlugin.default, options);
      }
    } else {
      // 单个静态目录
      await fastify.register(staticPlugin.default, staticOptions);
    }

    fastify.log.info('静态文件服务已注册');
  } catch (err) {
    fastify.log.error('静态文件服务注册失败:', err);
    throw err;
  }
}

/**
 * 根据插件配置注册所有集成插件
 * @param fastify Fastify实例
 * @param options 插件配置选项
 */
export async function registerIntegrations(
  fastify: FastifyInstance,
  options: WebPluginOptions
): Promise<void> {
  // 配置HTTPS (已在创建Fastify实例时处理，这里只是为了记录)
  if (options.server?.https) {
    configureHttps(fastify, options.server.https);
  }

  // 注册CORS
  if (options.cors !== undefined) {
    await registerCors(fastify, options.cors);
  }

  // 注册Compression
  if (options.compression !== undefined) {
    await registerCompression(fastify, options.compression);
  }

  // 注册Swagger
  if (options.swagger !== undefined) {
    await registerSwagger(fastify, options.swagger);
  }

  // 注册静态文件服务
  if (options.static) {
    await registerStatic(fastify, options.static);
  }
}
