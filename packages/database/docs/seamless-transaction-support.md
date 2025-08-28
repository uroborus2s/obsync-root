# 无感事务支持

@stratix/database 现在支持无感事务功能，让所有继承 BaseRepository 的 Repository 类能够自动支持事务，现有代码无需修改。

## 核心特性

### 🎯 无感事务支持
- 所有 Repository 的 CRUD 方法自动检测并使用当前事务上下文
- 现有代码无需任何修改即可获得事务支持
- 基于 Kysely 原生事务机制实现

### 🔄 自动事务感知
- Repository 层自动检测是否在事务中
- 优先使用事务连接，回退到普通连接
- 支持读写分离架构

### 📊 调试支持
- 自动记录事务使用情况
- 提供事务 ID 用于调试和追踪
- 完整的日志记录

## 使用方式

### 基本事务使用

```typescript
// Service 层代码 - 无需修改现有 Repository 调用方式
export class WorkflowService {
  constructor(
    private databaseApi: DatabaseAPI,
    private nodeInstanceRepository: NodeInstanceRepository,
    private workflowInstanceRepository: WorkflowInstanceRepository
  ) {}

  async executeWorkflowWithTransaction(workflowId: number) {
    return await this.databaseApi.transaction(async (trx) => {
      // 在事务中，所有 Repository 操作自动使用同一个事务
      const childNodes = await this.nodeInstanceRepository.createMany([
        { workflow_instance_id: workflowId, node_id: 'node1', status: 'pending' },
        { workflow_instance_id: workflowId, node_id: 'node2', status: 'pending' }
      ]);

      await this.nodeInstanceRepository.updateLoopProgress(
        parentNodeId, 
        { completed: 0, total: 2 }
      );

      await this.workflowInstanceRepository.updateStatus(
        workflowId, 
        'running'
      );

      // 所有操作都在同一个事务中，要么全部成功，要么全部回滚
      return { childNodes, status: 'success' };
    });
  }
}
```

### 复杂事务场景

```typescript
async processComplexWorkflow(data: WorkflowData) {
  return await this.databaseApi.transaction(async (trx) => {
    // 1. 创建工作流实例
    const workflow = await this.workflowInstanceRepository.create({
      name: data.name,
      status: 'pending'
    });

    // 2. 批量创建节点实例
    const nodes = await this.nodeInstanceRepository.createMany(
      data.nodes.map(node => ({
        workflow_instance_id: workflow.id,
        node_id: node.id,
        status: 'pending'
      }))
    );

    // 3. 更新相关统计
    await this.statisticsRepository.incrementWorkflowCount();

    // 4. 记录审计日志
    await this.auditLogRepository.create({
      action: 'workflow_created',
      workflow_id: workflow.id,
      user_id: data.userId
    });

    return { workflow, nodes };
  });
}
```

## 技术实现

### AsyncLocalStorage 事务上下文

使用 Node.js 的 AsyncLocalStorage 在异步调用链中传递事务上下文：

```typescript
// 事务上下文管理器
const transactionContextManager = new TransactionContextManager();

// DatabaseAPI.transaction 方法增强
async transaction<T>(
  operation: (trx: Transaction<any>) => Promise<T>,
  context: TransactionContext = {}
): Promise<DatabaseResult<T>> {
  return await db.transaction().execute(async (trx) => {
    // 在事务上下文中运行操作
    return await transactionContextManager.runInTransaction(
      trx,
      () => operation(trx)
    );
  });
}
```

### BaseRepository 自动感知

Repository 自动检测并使用事务连接：

```typescript
// BaseRepository 增强的连接获取逻辑
protected getQueryConnection(): Kysely<DB> {
  const currentTransaction = getCurrentTransaction();
  if (currentTransaction) {
    // 使用事务连接
    return currentTransaction as unknown as Kysely<DB>;
  }
  // 回退到读连接
  return this.readConnection!;
}

protected getWriteConnection(): Kysely<DB> {
  const currentTransaction = getCurrentTransaction();
  if (currentTransaction) {
    // 使用事务连接
    return currentTransaction as unknown as Kysely<DB>;
  }
  // 回退到写连接
  return this.writeConnection!;
}
```

## 向后兼容性

### 现有代码无需修改

所有现有的 Repository 实现都能自动获得事务支持：

```typescript
// 现有的 Repository 代码保持不变
class UserRepository extends BaseRepository<Database, 'users'> {
  async findByEmail(email: string) {
    return await this.findOne(eb => eb('email', '=', email));
  }

  async createUser(userData: CreateUser) {
    return await this.create(userData);
  }
}

// Service 层调用方式保持不变
class UserService {
  async transferPoints(fromUserId: string, toUserId: string, points: number) {
    return await this.databaseApi.transaction(async (trx) => {
      // 这些方法调用会自动使用事务
      await this.userRepository.update(fromUserId, { 
        points: eb => eb('points', '-', points) 
      });
      
      await this.userRepository.update(toUserId, { 
        points: eb => eb('points', '+', points) 
      });
      
      return { success: true };
    });
  }
}
```

## 调试和监控

### 事务状态检查

```typescript
import { isInTransaction, getCurrentTransactionId } from '@stratix/database';

// 检查当前是否在事务中
if (isInTransaction()) {
  console.log(`当前在事务中，事务ID: ${getCurrentTransactionId()}`);
}
```

### 日志记录

Repository 会自动记录事务使用情况：

```
DEBUG: Using transaction for write query {
  tableName: "workflow_instances",
  inTransaction: true,
  transactionId: "trx_1703123456789_abc123"
}
```

## 最佳实践

### 1. 事务边界设计
- 在 Service 层定义事务边界
- 保持事务尽可能短小
- 避免在事务中执行长时间操作

### 2. 错误处理
```typescript
async processWithTransaction() {
  try {
    return await this.databaseApi.transaction(async (trx) => {
      // 业务逻辑
      return result;
    });
  } catch (error) {
    // 事务会自动回滚
    this.logger.error('Transaction failed:', error);
    throw error;
  }
}
```

### 3. 嵌套事务
Kysely 支持保存点，可以实现嵌套事务：

```typescript
await this.databaseApi.transaction(async (trx) => {
  // 外层事务
  await this.repository1.create(data1);
  
  // 内层操作（使用同一个事务）
  await this.repository2.create(data2);
});
```

## 性能考虑

- 事务上下文传递基于 AsyncLocalStorage，性能开销极小
- 自动连接选择逻辑简单高效
- 不影响非事务操作的性能

## 故障排除

### 常见问题

1. **事务未生效**
   - 确保使用 `databaseApi.transaction()` 包装操作
   - 检查 Repository 是否正确继承 BaseRepository

2. **类型错误**
   - 确保 TypeScript 版本兼容
   - 检查 Kysely 版本是否匹配

3. **调试事务状态**
   ```typescript
   import { isInTransaction, getCurrentTransactionId } from '@stratix/database';
   
   console.log('In transaction:', isInTransaction());
   console.log('Transaction ID:', getCurrentTransactionId());
   ```
