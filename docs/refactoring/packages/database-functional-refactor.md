# Database包函数式重构详细方案

## 📋 重构概述

### 当前问题分析
1. **KyselyFactory静态方法过多**：20+个静态方法，职责不清晰
2. **DatabaseProvider接口设计复杂**：状态管理和业务逻辑混合
3. **配置处理分散**：数据库配置处理逻辑分散在多个地方
4. **错误处理不一致**：不同方法的错误处理方式不统一
5. **测试困难**：静态方法和复杂依赖难以进行单元测试

### 重构目标
- 将静态工厂方法重构为纯函数
- 实现函数式的数据库连接管理
- 统一配置处理和错误处理
- 提高代码可测试性和可组合性

## 🎯 重构策略

### 1. 工厂函数重构

#### 当前工厂类问题
```typescript
// 问题：巨大的静态类，难以测试和扩展
export class KyselyFactory {
  static async createInstance<DB = any>(config, logger?): Promise<Kysely<DB>> {
    // 复杂的创建逻辑...
  }
  
  static async createReadWriteInstance<DB = any>(...): Promise<Kysely<DB>> {
    // 更多复杂逻辑...
  }
  
  // 20+ 个静态方法...
}
```

#### 重构后函数式工厂
```typescript
// 解决方案：函数组合 + 高阶函数
import { pipe, curry } from '@stratix/utils/functional';

// 基础配置处理函数
const normalizeConfig = (config: DatabaseConnectionConfig): NormalizedConfig => ({
  ...config,
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    ...config.pool
  }
});

const validateConfig = (config: NormalizedConfig): Either<Error, NormalizedConfig> => {
  const errors: string[] = [];
  
  if (!config.client) errors.push('Database client is required');
  if (!config.connection) errors.push('Database connection config is required');
  
  return errors.length > 0 
    ? left(new Error(`Config validation failed: ${errors.join(', ')}`))
    : right(config);
};

// 方言创建函数
const createDialect = (config: NormalizedConfig): Promise<DatabaseDialect> => {
  const dialectCreators = {
    mysql: createMySQLDialect,
    postgresql: createPostgreSQLDialect,
    sqlite: createSQLiteDialect,
    oracle: createOracleDialect
  };
  
  const creator = dialectCreators[config.client];
  if (!creator) {
    throw new Error(`Unsupported database client: ${config.client}`);
  }
  
  return creator(config);
};

// 日志函数创建
const createLogFunction = curry((logger: Logger, config: LoggingConfig) => 
  (event: LogEvent): void => {
    if (!config.enabled) return;
    
    const logLevel = event.level === 'error' ? 'error' : 'debug';
    logger[logLevel]({
      sql: event.query.sql,
      parameters: event.query.parameters,
      duration: event.queryDurationMillis
    }, 'Database query executed');
  }
);

// 插件创建函数
const createPlugins = async (pluginConfigs: PluginConfig[] = []): Promise<KyselyPlugin[]> => {
  const plugins: KyselyPlugin[] = [];
  
  for (const pluginConfig of pluginConfigs) {
    const plugin = await createPlugin(pluginConfig);
    plugins.push(plugin);
  }
  
  return plugins;
};

// 主要的数据库实例创建函数
export const createDatabaseInstance = curry(
  async <DB = any>(
    logger: Logger,
    config: DatabaseConnectionConfig
  ): Promise<Kysely<DB>> => {
    return pipe(
      config,
      normalizeConfig,
      validateConfig,
      chain(async (validConfig) => {
        const dialect = await createDialect(validConfig);
        const logFunction = createLogFunction(logger)(validConfig.logging || {});
        const plugins = await createPlugins(validConfig.plugins);
        
        return new Kysely<DB>({
          dialect,
          log: logFunction,
          plugins
        });
      })
    );
  }
);
```

### 2. 数据库提供者重构

#### 当前提供者问题
```typescript
// 问题：状态管理和业务逻辑混合
const databaseProvider: DatabaseProvider = {
  getDatabase: (name?: string) => {
    // 复杂的查找逻辑...
    if (!name) return defaultDatabase;
    const database = databaseInstances.get(name);
    // 更多状态管理逻辑...
  },
  // 其他方法...
};
```

