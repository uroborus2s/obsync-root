// Route 装饰器
// 提供路由方法装饰器支持

import { isDevelopment } from '@stratix/utils/environment';
import type { RouteShorthandOptions } from 'fastify';
import { MetadataManager, type RouteMetadata } from './metadata.js';

/**
 * HTTP 方法装饰器工厂
 *
 * 三层函数结构说明：
 * 1. 第一层：创建特定 HTTP 方法的装饰器工厂 (method: string)
 * 2. 第二层：装饰器工厂函数，接收路由配置 (path, opts)
 * 3. 第三层：实际装饰器函数，执行元数据设置逻辑
 */
function createMethodDecorator(method: string) {
  // 验证 HTTP 方法
  const validMethods = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'HEAD',
    'OPTIONS'
  ];
  const upperMethod = method.toUpperCase();

  if (!validMethods.includes(upperMethod)) {
    throw new Error(
      `Invalid HTTP method: ${method}. Valid methods: ${validMethods.join(', ')}`
    );
  }

  // 第二层：装饰器工厂函数
  // 这一层的作用是接收路由配置参数，让我们可以写：@Get('/users', options)
  return function (path: string = '/', opts?: RouteShorthandOptions) {
    // 验证路径格式
    if (typeof path !== 'string') {
      throw new Error(`Route path must be a string, got: ${typeof path}`);
    }

    // 确保路径以 / 开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // 第三层：实际装饰器函数
    // 这是 TypeScript 装饰器的标准签名
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      // 验证装饰器使用环境
      if (!target || !propertyKey || !descriptor) {
        throw new Error(`Invalid decorator usage on ${propertyKey}`);
      }

      // 验证被装饰的是否为方法
      if (typeof descriptor.value !== 'function') {
        throw new Error(
          `@${upperMethod} can only be applied to methods, but ${propertyKey} is not a method`
        );
      }

      // 检查是否有重复的路由定义
      const duplicate = MetadataManager.checkDuplicateRoute(
        target.constructor,
        upperMethod,
        normalizedPath
      );

      if (duplicate) {
        console.warn(
          `Warning: Duplicate route definition found: ${upperMethod} ${normalizedPath} ` +
            `on methods ${duplicate.propertyKey} and ${propertyKey}`
        );
      }

      // 创建新的路由元数据
      const routeMetadata: RouteMetadata = {
        method: upperMethod,
        path: normalizedPath,
        options: opts,
        propertyKey,
        target: target.constructor
      };

      // 添加路由元数据
      MetadataManager.addRouteMetadata(target.constructor, routeMetadata);

      // 添加调试信息（开发环境）
      if (isDevelopment()) {
        console.debug(
          `📍 Route registered: ${upperMethod} ${normalizedPath} -> ${target.constructor.name}.${propertyKey}`
        );
      }

      return descriptor;
    };
  };
}

/**
 * GET 方法装饰器
 */
export const Get = createMethodDecorator('GET');

/**
 * POST 方法装饰器
 */
export const Post = createMethodDecorator('POST');

/**
 * PUT 方法装饰器
 */
export const Put = createMethodDecorator('PUT');

/**
 * DELETE 方法装饰器
 */
export const Delete = createMethodDecorator('DELETE');

/**
 * PATCH 方法装饰器
 */
export const Patch = createMethodDecorator('PATCH');

/**
 * HEAD 方法装饰器
 */
export const Head = createMethodDecorator('HEAD');

/**
 * OPTIONS 方法装饰器
 */
export const Options = createMethodDecorator('OPTIONS');
