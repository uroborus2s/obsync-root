# 插件选择建议

这一页解决一个很现实的问题：你不需要一开始就把所有生态插件都装上。正确顺序是“先看业务问题，再选插件”，而不是“先把插件全加进来再找地方用”。

## 最小起步原则

如果你完全是新手，默认从这套最小组合开始：

- `@stratix/core`
- `@stratix/cli`

只有当业务真的需要时，再继续加其他插件。

## 常见场景与推荐组合

### 1. 普通业务 API

- 组合：`@stratix/core` + `@stratix/database`
- 适合：标准 CRUD、管理后台 API、业务数据服务
- 典型例子：用户管理、订单列表、文章发布、后台查询接口

如果你的应用主要是“接请求 -> 查库/写库 -> 返回结果”，通常从这个组合起步就够了。

### 2. 缓存或分布式锁

- 组合：`@stratix/core` + `@stratix/redis`
- 适合：缓存、租约、去重、发布订阅
- 典型例子：验证码缓存、热点数据缓存、防重复提交、分布式锁

### 3. 异步消息消费

- 组合：`@stratix/core` + `@stratix/redis` + `@stratix/queue`
- 适合：削峰填谷、后台消费、延迟执行
- 典型例子：下单后异步发短信、导出任务排队、延迟重试

### 4. 工作流、调度与执行器

- 组合：`@stratix/core` + `@stratix/database` + `@stratix/tasks`
- 适合：定时任务、长流程编排、可恢复执行
- 典型例子：审批流、定时同步、状态机、需要断点恢复的长任务

### 5. 文件与对象存储

- 组合：`@stratix/core` + `@stratix/ossp`
- 适合：上传下载、桶管理、预签名链接
- 典型例子：附件上传、头像存储、私有文件临时下载

### 6. WPS 平台能力

- 组合：`@stratix/core` + `@stratix/redis` + `@stratix/was-v7`
- 适合：通讯录、日历、消息、驱动盘等 WPS 开放平台集成
- 典型例子：同步组织架构、对接日历事件、发 WPS 消息、接 WPS 驱动盘能力

### 7. 本地开发观测与测试基线

- 组合：`@stratix/core` + `testing` preset，可选再加 `@stratix/devtools`
- 适合：新项目起步、接口排错、给功能补最小测试
- 典型例子：先生成 `vitest` 基线，再在本地用 `doctor`、`pnpm test`、`/_stratix` 排查问题

这里要分清两个东西：

- `testing` preset：补 `vitest` 配置、测试脚本和烟雾测试骨架
- `@stratix/devtools`：补本地运行时观测入口，不替代正式测试

如果你刚开始做业务开发，推荐顺序是：

1. 先保证 `testing` preset 在
2. 先写最小单测
3. 真遇到路由、容器、运行时问题，再考虑加 `devtools`

具体怎么写测试、怎么排错，可以继续看 [`testing-and-debugging.md`](./testing-and-debugging.md)。

## 什么时候该选 `repository`，什么时候该选 `business-repository`

如果你加了 `database` preset，接下来最常见的两个生成方向是：

### 普通 `repository`

适合：

- 单表 CRUD
- 简单查询
- 数据读取逻辑清晰独立

命令：

```bash
stratix generate repository user
```

### `business-repository`

适合：

- 多表一致性
- 长流程状态机
- claim / checkpoint / finalize 这类耐久化工作单元
- 你希望把“一个业务事务单元”收敛成一个仓储对象

命令：

```bash
stratix add preset database
stratix generate business-repository order
```

如果你只是做普通后台接口，不要一开始就上 `business-repository`。先用普通 `repository` 就够了。

## 实践建议

- 先确定业务边界，再挑选插件，不要先堆叠插件再找用途。
- 优先从最小组合起步，按场景逐步增加基础设施。
- 当插件之间存在依赖时，注册顺序遵循“基础设施在前，消费方在后”。

## 一个简单的决策顺序

如果你还不知道怎么选，可以按下面的顺序判断：

1. 我只做 HTTP 接口吗？
   - 是：先 `core`
2. 我要落库吗？
   - 是：加 `database`
3. 我要缓存、锁或订阅吗？
   - 是：加 `redis`
4. 我要队列消费或延迟任务吗？
   - 是：加 `queue`
5. 我要定时任务、工作流或断点恢复执行吗？
   - 是：加 `tasks`
6. 我要对象存储吗？
   - 是：加 `ossp`
7. 我要对接 WPS 开放平台吗？
   - 是：加 `was-v7`

当你无法判断时，默认先从最小组合做出第一个可运行版本，再补基础设施，不要一开始把复杂度全部引进来。
