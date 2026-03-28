# 常见错误

这一页专门列出 Stratix 新手最容易犯、而且一犯就会浪费很多时间的问题。

## 1. 把 `@Controller()` 当成有前缀的装饰器

错误写法：

```ts
@Controller('/users')
```

推荐写法：

```ts
@Controller()
export default class UserController {
  @Get('/users')
  async list() {}
}
```

结论：当前主路径里，路由路径直接写在方法装饰器上，不要把前缀塞进 `@Controller()`。

## 2. 在 `service` 里直接访问数据库

错误思路：

- “我在 service 里顺手查个表更快”

为什么错：

- service 会很快变成“既写业务又写持久化”的混合层
- 后面测试、复用和事务收敛都会变得混乱

正确做法：

- service 只调 repository
- repository 承担数据库访问

## 3. 把 `stratix.config.ts` 写成直接导出对象

错误写法：

```ts
export default {
  server: {
    port: 3000
  }
};
```

更稳妥的写法：

```ts
import type { StratixConfig } from '@stratix/core';

export default function createConfig(): StratixConfig {
  return {
    server: {
      host: '0.0.0.0',
      port: 3000
    },
    plugins: [],
    applicationAutoDI: {
      enabled: true
    }
  };
}
```

## 4. 以为 `Stratix.run({ config })` 是主要配置入口

在当前实现里，最稳妥的主路径仍然是 `src/stratix.config.ts`。如果你把大量项目配置堆到 `Stratix.run({ config })`，很容易和真实启动链路脱节。

结论：项目配置优先写 `src/stratix.config.ts`。

## 5. 把普通工具类扔进扫描目录

默认扫描目录里任意 class 都可能被框架当作可发现对象处理。

容易出问题的目录：

- `src/controllers`
- `src/services`
- `src/repositories`
- `src/executors`

如果某个文件只是：

- 常量
- 工具函数
- 临时辅助类
- schema class

不要随便放进这些目录。

## 6. 忽视 `stratix doctor`

很多目录结构或项目元数据问题，本来可以在很早就被 `stratix doctor` 发现，但新手经常只顾着启动项目。

建议：

- 每次新增 preset 后跑一次
- 每次大改目录结构后跑一次
- 每次准备提交前跑一次

## 7. 一开始就把所有插件都装上

这会导致：

- 配置复杂
- 启动链路复杂
- 你很难判断问题到底来自哪一层

更好的做法：

- 从最小组合起步
- 哪个业务真正需要哪个插件，再补哪个 preset

## 8. 不知道该用 `repository` 还是 `business-repository`

判断方式：

- 单表 CRUD、普通查询：`repository`
- 多表一致性、耐久化流程、claim/checkpoint/finalize：`business-repository`

如果你只是做普通管理后台 API，不要一开始就上 `business-repository`。

## 9. 加了 `@stratix/tasks` 却没理解 `executor`

`executor` 不是“随便起个后台函数目录”，它通常对应一个可执行任务单元。只有当你确实使用任务、调度或工作流时，再去认真设计 `src/executors/`。

## 10. 还没跑通健康检查就开始堆业务

正确顺序应该是：

1. 先访问 `/health`
2. 再生成 `user` 这类业务资源
3. 再开始接数据库或其他插件

如果连脚手架默认健康检查都没跑通，后面遇到的每个问题都会更难定位。

## 11. 以为加了 `database` preset 就会自动连上数据库

`stratix add preset database` 的真实作用主要是：

- 给项目补上 `@stratix/database` 依赖
- 给 `.env.example` 补一组默认数据库环境变量键
- 让 `src/config/stratix.generated.ts` 里出现数据库插件骨架

它不会自动帮你完成这些事情：

- 不会自动创建真实数据库表
- 不会自动把 `.env` 里的 `DB_HOST` 直接映射成 `sensitiveConfig.database`
- 不会自动生成你的业务 repository 实现

如果你加完 preset 就直接启动，然后发现数据库没有连上，先排查三件事：

1. `src/stratix.config.ts` 是否真的把数据库配置传给了 `createGeneratedConfig(...)`
2. 真实数据库里是否已经存在对应表
3. 你的 repository 是否已经从演示数据实现切到了 `BaseRepository`

## 12. 以为“模块化”会自动带来新的运行时边界

`src/modules/users`、`src/modules/billing` 这种目录结构，首先是代码组织方式，不是新的容器、不是新的应用、也不是 Nest 风格的模块系统。

它的主要价值是：

- 按业务域收拢文件
- 降低根目录噪音
- 让多人协作时更容易分边界

它不会自动帮你完成这些事情：

- 不会自动生成模块级 DI 容器
- 不会自动隔离跨模块依赖
- 不会自动把旧文件从根目录迁进去

## 13. 以为 `business-repository` 和 `executor` 生成器会自动识别你现有模块

当前 CLI 的现实行为是：

- `stratix generate module billing` 会生成 `src/modules/billing/...`
- `stratix generate business-repository order` 默认仍然生成到 `src/repositories/`
- `stratix generate executor order-sync` 默认仍然生成到 `src/executors/`

如果你的项目已经模块化了，这两个生成结果通常需要你手工移动到对应模块目录，再修正导入。

所以正确理解应该是：

- CLI 负责给你起始骨架
- 模块内的最终归位和演进，由你来维护
