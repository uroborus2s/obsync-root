# API Gateway 统一认证 + 内部负载均衡实现

## 🏗️ 架构设计决策

### 最终方案：统一认证 + 内部服务发现

基于所有接口都需要认证的要求，我们采用以下简化架构：

```
┌─────────────────────────────────────────────────────────────┐
│                      Nginx 层                              │
│  所有 /api/* 请求 → API Gateway 集群                        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway 层                           │
│  统一认证 + 授权 + 内部路由                                  │
│                                                            │
│  /api/icalink/* → ICA Link 负载均衡器 → 后端实例集群         │
│  /api/icasync/* → ICA Sync 负载均衡器 → 后端实例集群         │
│  /api/auth/*    → 本地认证服务                              │
│  /api/user/*    → 本地用户服务                              │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   后端服务层                                │
│  ICA Link: 3002, 3003, 3004 (本地) + 远程实例              │
│  ICA Sync: 3001 (本地) + 远程实例                          │
└─────────────────────────────────────────────────────────────┘
```

### 设计原则

1. **统一认证**：所有请求都通过 API Gateway 进行认证和授权
2. **内部负载均衡**：API Gateway 内部实现对后端服务的负载均衡
3. **服务发现**：动态发现和管理后端服务实例
4. **故障转移**：自动检测和切换故障实例

## 🔧 API Gateway 内部负载均衡实现

### 1. 负载均衡器核心代码

