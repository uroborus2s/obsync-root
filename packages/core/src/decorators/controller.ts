// Controller 装饰器
// 提供 Controller 类装饰器支持

import 'reflect-metadata';
import {
  type ControllerMetadata,
  type ControllerOptions,
  MetadataManager
} from './metadata.js';

/**
 * Controller 装饰器
 * 用于标记和配置 Controller 类
 *
 * 注意：路由前缀应通过 AutoDIConfig.routing.prefix 配置，
 * 而不是在 @Controller 装饰器中指定，以符合 Fastify Route Prefixing 最佳实践
 */
export function Controller(options?: ControllerOptions) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const metadata: ControllerMetadata = {
      prefix: '', // 不再支持前缀参数，使用 Fastify 原生前缀机制
      options: options || {}
    };

    // 设置控制器元数据
    MetadataManager.setControllerMetadata(constructor, metadata);

    return constructor;
  };
}
