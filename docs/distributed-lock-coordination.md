# 分布式锁跨实例协调机制详解

## 1. 内嵌组件模式的协调原理

### 1.1 基于数据库的协调机制

```typescript
// 每个引擎实例都有自己的 DistributedLockManager 实例
export default class WorkflowEngineService implements WorkflowEngine {
  constructor(
    private logger: Logger,
    private workflowInstanceRepository: WorkflowInstanceRepository,
    private taskNodeRepository: TaskNodeRepository,
    private workflowDefinitionRepository: WorkflowDefinitionRepository,
    private distributedLockManager?: IDistributedLockManager,  // 内嵌组件
    private distributedScheduler?: IDistributedScheduler       // 内嵌组件
  ) {
    this.instanceId = `engine_${process.pid}_${Date.now()}`;
  }
}
```

### 1.2 跨实例协调的核心机制

**原理**：虽然每个实例都有自己的 DistributedLockManager，但它们都操作同一个数据库表，通过数据库的 ACID 特性实现分布式协调。

```typescript
// packages/tasks/src/services/DistributedLockManager.ts
export class DatabaseDistributedLockManager implements IDistributedLockManager {
  constructor(
    private readonly databaseApi: DatabaseAPI,  // 共享数据库连接
    private readonly logger: Logger,
    private readonly instanceId: string         // 唯一实例标识
  ) {}

  async acquireLock(lockKey: string, owner: string, lockType: string, timeoutMs: number): Promise<boolean> {
    // 关键：使用数据库事务确保原子性
    const result = await this.databaseApi.transaction(async (trx) => {
      // 1. 检查现有锁（使用 FOR UPDATE 行锁）
      const existingLock = await trx
        .selectFrom('workflow_locks')
        .selectAll()
        .where('lock_key', '=', lockKey)
        .forUpdate()  // 关键：行级锁防止并发
        .executeTakeFirst();

      if (existingLock) {
        // 2. 检查锁是否过期
        if (new Date(existingLock.expires_at) > new Date()) {
          return false; // 锁仍有效，获取失败
        }
        
        // 3. 更新过期锁
        await trx
          .updateTable('workflow_locks')
          .set({
            owner,
            expires_at: new Date(Date.now() + timeoutMs),
            updated_at: new Date()
          })
          .where('lock_key', '=', lockKey)
          .execute();
      } else {
        // 4. 创建新锁
        await trx
          .insertInto('workflow_locks')
          .values({
            lock_key: lockKey,
            owner,
            lock_type: lockType,
            expires_at: new Date(Date.now() + timeoutMs),
            created_at: new Date(),
            updated_at: new Date()
          })
          .execute();
      }

      return true;
    });

    return result;
  }
}
```

## 2. 协调机制的关键要素

### 2.1 数据库事务保证原子性

```sql
-- 锁获取的原子操作
START TRANSACTION;

-- 使用 FOR UPDATE 锁定行，防止其他事务并发修改
SELECT * FROM workflow_locks 
WHERE lock_key = 'workflow:123' 
FOR UPDATE;

-- 根据查询结果执行插入或更新
INSERT INTO workflow_locks (...) VALUES (...) 
ON DUPLICATE KEY UPDATE 
  owner = VALUES(owner),
  expires_at = VALUES(expires_at),
  updated_at = NOW();

COMMIT;
```

### 2.2 唯一约束防止重复锁

```sql
-- 锁键的唯一约束确保同一时刻只有一个锁
CREATE TABLE workflow_locks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lock_key VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    -- 关键：唯一约束
    UNIQUE KEY uk_lock_key (lock_key)
);
```

### 2.3 实例标识确保锁归属

