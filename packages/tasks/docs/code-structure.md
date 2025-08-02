# @stratix/tasks 代码结构规划

## 📋 概述

本文档详细描述了 @stratix/tasks 工作流引擎插件的完整代码结构规划，包括目录组织、文件命名约定、模块依赖关系和接口设计。

## 🏗️ 整体项目结构

```
packages/
├── core/                           # @stratix/core 库修改
│   └── src/
│       └── plugin/
│           ├── container-registry.ts          # 新增：容器注册表
│           ├── cross-plugin-workflow-loader.ts # 新增：跨插件加载器
│           ├── auto-di-plugin.ts              # 修改：增强 withRegisterAutoDI
│           ├── workflow-types.ts              # 新增：工作流类型定义
│           └── __tests__/                     # 测试文件
│
└── tasks/                          # @stratix/tasks 插件
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts
    ├── src/
    │   ├── index.ts                           # 插件入口
    │   ├── types/                             # 类型定义
    │   ├── engine/                            # 工作流引擎
    │   ├── registry/                          # 注册表
    │   ├── repositories/                      # 数据访问层
    │   ├── services/                          # 业务服务层
    │   ├── controllers/                       # API 控制器
    │   ├── middleware/                        # 中间件
    │   └── utils/                             # 工具函数
    ├── database/                              # 数据库相关
    ├── docs/                                  # 文档
    └── __tests__/                             # 测试文件
```

## 📁 详细目录结构

### @stratix/core 库修改

```
packages/core/src/plugin/
├── container-registry.ts                     # 全局容器注册表
├── cross-plugin-workflow-loader.ts           # 跨插件组件加载器
├── auto-di-plugin.ts                         # 增强的自动依赖注入
├── workflow-types.ts                         # 工作流基础类型
├── utils.ts                                  # 工具函数 (修改)
├── types.ts                                  # 类型定义 (修改)
├── index.ts                                  # 导出文件 (修改)
└── __tests__/
    ├── container-registry.test.ts
    ├── cross-plugin-workflow-loader.test.ts
    ├── auto-di-plugin.test.ts
    ├── integration.test.ts
    └── fixtures/                              # 测试夹具
        ├── test-plugin-a/
        └── test-plugin-b/
```

### @stratix/tasks 插件结构

```
packages/tasks/
├── package.json                               # 包配置
├── tsconfig.json                              # TypeScript 配置
├── vitest.config.ts                          # 测试配置
├── README.md                                  # 项目说明
├── CHANGELOG.md                               # 变更日志
│
├── src/                                       # 源代码
│   ├── index.ts                               # 插件入口文件
│   │
│   ├── types/                                 # 类型定义
│   │   ├── index.ts                           # 主要类型导出
│   │   ├── workflow.ts                        # 工作流相关类型
│   │   ├── task.ts                            # 任务相关类型
│   │   ├── executor.ts                        # 执行器相关类型
│   │   └── api.ts                             # API 相关类型
│   │
│   ├── engine/                                # 工作流引擎核心
│   │   ├── workflow-engine.ts                 # 主工作流引擎
│   │   ├── task-scheduler.ts                  # 任务调度器
│   │   ├── state-machine.ts                   # 状态机管理
│   │   ├── execution-context.ts               # 执行上下文
│   │   └── priority-queue.ts                  # 优先级队列
│   │
│   ├── registry/                              # 注册表管理
│   │   ├── executor-registry.ts               # 执行器注册表
│   │   ├── definition-registry.ts             # 工作流定义注册表
│   │   └── naming-strategy.ts                 # 命名策略
│   │
│   ├── repositories/                          # 数据访问层 (SCOPED)
│   │   ├── workflow-repository.ts             # 工作流仓储
│   │   ├── task-repository.ts                 # 任务仓储
│   │   ├── history-repository.ts              # 历史记录仓储
│   │   ├── schedule-repository.ts             # 调度仓储
│   │   └── base/
│   │       └── base-repository.ts             # 基础仓储
│   │
│   ├── services/                              # 业务服务层 (SINGLETON)
│   │   ├── workflow-manager.ts                # 工作流管理服务
│   │   ├── task-manager.ts                    # 任务管理服务
│   │   ├── schedule-manager.ts                # 调度管理服务
│   │   ├── recovery-service.ts                # 故障恢复服务
│   │   ├── execution-history-service.ts       # 执行历史服务
│   │   ├── metrics-service.ts                 # 指标收集服务
│   │   └── notification-service.ts            # 通知服务
│   │
│   ├── controllers/                           # API 控制器 (SINGLETON)
│   │   ├── workflow-controller.ts             # 工作流 API
│   │   ├── task-controller.ts                 # 任务 API
│   │   ├── schedule-controller.ts             # 调度 API
│   │   ├── metrics-controller.ts              # 指标 API
│   │   └── health-controller.ts               # 健康检查 API
│   │
│   ├── middleware/                            # 中间件 (SINGLETON)
│   │   ├── auth-middleware.ts                 # 认证中间件
│   │   ├── validation-middleware.ts           # 验证中间件
│   │   ├── rate-limit-middleware.ts           # 限流中间件
│   │   └── error-handler-middleware.ts        # 错误处理中间件
│   │
│   └── utils/                                 # 工具函数 (SINGLETON)
│       ├── id-generator.ts                    # ID 生成器
│       ├── date-utils.ts                      # 日期工具
│       ├── validation-utils.ts                # 验证工具
│       ├── crypto-utils.ts                    # 加密工具
│       └── logger-utils.ts                    # 日志工具
│
├── database/                                  # 数据库相关
│   ├── schema.sql                             # 数据库架构
│   ├── indexes.sql                            # 索引定义
│   ├── README.md                              # 数据库文档
│   └── migrations/                            # 迁移脚本
│       ├── 001_initial_schema.sql
│       ├── 002_add_indexes.sql
│       └── 003_performance_optimization.sql
│
├── docs/                                      # 文档
│   ├── development-roadmap.md                 # 开发路线图
│   ├── implementation-plan.md                 # 实施计划
│   ├── code-structure.md                      # 代码结构 (本文档)
│   ├── technical-design.md                    # 技术设计
│   ├── api-design.md                          # API 设计
│   ├── user-guide.md                          # 使用指南
│   ├── best-practices.md                      # 最佳实践
│   └── examples/                              # 示例代码
│       ├── basic-workflow.ts
│       ├── complex-workflow.ts
│       └── custom-executor.ts
│
└── __tests__/                                 # 测试文件
    ├── unit/                                  # 单元测试
    │   ├── engine/
    │   ├── registry/
    │   ├── repositories/
    │   └── services/
    ├── integration/                           # 集成测试
    │   ├── workflow-execution.test.ts
    │   ├── cross-plugin.test.ts
    │   └── api.test.ts
    ├── performance/                           # 性能测试
    │   ├── load-test.ts
    │   └── memory-test.ts
    └── fixtures/                              # 测试夹具
        ├── sample-workflows/
        ├── sample-executors/
        └── test-data/
```

