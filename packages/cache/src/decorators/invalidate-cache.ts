import { CacheAPI } from '../types/api.js';
import { InvalidateCacheOptions } from '../types/decorator.js';

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
 * 使缓存失效装饰器
 * 在方法调用后，使指定的缓存键失效
 *
 * @param options 配置选项
 */
export function InvalidateCache(
  options: InvalidateCacheOptions = {}
): MethodDecorator {
  return function (
    target: any,
    propertyName: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        // 调用原始方法
        const result = await originalMethod.apply(this, args);

        // 获取缓存实例
        const cache = getCacheInstance();

        // 根据选项无效化缓存
        await invalidateCache(cache, options);

        return result;
      } catch (error) {
        // 如果缓存相关操作出错，仍然返回原方法结果
        console.error('缓存无效化装饰器错误:', error);
        throw error; // 保持原始错误抛出
      }
    };

    return descriptor;
  };
}

/**
 * 根据选项使缓存失效
 */
async function invalidateCache(
  cache: CacheAPI,
  options: InvalidateCacheOptions
): Promise<void> {
  // 并行执行所有缓存失效操作
  const tasks: Promise<any>[] = [];

  // 1. 使指定的键失效
  if (options.keys && options.keys.length > 0) {
    tasks.push(cache.mdelete(options.keys));
  }

  // 2. 使指定的标签失效
  if (options.tags && options.tags.length > 0) {
    for (const tag of options.tags) {
      tasks.push(cache.invalidateTag(tag));
    }
  }

  // 3. 使命名空间失效
  if (options.namespaces && options.namespaces.length > 0) {
    for (const ns of options.namespaces) {
      tasks.push(cache.invalidateNamespace(ns));
    }
  }

  // 4. 清除所有缓存
  if (options.all) {
    tasks.push(cache.clear());
  }

  // 等待所有失效操作完成
  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
}
