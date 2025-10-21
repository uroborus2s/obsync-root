---
sidebar_position: 2
---

# 安装

在开始使用 `@stratix/core` 之前，请确保您的开发环境满足以下要求：

- [Node.js](https://nodejs.org/) >= 22.0.0
- [pnpm](https://pnpm.io/) (推荐), npm, 或 yarn

## 步骤 1: 初始化项目

如果您还没有一个 Node.js 项目，请先创建一个：

```bash
mkdir my-stratix-app
cd my-stratix-app
pnpm init
```

## 步骤 2: 安装依赖

安装 `@stratix/core` 以及其核心对等依赖 `reflect-metadata`。

```bash
pnpm add @stratix/core reflect-metadata
```

`@stratix/core` 内部使用了 `awilix` 进行依赖注入，并依赖 `fastify` 作为底层 Web 框架，这些都已作为直接依赖包含在内，您无需手动安装。

## 步骤 3: 配置 TypeScript

`@stratix/core` 是一个基于 TypeScript 的框架，并大量使用了装饰器。因此，您需要在 `tsconfig.json` 文件中启用以下两个编译器选项：

```json title="tsconfig.json"
{
  "compilerOptions": {
    // ... 其他配置
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    // ... 其他配置
  }
}
```

- `experimentalDecorators`: 启用对装饰器的实验性支持。
- `emitDecoratorMetadata`: 允许 TypeScript 编译器在编译时发出与装饰器相关的元数据，这是依赖注入系统正常工作所必需的。

## 步骤 4: 导入 `reflect-metadata`

这是最重要的一步，也是最容易忘记的一步。您**必须**在应用的入口文件的**最顶部**导入 `reflect-metadata`。这个库扩展了全局的 `Reflect` 对象，为装饰器元数据提供了运行时 API。

```typescript title="src/main.ts"
import 'reflect-metadata';

// ... 您的其他代码
```

> **重要提示**: `reflect-metadata` 只需要被导入一次。确保它在所有其他代码执行之前被加载。

## 推荐的开发依赖

为了获得更好的开发体验，我们推荐您安装以下开发依赖：

```bash
pnpm add -D typescript @types/node ts-node nodemon
```

- `typescript`: TypeScript 编译器。
- `@types/node`: Node.js 的类型定义。
- `ts-node`: 让您可以直接运行 TypeScript 文件而无需预先编译。
- `nodemon`: 监视文件变化并自动重启应用，非常适合开发环境。

您可以配置 `package.json` 的 `scripts` 来简化开发流程：

```json title="package.json"
{
  "scripts": {
    "dev": "nodemon src/main.ts",
    "start": "ts-node src/main.ts"
  }
}
```

现在，您的项目已经完全准备好了！让我们继续 [快速开始](./quick-start.md) 章节，构建您的第一个 Stratix 应用。