## 🔧 核心文件设计

### 1. 插件入口文件

```typescript
// packages/tasks/src/index.ts
import { withRegisterAutoDI } from '@stratix/core/plugin';
import type { FastifyPluginAsync } from 'fastify';

// 插件主函数
const tasksMainPlugin: FastifyPluginAsync<any> = async (fastify, options) => {
  // 插件初始化逻辑
  const container = fastify.diContainer;
  
  // 初始化工作流引擎
  const workflowEngine = container.resolve('workflowEngine');
  await workflowEngine.initialize();
  
  // 启动故障恢复服务
  const recoveryService = container.resolve('recoveryService');
  await recoveryService.onReady();
  
  fastify.log.info('🚀 @stratix/tasks 插件启动成功');
};

// 插件配置
const stratixTasksPlugin = withRegisterAutoDI(tasksMainPlugin, {
  discovery: {
    patterns: [
      'engine/**/*.{ts,js}',
      'registry/**/*.{ts,js}',
      'repositories/**/*.{ts,js}',
      'services/**/*.{ts,js}',
      'controllers/**/*.{ts,js}',
      'middleware/**/*.{ts,js}',
      'utils/**/*.{ts,js}'
    ]
  },
  services: {
    enabled: true,
    patterns: ['services/**/*.{ts,js}']
  },
  routing: {
    enabled: true,
    prefix: '/api/workflows'
  },
  lifecycle: {
    enabled: true
  }
});

export default stratixTasksPlugin;
```

### 2. 类型定义结构

```typescript
// packages/tasks/src/types/index.ts
// 主要类型导出文件

export * from './workflow';
export * from './task';
export * from './executor';
export * from './api';

// 重新导出 @stratix/core 的工作流类型
export type {
  TaskExecutor,
  TaskResult,
  ExecutionContext,
  WorkflowConfig
} from '@stratix/core/plugin';
```

### 3. 工作流引擎核心

```typescript
// packages/tasks/src/engine/workflow-engine.ts
export class WorkflowEngine implements IWorkflowEngine {
  constructor(
    private workflowRepository: WorkflowRepository,
    private taskRepository: TaskRepository,
    private taskScheduler: TaskScheduler,
    private stateMachine: WorkflowStateMachine,
    private historyService: ExecutionHistoryService,
    private logger: Logger
  ) {}

  // 核心方法实现
  async startWorkflow(definitionId: string, input?: any, options?: StartWorkflowOptions): Promise<WorkflowInstance>;
  async resumeWorkflow(instanceId: string): Promise<WorkflowInstance>;
  async pauseWorkflow(instanceId: string): Promise<void>;
  async cancelWorkflow(instanceId: string): Promise<void>;
  async retryWorkflow(instanceId: string, options?: RetryWorkflowOptions): Promise<WorkflowInstance>;
  
  // 状态查询
  async getWorkflowStatus(instanceId: string): Promise<WorkflowStatus>;
  async getInstance(instanceId: string): Promise<WorkflowInstance | null>;
  async getTasks(workflowInstanceId: string): Promise<TaskInstance[]>;
  
  // 等待和监听
  async waitForCompletion(instanceId: string, timeout?: number): Promise<WorkflowInstance>;
  onStatusChange(instanceId: string, callback: StatusChangeCallback): void;
  onTaskCompleted(instanceId: string, callback: TaskCompletedCallback): void;
}
```

