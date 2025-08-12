# 分布式锁数据一致性机制详解

## 1. 数据库存储架构

### 1.1 锁信息存储位置

```sql
-- 分布式锁存储在主数据库的 workflow_locks 表中
-- 所有引擎实例共享同一个数据库实例
CREATE TABLE workflow_locks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lock_key VARCHAR(255) NOT NULL,           -- 锁的唯一标识
    owner VARCHAR(255) NOT NULL,              -- 锁的拥有者（引擎实例ID）
    lock_type ENUM('workflow', 'node', 'resource') NOT NULL,
    expires_at TIMESTAMP NOT NULL,            -- 锁的过期时间
    lock_data JSON NULL,                      -- 锁的附加数据
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 关键：唯一约束确保同一时刻只有一个锁
    UNIQUE KEY uk_lock_key (lock_key),
    KEY idx_owner (owner),
    KEY idx_expires_at (expires_at)
) ENGINE=InnoDB;
```

### 1.2 数据库连接架构

```typescript
// 所有引擎实例连接到同一个数据库
const databaseConfig = {
  // 主数据库（读写）
  master: {
    host: 'mysql-master',
    port: 3306,
    database: 'workflow_db',
    user: 'workflow_user',
    password: 'workflow_pass_2024'
  },
  
  // 从数据库（只读，可选）
  slave: {
    host: 'mysql-slave',
    port: 3306,
    database: 'workflow_db',
    user: 'workflow_user',
    password: 'workflow_pass_2024'
  }
};

// 锁操作必须使用主数据库
export class DatabaseDistributedLockManager {
  constructor(
    private readonly masterDb: DatabaseAPI,  // 主数据库连接
    private readonly slaveDb?: DatabaseAPI   // 从数据库连接（可选）
  ) {}
  
  async acquireLock(...): Promise<boolean> {
    // 锁操作必须使用主数据库确保一致性
    return await this.masterDb.transaction(async (trx) => {
      // 事务操作...
    });
  }
}
```

## 2. 原子性操作保证

### 2.1 数据库事务的 ACID 特性

```typescript
async acquireLock(lockKey: string, owner: string, lockType: string, timeoutMs: number): Promise<boolean> {
  // 使用数据库事务确保原子性
  const result = await this.databaseApi.transaction(async (trx) => {
    // 1. 原子性（Atomicity）：要么全部成功，要么全部失败
    try {
      // 2. 一致性（Consistency）：维护数据库约束
      const existingLock = await trx
        .selectFrom('workflow_locks')
        .selectAll()
        .where('lock_key', '=', lockKey)
        .forUpdate()  // 3. 隔离性（Isolation）：行级锁
        .executeTakeFirst();

      if (existingLock && new Date(existingLock.expires_at) > new Date()) {
        return false; // 锁仍有效
      }

      // 4. 持久性（Durability）：事务提交后数据持久化
      if (existingLock) {
        await trx.updateTable('workflow_locks')
          .set({
            owner,
            expires_at: new Date(Date.now() + timeoutMs),
            updated_at: new Date()
          })
          .where('lock_key', '=', lockKey)
          .execute();
      } else {
        await trx.insertInto('workflow_locks')
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
    } catch (error) {
      // 事务自动回滚
      throw error;
    }
  });

  return result;
}
```

### 2.2 并发控制机制

```sql
-- 使用 SELECT ... FOR UPDATE 实现行级锁
-- 防止多个实例同时修改同一个锁记录

-- 实例1执行：
START TRANSACTION;
SELECT * FROM workflow_locks WHERE lock_key = 'workflow:123' FOR UPDATE;
-- 此时锁定了这一行，其他事务必须等待

-- 实例2同时执行：
START TRANSACTION;
SELECT * FROM workflow_locks WHERE lock_key = 'workflow:123' FOR UPDATE;
-- 这个查询会被阻塞，直到实例1的事务完成

-- 实例1完成操作：
INSERT INTO workflow_locks (...) VALUES (...);
COMMIT;
-- 释放行锁

-- 实例2继续执行：
-- 现在可以看到实例1插入的记录
-- 检查锁是否已被占用，返回失败
ROLLBACK;
```

