# @stratix/tasks 插件开发总结

## 🎯 插件概述

@stratix/tasks 是一个基于 Stratix 框架的现代化工作流和任务管理插件，提供完整的工作流定义、执行、调度和监控功能。

## 🏗️ 核心架构

### 分层架构设计
```
┌─────────────────┐
│   Adapters      │ ← 外部系统集成
├─────────────────┤
│   Services      │ ← 业务逻辑层
├─────────────────┤
│  Repositories   │ ← 数据访问层
├─────────────────┤
│   Database      │ ← 数据持久化
└─────────────────┘
```

### 依赖注入模式
- **生命周期**：所有组件都是插件域的 SCOPED 生命周期
- **构造函数注入**：通过 `protected readonly` 参数自动注入依赖
- **BaseRepository 继承**：统一的数据访问模式

## 📋 核心功能服务

### 1. 工作流定义管理 (WorkflowDefinitionService)
```typescript
// 创建工作流定义
await workflowDefinitionService.createDefinition({
  name: 'user-onboarding',
  version: '1.0.0',
  description: '用户入职流程',
  nodes: [
    {
      id: 'create-account',
      type: 'task',
      executor: 'userCreator',
      config: { department: 'engineering' }
    },
    {
      id: 'send-welcome',
      type: 'task', 
      executor: 'emailSender',
      config: { template: 'welcome' }
    }
  ]
});

// 验证工作流定义
const validation = await workflowDefinitionService.validateDefinition(definition);
```

**提供功能**：
- ✅ 工作流定义的 CRUD 操作
- ✅ 工作流定义验证和版本管理
- ✅ 节点依赖关系验证
- ✅ 配置模式验证

### 2. 工作流执行引擎 (WorkflowEngineService)
```typescript
// 启动工作流
const instance = await workflowEngine.startWorkflow(definition, {
  userId: 12345,
  department: 'engineering'
});

// 执行工作流步骤
const result = await workflowEngine.executeStep(instance, 'create-account');
```

**提供功能**：
- ✅ 工作流实例创建和管理
- ✅ 节点执行和状态跟踪
- ✅ 错误处理和重试机制
- ✅ 并行和串行执行支持

### 3. 执行器注册管理 (ExecutorRegistryService)
```typescript
// 注册自定义执行器
executorRegistry.registerExecutor('userCreator', new UserCreatorExecutor());

// 批量注册执行器域
executorRegistry.registerExecutorDomain('icasync', {
  dataSync: new DataSyncExecutor(),
  fileProcessor: new FileProcessorExecutor(),
  notificationSender: new NotificationExecutor()
});
```

**提供功能**：
- ✅ 执行器注册和发现
- ✅ 执行器健康检查
- ✅ 域级执行器管理
- ✅ 执行器统计和监控

### 4. 工作流调度服务 (WorkflowScheduleService)
```typescript
// 创建定时调度
await scheduleService.createSchedule({
  name: 'daily-sync',
  workflowDefinitionId: 1,
  cronExpression: '0 2 * * *', // 每天凌晨2点
  timezone: 'Asia/Shanghai',
  isEnabled: true
});
```

**提供功能**：
- ✅ Cron 表达式调度
- ✅ 时区支持
- ✅ 调度状态管理
- ✅ 调度历史记录

### 5. 工作流适配器 (WorkflowAdapter)
```typescript
// 创建工作流实例
const result = await workflowAdapter.createWorkflow(
  { name: 'user-onboarding', version: '1.0.0' },
  { userId: 12345 },
  { priority: 'high', externalId: 'ext-123' }
);

// 执行工作流
await workflowAdapter.executeWorkflow(result.data.id);

// 管理工作流状态
await workflowAdapter.pauseWorkflow(instanceId);
await workflowAdapter.resumeWorkflow(instanceId);
await workflowAdapter.cancelWorkflow(instanceId);
```

**提供功能**：
- ✅ 统一的工作流操作接口
- ✅ 工作流生命周期管理
- ✅ 状态查询和监控
- ✅ 批量操作支持

## 🔧 为 icasync 插件提供的核心能力

