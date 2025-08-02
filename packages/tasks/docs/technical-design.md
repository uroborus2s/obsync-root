# @stratix/tasks 技术设计文档

## 📋 项目概述

@stratix/tasks 是基于 Stratix 框架的企业级工作流引擎插件，提供完整的工作流定义、执行、监控和管理能力。

### 核心特性

- **🔄 代码化定义**：工作流和任务通过代码定义，支持版本控制和类型安全
- **🚀 自动发现**：基于 withRegisterAutoDI 的自动组件扫描和注册
- **💾 持久化存储**：完整的数据库持久化，支持故障恢复和状态查询
- **🔧 故障恢复**：服务重启后自动恢复未完成的工作流实例
- **📊 状态管理**：支持工作流的启动、暂停、恢复、取消、重试等操作
- **⚡ 高性能**：基于函数式编程和依赖注入的高性能架构

## 🏗️ 系统架构

### 1. 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Stratix Framework                        │
├─────────────────────────────────────────────────────────────┤
│                  @stratix/tasks Plugin                     │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   API层     │  │   Web UI    │  │   CLI工具   │        │
│  │ Controllers │  │  Dashboard  │  │   Commands  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                 │                 │              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   服务层 (Services)                     │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │WorkflowMgr  │  │ TaskManager │  │ScheduleMgr  │    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                 │                 │              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  执行引擎 (Engine)                       │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │WorkflowEng  │  │  Scheduler  │  │StateMachine │    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                 │                 │              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  持久化层 (Persistence)                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │Repositories │  │   Models    │  │ Migrations  │    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │ │
│  └─────────────────────────────────────────────────────────┘ │
│         │                 │                 │              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    数据库层                              │ │
│  │     MySQL/PostgreSQL/SQLite (通过 @stratix/database)   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. 核心组件设计

#### 2.1 工作流定义系统

**设计原则：**
- 代码化定义，支持 TypeScript 类型检查
- 声明式语法，易于理解和维护
- 支持复杂的控制流和条件逻辑

**核心接口：**

```typescript
// 工作流定义接口
interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  tasks: TaskDefinition[];
  triggers?: TriggerDefinition[];
  variables?: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  onError?: ErrorHandler;
}

// 任务定义接口
interface TaskDefinition {
  id: string;
  name: string;
  type: TaskType;
  executor?: string;
  dependencies?: string[];
  condition?: ConditionExpression;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  parameters?: Record<string, any>;
}

// 任务类型枚举
enum TaskType {
  EXECUTOR = 'executor',      // 执行器任务
  CONDITION = 'condition',    // 条件判断
  PARALLEL = 'parallel',      // 并行执行
  SEQUENTIAL = 'sequential',  // 顺序执行
  SUB_WORKFLOW = 'sub_workflow' // 子工作流
}
```

#### 2.2 自动发现机制

**基于 withRegisterAutoDI 的组件扫描：**

```typescript
// 插件配置
const AUTO_DISCOVERY_CONFIG = {
  discovery: {
    patterns: [
      'definitions/**/*.{ts,js}',    // 工作流定义
      'executors/**/*.{ts,js}',      // 任务执行器
      'services/**/*.{ts,js}',       // 业务服务
      'repositories/**/*.{ts,js}',   // 数据仓储
      'controllers/**/*.{ts,js}'     // API控制器
    ]
  },
  services: {
    enabled: true,
    patterns: ['managers/**/*.{ts,js}']
  },
  routing: {
    enabled: true,
    prefix: '/api/workflows',
    validation: true
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'throw'
  }
};
```

**组件注册约定：**
- 工作流定义：导出 `WorkflowDefinition` 对象
- 任务执行器：导出实现 `TaskExecutor` 接口的类
- 服务类：使用依赖注入容器自动注册

#### 2.3 执行引擎设计

**状态机驱动的执行模型：**

```typescript
// 工作流状态枚举
enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

// 任务状态枚举
enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled'
}

// 执行引擎接口
interface WorkflowEngine {
  startWorkflow(definitionId: string, input?: any): Promise<WorkflowInstance>;
  resumeWorkflow(instanceId: string): Promise<WorkflowInstance>;
  pauseWorkflow(instanceId: string): Promise<void>;
  cancelWorkflow(instanceId: string): Promise<void>;
  retryWorkflow(instanceId: string): Promise<WorkflowInstance>;
  getWorkflowStatus(instanceId: string): Promise<WorkflowStatus>;
}
```

**执行策略：**
- **顺序执行**：按依赖关系顺序执行任务
- **并行执行**：支持任务并行执行和结果聚合
- **条件执行**：基于条件表达式的分支逻辑
- **子工作流**：支持嵌套工作流调用

