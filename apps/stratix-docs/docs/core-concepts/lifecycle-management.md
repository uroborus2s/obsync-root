---
sidebar_position: 4
---

# 生命周期管理

在复杂的应用中，能够在应用启动、处理请求、关闭等关键时刻执行特定逻辑至关重要。`@stratix/core` 提供了一套强大而直观的生命周期管理系统，它分为两个层面：

1.  **应用级生命周期**: 宏观上管理整个应用的启动和关闭流程。
2.  **服务级生命周期**: 微观上管理单个服务或组件的初始化和销毁，与 Fastify 的钩子系统深度集成。

## 服务级生命周期 (基于约定)

`@stratix/core` 最具特色的设计之一就是其基于**方法名约定**的服务级生命周期管理。您不需要任何特殊的装饰器，只需在您的服务类中实现特定的方法，框架的插件系统就会自动发现它们，并将它们挂载到 Fastify 的生命周期钩子中。

### 可用的生命周期方法

| 方法名 | 对应的 Fastify 钩子 | 执行时机 |
| :--- | :--- | :--- |
| `onRegister` | `onRegister` | 在插件被注册到 Fastify 实例后立即执行。 |
| `onRoute` | `onRoute` | 每当一个新路由被注册时执行。 |
| `onReady` | `onReady` | 在所有插件加载完成，服务器准备好接受请求时执行。**这是执行初始化逻辑（如数据库连接）最常用的地方。** |
| `onListen` | `onListen` | 在服务器成功启动并开始监听指定端口后执行。 |
| `preClose` | `preClose` | 在 `fastify.close()` 被调用，服务器即将关闭时执行。 |
| `onClose` | `onClose` | 在服务器完全关闭后执行。**这是执行资源清理（如断开数据库连接）最常用的地方。** |

### 示例：数据库服务

下面是一个典型的数据库服务，它利用生命周期方法来管理连接。

```typescript title="src/database.service.ts"
import { Lifetime, RESOLVER } from 'awilix';

export class DatabaseService {
  static [RESOLVER] = { lifetime: Lifetime.SINGLETON };

  private connection: any;

  // 在应用准备就绪时连接数据库
  public async onReady() {
    console.log('Connecting to the database...');
    this.connection = await this.createConnection();
    console.log('Database connection established.');
  }

  // 在应用关闭时断开连接
  public async onClose() {
    if (this.connection) {
      console.log('Closing database connection...');
      await this.connection.close();
      console.log('Database connection closed.');
    }
  }

  public async query(sql: string) {
    if (!this.connection) {
      throw new Error('Database is not connected.');
    }
    return this.connection.query(sql);
  }

  private async createConnection() {
    // 模拟异步连接过程
    return new Promise(resolve => setTimeout(() => resolve({ query: (sql) => `Result for: ${sql}`, close: () => {} }), 500));
  }
}
```

**工作原理**:
当 `DatabaseService` 被 DI 容器自动发现时，`@stratix/core` 的插件系统会通过反射检查该类的实例是否包含名为 `onReady` 或 `onClose` 的方法。如果存在，它会自动将这些方法注册到 Fastify 对应的 `onReady` 和 `onClose` 钩子中。整个过程完全自动化，无需手动配置。

## 应用级生命周期

除了服务级的钩子，您可能还需要在更高层面、应用启动和关闭的特定时间点执行逻辑。这可以通过在 `Stratix.run()` 的配置中提供 `lifecycleHooks` 来实现。

```typescript title="src/main.ts"
import { Stratix } from '@stratix/core';

async function bootstrap() {
  await Stratix.run({
    // ...其他配置
    lifecycleHooks: {
      // 在所有插件注册和服务器启动之前执行
      beforeStart: async () => {
        console.log('Application is about to start...');
        // 例如：检查关键环境变量
      },
      // 在所有插件注册完成，服务器即将启动时执行
      afterStart: async (fastify) => {
        console.log('Application has started, server is about to listen.');
      },
      // 在服务器关闭之前执行
      beforeClose: async (fastify) => {
        console.log('Application is about to close...');
      },
      // 在服务器完全关闭后执行
      afterClose: async (fastify) => {
        console.log('Application has been closed.');
      },
    },
  });
}
```

### 应用级与服务级生命周期的关系

- **启动流程**: `beforeStart` (应用) -> 插件注册 (包含服务级 `onRegister`) -> `afterStart` (应用) -> `onReady` (服务) -> `onListen` (服务)
- **关闭流程**: `beforeClose` (应用) -> `preClose` (服务) -> `onClose` (服务) -> `afterClose` (应用)

通过结合这两个层面的生命周期管理，您可以精确地控制应用中任何组件的初始化和销毁时机，构建出健壮、可预测的系统。
