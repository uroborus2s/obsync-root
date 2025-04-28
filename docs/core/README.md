# Stratix框架文档

Stratix是一个基于Fastify的纯配置Node.js框架，以函数式编程思想为核心，追求简洁、透明和组合性。

## 核心设计文档

- [框架设计文档](./stratix-design.md) - Stratix框架的整体设计和架构
- [核心插件设计](./stratix-plugins.md) - 核心插件的设计和使用方法
- [Fastify集成指南](./stratix-fastify-integration.md) - Stratix与Fastify的集成方式

## 主要特性

- **纯配置驱动**：通过配置文件定义应用结构和行为
- **函数式编程**：强调纯函数、不可变数据和组合性
- **插件化架构**：所有功能通过插件实现和扩展
- **高性能**：基于Fastify的高性能基础
- **类型安全**：完全支持TypeScript，提供端到端类型安全

## 快速入门

```typescript
// 创建应用
import { createApp } from 'stratix';

const app = createApp({
  name: 'my-app',
  logger: {
    level: 'info'
  }
});

// 注册插件
app.register(require('@stratix/web'), {
  port: 3000
});

// 启动应用
await app.start();
```

## 设计理念

Stratix框架的设计理念是通过纯配置和函数式编程思想，为开发者提供一个简洁、透明、可组合的Node.js应用开发体验。框架基于Fastify构建，继承了Fastify的高性能和强大的插件系统，同时提供了更加简化和声明式的API。

通过配置驱动的方式，Stratix让开发者能够用最少的代码实现复杂的功能，同时保持代码的清晰和可维护性。框架的一切功能都通过插件实现，这使得应用可以按需组合不同的功能模块，实现高度定制的应用架构。 