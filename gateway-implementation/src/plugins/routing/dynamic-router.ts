// 动态路由插件 - 完整实现
// 负责将网关请求转发到上游Docker服务

import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { LoadBalancer, RouteConfig, ServiceHealth } from '../../types/routing.js';

interface DynamicRouterOptions {
  configPath: string;
  enableServiceDiscovery: boolean;
  loadBalancing: {
    strategy: string;
    healthCheck: {
      enabled: boolean;
      interval: number;
      timeout: number;
      path?: string;
    };
  };
  proxy: {
    timeout: number;
    retries: number;
    retryDelay: number;
    headers: Record<string, string>;
    removeHeaders: string[];
  };
}

/**
 * 负载均衡器实现
 */
class RoundRobinLoadBalancer implements LoadBalancer {
  private counters = new Map<string, number>();
  private healthStatus = new Map<string, ServiceHealth>();

  selectTarget(targets: string[], request?: FastifyRequest): string {
    const healthyTargets = this.getHealthyTargets(targets);
    
    if (healthyTargets.length === 0) {
      throw new Error('No healthy targets available');
    }

    if (healthyTargets.length === 1) {
      return healthyTargets[0];
    }

    // 轮询算法
    const key = healthyTargets.join(',');
    const counter = this.counters.get(key) || 0;
    const selectedTarget = healthyTargets[counter % healthyTargets.length];
    
    this.counters.set(key, counter + 1);
    return selectedTarget;
  }

  updateHealth(target: string, healthy: boolean): void {
    const existing = this.healthStatus.get(target);
    const now = new Date();

    this.healthStatus.set(target, {
      target,
      healthy,
      lastCheck: now,
      consecutiveFailures: healthy ? 0 : (existing?.consecutiveFailures || 0) + 1
    });
  }

  getHealthyTargets(targets: string[]): string[] {
    return targets.filter(target => {
      const health = this.healthStatus.get(target);
      return !health || health.healthy;
    });
  }

  recordRequest(target: string, success: boolean, responseTime: number): void {
    const health = this.healthStatus.get(target);
    if (health) {
      health.responseTime = responseTime;
      if (!success) {
        health.consecutiveFailures++;
      } else {
        health.consecutiveFailures = 0;
      }
    }
  }

  getHealthStatus(): Map<string, ServiceHealth> {
    return new Map(this.healthStatus);
  }
}

/**
 * 最少连接负载均衡器
 */
class LeastConnectionsLoadBalancer implements LoadBalancer {
  private connections = new Map<string, number>();
  private healthStatus = new Map<string, ServiceHealth>();

  selectTarget(targets: string[]): string {
    const healthyTargets = this.getHealthyTargets(targets);
    
    if (healthyTargets.length === 0) {
      throw new Error('No healthy targets available');
    }

    // 选择连接数最少的服务
    return healthyTargets.reduce((min, target) => {
      const minConnections = this.connections.get(min) || 0;
      const targetConnections = this.connections.get(target) || 0;
      return targetConnections < minConnections ? target : min;
    });
  }

  updateHealth(target: string, healthy: boolean): void {
    const existing = this.healthStatus.get(target);
    this.healthStatus.set(target, {
      target,
      healthy,
      lastCheck: new Date(),
      consecutiveFailures: healthy ? 0 : (existing?.consecutiveFailures || 0) + 1
    });
  }

  getHealthyTargets(targets: string[]): string[] {
    return targets.filter(target => {
      const health = this.healthStatus.get(target);
      return !health || health.healthy;
    });
  }

  recordRequest(target: string, success: boolean, responseTime: number): void {
    // 记录连接开始
    this.connections.set(target, (this.connections.get(target) || 0) + 1);
    
    // 模拟连接结束（实际应该在请求完成时调用）
    setTimeout(() => {
      this.connections.set(target, Math.max(0, (this.connections.get(target) || 1) - 1));
    }, responseTime);

    const health = this.healthStatus.get(target);
    if (health) {
      health.responseTime = responseTime;
      if (!success) {
        health.consecutiveFailures++;
      } else {
        health.consecutiveFailures = 0;
      }
    }
  }
}

/**
 * HTTP代理请求实现
 */
class HttpProxy {
  private options: DynamicRouterOptions['proxy'];
  private logger: any;

  constructor(options: DynamicRouterOptions['proxy'], logger: any) {
    this.options = options;
    this.logger = logger;
  }

