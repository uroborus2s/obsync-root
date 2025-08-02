# Stratix 插件间服务共享最佳实践

## 服务设计原则

### 1. 单一职责原则

每个服务应该只负责一个明确的业务领域：

```typescript
// ✅ 好的设计 - 职责单一
class UserAuthenticationService {
  async authenticate(credentials: Credentials): Promise<AuthResult> {
    // 只负责用户认证
  }
  
  async validateToken(token: string): Promise<boolean> {
    // 只负责令牌验证
  }
}

// ❌ 不好的设计 - 职责混乱
class UserService {
  async authenticate(credentials: Credentials): Promise<AuthResult> {}
  async sendEmail(email: Email): Promise<void> {}
  async generateReport(userId: string): Promise<Report> {}
  async processPayment(payment: Payment): Promise<void> {}
}
```

### 2. 接口隔离原则

为不同的使用场景提供专门的接口：

```typescript
// ✅ 好的设计 - 接口隔离
interface UserReader {
  getUser(id: string): Promise<User>;
  findUsers(criteria: SearchCriteria): Promise<User[]>;
}

interface UserWriter {
  createUser(userData: CreateUserData): Promise<User>;
  updateUser(id: string, updates: UpdateUserData): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

// 服务实现多个接口
class UserService implements UserReader, UserWriter {
  // 实现所有方法
}

// 消费者只依赖需要的接口
class UserReportService {
  constructor(private userReader: UserReader) {} // 只需要读取功能
}
```

### 3. 依赖倒置原则

依赖抽象而不是具体实现：

```typescript
// ✅ 好的设计 - 依赖抽象
interface EmailProvider {
  sendEmail(email: Email): Promise<void>;
}

class NotificationService {
  constructor(private emailProvider: EmailProvider) {}
  
  async sendNotification(notification: Notification): Promise<void> {
    await this.emailProvider.sendEmail(notification.email);
  }
}

// ❌ 不好的设计 - 依赖具体实现
class NotificationService {
  constructor(private smtpClient: SMTPClient) {} // 紧耦合
}
```

## 服务生命周期管理

### 1. SINGLETON服务

适用于无状态、全局共享的服务：

```typescript
// ✅ 适合SINGLETON的服务
class ConfigurationService {
  private config: Config;
  
  constructor() {
    this.config = this.loadConfig();
  }
  
  getConfig(key: string): any {
    return this.config[key];
  }
}

class DatabaseConnectionPool {
  private pool: Pool;
  
  async initialize(): Promise<void> {
    this.pool = await createPool();
  }
  
  getConnection(): Promise<Connection> {
    return this.pool.getConnection();
  }
}
```

### 2. SCOPED服务

适用于请求级别的有状态服务：

```typescript
// ✅ 适合SCOPED的服务
class RequestContextService {
  constructor(
    private request: FastifyRequest,
    private reply: FastifyReply
  ) {}
  
  getCurrentUser(): User | null {
    return this.request.user;
  }
  
  getTraceId(): string {
    return this.request.headers['x-trace-id'] as string;
  }
}

class AuditLogService {
  private logs: AuditLog[] = [];
  
  constructor(private context: RequestContextService) {}
  
  log(action: string, details: any): void {
    this.logs.push({
      action,
      details,
      userId: this.context.getCurrentUser()?.id,
      timestamp: new Date()
    });
  }
  
  async flush(): Promise<void> {
    // 在请求结束时批量写入日志
    await this.writeLogsToDatabase(this.logs);
  }
}
```

### 3. TRANSIENT服务

适用于每次使用都需要新实例的服务：

```typescript
// ✅ 适合TRANSIENT的服务
class IdGeneratorService {
  generateId(): string {
    return uuid();
  }
  
  generateTimestampId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

class EncryptionService {
  encrypt(data: string, key: string): string {
    // 每次加密使用新的实例确保安全性
    return this.performEncryption(data, key);
  }
}
```

## 服务注册最佳实践

### 1. 服务元数据

提供完整的服务元数据：