#### 2.4 持久化策略

**仓储模式设计：**

```typescript
// 工作流仓储接口
interface WorkflowRepository {
  // 定义管理
  saveDefinition(definition: WorkflowDefinition): Promise<void>;
  getDefinition(id: string): Promise<WorkflowDefinition | null>;
  listDefinitions(filter?: DefinitionFilter): Promise<WorkflowDefinition[]>;
  
  // 实例管理
  saveInstance(instance: WorkflowInstance): Promise<void>;
  getInstance(id: string): Promise<WorkflowInstance | null>;
  updateInstanceStatus(id: string, status: WorkflowStatus): Promise<void>;
  
  // 查询接口
  findInstancesByStatus(status: WorkflowStatus[]): Promise<WorkflowInstance[]>;
  findInstancesByDefinition(definitionId: string): Promise<WorkflowInstance[]>;
}

// 任务仓储接口
interface TaskRepository {
  saveTask(task: TaskInstance): Promise<void>;
  getTask(id: string): Promise<TaskInstance | null>;
  updateTaskStatus(id: string, status: TaskStatus): Promise<void>;
  findTasksByWorkflow(workflowInstanceId: string): Promise<TaskInstance[]>;
  findPendingTasks(): Promise<TaskInstance[]>;
}
```

**事务管理：**
- 关键操作使用数据库事务保证一致性
- 支持分布式事务处理
- 乐观锁防止并发冲突

### 3. 故障恢复机制

#### 3.1 自动恢复策略

**基于生命周期钩子的恢复：**

```typescript
// 工作流恢复服务
class WorkflowRecoveryService {
  // 服务启动时自动调用
  async onReady(): Promise<void> {
    await this.recoverPendingWorkflows();
    await this.recoverRunningWorkflows();
    await this.cleanupOrphanedTasks();
  }
  
  // 恢复待执行的工作流
  private async recoverPendingWorkflows(): Promise<void> {
    const pendingInstances = await this.workflowRepository.findInstancesByStatus([
      WorkflowStatus.PENDING,
      WorkflowStatus.RUNNING
    ]);
    
    for (const instance of pendingInstances) {
      await this.workflowEngine.resumeWorkflow(instance.id);
    }
  }
}
```

#### 3.2 状态一致性保证

**检查点机制：**
- 任务执行前后记录状态快照
- 支持从任意检查点恢复执行
- 幂等性保证重复执行的安全性

**数据一致性：**
- 使用数据库事务保证状态更新的原子性
- 实现最终一致性模型
- 支持补偿事务处理失败场景

## 🔧 技术实现细节

### 1. 函数式编程范式

**纯函数执行器：**
```typescript
// 任务执行器接口
interface TaskExecutor<TInput = any, TOutput = any> {
  name: string;
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;
}

// 示例执行器实现
class DataProcessingExecutor implements TaskExecutor<DataInput, DataOutput> {
  name = 'data-processing';
  
  async execute(input: DataInput, context: ExecutionContext): Promise<DataOutput> {
    // 纯函数实现，无副作用
    const processedData = await this.processData(input.data);
    return { result: processedData };
  }
}
```

**函数组合：**
```typescript
// 工作流定义示例
const dataProcessingWorkflow: WorkflowDefinition = {
  id: 'data-processing-v1',
  name: 'Data Processing Pipeline',
  version: '1.0.0',
  tasks: [
    {
      id: 'validate',
      name: 'Validate Input',
      type: TaskType.EXECUTOR,
      executor: 'data-validator'
    },
    {
      id: 'transform',
      name: 'Transform Data',
      type: TaskType.EXECUTOR,
      executor: 'data-transformer',
      dependencies: ['validate']
    },
    {
      id: 'save',
      name: 'Save Result',
      type: TaskType.EXECUTOR,
      executor: 'data-saver',
      dependencies: ['transform']
    }
  ]
};
```

### 2. 依赖注入集成

**服务注册：**
```typescript
// 自动注册的服务类
export class WorkflowManager {
  constructor(
    private workflowRepository: WorkflowRepository,
    private taskRepository: TaskRepository,
    private workflowEngine: WorkflowEngine
  ) {}
  
  async startWorkflow(definitionId: string, input?: any): Promise<string> {
    const definition = await this.workflowRepository.getDefinition(definitionId);
    if (!definition) {
      throw new Error(`Workflow definition not found: ${definitionId}`);
    }
    
    const instance = await this.workflowEngine.startWorkflow(definitionId, input);
    return instance.id;
  }
}
```