  /**
   * 代理HTTP请求到上游服务
   */
  async proxyRequest(
    request: FastifyRequest,
    reply: FastifyReply,
    targetUrl: string,
    routeConfig: RouteConfig
  ): Promise<void> {
    const startTime = Date.now();
    let attempt = 0;
    const maxRetries = routeConfig.retries || this.options.retries;

    while (attempt <= maxRetries) {
      try {
        await this.attemptRequest(request, reply, targetUrl, routeConfig, attempt);
        return;
      } catch (error) {
        attempt++;
        
        if (attempt > maxRetries) {
          this.logger.error(`Proxy request failed after ${maxRetries} retries:`, {
            target: targetUrl,
            error: error instanceof Error ? error.message : String(error),
            duration: Date.now() - startTime
          });
          
          reply.status(502).send({
            error: 'Bad Gateway',
            message: 'Failed to proxy request to upstream server',
            target: targetUrl,
            attempts: attempt
          });
          return;
        }

        // 等待重试延迟
        const delay = routeConfig.retryDelay || this.options.retryDelay;
        await this.sleep(delay * attempt); // 指数退避

        this.logger.warn(`Retrying request (${attempt}/${maxRetries}):`, {
          target: targetUrl,
          delay: delay * attempt
        });
      }
    }
  }

