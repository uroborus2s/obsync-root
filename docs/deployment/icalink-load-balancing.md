# ICA Link 多实例负载均衡配置

## 🎯 负载均衡架构

### 实例分布

| 服务器 | 实例名称 | 容器名称 | 端口映射 | 内网地址 | 全局ID |
|--------|----------|----------|----------|----------|--------|
| 主服务器 | icalink-1 | obsync-app-icalink-1-s1 | 127.0.0.1:3002:3002 | 172.20.0.31 | 1 |
| 主服务器 | icalink-2 | obsync-app-icalink-2-s1 | 127.0.0.1:3003:3002 | 172.20.0.32 | 2 |
| 主服务器 | icalink-3 | obsync-app-icalink-3-s1 | 127.0.0.1:3004:3002 | 172.20.0.33 | 3 |
| 备用服务器 | icalink-1-s2 | obsync-app-icalink-1-s2 | 127.0.0.1:3002:3002 | 172.20.0.31 | 4 |
| 备用服务器 | icalink-2-s2 | obsync-app-icalink-2-s2 | 127.0.0.1:3003:3002 | 172.20.0.32 | 5 |

## 🔧 API Gateway 负载均衡配置

### Stratix Gateway 配置

在 API Gateway 应用中配置 ICA Link 服务的负载均衡：

#### 1. 服务发现配置

```typescript
// src/config/services.ts
export const serviceConfig = {
  icalink: {
    // 本地实例配置
    local: [
      {
        id: 'icalink-1',
        host: 'localhost',
        port: 3002,
        weight: 1,
        maxConnections: 100
      },
      {
        id: 'icalink-2',
        host: 'localhost',
        port: 3003,
        weight: 1,
        maxConnections: 100
      },
      {
        id: 'icalink-3',
        host: 'localhost',
        port: 3004,
        weight: 1,
        maxConnections: 100
      }
    ],
    // 远程实例配置 (备用服务器)
    remote: [
      {
        id: 'icalink-1-s2',
        host: '120.131.10.128',
        port: 3002,
        weight: 0.5,  // 跨服务器权重较低
        maxConnections: 50
      },
      {
        id: 'icalink-2-s2',
        host: '120.131.10.128',
        port: 3003,
        weight: 0.5,
        maxConnections: 50
      }
    ]
  }
};
```

#### 2. 负载均衡器实现

```typescript
// src/services/LoadBalancer.ts
import { FastifyInstance } from 'fastify';

export interface ServiceInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  maxConnections: number;
  currentConnections: number;
  healthy: boolean;
  lastHealthCheck: Date;
}

export class IcalinkLoadBalancer {
  private instances: ServiceInstance[] = [];
  private currentIndex = 0;

  constructor(private fastify: FastifyInstance) {
    this.initializeInstances();
    this.startHealthChecks();
  }

  private initializeInstances() {
    // 加载本地实例
    serviceConfig.icalink.local.forEach(config => {
      this.instances.push({
        ...config,
        currentConnections: 0,
        healthy: true,
        lastHealthCheck: new Date()
      });
    });

    // 加载远程实例
    serviceConfig.icalink.remote.forEach(config => {
      this.instances.push({
        ...config,
        currentConnections: 0,
        healthy: true,
        lastHealthCheck: new Date()
      });
    });
  }

  // 加权轮询算法
  public getNextInstance(): ServiceInstance | null {
    const healthyInstances = this.instances.filter(instance => 
      instance.healthy && instance.currentConnections < instance.maxConnections
    );

    if (healthyInstances.length === 0) {
      return null;
    }

    // 加权轮询选择
    let totalWeight = healthyInstances.reduce((sum, instance) => sum + instance.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const instance of healthyInstances) {
      randomWeight -= instance.weight;
      if (randomWeight <= 0) {
        return instance;
      }
    }

    return healthyInstances[0]; // 备选方案
  }

  // 健康检查
  private async startHealthChecks() {
    setInterval(async () => {
      for (const instance of this.instances) {
        try {
          const response = await fetch(`http://${instance.host}:${instance.port}/health`, {
            timeout: 5000
          });
          
          instance.healthy = response.ok;
          instance.lastHealthCheck = new Date();
          
          this.fastify.log.debug(`Health check for ${instance.id}: ${instance.healthy ? 'OK' : 'FAILED'}`);
        } catch (error) {
          instance.healthy = false;
          instance.lastHealthCheck = new Date();
          this.fastify.log.warn(`Health check failed for ${instance.id}:`, error);
        }
      }
    }, 30000); // 每30秒检查一次
  }

  // 获取实例状态
  public getInstancesStatus() {
    return this.instances.map(instance => ({
      id: instance.id,
      host: instance.host,
      port: instance.port,
      healthy: instance.healthy,
      currentConnections: instance.currentConnections,
      maxConnections: instance.maxConnections,
      lastHealthCheck: instance.lastHealthCheck
    }));
  }
}
```

#### 3. 路由配置

```typescript
// src/routes/icalink.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IcalinkLoadBalancer } from '../services/LoadBalancer';