## 3. 防止脑裂问题

### 3.1 时钟同步要求

```bash
# 所有节点必须同步时钟
# Docker 容器启动脚本
#!/bin/bash
# 同步时钟
ntpdate -s time.nist.gov

# 启动应用
node dist/index.js
```

```yaml
# Kubernetes 时钟同步
apiVersion: v1
kind: ConfigMap
metadata:
  name: ntp-config
data:
  ntp.conf: |
    server time.nist.gov iburst
    server time.google.com iburst
    driftfile /var/lib/ntp/drift
```

### 3.2 锁过期时间设计

```typescript
// 锁过期时间配置
const LOCK_CONFIG = {
  // 工作流级别锁：5分钟
  WORKFLOW_LOCK_TIMEOUT: 5 * 60 * 1000,
  
  // 节点级别锁：2分钟
  NODE_LOCK_TIMEOUT: 2 * 60 * 1000,
  
  // 心跳间隔：30秒
  HEARTBEAT_INTERVAL: 30 * 1000,
  
  // 锁续期间隔：锁超时时间的60%
  LOCK_RENEWAL_INTERVAL: (timeout: number) => Math.floor(timeout * 0.6),
  
  // 故障检测超时：90秒（3个心跳周期）
  FAILURE_DETECTION_TIMEOUT: 90 * 1000
};

// 确保时间关系：
// LOCK_TIMEOUT > LOCK_RENEWAL_INTERVAL > HEARTBEAT_INTERVAL
// FAILURE_DETECTION_TIMEOUT = 3 * HEARTBEAT_INTERVAL
```

### 3.3 锁拥有者验证

```typescript
async releaseLock(lockKey: string, owner: string): Promise<boolean> {
  // 只能释放自己拥有的锁
  const result = await this.databaseApi
    .deleteFrom('workflow_locks')
    .where('lock_key', '=', lockKey)
    .where('owner', '=', owner)  // 关键：验证拥有者
    .executeTakeFirst();

  const success = Number(result.numDeletedRows) > 0;
  
  if (!success) {
    this.logger.warn('尝试释放不属于自己的锁', {
      lockKey,
      owner,
      reason: 'not_owner_or_not_exists'
    });
  }

  return success;
}
```

## 4. 防止锁误释放

### 4.1 实例唯一标识

```typescript
// 生成全局唯一的实例ID
class WorkflowEngineService {
  private readonly instanceId: string;
  
  constructor() {
    // 组合多个因素确保唯一性
    this.instanceId = [
      'engine',
      process.pid,                    // 进程ID
      Date.now(),                     // 时间戳
      Math.random().toString(36).substr(2, 9),  // 随机字符串
      require('os').hostname()        // 主机名
    ].join('_');
  }
}
```

### 4.2 锁续期机制

```typescript
class LockRenewalManager {
  private renewalTimers = new Map<string, NodeJS.Timeout>();
  
  async acquireLockWithRenewal(lockKey: string, owner: string, timeoutMs: number): Promise<boolean> {
    const acquired = await this.distributedLockManager.acquireLock(lockKey, owner, 'workflow', timeoutMs);
    
    if (acquired) {
      this.startAutoRenewal(lockKey, owner, timeoutMs);
    }
    
    return acquired;
  }
  
  private startAutoRenewal(lockKey: string, owner: string, timeoutMs: number): void {
    // 在锁过期前60%的时间点开始续期
    const renewalInterval = Math.floor(timeoutMs * 0.6);
    
    const timer = setInterval(async () => {
      try {
        const renewed = await this.distributedLockManager.renewLock(lockKey, owner, timeoutMs);
        
        if (!renewed) {
          this.logger.warn(`锁续期失败，可能已被其他实例获取: ${lockKey}`);
          this.stopRenewal(lockKey);
          
          // 通知应用锁已丢失
          this.notifyLockLost(lockKey);
        } else {
          this.logger.debug(`锁续期成功: ${lockKey}`);
        }
      } catch (error) {
        this.logger.error(`锁续期异常: ${lockKey}`, error);
        this.stopRenewal(lockKey);
        this.notifyLockLost(lockKey);
      }
    }, renewalInterval);
    
    this.renewalTimers.set(lockKey, timer);
  }
  
  private notifyLockLost(lockKey: string): void {
    // 通知工作流引擎锁已丢失，需要停止相关操作
    this.eventEmitter.emit('lockLost', { lockKey });
  }
}
```

