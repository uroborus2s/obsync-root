# 事务上下文传递机制完整学习包

## 🎯 你的问题的直接答案

### 问题
> 启动时，使用 Kysely 内部的 AsyncLocalStorage，跨表访问表时，使用的是 TransactionContextManager 内的 AsyncLocalStorage，获取的事务对象是一个对象吗？这是怎么做到跨表的？

### ✅ 答案

**是的，获取的事务对象是同一个对象！**

```typescript
// 这三个都是同一个对象
const trx1 = await userRepository.getWriteConnection();
const trx2 = await inventoryRepository.getWriteConnection();
const trx3 = await orderRepository.getWriteConnection();

console.log(trx1 === trx2);  // true ✅
console.log(trx2 === trx3);  // true ✅
```

**怎么做到跨表的？**

同一个事务对象可以执行多个表的操作：

```typescript
const trx = await userRepository.getWriteConnection();

// 可以在同一个事务中执行多个表的操作
await trx.insertInto('users').values(...).execute();
await trx.update('inventory').set(...).execute();
await trx.insertInto('orders').values(...).execute();

// 所有操作都在同一个数据库事务中
```

---

## 📚 11 份完整文档

### 🚀 快速入门（推荐首先阅读）

| # | 文档 | 内容 | 时间 | 难度 |
|---|------|------|------|------|
| 1 | [你的问题的完整答案](./你的问题的完整答案.md) | 直接回答你的问题 | 10 分钟 | ⭐ |
| 2 | [跨表事务的核心秘密](./跨表事务的核心秘密.md) | 核心秘密和关键理解 | 5 分钟 | ⭐ |
| 3 | [事务上下文传递机制快速参考](./事务上下文传递机制快速参考.md) | 快速参考卡片 | 5 分钟 | ⭐ |

### 📖 深入理解（推荐其次阅读）

| # | 文档 | 内容 | 时间 | 难度 |
|---|------|------|------|------|
| 4 | [事务上下文传递机制总结](./事务上下文传递机制总结.md) | 完整的总结 | 10 分钟 | ⭐⭐ |
| 5 | [AsyncLocalStorage 与跨表事务的真相](./AsyncLocalStorage与跨表事务的真相.md) | 深度分析 AsyncLocalStorage | 15 分钟 | ⭐⭐ |
| 6 | [AsyncLocalStorage 对比与事务对象流转](./AsyncLocalStorage对比与事务对象流转.md) | 可视化对比和流程图 | 20 分钟 | ⭐⭐ |

### 🔬 深度分析（推荐最后阅读）

| # | 文档 | 内容 | 时间 | 难度 |
|---|------|------|------|------|
| 7 | [事务上下文传递机制深度分析](./事务上下文传递机制深度分析.md) | 最详细的分析 | 30 分钟 | ⭐⭐⭐ |
| 8 | [事务上下文传递流程图](./事务上下文传递流程图.md) | 8 个 ASCII 流程图 | 20 分钟 | ⭐⭐ |
| 9 | [事务上下文传递机制问答](./事务上下文传递机制问答.md) | 详细的问答 | 20 分钟 | ⭐⭐⭐ |

### 🗂️ 导航和索引

| # | 文档 | 内容 | 时间 | 难度 |
|---|------|------|------|------|
| 10 | [事务上下文传递机制文档索引](./事务上下文传递机制文档索引.md) | 文档导航和快速查找 | 5 分钟 | ⭐ |
| 11 | [事务上下文传递机制完整学习包](./事务上下文传递机制完整学习包.md) | 学习包概览 | 5 分钟 | ⭐ |

---

## 🎯 推荐学习路径

### 路径 1：快速理解（15 分钟）⭐ 推荐
1. [你的问题的完整答案](./你的问题的完整答案.md)（10 分钟）
2. [事务上下文传递机制快速参考](./事务上下文传递机制快速参考.md)（5 分钟）

### 路径 2：全面理解（1 小时）⭐⭐ 推荐
1. [你的问题的完整答案](./你的问题的完整答案.md)（10 分钟）
2. [跨表事务的核心秘密](./跨表事务的核心秘密.md)（5 分钟）
3. [事务上下文传递机制总结](./事务上下文传递机制总结.md)（10 分钟）
4. [AsyncLocalStorage 与跨表事务的真相](./AsyncLocalStorage与跨表事务的真相.md)（15 分钟）
5. [事务上下文传递流程图](./事务上下文传递流程图.md)（20 分钟）

### 路径 3：完全掌握（2.5 小时）⭐⭐⭐ 推荐
阅读所有 11 份文档

---

## 🔑 核心概念速览

### 1. 事务对象是真实的数据库事务

