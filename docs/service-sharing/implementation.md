# Stratix 插件间服务共享实现方案

## 核心实现

### 1. 服务注册表实现

```typescript
// src/core/ServiceRegistry.ts
import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';

export interface ServiceMetadata {
  version: string;
  description?: string;
  dependencies?: string[];
  healthCheckInterval?: number;
  tags?: string[];
}

export interface ServiceDescriptor {
  pluginName: string;
  serviceName: string;
  metadata: ServiceMetadata;
  status: 'initializing' | 'ready' | 'error' | 'destroyed';
  instance?: any;
  createdAt: Date;
  lastHealthCheck?: Date;
}

export interface ServiceFactory<T> {
  create(context: ServiceContext): Promise<T>;
  destroy?(instance: T): Promise<void>;
  healthCheck?(instance: T): Promise<boolean>;
}

export interface ServiceContext {
  pluginName: string;
  serviceName: string;
  container: AwilixContainer;
  fastify: FastifyInstance;
  logger: any;
  config: any;
}

export class ServiceRegistry {
  private services = new Map<string, ServiceDescriptor>();
  private factories = new Map<string, ServiceFactory<any>>();
  private rootContainer: AwilixContainer;
  private fastify: FastifyInstance;
  private logger: any;
  private accessControl?: ServiceAccessControl;

  constructor(
    rootContainer: AwilixContainer,
    fastify: FastifyInstance,
    logger: any,
    accessControl?: ServiceAccessControl
  ) {
    this.rootContainer = rootContainer;
    this.fastify = fastify;
    this.logger = logger;
    this.accessControl = accessControl;
  }

  /**
   * 注册公共服务
   */
  registerPublicService<T>(
    pluginName: string,
    serviceName: string,
    factory: ServiceFactory<T>,
    metadata: ServiceMetadata
  ): void {
    const serviceKey = this.getServiceKey(pluginName, serviceName);
    
    if (this.services.has(serviceKey)) {
      throw new Error(`Service ${serviceKey} is already registered`);
    }

    // 检查循环依赖
    this.checkCircularDependencies(serviceKey, metadata.dependencies || []);

    const descriptor: ServiceDescriptor = {
      pluginName,
      serviceName,
      metadata,
      status: 'initializing',
      createdAt: new Date()
    };

    this.services.set(serviceKey, descriptor);
    this.factories.set(serviceKey, factory);

    this.logger.info(`Service registered: ${serviceKey}`);
  }

  /**
   * 获取公共服务
   */
  async getPublicService<T>(
    requesterPlugin: string,
    targetPlugin: string,
    serviceName: string
  ): Promise<T> {
    const serviceKey = this.getServiceKey(targetPlugin, serviceName);
    
    // 访问控制检查
    if (this.accessControl && !this.accessControl.canAccess(requesterPlugin, targetPlugin, serviceName)) {
      throw new Error(`Access denied: ${requesterPlugin} cannot access ${serviceKey}`);
    }

    const descriptor = this.services.get(serviceKey);
    if (!descriptor) {
      throw new Error(`Service not found: ${serviceKey}`);
    }

    // 如果服务已经创建，直接返回
    if (descriptor.instance && descriptor.status === 'ready') {
      return descriptor.instance;
    }

    // 创建服务实例
    return await this.createServiceInstance<T>(serviceKey);
  }

  /**
   * 服务发现
   */
  discoverServices(pattern?: string): ServiceDescriptor[] {
    const services = Array.from(this.services.values());
    
    if (!pattern) {
      return services;
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return services.filter(service => 
      regex.test(`${service.pluginName}.${service.serviceName}`)
    );
  }

  /**
   * 健康检查
   */
  async checkServiceHealth(pluginName: string, serviceName: string): Promise<HealthStatus> {
    const serviceKey = this.getServiceKey(pluginName, serviceName);
    const descriptor = this.services.get(serviceKey);
    
    if (!descriptor) {
      return { status: 'not_found', message: 'Service not found' };
    }

    if (!descriptor.instance) {
      return { status: 'not_initialized', message: 'Service not initialized' };
    }

    const factory = this.factories.get(serviceKey);
    if (factory?.healthCheck) {
      try {
        const isHealthy = await factory.healthCheck(descriptor.instance);
        descriptor.lastHealthCheck = new Date();
        
        return {
          status: isHealthy ? 'healthy' : 'unhealthy',
          message: isHealthy ? 'Service is healthy' : 'Service health check failed',
          lastCheck: descriptor.lastHealthCheck
        };
      } catch (error) {
        return {
          status: 'error',
          message: `Health check error: ${error.message}`,
          lastCheck: new Date()
        };
      }
    }

    return { status: 'no_health_check', message: 'No health check available' };
  }

  /**
   * 销毁服务
   */
  async destroyService(pluginName: string, serviceName: string): Promise<void> {
    const serviceKey = this.getServiceKey(pluginName, serviceName);
    const descriptor = this.services.get(serviceKey);
    
    if (!descriptor || !descriptor.instance) {
      return;
    }

    const factory = this.factories.get(serviceKey);
    if (factory?.destroy) {
      try {
        await factory.destroy(descriptor.instance);
      } catch (error) {
        this.logger.error(`Error destroying service ${serviceKey}:`, error);
      }
    }

    descriptor.status = 'destroyed';
    descriptor.instance = undefined;
    
    // 从根容器中移除
    if (this.rootContainer.hasRegistration(serviceKey)) {
      this.rootContainer.dispose(serviceKey);
    }

    this.logger.info(`Service destroyed: ${serviceKey}`);
  }

  /**
   * 创建服务实例
   */
  private async createServiceInstance<T>(serviceKey: string): Promise<T> {
    const descriptor = this.services.get(serviceKey)!;
    const factory = this.factories.get(serviceKey)!;

    try {
      descriptor.status = 'initializing';

      // 创建服务上下文
      const context: ServiceContext = {
        pluginName: descriptor.pluginName,
        serviceName: descriptor.serviceName,
        container: this.rootContainer,
        fastify: this.fastify,
        logger: this.logger.child({ 
          plugin: descriptor.pluginName, 
          service: descriptor.serviceName 
        }),
        config: this.getServiceConfig(descriptor.pluginName, descriptor.serviceName)
      };

      // 创建服务实例
      const instance = await factory.create(context);
      
      // 注册到根容器
      this.rootContainer.register(serviceKey, {
        value: instance,
        lifetime: 'SINGLETON'
      });

      descriptor.instance = instance;
      descriptor.status = 'ready';

      this.logger.info(`Service created: ${serviceKey}`);
      return instance;

    } catch (error) {
      descriptor.status = 'error';
      this.logger.error(`Failed to create service ${serviceKey}:`, error);
      throw error;
    }
  }

  /**
   * 检查循环依赖
   */
  private checkCircularDependencies(serviceKey: string, dependencies: string[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (current: string): boolean => {
      if (recursionStack.has(current)) {
        return true;
      }
      if (visited.has(current)) {
        return false;
      }

      visited.add(current);
      recursionStack.add(current);

      const currentDescriptor = this.services.get(current);
      if (currentDescriptor) {
        for (const dep of currentDescriptor.metadata.dependencies || []) {
          if (hasCycle(dep)) {
            return true;
          }
        }
      }

      recursionStack.delete(current);
      return false;
    };

    // 临时添加当前服务的依赖关系进行检查
    const tempDescriptor: ServiceDescriptor = {
      pluginName: '',
      serviceName: '',
      metadata: { version: '1.0.0', dependencies },
      status: 'initializing',
      createdAt: new Date()
    };
    this.services.set(serviceKey, tempDescriptor);

    try {
      if (hasCycle(serviceKey)) {
        throw new Error(`Circular dependency detected for service: ${serviceKey}`);
      }
    } finally {
      this.services.delete(serviceKey);
    }
  }

  private getServiceKey(pluginName: string, serviceName: string): string {
    return `${pluginName}.${serviceName}`;
  }

  private getServiceConfig(pluginName: string, serviceName: string): any {
    // 从配置中获取服务特定的配置
    return this.fastify.config?.[pluginName]?.[serviceName] || {};
  }
}
```