#### 重构后函数式提供者
```typescript
// 解决方案：不可变状态 + 纯函数
interface DatabaseRegistry {
  readonly databases: ReadonlyMap<string, Kysely<any>>;
  readonly defaultDatabase: string | null;
}

const createEmptyRegistry = (): DatabaseRegistry => ({
  databases: new Map(),
  defaultDatabase: null
});

const addDatabase = curry(
  (name: string, instance: Kysely<any>) => 
  (registry: DatabaseRegistry): DatabaseRegistry => ({
    ...registry,
    databases: new Map(registry.databases).set(name, instance),
    defaultDatabase: registry.defaultDatabase || name
  })
);

const removeDatabase = curry(
  (name: string) => 
  (registry: DatabaseRegistry): DatabaseRegistry => {
    const newDatabases = new Map(registry.databases);
    newDatabases.delete(name);
    
    return {
      ...registry,
      databases: newDatabases,
      defaultDatabase: registry.defaultDatabase === name 
        ? (newDatabases.size > 0 ? newDatabases.keys().next().value : null)
        : registry.defaultDatabase
    };
  }
);

// 查询函数
const getDatabase = curry(
  (name: string | undefined, registry: DatabaseRegistry): Kysely<any> | null => {
    if (!name) {
      return registry.defaultDatabase 
        ? registry.databases.get(registry.defaultDatabase) || null
        : null;
    }
    
    return registry.databases.get(name) || null;
  }
);

const getAllDatabases = (registry: DatabaseRegistry): Record<string, Kysely<any>> => {
  const result: Record<string, Kysely<any>> = {};
  for (const [name, instance] of registry.databases) {
    result[name] = instance;
  }
  return result;
};

const hasDatabase = curry(
  (name: string, registry: DatabaseRegistry): boolean => 
    registry.databases.has(name)
);

// 数据库提供者工厂
export const createDatabaseProvider = (
  initialRegistry: DatabaseRegistry = createEmptyRegistry()
): DatabaseProvider => {
  let currentRegistry = initialRegistry;
  
  const updateRegistry = (updater: (registry: DatabaseRegistry) => DatabaseRegistry): void => {
    currentRegistry = updater(currentRegistry);
  };
  
  return {
    getDatabase: (name) => getDatabase(name, currentRegistry),
    
    getAllDatabases: () => getAllDatabases(currentRegistry),
    
    hasDatabase: (name) => hasDatabase(name, currentRegistry),
    
    getDatabaseNames: () => Array.from(currentRegistry.databases.keys()),
    
    addDatabase: (name, instance) => {
      updateRegistry(addDatabase(name, instance));
    },
    
    removeDatabase: (name) => {
      updateRegistry(removeDatabase(name));
    },
    
    destroy: async () => {
      for (const [name, instance] of currentRegistry.databases) {
        try {
          await instance.destroy();
        } catch (error) {
          console.error(`Failed to destroy database ${name}:`, error);
        }
      }
      currentRegistry = createEmptyRegistry();
    }
  };
};
```

### 3. 连接管理函数化

