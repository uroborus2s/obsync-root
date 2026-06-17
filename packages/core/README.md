# @stratix/core

一个轻量、现代且功能强大的 Node.js 应用框架，基于 [Fastify](https://www.fastify.io/) 构建。

`@stratix/core` 旨在提供一个优雅、高效的开发体验，通过依赖注入、装饰器和模块化的设计，帮助您快速构建可扩展、可维护的 Web 应用、API 服务或后端任务。

## 核心特性

- **基于 Fastify**: 继承了 Fastify 的高性能和丰富的插件生态。
- **依赖注入 (DI)**: 内置强大的 `awilix` 容器，实现控制反转 (IoC)，轻松管理服务依赖。
- **装饰器驱动**: 使用 TypeScript 装饰器（如 `@Service`, `@Repository`, `@Controller`, `@Get`, `@Post`, `@Executor`）以声明式的方式定义服务、仓储、路由和任务执行器。
- **插件化架构**: 每个功能模块都可以作为插件进行组织，拥有独立的 DI 容器和生命周期管理。
- **统一应用发现管道**: `Stratix.run()` 只通过 `discovery` 配置执行应用级扫描、元数据分析、DI 注册和控制器路由绑定。
- **强大的命令行工具 (CLI)**: 内置 `stratix` 命令行工具，提供配置文件的加密、解密、验证和密钥生成等安全功能。
- **环境和配置管理**: 自动加载 `.env` 文件，支持多环境配置优先级覆盖和变量扩展。
- **统一的错误处理**: 提供集中的错误处理工具和模式，增强应用的健壮性。

## 安装

```bash
pnpm add @stratix/core
# 或者使用 npm / yarn
npm install @stratix/core
yarn add @stratix/core
```

在 `tsconfig.json` 中启用以下配置：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## 快速开始

下面是一个简单的 "Hello World" 示例，展示了如何创建一个控制器并启动一个 Web 应用。

**1. 创建控制器 `src/hello.controller.ts`**

```typescript
import { Controller, Get, Service } from '@stratix/core';

@Service()
export class GreetingService {
  message(name = 'Stratix') {
    return `Hello, ${name}!`;
  }
}

@Controller()
export class HelloController {
  constructor(private greetingService: GreetingService) {}

  @Get('/')
  public async sayHello() {
    return { message: this.greetingService.message() };
  }

  @Get('/:name')
  public async sayHelloTo(request: any) {
    const { name } = request.params;
    return { message: this.greetingService.message(name) };
  }
}
```

**2. 创建应用入口文件 `src/main.ts`**

```typescript
import { Stratix } from '@stratix/core';

async function bootstrap() {
  const app = await Stratix.run({
    type: 'web',
    config: {
      server: {
        port: 3000,
        host: '0.0.0.0'
      },
      plugins: [],
      autoLoad: {},
      discovery: {
        enabled: true,
        patterns: ['**/*.ts'],
        routing: {
          enabled: true,
          prefix: '/api'
        }
      }
    }
  });

  console.log(`🚀 Server listening at http://localhost:3000`);
}

bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
```

**3. 启动应用**

```bash
npx ts-node src/main.ts
```

现在，您可以通过浏览器或 `curl` 访问以下地址：

- `http://localhost:3000/api/` -> `{"message":"Hello, Stratix!"}`
- `http://localhost:3000/api/world` -> `{"message":"Hello, world!"}`

## 核心概念

### 控制器 (Controller)

控制器负责处理传入的 HTTP 请求。使用 `@Controller()` 装饰器标记一个类作为控制器，使用 `@Get`, `@Post` 等 HTTP 方法装饰器定义路由。路由前缀由 `discovery.routing.prefix` 统一配置。

### 依赖注入 (Dependency Injection)

`@stratix/core` 使用 `awilix` 实现依赖注入。应用级自动发现只注册带有 Stratix 元数据的类：`@Service()`、`@Repository()`、`@Component()`、`@Controller()` 和 `@Executor()`。

```typescript
import { Controller, Get, Service } from '@stratix/core';

@Service({ lifetime: 'SINGLETON' })
class MyService {
  doSomething() {
    return 'done';
  }
}

@Controller()
class MyController {
  constructor(private myService: MyService) {}

  @Get('/action')
  action() {
    return this.myService.doSomething();
  }
}
```

### 生命周期 (Lifecycle)

服务可以通过实现特定的方法名来挂载到应用的生命周期中。这是一种基于约定的方法，无需额外装饰器。

- `onReady()`: 在所有插件加载完成，应用准备好接受请求时调用。
- `onClose()`: 在应用关闭时调用。
- `onListen()`: 在 `fastify.listen()` 成功后调用。

```typescript
@Service({ lifetime: 'SINGLETON' })
class DatabaseService {
  async onReady() {
    console.log('Database connection established.');
    // 在此执行初始化连接等操作
  }

  async onClose() {
    console.log('Closing database connection.');
    // 在此执行资源清理操作
  }
}
```

## 命令行工具 (CLI)

`@stratix/core` 提供了一个强大的 `stratix` 命令行工具。

### 生成安全密钥

```bash
npx stratix config generate-key
```

### 加密配置文件

```bash
# 创建一个 JSON 配置文件，例如 config.json
echo '{"database": {"password": "my-secret-password"}}' > config.json

# 加密文件
npx stratix config encrypt config.json
```

该命令会输出一个加密后的字符串，您可以将其设置为环境变量 `STRATIX_SENSITIVE_CONFIG`。

### 解密配置

```bash
npx stratix config decrypt "<encrypted-string>"
```

## 贡献

欢迎社区贡献！如果您发现任何问题或有功能建议，请随时提交 Issues 或 Pull Requests。
