# 第一个生态插件实战

这一页带你从 0 到 1 做出一个真正能接进应用的生态插件。目标不是“看懂例子”，而是你照着做完之后，手里会有一个可构建、可注册、可访问的插件项目。

本文示例插件名：`@acme/ping-plugin`

它会提供三类能力：

- 一个 `PingAdapter`，模拟调用外部能力
- 一个 `PingService`，编排插件业务逻辑
- 一个 `PingController`，暴露 HTTP 路由 `/plugins/pings`

如果你不需要 HTTP，也可以只做到 adapter + service；但第一次建议把整条链路做完整。

## 第 1 步：初始化插件项目

```bash
stratix init plugin integration @acme/ping-plugin --pm pnpm
cd ping-plugin
```

为什么选 `integration` 模板：

- 它天然适合练习“adapter + service”这条主线
- 它默认带 `testing`，后面更容易补验证
- 结构完整，但复杂度还可控

## 第 2 步：生成插件内部资源

在插件项目根目录执行：

```bash
stratix generate plugin-adapter ping
stratix generate plugin-service ping
stratix generate plugin-controller ping
```

如果你还想让这个插件暴露一个执行器，再加：

```bash
stratix generate plugin-executor ping
```

执行后你至少会得到：

- `src/adapters/PingAdapter.ts`
- `src/services/PingService.ts`
- `src/controllers/PingController.ts`
- `src/executors/PingExecutor.ts`（如果你执行了上面的命令）

## 第 3 步：先定义插件配置

编辑 `src/config/plugin-config.ts`：

```ts
export interface IntegrationPluginOptions {
  debug?: boolean;
  prefix?: string;
}

export function defineIntegrationPluginDefaults(): IntegrationPluginOptions {
  return {
    debug: false,
    prefix: 'pong'
  };
}
```

这里的 `prefix` 不是必须的，但它能让你看到“插件配置是如何影响插件行为”的。

## 第 4 步：实现 adapter

编辑 `src/adapters/PingAdapter.ts`：

```ts
export default class PingAdapter {
  async execute(message: string): Promise<{ ok: boolean; message: string }> {
    return {
      ok: true,
      message: `pong:${message}`
    };
  }
}
```

先不要一开始就接真实第三方系统。第一次先让 adapter 跑通最小行为，等整条链路通了，再替换成真正的 SDK / HTTP 客户端。

## 第 5 步：实现 service

编辑 `src/services/PingService.ts`：

```ts
import type PingAdapter from '../adapters/PingAdapter.js';

export default class PingService {
  constructor(private readonly pingAdapter: PingAdapter) {}

  async run(input: string): Promise<{ ok: boolean; message: string }> {
    return this.pingAdapter.execute(input);
  }
}
```

这里要记住一个非常重要的约束：

- service 调 adapter
- controller 调 service
- controller 不直接调 adapter

## 第 6 步：实现 controller

编辑 `src/controllers/PingController.ts`：

```ts
import {
  Controller,
  Get,
  type FastifyReply,
  type FastifyRequest
} from '@stratix/core';
import type PingService from '../services/PingService.js';

@Controller()
export default class PingController {
  constructor(private readonly pingService: PingService) {}

  @Get('/plugins/pings')
  async list(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await this.pingService.run('hello-plugin');
    reply.send({
      success: true,
      data: result
    });
  }
}
```

到这里，你已经有了一个可以通过 HTTP 暴露出去的插件能力。

## 第 7 步：实现可选 executor

如果你已经生成了 `plugin-executor`，可以把 `src/executors/PingExecutor.ts` 改成这样：

```ts
import { Executor } from '@stratix/core';
import type PingService from '../services/PingService.js';

@Executor({
  name: 'ping',
  description: 'Simple ping executor exposed by ping plugin'
})
export default class PingExecutor {
  constructor(private readonly pingService: PingService) {}

  async execute(payload: { input?: string } = {}): Promise<{
    success: boolean;
    data: { ok: boolean; message: string };
  }> {
    const data = await this.pingService.run(payload.input || 'executor');
    return {
      success: true,
      data
    };
  }
}
```

如果你当前还没有 `@stratix/tasks` 使用场景，这一步可以跳过。

## 第 8 步：确认插件入口没有挡住自动发现

检查 `src/index.ts`，确认它仍然保留这些目录扫描配置：

```ts
export default withRegisterAutoDI<IntegrationPluginOptions>(pingPlugin, {
  discovery: {
    patterns: [
      'controllers/*.{ts,js}',
      'services/*.{ts,js}',
      'repositories/*.{ts,js}',
      'executors/*.{ts,js}'
    ]
  },
  services: {
    enabled: true,
    patterns: ['adapters/*.{ts,js}']
  }
});
```

这段配置的意义是：

- controller / service / repository / executor 走 `discovery`
- adapter 走 `services`

如果这些目录没被扫描到，类就不会被自动注册，你会看到“路由不存在”或“依赖注入失败”。

## 第 9 步：构建插件

```bash
pnpm build
```

如果模板带了 `testing` 预设，再执行：

```bash
pnpm test
```

构建通过意味着：

- TypeScript 类型已经打通
- 插件入口、controller、service、adapter 至少在静态层面能协同

## 第 10 步：把插件接进一个应用

在应用项目里安装并注册它：

```ts
// src/stratix.config.ts
import type { StratixConfig } from '@stratix/core';
import pingPlugin from '@acme/ping-plugin';

export default function createConfig(): StratixConfig {
  return {
    plugins: [
      {
        name: '@acme/ping-plugin',
        plugin: pingPlugin,
        options: {
          debug: true,
          prefix: 'pong'
        }
      }
    ]
  };
}
```

## 第 11 步：做最小验证

启动应用后，先验证路由：

```bash
curl http://127.0.0.1:3000/plugins/pings
```

你至少应该看到类似结构：

```json
{
  "success": true,
  "data": {
    "ok": true,
    "message": "pong:hello-plugin"
  }
}
```

如果你还接了 executor，再验证执行链路是否被发现。

## 第 12 步：什么时候算你真的“做完了一个插件”

下面这些条件都满足时，才算真正完成：

- 插件能独立 `pnpm build`
- 插件入口通过 `withRegisterAutoDI` 正常注册
- adapter / service / controller 至少有一条可运行链路
- 应用里能把插件注册进 `plugins`
- HTTP 或 executor 至少有一条真实可验证入口

## 新手最常见的失败点

- 只改了 `src/index.ts`，忘了真正写 adapter / service
- controller 生成了，但 discovery 没扫描到
- service 构造器参数名或类型不一致，导致 DI 失败
- 插件做出来了，但从没在真实应用里注册验证
- 把插件当应用写，最后无法复用

做完这页后，继续看 [开发工作流](./development-workflow.md)，把“偶尔做通一次”变成“每次都能稳定推进”。