### 2. 服务访问控制实现

```typescript
// src/core/ServiceAccessControl.ts
export interface ServiceAccessControl {
  canAccess(
    requesterPlugin: string,
    targetPlugin: string,
    serviceName: string
  ): boolean;
}

export class RoleBasedAccessControl implements ServiceAccessControl {
  private permissions = new Map<string, Set<string>>();
  private pluginRoles = new Map<string, Set<string>>();

  constructor() {
    this.initializeDefaultPermissions();
  }

  /**
   * 设置插件角色
   */
  setPluginRole(pluginName: string, roles: string[]): void {
    this.pluginRoles.set(pluginName, new Set(roles));
  }

  /**
   * 授权服务访问权限
   */
  grantAccess(targetPlugin: string, serviceName: string, allowedPlugins: string[]): void {
    const serviceKey = `${targetPlugin}.${serviceName}`;
    this.permissions.set(serviceKey, new Set(allowedPlugins));
  }

  /**
   * 检查访问权限
   */
  canAccess(requesterPlugin: string, targetPlugin: string, serviceName: string): boolean {
    // 自己访问自己的服务总是允许的
    if (requesterPlugin === targetPlugin) {
      return true;
    }

    const serviceKey = `${targetPlugin}.${serviceName}`;
    const allowedPlugins = this.permissions.get(serviceKey);

    // 如果没有设置权限，默认拒绝访问
    if (!allowedPlugins) {
      return false;
    }

    // 检查直接权限
    if (allowedPlugins.has(requesterPlugin)) {
      return true;
    }

    // 检查通配符权限
    if (allowedPlugins.has('*')) {
      return true;
    }

    // 检查基于角色的权限
    const requesterRoles = this.pluginRoles.get(requesterPlugin);
    if (requesterRoles) {
      for (const role of requesterRoles) {
        if (allowedPlugins.has(`role:${role}`)) {
          return true;
        }
      }
    }

    return false;
  }

  private initializeDefaultPermissions(): void {
    // 设置默认权限规则
    this.grantAccess('core', 'logger', ['*']); // 所有插件都可以访问日志服务
    this.grantAccess('core', 'config', ['*']); // 所有插件都可以访问配置服务
  }
}
```

