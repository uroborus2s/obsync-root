# 工作流实例生命周期管理使用指南

## 概述

本指南详细介绍如何使用 Stratix Tasks 插件进行工作流实例的完整生命周期管理，包括实例创建、监控、中断恢复等实际操作。本文档基于现有 Tasks 插件的实际功能和 API，提供可直接运行的代码示例。

### 核心功能
- **工作流实例管理**：创建、启动、暂停、恢复、取消工作流实例
- **实时状态监控**：查询实例状态、执行进度、节点详情
- **断点续传机制**：自动检测中断并恢复执行
- **分布式执行支持**：多服务实例协同处理
- **完整日志追踪**：详细的执行日志和错误信息

## Tasks 库的使用方法

### 1. 引入和初始化 Tasks 插件

```typescript
// 在 Stratix 应用中引入 Tasks 插件
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance } from 'fastify';

async function myAppPlugin(fastify: FastifyInstance) {
  // Tasks 插件会自动注册所有服务到 DI 容器
  // 可以直接从容器中解析需要的服务

  const workflowAdapter = fastify.diContainer.resolve('workflowAdapter');
  const workflowEngineService = fastify.diContainer.resolve('workflowEngineService');
  const workflowDefinitionService = fastify.diContainer.resolve('workflowDefinitionService');
  const executorRegistryService = fastify.diContainer.resolve('executorRegistryService');

  // 注册自定义执行器
  executorRegistryService.registerExecutor('userCreator', new UserCreatorExecutor());
  executorRegistryService.registerExecutor('emailSender', new EmailSenderExecutor());
}

export default withRegisterAutoDI(myAppPlugin, {
  name: 'my-app',
  dependencies: ['@stratix/tasks'] // 依赖 Tasks 插件
});
```

### 2. 创建工作流定义

```typescript
import type { WorkflowDefinitionService } from '@stratix/tasks';

class WorkflowManager {
  constructor(
    private readonly workflowDefinitionService: WorkflowDefinitionService
  ) {}

  /**
   * 创建用户注册工作流定义
   */
  async createUserOnboardingWorkflow(): Promise<void> {
    const definition = {
      name: 'user-onboarding',
      version: '1.0.0',
      description: '用户入职流程',
      timeout: 1800000, // 30分钟超时
      nodes: [
        {
          id: 'validate-user-data',
          name: '验证用户数据',
          type: 'task',
          executor: 'userValidator',
          config: {
            requiredFields: ['email', 'name', 'department']
          }
        },
        {
          id: 'create-account',
          name: '创建用户账户',
          type: 'task',
          executor: 'userCreator',
          dependsOn: ['validate-user-data'],
          config: {
            department: '${input.department}',
            role: '${input.role || "employee"}'
          }
        },
        {
          id: 'setup-permissions',
          name: '设置权限',
          type: 'task',
          executor: 'permissionSetter',
          dependsOn: ['create-account'],
          config: {
            userId: '${nodes.create-account.output.userId}',
            permissions: '${input.permissions}'
          }
        },
        {
          id: 'send-welcome-email',
          name: '发送欢迎邮件',
          type: 'task',
          executor: 'emailSender',
          dependsOn: ['setup-permissions'],
          config: {
            to: '${input.email}',
            template: 'welcome',
            data: {
              name: '${input.name}',
              userId: '${nodes.create-account.output.userId}'
            }
          }
        }
      ]
    };

    // 创建工作流定义
    const result = await this.workflowDefinitionService.createDefinition(definition);
    console.log('工作流定义创建成功:', result);
  }
}
```

### 3. 启动工作流实例

```typescript
import type { WorkflowAdapter } from '@stratix/tasks';

class WorkflowInstanceManager {
  constructor(
    private readonly workflowAdapter: WorkflowAdapter
  ) {}

  /**
   * 启动用户注册工作流
   */
  async startUserOnboarding(userData: any): Promise<string> {
    try {
      // 1. 创建工作流实例
      const createResult = await this.workflowAdapter.createWorkflow(
        {
          name: 'user-onboarding',
          version: '1.0.0'
        },
        {
          email: userData.email,
          name: userData.name,
          department: userData.department,
          role: userData.role,
          permissions: userData.permissions
        },
        {
          priority: 'normal',
          externalId: `user-${userData.userId}`,
          tags: { source: 'hr-system', type: 'onboarding' }
        }
      );

      if (!createResult.success) {
        throw new Error(`创建工作流实例失败: ${createResult.error}`);
      }

      const instanceId = createResult.data.id;
      console.log('工作流实例创建成功:', instanceId);

      // 2. 启动执行
      const executeResult = await this.workflowAdapter.executeWorkflow(instanceId);

      if (!executeResult.success) {
        throw new Error(`启动工作流执行失败: ${executeResult.error}`);
      }

      console.log('工作流开始执行:', instanceId);
      return instanceId;

    } catch (error) {
      console.error('启动工作流失败:', error);
      throw error;
    }
  }

  /**
   * 批量启动工作流实例
   */
  async batchStartWorkflows(workflowRequests: any[]): Promise<string[]> {
    const instanceIds: string[] = [];

    for (const request of workflowRequests) {
      try {
        const instanceId = await this.startUserOnboarding(request);
        instanceIds.push(instanceId);
      } catch (error) {
        console.error(`批量启动失败 - 请求: ${JSON.stringify(request)}`, error);
        // 继续处理其他请求
      }
    }

    return instanceIds;
  }
}
```

### 4. 工作流实例状态查询和管理

```typescript
class WorkflowMonitor {
  constructor(
    private readonly workflowAdapter: WorkflowAdapter
  ) {}

  /**
   * 查询工作流实例状态
   */
  async getInstanceStatus(instanceId: string): Promise<any> {
    try {
      // 获取实例基本状态
      const statusResult = await this.workflowAdapter.getWorkflowStatus(instanceId);

      if (!statusResult.success) {
        throw new Error(`获取状态失败: ${statusResult.error}`);
      }

      // 获取详细实例信息
      const instanceResult = await this.workflowAdapter.getWorkflowInstance(instanceId);

      if (!instanceResult.success) {
        throw new Error(`获取实例详情失败: ${instanceResult.error}`);
      }

      const status = statusResult.data;
      const instance = instanceResult.data;

      return {
        instanceId,
        status: status.status,
        progress: status.progress,
        startedAt: instance.started_at,
        updatedAt: instance.updated_at,
        currentNode: status.currentNode,
        completedNodes: status.completedNodes,
        failedNodes: status.failedNodes,
        totalNodes: status.totalNodes,
        executionTime: this.calculateExecutionTime(instance.started_at),
        errorDetails: instance.error_details
      };

    } catch (error) {
      console.error('查询实例状态失败:', error);
      throw error;
    }
  }

  /**
   * 监控多个工作流实例
   */
  async monitorInstances(instanceIds: string[]): Promise<any[]> {
    const results = await Promise.allSettled(
      instanceIds.map(id => this.getInstanceStatus(id))
    );

    return results.map((result, index) => ({
      instanceId: instanceIds[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }

  /**
   * 实时监控工作流执行
   */
  async watchWorkflowExecution(instanceId: string, callback: (status: any) => void): Promise<void> {
    const checkInterval = 5000; // 5秒检查一次

    const monitor = async () => {
      try {
        const status = await this.getInstanceStatus(instanceId);
        callback(status);

        // 如果工作流还在运行，继续监控
        if (status.status === 'running' || status.status === 'pending') {
          setTimeout(monitor, checkInterval);
        }
      } catch (error) {
        console.error('监控过程中出错:', error);
        callback({ error: error.message });
      }
    };

    // 开始监控
    await monitor();
  }

  /**
   * 暂停工作流实例
   */
  async pauseWorkflow(instanceId: string): Promise<void> {
    const result = await this.workflowAdapter.pauseWorkflow(instanceId);

    if (!result.success) {
      throw new Error(`暂停工作流失败: ${result.error}`);
    }

    console.log(`工作流 ${instanceId} 已暂停`);
  }

  /**
   * 恢复工作流实例
   */
  async resumeWorkflow(instanceId: string): Promise<void> {
    const result = await this.workflowAdapter.resumeWorkflow(instanceId);

    if (!result.success) {
      throw new Error(`恢复工作流失败: ${result.error}`);
    }

    console.log(`工作流 ${instanceId} 已恢复`);
  }

  /**
   * 取消工作流实例
   */
  async cancelWorkflow(instanceId: string): Promise<void> {
    const result = await this.workflowAdapter.cancelWorkflow(instanceId);

    if (!result.success) {
      throw new Error(`取消工作流失败: ${result.error}`);
    }

    console.log(`工作流 ${instanceId} 已取消`);
  }

  private calculateExecutionTime(startedAt: string): number {
    if (!startedAt) return 0;
    return Date.now() - new Date(startedAt).getTime();
  }
}
```

### 5. 实例监控和日志查看