export async function icalinkRoutes(fastify: FastifyInstance) {
  const loadBalancer = new IcalinkLoadBalancer(fastify);

  // 代理所有 icalink 请求
  fastify.register(async function (fastify) {
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      const instance = loadBalancer.getNextInstance();
      
      if (!instance) {
        reply.code(503).send({
          error: 'Service Unavailable',
          message: 'No healthy icalink instances available'
        });
        return;
      }

      // 增加连接计数
      instance.currentConnections++;
      
      // 设置实例信息到请求上下文
      request.targetInstance = instance;
    });

    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      // 减少连接计数
      if (request.targetInstance) {
        request.targetInstance.currentConnections--;
      }
    });

    // 代理请求到选定的实例
    fastify.all('/icalink/*', async (request: FastifyRequest, reply: FastifyReply) => {
      const instance = request.targetInstance;
      const targetUrl = `http://${instance.host}:${instance.port}${request.url.replace('/icalink', '')}`;
      
      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: {
            ...request.headers,
            'X-Forwarded-For': request.ip,
            'X-Forwarded-Proto': request.protocol,
            'X-Instance-ID': instance.id
          },
          body: request.method !== 'GET' && request.method !== 'HEAD' ? JSON.stringify(request.body) : undefined
        });

        const data = await response.text();
        
        reply
          .code(response.status)
          .headers(Object.fromEntries(response.headers.entries()))
          .send(data);
          
      } catch (error) {
        fastify.log.error(`Proxy error for instance ${instance.id}:`, error);
        
        // 标记实例为不健康
        instance.healthy = false;
        
        reply.code(502).send({
          error: 'Bad Gateway',
          message: 'Failed to proxy request to icalink service'
        });
      }
    });

    // 负载均衡状态端点
    fastify.get('/icalink/status', async (request: FastifyRequest, reply: FastifyReply) => {
      const status = loadBalancer.getInstancesStatus();
      
      reply.send({
        service: 'icalink',
        totalInstances: status.length,
        healthyInstances: status.filter(s => s.healthy).length,
        instances: status
      });
    });
  });
}
```

## 🔄 会话一致性处理

### 1. 无状态设计 (推荐)

```typescript
// 确保 ICA Link 服务是无状态的
export class IcalinkService {
  // 使用外部存储 (Redis/Database) 存储会话数据
  async createCheckIn(userId: string, data: CheckInData) {
    // 所有状态存储在数据库中，不依赖本地内存
    return await this.repository.createCheckIn(userId, data);
  }
}
```

### 2. 粘性会话 (如果需要)

```typescript
// 基于用户ID的一致性哈希
export class ConsistentHashBalancer extends IcalinkLoadBalancer {
  public getInstanceForUser(userId: string): ServiceInstance | null {
    const healthyInstances = this.instances.filter(instance => instance.healthy);
    
    if (healthyInstances.length === 0) {
      return null;
    }

    // 使用用户ID的哈希值选择实例
    const hash = this.hashCode(userId);
    const index = Math.abs(hash) % healthyInstances.length;
    
    return healthyInstances[index];
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}
```

## 📊 监控和指标

### 1. 实例监控

```typescript
// src/services/InstanceMonitor.ts
export class InstanceMonitor {
  private metrics = new Map<string, InstanceMetrics>();

  public recordRequest(instanceId: string, responseTime: number, success: boolean) {
    const metric = this.metrics.get(instanceId) || {
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date()
    };

    metric.totalRequests++;
    if (success) {
      metric.successfulRequests++;
    }
    
    // 计算移动平均响应时间
    metric.averageResponseTime = (metric.averageResponseTime * 0.9) + (responseTime * 0.1);
    metric.lastRequestTime = new Date();
    
    this.metrics.set(instanceId, metric);
  }

  public getMetrics() {
    return Object.fromEntries(this.metrics.entries());
  }
}
```

### 2. 健康检查端点

```typescript
// 每个 ICA Link 实例的健康检查端点
fastify.get('/health', async (request, reply) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    instance: {
      id: process.env.INSTANCE_ID,
      name: process.env.INSTANCE_NAME,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    dependencies: {
      database: await checkDatabaseConnection(),
      redis: await checkRedisConnection()
    }
  };

  const isHealthy = Object.values(health.dependencies).every(dep => dep === 'healthy');
  
  reply.code(isHealthy ? 200 : 503).send(health);
});
```

## 🚀 部署脚本

### 启动脚本

```bash
#!/bin/bash
# 启动 ICA Link 多实例服务

echo "启动 ICA Link 多实例服务..."

# 启动主服务器实例
docker compose up -d app-icalink-1 app-icalink-2 app-icalink-3

# 等待实例启动
sleep 30

# 检查实例状态
echo "检查实例状态..."
for port in 3002 3003 3004; do
    if curl -f http://localhost:$port/health > /dev/null 2>&1; then
        echo "✅ 实例 localhost:$port 启动成功"
    else
        echo "❌ 实例 localhost:$port 启动失败"
    fi
done

echo "ICA Link 多实例服务启动完成"
```

## 🔄 下一步

1. [验证多实例部署](./verification.md#icalink-multi-instance)
2. [监控配置](./monitoring.md#icalink-monitoring)
3. [故障转移测试](./disaster-recovery.md#icalink-failover)
