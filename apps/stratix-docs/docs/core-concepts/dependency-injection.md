---
sidebar_position: 3
---

# 依赖注入 (DI)

依赖注入 (Dependency Injection) 是一种设计模式，其核心思想是“控制反转” (Inversion of Control, IoC)。简单来说，一个类不应该自己创建它所依赖的对象，而应该由外部的“容器”来创建并“注入”给它。

`@stratix/core` 深度集成了强大的依赖注入容器 [Awilix](https://github.com/jeffijoe/awilix)，让您能够轻松地管理应用中各个组件（如服务、控制器、仓库等）之间的依赖关系。

## 为什么使用 DI？

- **解耦 (Decoupling)**: 类不再与它们的具体依赖实现紧密耦合。例如，一个 `UserService` 可能依赖一个 `UserRepository` 接口，而不是一个具体的 `PostgresUserRepository` 实现。这使得更换实现（比如从 Postgres 换到 MongoDB）变得非常容易。
- **可测试性 (Testability)**: 在进行单元测试时，您可以轻松地用“模拟对象” (Mock) 来替换真实的依赖，从而隔离被测试的单元，使测试更简单、更可靠。
- **代码清晰度**: 依赖关系在构造函数中被明确声明，使得代码的意图更加清晰。
- **生命周期管理**: DI 容器可以管理对象的生命周期，确保在需要时创建实例，并在适当的时候销毁它们，有效防止内存泄漏。

## 如何工作：`RESOLVER`

`@stratix/core` 采用了一种非侵入式的方式来配置依赖注入——通过在类上定义一个静态 `RESOLVER` 属性。这借鉴了 `awilix` 的原生 API，无需额外的装饰器。

```typescript
import { Lifetime, RESOLVER } from 'awilix';

export class DatabaseService {
  // 通过定义 RESOLVER，告诉 DI 容器如何管理这个类
  static [RESOLVER] = {
    // 将这个服务注册为单例
    lifetime: Lifetime.SINGLETON,
  };

  connect() {
    console.log('Database connected!');
  }
}
```

### `Lifetime` (生命周期)

`lifetime` 属性决定了 DI 容器如何创建和复用一个类的实例。

- **`Lifetime.SINGLETON`**: **单例模式**。在整个应用的生命周期中，该类只会有一个实例。无论它被注入到哪里，都是同一个对象。非常适合用于数据库连接、全局配置、日志服务等。

- **`Lifetime.SCOPED`**: **作用域模式**。在 `@stratix/core` 中，一个“作用域”通常对应于一个传入的 HTTP 请求。对于每个新的请求，DI 容器都会创建一个新的实例。同一个请求中的不同组件（例如，一个控制器和一个服务）如果都依赖这个作用域服务，它们将获得相同的实例。请求结束后，该实例会被销毁。这是**控制器**和大多数业务服务的**推荐生命周期**。

- **`Lifetime.TRANSIENT`**: **瞬时模式**。每次请求一个实例时，DI 容器都会创建一个全新的实例。即使在同一个请求作用域内，每次注入也都是新对象。

## 构造函数注入

一旦一个类被 DI 容器管理（通过 `applicationAutoDI` 自动发现或手动注册），它的依赖就会通过构造函数被自动注入。

```typescript
// database.service.ts
import { Lifetime, RESOLVER } from 'awilix';

export class DatabaseService {
  static [RESOLVER] = { lifetime: Lifetime.SINGLETON };
  // ...
}

// user.service.ts
import { Lifetime, RESOLVER } from 'awilix';
import { DatabaseService } from './database.service';

export class UserService {
  static [RESOLVER] = { lifetime: Lifetime.SCOPED };

  // 在构造函数中声明依赖
  constructor(private readonly dbService: DatabaseService) {}

  async findUser(id: string) {
    // this.dbService 会被自动注入
    return this.dbService.query('SELECT * FROM users WHERE id = ?', [id]);
  }
}
```

**注入是如何发生的？**

1.  **自动发现**: 当应用启动时，`applicationAutoDI` 配置会扫描您的项目文件。
2.  **注册**: 当框架发现 `DatabaseService` 和 `UserService` 时，它会根据文件名（转换为驼峰式，如 `databaseService` 和 `userService`）将它们注册到 DI 容器中。
3.  **解析**: 当一个请求进来，需要 `UserService` 的实例时，容器会查看其构造函数，发现它需要一个 `DatabaseService`。
4.  **注入**: 容器会先提供 `DatabaseService` 的单例实例，然后用它来创建 `UserService` 的新实例，最后完成注入。

## 自动发现与命名约定

框架的 `applicationAutoDI` 功能依赖于文件名来生成在 DI 容器中注册的名称。默认情况下，它遵循驼峰命名法。

- `user.service.ts` -> `userService`
- `app.controller.ts` -> `appController`
- `post-sql.repository.ts` -> `postSqlRepository`

因此，当您在一个类中注入另一个类时，参数名需要与这个转换后的名称匹配。

```typescript
// 注入 AppController
constructor(private readonly appController: AppController) {}

// 注入 PostSqlRepository
constructor(private readonly postSqlRepository: PostSqlRepository) {}
```

这种基于约定的注入方式使得代码非常整洁，无需为每个注入点添加额外的装饰器。