```typescript
// ✅ 完整的服务注册
this.registerPublicService(
  'userService',
  {
    create: async (context) => new UserService(context.container.resolve('database')),
    destroy: async (instance) => await instance.cleanup(),
    healthCheck: async (instance) => await instance.isHealthy()
  },
  {
    version: '2.1.0',
    description: '用户管理服务，提供用户CRUD操作',
    dependencies: ['database', 'cache'],
    healthCheckInterval: 30000,
    tags: ['user', 'authentication', 'core']
  }
);
```

### 2. 渐进式服务升级

支持服务版本管理：

```typescript
// 注册多个版本的服务
this.registerPublicService('userService', userServiceV1Factory, {
  version: '1.0.0',
  tags: ['deprecated']
});

this.registerPublicService('userServiceV2', userServiceV2Factory, {
  version: '2.0.0',
  tags: ['current']
});

// 提供向后兼容的适配器
this.registerPublicService('userService', {
  create: async (context) => {
    const v2Service = await context.container.resolve('userServiceV2');
    return new UserServiceV1Adapter(v2Service);
  }
}, {
  version: '1.0.0-compat',
  description: 'V1 compatibility adapter for V2 service'
});
```

## 错误处理和容错

### 1. 优雅降级

当依赖服务不可用时提供降级方案：

```typescript
class NotificationService {
  constructor(
    private serviceAccessor: ServiceAccessor,
    private logger: Logger
  ) {}
  
  async sendNotification(notification: Notification): Promise<void> {
    try {
      // 尝试使用主要的邮件服务
      const emailService = await this.serviceAccessor.getService('email', 'primaryService');
      await emailService.send(notification.email);
    } catch (error) {
      this.logger.warn('Primary email service failed, trying fallback', error);
      
      try {
        // 降级到备用邮件服务
        const fallbackService = await this.serviceAccessor.getOptionalService('email', 'fallbackService');
        if (fallbackService) {
          await fallbackService.send(notification.email);
        } else {
          // 最后的降级方案：记录到队列稍后处理
          await this.queueForLaterProcessing(notification);
        }
      } catch (fallbackError) {
        this.logger.error('All email services failed', fallbackError);
        throw new ServiceUnavailableError('Email service is currently unavailable');
      }
    }
  }
}
```

### 2. 断路器模式

防止级联故障：

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

// 在服务中使用断路器
class ExternalApiService {
  private circuitBreaker = new CircuitBreaker(3, 30000);
  
  async callExternalApi(data: any): Promise<any> {
    return await this.circuitBreaker.execute(async () => {
      return await this.httpClient.post('/api/endpoint', data);
    });
  }
}
```

## 性能优化

### 1. 服务缓存

合理使用缓存提升性能：

```typescript
class CachedUserService {
  private cache = new Map<string, { user: User; expiry: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5分钟
  
  constructor(private userService: UserService) {}
  
  async getUser(id: string): Promise<User> {
    const cached = this.cache.get(id);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.user;
    }
    
    const user = await this.userService.getUser(id);
    this.cache.set(id, {
      user,
      expiry: Date.now() + this.TTL
    });
    
    return user;
  }
  
  invalidateUser(id: string): void {
    this.cache.delete(id);
  }
}
```

### 2. 懒加载和预加载

根据使用模式优化加载策略：

```typescript
class LazyLoadedService {
  private servicePromise?: Promise<HeavyService>;
  
  private async getService(): Promise<HeavyService> {
    if (!this.servicePromise) {
      this.servicePromise = this.createHeavyService();
    }
    return this.servicePromise;
  }
  
  async performOperation(data: any): Promise<any> {
    const service = await this.getService();
    return service.process(data);
  }
  
  private async createHeavyService(): Promise<HeavyService> {
    // 延迟创建重量级服务
    return new HeavyService();
  }
}

class PreloadedService {
  private criticalServices: Map<string, any> = new Map();
  
  async initialize(): Promise<void> {
    // 预加载关键服务
    const criticalServiceNames = ['database', 'cache', 'logger'];
    
    await Promise.all(
      criticalServiceNames.map(async (name) => {
        const service = await this.serviceAccessor.getService('core', name);
        this.criticalServices.set(name, service);
      })
    );
  }
  
