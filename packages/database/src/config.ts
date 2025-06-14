/**
 * 定义数据库连接的参数
 */
export type DatabaseConnectionConfig =
  | {
      client: 'mysql';
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
      connectionLimit?: number;
      timezone?: string;
      charset?: string;
      ssl?: boolean | Record<string, any>;
      acquireTimeout?: number;
      timeout?: number;
      reconnect?: boolean;
      bigNumberStrings?: boolean;
    }
  | {
      client: 'pg';
      database: string;
      host: string;
      user: string;
      password: string;
      port?: number;
      max?: number;
      min?: number;
      idleTimeoutMillis?: number;
      connectionTimeoutMillis?: number;
      ssl?: boolean | Record<string, any>;
      application_name?: string;
      statement_timeout?: number;
      query_timeout?: number;
    }
  | {
      client: 'sqlite';
      database: string;
      readonly?: boolean;
      timeout?: number;
      verbose?: boolean;
      fileMustExist?: boolean;
    }
  | {
      client: 'oracle';
      user: string;
      password: string;
      connectString: string;
      poolMin?: number;
      poolMax?: number;
      poolIncrement?: number;
      poolTimeout?: number;
      queueTimeout?: number;
      enableStatistics?: boolean;
    }
  | {
      client: 'mssql';
      server: string;
      database: string;
      user: string;
      password: string;
      port?: number;
      domain?: string;
      connectionTimeout?: number;
      requestTimeout?: number;
      pool?: {
        max?: number;
        min?: number;
        idleTimeoutMillis?: number;
      };
      options?: {
        encrypt?: boolean;
        trustServerCertificate?: boolean;
        enableArithAbort?: boolean;
      };
    };

/**
 * 缓存配置
 */
export interface CacheConfig {
  /**
   * 缓存类型
   */
  type: 'redis' | 'memory' | 'none';

  /**
   * Redis 配置（当 type 为 'redis' 时）
   */
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    connectTimeout?: number;
    lazyConnect?: boolean;
    maxRetriesPerRequest?: number;
    retryDelayOnFailover?: number;
    enableReadyCheck?: boolean;
    maxLoadingTimeout?: number;
  };

  /**
   * 内存缓存配置（当 type 为 'memory' 时）
   */
  memory?: {
    max?: number;
    ttl?: number;
    checkperiod?: number;
    useClones?: boolean;
  };

  /**
   * 缓存 TTL（秒）
   */
  ttl?: number;

  /**
   * 缓存键前缀
   */
  keyPrefix?: string;

  /**
   * 是否启用查询缓存
   */
  enabled?: boolean;

  /**
   * 缓存策略
   */
  strategy?: 'write-through' | 'write-behind' | 'cache-aside';
}

/**
 * 读写分离配置
 */
export interface ReadWriteConfig {
  /**
   * 主库配置（写操作）
   */
  write: DatabaseConnectionConfig;

  /**
   * 从库配置（读操作）
   */
  read: DatabaseConnectionConfig | DatabaseConnectionConfig[];

  /**
   * 读写分离策略
   */
  strategy?: {
    /**
     * 读库选择策略
     */
    readStrategy?: 'round-robin' | 'random' | 'least-connections';

    /**
     * 是否启用读写分离
     */
    enabled?: boolean;

    /**
     * 强制使用主库的操作类型
     */
    forceWriteOperations?: string[];

    /**
     * 读库健康检查间隔（毫秒）
     */
    healthCheckInterval?: number;

    /**
     * 读库故障转移到主库
     */
    fallbackToWrite?: boolean;
  };
}

/**
 * 连接池配置
 */
export interface PoolConfig {
  /**
   * 最小连接数
   */
  min?: number;

  /**
   * 最大连接数
   */
  max?: number;

  /**
   * 连接空闲超时时间（毫秒）
   */
  idleTimeoutMillis?: number;

  /**
   * 连接超时时间（毫秒）
   */
  connectionTimeoutMillis?: number;

  /**
   * 获取连接超时时间（毫秒）
   */
  acquireTimeoutMillis?: number;

  /**
   * 创建连接超时时间（毫秒）
   */
  createTimeoutMillis?: number;

  /**
   * 销毁连接超时时间（毫秒）
   */
  destroyTimeoutMillis?: number;

  /**
   * 连接重用次数
   */
  reapIntervalMillis?: number;

  /**
   * 创建重试间隔（毫秒）
   */
  createRetryIntervalMillis?: number;

  /**
   * 验证连接
   */
  validate?: (connection: any) => boolean | Promise<boolean>;
}

/**
 * 扩展的数据库连接配置，支持缓存和读写分离
 */
export type ExtendedDatabaseConnectionConfig =
  | DatabaseConnectionConfig
  | {
      /**
       * 读写分离配置
       */
      readWrite: ReadWriteConfig;

      /**
       * 缓存配置
       */
      cache?: CacheConfig;

      /**
       * 连接池配置
       */
      pool?: PoolConfig;

      /**
       * 数据库名称（用于注册到DI容器）
       */
      name?: string;

      /**
       * 是否启用查询日志
       */
      logging?: boolean | string[];

      /**
       * 插件配置
       */
      plugins?: string[];
    }
  | {
      /**
       * 基础连接配置
       */
      connection: DatabaseConnectionConfig;

      /**
       * 缓存配置
       */
      cache?: CacheConfig;

      /**
       * 连接池配置
       */
      pool?: PoolConfig;

      /**
       * 数据库名称（用于注册到DI容器）
       */
      name?: string;

      /**
       * 是否启用查询日志
       */
      logging?: boolean | string[];

      /**
       * 插件配置
       */
      plugins?: string[];
    };

/**
 * Database配置
 */
export type DatabaseConfig = {
  /**
   * 数据库连接配置
   */
  databases: {
    [key: string]: ExtendedDatabaseConnectionConfig;
  };

  /**
   * 全局配置
   */
  global?: {
    /**
     * 默认缓存配置
     */
    defaultCache?: CacheConfig;

    /**
     * 默认连接池配置
     */
    defaultPool?: PoolConfig;

    /**
     * 全局日志配置
     */
    logging?: boolean | string[];

    /**
     * 全局插件
     */
    plugins?: string[];

    /**
     * 健康检查配置
     */
    healthCheck?: {
      enabled?: boolean;
      interval?: number;
      timeout?: number;
      retries?: number;
    };
  };
};