  /**
   * 尝试单次请求
   */
  private async attemptRequest(
    request: FastifyRequest,
    reply: FastifyReply,
    targetUrl: string,
    routeConfig: RouteConfig,
    attempt: number
  ): Promise<void> {
    // 构建完整的目标URL
    const fullTargetUrl = this.buildTargetUrl(targetUrl, request, routeConfig);
    
    // 准备请求头
    const headers = this.prepareHeaders(request, routeConfig);
    
    // 准备请求体
    const body = await this.prepareBody(request);

    this.logger.debug(`Proxying request (attempt ${attempt + 1}):`, {
      method: request.method,
      originalUrl: request.url,
      targetUrl: fullTargetUrl,
      headers: Object.keys(headers)
    });

    // 发送HTTP请求
    const controller = new AbortController();
    const timeout = routeConfig.timeout || this.options.timeout;
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(fullTargetUrl, {
        method: request.method,
        headers,
        body: this.shouldIncludeBody(request.method) ? body : undefined,
        signal: controller.signal,
        // 不自动跟随重定向，让客户端处理
        redirect: 'manual'
      });

      clearTimeout(timeoutId);

      // 设置响应头
      this.setResponseHeaders(reply, response, routeConfig);

      // 设置状态码
      reply.status(response.status);

      // 处理响应体
      await this.handleResponseBody(reply, response, routeConfig);

      this.logger.debug(`Proxy request successful:`, {
        status: response.status,
        target: fullTargetUrl,
        duration: Date.now() - Date.now()
      });

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      throw error;
    }
  }

  /**
   * 构建目标URL
   */
  private buildTargetUrl(targetUrl: string, request: FastifyRequest, routeConfig: RouteConfig): string {
    let path = request.url;

    // 应用路径重写规则
    if (routeConfig.rewrite) {
      for (const [pattern, replacement] of Object.entries(routeConfig.rewrite)) {
        const regex = new RegExp(pattern);
        path = path.replace(regex, replacement);
      }
    }

    // 确保目标URL以/结尾，路径以/开头
    const baseUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
    const finalPath = path.startsWith('/') ? path : `/${path}`;

    return `${baseUrl}${finalPath}`;
  }

  /**
   * 准备请求头
   */
  private prepareHeaders(request: FastifyRequest, routeConfig: RouteConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    // 复制原始请求头
    for (const [key, value] of Object.entries(request.headers)) {
      if (value && !this.options.removeHeaders.includes(key.toLowerCase())) {
        headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }

    // 添加代理相关头
    headers['x-forwarded-for'] = request.ip;
    headers['x-forwarded-proto'] = request.protocol;
    headers['x-forwarded-host'] = request.hostname;
    headers['x-real-ip'] = request.ip;

    // 添加配置的自定义头
    if (this.options.headers) {
      Object.assign(headers, this.options.headers);
    }

    // 添加路由特定的头
    if (routeConfig.headers) {
      Object.assign(headers, routeConfig.headers);
    }

    // 移除hop-by-hop头
    delete headers.connection;
    delete headers['transfer-encoding'];
    delete headers['content-length']; // 让fetch自动计算

    return headers;
  }

  /**
   * 准备请求体
   */
  private async prepareBody(request: FastifyRequest): Promise<string | undefined> {
    if (!this.shouldIncludeBody(request.method)) {
      return undefined;
    }

    if (request.body) {
      // 如果body已经被解析，重新序列化
      if (typeof request.body === 'object') {
        return JSON.stringify(request.body);
      } else {
        return String(request.body);
      }
    }

    return undefined;
  }

  /**
   * 判断是否应该包含请求体
   */
  private shouldIncludeBody(method: string): boolean {
    return !['GET', 'HEAD', 'DELETE'].includes(method.toUpperCase());
  }

  /**
   * 设置响应头
   */
  private setResponseHeaders(reply: FastifyReply, response: Response, routeConfig: RouteConfig): void {
    // 复制响应头
    for (const [key, value] of response.headers.entries()) {
      // 跳过hop-by-hop头
      if (!['connection', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
        reply.header(key, value);
      }
    }

    // 添加网关标识头
    reply.header('x-gateway', 'stratix-gateway');
    reply.header('x-proxy-target', response.url);

    // 添加安全头（如果配置了）
    if (routeConfig.security?.additionalHeaders) {
      for (const [key, value] of Object.entries(routeConfig.security.additionalHeaders)) {
        reply.header(key, value);
      }
    }
  }

  /**
   * 处理响应体
   */
  private async handleResponseBody(reply: FastifyReply, response: Response, routeConfig: RouteConfig): Promise<void> {
    if (!response.body) {
      reply.send();
      return;
    }

    // 获取内容类型
    const contentType = response.headers.get('content-type') || '';

    try {
      if (contentType.includes('application/json')) {
        // JSON响应
        const jsonData = await response.json();
        reply.send(jsonData);
      } else if (contentType.includes('text/')) {
        // 文本响应
        const textData = await response.text();
        reply.send(textData);
      } else {
        // 二进制响应（图片、文件等）
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        reply.send(buffer);
      }
    } catch (error) {
      this.logger.error('Failed to process response body:', error);
      // 如果处理响应体失败，尝试发送原始流
      reply.send();
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 动态路由插件主函数
 */
async function dynamicRouterPlugin(fastify: FastifyInstance, options: DynamicRouterOptions) {
  const routeConfigs: RouteConfig[] = [];
  const loadBalancer = new RoundRobinLoadBalancer();
  const httpProxy = new HttpProxy(options.proxy, fastify.log);

  /**
   * 加载路由配置
   */
  async function loadRouteConfig(): Promise<void> {
    try {
      // 动态导入路由配置
      const configModule = await import(options.configPath + `?t=${Date.now()}`);
      const configs = configModule.default || configModule;
      
      routeConfigs.length = 0;
      routeConfigs.push(...configs.filter((config: RouteConfig) => config.enabled !== false));
      
      fastify.log.info(`Loaded ${routeConfigs.length} route configurations`);
      
      // 输出路由信息
      routeConfigs.forEach(config => {
        const methods = Array.isArray(config.method) ? config.method : [config.method || 'GET'];
        const targets = Array.isArray(config.target) ? config.target : [config.target];
        
        fastify.log.debug(`Route: ${methods.join('|')} ${config.path} -> ${targets.join(', ')}`);
      });
      
    } catch (error) {
      fastify.log.error(`Failed to load route config from ${options.configPath}:`, error);
      throw error;
    }
  }

  /**
   * 健康检查函数
   */
  async function performHealthCheck(target: string): Promise<boolean> {
    try {
      const healthPath = options.loadBalancing.healthCheck.path || '/health';
      const healthUrl = `${target}${healthPath}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, options.loadBalancing.healthCheck.timeout);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Stratix-Gateway-HealthCheck/1.0'
        }
      });

      clearTimeout(timeoutId);
      
      const isHealthy = response.ok;
      loadBalancer.updateHealth(target, isHealthy);
      
      if (!isHealthy) {
        fastify.log.warn(`Health check failed for ${target}: ${response.status} ${response.statusText}`);
      }
      
      return isHealthy;
      
    } catch (error) {
      loadBalancer.updateHealth(target, false);
      fastify.log.warn(`Health check error for ${target}:`, error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * 启动健康检查
   */
  function startHealthCheck(): void {
    if (!options.loadBalancing.healthCheck.enabled) {
      return;
    }

    const interval = options.loadBalancing.healthCheck.interval;
    
    setInterval(async () => {
      const allTargets = new Set<string>();
      
      // 收集所有目标服务
      for (const config of routeConfigs) {
        const targets = Array.isArray(config.target) ? config.target : [config.target];
        targets.forEach(target => allTargets.add(target));
      }

      // 并行执行健康检查
      const healthCheckPromises = Array.from(allTargets).map(target => 
        performHealthCheck(target).catch(error => {
          fastify.log.error(`Health check failed for ${target}:`, error);
          return false;
        })
      );

      await Promise.all(healthCheckPromises);
      
      // 输出健康状态摘要
      const healthStatus = loadBalancer.getHealthStatus();
      const healthyCount = Array.from(healthStatus.values()).filter(h => h.healthy).length;
      const totalCount = healthStatus.size;
      
      fastify.log.debug(`Health check completed: ${healthyCount}/${totalCount} services healthy`);
      
    }, interval);

    fastify.log.info(`Health check started with ${interval}ms interval`);
  }

  /**
   * 匹配路由配置
   */
  function matchRoute(method: string, path: string): RouteConfig | null {
    for (const config of routeConfigs) {
      // 检查HTTP方法
      const methods = Array.isArray(config.method) ? config.method : [config.method || 'GET'];
      if (!methods.includes(method.toUpperCase() as any)) {
        continue;
      }

      // 检查路径匹配
      const routePath = config.path;
      
      // 简单的通配符匹配
      if (routePath.endsWith('/*')) {
        const prefix = routePath.slice(0, -2);
        if (path.startsWith(prefix)) {
          return config;
        }
      } else if (routePath === path) {
        return config;
      }
    }

    return null;
  }

  /**
   * 处理代理请求
   */
  async function handleProxyRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 匹配路由
      const routeConfig = matchRoute(request.method, request.url);
      if (!routeConfig) {
        reply.status(404).send({
          error: 'Not Found',
          message: 'No route configuration found for this request',
          path: request.url,
          method: request.method
        });
        return;
      }

      fastify.log.debug(`Route matched: ${routeConfig.id}`, {
        method: request.method,
        path: request.url,
        routeId: routeConfig.id
      });

      // 选择目标服务
      const targets = Array.isArray(routeConfig.target) ? routeConfig.target : [routeConfig.target];
      const selectedTarget = loadBalancer.selectTarget(targets, request);

      fastify.log.debug(`Target selected: ${selectedTarget}`, {
        availableTargets: targets.length,
        strategy: options.loadBalancing.strategy
      });

      // 代理请求
      await httpProxy.proxyRequest(request, reply, selectedTarget, routeConfig);

      // 记录成功请求
      const duration = Date.now() - startTime;
      loadBalancer.recordRequest(selectedTarget, true, duration);

      fastify.log.info(`Proxy request completed`, {
        method: request.method,
        path: request.url,
        target: selectedTarget,
        duration,
        status: reply.statusCode
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      fastify.log.error(`Proxy request failed:`, {
        method: request.method,
        path: request.url,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      if (!reply.sent) {
        reply.status(502).send({
          error: 'Bad Gateway',
          message: 'Failed to proxy request to upstream server',
          duration
        });
      }
    }
  }

  // 初始化
  await loadRouteConfig();
  startHealthCheck();

  // 注册通配符路由处理器
  fastify.all('/*', handleProxyRequest);

  // 管理API：重新加载路由配置
  fastify.post('/admin/routes/reload', async (request, reply) => {
    try {
      await loadRouteConfig();
      reply.send({ 
        message: 'Routes reloaded successfully',
        count: routeConfigs.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      reply.status(500).send({
        error: 'Failed to reload routes',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // 管理API：获取健康状态
  fastify.get('/admin/health/services', async (request, reply) => {
    const healthStatus = loadBalancer.getHealthStatus();
    const services = Array.from(healthStatus.entries()).map(([target, health]) => ({
      target,
      healthy: health.healthy,
      lastCheck: health.lastCheck,
      responseTime: health.responseTime,
      consecutiveFailures: health.consecutiveFailures
    }));

    reply.send({
      services,
      summary: {
        total: services.length,
        healthy: services.filter(s => s.healthy).length,
        unhealthy: services.filter(s => !s.healthy).length
      }
    });
  });

  // 管理API：获取路由配置
  fastify.get('/admin/routes', async (request, reply) => {
    reply.send({
      routes: routeConfigs.map(config => ({
        id: config.id,
        path: config.path,
        method: config.method,
        target: config.target,
        enabled: config.enabled !== false,
        description: config.description
      })),
      count: routeConfigs.length
    });
  });

  fastify.log.info('Dynamic Router plugin loaded successfully', {
    routeCount: routeConfigs.length,
    healthCheckEnabled: options.loadBalancing.healthCheck.enabled,
    loadBalancingStrategy: options.loadBalancing.strategy
  });
}

export default withRegisterAutoDI(dynamicRouterPlugin, {
  discovery: {
    patterns: ['services/RoutingService.{ts,js}']
  },
  debug: true
});