**生命周期集成：**
```typescript
// 生命周期钩子示例
export class WorkflowScheduler {
  // 服务启动时调用
  async onReady(): Promise<void> {
    await this.startScheduler();
  }
  
  // 服务关闭时调用
  async onClose(): Promise<void> {
    await this.stopScheduler();
  }
}
```

### 3. 错误处理和重试机制

**重试策略：**
```typescript
// 重试策略接口
interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: BackoffStrategy;
  retryableErrors?: string[];
}

// 指数退避策略
class ExponentialBackoffStrategy implements BackoffStrategy {
  calculateDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }
}
```

**错误处理：**
```typescript
// 错误处理器接口
interface ErrorHandler {
  handleError(error: Error, context: ExecutionContext): Promise<ErrorAction>;
}

// 错误处理动作
enum ErrorAction {
  RETRY = 'retry',
  SKIP = 'skip',
  FAIL = 'fail',
  COMPENSATE = 'compensate'
}
```

## 📊 性能优化

### 1. 数据库优化

**索引策略：**
- 复合索引支持常见查询模式
- 覆盖索引减少回表操作
- 分区表处理大数据量

**查询优化：**
- 预定义视图简化复杂查询
- 查询缓存提高响应速度
- 读写分离支持高并发

### 2. 内存管理

**对象池：**
- 复用执行上下文对象
- 减少垃圾回收压力
- 控制内存使用峰值

**缓存策略：**
- 工作流定义缓存
- 执行器实例缓存
- 查询结果缓存

### 3. 并发控制

**任务调度：**
- 基于优先级的任务队列
- 并发度控制和限流
- 资源隔离和配额管理

**锁机制：**
- 分布式锁防止重复执行
- 乐观锁处理并发更新
- 死锁检测和恢复

## 🔒 安全性设计

### 1. 访问控制

**权限模型：**
- 基于角色的访问控制 (RBAC)
- 细粒度权限管理
- 资源级别的权限控制

**认证授权：**
- 集成企业身份认证系统
- JWT Token 验证
- API 密钥管理

### 2. 数据安全

**敏感数据保护：**
- 输入输出数据加密
- 敏感字段脱敏
- 审计日志记录

**网络安全：**
- HTTPS 传输加密
- 防止 SQL 注入
- 输入验证和过滤

## 📈 监控和运维

### 1. 指标收集

**性能指标：**
- 工作流执行时间
- 任务成功率
- 系统资源使用

**业务指标：**
- 工作流吞吐量
- 错误率统计
- 用户活跃度

### 2. 告警机制

**告警规则：**
- 长时间运行的工作流
- 高失败率的工作流定义
- 系统资源异常

**通知渠道：**
- 邮件通知
- 短信告警
- 企业微信/钉钉

### 3. 日志管理

**结构化日志：**
- JSON 格式日志
- 统一日志格式
- 分级日志记录

**日志聚合：**
- 集中式日志收集
- 日志检索和分析
- 日志归档和清理

## 🚀 部署和扩展

### 1. 部署架构

**单机部署：**
- 适用于开发和测试环境
- 简化的配置和管理
- 快速启动和调试

**集群部署：**
- 高可用性保证
- 负载均衡和故障转移
- 水平扩展能力

### 2. 配置管理

**环境配置：**
- 开发、测试、生产环境隔离
- 配置文件版本控制
- 敏感配置加密存储

**动态配置：**
- 运行时配置更新
- 配置变更通知
- 配置回滚机制

### 3. 扩展性设计

**插件机制：**
- 自定义执行器插件
- 第三方集成插件
- 插件热加载和卸载

**API 扩展：**
- RESTful API 设计
- GraphQL 查询支持
- Webhook 事件通知

## 📚 开发指南

### 1. 快速开始

**安装依赖：**
```bash
npm install @stratix/tasks
```

**基本配置：**
```typescript
import { createStratixApp } from '@stratix/core';
import tasksPlugin from '@stratix/tasks';

const app = createStratixApp({
  plugins: [
    [tasksPlugin, {
      database: {
        connection: {
          host: 'localhost',
          database: 'workflows'
        }
      }
    }]
  ]
});
```

### 2. 最佳实践

**工作流设计：**
- 保持任务的原子性和幂等性
- 合理设计任务依赖关系
- 避免过深的嵌套结构

**性能优化：**
- 使用批量操作减少数据库访问
- 合理设置超时和重试策略
- 监控和优化慢查询

**错误处理：**
- 实现完善的错误处理逻辑
- 提供有意义的错误信息
- 设计合理的补偿机制