### 4.3 优雅关闭机制

```typescript
class WorkflowEngineService {
  private isShuttingDown = false;
  
  async gracefulShutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.logger.info('开始优雅关闭工作流引擎');
    
    try {
      // 1. 停止接受新的工作流
      await this.stopAcceptingNewWorkflows();
      
      // 2. 等待当前工作流完成（最多等待5分钟）
      await this.waitForCurrentWorkflowsToComplete(5 * 60 * 1000);
      
      // 3. 释放所有持有的锁
      await this.releaseAllLocks();
      
      // 4. 注销引擎实例
      if (this.distributedScheduler) {
        await this.distributedScheduler.unregisterEngine(this.instanceId);
      }
      
      this.logger.info('工作流引擎优雅关闭完成');
    } catch (error) {
      this.logger.error('优雅关闭过程中发生错误', error);
    }
  }
  
  private async releaseAllLocks(): Promise<void> {
    try {
      // 查询当前实例持有的所有锁
      const ownedLocks = await this.databaseApi
        .selectFrom('workflow_locks')
        .select(['lock_key'])
        .where('owner', '=', this.instanceId)
        .execute();
      
      // 批量释放锁
      for (const lock of ownedLocks) {
        await this.distributedLockManager.releaseLock(lock.lock_key, this.instanceId);
      }
      
      this.logger.info(`释放了 ${ownedLocks.length} 个锁`);
    } catch (error) {
      this.logger.error('释放锁时发生错误', error);
    }
  }
}

// 注册优雅关闭处理器
process.on('SIGTERM', async () => {
  await workflowEngine.gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await workflowEngine.gracefulShutdown();
  process.exit(0);
});
```

## 5. 监控和告警

### 5.1 锁状态监控

```typescript
class LockMonitoringService {
  async collectLockMetrics(): Promise<LockMetrics> {
    const metrics = await this.databaseApi
      .selectFrom('workflow_locks')
      .select([
        'lock_type',
        'owner',
        sql`COUNT(*) as lock_count`,
        sql`AVG(TIMESTAMPDIFF(SECOND, created_at, NOW())) as avg_hold_time`,
        sql`MAX(TIMESTAMPDIFF(SECOND, created_at, NOW())) as max_hold_time`,
        sql`COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_count`
      ])
      .groupBy(['lock_type', 'owner'])
      .execute();
    
    return {
      totalLocks: metrics.reduce((sum, m) => sum + Number(m.lock_count), 0),
      locksByType: metrics.reduce((acc, m) => {
        acc[m.lock_type] = (acc[m.lock_type] || 0) + Number(m.lock_count);
        return acc;
      }, {} as Record<string, number>),
      locksByOwner: metrics.reduce((acc, m) => {
        acc[m.owner] = Number(m.lock_count);
        return acc;
      }, {} as Record<string, number>),
      averageHoldTime: metrics.reduce((sum, m) => sum + Number(m.avg_hold_time), 0) / metrics.length,
      maxHoldTime: Math.max(...metrics.map(m => Number(m.max_hold_time))),
      expiredLocks: metrics.reduce((sum, m) => sum + Number(m.expired_count), 0)
    };
  }
}
```

这套完整的数据一致性机制确保了分布式锁在各种异常情况下都能正确工作，为分布式工作流引擎提供了可靠的协调基础。
