// @stratix/core 基于方法名约定的生命周期服务示例
// 展示如何在服务中使用新的生命周期机制

/**
 * 数据库服务示例
 * 展示如何使用生命周期方法进行资源管理
 */
export class DatabaseService {
  private connection: any = null;
  private isReady = false;

  /**
   * onReady - 应用准备就绪时调用
   * 用于初始化数据库连接和预热
   */
  async onReady(): Promise<void> {
    console.log('🔌 DatabaseService: Initializing database connection...');
    
    // 模拟数据库连接初始化
    this.connection = {
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      connected: true
    };
    
    // 预热连接池
    await this.warmupConnectionPool();
    
    this.isReady = true;
    console.log('✅ DatabaseService: Database connection ready');
  }

  /**
   * onListen - 服务器开始监听时调用
   * 用于启动后台任务和监控
   */
  async onListen(): Promise<void> {
    console.log('👂 DatabaseService: Server is listening, starting background tasks...');
    
    // 启动连接健康检查
    this.startHealthCheck();
    
    // 启动性能监控
    this.startPerformanceMonitoring();
    
    console.log('✅ DatabaseService: Background tasks started');
  }

  /**
   * preClose - 服务器关闭前调用
   * 用于停止接受新连接，完成现有操作
   */
  async preClose(): Promise<void> {
    console.log('⏸️ DatabaseService: Preparing for shutdown...');
    
    // 停止接受新连接
    this.isReady = false;
    
    // 等待现有操作完成
    await this.waitForPendingOperations();
    
    console.log('✅ DatabaseService: Ready for shutdown');
  }

  /**
   * onClose - 服务器关闭时调用
   * 用于清理资源和关闭连接
   */
  async onClose(): Promise<void> {
    console.log('🔌 DatabaseService: Closing database connection...');
    
    // 关闭数据库连接
    if (this.connection) {
      this.connection.connected = false;
      this.connection = null;
    }
    
    console.log('✅ DatabaseService: Database connection closed');
  }

  /**
   * onRoute - 路由注册时调用
   * 用于路由级别的数据库优化
   */
  onRoute(routeOptions: any): void {
    console.log(`📍 DatabaseService: Route registered - ${routeOptions.method} ${routeOptions.url}`);
    
    // 根据路由特征进行数据库优化
    if (routeOptions.url.includes('/api/')) {
      console.log('🔧 DatabaseService: Optimizing for API route');
    }
  }

  /**
   * onRegister - 插件注册时调用
   * 用于插件级别的配置
   */
  onRegister(instance: any, opts: any): void {
    console.log('🔌 DatabaseService: Plugin registered with options:', opts);
    
    // 根据插件选项调整配置
    if (opts.database) {
      console.log(`🔧 DatabaseService: Configuring for database: ${opts.database}`);
    }
  }

  // 私有辅助方法
  private async warmupConnectionPool(): Promise<void> {
    console.log('🔥 DatabaseService: Warming up connection pool...');
    // 模拟连接池预热
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private startHealthCheck(): void {
    console.log('💓 DatabaseService: Starting health check...');
    // 模拟健康检查启动
  }

  private startPerformanceMonitoring(): void {
    console.log('📊 DatabaseService: Starting performance monitoring...');
    // 模拟性能监控启动
  }

  private async waitForPendingOperations(): Promise<void> {
    console.log('⏳ DatabaseService: Waiting for pending operations...');
    // 模拟等待操作完成
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // 业务方法
  async query(sql: string): Promise<any[]> {
    if (!this.isReady) {
      throw new Error('Database not ready');
    }
    
    console.log(`🔍 DatabaseService: Executing query: ${sql}`);
    return [];
  }
}

/**
 * 缓存服务示例
 * 展示简单的生命周期使用
 */
export class CacheService {
  private cache = new Map<string, any>();

  /**
   * onReady - 初始化缓存
   */
  async onReady(): Promise<void> {
    console.log('💾 CacheService: Initializing cache...');
    
    // 预加载一些数据
    this.cache.set('app:version', '1.0.0');
    this.cache.set('app:startup', new Date().toISOString());
    
    console.log('✅ CacheService: Cache initialized');
  }

  /**
   * onClose - 清理缓存
   */
  async onClose(): Promise<void> {
    console.log('💾 CacheService: Clearing cache...');
    
    // 保存重要数据到持久存储
    const importantData = this.cache.get('important:data');
    if (importantData) {
      console.log('💾 CacheService: Saving important data...');
      // 模拟保存到文件或数据库
    }
    
    this.cache.clear();
    console.log('✅ CacheService: Cache cleared');
  }

  // 业务方法
  get(key: string): any {
    return this.cache.get(key);
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
  }
}

/**
 * 监控服务示例
 * 展示错误处理和监控
 */
export class MonitoringService {
  private metrics = {
    requests: 0,
    errors: 0,
    startTime: Date.now()
  };

  /**
   * onListen - 开始收集指标
   */
  async onListen(): Promise<void> {
    console.log('📊 MonitoringService: Starting metrics collection...');
    
    // 启动指标收集
    setInterval(() => {
      this.collectMetrics();
    }, 5000);
    
    console.log('✅ MonitoringService: Metrics collection started');
  }

  /**
   * onRoute - 为每个路由添加监控
   */
  onRoute(routeOptions: any): void {
    console.log(`📊 MonitoringService: Adding monitoring for ${routeOptions.method} ${routeOptions.url}`);
    
    // 为路由添加监控钩子
    if (routeOptions.preHandler) {
      const originalPreHandler = routeOptions.preHandler;
      routeOptions.preHandler = async (request: any, reply: any) => {
        this.metrics.requests++;
        return originalPreHandler(request, reply);
      };
    }
  }

  /**
   * preClose - 生成最终报告
   */
  async preClose(): Promise<void> {
    console.log('📊 MonitoringService: Generating final report...');
    
    const uptime = Date.now() - this.metrics.startTime;
    console.log(`📊 Final metrics:`, {
      uptime: `${uptime}ms`,
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) + '%' : '0%'
    });
    
    console.log('✅ MonitoringService: Final report generated');
  }

  private collectMetrics(): void {
    // 模拟指标收集
    console.log('📊 MonitoringService: Collecting metrics...');
  }
}

/**
 * 使用示例：
 * 
 * 在你的服务中，只需要定义对应名称的方法，框架会自动检测并注册到Fastify钩子：
 * 
 * ```typescript
 * export class MyService {
 *   // 自动注册到 fastify.addHook('onReady', ...)
 *   async onReady() {
 *     console.log('Service is ready!');
 *   }
 * 
 *   // 自动注册到 fastify.addHook('onClose', ...)
 *   async onClose() {
 *     console.log('Service is closing!');
 *   }
 * 
 *   // 普通业务方法，不会被注册为生命周期钩子
 *   async doSomething() {
 *     return 'result';
 *   }
 * }
 * ```
 * 
 * 支持的生命周期方法名：
 * - onReady() - 应用准备就绪
 * - onListen() - 服务器开始监听
 * - onClose() - 应用关闭
 * - preClose() - 应用关闭前
 * - onRoute(routeOptions) - 路由注册时
 * - onRegister(instance, opts) - 插件注册时
 */
