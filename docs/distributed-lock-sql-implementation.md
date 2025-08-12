# 分布式锁 SQL 实现详解

## 1. 锁获取操作 (acquireLock)

### 1.1 原子性锁获取实现

```typescript
async acquireLock(lockKey: string, owner: string, lockType: string, timeoutMs: number): Promise<boolean> {
  const expiresAt = new Date(Date.now() + timeoutMs);
  
  // 使用数据库事务确保原子性
  const result = await this.databaseApi.transaction(async (trx) => {
    // 步骤1：检查是否已存在锁
    const existingLock = await trx
      .selectFrom('workflow_locks')
      .selectAll()
      .where('lock_key', '=', lockKey)
      .executeTakeFirst();

    if (existingLock) {
      // 步骤2：检查锁是否过期
      if (new Date(existingLock.expires_at) > new Date()) {
        // 锁仍然有效，获取失败
        return false;
      }
      
      // 步骤3：锁已过期，更新锁信息
      await trx
        .updateTable('workflow_locks')
        .set({
          owner,
          expires_at: expiresAt,
          updated_at: new Date()
        })
        .where('lock_key', '=', lockKey)
        .execute();
    } else {
      // 步骤4：创建新锁
      await trx
        .insertInto('workflow_locks')
        .values({
          lock_key: lockKey,
          owner,
          lock_type: lockType,
          expires_at: expiresAt,
          created_at: new Date(),
          updated_at: new Date()
        })
        .execute();
    }

    return true;
  });

  return result;
}
```

### 1.2 对应的原始 SQL

```sql
-- 事务开始
START TRANSACTION;

-- 检查现有锁
SELECT * FROM workflow_locks WHERE lock_key = 'workflow:123' FOR UPDATE;

-- 情况1：锁不存在，创建新锁
INSERT INTO workflow_locks (
    lock_key, owner, lock_type, expires_at, created_at, updated_at
) VALUES (
    'workflow:123', 'engine_12345_1640995200000', 'workflow', 
    '2024-01-01 12:05:00', NOW(), NOW()
);

-- 情况2：锁已过期，更新锁
UPDATE workflow_locks 
SET owner = 'engine_12345_1640995200000', 
    expires_at = '2024-01-01 12:05:00',
    updated_at = NOW()
WHERE lock_key = 'workflow:123';

-- 事务提交
COMMIT;
```

## 2. 锁释放操作 (releaseLock)

### 2.1 安全锁释放实现

```typescript
async releaseLock(lockKey: string, owner: string): Promise<boolean> {
  const result = await this.databaseApi
    .deleteFrom('workflow_locks')
    .where('lock_key', '=', lockKey)
    .where('owner', '=', owner)  // 只能释放自己的锁
    .executeTakeFirst();

  return Number(result.numDeletedRows) > 0;
}
```

### 2.2 对应的 SQL

```sql
-- 只删除属于当前拥有者的锁
DELETE FROM workflow_locks 
WHERE lock_key = 'workflow:123' 
  AND owner = 'engine_12345_1640995200000';
```

## 3. 锁续期操作 (renewLock)

### 3.1 锁续期实现

```typescript
async renewLock(lockKey: string, owner: string, timeoutMs: number): Promise<boolean> {
  const expiresAt = new Date(Date.now() + timeoutMs);
  
  const result = await this.databaseApi
    .updateTable('workflow_locks')
    .set({
      expires_at: expiresAt,
      updated_at: new Date()
    })
    .where('lock_key', '=', lockKey)
    .where('owner', '=', owner)  // 只能续期自己的锁
    .executeTakeFirst();

  return Number(result.numUpdatedRows) > 0;
}
```

### 3.2 对应的 SQL

```sql
-- 续期锁的过期时间
UPDATE workflow_locks 
SET expires_at = '2024-01-01 12:10:00',
    updated_at = NOW()
WHERE lock_key = 'workflow:123' 
  AND owner = 'engine_12345_1640995200000';
```

## 4. 过期锁清理 (cleanupExpiredLocks)

### 4.1 批量清理实现

