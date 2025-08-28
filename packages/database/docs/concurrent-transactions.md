# 并发事务支持

@stratix/database 完全支持并发事务处理，可以同时运行数千个独立的事务而不会相互干扰。

## 并发事务的工作原理

### 1. **数据库层面的并发支持**

现代数据库系统天然支持并发事务：

```sql
-- 同时运行的事务示例
-- 事务 1 (用户 A 转账)
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE user_id = 'userA';
UPDATE accounts SET balance = balance + 100 WHERE user_id = 'userB';
COMMIT;

-- 事务 2 (用户 C 转账) - 同时进行
BEGIN;
UPDATE accounts SET balance = balance - 50 WHERE user_id = 'userC';
UPDATE accounts SET balance = balance + 50 WHERE user_id = 'userD';
COMMIT;
```

### 2. **AsyncLocalStorage 的并发隔离**

我们的实现使用 AsyncLocalStorage 为每个异步执行上下文创建独立的存储空间：

```typescript
// 每个 HTTP 请求都有独立的异步上下文
// 请求 1
app.post('/transfer1', async (req, res) => {
  await databaseApi.transaction(async (trx) => {
    // 这个事务上下文只属于请求 1
    await userRepository.updateBalance(userA, -100);
    await userRepository.updateBalance(userB, +100);
  });
});

// 请求 2 - 同时进行
app.post('/transfer2', async (req, res) => {
  await databaseApi.transaction(async (trx) => {
    // 这个事务上下文只属于请求 2，完全独立
    await userRepository.updateBalance(userC, -50);
    await userRepository.updateBalance(userD, +50);
  });
});
```

## 并发事务的隔离机制

### 1. **上下文隔离**

每个事务都有独立的上下文：

```typescript
// 同时运行的三个事务
const promises = [
  // 事务 1
  databaseApi.transaction(async (trx1) => {
    console.log('事务1 ID:', getCurrentTransactionId()); // trx_1703123456789_abc123
    await repository.create(data1);
  }),
  
  // 事务 2
  databaseApi.transaction(async (trx2) => {
    console.log('事务2 ID:', getCurrentTransactionId()); // trx_1703123456790_def456
    await repository.create(data2);
  }),
  
  // 事务 3
  databaseApi.transaction(async (trx3) => {
    console.log('事务3 ID:', getCurrentTransactionId()); // trx_1703123456791_ghi789
    await repository.create(data3);
  })
];

await Promise.all(promises);
```

### 2. **数据库连接池**

Kysely 使用连接池管理并发连接：

```typescript
// 数据库配置
const config = {
  connections: {
    default: {
      type: 'postgresql',
      host: 'localhost',
      port: 5432,
      database: 'myapp',
      // 连接池配置
      pool: {
        min: 2,        // 最小连接数
        max: 20,       // 最大连接数
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      }
    }
  }
};
```

## 实际应用场景

### 1. **电商系统并发下单**

```typescript
// 多个用户同时下单
class OrderService {
  async createOrder(userId: string, items: OrderItem[]) {
    return await this.databaseApi.transaction(async (trx) => {
      // 每个订单事务都是独立的
      
      // 1. 创建订单
      const order = await this.orderRepository.create({
        user_id: userId,
        status: 'pending',
        total_amount: calculateTotal(items)
      });
      
      // 2. 创建订单项
      await this.orderItemRepository.createMany(
        items.map(item => ({
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
      );
      
      // 3. 更新库存
      for (const item of items) {
        await this.productRepository.updateStock(
          item.productId, 
          -item.quantity
        );
      }
      
      // 4. 记录库存变动日志
      await this.stockLogRepository.createMany(
        items.map(item => ({
          product_id: item.productId,
          change_quantity: -item.quantity,
          reason: 'order_created',
          order_id: order.id
        }))
      );
      
      return order;
    });
  }
}

// 同时处理多个订单
const orderPromises = [
  orderService.createOrder('user1', items1),
  orderService.createOrder('user2', items2),
  orderService.createOrder('user3', items3)
];

const orders = await Promise.all(orderPromises);
```

### 2. **金融系统并发转账**