#### 重构后的连接管理
```typescript
// connection-management.ts
export interface ConnectionManager {
  createConnection: (config: DatabaseConnectionConfig) => Promise<Kysely<any>>;
  validateConnection: (instance: Kysely<any>) => Promise<boolean>;
  destroyConnection: (instance: Kysely<any>) => Promise<void>;
}

export const createConnectionManager = (logger: Logger): ConnectionManager => {
  const createConnection = createDatabaseInstance(logger);
  
  return {
    createConnection,
    
    validateConnection: async (instance) => {
      try {
        // 执行简单查询验证连接
        await instance.selectFrom('information_schema.tables')
          .select('table_name')
          .limit(1)
          .execute();
        return true;
      } catch (error) {
        logger.error('Database connection validation failed:', error);
        return false;
      }
    },
    
    destroyConnection: async (instance) => {
      try {
        await instance.destroy();
        logger.debug('Database connection destroyed successfully');
      } catch (error) {
        logger.error('Failed to destroy database connection:', error);
        throw error;
      }
    }
  };
};

// 连接池管理
export const createConnectionPool = (
  connectionManager: ConnectionManager,
  config: PoolConfig
) => {
  const connections = new Map<string, Kysely<any>>();
  const connectionPromises = new Map<string, Promise<Kysely<any>>>();
  
  return {
    getConnection: async (name: string, dbConfig: DatabaseConnectionConfig): Promise<Kysely<any>> => {
      // 如果连接已存在，直接返回
      if (connections.has(name)) {
        return connections.get(name)!;
      }
      
      // 如果正在创建连接，等待创建完成
      if (connectionPromises.has(name)) {
        return connectionPromises.get(name)!;
      }
      
      // 创建新连接
      const connectionPromise = connectionManager.createConnection(dbConfig);
      connectionPromises.set(name, connectionPromise);
      
      try {
        const connection = await connectionPromise;
        connections.set(name, connection);
        connectionPromises.delete(name);
        return connection;
      } catch (error) {
        connectionPromises.delete(name);
        throw error;
      }
    },
    
    removeConnection: async (name: string): Promise<void> => {
      const connection = connections.get(name);
      if (connection) {
        await connectionManager.destroyConnection(connection);
        connections.delete(name);
      }
    },
    
    destroyAll: async (): Promise<void> => {
      const destroyPromises = Array.from(connections.entries()).map(
        async ([name, connection]) => {
          try {
            await connectionManager.destroyConnection(connection);
          } catch (error) {
            console.error(`Failed to destroy connection ${name}:`, error);
          }
        }
      );
      
      await Promise.all(destroyPromises);
      connections.clear();
      connectionPromises.clear();
    }
  };
};
```

### 4. 读写分离函数化

#### 重构后的读写分离
```typescript
// read-write-separation.ts
export interface ReadWriteManager {
  getReadConnection: () => Promise<Kysely<any>>;
  getWriteConnection: () => Promise<Kysely<any>>;
  executeRead: <T>(query: (db: Kysely<any>) => Promise<T>) => Promise<T>;
  executeWrite: <T>(query: (db: Kysely<any>) => Promise<T>) => Promise<T>;
}

export const createReadWriteManager = (
  writeConfig: DatabaseConnectionConfig,
  readConfigs: DatabaseConnectionConfig[],
  connectionManager: ConnectionManager
): ReadWriteManager => {
  let writeConnection: Kysely<any> | null = null;
  let readConnections: Kysely<any>[] = [];
  let currentReadIndex = 0;
  
  const initializeConnections = async (): Promise<void> => {
    // 初始化写连接
    if (!writeConnection) {
      writeConnection = await connectionManager.createConnection(writeConfig);
    }
    
    // 初始化读连接
    if (readConnections.length === 0) {
      readConnections = await Promise.all(
        readConfigs.map(config => connectionManager.createConnection(config))
      );
    }
  };
  
  const getNextReadConnection = (): Kysely<any> => {
    if (readConnections.length === 0) {
      throw new Error('No read connections available');
    }
    
    const connection = readConnections[currentReadIndex];
    currentReadIndex = (currentReadIndex + 1) % readConnections.length;
    return connection;
  };
  
  return {
    getReadConnection: async () => {
      await initializeConnections();
      return getNextReadConnection();
    },
    
    getWriteConnection: async () => {
      await initializeConnections();
      if (!writeConnection) {
        throw new Error('Write connection not available');
      }
      return writeConnection;
    },
    
    executeRead: async (query) => {
      const readDb = await getReadConnection();
      return query(readDb);
    },
    
    executeWrite: async (query) => {
      const writeDb = await getWriteConnection();
      return query(writeDb);
    }
  };
};

// 智能查询路由
export const createQueryRouter = (readWriteManager: ReadWriteManager) => ({
  execute: async <T>(
    query: (db: Kysely<any>) => Promise<T>,
    options: { forceWrite?: boolean } = {}
  ): Promise<T> => {
    // 简单的查询类型检测
    const queryString = query.toString();
    const isWriteQuery = /\b(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b/i.test(queryString);
    
    if (isWriteQuery || options.forceWrite) {
      return readWriteManager.executeWrite(query);
    } else {
      return readWriteManager.executeRead(query);
    }
  }
});
```

