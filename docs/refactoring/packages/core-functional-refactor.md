# Core包函数式重构详细方案

## 📋 重构概述

### 当前问题分析
1. **StratixApplication类过于庞大**：1000+行代码，承担过多职责
2. **状态管理复杂**：多个可变状态属性，难以追踪状态变化
3. **方法耦合严重**：初始化、启动、停止等方法相互依赖
4. **测试困难**：大类难以进行单元测试
5. **扩展性差**：新增功能需要修改核心类

### 重构目标
- 将StratixApplication拆分为多个纯函数模块
- 实现不可变状态管理
- 提高代码可测试性和可组合性
- 保持现有API接口不变

## 🎯 重构策略

### 1. 模块拆分策略

#### 当前结构问题
```typescript
// 当前：单一巨大类
export class StratixApplication extends EventEmitter implements IStratixApp {
  // 1000+行代码，包含：
  // - 配置管理
  // - 服务器管理  
  // - DI容器管理
  // - 插件管理
  // - 生命周期管理
  // - 缓存管理
  // - 上下文管理
}
```

#### 重构后模块化结构
```typescript
// 重构后：函数式模块
export const createStratixApp = compose(
  withConfigManagement,
  withServerManagement,
  withDIContainer,
  withPluginSystem,
  withLifecycleManagement,
  withCacheManagement,
  withContextManagement
);
```

### 2. 状态管理重构

#### 当前状态管理问题
```typescript
// 问题：可变状态，难以追踪
class StratixApplication {
  private initialized: boolean = false;
  private running: boolean = false;
  private container: AwilixContainer;
  private awilixManager: AwilixManager;
  // ... 更多可变状态
}
```

#### 重构后不可变状态
```typescript
// 解决方案：不可变状态管理
interface AppState {
  readonly initialized: boolean;
  readonly running: boolean;
  readonly config: StratixConfig;
  readonly server: FastifyInstance;
  readonly container: AwilixContainer;
  readonly contextManager: AppContextManager;
}

const createInitialState = (config: StratixConfig): AppState => ({
  initialized: false,
  running: false,
  config,
  server: null,
  container: null,
  contextManager: null
});

// 状态更新函数
const setInitialized = (state: AppState): AppState => ({
  ...state,
  initialized: true
});

const setRunning = (state: AppState): AppState => ({
  ...state,
  running: true
});
```

### 3. 核心功能函数化

#### 配置管理模块
```typescript
// config-management.ts
export interface ConfigModule {
  loadConfig: (options: ConfigOptions) => Promise<StratixConfig>;
  validateConfig: (config: StratixConfig) => ValidationResult;
  normalizeConfig: (config: StratixConfig) => StratixConfig;
}

export const createConfigModule = (): ConfigModule => ({
  loadConfig: async (options) => {
    const config = await loadAndNormalizeConfig(options.logger, options);
    return config;
  },
  
  validateConfig: (config) => {
    const errors: string[] = [];
    if (!config.name) errors.push('App name is required');
    if (!config.version) errors.push('App version is required');
    return { isValid: errors.length === 0, errors };
  },
  
  normalizeConfig: (config) => ({
    ...config,
    server: { host: '0.0.0.0', port: 3000, ...config.server }
  })
});
```

#### 服务器管理模块
```typescript
// server-management.ts
export interface ServerModule {
  createServer: (config: StratixConfig) => FastifyInstance;
  startServer: (server: FastifyInstance, config: ServerConfig) => Promise<string>;
  stopServer: (server: FastifyInstance) => Promise<void>;
}

export const createServerModule = (logger: Logger): ServerModule => ({
  createServer: (config) => {
    const serverOptions = createServerOptions(config);
    return fastify(serverOptions);
  },
  
  startServer: async (server, config) => {
    const hasWebPlugin = server.hasDecorator('_stratixWebConfig');
    
    if (hasWebPlugin) {
      const webConfig = (server as any)._stratixWebConfig;
      return await server.listen(webConfig);
    } else {
      await server.ready();
      return 'Container mode initialized';
    }
  },
  
  stopServer: async (server) => {
    await server.close();
  }
});
```

#### DI容器管理模块
```typescript
// di-container-management.ts
export interface DIModule {
  createContainer: () => AwilixContainer;
  registerDependencies: (container: AwilixContainer, config: StratixConfig) => void;
  createManager: (container: AwilixContainer) => AwilixManager;
}

export const createDIModule = (): DIModule => ({
  createContainer: () => createContainer({
    strict: true,
    injectionMode: InjectionMode.CLASSIC
  }),
  
  registerDependencies: (container, config) => {
    // 注册基础依赖
    container.register({
      config: asValue(config),
      log: asValue(config.logger)
    });
    
    // 注册配置中的依赖
    if (config.diRegisters) {
      config.diRegisters.forEach(register => {
        registerSingleDependency(container, register);
      });
    }
  },
  
  createManager: (container) => new AwilixManager({
    diContainer: container,
    asyncInit: true,
    asyncDispose: true,
    strictBooleanEnforced: true
  })
});
```

### 4. 生命周期管理重构

#### 当前生命周期问题
```typescript
// 问题：方法间强耦合，难以测试
class StratixApplication {
  async run(): Promise<this> {
    await this.initialize();  // 依赖内部状态
    await this.startServer(); // 依赖初始化结果
    await this.initializeDI(); // 依赖服务器启动
    return this;
  }
}
```