### 1. 数据同步工作流
```typescript
// 定义数据同步工作流
const syncWorkflow = {
  name: 'icasync-data-sync',
  nodes: [
    {
      id: 'validate-source',
      type: 'task',
      executor: 'icasync.dataValidator',
      config: { source: 'external-api' }
    },
    {
      id: 'transform-data', 
      type: 'task',
      executor: 'icasync.dataTransformer',
      config: { format: 'json', schema: 'v2' }
    },
    {
      id: 'sync-to-target',
      type: 'task', 
      executor: 'icasync.dataSyncer',
      config: { target: 'internal-db', batchSize: 1000 }
    }
  ]
};
```

### 2. 定时同步调度
```typescript
// 设置定时同步
await scheduleService.createSchedule({
  name: 'icasync-hourly-sync',
  workflowDefinitionId: syncWorkflowId,
  cronExpression: '0 * * * *', // 每小时执行
  config: {
    source: 'external-system',
    target: 'local-database'
  }
});
```

### 3. 错误处理和重试
```typescript
// 自定义执行器支持重试
class DataSyncExecutor implements TaskExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    try {
      // 执行同步逻辑
      const result = await this.performSync(context.config);
      return { success: true, data: result };
    } catch (error) {
      // 支持自动重试
      if (context.retryCount < 3) {
        return { 
          success: false, 
          error: error.message,
          shouldRetry: true,
          retryDelay: 5000 // 5秒后重试
        };
      }
      return { success: false, error: error.message };
    }
  }
}
```

### 4. 监控和日志
```typescript
// 执行日志自动记录
const logs = await executionLogRepository.findByWorkflowInstanceId(instanceId);

// 工作流状态监控
const status = await workflowAdapter.getWorkflowStatus(instanceId);
const instance = await workflowAdapter.getWorkflowInstance(instanceId);
```

## 📊 数据模型

### 核心表结构
- **workflow_definitions** - 工作流定义
- **workflow_instances** - 工作流实例
- **task_nodes** - 任务节点
- **execution_logs** - 执行日志
- **workflow_schedules** - 工作流调度

### 仓储层 (Repository)
- ✅ 继承 BaseTasksRepository
- ✅ 提供 nullable 便捷方法
- ✅ 统一错误处理
- ✅ 类型安全的数据访问

## 🚀 icasync 插件集成示例

```typescript
// icasync 插件入口文件
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance } from 'fastify';

async function icasyncPlugin(fastify: FastifyInstance) {
  // 注册 icasync 执行器
  const executorRegistry = fastify.diContainer.resolve('executorRegistryService');
  
  executorRegistry.registerExecutorDomain('icasync', {
    dataValidator: new DataValidatorExecutor(),
    dataTransformer: new DataTransformerExecutor(), 
    dataSyncer: new DataSyncerExecutor(),
    fileProcessor: new FileProcessorExecutor(),
    notificationSender: new NotificationExecutor()
  });

  // 创建同步工作流定义
  const workflowDefinitionService = fastify.diContainer.resolve('workflowDefinitionService');
  await workflowDefinitionService.createDefinition(icasyncSyncWorkflow);

  // 设置定时调度
  const scheduleService = fastify.diContainer.resolve('workflowScheduleService');
  await scheduleService.createSchedule(icasyncScheduleConfig);
}

export default withRegisterAutoDI(icasyncPlugin, {
  name: '@icasync/plugin',
  dependencies: ['@stratix/tasks'] // 依赖 tasks 插件
});
```

## 🎯 总结

@stratix/tasks 插件为 icasync 提供了：

1. **完整的工作流引擎** - 支持复杂的数据同步流程
2. **灵活的执行器系统** - 可注册自定义同步逻辑
3. **强大的调度功能** - 支持定时和事件驱动的同步
4. **完善的监控体系** - 提供执行日志和状态跟踪
5. **类型安全的 API** - 基于 TypeScript 的完整类型定义
6. **插件化架构** - 易于扩展和集成

icasync 插件可以充分利用这些功能来构建高效、可靠的数据同步解决方案。
