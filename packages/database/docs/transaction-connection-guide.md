# @stratix/database 事务连接选择与使用指南

## 📋 事务连接选择逻辑详解

### 🎯 核心原则

**事务总是在写连接上开启**，这确保了数据一致性和完整性。

### 🔍 连接选择策略

#### 1. 事务开启时的连接选择

```typescript
// 事务总是使用写连接开启
async withTransaction<R>(fn: (repository: this) => Promise<R>) {
  const connection = await this.getWriteConnection(); // 关键：总是写连接
  return await connection.transaction().execute(async (trx) => {
    return await fn(this);
  });
}
```

#### 2. 读写分离架构下的连接优先级

**连接选择优先级**：
1. **事务中**：优先使用当前事务连接（无论读写）
2. **非事务读操作**：`{connectionName}-read` → `{connectionName}` → `default`
3. **非事务写操作**：`{connectionName}-write` → `{connectionName}` → `default`
4. **事务开启**：总是使用写连接开启

#### 3. 多连接配置的事务策略

```typescript
// 连接配置示例
const connectionConfigs = {
  'user-service': { /* 主连接 */ },
  'user-service-read': { /* 读连接 */ },
  'user-service-write': { /* 写连接 */ },
  'order-service': { /* 订单服务连接 */ }
};

// 事务连接选择策略：
// 1. 指定连接的事务：事务在指定的写连接上开启
// 2. 跨服务事务：每个服务使用自己的连接，不支持分布式事务
// 3. 连接回退机制：{service}-write → {service} → default
```

## 🛠️ 事务辅助工具使用

### 1. 基础事务操作

```typescript
import { TransactionHelper, withTransaction } from '@stratix/database';

// 简单事务
const result = await withTransaction(async () => {
  await userRepository.create(userData);
  await profileRepository.create(profileData);
  return { success: true };
});

// 指定连接的事务
const result = await withTransaction(async () => {
  // 操作逻辑
}, 'user-service');
```

### 2. 多操作事务

```typescript
import { TransactionHelper, withMultiTransaction } from '@stratix/database';

// 顺序执行多个操作
const results = await TransactionHelper.executeMultiOperation([
  () => userRepository.create(userData),
  () => profileRepository.create(profileData),
  () => settingsRepository.create(settingsData)
], { 
  connectionName: 'user-service',
  debug: true 
});

// 便捷函数
const results = await withMultiTransaction([
  () => userRepository.create(userData),
  () => profileRepository.create(profileData)
], 'user-service');
```

### 3. 并行操作事务

```typescript
import { TransactionHelper, withParallelTransaction } from '@stratix/database';

// 并行执行多个操作（在同一事务中）
const results = await TransactionHelper.executeParallelOperation([
  () => userRepository.updateLastLogin(userId),
  () => logRepository.createLoginLog(userId),
  () => statsRepository.incrementLoginCount()
], { 
  connectionName: 'user-service',
  debug: true 
});

// 便捷函数
const results = await withParallelTransaction([
  () => operation1(),
  () => operation2(),
  () => operation3()
]);
```

### 4. 条件事务

```typescript
import { TransactionHelper } from '@stratix/database';

// 根据条件决定是否使用事务
const result = await TransactionHelper.executeConditional(
  () => dataArray.length > 1, // 多条数据时才使用事务
  async () => {
    return await repository.bulkCreate(dataArray);
  },
  { connectionName: 'user-service' }
);

// 静态条件
const result = await TransactionHelper.executeConditional(
  true, // 总是使用事务
  async () => {
    // 操作逻辑
  }
);
```

### 5. 批量操作事务

```typescript
import { TransactionHelper, withBatchTransaction } from '@stratix/database';

// 分批处理大量数据，每批在独立事务中执行
const results = await TransactionHelper.executeBatch(
  largeDataArray,
  async (batch) => {
    return await repository.bulkCreate(batch);
  },
  {
    batchSize: 100,
    delayBetweenBatches: 10, // 批次间延迟10ms
    stopOnError: true,
    connectionName: 'user-service',
    debug: true
  }
);

// 便捷函数
const results = await withBatchTransaction(
  largeDataArray,
  (batch) => repository.bulkCreate(batch),
  100, // 批次大小
  'user-service'
);
```

### 6. 重试事务

```typescript
import { TransactionHelper } from '@stratix/database';

// 自动重试失败的事务
const result = await TransactionHelper.executeWithRetry(
  async () => {
    return await repository.complexOperation(data);
  },
  3, // 最多重试3次
  { 
    connectionName: 'primary',
    debug: true 
  }
);
```

## 🏗️ Service 层集成示例

### 用户服务示例