### 5. 插件系统重构

#### 重构后的插件系统
```typescript
// plugin-system.ts
export const createDatabasePlugin = (
  connectionManager: ConnectionManager,
  options: DatabaseConfig
): StratixPlugin<DatabaseConfig> => async (fastify, pluginOptions) => {
  const config = { ...options, ...pluginOptions };
  
  // 创建数据库提供者
  const databaseProvider = createDatabaseProvider();
  
  // 创建连接池
  const connectionPool = createConnectionPool(connectionManager, config.pool || {});
  
  // 初始化数据库连接
  for (const [name, dbConfig] of Object.entries(config.databases)) {
    try {
      const connection = await connectionPool.getConnection(name, dbConfig);
      databaseProvider.addDatabase(name, connection);
      fastify.log.info(`Database connection established: ${name}`);
    } catch (error) {
      fastify.log.error(`Failed to connect to database ${name}:`, error);
      throw error;
    }
  }
  
  // 注册到DI容器
  fastify.registerDI(databaseProvider, {
    name: 'databaseProvider',
    lifetime: 'SINGLETON',
    asyncDispose: 'destroy',
    asyncDisposePriority: 100
  });
  
  // 注册默认数据库实例
  const defaultDb = databaseProvider.getDatabase();
  if (defaultDb) {
    fastify.registerDI(defaultDb, {
      name: 'db',
      lifetime: 'SINGLETON'
    });
  }
  
  // 装饰Fastify实例
  fastify.decorate('getDatabase', (name?: string) => {
    return databaseProvider.getDatabase(name);
  });
  
  // 注册关闭钩子
  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing database connections...');
    await connectionPool.destroyAll();
    await databaseProvider.destroy();
    fastify.log.info('All database connections closed');
  });
};
```

## 🧪 测试策略

### 1. 纯函数测试
```typescript
// database-functions.test.ts
describe('Database Functions', () => {
  test('should normalize config correctly', () => {
    const config = { client: 'mysql', connection: { host: 'localhost' } };
    const normalized = normalizeConfig(config);
    
    expect(normalized.pool.min).toBe(2);
    expect(normalized.pool.max).toBe(10);
  });
  
  test('should validate config correctly', () => {
    const validConfig = { client: 'mysql', connection: { host: 'localhost' } };
    const result = validateConfig(validConfig);
    
    expect(isRight(result)).toBe(true);
  });
});
```

### 2. 集成测试
```typescript
// database-integration.test.ts
describe('Database Integration', () => {
  test('should create and manage database connections', async () => {
    const logger = createMockLogger();
    const connectionManager = createConnectionManager(logger);
    const config = createTestDatabaseConfig();
    
    const connection = await connectionManager.createConnection(config);
    expect(connection).toBeDefined();
    
    const isValid = await connectionManager.validateConnection(connection);
    expect(isValid).toBe(true);
    
    await connectionManager.destroyConnection(connection);
  });
});
```

## ⏱️ 重构时间计划

### Week 1: 工厂函数重构
- Day 1-2: KyselyFactory函数化
- Day 3-4: 配置处理函数重构
- Day 5: 单元测试编写

### Week 2: 提供者和连接管理重构
- Day 1-2: DatabaseProvider重构
- Day 3-4: 连接管理函数化
- Day 5: 集成测试编写

## ⚠️ 风险评估

### 中风险
- **连接池管理**：函数式可能影响连接复用效率
  - 缓解：保持连接池状态管理，优化连接获取逻辑

## 📊 成功指标

- **静态方法数量**：从20+个减少到0个
- **函数平均长度**：从50行减少到15行
- **测试覆盖率**：从60%提升到90%
- **配置处理一致性**：100%统一的配置处理流程