#### 重构后函数式生命周期
```typescript
// lifecycle-management.ts
export interface LifecycleModule {
  initialize: (state: AppState) => Promise<AppState>;
  start: (state: AppState) => Promise<AppState>;
  stop: (state: AppState) => Promise<AppState>;
}

export const createLifecycleModule = (
  configModule: ConfigModule,
  serverModule: ServerModule,
  diModule: DIModule
): LifecycleModule => ({
  
  initialize: async (state) => {
    if (state.initialized) return state;
    
    // 创建服务器
    const server = serverModule.createServer(state.config);
    
    // 创建DI容器
    const container = diModule.createContainer();
    diModule.registerDependencies(container, state.config);
    
    // 创建上下文管理器
    const contextManager = new AppContextManager();
    
    // 装饰服务器实例
    decorateServer(server, container, contextManager);
    
    return {
      ...state,
      initialized: true,
      server,
      container,
      contextManager
    };
  },
  
  start: async (state) => {
    if (!state.initialized) {
      throw new Error('App must be initialized before starting');
    }
    
    if (state.running) return state;
    
    // 启动服务器
    const address = await serverModule.startServer(state.server, state.config.server);
    
    // 初始化DI容器
    const manager = diModule.createManager(state.container);
    await manager.executeInit();
    
    return {
      ...state,
      running: true
    };
  },
  
  stop: async (state) => {
    if (!state.running) return state;
    
    // 停止服务器
    await serverModule.stopServer(state.server);
    
    return {
      ...state,
      running: false
    };
  }
});
```

### 5. 主应用函数重构

#### 重构后的主应用函数
```typescript
// app.ts
export interface StratixApp {
  getState: () => AppState;
  initialize: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  // 保持原有接口
  readonly config: StratixConfig;
  readonly server: FastifyInstance;
  readonly container: AwilixContainer;
}

export const createStratixApp = (config: StratixConfig): StratixApp => {
  let currentState = createInitialState(config);
  
  // 创建模块
  const configModule = createConfigModule();
  const serverModule = createServerModule(config.logger);
  const diModule = createDIModule();
  const lifecycleModule = createLifecycleModule(configModule, serverModule, diModule);
  
  return {
    getState: () => currentState,
    
    initialize: async () => {
      currentState = await lifecycleModule.initialize(currentState);
    },
    
    start: async () => {
      currentState = await lifecycleModule.start(currentState);
    },
    
    stop: async () => {
      currentState = await lifecycleModule.stop(currentState);
    },
    
    // 保持向后兼容的getter
    get config() { return currentState.config; },
    get server() { return currentState.server; },
    get container() { return currentState.container; }
  };
};

// 保持原有静态方法接口
export class StratixApp {
  static async run(options?: StratixRunOptions): Promise<StratixApp> {
    const config = await loadConfig(options);
    const app = createStratixApp(config);
    await app.initialize();
    await app.start();
    return app;
  }
}
```

## 🧪 测试策略

### 1. 模块级单元测试
```typescript
// config-management.test.ts
describe('ConfigModule', () => {
  const configModule = createConfigModule();
  
  test('should validate config correctly', () => {
    const validConfig = { name: 'test-app', version: '1.0.0' };
    const result = configModule.validateConfig(validConfig);
    expect(result.isValid).toBe(true);
  });
  
  test('should normalize config with defaults', () => {
    const config = { name: 'test-app', version: '1.0.0' };
    const normalized = configModule.normalizeConfig(config);
    expect(normalized.server.host).toBe('0.0.0.0');
    expect(normalized.server.port).toBe(3000);
  });
});
```

### 2. 集成测试
```typescript
// app-integration.test.ts
describe('StratixApp Integration', () => {
  test('should create and start app successfully', async () => {
    const config = createTestConfig();
    const app = createStratixApp(config);
    
    await app.initialize();
    expect(app.getState().initialized).toBe(true);
    
    await app.start();
    expect(app.getState().running).toBe(true);
    
    await app.stop();
    expect(app.getState().running).toBe(false);
  });
});
```

## ⏱️ 重构时间计划

### Week 1: 基础模块拆分
- Day 1-2: 配置管理模块重构
- Day 3-4: 服务器管理模块重构  
- Day 5: 单元测试编写

### Week 2: 核心功能重构
- Day 1-2: DI容器管理模块重构
- Day 3-4: 生命周期管理重构
- Day 5: 集成测试编写

### Week 3: 整合和优化
- Day 1-2: 主应用函数重构
- Day 3-4: 向后兼容性确保
- Day 5: 性能测试和优化

## ⚠️ 风险评估

### 高风险
- **向后兼容性**：现有代码依赖StratixApplication类
  - 缓解：保持公共接口不变，使用适配器模式

### 中风险  
- **性能影响**：函数调用可能增加开销
  - 缓解：性能基准测试，必要时优化

### 低风险
- **学习成本**：团队需要适应函数式风格
  - 缓解：提供培训和文档

## 📊 成功指标

- **代码行数**：StratixApplication从1000+行减少到200行以内
- **圈复杂度**：平均复杂度从15降低到5以下
- **测试覆盖率**：从60%提升到95%以上
- **模块耦合度**：模块间依赖减少70%
