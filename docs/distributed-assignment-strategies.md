# 分布式工作流分配策略详解

## 1. 轮询分配 (Round-Robin)

### 实现原理
```typescript
private selectByRoundRobin(engines: WorkflowEngineInstance[]): WorkflowEngineInstance {
  // 基于时间戳取模实现简单轮询
  const index = Date.now() % engines.length;
  return engines[index];
}
```

### 工作机制
- **优点**：分配均匀，实现简单
- **缺点**：不考虑实例负载差异
- **适用场景**：实例性能相近，任务复杂度相似

### 实际执行流程
1. 获取所有活跃引擎实例列表
2. 使用当前时间戳对实例数量取模
3. 返回对应索引的引擎实例

## 2. 负载均衡分配 (Load-Balanced)

### 实现原理
```typescript
private selectByLoadBalance(engines: WorkflowEngineInstance[]): WorkflowEngineInstance {
  return engines.reduce((best, current) => {
    const bestLoad = best.load.activeWorkflows + best.load.cpuUsage;
    const currentLoad = current.load.activeWorkflows + current.load.cpuUsage;
    return currentLoad < bestLoad ? current : best;
  });
}
```

### 负载计算公式
```
总负载 = 活跃工作流数量 + CPU使用率 + 内存使用率 * 权重
```

### 负载信息收集
```typescript
// 在引擎实例注册时收集
const engineInstance = {
  load: {
    activeWorkflows: this.executionContexts.size,
    cpuUsage: await this.getCpuUsage(),      // 0-100
    memoryUsage: await this.getMemoryUsage() // 0-100
  }
};
```

## 3. 亲和性分配 (Affinity)

### 实现原理
```typescript
private selectByAffinity(engines: WorkflowEngineInstance[]): WorkflowEngineInstance {
  // 优先选择当前实例，减少网络开销
  const currentEngine = engines.find(e => e.instanceId === this.currentInstanceId);
  return currentEngine || engines[0];
}
```

### 适用场景
- 减少跨实例通信开销
- 提高数据局部性
- 适合有状态的工作流

## 4. 能力匹配分配 (Capability)

### 实现原理
```typescript
private async selectEngineByCapability(
  requiredCapabilities?: string[]
): Promise<WorkflowEngineInstance | null> {
  const activeEngines = await this.getActiveEngines();
  
  if (!requiredCapabilities || requiredCapabilities.length === 0) {
    return this.selectBestEngine();
  }

  // 筛选具备所需能力的引擎
  const capableEngines = activeEngines.filter(engine =>
    requiredCapabilities.every(capability =>
      engine.supportedExecutors.includes(capability)
    )
  );

  if (capableEngines.length === 0) {
    return null;
  }

  return this.selectByLoadBalance(capableEngines);
}
```

### 能力匹配示例
```typescript
// 节点需要特定执行器
const nodeConfig = {
  executor: "fetchOldCalendarMappings",
  requiredCapabilities: ["fetchOldCalendarMappings", "deleteSingleCalendar"]
};

// 引擎实例能力声明
const engineInstance = {
  supportedExecutors: [
    "fetchOldCalendarMappings", 
    "deleteSingleCalendar",
    "sendEmailNotification"
  ]
};
```

## 5. 本地优先分配 (Locality)

### 实现原理
```typescript
private selectByLocality(engines: WorkflowEngineInstance[]): WorkflowEngineInstance {
  const currentEngine = engines.find(e => e.instanceId === this.currentInstanceId);
  if (currentEngine) {
    return currentEngine;
  }
  
  // 选择同主机的实例
  const currentHostname = process.env.HOSTNAME || 'localhost';
  const localEngine = engines.find(e => e.hostname === currentHostname);
  return localEngine || engines[0];
}
```

### 本地性优势
- 减少网络延迟
- 提高数据访问速度
- 降低跨主机通信成本

## 6. 分配策略配置

### 配置示例
```typescript
const distributedConfig: DistributedSchedulingConfig = {
  assignmentStrategy: 'load-balanced',
  heartbeatInterval: 30000,        // 30秒心跳
  lockTimeout: 300000,             // 5分钟锁超时
  failureDetectionTimeout: 90000,  // 90秒故障检测
  maxRetries: 3,
  enableFailover: true
};
```

### 动态策略切换
```typescript
// 根据系统负载动态调整策略
if (systemLoad > 0.8) {
  this.config.assignmentStrategy = 'load-balanced';
} else if (networkLatency > 100) {
  this.config.assignmentStrategy = 'locality';
} else {
  this.config.assignmentStrategy = 'round-robin';
}
```
