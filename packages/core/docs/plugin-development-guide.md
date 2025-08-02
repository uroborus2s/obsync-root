# Stratix 插件开发指南

## 概述

Stratix 插件系统是框架的核心特性，基于 Fastify 插件架构构建，提供了强大的模块化和扩展能力。本指南将详细介绍如何开发高质量的 Stratix 插件，包括架构设计原则、依赖注入最佳实践、生命周期管理等核心概念。

## 插件架构设计原则

### 1. 核心设计理念

#### 1.1 函数式优先
- 优先使用纯函数和函数组合
- 避免副作用，保持函数的可预测性
- 利用高阶函数实现功能增强

#### 1.2 插件隔离
- 每个插件拥有独立的作用域
- 插件间通过明确的接口通信
- 避免全局状态污染

#### 1.3 依赖注入
- 基于 Awilix 的 IOC 容器
- 支持多种生命周期管理
- 自动依赖解析和注入

#### 1.4 生命周期管理
- 完整的插件生命周期钩子
- 自动资源清理和释放
- 优雅的启动和关闭流程

### 2. 插件类型

#### 2.1 基础插件
最简单的 Fastify 插件形式：

```typescript
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

async function basicPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // 注册路由
  fastify.get('/basic', async (request, reply) => {
    return { message: 'Hello from basic plugin!' };
  });

  // 注册钩子
  fastify.addHook('onRequest', async (request, reply) => {
    console.log('Request received');
  });
}

export default basicPlugin;
```

#### 2.2 增强插件
使用 `withRegisterAutoDI` 增强的插件：

```typescript
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

async function enhancedPlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  fastify.get('/enhanced', async (request, reply) => {
    return { message: 'Enhanced plugin with auto DI!' };
  });
}

export default withRegisterAutoDI(enhancedPlugin, {
  discovery: {
    patterns: [
      'controllers/*.{ts,js}',
      'services/*.{ts,js}',
      'repositories/*.{ts,js}'
    ]
  },
  routing: {
    enabled: true,
    prefix: '/api',
    validation: false
  },
  services: {
    enabled: true,
    patterns: ['adapters/*.{ts,js}']
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'throw',
    debug: true
  }
});
```

#### 2.3 复合插件
包含多个子插件的复合插件：

```typescript
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import userPlugin from './user/userPlugin.js';
import productPlugin from './product/productPlugin.js';

async function ecommercePlugin(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // 注册子插件
  await fastify.register(userPlugin, { prefix: '/users' });
  await fastify.register(productPlugin, { prefix: '/products' });

  // 注册通用路由
  fastify.get('/status', async () => {
    return { 
      status: 'ok',
      modules: ['users', 'products'],
      timestamp: new Date().toISOString()
    };
  });
}

export default withRegisterAutoDI(ecommercePlugin, {
  discovery: {
    patterns: [
      'shared/services/*.{ts,js}',
      'shared/repositories/*.{ts,js}'
    ]
  }
});
```

## 依赖注入最佳实践

### 1. 服务注册模式

#### 1.1 自动注册
基于文件扫描的自动注册：

```typescript
// src/services/UserService.ts
export interface IUserService {
  getUser(id: string): Promise<User>;
  createUser(userData: CreateUserData): Promise<User>;
}

export class UserService implements IUserService {
  constructor(
    private userRepository: IUserRepository,
    private logger: Logger,
    private cacheService: ICacheService
  ) {}

  async getUser(id: string): Promise<User> {
    // 先尝试从缓存获取
    const cached = await this.cacheService.get(`user:${id}`);
    if (cached) {
      return cached;
    }

    // 从数据库获取
    const user = await this.userRepository.findById(id);
    
    // 缓存结果
    await this.cacheService.set(`user:${id}`, user, 3600);
    
    return user;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    this.logger.info('Creating new user', { email: userData.email });
    
    const user = await this.userRepository.create(userData);
    
    // 清除相关缓存
    await this.cacheService.del('users:list');
    
    return user;
  }
}

// 导出默认类用于自动注册
export default UserService;
```

