# 从单表 CRUD 到模块化项目

这一页解决的是一个非常真实的问题：

你已经按前面的文档做出了一个 `users` CRUD，但项目一旦继续长大，`src/controllers`、`src/services`、`src/repositories` 很快就会变成“所有业务都堆在根目录”的状态。

这时候你需要的不是再写一个 CRUD，而是把项目从“能跑”推进到“还能继续扩展”。

本页会带你回答 4 个关键问题：

1. 什么时候继续用扁平目录就够了
2. 什么时候应该升级到 `src/modules/*`
3. 什么时候该引入 `business-repository`
4. 什么时候才真的需要 `executor` 和 `@stratix/tasks`

## 先给你一个结论

最稳妥的演进顺序通常是：

1. 先做出单表 CRUD
2. 再按业务域拆成模块目录
3. 再在个别复杂模块里引入 `business-repository`
4. 最后才在确实需要时引入 `executor` 和 `tasks`

不要一开始把这四步同时做完。那样对新手来说复杂度太高，也很难定位问题。

## 第 1 步：什么时候继续用扁平目录就够了

下面这些情况，继续用根目录下的：

- `src/controllers`
- `src/services`
- `src/repositories`

通常完全没问题：

- 你只有 1 到 3 个业务资源
- 业务都很简单，基本都是单表 CRUD
- 团队人数少，暂时没有明显的边界冲突
- 你还在快速试错阶段

如果你的项目现在只是：

- `UserController`
- `UserService`
- `UserRepository`
- `OrderController`
- `OrderService`
- `OrderRepository`

而且大家都还能一眼找到文件，那就没必要为了“看起来高级”立刻上模块化。

## 第 2 步：哪些信号说明你该升级到模块目录了

当你开始出现下面这些现象，就应该认真考虑 `src/modules/*`：

### 1. 根目录文件越来越多

典型症状：

- `src/controllers` 里十几个文件
- `src/services` 里十几个文件
- 同一个业务域的文件被拆散在不同根目录下，很难一起看

### 2. 同一个业务域开始出现多张表和多个协作者

例如一个“订单”领域里同时开始有：

- `OrderController`
- `OrderService`
- `OrderRepository`
- `OrderItemRepository`
- `OrderPricingService`
- `OrderWorkflowService`

这时继续把所有文件平铺在根目录，阅读成本会快速上升。

### 3. 多个人开始同时改同一个业务域

如果一个同事改订单接口，一个同事改订单定价，一个同事改订单流程，模块目录能明显降低“我到底该看哪些文件”的成本。

### 4. 你开始想按业务域讨论问题，而不是按技术层讨论问题

比如团队讨论时已经不是在说：

- “去改 service”

而是在说：

- “去改 billing 模块”
- “去改用户域”
- “去改审批流那块”

这说明你的项目已经到了应该按域收拢的阶段。

## 第 3 步：`module` 在 Stratix 里到底是什么

这一步必须讲清楚。

当前 Stratix 里的 `module`，首先是目录组织方式，不是新的运行时容器，也不是 Nest 那种显式模块系统。

你可以把它理解成：

- 一个业务域的文件夹
- 一个更适合长期维护的代码组织单元

它的作用主要是：

- 按业务域把 controller / service / repository 收到一起
- 降低根目录噪音
- 让一个域的代码更容易一起阅读和一起修改

它不会自动帮你做到这些事情：

- 不会自动创建模块级 DI 容器
- 不会自动隔离跨模块调用
- 不会自动把旧文件迁进去

## 第 4 步：CLI 的 `module` 生成器会生成什么

执行：

```bash
stratix generate module billing
```

当前 CLI 会生成：

```text
src/modules/billing/
  index.ts
  controllers/
    BillingController.ts
  services/
    BillingService.ts
  repositories/
    BillingRepository.ts
    interfaces/
      IBillingRepository.ts
```

这套骨架的价值不是“它生成了几个文件”，而是它给你一个可以持续扩展的业务域入口。