## 📦 模块依赖关系

### 依赖层次图

```mermaid
graph TD
    A[Controllers] --> B[Services]
    B --> C[Engine]
    B --> D[Repositories]
    C --> E[Registry]
    C --> D
    E --> F[Utils]
    D --> G[Database]
    B --> H[Middleware]
    
    subgraph "External Dependencies"
        I[@stratix/core]
        J[@stratix/database]
        K[Awilix]
        L[Fastify]
    end
    
    A --> I
    B --> I
    C --> I
    D --> J
    E --> K
    H --> L
```

### 模块职责划分

#### Engine 层 (核心引擎)
- **WorkflowEngine**: 工作流生命周期管理
- **TaskScheduler**: 任务调度和执行
- **StateMachine**: 状态转换管理
- **ExecutionContext**: 执行上下文管理

#### Registry 层 (注册表)
- **ExecutorRegistry**: 执行器注册和解析
- **DefinitionRegistry**: 工作流定义注册和解析
- **NamingStrategy**: 命名策略和冲突解决

#### Services 层 (业务服务)
- **WorkflowManager**: 工作流管理业务逻辑
- **TaskManager**: 任务管理业务逻辑
- **RecoveryService**: 故障恢复业务逻辑
- **MetricsService**: 指标收集业务逻辑

#### Repositories 层 (数据访问)
- **WorkflowRepository**: 工作流数据访问
- **TaskRepository**: 任务数据访问
- **HistoryRepository**: 历史记录数据访问

#### Controllers 层 (API 接口)
- **WorkflowController**: 工作流 REST API
- **TaskController**: 任务 REST API
- **MetricsController**: 指标 REST API

## 🎯 命名约定

### 文件命名
- **类文件**: `kebab-case.ts` (例: `workflow-engine.ts`)
- **测试文件**: `kebab-case.test.ts` (例: `workflow-engine.test.ts`)
- **类型文件**: `kebab-case.ts` (例: `workflow-types.ts`)
- **工具文件**: `kebab-case.ts` (例: `date-utils.ts`)

### 类命名
- **服务类**: `PascalCase + Service` (例: `WorkflowService`)
- **管理器类**: `PascalCase + Manager` (例: `TaskManager`)
- **仓储类**: `PascalCase + Repository` (例: `WorkflowRepository`)
- **控制器类**: `PascalCase + Controller` (例: `WorkflowController`)

### 接口命名
- **接口**: `I + PascalCase` (例: `IWorkflowEngine`)
- **类型**: `PascalCase` (例: `WorkflowDefinition`)
- **枚举**: `PascalCase` (例: `WorkflowStatus`)

### 常量命名
- **常量**: `UPPER_SNAKE_CASE` (例: `DEFAULT_TIMEOUT`)
- **配置**: `UPPER_SNAKE_CASE` (例: `AUTO_DISCOVERY_CONFIG`)

## 🔍 导入导出策略

### 模块导出
```typescript
// 每个模块的 index.ts 文件负责导出
// packages/tasks/src/engine/index.ts
export { WorkflowEngine } from './workflow-engine';
export { TaskScheduler } from './task-scheduler';
export { WorkflowStateMachine } from './state-machine';
export { ExecutionContext } from './execution-context';

// 类型导出
export type {
  IWorkflowEngine,
  ITaskScheduler,
  IStateMachine
} from './interfaces';
```

### 主入口导出
```typescript
// packages/tasks/src/index.ts
// 插件导出
export { default } from './plugin';

// 类型导出
export type * from './types';

// 工具导出
export { createWorkflowDefinition } from './utils';
export { createTaskExecutor } from './utils';
```

## 📋 开发规范

### TypeScript 配置
- **严格模式**: 启用所有严格检查
- **路径映射**: 使用相对路径导入
- **类型检查**: 100% 类型覆盖

### 代码质量
- **ESLint**: 遵循 Stratix 代码规范
- **Prettier**: 统一代码格式
- **Husky**: Git 钩子检查

### 测试覆盖
- **单元测试**: ≥ 90% 覆盖率
- **集成测试**: 覆盖关键流程
- **性能测试**: 验证性能指标

### 文档要求
- **JSDoc**: 所有公共 API 必须有文档
- **README**: 每个模块都有说明文档
- **示例**: 提供使用示例代码