```typescript
// src/services/IcalinkLoadBalancer.ts
import { FastifyInstance } from 'fastify';
import { EventEmitter } from 'events';

export interface ServiceInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  maxConnections: number;
  currentConnections: number;
  healthy: boolean;
  lastHealthCheck: Date;
  responseTime: number;
  totalRequests: number;
  failedRequests: number;
}

export class IcalinkLoadBalancer extends EventEmitter {
  private instances: Map<string, ServiceInstance> = new Map();
  private roundRobinIndex = 0;
  private healthCheckInterval: NodeJS.Timeout;

  constructor(
    private fastify: FastifyInstance,
    private config: LoadBalancerConfig
  ) {
    super();
    this.initializeInstances();
    this.startHealthChecks();
    this.startMetricsCollection();
  }

  private initializeInstances() {
    // 本地实例配置
    const localServers = process.env.ICALINK_UPSTREAM_SERVERS?.split(',') || [];
    localServers.forEach((server, index) => {
      const [host, port] = server.split(':');
      this.addInstance({
        id: `local-${index + 1}`,
        host: host.trim(),
        port: parseInt(port.trim()),
        weight: 3, // 本地实例权重更高
        maxConnections: 100,
        currentConnections: 0,
        healthy: true,
        lastHealthCheck: new Date(),
        responseTime: 0,
        totalRequests: 0,
        failedRequests: 0
      });
    });

    // 远程实例配置
    const remoteServers = process.env.REMOTE_ICALINK_SERVERS?.split(',') || [];
    remoteServers.forEach((server, index) => {
      const [host, port] = server.split(':');
      this.addInstance({
        id: `remote-${index + 1}`,
        host: host.trim(),
        port: parseInt(port.trim()),
        weight: 1, // 远程实例权重较低
        maxConnections: 50,
        currentConnections: 0,
        healthy: true,
        lastHealthCheck: new Date(),
        responseTime: 0,
        totalRequests: 0,
        failedRequests: 0
      });
    });
  }

  private addInstance(instance: ServiceInstance) {
    this.instances.set(instance.id, instance);
    this.fastify.log.info(`Added ICA Link instance: ${instance.id} (${instance.host}:${instance.port})`);
  }

  // 加权轮询算法
  public selectInstance(): ServiceInstance | null {
    const healthyInstances = Array.from(this.instances.values()).filter(
      instance => instance.healthy && instance.currentConnections < instance.maxConnections
    );

    if (healthyInstances.length === 0) {
      this.fastify.log.warn('No healthy ICA Link instances available');
      return null;
    }

    // 根据策略选择实例
    const strategy = process.env.ICALINK_LB_STRATEGY || 'weighted_round_robin';
    
    switch (strategy) {
      case 'weighted_round_robin':
        return this.weightedRoundRobin(healthyInstances);
      case 'least_connections':
        return this.leastConnections(healthyInstances);
      case 'fastest_response':
        return this.fastestResponse(healthyInstances);
      default:
        return this.weightedRoundRobin(healthyInstances);
    }
  }

  private weightedRoundRobin(instances: ServiceInstance[]): ServiceInstance {
    // 计算总权重
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    
    // 生成随机数选择实例
    let randomWeight = Math.random() * totalWeight;
    
    for (const instance of instances) {
      randomWeight -= instance.weight;
      if (randomWeight <= 0) {
        return instance;
      }
    }
    
    return instances[0]; // 备选方案
  }

  private leastConnections(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((min, instance) => 
      instance.currentConnections < min.currentConnections ? instance : min
    );
  }

  private fastestResponse(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((fastest, instance) => 
      instance.responseTime < fastest.responseTime ? instance : fastest
    );
  }

  // 健康检查
  private startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      const promises = Array.from(this.instances.values()).map(instance => 
        this.checkInstanceHealth(instance)
      );
      
      await Promise.allSettled(promises);
    }, 30000); // 每30秒检查一次
  }

  private async checkInstanceHealth(instance: ServiceInstance): Promise<void> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`http://${instance.host}:${instance.port}/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      const wasHealthy = instance.healthy;
      
      instance.healthy = response.ok;
      instance.responseTime = responseTime;
      instance.lastHealthCheck = new Date();
      
      if (!wasHealthy && instance.healthy) {
        this.fastify.log.info(`Instance ${instance.id} recovered`);
        this.emit('instanceRecovered', instance);
      } else if (wasHealthy && !instance.healthy) {
        this.fastify.log.warn(`Instance ${instance.id} became unhealthy`);
        this.emit('instanceFailed', instance);
      }
      
    } catch (error) {
      const wasHealthy = instance.healthy;
      instance.healthy = false;
      instance.lastHealthCheck = new Date();
      
      if (wasHealthy) {
        this.fastify.log.error(`Health check failed for ${instance.id}:`, error);
        this.emit('instanceFailed', instance);
      }
    }
  }

  // 请求代理
  public async proxyRequest(
    instance: ServiceInstance,
    request: any,
    reply: any
  ): Promise<void> {
    const startTime = Date.now();
    instance.currentConnections++;
    instance.totalRequests++;

    try {
      const targetUrl = `http://${instance.host}:${instance.port}${request.url.replace('/api/icalink', '')}`;
      
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          ...request.headers,
          'X-Forwarded-For': request.ip,
          'X-Forwarded-Proto': request.protocol,
          'X-Instance-ID': instance.id,
          'X-Request-ID': request.id
        },
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body)
      });

      const responseTime = Date.now() - startTime;
      instance.responseTime = (instance.responseTime * 0.9) + (responseTime * 0.1); // 移动平均

      const data = await response.text();
      
      reply
        .code(response.status)
        .headers({
          ...Object.fromEntries(response.headers.entries()),
          'X-Instance-ID': instance.id,
          'X-Response-Time': responseTime.toString()
        })
        .send(data);

    } catch (error) {
      instance.failedRequests++;
      this.fastify.log.error(`Proxy error for instance ${instance.id}:`, error);
      
      // 标记实例为不健康
      if (instance.failedRequests > 3) {
        instance.healthy = false;
      }
      
      reply.code(502).send({
        error: 'Bad Gateway',
        message: 'Failed to proxy request to ICA Link service',
        instance: instance.id
      });
    } finally {
      instance.currentConnections--;
    }
  }

  // 获取负载均衡状态
  public getStatus() {
    const instances = Array.from(this.instances.values());
    
    return {
      strategy: process.env.ICALINK_LB_STRATEGY || 'weighted_round_robin',
      totalInstances: instances.length,
      healthyInstances: instances.filter(i => i.healthy).length,
      totalConnections: instances.reduce((sum, i) => sum + i.currentConnections, 0),
      totalRequests: instances.reduce((sum, i) => sum + i.totalRequests, 0),
      instances: instances.map(instance => ({
        id: instance.id,
        host: instance.host,
        port: instance.port,
        healthy: instance.healthy,
        weight: instance.weight,
        currentConnections: instance.currentConnections,
        maxConnections: instance.maxConnections,
        responseTime: Math.round(instance.responseTime),
        totalRequests: instance.totalRequests,
        failedRequests: instance.failedRequests,
        successRate: instance.totalRequests > 0 
          ? Math.round(((instance.totalRequests - instance.failedRequests) / instance.totalRequests) * 100)
          : 100,
        lastHealthCheck: instance.lastHealthCheck
      }))
    };
  }

  // 动态调整实例权重
  public updateInstanceWeight(instanceId: string, weight: number): boolean {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.weight = weight;
      this.fastify.log.info(`Updated weight for instance ${instanceId} to ${weight}`);
      return true;
    }
    return false;
  }

  // 清理资源
  public destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.removeAllListeners();
  }

  private startMetricsCollection() {
    // 定期收集和记录指标
    setInterval(() => {
      const status = this.getStatus();
      this.fastify.log.info('ICA Link Load Balancer Metrics:', {
        healthyInstances: status.healthyInstances,
        totalConnections: status.totalConnections,
        totalRequests: status.totalRequests
      });
    }, 60000); // 每分钟记录一次
  }
}