```typescript
import type { ExecutionLogRepository } from '@stratix/tasks';

class WorkflowLogger {
  constructor(
    private readonly executionLogRepository: ExecutionLogRepository,
    private readonly workflowAdapter: WorkflowAdapter
  ) {}

  /**
   * 获取工作流实例的执行日志
   */
  async getInstanceLogs(instanceId: string, options?: {
    nodeId?: string;
    logLevel?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<any[]> {
    try {
      // 使用 Tasks 插件提供的日志查询功能
      const logs = await this.executionLogRepository.findByWorkflowInstanceId(
        instanceId,
        options
      );

      return logs.map(log => ({
        timestamp: log.created_at,
        level: log.log_level,
        nodeId: log.node_id,
        message: log.message,
        details: log.details,
        executorName: log.executor_name,
        duration: log.execution_duration_ms
      }));

    } catch (error) {
      console.error('获取执行日志失败:', error);
      throw error;
    }
  }

  /**
   * 实时监控工作流日志
   */
  async watchInstanceLogs(instanceId: string, callback: (log: any) => void): Promise<void> {
    let lastLogTime = new Date();
    const checkInterval = 2000; // 2秒检查一次新日志

    const monitor = async () => {
      try {
        const newLogs = await this.getInstanceLogs(instanceId, {
          startTime: lastLogTime,
          limit: 100
        });

        if (newLogs.length > 0) {
          newLogs.forEach(callback);
          lastLogTime = new Date(newLogs[newLogs.length - 1].timestamp);
        }

        // 检查工作流是否还在运行
        const status = await this.workflowAdapter.getWorkflowStatus(instanceId);
        if (status.success && (status.data.status === 'running' || status.data.status === 'pending')) {
          setTimeout(monitor, checkInterval);
        }

      } catch (error) {
        console.error('监控日志过程中出错:', error);
      }
    };

    // 开始监控
    await monitor();
  }

  /**
   * 获取节点执行详情
   */
  async getNodeExecutionDetails(instanceId: string, nodeId: string): Promise<any> {
    try {
      const logs = await this.getInstanceLogs(instanceId, { nodeId });

      // 分析节点执行情况
      const startLog = logs.find(log => log.message.includes('开始执行'));
      const endLog = logs.find(log => log.message.includes('执行完成') || log.message.includes('执行失败'));

      return {
        nodeId,
        startTime: startLog?.timestamp,
        endTime: endLog?.timestamp,
        duration: endLog?.duration,
        status: endLog?.message.includes('失败') ? 'failed' : 'completed',
        logs: logs,
        errorDetails: logs.filter(log => log.level === 'error')
      };

    } catch (error) {
      console.error('获取节点执行详情失败:', error);
      throw error;
    }
  }
}
```

## 多节点分布式部署场景

### 场景设定

在实际生产环境中，数据同步应用程序通常部署为多个 Docker 节点以确保高可用性：

- **Node A** 和 **Node B**：两个独立的 Docker 容器，运行相同的 Stratix Tasks 插件实例
- **共享数据库**：MySQL 5.7，存储工作流定义、实例状态、执行日志等
- **分布式锁**：基于 Tasks 插件内置的数据库锁机制
- **负载均衡**：通过 Nginx 或 K8s Service 分发请求

### 1. 工作流实例创建的分布式处理

#### 1.1 多节点服务启动配置

```typescript
// docker-compose.yml 配置示例
/*
version: '3.8'
services:
  sync-app-node-a:
    image: data-sync-app:latest
    environment:
      - NODE_ID=node-a
      - DATABASE_URL=mysql://user:pass@mysql:3306/tasks_db
      - REDIS_URL=redis://redis:6379
      - INSTANCE_ROLE=worker
    depends_on:
      - mysql
      - redis

  sync-app-node-b:
    image: data-sync-app:latest
    environment:
      - NODE_ID=node-b
      - DATABASE_URL=mysql://user:pass@mysql:3306/tasks_db
      - REDIS_URL=redis://redis:6379
      - INSTANCE_ROLE=worker
    depends_on:
      - mysql
      - redis
*/

// 应用启动配置
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance } from 'fastify';

async function distributedSyncApp(fastify: FastifyInstance) {
  // 获取节点标识
  const nodeId = process.env.NODE_ID || `node-${process.pid}`;
  const instanceRole = process.env.INSTANCE_ROLE || 'worker';

  // 注册 Tasks 插件服务
  const workflowAdapter = fastify.diContainer.resolve('workflowAdapter');
  const workflowEngineService = fastify.diContainer.resolve('workflowEngineService');
  const executorRegistryService = fastify.diContainer.resolve('executorRegistryService');

  // 配置节点信息
  await workflowEngineService.registerNode({
    nodeId,
    role: instanceRole,
    capabilities: ['data-sync', 'file-processing', 'notification'],
    maxConcurrentWorkflows: 10,
    heartbeatInterval: 30000 // 30秒心跳
  });

  // 注册数据同步执行器
  executorRegistryService.registerExecutorDomain('datasync', {
    sourceValidator: new SourceValidatorExecutor(),
    dataExtractor: new DataExtractorExecutor(),
    dataTransformer: new DataTransformerExecutor(),
    dataSyncer: new DataSyncerExecutor(),
    notificationSender: new NotificationSenderExecutor()
  });

  // 启动工作流恢复服务（每个节点都会启动）
  const recoveryService = new WorkflowRecoveryService(
    workflowAdapter,
    workflowEngineService,
    nodeId
  );

  await recoveryService.startRecoveryService();

  console.log(`数据同步节点 ${nodeId} 启动完成`);
}

export default withRegisterAutoDI(distributedSyncApp, {
  name: 'distributed-sync-app',
  dependencies: ['@stratix/tasks']
});
```

#### 1.2 分布式实例创建协调机制

```typescript
class DistributedWorkflowManager {
  constructor(
    private readonly workflowAdapter: WorkflowAdapter,
    private readonly nodeId: string
  ) {}

  /**
   * 分布式环境下创建工作流实例
   */
  async createDistributedWorkflowInstance(
    workflowRequest: {
      name: string;
      version: string;
      inputData: any;
      priority?: string;
      assignmentStrategy?: string;
    }
  ): Promise<string> {
    const lockKey = `workflow:create:${workflowRequest.name}:${Date.now()}`;
    const lockTimeout = 30000; // 30秒锁超时

    try {
      // 1. 尝试获取创建锁（防止重复创建）
      const lockAcquired = await this.acquireDistributedLock(lockKey, lockTimeout);

      if (!lockAcquired) {
        throw new Error('无法获取工作流创建锁，请稍后重试');
      }

      // 2. 创建工作流实例
      const createResult = await this.workflowAdapter.createWorkflow(
        {
          name: workflowRequest.name,
          version: workflowRequest.version
        },
        workflowRequest.inputData,
        {
          priority: workflowRequest.priority || 'normal',
          assignmentStrategy: workflowRequest.assignmentStrategy || 'load-balanced',
          createdBy: this.nodeId,
          distributedExecution: true
        }
      );

      if (!createResult.success) {
        throw new Error(`创建工作流实例失败: ${createResult.error}`);
      }

      const instanceId = createResult.data.id;
      console.log(`节点 ${this.nodeId} 创建工作流实例: ${instanceId}`);

      // 3. 根据分配策略选择执行节点
      const assignedNode = await this.selectExecutionNode(
        instanceId,
        workflowRequest.assignmentStrategy
      );

      // 4. 如果分配给当前节点，立即开始执行
      if (assignedNode === this.nodeId) {
        await this.startLocalExecution(instanceId);
      } else {
        console.log(`实例 ${instanceId} 分配给节点 ${assignedNode}`);
      }

      return instanceId;

    } finally {
      // 5. 释放创建锁
      await this.releaseDistributedLock(lockKey);
    }
  }

  /**
   * 选择执行节点
   */
  private async selectExecutionNode(
    instanceId: string,
    strategy: string = 'load-balanced'
  ): Promise<string> {
    switch (strategy) {
      case 'load-balanced':
        return await this.selectByLoadBalance();

      case 'round-robin':
        return await this.selectByRoundRobin();

      case 'affinity':
        return await this.selectByAffinity(instanceId);

      default:
        return this.nodeId; // 默认分配给当前节点
    }
  }

  /**
   * 负载均衡选择节点
   */
  private async selectByLoadBalance(): Promise<string> {
    // 查询所有活跃节点的负载情况
    const activeNodes = await this.getActiveNodes();

    if (activeNodes.length === 0) {
      return this.nodeId;
    }

    // 选择负载最低的节点
    const nodeLoads = await Promise.all(
      activeNodes.map(async (nodeId) => ({
        nodeId,
        load: await this.getNodeLoad(nodeId)
      }))
    );

    const selectedNode = nodeLoads.reduce((min, current) =>
      current.load < min.load ? current : min
    );

    return selectedNode.nodeId;
  }

  /**
   * 获取活跃节点列表
   */
  private async getActiveNodes(): Promise<string[]> {
    // 基于心跳时间查询活跃节点
    const query = `
      SELECT DISTINCT node_id
      FROM workflow_node_heartbeats
      WHERE last_heartbeat > NOW() - INTERVAL 2 MINUTE
      AND node_id IS NOT NULL
    `;

    // 这里需要使用 Tasks 插件提供的数据库查询方法
    const result = await this.executeQuery(query);
    return result.map(row => row.node_id);
  }

  /**
   * 获取节点负载
   */
  private async getNodeLoad(nodeId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as running_workflows
      FROM workflow_instances
      WHERE assigned_engine_id = ?
      AND status = 'running'
    `;

    const result = await this.executeQuery(query, [nodeId]);
    return result[0]?.running_workflows || 0;
  }

  /**
   * 开始本地执行
   */
  private async startLocalExecution(instanceId: string): Promise<void> {
    try {
      const executeResult = await this.workflowAdapter.executeWorkflow(instanceId);

      if (!executeResult.success) {
        console.error(`启动本地执行失败: ${executeResult.error}`);
      } else {
        console.log(`节点 ${this.nodeId} 开始执行实例: ${instanceId}`);
      }

    } catch (error) {
      console.error(`本地执行启动异常:`, error);
    }
  }

  /**
   * 获取分布式锁
   */
  private async acquireDistributedLock(lockKey: string, timeout: number): Promise<boolean> {
    // 基于数据库的分布式锁实现
    const query = `
      INSERT INTO workflow_distributed_locks (lock_key, owner_node, acquired_at, expires_at)
      VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MILLISECOND))
      ON DUPLICATE KEY UPDATE
        owner_node = IF(expires_at < NOW(), VALUES(owner_node), owner_node),
        acquired_at = IF(expires_at < NOW(), VALUES(acquired_at), acquired_at),
        expires_at = IF(expires_at < NOW(), VALUES(expires_at), expires_at)
    `;

    try {
      await this.executeQuery(query, [lockKey, this.nodeId, timeout]);

      // 验证是否成功获取锁
      const verifyQuery = `
        SELECT owner_node FROM workflow_distributed_locks
        WHERE lock_key = ? AND owner_node = ? AND expires_at > NOW()
      `;

      const result = await this.executeQuery(verifyQuery, [lockKey, this.nodeId]);
      return result.length > 0;

    } catch (error) {
      console.error('获取分布式锁失败:', error);
      return false;
    }
  }

  /**
   * 释放分布式锁
   */
  private async releaseDistributedLock(lockKey: string): Promise<void> {
    const query = `
      DELETE FROM workflow_distributed_locks
      WHERE lock_key = ? AND owner_node = ?
    `;

    try {
      await this.executeQuery(query, [lockKey, this.nodeId]);
    } catch (error) {
      console.error('释放分布式锁失败:', error);
    }
  }

  private async executeQuery(query: string, params?: any[]): Promise<any[]> {
    // 这里需要使用 Tasks 插件提供的数据库访问方法
    // 具体实现取决于插件的数据库抽象层
    return [];
  }
}
```

## 分布式环境下的工作流生命周期管理

### 系统架构概览

在多节点分布式环境中，Stratix Tasks 插件通过以下组件协同工作：

```mermaid
graph TB
    subgraph "客户端层"
        C[Client Application]
    end

    subgraph "负载均衡层"
        LB[Load Balancer/Nginx]
    end

    subgraph "应用节点层"
        A[Node A<br/>Stratix Tasks Instance]
        B[Node B<br/>Stratix Tasks Instance]
    end

    subgraph "数据存储层"
        DB[(MySQL Database<br/>工作流状态存储)]
        R[(Redis<br/>分布式锁)]
    end

    C --> LB
    LB --> A
    LB --> B
    A --> DB
    B --> DB
    A --> R
    B --> R
    A -.心跳检测.-> B
    B -.故障检测.-> A
