---
sidebar_position: 2
---

# 创建你的第一个插件

本教程将引导您从零开始创建一个简单的日志插件。这个插件会在每个进入的请求上记录一条日志。通过这个过程，您将掌握插件开发的基本流程。

## 步骤 1: 设置插件项目

一个插件本质上是一个独立的 npm 包。让我们为它创建一个目录。

```bash
# 在您的项目根目录
mkdir -p src/plugins/logger
touch src/plugins/logger/index.ts
```

## 步骤 2: 编写插件逻辑

插件的核心是一个标准的 Fastify 插件函数。在这个函数里，我们可以使用 Fastify 的所有 API，例如注册钩子。

```typescript title="src/plugins/logger/index.ts"
import { withRegisterAutoDI } from '@stratix/core';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

// 1. 定义插件的选项类型 (可选，但推荐)
interface LoggerPluginOptions {
  prefix?: string;
}

// 2. 编写标准的 Fastify 插件函数
async function loggerPlugin(
  fastify: FastifyInstance,
  options: LoggerPluginOptions
) {
  const prefix = options.prefix || '[RequestLogger]';

  // 使用 Fastify 的 onRequest 钩子
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    fastify.log.info(`${prefix} - ${request.method} ${request.url}`);
  });

  fastify.log.info('Logger plugin has been registered.');
}

// 3. 使用 withRegisterAutoDI 包装插件
// fp() 用于确保钩子是全局的
export default withRegisterAutoDI(fp(loggerPlugin), {
  // 这个简单插件没有需要自动发现的服务或控制器，所以 discovery 是空的
  discovery: {
    patterns: [],
  },
});
```

**代码解释**:
- 我们定义了一个标准的 Fastify 插件 `loggerPlugin`，它接收 `fastify` 实例和 `options` 对象。
- 我们使用了 `fastify.addHook` 来在请求生命周期的早期执行我们的日志记录逻辑。
- 我们使用了 `fp` (来自 `fastify-plugin`) 来包装我们的插件。这很重要，它告诉 Fastify 不要将此插件封装在独立的作用域中，从而确保我们注册的 `onRequest` 钩子能够对**所有**路由生效，而不仅仅是插件内部定义的路由。
- 最后，我们使用 `withRegisterAutoDI` 对整个插件进行包装，即使我们没有使用自动发现功能。这是将其集成到思齐框架生态中的标准做法。

## 步骤 3: 在主应用中注册插件

现在，我们可以在主应用的配置文件中加载并使用这个新创建的插件。

```typescript title="stratix.config.ts"
import { defineConfig } from '@stratix/core';
import loggerPlugin from './src/plugins/logger'; // 导入我们的插件

export default defineConfig(() => ({
  server: { port: 3000 },
  applicationAutoDI: {
    enabled: true,
    patterns: ['src/**/*.controller.ts'],
  },
  plugins: [
    // 在插件列表中添加我们的日志插件
    {
      name: 'logger', // 为插件指定一个唯一的名称
      plugin: loggerPlugin,
      options: { // 传递给插件的选项
        prefix: '[HTTP]',
      },
    },
    // ... 其他插件
  ],
}));
```

## 步骤 4: 启动并验证

现在启动您的应用 (`pnpm dev`)。当您向任何一个路由发送请求时，您应该能在控制台中看到由您的日志插件输出的日志。

```
[1698395400000] INFO: [HTTP] - GET /app/hello
...
[1698395401000] INFO: [HTTP] - GET /users/123
```

恭喜！您已经成功创建并集成了一个功能插件。这个简单的例子展示了插件开发的基本模式。您可以基于这个模式，通过组合 Fastify 的 API 和思齐框架的依赖注入、生命周期管理等高级功能，来构建更复杂的插件。