同时还要记住一个现实限制：

- `module` 生成器只负责生成起始骨架
- 它不是“给现有模块持续加资源”的完整模块系统

也就是说，当前 CLI 更像是在帮你“起一个域”，而不是“完整管理一个域”。

## 第 5 步：为什么 `src/modules/*` 仍然能被框架发现

这是很多新手第一次模块化时最担心的问题：

- “我把文件从 `src/controllers` 挪到 `src/modules/users/controllers`，框架还认吗？”

当前主路径下，应用会递归扫描 `src`，所以只要你的控制器、服务、仓储仍然在 `src` 下面，并且是可发现的 class，框架就还能接住。

所以从：

```text
src/controllers/UserController.ts
```

迁到：

```text
src/modules/users/controllers/UserController.ts
```

不会天然破坏自动发现。

真正容易出问题的反而是：

- 迁完之后忘了修导入
- 顺手把非框架类也塞进扫描目录
- 把路由或 repository 边界一起改乱了

## 第 6 步：把现有 `users` CRUD 迁进模块目录

这一步最重要的原则是：

- 先迁目录
- 再修导入
- 最后确认行为不变

不要一边迁目录，一边顺手改逻辑，一边再引入 `tasks`。那样失败时根本不知道是哪里出了问题。

### 迁移前

```text
src/
  controllers/
    UserController.ts
  services/
    UserService.ts
  repositories/
    UserRepository.ts
    interfaces/
      IUserRepository.ts
```

### 迁移后

```text
src/
  modules/
    users/
      index.ts
      controllers/
        UserController.ts
      services/
        UserService.ts
      repositories/
        UserRepository.ts
        interfaces/
          IUserRepository.ts
```

### 推荐迁移顺序

1. 先执行 `stratix generate module users`
2. 用生成出的目录作为目标位置
3. 把你已经写好的 `UserController`、`UserService`、`UserRepository`、`IUserRepository` 覆盖进去
4. 修正相对导入路径
5. 保持路由路径和行为完全不变
6. 运行 `stratix doctor`
7. 运行 `pnpm build`
8. 运行 `pnpm test`
9. 最后再手工访问 `/users`

这个顺序的重点是：先保证“只是重组目录”，不要把“重组目录”和“重写业务逻辑”混在一起。

## 第 7 步：模块化之后，什么应该留在模块里

优先留在模块里的内容：

- 这个业务域自己的 controller
- 这个业务域自己的 service
- 这个业务域自己的 repository
- 这个业务域自己的 repository 接口
- 这个业务域专用的 DTO / 类型

例如：

```text
src/modules/users/
  controllers/
  services/
  repositories/
  types/
```

如果某段代码只服务于 `users` 这个域，就不要为了“共享得更漂亮”一开始就把它提到全局。

## 第 8 步：什么不应该急着抽成全局共享

新手模块化最容易走向另一个极端：

- 看到两个模块都有 `status` 字段，就立刻抽一个全局类型
- 看到两个模块都有日志函数，就立刻造一个复杂共享类

更稳妥的原则是：

- 真正跨域复用、并且已经稳定的东西，再抽到全局
- 还不稳定、还在频繁改名改结构的东西，先留在模块里

还有一个很关键的现实：

当前应用 discovery 会扫描 `src` 下的 class。  
所以你在共享目录里放普通函数、常量、类型通常没问题；但如果你在共享目录里随意放一个 class，它很可能被框架当成 service 处理。

因此跨模块共享代码优先这样放：

- 类型：`src/types`
- 常量：`src/constants`
- 纯函数工具：`src/utils` 或 `src/shared`

并尽量优先用函数，而不是乱放 class。

## 第 9 步：什么时候该引入 `business-repository`

模块化之后，下一步不是默认加 `business-repository`。

只有当一个模块开始出现“同一个业务单元跨多张表并且需要一致性边界”时，才该考虑它。

典型信号：

- 一个用例要同时更新多张表
- 有明确的状态迁移过程
- 需要 claim / heartbeat / checkpoint / finalize 这类耐久化流程
- 你已经不满足于“一个 repository 对一张表”