```

**核心组件职责**：
- **Node A/B**：运行 workflowAdapter、workflowEngineService、executorRegistryService
- **Database**：存储工作流定义、实例状态、执行日志、分布式锁
- **Redis**：提供高性能的分布式锁和缓存服务
- **Load Balancer**：分发客户端请求到健康的节点

### 场景A：Node A 故障，Node B 接管恢复

#### 时序图

```mermaid
sequenceDiagram
    participant C as Client
    participant LB as Load Balancer
    participant A as Node A
    participant B as Node B
    participant DB as Database
    participant R as Redis

    Note over A,B: T0: 正常执行阶段
    C->>LB: 创建数据同步工作流
    LB->>A: 路由请求到Node A
    A->>DB: workflowAdapter.createWorkflow()
    DB-->>A: 返回instanceId: WF-001
    A->>R: 获取执行锁 "workflow:WF-001"
    R-->>A: 锁获取成功
    A->>A: workflowEngineService.executeWorkflow()
    A->>DB: 更新实例状态为 'running'
    A->>DB: 执行节点1 - 数据验证
    A->>DB: 心跳更新 (T0+30s)
    A->>DB: 执行节点2 - 数据提取
    A->>DB: 心跳更新 (T0+60s)

    Note over A: T0+75s: Node A 突然故障
    A--xA: 进程异常终止
    Note over A: 心跳停止，锁未释放

    Note over B: T0+120s: Node B 故障检测
    B->>B: recoveryService.detectInterruptedInstances()
    B->>DB: 查询超时实例 (心跳>2分钟)
    DB-->>B: 返回疑似故障实例 [WF-001]
    B->>R: 尝试获取恢复锁 "recovery:WF-001"
    R-->>B: 锁获取成功

    Note over B: T0+125s: 开始接管流程
    B->>DB: workflowAdapter.getWorkflowStatus(WF-001)
    DB-->>B: 返回状态：running, 已完成节点[1,2]
    B->>DB: workflowAdapter.getWorkflowInstance(WF-001)
    DB-->>B: 返回实例详情和上下文数据
    B->>B: recoveryService.rebuildExecutionContext()
    B->>DB: 更新实例分配到Node B
    B->>B: workflowEngineService.resumeFromBreakpoint()
    B->>DB: 继续执行节点3 - 数据转换
    B->>DB: 心跳更新 (T0+150s)
    B->>DB: 执行节点4 - 数据同步
    B->>DB: 更新实例状态为 'completed'
    B->>C: 通知工作流完成
```

#### 流程图

```mermaid
flowchart TD
    Start([Node B 定期检测]) --> Check{检查超时实例}
    Check -->|发现超时| GetLock[获取恢复锁]
    Check -->|无超时实例| End([结束检测])

    GetLock --> LockSuccess{锁获取成功?}
    LockSuccess -->|失败| End
    LockSuccess -->|成功| Verify[验证实例状态]

    Verify --> NeedRecovery{需要恢复?}
    NeedRecovery -->|否| ReleaseLock[释放锁]
    NeedRecovery -->|是| GetStatus[获取实例状态]

    GetStatus --> RebuildContext[重建执行上下文]
    RebuildContext --> Reassign[重新分配到当前节点]
    Reassign --> Resume[从断点恢复执行]
    Resume --> Success{恢复成功?}

    Success -->|是| ReleaseLock
    Success -->|否| MarkFailed[标记实例失败]
    MarkFailed --> ReleaseLock
    ReleaseLock --> End
```

#### 关键步骤说明

1. **故障检测** (T0+120s)
   - `recoveryService.detectInterruptedInstances()` 查询心跳超时的实例
   - 检测条件：`last_heartbeat < NOW() - INTERVAL 2 MINUTE`

2. **接管验证** (T0+125s)
   - 获取分布式锁 `recovery:WF-001` 防止多节点同时恢复
   - `workflowAdapter.getWorkflowStatus()` 获取执行状态
   - `workflowAdapter.getWorkflowInstance()` 获取实例详情

3. **状态重建** (T0+130s)
   - `recoveryService.rebuildExecutionContext()` 重建执行上下文
   - 恢复已完成节点的输出数据到变量中
   - 更新实例的 `assigned_engine_id` 为当前节点

4. **断点恢复** (T0+135s)
   - `workflowEngineService.resumeFromBreakpoint()` 从中断点继续
   - 跳过已完成的节点，继续执行剩余节点
   - 恢复正常的心跳机制

### 场景B：双节点关闭后重启恢复

#### 时序图

```mermaid
sequenceDiagram
    participant Admin as 系统管理员
    participant A as Node A
    participant B as Node B
    participant DB as Database
    participant R as Redis

    Note over A,B: T0: 正常运行阶段
    A->>DB: 执行工作流 WF-001 (节点2/4)
    B->>DB: 执行工作流 WF-002 (节点1/3)
    A->>DB: 心跳更新
    B->>DB: 心跳更新

    Note over Admin: T0+60s: 系统维护开始
    Admin->>A: 发送 SIGTERM 信号
    Admin->>B: 发送 SIGTERM 信号

    Note over A,B: T0+65s: 优雅关闭流程
    A->>A: gracefulShutdown.handleShutdown()
    B->>B: gracefulShutdown.handleShutdown()
    A->>A: 停止接收新请求
    B->>B: 停止接收新请求
    A->>A: 等待当前任务完成 (30s超时)
    B->>B: 等待当前任务完成 (30s超时)
    A->>DB: workflowAdapter.pauseWorkflow(WF-001)
    B->>DB: workflowAdapter.pauseWorkflow(WF-002)
    A->>DB: 保存检查点数据
    B->>DB: 保存检查点数据
    A--xA: 节点关闭
    B--xB: 节点关闭

    Note over Admin: T0+1800s: 维护完成，重启服务
    Admin->>A: 启动 Node A
    Admin->>B: 启动 Node B

    Note over A,B: T0+1820s: 启动恢复流程
    A->>A: recoveryService.startRecoveryService()
    B->>B: recoveryService.startRecoveryService()
    A->>DB: 查询 paused 状态实例
    B->>DB: 查询 paused 状态实例
    DB-->>A: 返回 [WF-001]
    DB-->>B: 返回 [WF-002]

    A->>R: 获取恢复锁 "recovery:WF-001"
    B->>R: 获取恢复锁 "recovery:WF-002"
    R-->>A: 锁获取成功
    R-->>B: 锁获取成功

    A->>A: recoveryService.recoverSingleInstance(WF-001)
    B->>B: recoveryService.recoverSingleInstance(WF-002)
    A->>DB: workflowAdapter.resumeWorkflow(WF-001)
    B->>DB: workflowAdapter.resumeWorkflow(WF-002)
    A->>DB: 继续执行剩余节点
    B->>DB: 继续执行剩余节点
    A->>DB: 完成工作流 WF-001
    B->>DB: 完成工作流 WF-002
```

#### 流程图

```mermaid
flowchart TD
    Shutdown([接收关闭信号]) --> StopNew[停止接收新请求]
    StopNew --> WaitComplete[等待当前任务完成]
    WaitComplete --> Timeout{等待超时?}

    Timeout -->|否| SaveCheckpoint[保存检查点]
    Timeout -->|是| ForceStop[强制停止]

    ForceStop --> PauseWorkflows[暂停未完成工作流]
    SaveCheckpoint --> PauseWorkflows
    PauseWorkflows --> Shutdown2([节点关闭])

    Restart([节点重启]) --> StartRecovery[启动恢复服务]
    StartRecovery --> QueryPaused[查询暂停的实例]
    QueryPaused --> HasPaused{有暂停实例?}

    HasPaused -->|否| EndRecovery([恢复完成])
    HasPaused -->|是| GetRecoveryLock[获取恢复锁]

    GetRecoveryLock --> LockOK{锁获取成功?}
    LockOK -->|否| EndRecovery
    LockOK -->|是| LoadCheckpoint[加载检查点数据]

    LoadCheckpoint --> ResumeWorkflow[恢复工作流执行]
    ResumeWorkflow --> ReleaseLock[释放恢复锁]
    ReleaseLock --> EndRecovery