#### 1.2 手动注册
在插件中手动注册服务：

```typescript
import { asClass, asValue, asFunction, Lifetime } from 'awilix';

async function manualRegistrationPlugin(fastify: FastifyInstance, options: any) {
  const container = fastify.diContainer;

  // 注册类
  container.register({
    userService: asClass(UserService).scoped(),
    productService: asClass(ProductService).singleton()
  });

  // 注册值
  container.register({
    config: asValue(options.config),
    apiKey: asValue(process.env.API_KEY)
  });

  // 注册工厂函数
  container.register({
    httpClient: asFunction(({ config }) => {
      return new HttpClient(config.baseURL, config.timeout);
    }).singleton()
  });
}
```

### 2. 生命周期管理

#### 2.1 生命周期类型

Stratix 支持三种主要的生命周期：

- **SINGLETON**: 全局单例，整个应用生命周期内只创建一次
- **SCOPED**: 作用域实例，在特定作用域内单例
- **TRANSIENT**: 瞬态实例，每次请求都创建新实例

```typescript
// 单例服务 - 适用于无状态的服务
export class ConfigService {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  getConfig(): AppConfig {
    return this.config;
  }
}

// 作用域服务 - 适用于有状态但需要隔离的服务
export class RequestContextService {
  constructor(
    private requestId: string,
    private userId?: string
  ) {}

  getContext() {
    return {
      requestId: this.requestId,
      userId: this.userId,
      timestamp: new Date()
    };
  }
}

// 瞬态服务 - 适用于轻量级的工具类
export class ValidationService {
  validate(data: any, schema: any): ValidationResult {
    // 验证逻辑
    return { isValid: true, errors: [] };
  }
}
```

#### 2.2 生命周期钩子

Stratix 支持基于方法名约定的生命周期钩子：

```typescript
export class DatabaseService {
  private connection: any;

  // Fastify onReady 钩子
  async onReady() {
    console.log('Initializing database connection...');
    this.connection = await createConnection();
  }

  // Fastify onListen 钩子
  async onListen() {
    console.log('Database service ready for requests');
  }

  // Fastify onClose 钩子
  async onClose() {
    console.log('Closing database connection...');
    if (this.connection) {
      await this.connection.close();
    }
  }

  // Fastify preClose 钩子
  async preClose() {
    console.log('Preparing to close database service...');
    // 完成正在进行的操作
  }

  async query(sql: string, params: any[]): Promise<any> {
    return await this.connection.query(sql, params);
  }
}
```

### 3. 服务适配器模式

#### 3.1 适配器接口定义

```typescript
// src/adapters/DatabaseAdapter.ts
export interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any>;
  transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
}

export class PostgreSQLAdapter implements IDatabaseAdapter {
  private client: Pool;

  constructor(private config: DatabaseConfig) {
    this.client = new Pool(config);
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client.end();
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    const result = await this.client.query(sql, params);
    return result.rows;
  }

  async transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    const client = await this.client.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(new Transaction(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// 导出适配器用于自动注册
export default PostgreSQLAdapter;
```

#### 3.2 适配器配置

```typescript
// 在插件配置中指定适配器扫描路径
export default withRegisterAutoDI(myPlugin, {
  services: {
    enabled: true,
    patterns: [
      'adapters/*.{ts,js}',
      'integrations/*.{ts,js}'
    ]
  }
});
```

## 插件生命周期管理

### 1. 插件启动流程

