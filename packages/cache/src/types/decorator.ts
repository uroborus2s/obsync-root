/**
 * 缓存装饰器选项
 */
export interface CachedOptions {
  /**
   * 缓存键或键生成函数
   * 如果是函数，将接收方法参数生成缓存键
   */
  key?: string | ((args: any[]) => string);

  /**
   * 缓存过期时间（毫秒）
   * 默认使用缓存插件的全局ttl
   */
  ttl?: number;

  /**
   * 缓存命名空间
   */
  namespace?: string;

  /**
   * 条件函数，决定是否缓存结果
   * 返回true时缓存，false时不缓存
   */
  cond?: (args: any[]) => boolean;

  /**
   * 调用方法后使哪些标签失效
   */
  invalidateTags?: string[];

  /**
   * 错误结果的缓存时间
   * 如果设置，将缓存方法抛出的错误
   */
  errorTtl?: number;
}

/**
 * 缓存清除装饰器选项
 */
export interface InvalidateCacheOptions {
  /**
   * 要清除的缓存键
   */
  keys?: string[];

  /**
   * 要清除的缓存标签
   */
  tags?: string[];

  /**
   * 要清除的缓存命名空间
   */
  namespaces?: string[];

  /**
   * 是否清除所有缓存
   */
  all?: boolean;
}