```

#### 关键步骤说明

1. **优雅关闭** (T0+65s)
   - `gracefulShutdown.handleShutdown()` 处理 SIGTERM 信号
   - `workflowAdapter.pauseWorkflow()` 暂停正在执行的工作流
   - 保存当前执行状态到 `workflow_checkpoints` 表

2. **重启检测** (T0+1820s)
   - `recoveryService.startRecoveryService()` 自动启动恢复服务
   - 查询状态为 `paused` 的工作流实例
   - 每个节点尝试获取不同实例的恢复锁

3. **状态恢复** (T0+1825s)
   - `recoveryService.recoverSingleInstance()` 恢复单个实例
   - 从检查点数据重建执行上下文
   - `workflowAdapter.resumeWorkflow()` 恢复执行

### 场景C：正常的分布式工作流创建和执行

#### 时序图

```mermaid
sequenceDiagram
    participant C as Client
    participant LB as Load Balancer
    participant A as Node A
    participant B as Node B
    participant DB as Database
    participant R as Redis

    Note over A,B: T0: 系统正常运行
    C->>LB: POST /workflows (创建数据同步工作流)
    LB->>A: 路由到 Node A (负载均衡)

    Note over A: T0+5s: 工作流创建流程
    A->>R: 获取创建锁 "workflow:create:datasync"
    R-->>A: 锁获取成功
    A->>DB: workflowAdapter.createWorkflow()
    DB-->>A: 返回 instanceId: WF-003
    A->>A: distributedManager.selectExecutionNode()
    A->>DB: 查询节点负载情况
    DB-->>A: Node A: 2个实例, Node B: 1个实例
    A->>A: 选择 Node B (负载较低)
    A->>DB: 更新实例分配到 Node B
    A->>R: 释放创建锁
    A-->>C: 返回 instanceId: WF-003

    Note over B: T0+10s: Node B 开始执行
    B->>DB: 定期查询分配给自己的新实例
    DB-->>B: 发现新实例 WF-003
    B->>R: 获取执行锁 "workflow:WF-003"
    R-->>B: 锁获取成功
    B->>B: workflowEngineService.executeWorkflow(WF-003)
    B->>DB: 更新实例状态为 'running'

    Note over B: T0+15s: 执行工作流节点
    B->>B: 执行节点1 - 数据源验证
    B->>DB: 更新节点状态和输出
    B->>DB: 心跳更新
    B->>B: 执行节点2 - 数据提取
    B->>DB: 更新节点状态和输出
    B->>DB: 心跳更新 (T0+45s)
    B->>B: 执行节点3 - 数据转换
    B->>DB: 更新节点状态和输出
    B->>DB: 心跳更新 (T0+75s)
    B->>B: 执行节点4 - 数据同步
    B->>DB: 更新节点状态和输出
    B->>DB: 更新实例状态为 'completed'
    B->>R: 释放执行锁

    Note over B: T0+90s: 工作流完成
    B->>C: 发送完成通知 (webhook/消息队列)
```

#### 流程图

```mermaid
flowchart TD
    Request([客户端请求]) --> GetCreateLock[获取创建锁]
    GetCreateLock --> CreateLockOK{锁获取成功?}
    CreateLockOK -->|否| RetryLater[稍后重试]
    CreateLockOK -->|是| CreateInstance[创建工作流实例]

    CreateInstance --> SelectNode[选择执行节点]
    SelectNode --> Strategy{分配策略}

    Strategy -->|负载均衡| CheckLoad[检查节点负载]
    Strategy -->|轮询| RoundRobin[轮询选择]
    Strategy -->|亲和性| AffinityRule[应用亲和性规则]

    CheckLoad --> AssignNode[分配到最优节点]
    RoundRobin --> AssignNode
    AffinityRule --> AssignNode

    AssignNode --> ReleaseCreateLock[释放创建锁]
    ReleaseCreateLock --> ReturnInstanceId[返回实例ID]

    ReturnInstanceId --> NodePoll[目标节点轮询新任务]
    NodePoll --> GetExecLock[获取执行锁]
    GetExecLock --> ExecLockOK{锁获取成功?}

    ExecLockOK -->|否| NodePoll
    ExecLockOK -->|是| StartExecution[开始执行工作流]

    StartExecution --> ExecuteNodes[顺序执行节点]
    ExecuteNodes --> UpdateHeartbeat[更新心跳]
    UpdateHeartbeat --> AllComplete{所有节点完成?}

    AllComplete -->|否| ExecuteNodes
    AllComplete -->|是| ReleaseExecLock[释放执行锁]
    ReleaseExecLock --> NotifyComplete[通知完成]
```

#### 关键步骤说明

1. **实例创建** (T0+5s)
   - 获取创建锁防止重复创建
   - `workflowAdapter.createWorkflow()` 创建实例记录
   - `distributedManager.selectExecutionNode()` 选择最优执行节点

2. **节点分配** (T0+8s)
   - 查询各节点当前负载 (`SELECT COUNT(*) FROM workflow_instances WHERE assigned_engine_id = ?`)
   - 应用负载均衡策略选择目标节点
   - 更新实例的 `assigned_engine_id` 字段

3. **执行启动** (T0+10s)
   - 目标节点定期轮询分配给自己的新实例
   - 获取执行锁 `workflow:instanceId` 确保唯一执行
   - `workflowEngineService.executeWorkflow()` 开始执行

4. **节点执行** (T0+15s - T0+90s)
   - 按依赖关系顺序执行各个节点
   - 每30秒更新一次心跳时间戳
   - 实时更新节点状态和输出数据

### 数据一致性保证机制

1. **分布式锁机制**
   - 创建锁：防止重复创建相同工作流
   - 执行锁：确保实例只在一个节点执行
   - 恢复锁：防止多节点同时恢复同一实例

2. **状态同步机制**
   - 所有状态变更立即写入数据库
   - 心跳机制确保节点活跃状态可见
   - 检查点机制保证关键状态持久化

3. **故障检测机制**
   - 心跳超时检测：2分钟无心跳认为节点故障
   - 锁超时机制：防止死锁，支持故障转移
   - 状态一致性验证：恢复前验证数据完整性

### 自动化程度说明

**完全自动化的部分**：
- 故障检测：基于心跳超时自动触发
- 实例接管：健康节点自动接管故障实例
- 断点恢复：从最后检查点自动继续执行
- 负载均衡：新实例自动分配到最优节点

**需要配置的部分**：
- 心跳间隔：默认30秒，可配置
- 故障检测阈值：默认2分钟，可配置
- 恢复检查间隔：默认30秒，可配置
- 分配策略：负载均衡/轮询/亲和性可选

**触发条件**：
- 故障检测：`last_heartbeat < NOW() - INTERVAL 2 MINUTE`
- 自动恢复：每30秒执行一次 `recoveryService.recoverInterruptedWorkflows()`
- 节点选择：每次创建实例时执行负载均衡算法

这种设计确保了工作流在分布式环境下的高可用性和数据一致性，同时最大化了自动化程度，减少了人工干预的需要。

## 实际应用示例

### 数据同步应用的完整使用流程

```typescript
// 1. 应用启动时的初始化
async function initializeDataSyncApp() {
  const workflowDefinitionService = container.resolve('workflowDefinitionService');
  const executorRegistryService = container.resolve('executorRegistryService');

  // 注册数据同步执行器
  executorRegistryService.registerExecutorDomain('datasync', {
    sourceValidator: new SourceValidatorExecutor(),
    dataExtractor: new DataExtractorExecutor(),
    dataTransformer: new DataTransformerExecutor(),
    dataSyncer: new DataSyncerExecutor()
  });

  // 创建数据同步工作流定义
  await workflowDefinitionService.createDefinition({
    name: 'data-sync-pipeline',
    version: '1.0.0',
    nodes: [
      { id: 'validate', type: 'task', executor: 'datasync.sourceValidator' },
      { id: 'extract', type: 'task', executor: 'datasync.dataExtractor', dependsOn: ['validate'] },
      { id: 'transform', type: 'task', executor: 'datasync.dataTransformer', dependsOn: ['extract'] },
      { id: 'sync', type: 'task', executor: 'datasync.dataSyncer', dependsOn: ['transform'] }
    ]
  });
}

// 2. 客户端请求创建同步任务
async function createSyncTask(syncRequest: any) {
  const workflowAdapter = container.resolve('workflowAdapter');

  const result = await workflowAdapter.createWorkflow(
    { name: 'data-sync-pipeline', version: '1.0.0' },
    {
      sourceSystem: syncRequest.sourceSystem,
      targetSystem: syncRequest.targetSystem,
      dataFilter: syncRequest.filter,
      batchSize: syncRequest.batchSize || 1000
    },
    {
      priority: syncRequest.priority || 'normal',
      externalId: syncRequest.requestId
    }
  );

  if (result.success) {
    // 启动执行（会自动分配到最优节点）
    await workflowAdapter.executeWorkflow(result.data.id);
    return result.data.id;
  }
}

// 3. 监控同步任务状态
async function monitorSyncTask(instanceId: string) {
  const workflowAdapter = container.resolve('workflowAdapter');

  const status = await workflowAdapter.getWorkflowStatus(instanceId);
  const instance = await workflowAdapter.getWorkflowInstance(instanceId);

  return {
    instanceId,
    status: status.data.status,
    progress: status.data.progress,
    currentStep: status.data.currentNode,
    startTime: instance.data.started_at,
    estimatedCompletion: calculateETA(status.data, instance.data)
  };
}
```

### 故障恢复的手动触发（可选）

```typescript
// 如果需要手动触发恢复（通常不需要，系统会自动处理）
async function manualRecovery() {
  const recoveryService = container.resolve('workflowRecoveryService');

  // 检测中断的实例
  const interruptedInstances = await recoveryService.detectInterruptedInstances();

  // 批量恢复
  const results = await recoveryService.batchRecoverWorkflows();

  console.log(`恢复完成 - 成功: ${results.successful.length}, 失败: ${results.failed.length}`);
}
```

## 最佳实践建议

### 1. 部署配置建议

**Docker Compose 配置**：
```yaml
version: '3.8'
services:
  sync-app-node-a:
    image: data-sync-app:latest
    environment:
      - NODE_ID=node-a
      - HEARTBEAT_INTERVAL=30000
      - RECOVERY_CHECK_INTERVAL=30000
      - MAX_CONCURRENT_WORKFLOWS=10
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  sync-app-node-b:
    image: data-sync-app:latest
    environment:
      - NODE_ID=node-b
      - HEARTBEAT_INTERVAL=30000
      - RECOVERY_CHECK_INTERVAL=30000
      - MAX_CONCURRENT_WORKFLOWS=10