```typescript
export class PluginLifecycleManager {
  private phases = [
    'initialization',
    'dependency_resolution',
    'service_registration',
    'route_registration',
    'hook_registration',
    'ready'
  ];

  async executePhase(phase: string, context: PluginContext): Promise<void> {
    console.log(`Executing phase: ${phase}`);
    
    switch (phase) {
      case 'initialization':
        await this.initializePlugin(context);
        break;
      case 'dependency_resolution':
        await this.resolveDependencies(context);
        break;
      case 'service_registration':
        await this.registerServices(context);
        break;
      case 'route_registration':
        await this.registerRoutes(context);
        break;
      case 'hook_registration':
        await this.registerHooks(context);
        break;
      case 'ready':
        await this.markReady(context);
        break;
    }
  }

  private async initializePlugin(context: PluginContext): Promise<void> {
    // 初始化插件配置
    context.config = this.mergeConfig(context.defaultConfig, context.userConfig);
    
    // 创建插件作用域容器
    context.container = context.parentContainer.createScope();
    
    // 注册插件基础服务
    context.container.register('config', asValue(context.config));
    context.container.register('logger', asValue(context.logger));
  }

  private async resolveDependencies(context: PluginContext): Promise<void> {
    // 扫描并加载模块
    const modules = await this.scanModules(context.patterns, context.basePath);
    
    // 注册模块到容器
    await context.container.loadModules(modules, {
      formatName: 'camelCase',
      resolverOptions: {
        lifetime: Lifetime.SCOPED
      }
    });
  }
}
```

### 2. 错误处理和恢复

```typescript
export class PluginErrorHandler {
  async handlePluginError(error: Error, context: PluginContext): Promise<void> {
    const errorInfo = {
      pluginName: context.name,
      phase: context.currentPhase,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    };

    // 记录错误
    context.logger.error('Plugin error occurred', errorInfo);

    // 根据错误类型决定处理策略
    if (error instanceof DependencyResolutionError) {
      await this.handleDependencyError(error, context);
    } else if (error instanceof ConfigurationError) {
      await this.handleConfigError(error, context);
    } else {
      await this.handleGenericError(error, context);
    }
  }

  private async handleDependencyError(error: DependencyResolutionError, context: PluginContext): Promise<void> {
    // 尝试提供默认实现
    const missingDependency = error.dependencyName;
    const defaultImpl = this.getDefaultImplementation(missingDependency);
    
    if (defaultImpl) {
      context.container.register(missingDependency, asClass(defaultImpl));
      context.logger.warn(`Using default implementation for ${missingDependency}`);
    } else {
      throw error; // 无法恢复，重新抛出错误
    }
  }

  private async handleConfigError(error: ConfigurationError, context: PluginContext): Promise<void> {
    // 使用默认配置
    const defaultConfig = this.getDefaultConfig(context.name);
    context.config = { ...defaultConfig, ...context.config };
    context.logger.warn('Using default configuration due to config error');
  }
}
```

### 3. 插件通信机制

#### 3.1 事件系统

```typescript
export class PluginEventBus {
  private listeners = new Map<string, Function[]>();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, data: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  off(event: string, listener: Function): void {
    const listeners = this.listeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }
}

// 在插件中使用事件系统
export class UserPlugin {
  constructor(private eventBus: PluginEventBus) {}

  async createUser(userData: CreateUserData): Promise<User> {
    const user = await this.userService.create(userData);
    
    // 发布用户创建事件
    this.eventBus.emit('user:created', {
      userId: user.id,
      email: user.email,
      timestamp: new Date()
    });
    
    return user;
  }
}

// 其他插件监听事件
export class NotificationPlugin {
  constructor(private eventBus: PluginEventBus) {
    this.eventBus.on('user:created', this.handleUserCreated.bind(this));
  }

  private async handleUserCreated(event: any): Promise<void> {
    await this.sendWelcomeEmail(event.email);
  }
}
```

#### 3.2 插件间依赖

```typescript
// 定义插件接口
export interface IUserPlugin {
  getUser(id: string): Promise<User>;
  createUser(userData: CreateUserData): Promise<User>;
}

// 实现插件接口
export class UserPlugin implements IUserPlugin {
  // 实现方法...
}

// 其他插件依赖用户插件
export class OrderPlugin {
  constructor(private userPlugin: IUserPlugin) {}

  async createOrder(orderData: CreateOrderData): Promise<Order> {
    // 验证用户存在
    const user = await this.userPlugin.getUser(orderData.userId);
    
    // 创建订单
    return await this.orderService.create({
      ...orderData,
      userEmail: user.email
    });
  }
}
```