  getCriticalService(name: string): any {
    return this.criticalServices.get(name);
  }
}
```

## 安全最佳实践

### 1. 最小权限原则

只授予必要的服务访问权限：

```typescript
// 在插件初始化时设置权限
class TasksPlugin extends StratixPlugin {
  async initialize(): Promise<void> {
    // 只允许特定插件访问任务执行服务
    this.fastify.serviceAccessControl.grantAccess(
      'tasks',
      'executionEngine',
      ['icasync', 'gateway'] // 只有这两个插件可以访问
    );
    
    // 任务管理服务只允许管理员插件访问
    this.fastify.serviceAccessControl.grantAccess(
      'tasks',
      'taskManager',
      ['role:admin']
    );
  }
}
```

### 2. 输入验证和清理

对服务输入进行严格验证：

```typescript
class SecureUserService {
  async createUser(userData: CreateUserData): Promise<User> {
    // 输入验证
    this.validateUserData(userData);
    
    // 数据清理
    const cleanedData = this.sanitizeUserData(userData);
    
    // 权限检查
    await this.checkCreatePermission();
    
    return await this.userRepository.create(cleanedData);
  }
  
  private validateUserData(data: CreateUserData): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new ValidationError('Invalid email address');
    }
    
    if (!data.password || data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }
  }
  
  private sanitizeUserData(data: CreateUserData): CreateUserData {
    return {
      ...data,
      email: data.email.toLowerCase().trim(),
      name: this.escapeHtml(data.name)
    };
  }
}
```

## 监控和调试

### 1. 结构化日志

使用结构化日志便于监控和调试：

```typescript
class LoggingService {
  constructor(private logger: Logger) {}
  
  logServiceCall(
    serviceName: string,
    methodName: string,
    duration: number,
    success: boolean,
    metadata?: any
  ): void {
    this.logger.info('Service call completed', {
      service: serviceName,
      method: methodName,
      duration,
      success,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }
  
  logServiceError(
    serviceName: string,
    methodName: string,
    error: Error,
    metadata?: any
  ): void {
    this.logger.error('Service call failed', {
      service: serviceName,
      method: methodName,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }
}
```

### 2. 性能监控

监控服务调用性能：

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  
  startTimer(operationName: string): () => void {
    const startTime = process.hrtime.bigint();
    
    return () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // 转换为毫秒
      
      this.recordMetric(operationName, duration);
    };
  }
  
  private recordMetric(operationName: string, duration: number): void {
    const metric = this.metrics.get(operationName) || {
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0
    };
    
    metric.count++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    
    this.metrics.set(operationName, metric);
  }
  
  getMetrics(): Record<string, PerformanceMetric & { avgDuration: number }> {
    const result: any = {};
    
    for (const [name, metric] of this.metrics) {
      result[name] = {
        ...metric,
        avgDuration: metric.totalDuration / metric.count
      };
    }
    
    return result;
  }
}
```

## 测试策略

### 1. 服务模拟

为依赖服务创建模拟实现：

```typescript
// 测试中使用的模拟服务
class MockUserService implements UserService {
  private users = new Map<string, User>();
  
  async getUser(id: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
  
  async createUser(userData: CreateUserData): Promise<User> {
    const user = { id: uuid(), ...userData };
    this.users.set(user.id, user);
    return user;
  }
  
  // 测试辅助方法
  addTestUser(user: User): void {
    this.users.set(user.id, user);
  }
  
  clearUsers(): void {
    this.users.clear();
  }
}
```

### 2. 集成测试

测试服务间的集成：

```typescript
describe('Service Integration', () => {
  let serviceRegistry: ServiceRegistry;
  let fastify: FastifyInstance;
  
  beforeEach(async () => {
    fastify = await createTestApp();
    serviceRegistry = fastify.serviceRegistry;
  });
  
  it('should allow cross-plugin service access', async () => {
    // 注册服务
    serviceRegistry.registerPublicService('pluginA', 'serviceA', mockServiceFactory, metadata);
    
    // 从另一个插件访问服务
    const accessor = new ServiceAccessor('pluginB', serviceRegistry);
    const service = await accessor.getService('pluginA', 'serviceA');
    
    expect(service).toBeDefined();
    expect(await service.performOperation()).toBe('expected result');
  });
});
```

这些最佳实践确保了服务共享机制的可靠性、安全性和可维护性。