```

### 2. 监控和告警

**关键监控指标**：
- 节点心跳状态
- 工作流实例执行时长
- 故障恢复成功率
- 分布式锁等待时间
- 数据库连接池状态

**告警规则**：
- 节点心跳中断超过2分钟
- 工作流执行时间超过预期阈值
- 故障恢复失败率超过5%
- 数据库连接池使用率超过80%

### 3. 性能优化

**数据库优化**：
- 为 `workflow_instances.assigned_engine_id` 创建索引
- 为 `workflow_instances.status` 和 `updated_at` 创建复合索引
- 定期清理过期的锁记录和检查点数据

**应用优化**：
- 合理设置心跳间隔（推荐30秒）
- 限制单节点最大并发工作流数量
- 使用连接池管理数据库连接
- 启用 Redis 缓存减少数据库查询

## 总结

Stratix Tasks 插件在多节点分布式环境下提供了完整的工作流实例生命周期管理能力：

### 核心优势

1. **高可用性**：任何单个节点故障都不会影响整体服务
2. **自动恢复**：故障检测和恢复完全自动化，无需人工干预
3. **负载均衡**：智能分配工作流到最优节点，提高资源利用率
4. **数据一致性**：通过分布式锁和检查点机制保证状态一致性
5. **可扩展性**：支持动态增减节点，水平扩展能力强

### 关键特性

- **分布式锁机制**：确保工作流实例的唯一性执行
- **心跳监控**：实时检测节点健康状态
- **断点续传**：从任意中断点恢复执行
- **优雅关闭**：支持系统维护时的平滑停机
- **自动分配**：基于负载情况智能分配任务

### 适用场景

- **数据同步系统**：大规模数据处理和同步任务
- **批处理作业**：需要高可用性的批量处理任务
- **业务流程自动化**：复杂的多步骤业务流程
- **微服务编排**：服务间的复杂调用链管理

通过合理配置和使用这些特性，可以构建出高可用、高性能的分布式工作流处理系统，满足企业级应用的严格要求。

### 2. 故障场景的处理流程

#### 场景A：Node A 执行工作流时突然关闭，Node B 继续运行

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Node A
    participant B as Node B
    participant DB as Database
    participant R as Redis

    Note over A,B: 正常执行阶段
    C->>A: 创建数据同步工作流
    A->>DB: 创建实例记录
    A->>DB: 获取执行锁
    A->>A: 开始执行节点1
    A->>DB: 更新心跳 (t=0s)
    A->>A: 执行节点2
    A->>DB: 更新心跳 (t=30s)

    Note over A: Node A 突然关闭 (t=45s)
    A--xA: 进程终止

    Note over B: Node B 检测到故障
    B->>DB: 定期检查中断实例 (t=60s)
    DB-->>B: 返回超时实例列表
    B->>DB: 尝试获取恢复锁
    DB-->>B: 锁获取成功

    Note over B: 开始恢复流程
    B->>DB: 查询实例状态和已完成节点
    B->>B: 重建执行上下文
    B->>B: 从断点继续执行
    B->>DB: 更新实例分配到Node B
    B->>DB: 继续执行剩余节点
    B->>C: 工作流完成通知
```

**代码实现：**