```typescript
async cleanupExpiredLocks(): Promise<number> {
  const result = await this.databaseApi
    .deleteFrom('workflow_locks')
    .where('expires_at', '<', new Date())
    .executeTakeFirst();

  return Number(result.numDeletedRows);
}
```

### 4.2 对应的 SQL

```sql
-- 删除所有过期的锁
DELETE FROM workflow_locks 
WHERE expires_at < NOW();
```

## 5. 锁状态检查 (checkLock)

### 5.1 锁状态查询实现

```typescript
async checkLock(lockKey: string): Promise<DistributedLock | null> {
  const lock = await this.databaseApi
    .selectFrom('workflow_locks')
    .selectAll()
    .where('lock_key', '=', lockKey)
    .executeTakeFirst();

  if (!lock) {
    return null;
  }

  return {
    lockKey: lock.lock_key,
    owner: lock.owner,
    lockType: lock.lock_type as 'workflow' | 'node' | 'resource',
    expiresAt: new Date(lock.expires_at),
    createdAt: new Date(lock.created_at)
  };
}
```

### 5.2 对应的 SQL

```sql
-- 查询锁状态
SELECT lock_key, owner, lock_type, expires_at, created_at 
FROM workflow_locks 
WHERE lock_key = 'workflow:123';
```

## 6. 事务原子性保证

### 6.1 数据库事务特性

```typescript
// 使用数据库事务确保原子性
await this.databaseApi.transaction(async (trx) => {
  // 所有操作在同一个事务中执行
  // 要么全部成功，要么全部回滚
  
  // 1. 检查锁状态
  const existingLock = await trx.selectFrom('workflow_locks')...
  
  // 2. 根据状态执行相应操作
  if (existingLock) {
    await trx.updateTable('workflow_locks')...
  } else {
    await trx.insertInto('workflow_locks')...
  }
  
  // 3. 记录分配信息
  await trx.insertInto('workflow_assignments')...
  
  return true;
});
```

### 6.2 并发控制机制

```sql
-- 使用 FOR UPDATE 锁定行，防止并发修改
SELECT * FROM workflow_locks 
WHERE lock_key = 'workflow:123' 
FOR UPDATE;

-- 或使用 SELECT ... FOR UPDATE SKIP LOCKED 避免阻塞
SELECT * FROM workflow_locks 
WHERE lock_key = 'workflow:123' 
FOR UPDATE SKIP LOCKED;
```

## 7. 锁键命名规范

### 7.1 锁键格式

```typescript
// 工作流级别锁
const workflowLockKey = `workflow:${workflowInstanceId}`;

// 节点级别锁
const nodeLockKey = `node:${workflowInstanceId}:${nodeId}`;

// 资源级别锁
const resourceLockKey = `resource:${resourceType}:${resourceId}`;

// 循环子任务锁
const loopTaskLockKey = `node:${workflowInstanceId}:${parentNodeId}:${iteration}`;
```

### 7.2 锁键示例

```
workflow:123                    # 工作流实例123的锁
node:123:fetch-calendars        # 工作流123中fetch-calendars节点的锁
node:123:delete-loop:5          # 工作流123中delete-loop节点第5次迭代的锁
resource:database:calendar_db   # calendar_db数据库资源的锁
```

## 8. 性能优化策略

### 8.1 索引优化

```sql
-- 锁键唯一索引（最重要）
CREATE UNIQUE INDEX uk_lock_key ON workflow_locks(lock_key);

-- 过期时间索引（用于清理）
CREATE INDEX idx_expires_at ON workflow_locks(expires_at);

-- 拥有者索引（用于查询某个实例的所有锁）
CREATE INDEX idx_owner ON workflow_locks(owner);
```

### 8.2 分区策略

```sql
-- 按时间分区，便于清理历史数据
CREATE TABLE workflow_locks (
    -- 字段定义...
) PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
    PARTITION p_current VALUES LESS THAN (UNIX_TIMESTAMP('2024-02-01')),
    PARTITION p_202402 VALUES LESS THAN (UNIX_TIMESTAMP('2024-03-01')),
    PARTITION p_202403 VALUES LESS THAN (UNIX_TIMESTAMP('2024-04-01')),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```
