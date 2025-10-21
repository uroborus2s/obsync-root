---
sidebar_position: 3
---

# 快速开始

在本章节中，我们将从零开始构建一个完整的 "Hello World" 应用。这个应用将包含一个控制器和一个服务，并演示 `@stratix/core` 的核心特性，如依赖注入和路由。

## 步骤 1: 创建项目结构

在完成 [安装](./installation.md) 步骤后，我们建议使用以下目录结构：

```
my-stratix-app/
├── src/
│   ├── main.ts           # 应用入口文件
│   ├── app.service.ts    # 业务逻辑服务
│   └── app.controller.ts # HTTP 控制器
├── package.json
└── tsconfig.json
```

## 步骤 2: 创建服务

服务是处理业务逻辑的地方。让我们创建一个 `AppService`，它将提供问候语。

```typescript title="src/app.service.ts"
import { Lifetime, RESOLVER } from 'awilix';

export class AppService {
  // 定义该服务在 DI 容器中的生命周期为 SCOPED
  // SCOPED 表示每个请求都会创建一个新的实例
  static [RESOLVER] = {
    lifetime: Lifetime.SCOPED,
  };

  getHello(): string {
    return 'Hello, Stratix!';
  }

  getHelloFor(name: string): string {
    return `Hello, ${name}!`;
  }
}
```

## 步骤 3: 创建控制器

控制器负责接收 HTTP 请求，并调用相应的服务来处理它们。

```typescript title="src/app.controller.ts"
import { Controller, Get } from '@stratix/core';
import { Lifetime, RESOLVER } from 'awilix';
import { AppService } from './app.service';
import type { FastifyRequest } from 'fastify';

@Controller('/app') // 定义路由前缀为 /app
export class AppController {
  static [RESOLVER] = {
    lifetime: Lifetime.SCOPED,
  };

  // 通过构造函数注入 AppService
  constructor(private readonly appService: AppService) {}

  @Get('/hello') // 匹配 GET /app/hello
  public sayHello() {
    const message = this.appService.getHello();
    return { message };
  }

  @Get('/hello/:name') // 匹配 GET /app/hello/your-name
  public sayHelloTo(request: FastifyRequest) {
    const { name } = request.params as { name: string };
    const message = this.appService.getHelloFor(name);
    return { message };
  }
}
```

**代码解释**:
- `@Controller('/app')`: 将 `AppController` 标记为一个控制器，并为其所有路由设置了 `/app` 的前缀。
- `constructor(private readonly appService: AppService)`: 这是依赖注入的核心。`@stratix/core` 的 DI 容器会自动解析并注入 `AppService` 的实例。
- `@Get('/hello')`: 定义了一个处理 `GET /app/hello` 请求的路由处理器。

## 步骤 4: 引导应用

现在，我们需要在入口文件 `main.ts` 中将所有部分组合起来，并启动应用。

```typescript title="src/main.ts"
import 'reflect-metadata';
import { Stratix } from '@stratix/core';

async function bootstrap() {
  console.log('🚀 Starting application...');

  const app = await Stratix.run({
    type: 'web', // 应用类型为 Web 应用
    config: {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      // 自动发现和注册应用级模块
      applicationAutoDI: {
        enabled: true,
        // 扫描所有 .service.ts 和 .controller.ts 文件
        patterns: ['**/*.service.ts', '**/*.controller.ts'],
      },
      plugins: [], // 您可以在此添加其他 Fastify 插件
    },
  });

  const address = app.getAddress();
  console.log(`✅ Server listening at http://${address.address}:${address.port}`);
}

bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
```

**代码解释**:
- `Stratix.run()`: 这是启动应用的入口函数。
- `applicationAutoDI`: 这是框架的自动发现配置。我们告诉它去扫描项目中的所有 `*.service.ts` 和 `*.controller.ts` 文件，并自动将它们注册到 DI 容器中。这就是为什么我们不需要手动创建 `AppService` 和 `AppController` 实例的原因。

## 步骤 5: 启动并测试

使用以下命令启动您的应用：

```bash
pnpm dev
# 或者
npx ts-node src/main.ts
```

应用启动后，您可以使用 `curl` 或浏览器来测试您的 API：

```bash
# 测试 /app/hello
curl http://localhost:3000/app/hello
# 响应: {"message":"Hello, Stratix!"}

# 测试 /app/hello/:name
curl http://localhost:3000/app/hello/World
# 响应: {"message":"Hello, World!"}
```

恭喜！您已经成功构建并运行了您的第一个 `@stratix/core` 应用。现在您可以继续探索文档的 [核心概念](../core-concepts/bootstrap-config.md) 部分，以了解更多高级功能。