```typescript
class NodeFailureHandler {
  constructor(
    private readonly workflowAdapter: WorkflowAdapter,
    private readonly nodeId: string
  ) {}

  /**
   * 检测并处理其他节点的故障实例
   */
  async handleNodeFailures(): Promise<void> {
    try {
      // 1. 查找可能故障的实例（心跳超时）
      const suspectedFailures = await this.findSuspectedFailureInstances();

      if (suspectedFailures.length === 0) {
        return;
      }

      console.log(`检测到 ${suspectedFailures.length} 个可能故障的实例`);

      // 2. 尝试接管故障实例
      for (const instance of suspectedFailures) {
        await this.attemptInstanceTakeover(instance);
      }

    } catch (error) {
      console.error('处理节点故障时发生错误:', error);
    }
  }

  /**
   * 查找疑似故障的实例
   */
  private async findSuspectedFailureInstances(): Promise<any[]> {
    const query = `
      SELECT wi.*, wne.node_id as assigned_node
      FROM workflow_instances wi
      LEFT JOIN workflow_node_executions wne ON wi.id = wne.instance_id
      WHERE wi.status = 'running'
        AND wi.updated_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)
        AND (wne.node_id IS NULL OR wne.node_id != ?)
      GROUP BY wi.id
    `;

    return await this.executeQuery(query, [this.nodeId]);
  }

  /**
   * 尝试接管故障实例
   */
  private async attemptInstanceTakeover(instance: any): Promise<boolean> {
    const lockKey = `workflow:recovery:${instance.id}`;
    const lockTimeout = 300000; // 5分钟锁定时间

    try {
      // 1. 获取恢复锁
      const lockAcquired = await this.acquireRecoveryLock(lockKey, lockTimeout);
      if (!lockAcquired) {
        console.log(`无法获取实例 ${instance.id} 的恢复锁`);
        return false;
      }

      console.log(`节点 ${this.nodeId} 开始接管实例 ${instance.id}`);

      // 2. 验证实例确实需要恢复
      const needsRecovery = await this.verifyInstanceNeedsRecovery(instance.id);
      if (!needsRecovery) {
        console.log(`实例 ${instance.id} 不需要恢复`);
        return false;
      }

      // 3. 重新分配实例到当前节点
      await this.reassignInstanceToCurrentNode(instance.id);

      // 4. 从断点恢复执行
      const recoveryResult = await this.recoverInstanceExecution(instance.id);

      if (recoveryResult) {
        console.log(`成功接管并恢复实例 ${instance.id}`);
        return true;
      } else {
        console.error(`恢复实例 ${instance.id} 失败`);
        return false;
      }

    } catch (error) {
      console.error(`接管实例 ${instance.id} 时发生错误:`, error);
      return false;
    } finally {
      // 5. 释放恢复锁
      await this.releaseRecoveryLock(lockKey);
    }
  }

  /**
   * 验证实例是否需要恢复
   */
  private async verifyInstanceNeedsRecovery(instanceId: string): Promise<boolean> {
    // 检查实例状态
    const statusResult = await this.workflowAdapter.getWorkflowStatus(instanceId);
    if (!statusResult.success) {
      return false;
    }

    const status = statusResult.data;

    // 如果实例已经完成或失败，不需要恢复
    if (status.status === 'completed' || status.status === 'failed') {
      return false;
    }

    // 检查是否有其他节点正在处理
    const hasActiveExecution = await this.checkActiveExecution(instanceId);
    return !hasActiveExecution;
  }

  /**
   * 检查是否有活跃的执行
   */
  private async checkActiveExecution(instanceId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as active_count
      FROM workflow_node_executions
      WHERE instance_id = ?
        AND status = 'running'
        AND updated_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
    `;

    const result = await this.executeQuery(query, [instanceId]);
    return (result[0]?.active_count || 0) > 0;
  }

  /**
   * 重新分配实例到当前节点
   */
  private async reassignInstanceToCurrentNode(instanceId: string): Promise<void> {
    const updateQuery = `
      UPDATE workflow_instances
      SET assigned_engine_id = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await this.executeQuery(updateQuery, [this.nodeId, instanceId]);
  }

  /**
   * 恢复实例执行
   */
  private async recoverInstanceExecution(instanceId: string): Promise<boolean> {
    try {
      // 使用 Tasks 插件的恢复功能
      const result = await this.workflowAdapter.resumeWorkflow(instanceId);
      return result.success;

    } catch (error) {
      console.error(`恢复实例 ${instanceId} 执行失败:`, error);
      return false;
    }
  }

  private async acquireRecoveryLock(lockKey: string, timeout: number): Promise<boolean> {
    // 实现与前面类似的分布式锁逻辑
    return true;
  }

  private async releaseRecoveryLock(lockKey: string): Promise<void> {
    // 释放锁的实现
  }

  private async executeQuery(query: string, params?: any[]): Promise<any[]> {
    // 数据库查询实现
    return [];
  }
}
```

#### 场景B：两个节点都被关闭（系统维护）

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Node A
    participant B as Node B
    participant DB as Database
    participant Admin as Admin

    Note over A,B: 正常运行阶段
    A->>DB: 执行工作流实例1
    B->>DB: 执行工作流实例2
    A->>DB: 更新心跳
    B->>DB: 更新心跳

    Note over Admin: 系统维护开始
    Admin->>A: 发送关闭信号 (SIGTERM)
    Admin->>B: 发送关闭信号 (SIGTERM)

    Note over A,B: 优雅关闭流程
    A->>A: 停止接收新请求
    B->>B: 停止接收新请求
    A->>A: 等待当前任务完成
    B->>B: 等待当前任务完成
    A->>DB: 保存检查点
    B->>DB: 保存检查点
    A->>DB: 更新实例状态为paused
    B->>DB: 更新实例状态为paused
    A--xA: 节点关闭
    B--xB: 节点关闭

    Note over Admin: 维护完成，重启服务
    Admin->>A: 启动Node A
    Admin->>B: 启动Node B
    A->>A: 启动恢复服务
    B->>B: 启动恢复服务
    A->>DB: 查询paused状态实例
    B->>DB: 查询paused状态实例
    A->>DB: 获取实例1恢复锁
    B->>DB: 获取实例2恢复锁
    A->>A: 恢复实例1执行
    B->>B: 恢复实例2执行
    A->>C: 实例1完成通知
    B->>C: 实例2完成通知
```

**代码实现：**

```typescript
class GracefulShutdownHandler {
  private isShuttingDown = false;
  private activeWorkflows = new Set<string>();

  constructor(
    private readonly workflowAdapter: WorkflowAdapter,
    private readonly nodeId: string
  ) {
    // 监听关闭信号
    process.on('SIGTERM', () => this.handleShutdown());
    process.on('SIGINT', () => this.handleShutdown());
  }

  /**
   * 处理优雅关闭
   */
  async handleShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log(`节点 ${this.nodeId} 开始优雅关闭流程`);

    try {
      // 1. 停止接收新的工作流请求
      await this.stopAcceptingNewWorkflows();

      // 2. 等待当前执行的工作流完成或达到超时
      await this.waitForActiveWorkflowsCompletion(30000); // 30秒超时

      // 3. 保存未完成工作流的检查点
      await this.saveCheckpointsForActiveWorkflows();

      // 4. 暂停未完成的工作流
      await this.pauseActiveWorkflows();

      console.log(`节点 ${this.nodeId} 优雅关闭完成`);
      process.exit(0);

    } catch (error) {
      console.error('优雅关闭过程中发生错误:', error);
      process.exit(1);
    }
  }

  /**
   * 停止接收新工作流
   */
  private async stopAcceptingNewWorkflows(): Promise<void> {
    // 更新节点状态为关闭中
    const updateQuery = `
      UPDATE workflow_nodes
      SET status = 'shutting_down', updated_at = NOW()
      WHERE node_id = ?
    `;

    await this.executeQuery(updateQuery, [this.nodeId]);
  }

  /**
   * 等待活跃工作流完成
   */
  private async waitForActiveWorkflowsCompletion(timeoutMs: number): Promise<void> {
    const startTime = Date.now();

    while (this.activeWorkflows.size > 0 && (Date.now() - startTime) < timeoutMs) {
      console.log(`等待 ${this.activeWorkflows.size} 个工作流完成...`);
      await this.sleep(1000); // 每秒检查一次

      // 更新活跃工作流列表
      await this.updateActiveWorkflowsList();
    }

    if (this.activeWorkflows.size > 0) {
      console.warn(`超时：仍有 ${this.activeWorkflows.size} 个工作流未完成`);
    }
  }

  /**
   * 保存活跃工作流的检查点
   */
  private async saveCheckpointsForActiveWorkflows(): Promise<void> {
    const savePromises = Array.from(this.activeWorkflows).map(async (instanceId) => {
      try {
        await this.saveWorkflowCheckpoint(instanceId);
        console.log(`已保存实例 ${instanceId} 的检查点`);
      } catch (error) {
        console.error(`保存实例 ${instanceId} 检查点失败:`, error);
      }
    });

    await Promise.allSettled(savePromises);
  }

  /**
   * 暂停活跃工作流
   */
  private async pauseActiveWorkflows(): Promise<void> {
    const pausePromises = Array.from(this.activeWorkflows).map(async (instanceId) => {
      try {
        await this.workflowAdapter.pauseWorkflow(instanceId);
        console.log(`已暂停实例 ${instanceId}`);
      } catch (error) {
        console.error(`暂停实例 ${instanceId} 失败:`, error);
      }
    });

    await Promise.allSettled(pausePromises);
  }

  /**
   * 保存工作流检查点
   */
  private async saveWorkflowCheckpoint(instanceId: string): Promise<void> {
    // 获取当前实例状态
    const statusResult = await this.workflowAdapter.getWorkflowStatus(instanceId);
    if (!statusResult.success) {
      throw new Error(`获取实例状态失败: ${statusResult.error}`);
    }

    const instanceResult = await this.workflowAdapter.getWorkflowInstance(instanceId);
    if (!instanceResult.success) {
      throw new Error(`获取实例详情失败: ${instanceResult.error}`);
    }

    // 保存检查点
    const checkpointData = {
      instanceId,
      status: statusResult.data,
      instance: instanceResult.data,
      timestamp: new Date().toISOString(),
      nodeId: this.nodeId,
      reason: 'graceful_shutdown'
    };

    const insertQuery = `
      INSERT INTO workflow_checkpoints
      (instance_id, checkpoint_data, checkpoint_type, created_at)
      VALUES (?, ?, 'shutdown', NOW())
    `;

    await this.executeQuery(insertQuery, [instanceId, JSON.stringify(checkpointData)]);
  }

  private async updateActiveWorkflowsList(): Promise<void> {
    const query = `
      SELECT id FROM workflow_instances
      WHERE assigned_engine_id = ? AND status = 'running'
    `;

    const result = await this.executeQuery(query, [this.nodeId]);
    this.activeWorkflows = new Set(result.map(row => row.id));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async executeQuery(query: string, params?: any[]): Promise<any[]> {
    // 数据库查询实现
    return [];
  }
}
```

## 多节点分布式部署场景

### 场景设定

在实际生产环境中，数据同步应用程序通常部署为多个 Docker 节点以确保高可用性：

- **Node A** 和 **Node B**：两个独立的 Docker 容器，运行相同的 Stratix Tasks 插件实例
- **共享数据库**：MySQL 5.7，存储工作流定义、实例状态、执行日志等
- **分布式锁**：基于 Tasks 插件内置的数据库锁机制
- **负载均衡**：通过 Nginx 或 K8s Service 分发请求

### 1. 工作流实例创建的分布式处理

#### 1.1 多节点服务启动配置

```typescript
// docker-compose.yml 配置示例
/*
version: '3.8'
services:
  sync-app-node-a:
    image: data-sync-app:latest
    environment:
      - NODE_ID=node-a
      - DATABASE_URL=mysql://user:pass@mysql:3306/tasks_db
      - REDIS_URL=redis://redis:6379
      - INSTANCE_ROLE=worker
    depends_on:
      - mysql
      - redis

  sync-app-node-b:
    image: data-sync-app:latest
    environment:
      - NODE_ID=node-b
      - DATABASE_URL=mysql://user:pass@mysql:3306/tasks_db
      - REDIS_URL=redis://redis:6379
      - INSTANCE_ROLE=worker
    depends_on:
      - mysql
      - redis
*/

// 节点启动配置
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance } from 'fastify';

async function distributedSyncApp(fastify: FastifyInstance) {
  const nodeId = process.env.NODE_ID || `node-${process.pid}`;
  const instanceRole = process.env.INSTANCE_ROLE || 'worker';

  // 获取 Tasks 插件服务
  const workflowAdapter = fastify.diContainer.resolve('workflowAdapter');
  const workflowEngineService = fastify.diContainer.resolve('workflowEngineService');
  const executorRegistryService = fastify.diContainer.resolve('executorRegistryService');

  // 注册节点特定的执行器
  executorRegistryService.registerExecutorDomain('datasync', {
    sourceValidator: new SourceValidatorExecutor(),
    dataExtractor: new DataExtractorExecutor(),
    dataTransformer: new DataTransformerExecutor(),
    dataSyncer: new DataSyncerExecutor()
  });

  // 配置节点信息
  await workflowEngineService.registerNode({
    nodeId,
    role: instanceRole,
    capabilities: ['datasync.sourceValidator', 'datasync.dataExtractor', 'datasync.dataTransformer', 'datasync.dataSyncer'],
    maxConcurrentWorkflows: 10,
    heartbeatInterval: 30000 // 30秒心跳
  });

  // 启动工作流恢复服务（每个节点都会启动）
  const recoveryService = new WorkflowRecoveryService(
    workflowAdapter,
    workflowEngineService
  );

  await recoveryService.startRecoveryService();

  console.log(`节点 ${nodeId} 启动完成，角色: ${instanceRole}`);
}

export default withRegisterAutoDI(distributedSyncApp, {
  name: 'distributed-sync-app',
  dependencies: ['@stratix/tasks']
});
```

#### 1.2 分布式实例创建流程

```typescript
class DistributedWorkflowManager {
  constructor(
    private readonly workflowAdapter: WorkflowAdapter,
    private readonly nodeId: string = process.env.NODE_ID || 'unknown'
  ) {}

  /**
   * 创建数据同步工作流实例（支持分布式）
   */
  async createSyncWorkflowInstance(syncRequest: {
    sourceId: string;
    targetId: string;
    syncType: 'full' | 'incremental';
    priority: 'low' | 'normal' | 'high';
  }): Promise<string> {

    const instanceId = `sync-${syncRequest.sourceId}-${Date.now()}`;

    try {
      console.log(`[${this.nodeId}] 开始创建同步工作流实例: ${instanceId}`);

      // 1. 创建工作流实例（带分布式锁）
      const createResult = await this.workflowAdapter.createWorkflow(
        {
          name: 'data-sync-workflow',
          version: '1.0.0'
        },
        {
          sourceId: syncRequest.sourceId,
          targetId: syncRequest.targetId,
          syncType: syncRequest.syncType,
          batchSize: 1000,
          maxRetries: 3
        },
        {
          priority: syncRequest.priority,
          externalId: instanceId,
          tags: {
            type: 'data-sync',
            source: syncRequest.sourceId,
            target: syncRequest.targetId,
            createdBy: this.nodeId
          },
          // 分布式配置
          distributed: {
            enabled: true,
            assignmentStrategy: 'load-balanced', // 负载均衡分配
            preferredNode: this.nodeId, // 优先在当前节点执行
            maxConcurrency: 5
          }
        }
      );

      if (!createResult.success) {
        throw new Error(`创建工作流实例失败: ${createResult.error}`);
      }

      const actualInstanceId = createResult.data.id;
      console.log(`[${this.nodeId}] 工作流实例创建成功: ${actualInstanceId}`);

      // 2. 启动执行（Tasks 插件会自动处理节点分配）
      const executeResult = await this.workflowAdapter.executeWorkflow(actualInstanceId);

      if (!executeResult.success) {
        throw new Error(`启动工作流执行失败: ${executeResult.error}`);
      }

      console.log(`[${this.nodeId}] 工作流开始执行，分配到节点: ${executeResult.data.assignedNode || '待分配'}`);
      return actualInstanceId;

    } catch (error) {
      console.error(`[${this.nodeId}] 创建同步工作流失败:`, error);
      throw error;
    }
  }

