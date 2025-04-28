/**
 * @stratix/cache 类型声明文件
 */

declare module '@stratix/cache' {
  export interface CacheOptions {
    driver: 'memory' | 'redis' | string;
    connection?: {
      host?: string;
      port?: number;
      [key: string]: any;
    };
    prefix?: string;
    ttl?: number;
    [key: string]: any;
  }

  export interface Cache {
    /**
     * 获取缓存
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * 设置缓存
     */
    set<T>(key: string, value: T, ttl?: number): Promise<boolean>;

    /**
     * 删除缓存
     */
    delete(key: string): Promise<boolean>;

    /**
     * 清除缓存
     */
    clear(pattern?: string): Promise<boolean>;

    /**
     * 获取或设置缓存
     */
    remember<T>(
      key: string,
      callback: () => Promise<T>,
      ttl?: number
    ): Promise<T>;
  }

  export class CacheManager {
    constructor(options: CacheOptions);

    /**
     * 获取缓存实例
     */
    getCache(name?: string): Cache;

    /**
     * 添加缓存驱动
     */
    addDriver(name: string, driver: any): void;

    /**
     * 创建缓存实例
     */
    createCache(name: string, options?: CacheOptions): Cache;
  }
}