```typescript
class TransferService {
  async transfer(fromUserId: string, toUserId: string, amount: number) {
    return await this.databaseApi.transaction(async (trx) => {
      // 每个转账事务都是独立的，支持并发
      
      // 1. 检查发送方余额
      const fromUser = await this.userRepository.findById(fromUserId);
      if (fromUser.balance < amount) {
        throw new Error('余额不足');
      }
      
      // 2. 扣除发送方余额
      await this.userRepository.update(fromUserId, {
        balance: fromUser.balance - amount
      });
      
      // 3. 增加接收方余额
      const toUser = await this.userRepository.findById(toUserId);
      await this.userRepository.update(toUserId, {
        balance: toUser.balance + amount
      });
      
      // 4. 记录转账记录
      const transfer = await this.transferRepository.create({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount,
        status: 'completed',
        created_at: new Date()
      });
      
      return transfer;
    });
  }
}

// 支持多个用户同时转账
const transferPromises = [
  transferService.transfer('user1', 'user2', 100),
  transferService.transfer('user3', 'user4', 200),
  transferService.transfer('user5', 'user6', 150)
];

const transfers = await Promise.all(transferPromises);
```

## 性能和限制

### 1. **连接池限制**

```typescript
// 连接池配置影响并发能力
const poolConfig = {
  max: 20  // 最多20个并发数据库连接
};

// 如果同时有30个事务请求，其中10个会等待连接可用
```

### 2. **数据库锁机制**

```typescript
// 不同的事务可能会因为数据库锁而等待
await Promise.all([
  // 事务1：更新用户A的余额
  databaseApi.transaction(async (trx) => {
    await userRepository.update('userA', { balance: 1000 });
  }),
  
  // 事务2：同时更新用户A的余额 - 会等待事务1完成
  databaseApi.transaction(async (trx) => {
    await userRepository.update('userA', { balance: 2000 });
  })
]);
```

### 3. **内存使用**

```typescript
// AsyncLocalStorage 的内存开销很小
// 每个事务上下文只存储少量元数据
interface TransactionContextInfo {
  transaction: Transaction<any>;    // 事务对象引用
  connectionName?: string;          // 连接名称
  startTime: Date;                 // 开始时间
  transactionId: string;           // 事务ID (约20字节)
}
```

## 监控和调试

### 1. **事务监控**

```typescript
// 监控并发事务数量
class TransactionMonitor {
  private activeTransactions = new Set<string>();
  
  onTransactionStart(transactionId: string) {
    this.activeTransactions.add(transactionId);
    console.log(`活跃事务数: ${this.activeTransactions.size}`);
  }
  
  onTransactionEnd(transactionId: string) {
    this.activeTransactions.delete(transactionId);
    console.log(`活跃事务数: ${this.activeTransactions.size}`);
  }
}
```

### 2. **性能分析**

```typescript
// 分析事务执行时间
await databaseApi.transaction(async (trx) => {
  const startTime = Date.now();
  
  try {
    // 业务逻辑
    await businessLogic();
    
    const duration = Date.now() - startTime;
    console.log(`事务执行时间: ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`事务失败，执行时间: ${duration}ms`);
    throw error;
  }
});
```

## 最佳实践

### 1. **避免长时间事务**
```typescript
// ❌ 避免
await databaseApi.transaction(async (trx) => {
  await heavyComputation(); // 长时间计算
  await repository.update(id, data);
});

// ✅ 推荐
const result = await heavyComputation(); // 在事务外计算
await databaseApi.transaction(async (trx) => {
  await repository.update(id, result); // 事务内只做数据库操作
});
```

### 2. **合理设置连接池**
```typescript
// 根据并发需求设置连接池大小
const poolSize = Math.min(
  expectedConcurrentUsers / 2,  // 预期并发用户数的一半
  50                            // 最大不超过50
);
```

### 3. **错误处理**
```typescript
const results = await Promise.allSettled([
  transaction1(),
  transaction2(),
  transaction3()
]);

results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error(`事务${index + 1}失败:`, result.reason);
  }
});
```

总结：我们的实现完全支持并发事务，每个事务都有独立的上下文，不会相互干扰。数据库层面的并发控制和我们的 AsyncLocalStorage 实现共同保证了系统的并发安全性。
