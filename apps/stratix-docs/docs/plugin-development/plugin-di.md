---
sidebar_position: 3
---

# 插件的依赖注入

`withRegisterAutoDI` 最强大的功能之一就是为每个插件提供了一个独立的依赖注入（DI）容器。这确保了插件的内部依赖是自包含和隔离的，极大地提高了代码的可维护性和稳定性。

## 插件的内部容器

当您使用 `withRegisterAutoDI` 包装一个插件时，框架会在其内部悄悄地完成以下工作：

1.  **创建隔离容器**: 为该插件创建一个全新的、作用域隔离的 `awilix` 容器。
2.  **自动发现与注册**: 根据您在 `withRegisterAutoDI` 配置中提供的 `discovery.patterns`，扫描插件目录下的文件（如服务、控制器等）。
3.  **注册到内部容器**: 将所有发现的类自动注册到这个新创建的**内部容器**中。

这意味着，一个插件内部的所有依赖解析都在其自己的“沙箱”中完成，不会影响到主应用或其他插件。

### 示例：一个带有内部服务的插件

假设我们正在创建一个 `ProductPlugin`。

```typescript title="src/plugins/product/product.service.ts"
import { Lifetime, RESOLVER } from 'awilix';

// 这个服务只存在于 ProductPlugin 的内部容器中
export class ProductService {
  static [RESOLVER] = { lifetime: Lifetime.SCOPED };

  findProduct(id: string) {
    return { id, name: `Product ${id}` };
  }
}
```

```typescript title="src/plugins/product/product.controller.ts"
import { Controller, Get } from '@stratix/core';
import { ProductService } from './product.service';

@Controller('/products')
export class ProductController {
  // 注入同一个插件内的 ProductService
  constructor(private readonly productService: ProductService) {}

  @Get('/:id')
  public getProduct(request: any) {
    const { id } = request.params;
    return this.productService.findProduct(id);
  }
}
```

```typescript title="src/plugins/product/index.ts"
import { withRegisterAutoDI } from '@stratix/core';

async function productPlugin(fastify, options) {}

export default withRegisterAutoDI(productPlugin, {
  discovery: {
    // 自动发现并注册控制器和服务到插件的内部容器
    patterns: ['**/*.service.ts', '**/*.controller.ts'],
  },
});
```

在这个例子中，`ProductController` 能够成功注入 `ProductService`，因为它们都被注册到了 `ProductPlugin` 的同一个内部容器中。主应用或其他插件甚至不知道 `ProductService` 的存在。

## 访问插件选项

在插件的服务中，您可能需要访问传递给该插件的选项。`withRegisterAutoDI` 会自动将插件的 `options` 对象以 `pluginConfig` 的名称注册到插件的内部容器中。

```typescript
import { Lifetime, RESOLVER } from 'awilix';

export class ProductService {
  static [RESOLVER] = { lifetime: Lifetime.SCOPED };

  private readonly currency: string;

  // 注入名为 pluginConfig 的依赖
  constructor(private readonly pluginConfig: { currency?: string }) {
    this.currency = pluginConfig.currency || 'USD';
  }

  getProductPrice(id: string) {
    return { price: 99.99, currency: this.currency };
  }
}
```

## 插件间的通信：注入适配器

如 [插件化架构](../core-concepts/plugin-architecture.md) 中所述，当一个插件需要使用另一个插件的功能时，它应该注入该插件暴露的**服务适配器 (Service Adapter)**。

服务适配器被注册在**应用的根容器**中，因此它们是全局可用的。

### 示例：订单插件使用数据库插件

假设 `DatabasePlugin` 暴露了一个名为 `DatabaseAdapter` 的服务适配器。

```typescript title="src/plugins/order/order.service.ts"
import { Lifetime, RESOLVER } from 'awilix';
import { DatabaseAdapter } from '@stratix/database'; // 从数据库插件导入适配器类型

export class OrderService {
  static [RESOLVER] = { lifetime: Lifetime.SCOPED };

  // 注入在根容器中注册的 DatabaseAdapter
  constructor(private readonly databaseAdapter: DatabaseAdapter) {}

  public async createOrder(items: any[]) {
    // 使用适配器的方法
    const result = await this.databaseAdapter.query('INSERT INTO orders...');
    return result.rows[0];
  }
}
```

**注入流程**:
1. `OrderPlugin` 的内部容器需要一个 `OrderService` 实例。
2. 它发现 `OrderService` 的构造函数需要一个 `DatabaseAdapter`。
3. 它在自己的**内部容器**中查找 `databaseAdapter`。由于找不到，它会向上委托给**应用的根容器**。
4. 根容器找到了已注册的 `DatabaseAdapter` 实例，并将其提供给 `OrderService`。
5. 依赖注入完成。

这种父子容器的委托机制是 `awilix` 的核心特性，也是思齐框架插件化 DI 得以实现的关键。
