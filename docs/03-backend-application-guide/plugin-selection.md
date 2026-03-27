# 插件选择建议

## 常见场景

### 普通业务 API

- 组合：`@stratix/core` + `@stratix/database`
- 适合：标准 CRUD、管理后台 API、业务数据服务

### 缓存或分布式锁

- 组合：`@stratix/core` + `@stratix/redis`
- 适合：缓存、租约、去重、发布订阅

### 异步消息消费

- 组合：`@stratix/core` + `@stratix/redis` + `@stratix/queue`
- 适合：削峰填谷、后台消费、延迟执行

### 工作流、调度与执行器

- 组合：`@stratix/core` + `@stratix/database` + `@stratix/tasks`
- 适合：定时任务、长流程编排、可恢复执行

### 文件与对象存储

- 组合：`@stratix/core` + `@stratix/ossp`
- 适合：上传下载、桶管理、预签名链接

### WPS 平台能力

- 组合：`@stratix/core` + `@stratix/redis` + `@stratix/was-v7`
- 适合：通讯录、日历、消息、驱动盘等 WPS 开放平台集成

## 实践建议

- 先确定业务边界，再挑选插件，不要先堆叠插件再找用途。
- 优先从最小组合起步，按场景逐步增加基础设施。
- 当插件之间存在依赖时，注册顺序遵循“基础设施在前，消费方在后”。
