# 分布式工作流引擎生产环境部署指南

## 1. 多实例启动配置

### 1.1 Docker Compose 部署示例

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 数据库服务
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: workflow_db
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/migrations:/docker-entrypoint-initdb.d
    ports:
      - "3306:3306"

  # Redis 服务（可选，用于缓存）
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # 工作流引擎实例1
  workflow-engine-1:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://root:root_password@mysql:3306/workflow_db
      - REDIS_URL=redis://redis:6379
      - ENGINE_INSTANCE_ID=engine-1
      - HOSTNAME=workflow-engine-1
      - DISTRIBUTED_MODE=true
      - ASSIGNMENT_STRATEGY=load-balanced
      - HEARTBEAT_INTERVAL=30000
      - LOCK_TIMEOUT=300000
      - FAILURE_DETECTION_TIMEOUT=90000
    depends_on:
      - mysql
      - redis
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  # 工作流引擎实例2
  workflow-engine-2:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://root:root_password@mysql:3306/workflow_db
      - REDIS_URL=redis://redis:6379
      - ENGINE_INSTANCE_ID=engine-2
      - HOSTNAME=workflow-engine-2
      - DISTRIBUTED_MODE=true
      - ASSIGNMENT_STRATEGY=load-balanced
      - HEARTBEAT_INTERVAL=30000
      - LOCK_TIMEOUT=300000
      - FAILURE_DETECTION_TIMEOUT=90000
    depends_on:
      - mysql
      - redis
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  # 工作流引擎实例3
  workflow-engine-3:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://root:root_password@mysql:3306/workflow_db
      - REDIS_URL=redis://redis:6379
      - ENGINE_INSTANCE_ID=engine-3
      - HOSTNAME=workflow-engine-3
      - DISTRIBUTED_MODE=true
      - ASSIGNMENT_STRATEGY=capability
      - HEARTBEAT_INTERVAL=30000
      - LOCK_TIMEOUT=300000
      - FAILURE_DETECTION_TIMEOUT=90000
      - SUPPORTED_EXECUTORS=fetchOldCalendarMappings,deleteSingleCalendar,sendEmailNotification
    depends_on:
      - mysql
      - redis
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  # 负载均衡器
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - workflow-engine-1
      - workflow-engine-2
      - workflow-engine-3

volumes:
  mysql_data:
```

### 1.2 Kubernetes 部署示例

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-engine
  labels:
    app: workflow-engine
spec:
  replicas: 3
  selector:
    matchLabels:
      app: workflow-engine
  template:
    metadata:
      labels:
        app: workflow-engine
    spec:
      containers:
      - name: workflow-engine
        image: workflow-engine:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: workflow-secrets
              key: database-url
        - name: DISTRIBUTED_MODE
          value: "true"
        - name: ASSIGNMENT_STRATEGY
          value: "load-balanced"
        - name: HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: ENGINE_INSTANCE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: workflow-engine-service
spec:
  selector:
    app: workflow-engine
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## 2. 分布式调度策略配置

### 2.1 配置文件示例

```typescript
// config/distributed.ts
export const distributedConfig = {
  // 基础配置
  enabled: process.env.DISTRIBUTED_MODE === 'true',
  instanceId: process.env.ENGINE_INSTANCE_ID || `engine_${process.pid}_${Date.now()}`,
  hostname: process.env.HOSTNAME || require('os').hostname(),
  
  // 调度策略配置
  scheduling: {
    assignmentStrategy: process.env.ASSIGNMENT_STRATEGY as NodeAssignmentStrategy || 'load-balanced',
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000'),
    lockTimeout: parseInt(process.env.LOCK_TIMEOUT || '300000'),
    failureDetectionTimeout: parseInt(process.env.FAILURE_DETECTION_TIMEOUT || '90000'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    enableFailover: process.env.ENABLE_FAILOVER !== 'false'
  },
  
  // 负载均衡权重配置
  loadBalancing: {
    cpuWeight: parseFloat(process.env.CPU_WEIGHT || '0.3'),
    memoryWeight: parseFloat(process.env.MEMORY_WEIGHT || '0.3'),
    workflowWeight: parseFloat(process.env.WORKFLOW_WEIGHT || '0.4')
  },
  
  // 能力配置
  capabilities: {
    supportedExecutors: process.env.SUPPORTED_EXECUTORS?.split(',') || [
      'fetchOldCalendarMappings',
      'deleteSingleCalendar',
      'sendEmailNotification'
    ],
    maxConcurrentWorkflows: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '10'),
    maxConcurrentNodes: parseInt(process.env.MAX_CONCURRENT_NODES || '50')
  }
};
```

### 2.2 动态策略切换

```typescript
// services/DynamicSchedulingService.ts
export class DynamicSchedulingService {
  private currentStrategy: NodeAssignmentStrategy = 'load-balanced';
  