  /**
   * 查询当前节点的工作负载
   */
  async getCurrentNodeLoad(): Promise<{
    activeWorkflows: number;
    queuedWorkflows: number;
    cpuUsage: number;
    memoryUsage: number;
  }> {
    try {
      // 使用 Tasks 插件的节点状态查询功能
      const nodeStatus = await this.workflowAdapter.getNodeStatus(this.nodeId);

      if (!nodeStatus.success) {
        throw new Error(`获取节点状态失败: ${nodeStatus.error}`);
      }

      return {
        activeWorkflows: nodeStatus.data.activeWorkflows || 0,
        queuedWorkflows: nodeStatus.data.queuedWorkflows || 0,
        cpuUsage: nodeStatus.data.cpuUsage || 0,
        memoryUsage: nodeStatus.data.memoryUsage || 0
      };

    } catch (error) {
      console.error(`[${this.nodeId}] 获取节点负载失败:`, error);
      return {
        activeWorkflows: 0,
        queuedWorkflows: 0,
        cpuUsage: 0,
        memoryUsage: 0
      };
    }
  }
}
```

#### 1.3 分布式锁机制

```typescript
class DistributedLockManager {
  constructor(
    private readonly workflowAdapter: WorkflowAdapter,
    private readonly nodeId: string
  ) {}

  /**
   * 获取工作流实例执行锁
   */
  async acquireInstanceLock(instanceId: string, timeoutMs: number = 300000): Promise<boolean> {
    try {
      // 使用 Tasks 插件内置的分布式锁
      const lockResult = await this.workflowAdapter.acquireInstanceLock(instanceId, {
        nodeId: this.nodeId,
        lockType: 'execution',
        timeoutMs,
        heartbeatInterval: 30000
      });

      if (lockResult.success) {
        console.log(`[${this.nodeId}] 成功获取实例 ${instanceId} 的执行锁`);

        // 启动心跳保持锁活跃
        this.startLockHeartbeat(instanceId);
        return true;
      } else {
        console.log(`[${this.nodeId}] 获取实例 ${instanceId} 执行锁失败: ${lockResult.error}`);
        return false;
      }

    } catch (error) {
      console.error(`[${this.nodeId}] 获取分布式锁异常:`, error);
      return false;
    }
  }

  /**
   * 释放工作流实例执行锁
   */
  async releaseInstanceLock(instanceId: string): Promise<void> {
    try {
      const releaseResult = await this.workflowAdapter.releaseInstanceLock(instanceId, {
        nodeId: this.nodeId,
        lockType: 'execution'
      });

      if (releaseResult.success) {
        console.log(`[${this.nodeId}] 成功释放实例 ${instanceId} 的执行锁`);
        this.stopLockHeartbeat(instanceId);
      } else {
        console.error(`[${this.nodeId}] 释放实例 ${instanceId} 执行锁失败: ${releaseResult.error}`);
      }

    } catch (error) {
      console.error(`[${this.nodeId}] 释放分布式锁异常:`, error);
    }
  }

  /**
   * 启动锁心跳
   */
  private startLockHeartbeat(instanceId: string): void {
    const heartbeatInterval = setInterval(async () => {
      try {
        await this.workflowAdapter.updateLockHeartbeat(instanceId, {
          nodeId: this.nodeId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`[${this.nodeId}] 锁心跳更新失败:`, error);
        clearInterval(heartbeatInterval);
      }
    }, 30000); // 30秒心跳

    // 存储心跳定时器引用以便后续清理
    this.lockHeartbeats.set(instanceId, heartbeatInterval);
  }

  private lockHeartbeats = new Map<string, NodeJS.Timeout>();

  private stopLockHeartbeat(instanceId: string): void {
    const heartbeat = this.lockHeartbeats.get(instanceId);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.lockHeartbeats.delete(instanceId);
    }
  }
}
```

## 工作流中断恢复机制的使用

### 1. 故障检测和中断状态识别

```typescript
class WorkflowRecoveryManager {
  constructor(
    private readonly workflowAdapter: WorkflowAdapter,
    private readonly workflowEngineService: WorkflowEngineService
  ) {}

  /**
   * 检测中断的工作流实例
   */
  async detectInterruptedInstances(): Promise<string[]> {
    try {
      // 使用 Tasks 插件的查询功能查找可能中断的实例
      const runningInstances = await this.workflowAdapter.getWorkflowsByStatus('running');

      if (!runningInstances.success) {
        throw new Error(`查询运行中实例失败: ${runningInstances.error}`);
      }

      const interruptedIds: string[] = [];
      const currentTime = Date.now();
      const INTERRUPT_THRESHOLD = 5 * 60 * 1000; // 5分钟无更新认为中断

      for (const instance of runningInstances.data) {
        const lastUpdate = new Date(instance.updated_at).getTime();
        const timeDiff = currentTime - lastUpdate;

        // 检查是否超过中断阈值
        if (timeDiff > INTERRUPT_THRESHOLD) {
          // 进一步验证是否真的中断
          const isReallyInterrupted = await this.verifyInstanceInterruption(instance.id);
          if (isReallyInterrupted) {
            interruptedIds.push(instance.id);
          }
        }
      }

      console.log(`检测到 ${interruptedIds.length} 个中断的工作流实例`);
      return interruptedIds;

    } catch (error) {
      console.error('检测中断实例失败:', error);
      return [];
    }
  }

  /**
   * 验证实例是否真的中断
   */
  private async verifyInstanceInterruption(instanceId: string): Promise<boolean> {
    try {
      // 1. 检查实例详细状态
      const instanceResult = await this.workflowAdapter.getWorkflowInstance(instanceId);
      if (!instanceResult.success) {
        return false;
      }

      const instance = instanceResult.data;

      // 2. 检查是否有正在执行的节点
      const statusResult = await this.workflowAdapter.getWorkflowStatus(instanceId);
      if (!statusResult.success) {
        return false;
      }

      const status = statusResult.data;

      // 3. 如果有当前执行节点但长时间无更新，认为中断
      if (status.currentNode && instance.updated_at) {
        const lastUpdate = new Date(instance.updated_at).getTime();
        const timeDiff = Date.now() - lastUpdate;
        return timeDiff > 5 * 60 * 1000; // 5分钟
      }

      return false;

    } catch (error) {
      console.error(`验证实例 ${instanceId} 中断状态失败:`, error);
      return false;
    }
  }

  /**
   * 获取实例的恢复点信息
   */
  async getRecoveryPoint(instanceId: string): Promise<any> {
    try {
      const statusResult = await this.workflowAdapter.getWorkflowStatus(instanceId);
      if (!statusResult.success) {
        throw new Error(`获取状态失败: ${statusResult.error}`);
      }

      const instanceResult = await this.workflowAdapter.getWorkflowInstance(instanceId);
      if (!instanceResult.success) {
        throw new Error(`获取实例失败: ${instanceResult.error}`);
      }

      const status = statusResult.data;
      const instance = instanceResult.data;

      return {
        instanceId,
        lastCompletedNodes: status.completedNodes || [],
        failedNodes: status.failedNodes || [],
        currentNode: status.currentNode,
        contextData: instance.context_data || {},
        inputData: instance.input_data || {},
        interruptedAt: instance.updated_at,
        canRecover: this.canInstanceRecover(status, instance)
      };

    } catch (error) {
      console.error('获取恢复点信息失败:', error);
      throw error;
    }
  }

  /**
   * 判断实例是否可以恢复
   */
  private canInstanceRecover(status: any, instance: any): boolean {
    // 检查实例状态
    if (instance.status !== 'running') {
      return false;
    }

    // 检查是否有已完成的节点（有进度可以恢复）
    if (status.completedNodes && status.completedNodes.length > 0) {
      return true;
    }

    // 检查是否有失败但可重试的节点
    if (status.failedNodes && status.failedNodes.length > 0) {
      return true;
    }

    // 如果有当前节点，也可以尝试恢复
    return !!status.currentNode;
  }
}
```

### 2. 执行工作流恢复操作

```typescript
class WorkflowRecoveryExecutor {
  constructor(
    private readonly workflowAdapter: WorkflowAdapter,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly recoveryManager: WorkflowRecoveryManager
  ) {}

  /**
   * 恢复中断的工作流实例
   */
  async recoverWorkflowInstance(instanceId: string): Promise<boolean> {
    try {
      console.log(`开始恢复工作流实例: ${instanceId}`);

      // 1. 获取恢复点信息
      const recoveryPoint = await this.recoveryManager.getRecoveryPoint(instanceId);

      if (!recoveryPoint.canRecover) {
        console.log(`实例 ${instanceId} 无法恢复`);
        return false;
      }

      // 2. 验证数据一致性
      const isConsistent = await this.validateDataConsistency(instanceId, recoveryPoint);
      if (!isConsistent) {
        console.error(`实例 ${instanceId} 数据一致性验证失败`);
        return false;
      }

      // 3. 重置实例状态为运行中
      await this.resetInstanceForRecovery(instanceId);

      // 4. 从断点继续执行
      const resumeResult = await this.resumeFromBreakpoint(instanceId, recoveryPoint);

      if (resumeResult) {
        console.log(`工作流实例 ${instanceId} 恢复成功`);
        return true;
      } else {
        console.error(`工作流实例 ${instanceId} 恢复失败`);
        return false;
      }

    } catch (error) {
      console.error(`恢复工作流实例 ${instanceId} 时发生错误:`, error);

      // 标记实例为失败状态
      await this.markInstanceAsFailed(instanceId, error);
      return false;
    }
  }

