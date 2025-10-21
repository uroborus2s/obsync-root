# @stratix/queue

基于 BullMQ 的 Stratix 消息队列插件。

该插件为 Stratix 框架提供了一个基于 BullMQ 的消息队列实现。它遵循与其他 Stratix 插件相同的适配器模式和依赖注入原则。

## 功能特性

- 创建和管理队列
- 生产（发送）和消费（处理）消息
- 基于强大的 BullMQ 库
- 与 Stratix 框架无缝集成
- 用于队列管理的单例适配器

## 安装

```bash
pnpm add @stratix/queue
```

## 使用方法

```typescript
import { Stratix } from '@stratix/core';
import queue from '@stratix/queue';

const app = new Stratix();

// 注册队列插件
app.register(queue, {
  // BullMQ 连接选项
  connection: {
    host: 'localhost',
    port: 6379,
  },
  // 所有队列的默认选项
  defaultQueueOptions: {
    // ...
  },
  // 所有 Worker 的默认选项
  defaultWorkerOptions: {
    // ...
  },
});

await app.start();

// 现在你可以注入 QueueAdapter
const queueAdapter = app.container.resolve('queueAdapter');

// 向名为 'my-queue' 的队列中添加一个任务
queueAdapter.add('my-queue', { myData: '你好，世界' });
```