## 实际开发示例

### 1. 完整的电商插件示例

#### 1.1 插件结构

```
ecommerce-plugin/
├── src/
│   ├── controllers/
│   │   ├── ProductController.ts
│   │   ├── OrderController.ts
│   │   └── CartController.ts
│   ├── services/
│   │   ├── ProductService.ts
│   │   ├── OrderService.ts
│   │   ├── CartService.ts
│   │   └── PaymentService.ts
│   ├── repositories/
│   │   ├── ProductRepository.ts
│   │   ├── OrderRepository.ts
│   │   └── CartRepository.ts
│   ├── adapters/
│   │   ├── PaymentAdapter.ts
│   │   └── InventoryAdapter.ts
│   ├── types/
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   └── Cart.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

#### 1.2 产品控制器

```typescript
// src/controllers/ProductController.ts
import { Controller, Get, Post, Put, Delete } from '@stratix/core';
import type { FastifyRequest, FastifyReply } from 'fastify';

@Controller()
export class ProductController {
  constructor(
    private productService: IProductService,
    private logger: Logger
  ) {}

  @Get('/products')
  async getProducts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { page = 1, limit = 10, category } = request.query as any;
      const products = await this.productService.getProducts({
        page: parseInt(page),
        limit: parseInt(limit),
        category
      });
      return reply.send(products);
    } catch (error) {
      this.logger.error('Failed to get products:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  @Get('/products/:id')
  async getProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const product = await this.productService.getProduct(request.params.id);
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' });
      }
      return reply.send(product);
    } catch (error) {
      this.logger.error('Failed to get product:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  @Post('/products')
  async createProduct(request: FastifyRequest<{ Body: CreateProductData }>, reply: FastifyReply) {
    try {
      const product = await this.productService.createProduct(request.body);
      return reply.status(201).send(product);
    } catch (error) {
      this.logger.error('Failed to create product:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  @Put('/products/:id')
  async updateProduct(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateProductData }>,
    reply: FastifyReply
  ) {
    try {
      const product = await this.productService.updateProduct(request.params.id, request.body);
      return reply.send(product);
    } catch (error) {
      this.logger.error('Failed to update product:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }

  @Delete('/products/:id')
  async deleteProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      await this.productService.deleteProduct(request.params.id);
      return reply.status(204).send();
    } catch (error) {
      this.logger.error('Failed to delete product:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  }
}

export default ProductController;
```

#### 1.3 产品服务

```typescript
// src/services/ProductService.ts
export interface IProductService {
  getProducts(options: GetProductsOptions): Promise<PaginatedResult<Product>>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(data: CreateProductData): Promise<Product>;
  updateProduct(id: string, data: UpdateProductData): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
}

export class ProductService implements IProductService {
  constructor(
    private productRepository: IProductRepository,
    private inventoryAdapter: IInventoryAdapter,
    private cacheService: ICacheService,
    private eventBus: PluginEventBus,
    private logger: Logger
  ) {}

  async getProducts(options: GetProductsOptions): Promise<PaginatedResult<Product>> {
    const cacheKey = `products:${JSON.stringify(options)}`;

    // 尝试从缓存获取
    let result = await this.cacheService.get<PaginatedResult<Product>>(cacheKey);
    if (result) {
      this.logger.debug('Products retrieved from cache');
      return result;
    }

    // 从数据库获取
    result = await this.productRepository.findMany(options);

    // 缓存结果
    await this.cacheService.set(cacheKey, result, 300); // 5分钟缓存

    this.logger.info(`Retrieved ${result.items.length} products`);
    return result;
  }

  async getProduct(id: string): Promise<Product | null> {
    const cacheKey = `product:${id}`;

    // 尝试从缓存获取
    let product = await this.cacheService.get<Product>(cacheKey);
    if (product) {
      return product;
    }

    // 从数据库获取
    product = await this.productRepository.findById(id);
    if (product) {
      // 获取库存信息
      const inventory = await this.inventoryAdapter.getInventory(id);
      product.stock = inventory.quantity;

      // 缓存结果
      await this.cacheService.set(cacheKey, product, 600); // 10分钟缓存
    }

    return product;
  }

  async createProduct(data: CreateProductData): Promise<Product> {
    this.logger.info('Creating new product', { name: data.name, category: data.category });

    // 创建产品
    const product = await this.productRepository.create(data);

    // 初始化库存
    if (data.initialStock > 0) {
      await this.inventoryAdapter.setInventory(product.id, data.initialStock);
    }

    // 清除相关缓存
    await this.clearProductCache();

    // 发布事件
    this.eventBus.emit('product:created', {
      productId: product.id,
      name: product.name,
      category: product.category,
      timestamp: new Date()
    });

    this.logger.info('Product created successfully', { productId: product.id });
    return product;
  }

  async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    this.logger.info('Updating product', { productId: id });

    const product = await this.productRepository.update(id, data);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    // 清除缓存
    await this.cacheService.del(`product:${id}`);
    await this.clearProductCache();

    // 发布事件
    this.eventBus.emit('product:updated', {
      productId: id,
      changes: data,
      timestamp: new Date()
    });

    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    this.logger.info('Deleting product', { productId: id });

    await this.productRepository.delete(id);

    // 清除库存
    await this.inventoryAdapter.removeInventory(id);

    // 清除缓存
    await this.cacheService.del(`product:${id}`);
    await this.clearProductCache();

    // 发布事件
    this.eventBus.emit('product:deleted', {
      productId: id,
      timestamp: new Date()
    });
  }

  private async clearProductCache(): Promise<void> {
    // 清除产品列表缓存
    const pattern = 'products:*';
    await this.cacheService.delPattern(pattern);
  }

  // 生命周期钩子
  async onReady(): Promise<void> {
    this.logger.info('ProductService is ready');

    // 预热缓存
    await this.warmupCache();
  }

  async onClose(): Promise<void> {
    this.logger.info('ProductService is closing');
    // 清理资源
  }

  private async warmupCache(): Promise<void> {
    try {
      // 预加载热门产品
      const popularProducts = await this.productRepository.findPopular(10);
      for (const product of popularProducts) {
        const cacheKey = `product:${product.id}`;
        await this.cacheService.set(cacheKey, product, 600);
      }
      this.logger.info('Cache warmed up successfully');
    } catch (error) {
      this.logger.warn('Failed to warm up cache:', error);
    }
  }
}

export default ProductService;
```

#### 1.4 库存适配器

```typescript
// src/adapters/InventoryAdapter.ts
export interface IInventoryAdapter {
  getInventory(productId: string): Promise<InventoryInfo>;
  setInventory(productId: string, quantity: number): Promise<void>;
  updateInventory(productId: string, delta: number): Promise<InventoryInfo>;
  removeInventory(productId: string): Promise<void>;
  reserveInventory(productId: string, quantity: number): Promise<ReservationInfo>;
  releaseReservation(reservationId: string): Promise<void>;
}

export class InventoryAdapter implements IInventoryAdapter {
  constructor(
    private httpClient: HttpClient,
    private logger: Logger
  ) {}

  async getInventory(productId: string): Promise<InventoryInfo> {
    try {
      const response = await this.httpClient.get<InventoryInfo>(`/inventory/${productId}`);
      return response;
    } catch (error) {
      this.logger.error('Failed to get inventory:', error);
      throw new ExternalServiceError('Inventory service unavailable');
    }
  }

  async setInventory(productId: string, quantity: number): Promise<void> {
    try {
      await this.httpClient.put(`/inventory/${productId}`, { quantity });
      this.logger.info('Inventory set successfully', { productId, quantity });
    } catch (error) {
      this.logger.error('Failed to set inventory:', error);
      throw new ExternalServiceError('Inventory service unavailable');
    }
  }

  async updateInventory(productId: string, delta: number): Promise<InventoryInfo> {
    try {
      const response = await this.httpClient.patch<InventoryInfo>(`/inventory/${productId}`, { delta });
      this.logger.info('Inventory updated successfully', { productId, delta });
      return response;
    } catch (error) {
      this.logger.error('Failed to update inventory:', error);
      throw new ExternalServiceError('Inventory service unavailable');
    }
  }

  async removeInventory(productId: string): Promise<void> {
    try {
      await this.httpClient.delete(`/inventory/${productId}`);
      this.logger.info('Inventory removed successfully', { productId });
    } catch (error) {
      this.logger.error('Failed to remove inventory:', error);
      throw new ExternalServiceError('Inventory service unavailable');
    }
  }

  async reserveInventory(productId: string, quantity: number): Promise<ReservationInfo> {
    try {
      const response = await this.httpClient.post<ReservationInfo>('/inventory/reserve', {
        productId,
        quantity
      });
      this.logger.info('Inventory reserved successfully', { productId, quantity, reservationId: response.id });
      return response;
    } catch (error) {
      this.logger.error('Failed to reserve inventory:', error);
      throw new ExternalServiceError('Inventory service unavailable');
    }
  }

  async releaseReservation(reservationId: string): Promise<void> {
    try {
      await this.httpClient.delete(`/inventory/reservations/${reservationId}`);
      this.logger.info('Reservation released successfully', { reservationId });
    } catch (error) {
      this.logger.error('Failed to release reservation:', error);
      throw new ExternalServiceError('Inventory service unavailable');
    }
  }

  // 生命周期钩子
  async onReady(): Promise<void> {
    // 测试连接
    try {
      await this.httpClient.get('/health');
      this.logger.info('Inventory adapter connected successfully');
    } catch (error) {
      this.logger.warn('Inventory service health check failed:', error);
    }
  }
}

export default InventoryAdapter;
```

#### 1.5 插件主文件

```typescript
// src/index.ts
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

interface EcommercePluginOptions extends FastifyPluginOptions {
  database?: {
    url: string;
    poolSize?: number;
  };
  inventory?: {
    serviceUrl: string;
    timeout?: number;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
  features?: {
    enableRecommendations?: boolean;
    enableReviews?: boolean;
    enableWishlist?: boolean;
  };
}

async function ecommercePlugin(fastify: FastifyInstance, options: EcommercePluginOptions) {
  // 注册健康检查路由
  fastify.get('/ecommerce/health', async () => {
    return {
      status: 'healthy',
      features: options.features || {},
      timestamp: new Date().toISOString()
    };
  });

  // 注册全局错误处理
  fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error({
      error,
      request: {
        method: request.method,
        url: request.url
      }
    }, 'Ecommerce plugin error');

    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        error: error.message,
        statusCode: error.statusCode
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      statusCode: 500
    });
  });

  // 注册请求日志
  fastify.addHook('onRequest', async (request) => {
    request.log.info({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent']
    }, 'Ecommerce request received');
  });

  // 注册响应日志
  fastify.addHook('onSend', async (request, reply, payload) => {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.getResponseTime()
    }, 'Ecommerce request completed');
  });

  fastify.log.info('Ecommerce plugin registered successfully');
}

// 导出增强的插件
export default withRegisterAutoDI(ecommercePlugin, {
  discovery: {
    patterns: [
      'controllers/*.{ts,js}',
      'services/*.{ts,js}',
      'repositories/*.{ts,js}'
    ]
  },
  routing: {
    enabled: true,
    prefix: '/api/v1',
    validation: true
  },
  services: {
    enabled: true,
    patterns: [
      'adapters/*.{ts,js}'
    ]
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'throw',
    debug: process.env.NODE_ENV !== 'production'
  },
  debug: process.env.NODE_ENV !== 'production'
});
```

### 2. 插件配置和使用

#### 2.1 在应用中使用插件

```typescript
// stratix.config.ts
import ecommercePlugin from '@my-company/ecommerce-plugin';

export default function createConfig(sensitiveConfig: Record<string, string>): StratixConfig {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    plugins: [
      {
        name: 'ecommerce',
        plugin: ecommercePlugin,
        options: {
          database: {
            url: sensitiveConfig.DATABASE_URL,
            poolSize: 20
          },
          inventory: {
            serviceUrl: process.env.INVENTORY_SERVICE_URL,
            timeout: 5000
          },
          cache: {
            enabled: true,
            ttl: 300
          },
          features: {
            enableRecommendations: true,
            enableReviews: true,
            enableWishlist: false
          }
        }
      }
    ],
    autoLoad: {},
    logger: {
      level: 'info',
      pretty: process.env.NODE_ENV !== 'production'
    }
  };
}
```

#### 2.2 插件测试

```typescript
// tests/ecommerce.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Stratix } from '@stratix/core';
import ecommercePlugin from '../src/index.js';