这时才考虑：

```bash
stratix add preset database
stratix generate business-repository order
```

但这里必须知道当前 CLI 的真实行为：

- 它默认生成到 `src/repositories/OrderBusinessRepository.ts`
- 它不会自动识别你现有的 `src/modules/orders`

所以如果你的项目已经模块化了，正确做法通常是：

1. 先生成
2. 再把文件移动到对应模块，例如：

```text
src/modules/orders/repositories/OrderBusinessRepository.ts
```

3. 修正导入
4. 再跑 `doctor / build / test`

### `business-repository` 适合什么

- 多表一致性
- 持久化工作单元
- 需要版本守卫和状态迁移的流程

### 不适合什么

- 普通列表查询
- 普通详情接口
- 单表增删改查

如果你只是做管理后台 API，大多数场景里普通 `repository` 就够了。

## 第 10 步：什么时候才需要 `executor` 和 `@stratix/tasks`

很多人一听“模块化”就会顺手把工作流也一起做了，这是典型过度设计。

只有当你真的有下面这些需求时，才考虑：

- 定时任务
- 可恢复执行的长流程
- 工作流节点执行
- 需要执行状态持久化的后台任务

这时再考虑：

```bash
stratix add preset database
stratix add preset tasks
stratix generate executor order-sync
```

同样要知道当前 CLI 的现实行为：

- `executor` 默认生成到 `src/executors/OrderSyncExecutor.ts`
- 它不会自动生成到某个现有模块目录里

如果你希望按域管理，也可以把它归位到：

```text
src/modules/orders/executors/OrderSyncExecutor.ts
```

只要它仍然在 `src` 递归扫描范围里，框架就能发现它。

但一定要先满足前提：

- `@stratix/tasks` 已经启用
- 你真的有任务/调度/工作流需求

不要把 `executor` 当成“另一种 service”。

## 第 11 步：一个更成熟的模块化项目大概长什么样

当项目继续长大，一个比较稳妥的目标结构通常会像这样：

```text
src/
  modules/
    users/
      controllers/
      services/
      repositories/
      repositories/interfaces/
      types/
    billing/
      controllers/
      services/
      repositories/
      repositories/interfaces/
      types/
    order-workflow/
      services/
      repositories/
        OrderWorkflowBusinessRepository.ts
      executors/
        OrderSyncExecutor.ts
  config/
  constants/
  types/
  utils/
  index.ts
  stratix.config.ts
```

这里有三个层次要分清：

- `users` / `billing`：普通业务模块
- `order-workflow`：复杂耐久化流程模块
- `config` / `types` / `utils`：跨模块公共层

## 第 12 步：模块化之后，默认开发顺序怎么变

从模块化开始，你的默认工作顺序可以升级成这样：

1. 先判断需求属于哪个业务模块
2. 没有模块就先 `generate module`
3. 在模块内部先补 repository
4. 再补 service
5. 最后补 controller
6. 如果涉及多表一致性，再考虑 `business-repository`
7. 如果涉及长流程任务，再考虑 `executor + tasks`

这其实还是你前面已经学过的那套顺序，只是“目录边界”从根目录升级成了业务模块。

## 这一页完成后，你应该真正理解什么

如果你现在已经理解下面这些事，说明你已经跨过了“只会写单表 CRUD”的阶段：

- 模块化首先是代码组织升级，不是新的运行时魔法
- `module` 生成器适合起域，不等于完整模块管理系统
- `business-repository` 是复杂一致性边界，不是普通 CRUD 标配
- `executor` 和 `tasks` 是长流程能力，不是模块化的默认下一步
- 当前 CLI 对模块化项目的支持是“起骨架 + 你手工归位”，不是全自动管理

下一步建议你再看 [`testing-and-debugging.md`](./testing-and-debugging.md) 和 [`development-workflow.md`](./development-workflow.md)，把模块化之后的验证节奏也固定下来。