```typescript
import { 
  TransactionHelper, 
  withTransaction, 
  withMultiTransaction 
} from '@stratix/database';

export class UserService {
  constructor(
    private userRepository: UserRepository,
    private profileRepository: ProfileRepository,
    private settingsRepository: SettingsRepository
  ) {}

  /**
   * 创建完整用户（用户+档案+设置）
   */
  async createCompleteUser(userData: CreateUserData) {
    return await withMultiTransaction([
      () => this.userRepository.create(userData.user),
      () => this.profileRepository.create(userData.profile),
      () => this.settingsRepository.create(userData.settings)
    ], 'user-service');
  }

  /**
   * 批量导入用户
   */
  async bulkImportUsers(users: CreateUserData[]) {
    return await TransactionHelper.executeBatch(
      users,
      async (batch) => {
        const results = [];
        for (const userData of batch) {
          const result = await this.createCompleteUser(userData);
          results.push(result);
        }
        return results;
      },
      {
        batchSize: 50,
        delayBetweenBatches: 100,
        connectionName: 'user-service',
        debug: true
      }
    );
  }

  /**
   * 条件性事务操作
   */
  async updateUserData(userId: string, updates: Partial<UserData>) {
    const hasMultipleUpdates = Object.keys(updates).length > 1;
    
    return await TransactionHelper.executeConditional(
      hasMultipleUpdates,
      async () => {
        if (updates.user) {
          await this.userRepository.update(userId, updates.user);
        }
        if (updates.profile) {
          await this.profileRepository.updateByUserId(userId, updates.profile);
        }
        if (updates.settings) {
          await this.settingsRepository.updateByUserId(userId, updates.settings);
        }
        return { success: true };
      },
      { connectionName: 'user-service' }
    );
  }
}
```

### 订单服务示例

```typescript
export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private orderItemRepository: OrderItemRepository,
    private inventoryRepository: InventoryRepository,
    private paymentRepository: PaymentRepository
  ) {}

  /**
   * 创建订单（包含库存检查和支付）
   */
  async createOrder(orderData: CreateOrderData) {
    return await TransactionHelper.executeWithRetry(
      async () => {
        // 并行检查库存
        const inventoryChecks = orderData.items.map(item =>
          () => this.inventoryRepository.checkAvailability(item.productId, item.quantity)
        );
        
        const availabilities = await TransactionHelper.executeParallelOperation(
          inventoryChecks,
          { connectionName: 'order-service' }
        );

        // 检查是否所有商品都有库存
        const allAvailable = availabilities.data.every(available => available);
        if (!allAvailable) {
          throw new Error('Insufficient inventory');
        }

        // 顺序执行订单创建流程
        return await TransactionHelper.executeMultiOperation([
          () => this.orderRepository.create(orderData.order),
          () => this.orderItemRepository.bulkCreate(orderData.items),
          () => this.updateInventory(orderData.items),
          () => this.paymentRepository.create(orderData.payment)
        ], { connectionName: 'order-service' });
      },
      2, // 最多重试2次
      { connectionName: 'order-service', debug: true }
    );
  }

  private async updateInventory(items: OrderItem[]) {
    const updates = items.map(item =>
      () => this.inventoryRepository.decreaseQuantity(item.productId, item.quantity)
    );
    
    return await TransactionHelper.executeParallelOperation(
      updates,
      { connectionName: 'order-service' }
    );
  }
}
```

## 🔧 调试和监控

### 事务状态检查

```typescript
import { isInTransaction, getCurrentTransactionId } from '@stratix/database';

// 在任何地方检查事务状态
if (isInTransaction()) {
  console.log(`当前在事务中，事务ID: ${getCurrentTransactionId()}`);
} else {
  console.log('当前不在事务中');
}
```

### 启用调试日志

```typescript
// 在事务选项中启用调试
const result = await TransactionHelper.executeMultiOperation(
  operations,
  { 
    connectionName: 'user-service',
    debug: true // 启用调试日志
  }
);

// 输出示例：
// 🔄 Starting multi-operation transaction with 3 operations
// 🔄 Executing operation 1/3
// 🔄 Executing operation 2/3
// 🔄 Executing operation 3/3
// ✅ Multi-operation transaction completed successfully
```

## 🎯 最佳实践

### 1. 事务边界设计
- 在 Service 层定义事务边界
- 保持事务尽可能短小
- 避免在事务中执行长时间操作

### 2. 连接选择策略
- 事务总是在写连接上开启
- 读操作在事务中会自动使用事务连接
- 非事务操作遵循读写分离策略

### 3. 错误处理
- 使用 TransactionHelper 的内置错误处理
- 考虑使用重试机制处理临时性错误
- 合理设置批量操作的错误处理策略

### 4. 性能优化
- 合理使用并行操作减少事务时间
- 大数据量使用批量处理避免长事务
- 根据业务需求选择合适的事务模式
