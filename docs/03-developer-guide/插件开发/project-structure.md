# 项目结构

这一页专门解释“CLI 初始化出来的插件项目，每个目录到底负责什么”。如果你先把目录职责看懂，后面照着做插件就不会乱。

## 一个标准插件项目长什么样

```text
src/
  index.ts
  config/
    plugin-config.ts
  adapters/
  services/
  repositories/
  controllers/
  executors/
  types/
```

## 最重要的两个入口

### `src/index.ts`

这是插件入口。一个由 CLI 生成的典型入口会长这样：

```ts
import type { FastifyInstance } from '@stratix/core';
import { withRegisterAutoDI } from '@stratix/core';
import type { IntegrationPluginOptions } from './config/plugin-config.js';

async function pingPlugin(
  fastify: FastifyInstance,
  _options: IntegrationPluginOptions
): Promise<void> {
  fastify.log.info('Initializing @acme/ping-plugin...');
}

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

这段代码做了三件事：

- 定义插件真正被 Fastify 调用的函数
- 通过 `withRegisterAutoDI` 接入 Stratix 的自动发现和自动注册机制
- 声明哪些目录里的类需要被扫描并注册

### `src/config/plugin-config.ts`

这是插件配置合同。它至少要解决两个问题：

- 插件接受哪些配置项
- 不传配置时，默认值是什么

一个最小版本通常像这样：

```ts
export interface IntegrationPluginOptions {
  debug?: boolean;
}

export function defineIntegrationPluginDefaults(): IntegrationPluginOptions {
  return {
    debug: false
  };
}
```

## 每个目录的职责

### `src/adapters/`

这里是“资源访问层”。凡是调用第三方 SDK、HTTP API、数据库客户端、Redis 客户端、文件系统、对象存储之类的代码，都应该优先落在 adapter。

adapter 的职责是：

- 连接外部系统
- 统一参数和错误
- 提供稳定的调用接口

不要在 controller 里直接写第三方 SDK 调用，也不要在 service 里到处散落外部访问细节。

### `src/services/`

这里是插件的业务逻辑层。service 负责把 adapter 暴露的能力组织成真正能被应用使用的操作。

service 的职责是：

- 编排一个或多个 adapter
- 承担插件内部的业务规则
- 决定对外暴露什么方法

### `src/repositories/`

只有你的插件确实涉及持久化时，才需要 repository。  
如果你只是做 HTTP/SDK 集成插件，这个目录可以暂时为空。

### `src/controllers/`

controller 只负责 HTTP 入口。它的职责是：

- 接请求
- 调 service
- 返回响应

controller 不应该直接调用 adapter，也不应该承载复杂业务逻辑。

### `src/executors/`

如果你的插件要和 `@stratix/tasks` 体系集成，或者要提供任务执行单元，就把执行逻辑写在 executor。

### `src/types/`

当 adapter、service、controller 之间开始共享类型时，把公共类型集中到这里，避免类型散落在业务类里。

## 新手最容易犯的结构错误

- 把所有逻辑都堆到 `src/index.ts`
- 在 controller 里直接调用第三方 SDK
- 用 service 直接代替 adapter，导致外部访问层不可替换
- 插件已经涉及数据库，但 repository 仍然缺位
- 插件配置项加了很多，但没有统一放在 `plugin-config.ts`

## 结构判断口诀

可以按这个顺序判断代码该放哪里：

1. 这是访问外部系统吗？
   - 是：先放 adapter
2. 这是业务编排吗？
   - 是：放 service
3. 这是 HTTP 入口吗？
   - 是：放 controller
4. 这是任务执行单元吗？
   - 是：放 executor
5. 这是持久化逻辑吗？
   - 是：放 repository