```typescript
// 每个实例都有唯一标识
const instanceId = `engine_${process.pid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// 锁的拥有者就是实例ID
await this.distributedLockManager.acquireLock(
  'workflow:123',
  instanceId,  // 锁的拥有者
  'workflow',
  300000
);
```

## 3. 内嵌模式 vs 独立服务模式对比

### 3.1 内嵌模式优势

**优点**：
- 部署简单，无需额外服务
- 延迟低，本地调用
- 故障隔离，单个实例故障不影响其他实例的锁管理
- 扩展性好，随引擎实例线性扩展

**缺点**：
- 依赖数据库性能
- 锁状态分散在各个实例中
- 调试和监控相对复杂

### 3.2 独立服务模式

**优点**：
- 集中管理，便于监控
- 可以使用专门的锁服务（如 etcd、Consul）
- 锁逻辑与业务逻辑分离

**缺点**：
- 增加部署复杂度
- 网络延迟
- 单点故障风险
- 需要额外的高可用设计

## 4. 当前实现的高可用保证

### 4.1 数据库层面的高可用

```yaml
# MySQL 主从复制配置
version: '3.8'
services:
  mysql-master:
    image: mysql:8.0
    environment:
      MYSQL_REPLICATION_MODE: master
      MYSQL_REPLICATION_USER: replicator
      MYSQL_REPLICATION_PASSWORD: replicator_password
    volumes:
      - mysql_master_data:/var/lib/mysql

  mysql-slave:
    image: mysql:8.0
    environment:
      MYSQL_REPLICATION_MODE: slave
      MYSQL_REPLICATION_USER: replicator
      MYSQL_REPLICATION_PASSWORD: replicator_password
      MYSQL_MASTER_HOST: mysql-master
    volumes:
      - mysql_slave_data:/var/lib/mysql
    depends_on:
      - mysql-master
```

### 4.2 应用层面的容错机制

```typescript
export class DatabaseDistributedLockManager implements IDistributedLockManager {
  async acquireLock(lockKey: string, owner: string, lockType: string, timeoutMs: number): Promise<boolean> {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        return await this.doAcquireLock(lockKey, owner, lockType, timeoutMs);
      } catch (error) {
        retryCount++;
        
        if (this.isRetryableError(error)) {
          this.logger.warn(`锁获取失败，重试 ${retryCount}/${maxRetries}`, {
            lockKey,
            error: error.message
          });
          
          // 指数退避
          await this.sleep(Math.pow(2, retryCount) * 100);
          continue;
        }
        
        // 非可重试错误，直接抛出
        throw error;
      }
    }
    
    return false;
  }
  
  private isRetryableError(error: any): boolean {
    // 判断是否为可重试的错误
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.message.includes('Lock wait timeout');
  }
}
```

## 5. 脑裂问题的防范

### 5.1 时钟同步要求

```bash
# 确保所有节点时钟同步
sudo ntpdate -s time.nist.gov
sudo systemctl enable ntp
```

### 5.2 锁过期时间设计

```typescript
// 锁过期时间应该远大于正常操作时间
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5分钟
const HEARTBEAT_INTERVAL = 30 * 1000; // 30秒心跳
const LOCK_RENEWAL_INTERVAL = 2 * 60 * 1000; // 2分钟续期

// 确保：LOCK_TIMEOUT > LOCK_RENEWAL_INTERVAL > HEARTBEAT_INTERVAL
```

### 5.3 锁续期机制

```typescript
class LockRenewalService {
  private renewalTimers = new Map<string, NodeJS.Timeout>();
  
  async acquireLockWithRenewal(lockKey: string, owner: string, timeoutMs: number): Promise<boolean> {
    const acquired = await this.distributedLockManager.acquireLock(lockKey, owner, 'workflow', timeoutMs);
    
    if (acquired) {
      // 启动自动续期
      this.startRenewal(lockKey, owner, timeoutMs);
    }
    
    return acquired;
  }
  
  private startRenewal(lockKey: string, owner: string, timeoutMs: number): void {
    const renewalInterval = Math.floor(timeoutMs * 0.6); // 60% 时间点续期
    
    const timer = setInterval(async () => {
      try {
        const renewed = await this.distributedLockManager.renewLock(lockKey, owner, timeoutMs);
        if (!renewed) {
          this.logger.warn(`锁续期失败，停止续期: ${lockKey}`);
          this.stopRenewal(lockKey);
        }
      } catch (error) {
        this.logger.error(`锁续期异常: ${lockKey}`, error);
        this.stopRenewal(lockKey);
      }
    }, renewalInterval);
    
    this.renewalTimers.set(lockKey, timer);
  }
  
  private stopRenewal(lockKey: string): void {
    const timer = this.renewalTimers.get(lockKey);
    if (timer) {
      clearInterval(timer);
      this.renewalTimers.delete(lockKey);
    }
  }
}
```