### 3. 类型安全的服务访问器

```typescript
// src/core/ServiceAccessor.ts
export class ServiceAccessor {
  constructor(
    private pluginName: string,
    private serviceRegistry: ServiceRegistry
  ) {}

  /**
   * 类型安全的服务获取
   */
  async getService<
    TPlugin extends keyof Stratix.PublicServices,
    TService extends keyof Stratix.PublicServices[TPlugin]
  >(
    targetPlugin: TPlugin,
    serviceName: TService
  ): Promise<Stratix.PublicServices[TPlugin][TService]> {
    return await this.serviceRegistry.getPublicService(
      this.pluginName,
      targetPlugin as string,
      serviceName as string
    );
  }

  /**
   * 批量获取服务
   */
  async getServices<T extends Record<string, { plugin: string; service: string }>>(
    serviceMap: T
  ): Promise<{ [K in keyof T]: any }> {
    const result = {} as any;
    
    for (const [key, { plugin, service }] of Object.entries(serviceMap)) {
      result[key] = await this.serviceRegistry.getPublicService(
        this.pluginName,
        plugin,
        service
      );
    }
    
    return result;
  }

  /**
   * 可选服务获取（如果服务不存在返回undefined）
   */
  async getOptionalService<
    TPlugin extends keyof Stratix.PublicServices,
    TService extends keyof Stratix.PublicServices[TPlugin]
  >(
    targetPlugin: TPlugin,
    serviceName: TService
  ): Promise<Stratix.PublicServices[TPlugin][TService] | undefined> {
    try {
      return await this.getService(targetPlugin, serviceName);
    } catch (error) {
      return undefined;
    }
  }
}
```

### 4. 插件基类实现