```typescript
const trx = await userRepository.getWriteConnection();
// trx 是 Kysely 创建的真实数据库事务对象
```

### 2. 同一个事务对象可以操作多个表

```typescript
const trx = await userRepository.getWriteConnection();

await trx.insertInto('users').values(...).execute();
await trx.update('inventory').set(...).execute();
await trx.insertInto('orders').values(...).execute();
```

### 3. AsyncLocalStorage 自动传递事务对象

```typescript
await userRepository.withTransaction(async (repo) => {
  await repo.create(...);  // 自动获取事务
  await inventoryRepository.update(...);  // 自动获取事务
  await orderRepository.create(...);  // 自动获取事务
});
```

### 4. 所有 Repository 使用同一个事务对象

```typescript
const trx1 = await userRepository.getWriteConnection();
const trx2 = await inventoryRepository.getWriteConnection();
const trx3 = await orderRepository.getWriteConnection();

console.log(trx1 === trx2 === trx3);  // true
```

---

## 📊 文档统计

- **总文档数**：11 份
- **总行数**：3000+ 行
- **总阅读时间**：2.5 小时
- **总学习时间**：3-5 小时（包括实践）

---

## ✅ 学习检查清单

- [ ] 理解获取的事务对象是同一个对象
- [ ] 理解怎么做到跨表的
- [ ] 理解为什么不会冲突
- [ ] 理解 Kysely 的 AsyncLocalStorage 的作用
- [ ] 理解 TransactionContextManager 的 AsyncLocalStorage 的作用
- [ ] 理解两个 AsyncLocalStorage 的关系
- [ ] 理解事务对象的流转过程
- [ ] 理解 getCurrentTransaction() 的作用
- [ ] 理解异常会回滚，Either.Left 不会回滚
- [ ] 理解并发事务的隔离机制
- [ ] 能够编写跨表事务代码
- [ ] 能够正确处理事务中的错误
- [ ] 能够避免常见的错误
- [ ] 能够遵循最佳实践

---

## 💡 快速提示

### 如果你只有 5 分钟
👉 阅读 [跨表事务的核心秘密](./跨表事务的核心秘密.md)

### 如果你只有 15 分钟
👉 按照"路径 1：快速理解"学习

### 如果你只有 1 小时
👉 按照"路径 2：全面理解"学习

### 如果你有 2.5 小时
👉 按照"路径 3：完全掌握"学习

---

## 🎓 按场景选择文档

### 场景 1：我想快速理解跨表事务
👉 [你的问题的完整答案](./你的问题的完整答案.md) + [事务上下文传递机制快速参考](./事务上下文传递机制快速参考.md)

### 场景 2：我想全面理解事务上下文传递机制
👉 按照"路径 2：全面理解"学习

### 场景 3：我想完全掌握所有细节
👉 按照"路径 3：完全掌握"学习

### 场景 4：我想快速查阅某个问题
👉 使用 [事务上下文传递机制文档索引](./事务上下文传递机制文档索引.md) 快速查找

---

## 🔗 相关文档

### 跨表事务系列
- [跨表事务实现指南](./跨表事务实现指南.md)
- [跨表事务完整示例](./跨表事务完整示例.md)
- [跨表事务常见错误与解决方案](./跨表事务常见错误与解决方案.md)

### 代码规范
- [代码规范](./代码规范.md)

### 其他
- [Kysely 事务行为确认](./Kysely事务行为确认.md)

---

## 🎉 开始学习

### 推荐开始顺序

1. **第 1 步**（10 分钟）
   👉 阅读 [你的问题的完整答案](./你的问题的完整答案.md)

2. **第 2 步**（5 分钟）
   👉 阅读 [事务上下文传递机制快速参考](./事务上下文传递机制快速参考.md)

3. **第 3 步**（可选，30 分钟）
   👉 阅读 [事务上下文传递机制总结](./事务上下文传递机制总结.md) 和其他深入文档

---

## 📞 常见问题

| 问题 | 答案 | 文档 |
|------|------|------|
| 事务对象是什么？ | Kysely 创建的真实数据库事务对象 | [完整答案](./你的问题的完整答案.md) |
| 如何传递？ | 通过 AsyncLocalStorage 自动传递 | [完整答案](./你的问题的完整答案.md) |
| 所有 Repository 使用同一个吗？ | 是的 | [完整答案](./你的问题的完整答案.md) |
| 怎么做到跨表的？ | 同一个事务对象可以执行多个表的操作 | [完整答案](./你的问题的完整答案.md) |
| 为什么不会冲突？ | 每个异步上下文有独立的 AsyncLocalStorage | [完整答案](./你的问题的完整答案.md) |

---

**祝你学习愉快！** 🚀

