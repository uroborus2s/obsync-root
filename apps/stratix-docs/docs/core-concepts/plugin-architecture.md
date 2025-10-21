---
sidebar_position: 5
---

# 插件化架构

`@stratix/core` 的核心设计思想之一就是“一切皆插件”。这种高度模块化的架构不仅应用于框架的内部功能，也为您组织自己的业务逻辑提供了强大的工具。它允许您将相关的功能（如用户管理、支付、日志等）封装在独立的、可复用的单元中。

## `withRegisterAutoDI` 高阶函数

`withRegisterAutoDI` 是实现插件化架构的核心。它是一个高阶函数，接收一个标准的 Fastify 插件作为参数，并返回一个被“增强”了的、具备 `@stratix/core` 特性的新插件。

```typescript
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance } from 'fastify';

// 这是一个标准的 Fastify 插件
async function myPlugin(fastify: FastifyInstance, options: any) {
  fastify.log.info('My plugin is running!');
  // ... 插件逻辑
}

// 使用 withRegisterAutoDI 进行包装
export default withRegisterAutoDI(myPlugin, {
  // 在此提供 Stratix 特定的配置
  discovery: {
    patterns: ['**/*.service.ts'],
  },
});
```

**`withRegisterAutoDI` 为您的插件带来了什么？**

1.  **独立的 DI 容器**: 每个插件都会获得一个独立的、作用域隔离的 `awilix` 容器。这意味着插件内部的服务和依赖关系是自包含的，不会与主应用或其他插件发生冲突。

2.  **自动模块发现**: 您可以在配置中指定 `discovery.patterns`，插件会自动扫描其目录下的文件（如服务、控制器、执行器），并将它们注册到自己的 DI 容器中。

3.  **自动路由注册**: 如果插件内包含控制器，它们的路由会被自动发现并注册到 Fastify 实例中。

4.  **生命周期管理**: 插件内的所有服务都自动参与到框架的生命周期管理中，它们的 `onReady`, `onClose` 等方法会被自动调用。

## 插件的内部结构

当您使用 `withRegisterAutoDI` 时，可以把每个插件想象成一个迷你的 `@stratix/core` 应用。它拥有自己的：

- **服务 (Services)**: 处理业务逻辑。
- **控制器 (Controllers)**: 处理 HTTP 请求。
- **执行器 (Executors)**: 处理后台任务。

这些组件都存在于插件自己的 DI 容器中，默认情况下对外部是不可见的。这种设计强制实现了**高内聚**和**低耦合**。

## 插件间的通信：服务适配器模式

既然插件是相互隔离的，那么它们之间如何通信呢？例如，一个 `OrderPlugin` 可能需要使用 `UserPlugin` 提供的用户查找功能。

`@stratix/core` 推荐使用**服务适配器 (Service Adapter)** 模式来解决这个问题。这是一种受控制的、显式暴露功能的方式。

**工作原理**: 一个插件可以定义一个或多个“适配器”，这些适配器本质上是普通的类或工厂函数，但它们会被注册到**应用的根 DI 容器**中，而不是插件的内部容器。这样，它们就成为了所有其他插件和主应用都可以注入和使用的“公共服务”。

### 示例：创建一个数据库插件

假设我们正在创建一个 `@stratix/database` 插件，它需要向其他插件提供一个数据库连接服务。

**1. 定义内部服务**

```typescript title="plugins/database/src/internal-connection.service.ts"
// 这个服务只在插件内部使用
export class InternalConnectionService {
  // ... 复杂的连接池和重连逻辑
}
```

**2. 创建服务适配器**

适配器是一个简单的类，它依赖于内部服务，并向外暴露一个简洁的 API。

```typescript title="plugins/database/src/adapters/database.adapter.ts"
import { Lifetime, RESOLVER } from 'awilix';
import { InternalConnectionService } from '../internal-connection.service';

// 服务适配器，将被注册到根容器
export class DatabaseAdapter {
  // 适配器必须是单例，以便在整个应用中共享
  static [RESOLVER] = { lifetime: Lifetime.SINGLETON };

  // 注入插件的内部服务
  constructor(private readonly connService: InternalConnectionService) {}

  // 暴露一个简单的公共方法
  public query(sql: string) {
    return this.connService.execute(sql);
  }
}
```

**3. 配置插件**

在插件的入口文件中，我们配置 `withRegisterAutoDI` 来发现内部服务和外部适配器。

```typescript title="plugins/database/src/index.ts"
import { withRegisterAutoDI } from '@stratix/core';

async function databasePlugin(fastify, options) {
  // ...
}

export default withRegisterAutoDI(databasePlugin, {
  // 发现并注册内部服务
  discovery: {
    patterns: ['src/**/*.service.ts'],
  },
  // 发现并注册服务适配器到根容器
  services: {
    enabled: true,
    patterns: ['src/adapters/**/*.adapter.ts'],
  },
});
```

**4. 在其他插件中使用**

现在，任何其他插件（比如 `OrderPlugin`）都可以直接注入并使用 `DatabaseAdapter`。

```typescript title="plugins/order/src/order.service.ts"
import { DatabaseAdapter } from '@stratix/database'; // 假设已发布为 npm 包

export class OrderService {
  // 直接注入 DatabaseAdapter
  constructor(private readonly db: DatabaseAdapter) {}

  async createOrder(orderData: any) {
    await this.db.query('INSERT INTO orders ...');
  }
}
```

通过这种方式，`@stratix/core` 的插件化架构在保证了模块独立性的同时，也提供了清晰、安全的跨插件通信机制，是构建大型、可维护系统的坚实基础。