export interface LoadBalancerConfig {
  healthCheckInterval: number;
  maxRetries: number;
  timeout: number;
}
```

### 2. 统一路由配置

```typescript
// src/routes/index.ts - 主路由文件
import { FastifyInstance } from 'fastify';
import { IcalinkLoadBalancer } from '../services/IcalinkLoadBalancer';
import { IcasyncLoadBalancer } from '../services/IcasyncLoadBalancer';
import { authMiddleware } from '../middleware/auth';

export async function setupRoutes(fastify: FastifyInstance) {
  // 初始化负载均衡器
  const icalinkLB = new IcalinkLoadBalancer(fastify, 'icalink');
  const icasyncLB = new IcasyncLoadBalancer(fastify, 'icasync');

  // 注册关闭钩子
  fastify.addHook('onClose', async () => {
    icalinkLB.destroy();
    icasyncLB.destroy();
  });

  // 全局认证中间件
  fastify.addHook('preHandler', authMiddleware);

  // ICA Link 服务路由
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', async (request, reply) => {
      const instance = icalinkLB.selectInstance();
      if (!instance) {
        reply.code(503).send({
          error: 'Service Unavailable',
          message: 'No healthy ICA Link instances available'
        });
        return;
      }
      request.targetInstance = instance;
    });

    // 代理所有 ICA Link 请求
    fastify.all('/api/icalink/*', async (request, reply) => {
      const instance = request.targetInstance;
      await icalinkLB.proxyRequest(instance, request, reply);
    });
  });

  // ICA Sync 服务路由
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', async (request, reply) => {
      const instance = icasyncLB.selectInstance();
      if (!instance) {
        reply.code(503).send({
          error: 'Service Unavailable',
          message: 'No healthy ICA Sync instances available'
        });
        return;
      }
      request.targetInstance = instance;
    });

    // 代理所有 ICA Sync 请求
    fastify.all('/api/icasync/*', async (request, reply) => {
      const instance = request.targetInstance;
      await icasyncLB.proxyRequest(instance, request, reply);
    });
  });

  // 本地服务路由 (认证、用户管理等)
  fastify.register(async function (fastify) {
    // 认证相关接口
    fastify.post('/api/auth/login', async (request, reply) => {
      // 本地处理登录逻辑
    });

    fastify.post('/api/auth/logout', async (request, reply) => {
      // 本地处理登出逻辑
    });

    // 用户管理接口
    fastify.get('/api/user/profile', async (request, reply) => {
      // 本地处理用户信息
    });

    // 系统管理接口
    fastify.get('/api/admin/stats', async (request, reply) => {
      // 本地处理系统统计
    });
  });

  // 负载均衡状态和管理接口
  fastify.register(async function (fastify) {
    // ICA Link 负载均衡状态
    fastify.get('/api/lb/icalink/status', async (request, reply) => {
      const status = icalinkLB.getStatus();
      reply.send(status);
    });

    // ICA Sync 负载均衡状态
    fastify.get('/api/lb/icasync/status', async (request, reply) => {
      const status = icasyncLB.getStatus();
      reply.send(status);
    });

    // 整体负载均衡状态
    fastify.get('/api/lb/status', async (request, reply) => {
      reply.send({
        icalink: icalinkLB.getStatus(),
        icasync: icasyncLB.getStatus(),
        gateway: {
          instanceId: process.env.INSTANCE_ID,
          instanceName: process.env.INSTANCE_NAME,
          role: process.env.INSTANCE_ROLE,
          uptime: process.uptime()
        }
      });
    });

    // 动态权重调整
    fastify.post('/api/lb/:service/weight', async (request, reply) => {
      const { service } = request.params as { service: string };
      const { instanceId, weight } = request.body as { instanceId: string; weight: number };

      let success = false;
      if (service === 'icalink') {
        success = icalinkLB.updateInstanceWeight(instanceId, weight);
      } else if (service === 'icasync') {
        success = icasyncLB.updateInstanceWeight(instanceId, weight);
      }

      if (success) {
        reply.send({ success: true, message: `Weight updated for ${service} instance ${instanceId}` });
      } else {
        reply.code(404).send({ success: false, message: `Instance ${instanceId} not found in ${service}` });
      }
    });
  });
}
```

## 🔄 下一步

1. [Nginx 配置优化](./nginx-config.md#api-gateway-lb)
2. [监控配置](./monitoring.md#api-gateway-monitoring)
3. [故障转移测试](./disaster-recovery.md#api-gateway-failover)
