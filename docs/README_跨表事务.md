# Stratix 框架跨表事务完整学习包

## 🎉 欢迎！

你已经获得了 Stratix 框架中最完整的跨表事务学习资料。

本学习包包含 **7 份详细文档**，共计 **3000+ 行内容**，涵盖了从基础概念到高级实现的所有内容。

---

## 🎯 你的问题与答案

### ❓ 问题 1：架构层面 - 事务应该在哪一层发起和管理？

**✅ 答案**：**Service 层**

- ✅ Service 层：发起和管理事务
- ❌ Repository 层：无感知参与事务
- ❌ Controller 层：不管理事务

**原因**：事务涉及多个 Repository 的协调，这是业务逻辑的一部分。

---

### ❓ 问题 2：代码实现 - 如何使用 `withTransaction` 调用多个 Repository？

**✅ 答案**：**注入多个 Repository，在事务回调中调用它们**

```typescript
export default class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly userRepository: UserRepository,
    private readonly inventoryRepository: InventoryRepository
  ) {}

  async createOrder(dto: CreateOrderDTO) {
    return this.orderRepository.withTransaction(async (orderRepo) => {
      // 所有 Repository 都会自动使用这个事务
      const user = await this.userRepository.findById(dto.userId);
      const inventory = await this.inventoryRepository.findByProductId(dto.productId);
      const order = await orderRepo.create(dto);
      return order;
    });
  }
}
```

---

### ❓ 问题 3：最佳实践 - 多个 Repository 如何共享事务？

**✅ 答案**：**通过 AsyncLocalStorage 自动共享**

- 事务启动时，事务对象存储到 AsyncLocalStorage
- 所有 Repository 自动检测并使用当前事务
- 不需要显式传递事务对象

---

### ❓ 问题 4：错误处理 - 如何处理事务中的错误和回滚？

**✅ 答案**：**异常自动回滚，Either.Left 不会回滚**

```typescript
const result = await this.repository.withTransaction(async (repo) => {
  // ✅ 正确：抛出异常会回滚
  if (isLeft(validation)) {
    throw new Error(validation.left.message);
  }

  // ❌ 错误：返回 Either.Left 不会回滚
  // return validation;
});
```

---

### ❓ 问题 5：依赖注入 - 如何配置多个 Repository 的注入？

**✅ 答案**：**使用 RESOLVER 声明依赖**

```typescript
export default class OrderService {
  static readonly [RESOLVER] = {
    orderRepository: 'OrderRepository',
    userRepository: 'UserRepository',
    inventoryRepository: 'InventoryRepository'
  };

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly userRepository: UserRepository,
    private readonly inventoryRepository: InventoryRepository
  ) {}
}
```

---

## 📚 7 份完整文档

### 1️⃣ [跨表事务快速参考](./跨表事务快速参考.md) ⭐ 推荐首先阅读
- **阅读时间**：5 分钟
- **内容**：核心概念、最小化代码示例、关键规则、常见问题
- **适合**：所有人（快速查阅）

### 2️⃣ [跨表事务问答总结](./跨表事务问答总结.md) ⭐ 回答你的所有问题
- **阅读时间**：10 分钟
- **内容**：5 个核心问题的详细答案、完整代码示例
- **适合**：初学者、需要快速理解的开发者

### 3️⃣ [跨表事务实现指南](./跨表事务实现指南.md) 深入理解
- **阅读时间**：20 分钟
- **内容**：架构设计、AsyncLocalStorage 机制、最佳实践、常见错误
- **适合**：进阶开发者、想深入理解的开发者

### 4️⃣ [跨表事务完整示例](./跨表事务完整示例.md) 电商订单系统
- **阅读时间**：30 分钟
- **内容**：完整的电商订单系统代码示例（Repository、Service、Controller）
- **适合**：所有人（实战参考、复制粘贴代码）

### 5️⃣ [跨表事务常见错误与解决方案](./跨表事务常见错误与解决方案.md) 避免踩坑
- **阅读时间**：15 分钟
- **内容**：7 个常见错误、每个错误的正确做法、快速检查清单
- **适合**：所有人（避免踩坑、代码审查）

### 6️⃣ [跨表事务架构图](./跨表事务架构图.md) 可视化理解
- **阅读时间**：10 分钟
- **内容**：9 个 ASCII 架构图、流程图、时间序列图
- **适合**：视觉学习者、架构师、想深入理解的开发者

### 7️⃣ [跨表事务文档索引](./跨表事务文档索引.md) 导航与查找
- **阅读时间**：5 分钟
- **内容**：文档导航、按场景快速查找、学习路径建议、知识检查清单
- **适合**：所有人（快速导航）

---

## 🚀 快速开始（30 分钟）