describe('Ecommerce Plugin', () => {
  let app: any;

  beforeEach(async () => {
    app = await Stratix.run({
      type: 'web',
      server: { port: 0 },
      config: {
        server: { port: 0 },
        plugins: [
          {
            name: 'ecommerce-test',
            plugin: ecommercePlugin,
            options: {
              database: {
                url: 'postgresql://test:test@localhost:5432/test'
              },
              cache: {
                enabled: false
              }
            }
          }
        ],
        autoLoad: {}
      }
    });
  });

  afterEach(async () => {
    await app.stop();
  });

  it('should register health check endpoint', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/ecommerce/health'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('healthy');
  });

  it('should create and retrieve products', async () => {
    // 创建产品
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      payload: {
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        category: 'electronics',
        initialStock: 10
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const product = JSON.parse(createResponse.payload);
    expect(product.name).toBe('Test Product');

    // 获取产品
    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${product.id}`
    });

    expect(getResponse.statusCode).toBe(200);
    const retrievedProduct = JSON.parse(getResponse.payload);
    expect(retrievedProduct.id).toBe(product.id);
  });
});
```

## 插件发布和分发

### 1. 包结构

```json
{
  "name": "@my-company/ecommerce-plugin",
  "version": "1.0.0",
  "description": "Ecommerce plugin for Stratix framework",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "stratix",
    "plugin",
    "ecommerce",
    "fastify"
  ],
  "peerDependencies": {
    "@stratix/core": "^0.0.1"
  },
  "dependencies": {
    "ajv": "^8.17.0",
    "ajv-formats": "^3.0.1"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "prepublishOnly": "npm run build && npm test"
  }
}
```

### 2. 文档要求

每个插件都应该包含完整的文档：

- **README.md**: 插件概述、安装和基本使用
- **API.md**: 详细的 API 文档
- **EXAMPLES.md**: 使用示例和最佳实践
- **CHANGELOG.md**: 版本变更记录

### 3. 版本管理

遵循语义化版本控制：
- **主版本号**: 不兼容的 API 修改
- **次版本号**: 向下兼容的功能性新增
- **修订号**: 向下兼容的问题修正

## 最佳实践总结

### 1. 设计原则

1. **单一职责**: 每个插件专注于一个特定的业务领域
2. **松耦合**: 插件间通过明确的接口通信
3. **高内聚**: 相关功能组织在同一个插件内
4. **可测试**: 设计易于测试的接口和实现
5. **可配置**: 提供灵活的配置选项

### 2. 开发建议

1. **使用 TypeScript**: 提供类型安全和更好的开发体验
2. **编写测试**: 确保插件的可靠性和稳定性
3. **文档完善**: 提供清晰的使用文档和示例
4. **错误处理**: 实现完善的错误处理和恢复机制
5. **性能优化**: 关注插件的性能影响

### 3. 发布流程

1. **代码审查**: 确保代码质量和安全性
2. **测试验证**: 运行完整的测试套件
3. **文档更新**: 更新相关文档和变更日志
4. **版本标记**: 使用语义化版本号
5. **发布分发**: 发布到 npm 或私有仓库

---

*本指南基于 @stratix/core v0.0.1 版本编写，持续更新中*
```