  async adjustStrategy(): Promise<void> {
    const metrics = await this.collectSystemMetrics();
    
    // 根据系统负载动态调整策略
    if (metrics.averageCpuUsage > 80) {
      this.currentStrategy = 'load-balanced';
      this.logger.info('切换到负载均衡策略，CPU使用率过高');
    } else if (metrics.networkLatency > 100) {
      this.currentStrategy = 'locality';
      this.logger.info('切换到本地优先策略，网络延迟过高');
    } else if (metrics.failureRate > 0.1) {
      this.currentStrategy = 'affinity';
      this.logger.info('切换到亲和性策略，故障率过高');
    } else {
      this.currentStrategy = 'round-robin';
      this.logger.info('切换到轮询策略，系统运行正常');
    }
    
    // 更新调度器配置
    await this.distributedScheduler.updateStrategy(this.currentStrategy);
  }
  
  private async collectSystemMetrics() {
    const engines = await this.distributedScheduler.getActiveEngines();
    
    const totalCpu = engines.reduce((sum, e) => sum + e.load.cpuUsage, 0);
    const averageCpuUsage = totalCpu / engines.length;
    
    const networkLatency = await this.measureNetworkLatency();
    const failureRate = await this.calculateFailureRate();
    
    return { averageCpuUsage, networkLatency, failureRate };
  }
}
```

## 3. 故障转移机制实际运行

### 3.1 故障检测流程

```typescript
// 故障检测定时任务
setInterval(async () => {
  try {
    const failoverEvents = await this.distributedScheduler.detectFailuresAndFailover();
    
    for (const event of failoverEvents) {
      await this.handleFailoverEvent(event);
    }
  } catch (error) {
    this.logger.error('故障检测异常', error);
  }
}, this.config.heartbeatInterval);

private async handleFailoverEvent(event: FailoverEvent): Promise<void> {
  this.logger.warn('处理故障转移事件', {
    eventId: event.eventId,
    failedEngine: event.failedEngineId,
    takeoverEngine: event.takeoverEngineId,
    affectedWorkflows: event.affectedWorkflows.length,
    affectedNodes: event.affectedNodes.length
  });
  
  // 1. 释放故障实例的所有锁
  await this.distributedLockManager.forceReleaseEnginelocks(event.failedEngineId);
  
  // 2. 重新分配受影响的工作流
  for (const workflowId of event.affectedWorkflows) {
    await this.reassignWorkflow(workflowId, event.takeoverEngineId);
  }
  
  // 3. 重新分配受影响的节点
  for (const nodeId of event.affectedNodes) {
    await this.reassignNode(nodeId, event.takeoverEngineId);
  }
  
  // 4. 发送告警通知
  await this.sendFailoverAlert(event);
}
```

### 3.2 健康检查端点

```typescript
// routes/health.ts
export class HealthController {
  @Get('/health')
  async healthCheck(): Promise<any> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      instanceId: this.workflowEngine.instanceId,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      load: {
        activeWorkflows: this.workflowEngine.getActiveWorkflowCount(),
        cpuUsage: await this.getCpuUsage(),
        memoryUsage: this.getMemoryUsage()
      },
      database: await this.checkDatabaseConnection(),
      distributedLock: await this.checkDistributedLockHealth()
    };
    
    return health;
  }
  
  @Get('/ready')
  async readinessCheck(): Promise<any> {
    const checks = await Promise.allSettled([
      this.checkDatabaseConnection(),
      this.checkDistributedScheduler(),
      this.checkDistributedLockManager()
    ]);
    
    const allReady = checks.every(check => check.status === 'fulfilled');
    
    return {
      status: allReady ? 'ready' : 'not_ready',
      checks: checks.map((check, index) => ({
        name: ['database', 'scheduler', 'lockManager'][index],
        status: check.status,
        error: check.status === 'rejected' ? check.reason : undefined
      }))
    };
  }
}
```

## 4. 监控和告警

### 4.1 Prometheus 监控指标

```typescript
// monitoring/metrics.ts
export class WorkflowMetrics {
  private readonly registry = new prometheus.Registry();
  