### 第 1 步：快速了解（5 分钟）
👉 阅读：[跨表事务快速参考](./跨表事务快速参考.md)

### 第 2 步：理解概念（10 分钟）
👉 阅读：[跨表事务问答总结](./跨表事务问答总结.md)

### 第 3 步：学习代码（15 分钟）
👉 阅读：[跨表事务完整示例](./跨表事务完整示例.md)

### 第 4 步：避免错误（5 分钟）
👉 浏览：[跨表事务常见错误与解决方案](./跨表事务常见错误与解决方案.md)

---

## 📊 学习路径

### 初级开发者（0-1 年）
```
Day 1: 快速参考 + 问答总结 + 完整示例 (30 分钟)
Day 2: 实现指南 + 架构图 (30 分钟)
Day 3: 常见错误 + 实战编码 (60 分钟)
```

### 中级开发者（1-3 年）
```
Day 1: 快速参考 + 实现指南 + 架构图 (30 分钟)
Day 2: 常见错误 + 实战编码 (60 分钟)
```

### 高级开发者（3+ 年）
```
快速浏览：快速参考 + 架构图 (10 分钟)
按需查阅：其他文档
```

---

## ✅ 核心知识点

| 知识点 | 文档位置 |
|--------|---------|
| 事务在哪层发起 | 问答总结 - 问题 1 |
| 如何调用多个 Repository | 问答总结 - 问题 2 |
| 如何共享事务 | 问答总结 - 问题 3 |
| 错误处理与回滚 | 问答总结 - 问题 4 |
| 依赖注入配置 | 问答总结 - 问题 5 |
| 完整代码示例 | 完整示例 |
| 常见错误 | 常见错误与解决方案 |
| 可视化理解 | 架构图 |
| 快速查阅 | 快速参考 |
| 文档导航 | 文档索引 |

---

## 🎓 知识检查清单

完成以下检查，确保你已经掌握了跨表事务：

- [ ] 我知道事务应该在 Service 层发起
- [ ] 我知道如何注入多个 Repository
- [ ] 我知道 AsyncLocalStorage 的作用
- [ ] 我知道异常会回滚事务，Either.Left 不会
- [ ] 我知道如何在事务中处理错误
- [ ] 我知道不应该在事务中进行长时间操作
- [ ] 我知道如何配置依赖注入
- [ ] 我知道如何调试事务
- [ ] 我知道常见的 7 个错误
- [ ] 我能写出正确的跨表事务代码

---

## 📞 需要帮助？

| 需求 | 推荐文档 |
|------|---------|
| 快速查阅 | [快速参考](./跨表事务快速参考.md) |
| 理解概念 | [问答总结](./跨表事务问答总结.md) |
| 学习代码 | [完整示例](./跨表事务完整示例.md) |
| 避免错误 | [常见错误](./跨表事务常见错误与解决方案.md) |
| 深入理解 | [实现指南](./跨表事务实现指南.md) |
| 可视化 | [架构图](./跨表事务架构图.md) |
| 快速导航 | [文档索引](./跨表事务文档索引.md) |

---

## 📈 文档统计

- **总文档数**：7 份
- **总行数**：3000+ 行
- **总代码示例**：50+ 个
- **总图表**：20+ 个
- **总阅读时间**：2-3 小时
- **总学习时间**：3-5 小时（包括实践）

---

## 🎯 下一步

1. **选择适合你的学习路径**（初级/中级/高级）
2. **按照推荐顺序阅读文档**
3. **完成知识检查清单**
4. **开始编写跨表事务代码**

---

## 💡 关键要点总结

### ✅ 必须做

- ✅ 在 Service 层启动事务
- ✅ 注入所有需要的 Repository
- ✅ 在事务中抛出异常（不要返回 Either.Left）
- ✅ 在事务外处理事务结果
- ✅ 在事务外进行长时间操作

### ❌ 禁止做

- ❌ 在 Repository 层启动事务
- ❌ 在事务中返回 Either.Left
- ❌ 忘记注入其他 Repository
- ❌ 在事务中进行长时间操作
- ❌ 在事务中修改共享状态

---

## 🎉 祝贺！

你现在拥有了 Stratix 框架中最完整的跨表事务学习资料。

**开始学习吧！** 🚀

---

## 📝 文档版本

- **版本**：1.0
- **更新时间**：2025-10-20
- **适用框架**：Stratix 框架（Fastify 5 + Awilix 12）
- **数据库**：Kysely（支持 PostgreSQL、MySQL、SQLite、MSSQL）

---

## 🔗 相关资源

- [Stratix 框架官方文档](https://stratix.dev)
- [Kysely 官方文档](https://kysely.dev)
- [Node.js AsyncLocalStorage 文档](https://nodejs.org/api/async_context.html)
- [代码规范](./代码规范.md)