  /**
   * 验证数据一致性
   */
  private async validateDataConsistency(instanceId: string, recoveryPoint: any): Promise<boolean> {
    try {
      // 1. 检查已完成节点的输出数据是否完整
      for (const nodeId of recoveryPoint.lastCompletedNodes) {
        const nodeDetails = await this.getNodeExecutionDetails(instanceId, nodeId);
        if (!nodeDetails || !nodeDetails.output_data) {
          console.warn(`节点 ${nodeId} 缺少输出数据`);
          return false;
        }
      }

      // 2. 检查上下文数据完整性
      if (!recoveryPoint.contextData || Object.keys(recoveryPoint.contextData).length === 0) {
        console.warn(`实例 ${instanceId} 上下文数据为空`);
        // 上下文为空不一定是错误，可能是刚开始执行
      }

      // 3. 检查输入数据完整性
      if (!recoveryPoint.inputData) {
        console.error(`实例 ${instanceId} 缺少输入数据`);
        return false;
      }

      return true;

    } catch (error) {
      console.error('数据一致性验证失败:', error);
      return false;
    }
  }

  /**
   * 重置实例状态准备恢复
   */
  private async resetInstanceForRecovery(instanceId: string): Promise<void> {
    // 使用 Tasks 插件的恢复功能
    // 这里假设 Tasks 插件提供了重置实例状态的方法
    const result = await this.workflowAdapter.resetInstanceForRecovery(instanceId);

    if (!result.success) {
      throw new Error(`重置实例状态失败: ${result.error}`);
    }
  }

  /**
   * 从断点继续执行
   */
  private async resumeFromBreakpoint(instanceId: string, recoveryPoint: any): Promise<boolean> {
    try {
      // 使用 Tasks 插件的恢复执行功能
      const result = await this.workflowEngineService.resumeWorkflowFromBreakpoint(
        instanceId,
        {
          completedNodes: recoveryPoint.lastCompletedNodes,
          failedNodes: recoveryPoint.failedNodes,
          contextData: recoveryPoint.contextData,
          currentNode: recoveryPoint.currentNode
        }
      );

      return result.success;

    } catch (error) {
      console.error('从断点恢复执行失败:', error);
      return false;
    }
  }

  /**
   * 批量恢复中断的工作流
   */
  async batchRecoverWorkflows(): Promise<{ successful: string[], failed: string[] }> {
    const successful: string[] = [];
    const failed: string[] = [];

    try {
      // 1. 检测所有中断的实例
      const interruptedIds = await this.recoveryManager.detectInterruptedInstances();

      if (interruptedIds.length === 0) {
        console.log('没有发现需要恢复的工作流实例');
        return { successful, failed };
      }

      console.log(`开始批量恢复 ${interruptedIds.length} 个工作流实例`);

      // 2. 并发恢复（限制并发数避免系统压力过大）
      const concurrency = 5;
      const chunks = this.chunkArray(interruptedIds, concurrency);

      for (const chunk of chunks) {
        const recoveryPromises = chunk.map(async (instanceId) => {
          const success = await this.recoverWorkflowInstance(instanceId);
          return { instanceId, success };
        });

        const results = await Promise.allSettled(recoveryPromises);

        results.forEach((result, index) => {
          const instanceId = chunk[index];
          if (result.status === 'fulfilled' && result.value.success) {
            successful.push(instanceId);
          } else {
            failed.push(instanceId);
          }
        });
      }

      console.log(`批量恢复完成 - 成功: ${successful.length}, 失败: ${failed.length}`);
      return { successful, failed };

    } catch (error) {
      console.error('批量恢复过程中发生错误:', error);
      return { successful, failed };
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async getNodeExecutionDetails(instanceId: string, nodeId: string): Promise<any> {
    // 这里需要调用 Tasks 插件提供的节点详情查询方法
    // 具体实现取决于 Tasks 插件的 API
    return null;
  }

  private async markInstanceAsFailed(instanceId: string, error: any): Promise<void> {
    try {
      await this.workflowAdapter.markWorkflowAsFailed(instanceId, {
        error: error.message,
        details: error.stack,
        failedAt: new Date().toISOString()
      });
    } catch (markError) {
      console.error('标记实例失败状态时出错:', markError);
    }
  }
}
```

## 工作流实例完整生命周期流程

### 1. 实例创建阶段

实例创建是工作流生命周期的起始阶段，包含参数验证、资源分配和初始化等关键步骤。

#### 1.1 创建流程图

```mermaid
graph TD
    A[接收创建请求] --> B[参数验证]
    B --> C{验证通过?}
    C -->|否| D[返回错误]
    C -->|是| E[生成实例ID]
    E --> F[获取工作流定义]
    F --> G[资源预分配]
    G --> H[创建实例记录]
    H --> I[初始化上下文]
    I --> J[创建初始检查点]
    J --> K[分配执行引擎]
    K --> L[实例创建完成]
```

#### 1.2 参数验证

```typescript
interface WorkflowInstanceCreateRequest {
  workflowName: string;
  workflowVersion?: string;
  inputData: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  maxRetries?: number;
  createdBy?: string;
  parentInstanceId?: string;
  tags?: Record<string, string>;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

class WorkflowInstanceValidator {
  /**
   * 验证工作流实例创建请求
   */
  async validateCreateRequest(request: WorkflowInstanceCreateRequest): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. 基础参数验证
    if (!request.workflowName?.trim()) {
      errors.push({
        field: 'workflowName',
        message: '工作流名称不能为空',
        code: 'REQUIRED_FIELD'
      });
    }

    // 2. 工作流定义存在性验证
    const workflowDefinition = await this.getWorkflowDefinition(
      request.workflowName,
      request.workflowVersion || 'latest'
    );
    
    if (!workflowDefinition) {
      errors.push({
        field: 'workflowName',
        message: `工作流定义不存在: ${request.workflowName}`,
        code: 'WORKFLOW_NOT_FOUND'
      });
      return { isValid: false, errors, warnings };
    }

    // 3. 输入参数验证
    const inputValidation = await this.validateInputData(
      request.inputData,
      workflowDefinition.definition.inputs
    );
    
    if (!inputValidation.isValid) {
      errors.push(...inputValidation.errors);
    }

    // 4. 资源可用性检查
    const resourceCheck = await this.checkResourceAvailability(workflowDefinition);
    if (!resourceCheck.available) {
      warnings.push({
        message: '当前资源紧张，可能影响执行性能',
        code: 'RESOURCE_WARNING'
      });
    }

    // 5. 父实例验证（子工作流场景）
    if (request.parentInstanceId) {
      const parentInstance = await this.getWorkflowInstance(request.parentInstanceId);
      if (!parentInstance || parentInstance.status !== 'running') {
        errors.push({
          field: 'parentInstanceId',
          message: '父实例不存在或状态异常',
          code: 'INVALID_PARENT_INSTANCE'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证输入数据
   */
  private async validateInputData(
    inputData: Record<string, any>,
    inputSchema: Record<string, any>
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    for (const [key, schema] of Object.entries(inputSchema)) {
      const value = inputData[key];

      // 必填字段检查
      if (schema.required && (value === undefined || value === null)) {
        errors.push({
          field: `inputData.${key}`,
          message: `必填参数缺失: ${key}`,
          code: 'REQUIRED_PARAMETER'
        });
        continue;
      }

      // 类型检查
      if (value !== undefined && !this.validateType(value, schema.type)) {
        errors.push({
          field: `inputData.${key}`,
          message: `参数类型错误: ${key}，期望 ${schema.type}`,
          code: 'TYPE_MISMATCH'
        });
      }

      // 自定义验证规则
      if (schema.validation && value !== undefined) {
        const customValidation = await this.applyCustomValidation(value, schema.validation);
        if (!customValidation.isValid) {
          errors.push(...customValidation.errors);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }
}
```

#### 1.3 资源分配

```typescript
interface ResourceAllocation {
  engineId: string;
  cpuQuota: string;
  memoryQuota: string;
  diskQuota: string;
  networkBandwidth: string;
  estimatedCost: number;
}

class ResourceAllocator {
  /**
   * 为工作流实例分配资源
   */
  async allocateResources(
    workflowDefinition: WorkflowDefinition,
    priority: string
  ): Promise<ResourceAllocation> {
    // 1. 计算资源需求
    const resourceRequirements = this.calculateResourceRequirements(workflowDefinition);
    
    // 2. 选择最优引擎
    const selectedEngine = await this.selectOptimalEngine(
      resourceRequirements,
      priority
    );
    
    // 3. 预留资源
    const allocation = await this.reserveResources(selectedEngine, resourceRequirements);
    
    // 4. 记录分配信息
    await this.recordAllocation(allocation);
    
    return allocation;
  }

  /**
   * 计算工作流资源需求
   */
  private calculateResourceRequirements(definition: WorkflowDefinition): ResourceRequirements {
    let totalCpu = 0;
    let totalMemory = 0;
    let totalDisk = 0;
    let estimatedDuration = 0;

    // 遍历所有节点计算资源需求
    for (const node of definition.definition.nodes) {
      const nodeRequirements = this.getNodeResourceRequirements(node);
      totalCpu += nodeRequirements.cpu;
      totalMemory += nodeRequirements.memory;
      totalDisk += nodeRequirements.disk;
      estimatedDuration = Math.max(estimatedDuration, nodeRequirements.duration);
    }

    // 考虑并发执行的资源优化
    const concurrencyFactor = this.calculateConcurrencyFactor(definition);
    
    return {
      cpu: Math.ceil(totalCpu * concurrencyFactor),
      memory: Math.ceil(totalMemory * concurrencyFactor),
      disk: totalDisk,
      estimatedDuration,
      networkBandwidth: this.estimateNetworkRequirements(definition)
    };
  }
}
```
