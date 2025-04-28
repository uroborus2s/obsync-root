import { CacheAPI } from '../types/api.js';
import { CachedOptions } from '../types/decorator.js';

/**
 * 获取全局缓存实例
 * 优先从容器中获取，如果不存在则尝试从全局对象中获取
 */
function getCacheInstance(): CacheAPI {
  // 检查全局对象
  const globalObj = global as any;

  // 如果存在DI容器，从容器中获取
  if (
    globalObj.container &&
    typeof globalObj.container.resolve === 'function'
  ) {
    try {
      return globalObj.container.resolve('cache');
    } catch (e) {
      // 忽略错误，尝试其他方法获取
    }
  }

  // 从应用实例获取
  if (globalObj.app && globalObj.app.cache) {
    return globalObj.app.cache;
  }

  // 直接从全局获取
  if (globalObj.cache) {
    return globalObj.cache;
  }

  throw new Error('无法获取缓存实例。请确保已注册缓存插件。');
}

/**
 * 生成默认缓存键
 * 基于类名、方法名和参数生成
 */
function generateDefaultKey(
  target: any,
  propertyName: string,
  args: any[]
): string {
  const className = target.constructor ? target.constructor.name : 'global';
  const argsStr = args.length > 0 ? `:${JSON.stringify(args)}` : '';
  return `${className}:${propertyName}${argsStr}`;
}

/**
 * 缓存函数结果装饰器
 * 使方法结果被缓存，再次调用时从缓存中获取
 *
 * @param options 缓存配置选项
 */
export function Cached(options: CachedOptions = {}): MethodDecorator {
  return function (
    target: any,
    propertyName: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const methodName = propertyName.toString();

    descriptor.value = async function (...args: any[]) {
      try {
        // 检查条件，如果设置了条件且不满足，直接调用原方法
        if (options.cond && !options.cond(args)) {
          return originalMethod.apply(this, args);
        }

        // 获取缓存实例
        const cache = getCacheInstance();

        // 使用命名空间（如果有指定）
        let cacheInstance: CacheAPI = cache;
        if (options.namespace) {
          cacheInstance = cache.namespace(options.namespace);
        }

        // 生成缓存键
        const cacheKey =
          typeof options.key === 'function'
            ? options.key(args)
            : options.key
              ? `${options.key}:${JSON.stringify(args)}`
              : generateDefaultKey(target, methodName, args);

        // 执行缓存读取或原始方法执行
        return await getOrSetCacheResult(
          cacheInstance,
          cacheKey,
          originalMethod,
          this,
          args,
          options
        );
      } catch (error) {
        // 如果缓存相关操作出错，退化为直接调用原方法
        console.error('缓存装饰器错误:', error);
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * 从缓存获取或设置结果的辅助函数
 */
async function getOrSetCacheResult(
  cache: CacheAPI,
  key: string,
  method: Function,
  context: any,
  args: any[],
  options: CachedOptions
): Promise<any> {
  // 尝试从缓存获取
  const cachedValue = await cache.get(key);

  // 如果有缓存值，直接返回
  if (cachedValue !== null) {
    return cachedValue;
  }

  try {
    // 执行原始方法获取结果
    const result = await method.apply(context, args);

    // 缓存结果
    await cache.set(key, result, options.ttl);

    // 如果配置了需要失效的标签，处理标签失效
    if (options.invalidateTags && options.invalidateTags.length > 0) {
      for (const tag of options.invalidateTags) {
        await cache.invalidateTag(tag);
      }
    }

    return result;
  } catch (error) {
    // 如果设置了错误缓存时间，缓存错误结果
    if (options.errorTtl && options.errorTtl > 0) {
      const errorObj = {
        __CACHE_ERROR__: true,
        message: (error as Error).message,
        stack: (error as Error).stack
      };
      await cache.set(key, errorObj, options.errorTtl);
    }
    throw error;
  }
}
