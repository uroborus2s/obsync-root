# @stratix/tasks

基于 Stratix 框架的企业级工作流任务管理系统，支持流程定义与实例分离、动态并行任务生成、中断恢复机制。

## 🚀 核心特性

- **🔧 插件化架构**: 基于 Fastify 插件系统，无缝集成到 Stratix 框架
- **⚡ 高性能执行**: 支持并发任务执行和智能调度
- **🔄 工作流管理**: 完整的工作流定义、实例化和执行生命周期
- **🎯 任务调度**: 优先级队列、重试机制、超时控制
- **🔌 执行器系统**: 内置多种执行器，支持自定义扩展
- **📊 监控统计**: 实时状态监控和执行统计
- **🛡️ 错误处理**: 完善的错误处理和恢复机制

## 📦 已实现功能

### 1. 插件核心 (`src/index.ts`)
- ✅ Fastify 插件集成
- ✅ `registerTaskExecutor` 装饰器方法
- ✅ `registerExecutorDomain` 装饰器方法  
- ✅ `getTaskExecutor` 装饰器方法
- ✅ 依赖注入容器集成

### 2. 执行器管理 (`src/services/executor/`)
- ✅ **ExecutorRegistryService**: 执行器注册表服务
  - 执行器注册、获取、列表、注销
  - 执行器域管理
  - 健康检查
  - 统计信息
- ✅ **ExecutorFactoryService**: 执行器工厂服务
  - 内置执行器创建 (HTTP, Script, Email, Delay, Log)
  - 批量执行器创建
  - 配置验证

### 3. 工作流引擎 (`src/services/workflow/`)
- ✅ **WorkflowEngineService**: 工作流引擎
  - 工作流启动、暂停、恢复、取消
  - 状态管理
  - 节点执行
  - 条件评估
  - 重试机制
- ✅ **WorkflowDefinitionServiceImpl**: 工作流定义服务
  - 工作流定义的 CRUD 操作
  - 版本管理
  - 定义验证
  - 统计信息

### 4. 任务调度 (`src/services/task/`)
- ✅ **TaskSchedulerService**: 任务调度器
  - 优先级队列
  - 并发控制
  - 重试机制
  - 任务状态管理
  - 统计监控

### 5. 内置执行器
- ✅ **HTTP 执行器**: HTTP 请求执行
- ✅ **脚本执行器**: JavaScript 脚本执行
- ✅ **邮件执行器**: 邮件发送（模拟）
- ✅ **延迟执行器**: 延迟等待
- ✅ **日志执行器**: 日志记录

## 🛠️ 安装和使用

### 安装依赖

```bash
cd packages/tasks
pnpm install
```

### 构建项目

```bash
pnpm run build
```

### 运行测试

```bash
pnpm test
```

## 📖 使用示例

### 1. 基本插件使用

```typescript
import tasksPlugin from '@stratix/tasks';
import type { FastifyInstance } from '@stratix/core';

// 注册插件
await fastify.register(tasksPlugin, {
  // 插件配置选项
});

// 注册自定义执行器
fastify.registerTaskExecutor('myExecutor', {
  name: 'myExecutor',
  description: 'My custom executor',
  async execute(context) {
    // 执行逻辑
    return { success: true, data: 'result' };
  }
});

// 注册执行器域
fastify.registerExecutorDomain('user', {
  creator: new UserCreatorExecutor(),
  validator: new UserValidatorExecutor()
});
```

### 2. 工作流定义

```typescript
import { WorkflowDefinitionServiceImpl } from '@stratix/tasks';

const workflowDefinition = {
  name: 'user-registration',
  version: '1.0.0',
  description: '用户注册流程',
  inputs: [
    {
      name: 'email',
      type: 'string',
      required: true,
      description: '用户邮箱'
    }
  ],
  nodes: [
    {
      type: 'task',
      id: 'create_user',
      name: '创建用户',
      executor: 'userCreator',
      config: {
        email: '{{ inputs.email }}'
      }
    },
    {
      type: 'task',
      id: 'send_email',
      name: '发送欢迎邮件',
      executor: 'emailSender',
      config: {
        to: '{{ inputs.email }}',
        template: 'welcome'
      },
      dependsOn: ['create_user']
    }
  ]
};

const definitionService = new WorkflowDefinitionServiceImpl();
await definitionService.createDefinition(workflowDefinition);
```

### 3. 执行工作流

```typescript
import { WorkflowEngineService, ExecutorRegistryService } from '@stratix/tasks';

const registry = new ExecutorRegistryService();
const engine = new WorkflowEngineService(registry);

// 启动工作流
const instance = await engine.startWorkflow(definition, {
  email: 'user@example.com'
});

// 监控状态
const status = await engine.getWorkflowStatus(instance.id.toString());
console.log(`工作流状态: ${status}`);
```

### 4. 任务调度

```typescript
import { TaskSchedulerService } from '@stratix/tasks';

const scheduler = new TaskSchedulerService(registry, 10); // 最大并发数
await scheduler.start();

// 调度任务
const task = await scheduler.scheduleTask({
  id: 'myTask',
  name: '我的任务',
  executor: 'myExecutor',
  config: { data: 'test' },
  priority: 'high'
}, { input: 'data' });

// 监控任务
const taskStatus = await scheduler.getTaskStatus(task.id);
```

## 🧪 测试

项目包含完整的测试套件：

- **单元测试**: 测试各个服务类的功能
- **集成测试**: 测试组件间的集成和完整工作流
- **示例测试**: 验证使用示例的正确性

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test plugin
pnpm test workflow-engine
pnpm test integration

# 生成测试覆盖率报告
pnpm test:coverage
```

## 📁 项目结构

```
packages/tasks/
├── src/
│   ├── index.ts                    # 插件入口
│   ├── types/                      # 类型定义
│   │   ├── workflow.ts
│   │   ├── executor.ts
│   │   └── index.ts
│   ├── services/                   # 业务服务
│   │   ├── executor/              # 执行器相关
│   │   │   ├── ExecutorRegistryService.ts
│   │   │   └── ExecutorFactoryService.ts
│   │   ├── workflow/              # 工作流相关
│   │   │   ├── WorkflowEngine.ts
│   │   │   └── WorkflowDefinitionService.ts
│   │   ├── task/                  # 任务相关
│   │   │   └── TaskScheduler.ts
│   │   └── index.ts
│   ├── __tests__/                 # 测试文件
│   │   ├── plugin.test.ts
│   │   ├── workflow-engine.test.ts
│   │   └── integration.test.ts
│   └── utils/                     # 工具函数
├── examples/                      # 使用示例
│   └── basic-usage.ts
├── docs/                          # 文档
├── database/                      # 数据库相关
└── README.md
```

## 🔮 待实现功能

- [ ] 数据访问层 (Repository)
- [ ] DSL 解析器
- [ ] 并行节点执行
- [ ] 条件节点和循环节点
- [ ] 工作流可视化
- [ ] 更多内置执行器
- [ ] 性能优化
- [ ] 监控面板

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