```typescript
// src/core/StratixPlugin.ts
export abstract class StratixPlugin {
  protected serviceAccessor: ServiceAccessor;
  protected serviceRegistry: ServiceRegistry;
  protected fastify: FastifyInstance;
  protected logger: any;
  protected config: any;

  constructor(
    protected pluginName: string,
    fastify: FastifyInstance
  ) {
    this.fastify = fastify;
    this.logger = fastify.log.child({ plugin: pluginName });
    this.serviceRegistry = fastify.serviceRegistry;
    this.serviceAccessor = new ServiceAccessor(pluginName, this.serviceRegistry);
    this.config = fastify.config?.[pluginName] || {};
  }

  /**
   * 插件初始化
   */
  abstract async initialize(): Promise<void>;

  /**
   * 注册公共服务
   */
  protected registerPublicService<T>(
    serviceName: string,
    factory: ServiceFactory<T>,
    metadata: ServiceMetadata
  ): void {
    this.serviceRegistry.registerPublicService(
      this.pluginName,
      serviceName,
      factory,
      metadata
    );
  }

  /**
   * 获取其他插件的服务
   */
  protected async getService<
    TPlugin extends keyof Stratix.PublicServices,
    TService extends keyof Stratix.PublicServices[TPlugin]
  >(
    targetPlugin: TPlugin,
    serviceName: TService
  ): Promise<Stratix.PublicServices[TPlugin][TService]> {
    return await this.serviceAccessor.getService(targetPlugin, serviceName);
  }

  /**
   * 插件销毁
   */
  async destroy(): Promise<void> {
    // 销毁插件注册的所有服务
    const services = this.serviceRegistry.discoverServices(`${this.pluginName}.*`);
    
    for (const service of services) {
      await this.serviceRegistry.destroyService(service.pluginName, service.serviceName);
    }
  }
}
```

### 5. Stratix核心集成

```typescript
// src/core/Stratix.ts (扩展现有实现)
export class Stratix {
  private serviceRegistry: ServiceRegistry;
  private accessControl: ServiceAccessControl;

  async create(options: StratixOptions): Promise<FastifyInstance> {
    const fastify = await this.createFastifyInstance(options);
    
    // 创建服务注册表
    this.accessControl = new RoleBasedAccessControl();
    this.serviceRegistry = new ServiceRegistry(
      fastify.diContainer,
      fastify,
      fastify.log,
      this.accessControl
    );

    // 将服务注册表添加到fastify实例
    fastify.decorate('serviceRegistry', this.serviceRegistry);
    fastify.decorate('serviceAccessControl', this.accessControl);

    // 注册核心服务
    await this.registerCoreServices(fastify);

    // 加载插件
    await this.loadPlugins(fastify, options.plugins || []);

    return fastify;
  }

  private async registerCoreServices(fastify: FastifyInstance): Promise<void> {
    // 注册日志服务
    this.serviceRegistry.registerPublicService(
      'core',
      'logger',
      {
        create: async (context) => context.logger,
        healthCheck: async () => true
      },
      {
        version: '1.0.0',
        description: 'Core logging service'
      }
    );

    // 注册配置服务
    this.serviceRegistry.registerPublicService(
      'core',
      'config',
      {
        create: async (context) => context.config,
        healthCheck: async () => true
      },
      {
        version: '1.0.0',
        description: 'Core configuration service'
      }
    );
  }
}
```

### 6. 健康状态接口

```typescript
// src/types/HealthStatus.ts
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'error' | 'not_found' | 'not_initialized' | 'no_health_check';
  message: string;
  lastCheck?: Date;
  details?: any;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, HealthStatus>;
  timestamp: Date;
}
```

### 7. 错误处理

```typescript
// src/errors/ServiceErrors.ts
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public pluginName?: string,
    public serviceName?: string
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class CircularDependencyError extends ServiceError {
  constructor(message: string) {
    super(message, 'CIRCULAR_DEPENDENCY');
    this.name = 'CircularDependencyError';
  }
}

export class ServiceNotFoundError extends ServiceError {
  constructor(pluginName: string, serviceName: string) {
    super(
      `Service not found: ${pluginName}.${serviceName}`,
      'SERVICE_NOT_FOUND',
      pluginName,
      serviceName
    );
    this.name = 'ServiceNotFoundError';
  }
}

export class AccessDeniedError extends ServiceError {
  constructor(requester: string, target: string, service: string) {
    super(
      `Access denied: ${requester} cannot access ${target}.${service}`,
      'ACCESS_DENIED',
      target,
      service
    );
    this.name = 'AccessDeniedError';
  }
}
```

这个实现方案提供了：

1. **完整的服务注册和发现机制**
2. **类型安全的服务访问**
3. **生命周期管理**
4. **访问控制和安全性**
5. **循环依赖检测**
6. **健康检查机制**
7. **错误处理和异常管理**

下一步我将创建最佳实践指南。