  private readonly workflowCounter = new prometheus.Counter({
    name: 'workflow_executions_total',
    help: 'Total number of workflow executions',
    labelNames: ['engine_id', 'status', 'assignment_strategy']
  });
  
  private readonly nodeExecutionDuration = new prometheus.Histogram({
    name: 'node_execution_duration_seconds',
    help: 'Duration of node execution',
    labelNames: ['engine_id', 'node_type', 'executor'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300]
  });
  
  private readonly lockAcquisitionDuration = new prometheus.Histogram({
    name: 'lock_acquisition_duration_seconds',
    help: 'Duration of lock acquisition',
    labelNames: ['lock_type'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
  });
  
  private readonly engineLoad = new prometheus.Gauge({
    name: 'engine_load',
    help: 'Current engine load',
    labelNames: ['engine_id', 'metric_type']
  });
  
  constructor() {
    this.registry.registerMetric(this.workflowCounter);
    this.registry.registerMetric(this.nodeExecutionDuration);
    this.registry.registerMetric(this.lockAcquisitionDuration);
    this.registry.registerMetric(this.engineLoad);
  }
  
  recordWorkflowExecution(engineId: string, status: string, strategy: string): void {
    this.workflowCounter.inc({ engine_id: engineId, status, assignment_strategy: strategy });
  }
  
  recordNodeExecution(engineId: string, nodeType: string, executor: string, duration: number): void {
    this.nodeExecutionDuration.observe({ engine_id: engineId, node_type: nodeType, executor }, duration);
  }
  
  updateEngineLoad(engineId: string, cpuUsage: number, memoryUsage: number, activeWorkflows: number): void {
    this.engineLoad.set({ engine_id: engineId, metric_type: 'cpu' }, cpuUsage);
    this.engineLoad.set({ engine_id: engineId, metric_type: 'memory' }, memoryUsage);
    this.engineLoad.set({ engine_id: engineId, metric_type: 'workflows' }, activeWorkflows);
  }
}
```

### 4.2 告警规则配置

```yaml
# prometheus-alerts.yml
groups:
- name: workflow-engine
  rules:
  - alert: WorkflowEngineDown
    expr: up{job="workflow-engine"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Workflow engine instance is down"
      description: "Workflow engine {{ $labels.instance }} has been down for more than 1 minute"
  
  - alert: HighWorkflowFailureRate
    expr: rate(workflow_executions_total{status="failed"}[5m]) / rate(workflow_executions_total[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High workflow failure rate"
      description: "Workflow failure rate is {{ $value | humanizePercentage }} for engine {{ $labels.engine_id }}"
  
  - alert: LockAcquisitionSlow
    expr: histogram_quantile(0.95, rate(lock_acquisition_duration_seconds_bucket[5m])) > 1
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Slow lock acquisition"
      description: "95th percentile lock acquisition time is {{ $value }}s"
```

这套完整的分布式执行机制为工作流引擎提供了企业级的可靠性、可扩展性和可观测性，能够在生产环境中稳定运行并处理大规模工作流任务。
