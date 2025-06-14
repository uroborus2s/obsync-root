# @stratix/accountsync 设计文档

## 1. 项目概述

`@stratix/accountsync` 是基于 Stratix 框架的通讯录同步插件，旨在实现外部通讯录与 WPS 通讯录之间的高效、可扩展、可定制的数据同步。插件支持多种外部数据源（数据库、API、自定义），并通过中间数据库实现数据规范化和差异比对，最终以多种方式同步到 WPS 平台或返回标准数据。

**关键价值**：
- 降低异构系统通讯录集成难度
- 支持多源、异构、定制化同步
- 保障数据一致性与可追溯性
- 便于二次开发和扩展

## 2. 功能需求

### 2.1 用户故事
- 作为管理员，我希望能够配置外部通讯录数据源，实现自动或手动同步到WPS通讯录。
- 作为开发者，我希望可以通过插件扩展支持新的数据源或目标系统。
- 作为运维人员，我希望能通过API监控同步任务、历史和数据状态。

### 2.2 功能列表
- 支持数据库、API、自定义三类外部数据源适配
- 支持全量/增量两种同步模式
- 支持定时调度与手动触发
- 支持同步到WPS开放平台API或以标准格式返回数据
- 支持组织、用户的字段映射与数据转换
- 支持同步任务管理、历史查询、状态监控
- 支持同步日志、错误追踪与统计分析
- 支持多项目定制化扩展

## 3. 技术架构

### 3.1 架构图

```
┌────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ 外部数据源 │→ │ 数据源适配器 │→ │ 中间数据库层 │→ │ 目标适配器   │
│(DB/API/自定义)│ │(插件可扩展) │ │(orgs/users等) │ │(WPS API/返回)│
└────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

### 3.2 插件化与配置驱动
- 所有功能均以Stratix插件形式实现，支持依赖注入、生命周期钩子、装饰器等
- 通过配置文件声明数据源、目标、字段映射、同步策略等
- 支持插件扩展与自定义适配器开发

### 3.3 主要依赖
- `@stratix/database`：数据库访问与ORM
- `@stratix/cache`：缓存与Token管理
- `@stratix/queue`：任务队列与异步处理
- `@stratix/web`：API服务
- `@stratix/schedule`：定时任务

### 3.5 增量更新方案

增量更新是相对于全量同步的一种优化手段，只处理自上次同步以来发生变化的数据，可显著提高效率并减少资源消耗。本章节详细说明增量更新的机制设计与实现方案。

#### 3.5.1 增量更新的基本原理

增量更新基于"变更检测"策略，通过比较上次同步状态与当前状态，仅处理差异部分。核心流程如下：

1. 记录上次同步的状态和时间点
2. 获取外部数据源和WPS目标端的变更数据
3. 将变更数据同步到中间表
4. 生成针对变更部分的操作清单
5. 执行变更操作

#### 3.5.2 增量标识策略

##### 3.5.2.1 数据源增量标识

根据不同的数据源类型，支持多种增量标识策略：

- **时间戳策略**：基于`updated_at`/`modified_time`等时间字段
  ```sql
  -- 基于时间戳的增量查询
  SELECT * FROM source_orgs WHERE updated_at > ?
  ```

- **版本号策略**：基于`version`/`revision`等递增字段
  ```sql
  -- 基于版本号的增量查询
  SELECT * FROM source_orgs WHERE version > ?
  ```

- **变更日志策略**：基于专门的变更日志表或审计表
  ```sql
  -- 基于变更日志的增量查询
  SELECT entity_id, entity_type, change_type 
  FROM change_logs 
  WHERE created_at > ? AND entity_type IN ('org', 'user')
  ```

- **差异对比策略**：无增量标识字段时，通过数据Hash或条件比对
  ```typescript
  // 检测本次与上次数据Hash值是否变化
  const prevHash = await getPreviousHash(orgId);
  const currentHash = generateHash(orgData);
  const hasChanged = prevHash !== currentHash;
  ```

##### 3.5.2.2 中间表增量设计

- **增量标记字段**：
  ```sql
  ALTER TABLE orgs ADD COLUMN synced BOOLEAN DEFAULT FALSE;
  ALTER TABLE orgs ADD COLUMN synced_at TIMESTAMP NULL;
  ALTER TABLE orgs ADD COLUMN last_change_type VARCHAR(20) NULL;
  ```

- **软删除与变更追踪**：
  ```sql
  ALTER TABLE orgs ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  ALTER TABLE orgs ADD COLUMN deleted_at TIMESTAMP NULL;
  ALTER TABLE orgs ADD COLUMN change_count INT DEFAULT 0;
  ```

##### 3.5.2.3 增量同步记录表

```sql
CREATE TABLE sync_incremental_state (
  id VARCHAR(36) PRIMARY KEY,                   -- 记录ID
  entity_type VARCHAR(20) NOT NULL,             -- 实体类型：org/user
  last_sync_at TIMESTAMP NOT NULL,              -- 上次同步时间
  last_sync_version VARCHAR(50),                -- 上次同步版本号
  source_cursor JSON,                           -- 源端游标/状态
  target_cursor JSON,                           -- 目标端游标/状态
  checksum VARCHAR(64),                         -- 上次同步数据校验和
  config JSON,                                  -- 增量配置
  project_id VARCHAR(36),                       -- 项目ID
  tenant_id VARCHAR(36),                        -- 租户ID
  created_at TIMESTAMP NOT NULL,                -- 创建时间
  updated_at TIMESTAMP NOT NULL,                -- 更新时间
  INDEX idx_entity_type (entity_type),          -- 实体类型索引
  INDEX idx_project (project_id),               -- 项目索引
  INDEX idx_tenant (tenant_id)                  -- 租户索引
);
```

#### 3.5.3 WPS API增量同步对接

##### 3.5.3.1 获取组织/用户变更列表

调用WPS API获取变更数据，支持以下方式：

- **基于时间戳**：
  ```typescript
  // 从上次同步时间点获取变更
  const lastSyncTime = await getLastSyncTime('org');
  const changedOrgs = await wpsApi.getChangedOrgs({ 
    since: lastSyncTime
  });
  ```

- **基于变更标识**：
  ```typescript
  // 从上次同步标记点获取变更
  const lastSyncToken = await getLastSyncToken('user');
  const changedUsers = await wpsApi.getChangedUsers({ 
    sync_token: lastSyncToken
  });
  ```

- **支持分页**：
  ```typescript
  // 分页获取变更
  let page = 1;
  let hasMore = true;
  const allChanges = [];
  
  while (hasMore) {
    const { changes, next_page_token } = await wpsApi.getChanges({ 
      since: lastSyncTime,
      page,
      page_size: 100
    });
    
    allChanges.push(...changes);
    hasMore = !!next_page_token;
    page++;
  }
  ```

##### 3.5.3.2 增量请求参数

```typescript
interface IncrementalSyncParams {
  // 基于时间的增量
  since?: Date | string;
  // 基于令牌的增量
  sync_token?: string;
  // 筛选特定类型的变更
  change_types?: ('create' | 'update' | 'delete')[];
  // 变更实体类型
  entity_types?: ('org' | 'user')[];
  // 分页参数
  page?: number;
  page_size?: number;
  // 是否包含详情
  include_details?: boolean;
}
```

#### 3.5.4 变更检测与处理

##### 3.5.4.1 变更类型枚举

```typescript
enum ChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move',     // 组织移动（特殊的更新）
  RESTORE = 'restore' // 从删除状态恢复
}
```

##### 3.5.4.2 源端变更获取

```typescript
// 从数据源获取变更
async function fetchSourceChanges(config) {
  // 前置钩子
  await runHook('beforeFetchSourceChanges', { config });
  
  const lastSyncState = await getIncrementalState(config.entityType);
  
  // 根据数据源类型选择策略
  switch (config.sourceType) {
    case 'database':
      return fetchDatabaseChanges(config, lastSyncState);
    case 'api':
      return fetchApiChanges(config, lastSyncState);
    case 'custom':
      return await config.customFetcher(lastSyncState);
    default:
      throw new Error(`不支持的数据源类型: ${config.sourceType}`);
  }
}

// 数据库类型变更获取
async function fetchDatabaseChanges(config, lastSyncState) {
  const { db, table, timestampField, idField } = config;
  
  // 1. 查询新增和更新
  const changedRecords = await db(table)
    .where(timestampField, '>', lastSyncState.lastSyncAt)
    .select('*');
  
  // 2. 检测删除（可选：如有tombstone表）
  const deletedRecords = await db(`${table}_tombstone`)
    .where('deleted_at', '>', lastSyncState.lastSyncAt)
    .select(idField);
    
  // 3. 分类变更
  const changes = {
    created: changedRecords.filter(r => r.created_at > lastSyncState.lastSyncAt),
    updated: changedRecords.filter(r => r.created_at <= lastSyncState.lastSyncAt),
    deleted: deletedRecords.map(r => ({ id: r[idField] }))
  };
  
  // 4. 更新状态
  await updateIncrementalState(config.entityType, {
    lastSyncAt: new Date(),
    sourceCursor: { lastId: changedRecords.length ? changedRecords[changedRecords.length - 1][idField] : null }
  });
  
  return changes;
}
```

##### 3.5.4.3 目标端变更获取

```typescript
// 从WPS获取变更
async function fetchWpsChanges(config) {
  // 前置钩子
  await runHook('beforeFetchWpsChanges', { config });
  
  const lastSyncState = await getIncrementalState(config.entityType);
  
  // 根据实体类型获取变更
  let changes;
  if (config.entityType === 'org') {
    changes = await wpsApi.getChangedOrgs({ 
      since: lastSyncState.lastSyncAt,
      include_details: true
    });
  } else { // user
    changes = await wpsApi.getChangedUsers({ 
      since: lastSyncState.lastSyncAt,
      include_details: true
    });
  }
  
  // 分类变更
  const result = {
    created: changes.filter(c => c.change_type === ChangeType.CREATE),
    updated: changes.filter(c => c.change_type === ChangeType.UPDATE),
    moved: changes.filter(c => c.change_type === ChangeType.MOVE), // 组织特有
    deleted: changes.filter(c => c.change_type === ChangeType.DELETE),
    restored: changes.filter(c => c.change_type === ChangeType.RESTORE)
  };
  
  // 更新状态
  await updateIncrementalState(config.entityType, {
    lastSyncAt: new Date(),
    targetCursor: { 
      lastChangeId: changes.length ? changes[changes.length - 1].change_id : null
    }
  });
  
  return result;
}
```

#### 3.5.5 增量数据处理

##### 3.5.5.1 增量同步到中间表

```typescript
// 增量同步到中间表
async function syncIncrementalToLocal(changes, config) {
  // 前置钩子
  await runHook('beforeSyncIncrementalToLocal', { changes, config });
  
  const { entityType, table } = config;
  const db = getDatabase();
  const trx = await db.transaction();
  
  try {
    // 1. 处理创建
    if (changes.created.length) {
      // 映射字段
      const mappedCreates = changes.created.map(mapEntityFields);
      // 批量插入
      await trx(table).insert(mappedCreates);
    }
    
    // 2. 处理更新
    for (const entity of changes.updated) {
      const mappedEntity = mapEntityFields(entity);
      await trx(table)
        .where('id', entity.id)
        .update({
          ...mappedEntity,
          synced: false,
          last_change_type: 'update',
          change_count: trx.raw('change_count + 1')
        });
    }
    
    // 3. 处理删除
    if (changes.deleted.length) {
      const ids = changes.deleted.map(e => e.id);
      await trx(table)
        .whereIn('id', ids)
        .update({
          is_deleted: true,
          deleted_at: new Date(),
          synced: false,
          last_change_type: 'delete'
        });
    }
    
    // 4. 处理移动（组织特有）
    if (entityType === 'org' && changes.moved) {
      for (const org of changes.moved) {
        await trx(table)
          .where('id', org.id)
          .update({
            parent_id: org.parent_id,
            synced: false,
            last_change_type: 'move',
            change_count: trx.raw('change_count + 1')
          });
      }
    }
    
    await trx.commit();
    
    // 后置钩子
    await runHook('afterSyncIncrementalToLocal', { 
      changes,
      config,
      counts: {
        created: changes.created.length,
        updated: changes.updated.length,
        deleted: changes.deleted.length,
        moved: changes.moved?.length || 0
      }
    });
    
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

##### 3.5.5.2 增量差异比对

```typescript
// 增量差异比对
async function compareIncremental(config) {
  // 获取未同步的记录
  const unsyncedRecords = await db(config.table)
    .where('synced', false)
    .select('*');
  
  // 按类型分组
  const result = {
    toCreate: unsyncedRecords.filter(r => r.last_change_type === 'create' && !r.is_deleted),
    toUpdate: unsyncedRecords.filter(r => r.last_change_type === 'update' && !r.is_deleted),
    toMove: unsyncedRecords.filter(r => r.last_change_type === 'move' && !r.is_deleted),
    toDelete: unsyncedRecords.filter(r => r.is_deleted)
  };
  
  // 处理组织层级依赖
  if (config.entityType === 'org') {
    // 排序确保父组织先创建
    result.toCreate = sortOrgsByHierarchy(result.toCreate);
    result.toMove = sortOrgsByHierarchy(result.toMove);
    // 删除顺序相反
    result.toDelete = sortOrgsByHierarchy(result.toDelete, true);
  }
  
  return result;
}
```

#### 3.5.6 增量与全量结合策略

##### 3.5.6.1 周期性全量校准

```typescript
// 增量与全量结合策略配置
const incrementalConfig = {
  // 启用增量更新
  enabled: true,
  
  // 最大增量次数，超过后执行一次全量同步
  maxIncrementalCount: 10,
  
  // 最大增量时间间隔，超过后执行一次全量同步（单位：小时）
  maxIncrementalInterval: 24,
  
  // 最小全量同步间隔（单位：小时）
  minFullSyncInterval: 168, // 一周
  
  // 增量错误阈值，超过后触发全量同步
  incrementalErrorThreshold: 5,
  
  // 是否在首次同步时执行全量
  fullSyncOnFirst: true,
  
  // 是否在检测到大量变更时切换为全量
  switchToFullOnLargeChanges: true,
  
  // 大量变更阈值（占总数百分比）
  largeChangesThreshold: 0.3 // 30%
};

// 判断是否需要全量同步
async function shouldPerformFullSync(entityType) {
  if (!incrementalConfig.enabled) {
    return true; // 增量未启用，总是全量
  }
  
  const syncState = await getEntitySyncState(entityType);
  
  // 首次同步
  if (!syncState.lastFullSyncAt && incrementalConfig.fullSyncOnFirst) {
    return true;
  }
  
  // 增量次数检查
  if (syncState.incrementalCount >= incrementalConfig.maxIncrementalCount) {
    return true;
  }
  
  // 时间间隔检查
  const now = new Date();
  const hoursSinceLastFull = (now - syncState.lastFullSyncAt) / (1000 * 60 * 60);
  
  if (hoursSinceLastFull >= incrementalConfig.maxIncrementalInterval) {
    return true;
  }
  
  // 错误阈值检查
  if (syncState.incrementalErrors >= incrementalConfig.incrementalErrorThreshold) {
    return true;
  }
  
  return false;
}
```

##### 3.5.6.2 动态切换策略

```typescript
// 选择同步策略
async function chooseSyncStrategy(entityType) {
  // 检查是否应该进行全量同步
  const needFullSync = await shouldPerformFullSync(entityType);
  
  if (needFullSync) {
    return {
      type: 'full',
      reason: await getFullSyncReason(entityType)
    };
  }
  
  // 检查变更规模
  if (incrementalConfig.switchToFullOnLargeChanges) {
    const changePercentage = await estimateChangePercentage(entityType);
    
    if (changePercentage >= incrementalConfig.largeChangesThreshold) {
      return {
        type: 'full',
        reason: `检测到大量变更（${Math.round(changePercentage * 100)}%），切换为全量同步`
      };
    }
  }
  
  return {
    type: 'incremental',
    reason: '增量条件满足，执行增量同步'
  };
}

// 执行同步
async function executeSyncTask(config) {
  const strategy = await chooseSyncStrategy(config.entityType);
  
  // 记录策略选择
  await logSync({
    entityType: config.entityType,
    strategy: strategy.type,
    reason: strategy.reason
  });
  
  if (strategy.type === 'full') {
    return executeFullSync(config);
  } else {
    return executeIncrementalSync(config);
  }
}
```

#### 3.5.7 增量更新的幂等性与冲突处理

##### 3.5.7.1 幂等性保障

```typescript
// 幂等性处理器
async function processIncrementalOperation(operation) {
  // 获取上次操作状态
  const prevOp = await db('sync_operations')
    .where({
      entity_id: operation.data.id,
      entity_type: operation.entityType,
      type: operation.type
    })
    .orderBy('created_at', 'desc')
    .first();
  
  // 检查是否需要跳过
  if (prevOp && prevOp.status === 'completed') {
    const timeDiff = Date.now() - new Date(prevOp.completed_at).getTime();
    // 短时间内的重复操作直接跳过
    if (timeDiff < 300000) { // 5分钟内
      return {
        skipped: true,
        message: `跳过最近已完成的操作 ${operation.type}:${operation.data.id}`,
        prevOperation: prevOp
      };
    }
  }
  
  // 检查目标状态
  const currentState = await checkTargetState(operation);
  
  // 如果当前状态与目标操作一致，跳过
  if (currentState.matches) {
    return {
      skipped: true,
      message: `目标状态已匹配，跳过 ${operation.type}:${operation.data.id}`,
      currentState
    };
  }
  
  // 执行操作
  return executeOperation(operation);
}
```

##### 3.5.7.2 增量冲突检测与处理

```typescript
// 增量冲突检测
async function detectIncrementalConflicts(diffResult) {
  const conflicts = [];
  
  // 处理组织冲突
  for (const org of [...diffResult.orgs.toCreate, ...diffResult.orgs.toUpdate]) {
    const localVersion = await db('orgs')
      .where('id', org.id)
      .select('version', 'updated_at')
      .first();
      
    const remoteOrg = await wpsApi.getDepartment({ id: org.id });
    
    // 如果本地和远程都有更新，检测冲突
    if (remoteOrg && localVersion && 
        new Date(remoteOrg.updated_at) > new Date(localVersion.updated_at)) {
      conflicts.push({
        type: 'org',
        id: org.id,
        local: localVersion,
        remote: remoteOrg,
        operation: org.id in diffResult.orgs.toCreate ? 'create' : 'update'
      });
    }
  }
  
  // 同理处理用户冲突
  // ...
  
  return conflicts;
}

// 处理增量冲突
async function resolveIncrementalConflicts(conflicts, config) {
  const results = [];
  
  for (const conflict of conflicts) {
    // 根据配置选择处理策略
    const strategy = config.conflictStrategy || 'source_wins';
    
    switch (strategy) {
      case 'source_wins':
        // 源端数据优先
        results.push(await forceSourceUpdate(conflict));
        break;
      case 'target_wins':
        // 目标端数据优先
        results.push(await skipConflictedItem(conflict));
        break;
      case 'newer_wins':
        // 更新时间较新的优先
        if (new Date(conflict.local.updated_at) > new Date(conflict.remote.updated_at)) {
          results.push(await forceSourceUpdate(conflict));
        } else {
          results.push(await skipConflictedItem(conflict));
        }
        break;
      case 'manual':
        // 记录冲突待手动处理
        results.push(await recordManualConflict(conflict));
        break;
    }
  }
  
  return results;
}
```

#### 3.5.8 分布式增量考虑

对于分布式/多节点环境，增量更新需要特殊处理：

##### 3.5.8.1 分布式锁

```typescript
// 分布式增量锁
async function acquireIncrementalLock(entityType, instanceId) {
  // 尝试获取锁
  const result = await db('sync_locks')
    .where({
      type: `incremental_${entityType}`,
      released_at: null
    })
    .first();
  
  if (result) {
    // 检查锁是否过期
    const now = new Date();
    const lockTime = new Date(result.locked_at);
    const diffMinutes = (now - lockTime) / (1000 * 60);
    
    if (diffMinutes < 30 && result.instance_id !== instanceId) {
      // 锁被其他实例持有且未过期
      return { 
        acquired: false,
        message: `锁被实例 ${result.instance_id} 持有`
      };
    }
  }
  
  // 获取或刷新锁
  await db('sync_locks')
    .insert({
      type: `incremental_${entityType}`,
      instance_id: instanceId,
      locked_at: new Date(),
      released_at: null
    })
    .onConflict('type')
    .merge({
      instance_id: instanceId,
      locked_at: new Date(),
      released_at: null
    });
  
  return { acquired: true };
}

// 释放锁
async function releaseIncrementalLock(entityType, instanceId) {
  await db('sync_locks')
    .where({
      type: `incremental_${entityType}`,
      instance_id: instanceId
    })
    .update({
      released_at: new Date()
    });
}
```

##### 3.5.8.2 增量状态共享

```typescript
// 集中存储增量状态
async function updateSharedIncrementalState(entityType, state) {
  await db('sync_incremental_state')
    .insert({
      entity_type: entityType,
      last_sync_at: state.lastSyncAt,
      source_cursor: JSON.stringify(state.sourceCursor),
      target_cursor: JSON.stringify(state.targetCursor),
      updated_at: new Date()
    })
    .onConflict('entity_type')
    .merge();
}

// 获取共享状态
async function getSharedIncrementalState(entityType) {
  return await db('sync_incremental_state')
    .where({ entity_type: entityType })
    .first();
}
```

#### 3.5.9 增量更新自动恢复

```typescript
// 增量同步失败后自动恢复
async function recoverFailedIncrementalSync(taskId) {
  // 获取失败任务信息
  const task = await db('sync_tasks')
    .where({ id: taskId, type: 'incremental', status: 'failed' })
    .first();
  
  if (!task) {
    throw new Error(`未找到失败的增量任务: ${taskId}`);
  }
  
  // 重置增量状态
  const incrementalState = await getSharedIncrementalState(task.entity_type);
  const checkpoint = JSON.parse(task.checkpoint || '{}');
  
  // 回退到上次成功同步点
  await updateSharedIncrementalState(task.entity_type, {
    lastSyncAt: incrementalState.last_successful_sync_at || incrementalState.last_sync_at,
    sourceCursor: checkpoint.previousSourceCursor || incrementalState.source_cursor,
    targetCursor: checkpoint.previousTargetCursor || incrementalState.target_cursor
  });
  
  // 创建新的恢复任务
  const recoveryTaskId = uuidv4();
  await db('sync_tasks').insert({
    id: recoveryTaskId,
    type: 'incremental_recovery',
    entity_type: task.entity_type,
    status: 'pending',
    config: task.config,
    created_at: new Date(),
    recovery_for: taskId
  });
  
  // 执行恢复任务
  return startSyncTask(recoveryTaskId);
}
```

通过以上增量更新机制，系统可以：
1. 高效同步大量数据，只处理变更部分
2. 减少网络传输和处理资源
3. 提高同步频率，更快反映数据变化
4. 在必要时自动切换到全量同步
5. 有效处理冲突和异常情况
6. 支持分布式环境下的一致性

## 4. 数据库设计

详见 [数据模型与配置](./data-models.md)
- 组织表（orgs）：存储组织架构
- 用户表（users）：存储用户信息
- 同步日志表（sync_logs）：记录同步任务与统计
- 字段支持扩展属性、软删除、外部ID等

## 5. API规范

详见 [API设计](./api-design.md)
- 同步任务管理：创建、查询、取消任务
- 数据访问：组织、用户、树结构、增量数据
- 配置与连接校验：获取当前配置、验证数据源/目标连通性
- 支持RESTful风格，返回标准JSON结构

## 6. 非功能需求

- **性能**：支持大批量数据分批、并发、异步处理，保障同步效率
- **安全**：敏感信息通过环境变量管理，API支持认证扩展
- **可扩展性**：插件化架构，支持自定义适配器、处理器、钩子
- **可维护性**：代码结构清晰，文档完善，单元/集成/模拟测试覆盖
- **容错性**：完善的错误处理、重试机制、日志追踪
- **可观测性**：同步过程、历史、统计信息可查询

## 7. 开发里程碑

1. **基础能力**
   - 数据模型与迁移脚本
   - 数据源/目标适配器基础实现
   - 同步管理器与API路由
2. **高级特性**
   - 增量同步、批处理、并发优化
   - WPS API差异比对与同步
   - 自定义扩展点与钩子
3. **测试与文档**
   - 单元/集成/模拟测试
   - 完善开发与运维文档
4. **上线与运维**
   - 性能调优与安全加固
   - 监控与告警集成

## 8. 潜在风险与对策

- **外部数据源不稳定**：增加重试、超时、降级处理
- **数据量过大**：分批、分页、并发处理，合理配置批量参数
- **字段映射不一致**：提供灵活的映射配置与校验工具
- **WPS API变更**：接口适配层解耦，便于快速响应变更
- **安全风险**：敏感信息环境变量管理，API认证与权限控制
- **扩展性不足**：插件化、接口化设计，预留自定义扩展点

---

如需详细实现、API、数据结构等请参阅本目录下其他文档。

# @stratix/accountsync 详细开发设计文档（增强版）

## 0. 同步任务锁表设计与并发控制

### 0.1 lock表结构
- **sync_lock**
  - id（主键，固定值如'accountsync'）
  - task_id（当前持有锁的任务ID）
  - lock_type（'full'/'incremental'）
  - locked_at（加锁时间）
  - expires_at（锁过期时间，防止死锁）

### 0.2 典型实现方案
- 每次同步任务开始前，先尝试insert/update锁表（如用`SELECT ... FOR UPDATE`或唯一索引）
- 若已被锁，则拒绝新任务或排队等待
- 任务结束/异常时释放锁
- 支持超时自动释放，防止死锁
- 日志记录锁的获取与释放

---

## 1. 外部通讯录采集到中间表的详细流程（含定制策略）

### 1.1 采集策略定制
- **分批/分页**：配置每批大小，API/DB均支持
- **过滤条件**：支持where/filter配置，按需采集
- **字段映射**：配置化，支持自定义映射函数
- **数据清洗**：采集后可配置清洗/校验钩子
- **采集前/后钩子**：如采集前预处理、采集后自定义处理
- **多项目/多租户**：采集时自动带tenant_id/project_id

#### 采集伪代码
```typescript
// 采集前钩子
await runHook('beforeCollect', { type, config });
let page = 1;
do {
  // 分页采集
  const raw = await source.fetch({ page, size, filter });
  // 字段映射
  let mapped = raw.map(mapperFn);
  // 数据清洗钩子
  mapped = await runHook('afterMap', mapped);
  // 批量写入
  await db('users').insert(mapped);
  page++;
} while (raw.length === size);
// 采集后钩子
await runHook('afterCollect', { type, count });
```

### 1.2 软删除与快照机制
- **软删除**：同步前将中间表所有数据is_deleted=true，或记录deleted_at
- **快照**：可将本次采集前的中间表数据存入快照表（如orgs_snapshot/users_snapshot），支持回滚/追溯
- **恢复**：如采集失败可回滚快照
- **追溯**：支持查询历史快照，辅助问题定位

#### 快照伪代码
```typescript
// 采集前
await db('orgs_snapshot').insert(await db('orgs').select('*'));
// 软删除
await db('orgs').update({ is_deleted: true });
```

---

## 2. 差异比较的高效实现

### 2.1 组织（树结构）差异比较

#### 2.1.1 详细比对方案

- **数据来源**：
  - WPS组织数据：通过API实时拉取，结构为树或扁平列表（含id、parent_id、name等）。
  - 中间库组织数据：采集后落表，结构同上，含本地唯一id、parent_id、name、is_deleted、hash等。
- **比对目标**：
  - 找出新增、删除、移动（parent_id变更）、名称修改等差异，生成操作清单。
- **高效性**：
  - 支持大数据量分批、分层、hash优化、数据库join等。

##### 2.1.1.1 数据准备

- 拉取WPS组织数据（remoteOrgs），转为Map结构：`remoteMap = Map<id, org>`
- 查询中间库组织数据（localOrgs），同样转为Map结构：`localMap = Map<id, org>`
- 可选：为每条数据生成hash（如`hash = md5(name + parent_id)`），便于快速判断内容变更。

##### 2.1.1.2 新增部门检测

- **逻辑**：本地有，WPS无，即为新增。
- **实现**：
  ```typescript
  for (const [id, localOrg] of localMap) {
    if (!remoteMap.has(id) && !localOrg.is_deleted) {
      toCreate.push(localOrg);
    }
  }
  ```

##### 2.1.1.3 删除部门检测

- **逻辑**：WPS有，本地无，或本地已软删除，即为待删除。
- **实现**：
  ```typescript
  for (const [id, remoteOrg] of remoteMap) {
    const localOrg = localMap.get(id);
    if (!localOrg || localOrg.is_deleted) {
      toDelete.push(remoteOrg);
    }
  }
  ```

##### 2.1.1.4 移动（上下级关系变更）检测

- **逻辑**：同id，parent_id不同，说明部门被移动。
- **实现**：
  ```typescript
  for (const [id, localOrg] of localMap) {
    const remoteOrg = remoteMap.get(id);
    if (remoteOrg && localOrg.parent_id !== remoteOrg.parent_id) {
      toMove.push({ ...localOrg, old_parent_id: remoteOrg.parent_id });
    }
  }
  ```
- **注意**：移动操作需保证父节点已存在，建议分层/递归处理，先处理顶级部门，再处理下级。

##### 2.1.1.5 名称修改检测

- **逻辑**：同id，name不同，说明名称被修改。
- **实现**：
  ```typescript
  for (const [id, localOrg] of localMap) {
    const remoteOrg = remoteMap.get(id);
    if (remoteOrg && localOrg.name !== remoteOrg.name) {
      toRename.push({ ...localOrg, old_name: remoteOrg.name });
    }
  }
  ```
- **可选优化**：用hash字段比对，避免多字段逐一比较。

##### 2.1.1.6 分层递归与批量处理

- **分层递归**：
  - 先处理parent_id为null或0的顶级部门，再递归处理下级，保证父节点先于子节点操作。
  - 每层可分批处理，避免单批数据过大。
- **伪代码示例**：
  ```typescript
  function compareLayer(parentId) {
    const localChildren = localOrgs.filter(x => x.parent_id === parentId);
    const remoteChildren = remoteOrgs.filter(x => x.parent_id === parentId);
    // ...上述新增、删除、移动、重命名逻辑...
    for (const child of localChildren) {
      compareLayer(child.id);
    }
  }
  compareLayer(ROOT_PARENT_ID);
  ```

##### 2.1.1.7 数据库join优化（大数据量场景）

- **SQL示例**（MySQL/PostgreSQL）：
  - 新增：`SELECT l.* FROM local_orgs l LEFT JOIN remote_orgs r ON l.id = r.id WHERE r.id IS NULL AND l.is_deleted=0`
  - 删除：`SELECT r.* FROM remote_orgs r LEFT JOIN local_orgs l ON r.id = l.id WHERE l.id IS NULL OR l.is_deleted=1`
  - 移动/重命名：`SELECT l.*, r.parent_id AS remote_parent_id, r.name AS remote_name FROM local_orgs l JOIN remote_orgs r ON l.id = r.id WHERE l.parent_id != r.parent_id OR l.name != r.name`
- **分批处理**：加`LIMIT`/`OFFSET`或游标。

##### 2.1.1.8 操作清单生成与顺序

- **顺序建议**：
  1. 新增（自顶向下，父先于子）
  2. 移动（同上）
  3. 重命名
  4. 删除（自底向上，子先于父，防止孤儿节点）
- **幂等性**：每次操作前校验目标状态，避免重复。

##### 2.1.1.9 伪代码总览

```typescript
// 1. 数据准备
const localMap = new Map(localOrgs.map(x => [x.id, x]));
const remoteMap = new Map(remoteOrgs.map(x => [x.id, x]));

// 2. 新增
for (const [id, localOrg] of localMap) {
  if (!remoteMap.has(id) && !localOrg.is_deleted) toCreate.push(localOrg);
}

// 3. 删除
for (const [id, remoteOrg] of remoteMap) {
  const localOrg = localMap.get(id);
  if (!localOrg || localOrg.is_deleted) toDelete.push(remoteOrg);
}

// 4. 移动
for (const [id, localOrg] of localMap) {
  const remoteOrg = remoteMap.get(id);
  if (remoteOrg && localOrg.parent_id !== remoteOrg.parent_id) toMove.push(localOrg);
}

// 5. 重命名
for (const [id, localOrg] of localMap) {
  const remoteOrg = remoteMap.get(id);
  if (remoteOrg && localOrg.name !== remoteOrg.name) toRename.push(localOrg);
}

// 6. 分层递归处理，保证顺序
// 7. 生成操作清单，分批执行
```

##### 2.1.1.10 典型异常与边界处理

- **父节点不存在**：新增/移动时需先处理父节点，或报错/补偿。
- **循环依赖**：检测parent_id环路，防止死循环。
- **孤儿节点**：删除时自底向上，先删子节点。
- **批量失败重试**：操作失败时记录日志，支持重试/补偿。

##### 2.1.1.11 可扩展点

- **钩子支持**：每步比对、操作前后均可插入钩子，支持自定义逻辑。
- **多租户/多项目**：比对时自动带tenant_id/project_id，数据隔离。
- **字段扩展**：如需比对更多字段，可配置字段映射与hash策略。

##### 2.1.1.12 流程图（简化版）

```
[拉取WPS组织] ←──┐
                  │
[拉取本地组织] ←──┘
      │
      ▼
[构建Map/分层]
      │
      ▼
[比对新增/删除/移动/重命名]
      │
      ▼
[生成操作清单]
      │
      ▼
[分批/递归执行]
```

如需SQL脚本、具体实现代码、钩子注册示例等可进一步补充。
如有特殊业务场景（如跨租户移动、批量重命名等），请补充说明。

#### 2.1.2 比对策略模式设计

为适应不同数据量和场景，系统支持"临时表+SQL比对"和"内存比对"两种差异比对策略，并可通过配置灵活切换。

- **比对策略（DiffStrategy）**：抽象出比对接口，支持多种实现。
- **可配置切换**：通过配置文件或环境变量指定当前使用的比对策略（如`diff.strategy=sql`或`diff.strategy=memory`）。
- **典型场景**：
  - 小数据量：优先用内存比对，速度快、实现简单。
  - 大数据量：优先用临时表+SQL比对，性能高、内存占用低。

##### 2.1.2.1 策略接口定义（伪代码）

```typescript
interface DiffStrategy {
  diff(localData: Org[], remoteData: Org[]): DiffResult;
}
```

##### 2.1.2.2 内存比对实现

- 适合数据量较小（如<1万条）。
- 直接将本地和WPS数据拉入内存，构建Map/Set进行比对。

```typescript
class MemoryDiffStrategy implements DiffStrategy {
  diff(localData: Org[], remoteData: Org[]): DiffResult {
    // 构建Map，执行新增、删除、移动、重命名等比对逻辑
    // ...见前述内存比对伪代码...
    return { toCreate, toDelete, toMove, toRename };
  }
}
```

##### 2.1.2.3 临时表+SQL比对实现

- 适合大数据量（如>1万条）。
- 步骤：
  1. WPS数据批量写入临时表（如`tmp_wps_orgs`）。
  2. 通过SQL Join/Except等语句与本地表比对，生成差异清单。
  3. 结果可分页/分批处理。

```typescript
class SqlDiffStrategy implements DiffStrategy {
  async diff(localData: Org[], remoteData: Org[]): Promise<DiffResult> {
    // 1. 批量写入remoteData到临时表
    await db.batchInsert('tmp_wps_orgs', remoteData);
    // 2. SQL比对
    const toCreate = await db.raw('SELECT ...'); // 新增
    const toDelete = await db.raw('SELECT ...'); // 删除
    const toMove   = await db.raw('SELECT ...'); // 移动
    const toRename = await db.raw('SELECT ...'); // 重命名
    // 3. 清理临时表
    await db('tmp_wps_orgs').truncate();
    return { toCreate, toDelete, toMove, toRename };
  }
}
```

##### 2.1.2.4 策略选择与配置

- **配置示例**（config.yaml）：
  ```yaml
  diff:
    strategy: sql   # 可选：sql 或 memory
  ```
- **工厂方法**：
  ```typescript
  function createDiffStrategy(config): DiffStrategy {
    if (config.diff.strategy === 'sql') return new SqlDiffStrategy();
    return new MemoryDiffStrategy();
  }
  ```

##### 2.1.2.5 配置驱动的比对流程

```typescript
const strategy = createDiffStrategy(config);
const diffResult = await strategy.diff(localData, remoteData);
// 后续生成操作清单、分批处理等
```

##### 2.1.2.6 扩展性

- 后续如需支持"流式比对""外部存储比对"等新策略，只需实现DiffStrategy接口并在工厂方法中注册即可。
- 每种策略可独立优化、单元测试、热插拔。

> 推荐：小数据量用内存比对，大数据量用SQL比对，支持动态切换。

### 2.2 人员差异比较
- **主键比对**：以id为主键，外键org_id
- **字段hash**：可为每个用户生成字段hash，快速判断变更
- **批量/分区**：大数据量时分批处理
- **数据库join优化**：如`SELECT ... FROM users u LEFT JOIN wps_users w ON u.id=w.id WHERE ...`

### 2.3 大数据量优化
- **分批拉取/比对**：每批处理N条，避免内存溢出
- **游标/分页**：数据库游标或API分页
- **数据库直接比对**：用SQL join/except等直接比对差异
- **hash索引**：为关键字段加hash索引，快速定位变更
- **分区表**：极大数据量可用分区表优化

---

## 3. 差异处理与操作清单生成

### 3.1 操作清单生成
- **新增**：本地有，WPS无
- **更新**：本地与WPS有差异
- **删除**：WPS有，本地无或本地is_deleted=true
- **分批处理**：每批N条，支持并发
- **幂等性**：所有操作需支持幂等，避免重复
- **一致性**：操作前后需校验，失败可重试/补偿

#### 操作清单伪代码
```typescript
const ops = [];
toCreate.forEach(x => ops.push({ op: 'create', data: x }));
toUpdate.forEach(x => ops.push({ op: 'update', data: x }));
toDelete.forEach(x => ops.push({ op: 'delete', data: x }));
// 分批执行
for (let i = 0; i < ops.length; i += batchSize) {
  const batch = ops.slice(i, i + batchSize);
  await wpsApi.batchOperate(batch);
}
```

---

## 4. 可插拔钩子点说明

### 4.1 钩子类型与典型用法
- **采集前**（beforeCollect）：如校验配置、预处理
- **采集后**（afterCollect）：如数据统计、通知
- **字段映射**（mapField）：自定义字段转换
- **数据清洗**（afterMap）：如正则校验、去重
- **软删除前/后**（beforeSoftDelete/afterSoftDelete）：如快照、备份
- **快照前/后**（beforeSnapshot/afterSnapshot）：如通知、审计
- **差异比对前/后**（beforeDiff/afterDiff）：如自定义比对逻辑
- **WPS API调用前/后**（beforeWpsApi/afterWpsApi）：如数据加工、回调
- **异常处理**（onError）：统一异常捕获、报警
- **日志**（onLog）：自定义日志落地

#### 钩子用法示例
```typescript
await runHook('beforeCollect', { type, config });
// ...采集逻辑...
await runHook('afterCollect', { type, count });
```
- 钩子可通过配置注册，支持同步/异步、全局/项目级
- 支持多租户/多项目钩子隔离

---

## 5. 结构化实现建议
- lock表与任务管理建议单独实现LockService，所有同步流程入口先加锁
- 采集、映射、清洗、软删除、快照、比对、操作清单、API调用、日志、异常等均实现为独立Service/Manager，便于插拔与测试
- 钩子机制建议统一实现HookManager，支持配置化注册与调用
- 大数据量建议优先用数据库join/hash/分批，内存仅做小批量缓存
- 所有表结构、API、配置、钩子均支持tenant_id/project_id隔离

---

如需DDL、具体钩子注册示例、SQL优化建议等可进一步补充。

### 3.1 差异处理策略

在差异比对完成后，获得了组织和用户的变更列表（新增、修改、移动、删除等），需要一个高效、可靠、可扩展的处理策略将这些差异操作应用到WPS通讯录。本章节详细说明差异处理的核心策略和实现方案。

#### 3.1.1 差异处理策略模式

针对比对后的差异处理，系统提供三种策略模式，可通过配置灵活切换：

##### 3.1.1.1 队列模式

- **核心思想**：差异操作进入队列，由专门的消费者异步处理。
- **适用场景**：大批量操作、需要重试机制、需要异步处理的场景。
- **优点**：解耦比对和执行、支持高并发、失败自动重试、可监控和追踪。
- **缺点**：实现复杂、增加依赖（需要消息队列）、结果非即时。

##### 3.1.1.2 批处理模式

- **核心思想**：将差异操作分批直接执行，每批可并发但批与批之间同步。
- **适用场景**：中等数量操作、需要部分并发但又要控制资源使用的场景。
- **优点**：实现相对简单、无需外部队列依赖、结果准实时。
- **缺点**：重试逻辑需自行实现、监控不如队列模式完善。

##### 3.1.1.3 实时模式

- **核心思想**：比对完直接串行执行所有差异操作。
- **适用场景**：小批量操作、原型验证、需要即时结果的场景。
- **优点**：实现最简单、结果即时可见、流程清晰易理解。
- **缺点**：性能较差、不适合大批量、容错性较低。

#### 3.1.2 队列模式详细设计

##### 3.1.2.1 队列结构

- **基于Stratix框架的@stratix/queue实现，支持以下队列**：
  - `org-operations`：组织操作队列
  - `user-operations`：用户操作队列
  - `sync-notifications`：同步通知队列

##### 3.1.2.2 操作结构

```typescript
interface QueueOperation {
  id: string;               // 操作唯一ID，用于跟踪和去重
  type: OperationType;      // 操作类型，如'createOrg', 'updateUser'等
  data: any;                // 操作数据
  priority: number;         // 优先级，1-10，默认5
  attemptsMade: number;     // 已尝试次数
  maxAttempts: number;      // 最大尝试次数
  projectId?: string;       // 项目ID
  tenantId?: string;        // 租户ID
  createdAt: Date;          // 创建时间
  options?: object;         // 额外选项
}
```

##### 3.1.2.3 队列处理流程

```typescript
// 生产者 - 差异比对后将操作推送到队列
async function enqueueOperations(diffResult) {
  // 前置钩子
  await runHook('beforeEnqueueOperations', { diffResult });
  
  // 按优先级和依赖关系组织操作
  const operations = organizeOperations(diffResult);
  
  // 入队
  for (const operation of operations) {
    await queue.add(
      operation.type.startsWith('org') ? 'org-operations' : 'user-operations',
      operation,
      {
        priority: operation.priority,
        attempts: operation.maxAttempts,
        jobId: operation.id // 确保幂等
      }
    );
  }
  
  // 后置钩子
  await runHook('afterEnqueueOperations', { 
    count: operations.length,
    operations
  });
  
  return {
    success: true,
    operationCount: operations.length,
    queues: {
      org: operations.filter(op => op.type.startsWith('org')).length,
      user: operations.filter(op => op.type.startsWith('user')).length
    }
  };
}

// 消费者 - 处理队列中的操作
async function processOperation(job) {
  const operation = job.data;
  
  // 前置钩子
  await runHook('beforeProcessOperation', { operation, job });
  
  try {
    // 执行具体操作
    const result = await executeOperation(operation);
    
    // 记录成功
    await db('sync_logs').insert({
      operation_id: operation.id,
      type: operation.type,
      status: 'success',
      completed_at: new Date(),
      result: JSON.stringify(result)
    });
    
    // 后置钩子
    await runHook('afterProcessOperation', { 
      operation, 
      result,
      success: true
    });
    
    return result;
  } catch (error) {
    // 记录失败
    await db('sync_logs').insert({
      operation_id: operation.id,
      type: operation.type,
      status: 'failed',
      completed_at: new Date(),
      error: JSON.stringify(error)
    });
    
    // 错误钩子
    await runHook('onProcessOperationError', { 
      operation, 
      error,
      attemptsMade: operation.attemptsMade + 1
    });
    
    // 达到最大重试次数则发送通知
    if (operation.attemptsMade + 1 >= operation.maxAttempts) {
      await queue.add('sync-notifications', {
        type: 'operation-failed',
        operationId: operation.id,
        error: error.message
      });
    }
    
    throw error; // 抛出错误以触发队列重试
  }
}
```

##### 3.1.2.4 队列监控和管理

```typescript
// 初始化队列和监控
function setupQueues() {
  // 设置队列处理器
  queue.process('org-operations', 5, processOperation);  // 并发5个组织操作
  queue.process('user-operations', 10, processOperation); // 并发10个用户操作
  
  // 设置监控
  queue.on('completed', (job) => {
    logger.info(`操作完成: ${job.id}, 类型: ${job.data.type}`);
  });
  
  queue.on('failed', (job, error) => {
    logger.error(`操作失败: ${job.id}, 类型: ${job.data.type}, 错误: ${error.message}`);
  });
  
  // 清理完成的任务（可选）
  setupQueueCleaner();
}
```

#### 3.1.3 批处理模式详细设计

##### 3.1.3.1 批处理结构

```typescript
interface BatchProcessConfig {
  batchSize: number;          // 每批大小，默认100
  concurrency: number;        // 每批内并发度，默认10
  delayBetweenBatches: number; // 批次间延迟(ms)，默认1000
  stopOnError: boolean;       // 错误时是否停止，默认false
  retryCount: number;         // 重试次数，默认3
  retryDelay: number;         // 重试延迟(ms)，默认1000
}
```

##### 3.1.3.2 批处理流程

```typescript
// 批处理主函数
async function processDiffInBatch(diffResult, config: BatchProcessConfig) {
  // 前置钩子
  await runHook('beforeBatchProcess', { diffResult, config });
  
  // 组织操作顺序
  const operations = organizeOperations(diffResult);
  const totalCount = operations.length;
  let successCount = 0;
  let failedCount = 0;
  const failedOperations = [];
  
  // 按批次处理
  for (let i = 0; i < operations.length; i += config.batchSize) {
    const batch = operations.slice(i, i + config.batchSize);
    
    // 批次前钩子
    await runHook('beforeBatch', { 
      batch, 
      batchIndex: Math.floor(i / config.batchSize),
      totalBatches: Math.ceil(operations.length / config.batchSize)
    });
    
    // 并发处理当前批次
    const results = await Promise.allSettled(
      batch.map(operation => 
        executeWithRetry(() => executeOperation(operation), config.retryCount, config.retryDelay)
      )
    );
    
    // 统计结果
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
        // 记录成功日志
        recordSuccessLog(batch[index], result.value);
      } else {
        failedCount++;
        failedOperations.push({
          operation: batch[index],
          error: result.reason
        });
        // 记录失败日志
        recordFailureLog(batch[index], result.reason);
      }
    });
    
    // 批次后钩子
    await runHook('afterBatch', { 
      results,
      successCount,
      failedCount,
      batchIndex: Math.floor(i / config.batchSize)
    });
    
    // 批次间延迟
    if (i + config.batchSize < operations.length) {
      await sleep(config.delayBetweenBatches);
    }
    
    // 如配置为出错停止，则检查是否需要中断
    if (config.stopOnError && failedCount > 0) {
      break;
    }
  }
  
  // 后置钩子
  await runHook('afterBatchProcess', {
    totalCount,
    successCount,
    failedCount,
    failedOperations
  });
  
  return {
    totalCount,
    successCount,
    failedCount,
    failedOperations
  };
}
```

#### 3.1.4 实时模式详细设计

实时模式最为简单，直接按顺序执行所有操作：

```typescript
// 实时处理主函数
async function processDiffRealtime(diffResult) {
  // 前置钩子
  await runHook('beforeRealtimeProcess', { diffResult });
  
  // 组织操作顺序
  const operations = organizeOperations(diffResult);
  const results = [];
  
  // 串行执行
  for (const operation of operations) {
    try {
      // 执行操作
      const result = await executeOperation(operation);
      results.push({ operation, result, success: true });
      // 记录成功
      recordSuccessLog(operation, result);
    } catch (error) {
      results.push({ operation, error, success: false });
      // 记录失败
      recordFailureLog(operation, error);
      // 可选：失败时终止
      // break;
    }
  }
  
  // 后置钩子
  await runHook('afterRealtimeProcess', { results });
  
  return {
    totalCount: operations.length,
    successCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
    results
  };
}
```

#### 3.1.5 操作组织与优先级

无论采用哪种处理模式，都需要合理组织操作顺序，确保依赖关系和优先级：

```typescript
// 组织操作顺序与优先级
function organizeOperations(diffResult) {
  const operations = [];
  
  // 1. 组织操作 - 按层级自顶向下添加
  // 1.1 创建组织
  addOperationsByLevel(operations, diffResult.orgs.toCreate, 'createOrg', 6);
  
  // 1.2 移动组织
  addOperationsByLevel(operations, diffResult.orgs.toMove, 'moveOrg', 5);
  
  // 1.3 重命名组织
  diffResult.orgs.toRename.forEach(org => {
    operations.push({
      id: `renameOrg-${org.id}`,
      type: 'renameOrg',
      data: org,
      priority: 4,
      attemptsMade: 0,
      maxAttempts: 3,
      createdAt: new Date()
    });
  });
  
  // 1.4 删除组织 - 按层级自底向上添加
  addOperationsByLevelReverse(operations, diffResult.orgs.toDelete, 'deleteOrg', 2);
  
  // 2. 用户操作
  // 2.1 创建用户
  diffResult.users.toCreate.forEach(user => {
    operations.push({
      id: `createUser-${user.id}`,
      type: 'createUser',
      data: user,
      priority: 6,
      attemptsMade: 0,
      maxAttempts: 3,
      createdAt: new Date()
    });
  });
  
  // 2.2 更新用户
  diffResult.users.toUpdate.forEach(user => {
    operations.push({
      id: `updateUser-${user.id}`,
      type: 'updateUser',
      data: user,
      priority: 5,
      attemptsMade: 0,
      maxAttempts: 3,
      createdAt: new Date()
    });
  });
  
  // 2.3 软删除用户
  diffResult.users.toSoftDelete.forEach(user => {
    operations.push({
      id: `softDeleteUser-${user.id}`,
      type: 'softDeleteUser',
      data: user,
      priority: 3,
      attemptsMade: 0,
      maxAttempts: 3,
      createdAt: new Date()
    });
  });
  
  // 2.4 硬删除用户
  diffResult.users.toHardDelete.forEach(user => {
    operations.push({
      id: `hardDeleteUser-${user.id}`,
      type: 'hardDeleteUser',
      data: user,
      priority: 2,
      attemptsMade: 0,
      maxAttempts: 3,
      createdAt: new Date()
    });
  });
  
  return operations;
}

// 辅助函数：按层级添加操作（自顶向下）
function addOperationsByLevel(operations, items, type, priority) {
  // 构建组织树
  const orgMap = new Map();
  items.forEach(org => {
    if (!orgMap.has(org.parent_id)) {
      orgMap.set(org.parent_id, []);
    }
    orgMap.get(org.parent_id).push(org);
  });
  
  // 按层级遍历（广度优先）
  function traverseLevel(parentId, level = 0) {
    const children = orgMap.get(parentId) || [];
    
    children.forEach(org => {
      operations.push({
        id: `${type}-${org.id}`,
        type,
        data: org,
        priority,  // 基础优先级
        level,     // 记录层级
        attemptsMade: 0,
        maxAttempts: 3,
        createdAt: new Date()
      });
    });
    
    children.forEach(org => traverseLevel(org.id, level + 1));
  }
  
  // 从根节点开始
  traverseLevel(null);
  traverseLevel(0);
}

// 辅助函数：按层级添加操作（自底向上，用于删除）
function addOperationsByLevelReverse(operations, items, type, priority) {
  // 类似上面的实现，但添加顺序相反
  // ...
}
```

#### 3.1.6 策略选择器

```typescript
// 策略选择器 - 根据配置选择处理策略
async function processDiff(diffResult, config) {
  switch (config.process.strategy) {
    case 'queue':
      return enqueueOperations(diffResult);
    case 'batch':
      return processDiffInBatch(diffResult, config.process.batch);
    case 'realtime':
      return processDiffRealtime(diffResult);
    default:
      throw new Error(`未知的处理策略: ${config.process.strategy}`);
  }
}
```

#### 3.1.7 配置示例

```yaml
# 差异处理策略配置
process:
  # 处理策略: queue, batch, realtime
  strategy: batch
  
  # 队列模式配置
  queue:
    # 组织操作并发
    orgConcurrency: 5
    # 用户操作并发
    userConcurrency: 10
    # 默认重试次数
    defaultRetries: 3
    # 默认超时时间(ms)
    defaultTimeout: 30000
    
  # 批处理模式配置
  batch:
    # 每批大小
    batchSize: 100
    # 批内并发度
    concurrency: 10
    # 批次间延迟(ms)
    delayBetweenBatches: 1000
    # 错误时是否停止
    stopOnError: false
    # 重试次数
    retryCount: 3
    # 重试延迟(ms)
    retryDelay: 1000
```

### 3.3 差异操作的具体实现与钩子

差异比对完成后，需要将变更同步到WPS通讯录。以下是针对组织和用户的各类操作实现细节和钩子机制。

#### 3.3.1 组织操作

##### 3.3.1.1 新增组织

- **操作顺序**：自顶向下，确保先创建父组织，再创建子组织。
- **实现伪代码**：
  ```typescript
  async function createOrg(org, options) {
    // 前置钩子
    await runHook('beforeCreateOrg', { org, options });
    
    // 检查父组织是否存在
    const parentExists = await checkParentExists(org.parent_id);
    if (!parentExists) {
      throw new Error(`父组织 ${org.parent_id} 不存在`);
    }
    
    // 执行API调用
    const result = await wpsApi.createDepartment({
      name: org.name,
      parent_id: org.parent_id,
      ...options.extraParams // 支持额外参数
    });
    
    // 后置钩子
    await runHook('afterCreateOrg', { org, result, options });
    
    return result;
  }
  ```
- **支持钩子**：
  - `beforeCreateOrg`：组织创建前，可修改参数或中断操作
  - `afterCreateOrg`：组织创建后，可执行后续流程或记录日志

##### 3.3.1.2 修改组织名称

- **实现伪代码**：
  ```typescript
  async function renameOrg(org, options) {
    // 前置钩子
    await runHook('beforeRenameOrg', { org, options });
    
    // 执行API调用
    const result = await wpsApi.updateDepartment({
      id: org.id,
      name: org.name,
      ...options.extraParams
    });
    
    // 后置钩子
    await runHook('afterRenameOrg', { org, result, options });
    
    return result;
  }
  ```
- **支持钩子**：
  - `beforeRenameOrg`：组织重命名前，可修改名称或中断
  - `afterRenameOrg`：组织重命名后，可执行后续流程

##### 3.3.1.3 移动组织（修改上级）

- **注意事项**：确保不产生循环依赖，目标父组织必须已存在。
- **实现伪代码**：
  ```typescript
  async function moveOrg(org, options) {
    // 前置钩子
    await runHook('beforeMoveOrg', { org, options });
    
    // 检查是否有循环依赖
    const hasCircular = await checkCircularDependency(org.id, org.parent_id);
    if (hasCircular) {
      throw new Error(`移动组织 ${org.id} 到 ${org.parent_id} 会产生循环依赖`);
    }
    
    // 执行API调用
    const result = await wpsApi.updateDepartment({
      id: org.id,
      parent_id: org.parent_id,
      ...options.extraParams
    });
    
    // 后置钩子
    await runHook('afterMoveOrg', { org, result, options });
    
    return result;
  }
  ```
- **支持钩子**：
  - `beforeMoveOrg`：组织移动前，可检查合规性或中断
  - `afterMoveOrg`：组织移动后，可更新关联数据

##### 3.3.1.4 删除组织

- **操作顺序**：自底向上，确保先删除子组织，再删除父组织，避免孤儿节点。
- **实现伪代码**：
  ```typescript
  async function deleteOrg(org, options) {
    // 前置钩子
    await runHook('beforeDeleteOrg', { org, options });
    
    // 检查是否有子组织或用户
    const hasChildren = await checkOrgHasChildren(org.id);
    if (hasChildren && !options.force) {
      throw new Error(`组织 ${org.id} 存在子组织或用户，不能删除`);
    }
    
    // 执行API调用
    const result = await wpsApi.deleteDepartment({
      id: org.id,
      ...options.extraParams
    });
    
    // 后置钩子
    await runHook('afterDeleteOrg', { org, result, options });
    
    return result;
  }
  ```
- **支持钩子**：
  - `beforeDeleteOrg`：组织删除前，可执行子节点检查或备份
  - `afterDeleteOrg`：组织删除后，可清理关联数据

#### 3.3.2 用户操作

##### 3.3.2.1 创建用户

- **实现伪代码**：
  ```typescript
  async function createUser(user, options) {
    // 前置钩子
    await runHook('beforeCreateUser', { user, options });
    
    // 检查用户所属组织是否存在
    const orgExists = await checkOrgExists(user.org_id);
    if (!orgExists) {
      throw new Error(`用户所属组织 ${user.org_id} 不存在`);
    }
    
    // 执行API调用
    const result = await wpsApi.createUser({
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      org_id: user.org_id,
      ...options.extraParams
    });
    
    // 后置钩子
    await runHook('afterCreateUser', { user, result, options });
    
    return result;
  }
  ```
- **支持钩子**：
  - `beforeCreateUser`：用户创建前，可修改用户信息或中断
  - `afterCreateUser`：用户创建后，可执行后续流程

##### 3.3.2.2 添加/修改用户所属组织

- **实现伪代码**：
  ```typescript
  async function updateUserOrg(user, options) {
    // 前置钩子
    await runHook('beforeUpdateUserOrg', { user, options });
    
    // 检查目标组织是否存在
    const orgExists = await checkOrgExists(user.org_id);
    if (!orgExists) {
      throw new Error(`目标组织 ${user.org_id} 不存在`);
    }
    
    // 执行API调用
    const result = await wpsApi.updateUser({
      id: user.id,
      org_id: user.org_id,
      ...options.extraParams
    });
    
    // 后置钩子
    await runHook('afterUpdateUserOrg', { user, result, options });
    
    return result;
  }
  ```
- **支持钩子**：
  - `beforeUpdateUserOrg`：修改用户组织前，可执行权限检查
  - `afterUpdateUserOrg`：修改用户组织后，可同步关联系统

##### 3.3.2.3 软删除用户（移动到根目录）

- **特殊说明**：软删除仅将用户转移到根目录，不实际删除。
- **实现伪代码**：
  ```typescript
  async function softDeleteUser(user, options) {
    // 前置钩子
    await runHook('beforeSoftDeleteUser', { user, options });
    
    // 获取根目录ID
    const rootOrgId = await getRootOrgId();
    
    // 执行API调用 - 移动用户到根目录
    const result = await wpsApi.updateUser({
      id: user.id,
      org_id: rootOrgId,
      ...options.extraParams
    });
    
    // 标记为软删除
    await db('users').where({ id: user.id }).update({ 
      is_deleted: true, 
      deleted_at: new Date(),
      delete_expires_at: new Date(Date.now() + options.expireTime || 30*24*60*60*1000) // 默认30天后硬删除
    });
    
    // 后置钩子
    await runHook('afterSoftDeleteUser', { user, result, options });
    
    return result;
  }
  ```
- **支持钩子**：
  - `beforeSoftDeleteUser`：软删除前，可执行备份或通知
  - `afterSoftDeleteUser`：软删除后，可更新相关系统

##### 3.3.2.4 硬删除用户（定时清理）

- **特殊说明**：达到指定时间后，清理软删除用户。
- **实现伪代码**：
  ```typescript
  async function hardDeleteUser(user, options) {
    // 前置钩子
    await runHook('beforeHardDeleteUser', { user, options });
    
    // 判断是否达到删除时间
    const now = new Date();
    if (user.delete_expires_at && user.delete_expires_at > now && !options.force) {
      return { skipped: true, message: '未达到删除时间' };
    }
    
    // 执行API调用
    const result = await wpsApi.deleteUser({
      id: user.id,
      ...options.extraParams
    });
    
    // 后置钩子
    await runHook('afterHardDeleteUser', { user, result, options });
    
    return result;
  }
  ```
- **定时任务**：
  ```typescript
  // 定时任务，检查并硬删除过期软删除用户
  async function cleanupSoftDeletedUsers() {
    const expiredUsers = await db('users')
      .where('is_deleted', true)
      .where('delete_expires_at', '<', new Date());
      
    for (const user of expiredUsers) {
      await hardDeleteUser(user, { force: true });
    }
  }
  ```
- **支持钩子**：
  - `beforeHardDeleteUser`：硬删除前，可执行最终确认
  - `afterHardDeleteUser`：硬删除后，可清理关联数据

#### 3.3.3 钩子注册与使用

##### 3.3.3.1 钩子注册方式

```typescript
// 全局钩子
accountsync.registerHook('beforeCreateOrg', async (params) => {
  console.log('即将创建组织:', params.org);
  // 可修改参数
  params.org.name = `${params.org.name}_Modified`;
  // 返回false可中断操作
  return true;
});

// 项目级钩子
accountsync.registerHook('afterCreateUser', async (params) => {
  // 仅在特定项目ID下执行
  if (params.options.project_id === 'project1') {
    await sendNotification(`用户 ${params.user.name} 已创建`);
  }
});
```

##### 3.3.3.2 钩子执行引擎

```typescript
async function runHook(hookName, params) {
  const hooks = getRegisteredHooks(hookName);
  
  for (const hook of hooks) {
    // 过滤项目级钩子
    if (hook.project_id && hook.project_id !== params.options.project_id) {
      continue;
    }
    
    // 执行钩子，允许中断
    const result = await hook.handler(params);
    if (result === false) {
      throw new Error(`钩子 ${hookName} 中断了操作`);
    }
  }
}
```

#### 3.3.4 操作顺序与批量处理

- **组织同步顺序**：
  1. 新增组织（自顶向下）
  2. 移动组织（同上）
  3. 重命名组织
  4. 删除组织（自底向上）

- **用户同步顺序**：
  1. 创建用户
  2. 修改用户组织/信息
  3. 软删除/硬删除用户

- **批量处理**：
  ```typescript
  async function batchProcess(operations, batchSize = 100) {
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      await Promise.all(batch.map(op => executeOperation(op)));
    }
  }
  ```

#### 3.3.5 错误处理与重试

- **单个操作失败处理**：
  ```typescript
  async function executeWithRetry(operation, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          await runHook('onOperationFailed', { operation, error, retries });
          throw error;
        }
        await sleep(1000 * retries); // 指数退避
      }
    }
  }
  ```

- **批量操作错误恢复**：支持从断点继续，跳过失败项等策略。

#### 3.3.6 操作执行器

```typescript
// 统一的操作执行器，基于操作类型分发到具体处理函数
async function executeOperation(operation) {
  const { type, data, options = {} } = operation;
  
  const handlers = {
    'createOrg': createOrg,
    'renameOrg': renameOrg,
    'moveOrg': moveOrg,
    'deleteOrg': deleteOrg,
    'createUser': createUser,
    'updateUserOrg': updateUserOrg,
    'softDeleteUser': softDeleteUser,
    'hardDeleteUser': hardDeleteUser
  };
  
  if (!handlers[type]) {
    throw new Error(`未知的操作类型: ${type}`);
  }
  
  return executeWithRetry(() => handlers[type](data, options));
}
``` 

### 3.4 断点续传与异常恢复机制

为确保在断电、系统崩溃等意外情况下，同步任务能够可靠恢复并继续执行，同时支持历史回溯，accountsync实现了完善的断点续传与异常恢复机制。

#### 3.4.1 同步状态持久化

##### 3.4.1.1 同步任务状态表

```sql
CREATE TABLE sync_tasks (
  id VARCHAR(36) PRIMARY KEY,                    -- 任务ID，UUID
  type VARCHAR(20) NOT NULL,                     -- 任务类型：full/incremental
  status VARCHAR(20) NOT NULL,                   -- 状态：pending/running/paused/completed/failed
  progress FLOAT DEFAULT 0,                      -- 进度：0-100
  current_step VARCHAR(50),                      -- 当前步骤
  current_batch INT DEFAULT 0,                   -- 当前批次
  total_batches INT DEFAULT 0,                   -- 总批次数
  total_operations INT DEFAULT 0,                -- 总操作数
  completed_operations INT DEFAULT 0,            -- 已完成操作数
  failed_operations INT DEFAULT 0,               -- 失败操作数
  last_operation_id VARCHAR(36),                 -- 上一个处理的操作ID
  checkpoint JSON,                               -- 检查点数据
  config JSON,                                   -- 任务配置
  started_at TIMESTAMP,                          -- 开始时间
  updated_at TIMESTAMP,                          -- 最后更新时间
  completed_at TIMESTAMP,                        -- 完成时间
  error TEXT,                                    -- 错误信息
  project_id VARCHAR(36),                        -- 项目ID
  tenant_id VARCHAR(36),                         -- 租户ID
  created_by VARCHAR(36),                        -- 创建人
  INDEX idx_status (status),                     -- 状态索引
  INDEX idx_type (type),                         -- 类型索引
  INDEX idx_project (project_id),                -- 项目索引
  INDEX idx_tenant (tenant_id)                   -- 租户索引
);
```

##### 3.4.1.2 操作记录表

```sql
CREATE TABLE sync_operations (
  id VARCHAR(36) PRIMARY KEY,                    -- 操作ID，UUID
  task_id VARCHAR(36) NOT NULL,                  -- 所属任务ID
  type VARCHAR(50) NOT NULL,                     -- 操作类型：createOrg/moveOrg等
  status VARCHAR(20) NOT NULL,                   -- 状态：pending/completed/failed
  data JSON NOT NULL,                            -- 操作数据
  result JSON,                                   -- 操作结果
  error TEXT,                                    -- 错误信息
  priority INT DEFAULT 5,                        -- 优先级：1-10
  batch INT DEFAULT 0,                           -- 所属批次
  level INT DEFAULT 0,                           -- 层级（针对组织）
  attempts INT DEFAULT 0,                        -- 尝试次数
  max_attempts INT DEFAULT 3,                    -- 最大尝试次数
  created_at TIMESTAMP NOT NULL,                 -- 创建时间
  updated_at TIMESTAMP NOT NULL,                 -- 更新时间
  completed_at TIMESTAMP,                        -- 完成时间
  INDEX idx_task_status (task_id, status),       -- 任务状态联合索引
  INDEX idx_task_type (task_id, type),           -- 任务类型联合索引
  INDEX idx_batch (task_id, batch)               -- 批次索引
);
```

#### 3.4.2 状态持久化机制

```typescript
// 更新任务状态
async function updateTaskStatus(taskId, status, progress, step) {
  await db('sync_tasks').where({ id: taskId }).update({
    status,
    progress,
    current_step: step,
    updated_at: new Date()
  });
  
  // 记录任务历史（可选）
  await db('sync_task_history').insert({
    task_id: taskId,
    status,
    progress,
    step,
    created_at: new Date()
  });
}

// 创建检查点
async function createCheckpoint(taskId, data) {
  await db('sync_tasks').where({ id: taskId }).update({
    checkpoint: JSON.stringify(data),
    updated_at: new Date()
  });
}
```

##### 3.4.2.1 检查点频率策略

- **批次检查点**：每完成一个批次的操作，创建一个检查点
- **时间检查点**：每隔指定时间（如5分钟）创建一个检查点
- **进度检查点**：进度每增加10%创建一个检查点
- **关键节点检查点**：在关键操作（如组织层级处理完成）后创建检查点

#### 3.4.3 恢复机制

##### 3.4.3.1 任务恢复流程

```typescript
// 恢复任务
async function resumeTask(taskId) {
  // 获取任务信息
  const task = await db('sync_tasks').where({ id: taskId }).first();
  if (!task || !['paused', 'failed'].includes(task.status)) {
    throw new Error(`任务 ${taskId} 不存在或状态不允许恢复`);
  }
  
  // 更新任务状态
  await updateTaskStatus(taskId, 'running', task.progress, task.current_step);
  
  // 恢复前钩子
  await runHook('beforeResumeTask', { task });
  
  // 从检查点恢复
  const checkpoint = JSON.parse(task.checkpoint || '{}');
  
  // 根据不同步骤恢复
  switch (task.current_step) {
    case 'comparison':
      // 恢复到比对阶段
      await resumeComparison(taskId, checkpoint);
      break;
    case 'processing':
      // 恢复到处理阶段
      await resumeProcessing(taskId, checkpoint);
      break;
    default:
      // 从头开始
      await startSync(taskId);
  }
  
  // 恢复后钩子
  await runHook('afterResumeTask', { task });
}

// 恢复处理阶段
async function resumeProcessing(taskId, checkpoint) {
  // 获取未完成的操作
  const pendingOperations = await db('sync_operations')
    .where({ task_id: taskId })
    .whereNotIn('status', ['completed'])
    .orderBy([
      { column: 'batch', order: 'asc' },
      { column: 'priority', order: 'desc' },
      { column: 'level', order: 'asc' }
    ]);
  
  // 获取任务配置
  const task = await db('sync_tasks').where({ id: taskId }).first();
  const config = JSON.parse(task.config || '{}');
  
  // 根据处理策略恢复
  switch (config.process.strategy) {
    case 'queue':
      // 重新入队未完成操作
      await reEnqueueOperations(pendingOperations);
      break;
    case 'batch':
      // 分批处理未完成操作
      await processBatchFromCheckpoint(pendingOperations, config.process.batch, checkpoint);
      break;
    case 'realtime':
      // 顺序处理未完成操作
      await processRealtime(pendingOperations);
      break;
  }
}
```

##### 3.4.3.2 自动恢复检测

```typescript
// 系统启动时检测未完成任务
async function detectUnfinishedTasks() {
  const unfinishedTasks = await db('sync_tasks')
    .whereIn('status', ['running', 'paused'])
    .orderBy('updated_at', 'desc');
  
  for (const task of unfinishedTasks) {
    // 检查是否需要自动恢复
    const shouldAutoResume = await checkAutoResume(task);
    
    if (shouldAutoResume) {
      await resumeTask(task.id);
    } else {
      // 标记为中断，等待手动恢复
      await updateTaskStatus(task.id, 'paused', task.progress, `interrupted_${task.current_step}`);
      
      // 通知管理员
      await sendNotification({
        type: 'task_interrupted',
        task_id: task.id,
        message: `任务 ${task.id} 被中断，需要手动恢复`
      });
    }
  }
}
```

#### 3.4.4 操作幂等性保障

所有同步操作必须设计为幂等操作，确保即使重复执行也不会产生副作用：

##### 3.4.4.1 幂等设计原则

- **唯一ID**：每个操作都有唯一ID，用于跟踪和去重
- **状态检查**：执行前检查操作当前状态
- **结果比对**：执行前比对当前状态与目标状态，若已一致则跳过
- **事务控制**：复杂操作使用事务确保原子性

```typescript
// 幂等操作执行器
async function executeIdempotentOperation(operation) {
  // 检查操作是否已完成
  const existingOp = await db('sync_operations')
    .where({ id: operation.id })
    .first();
    
  if (existingOp && existingOp.status === 'completed') {
    return JSON.parse(existingOp.result || '{}');
  }
  
  // 执行前检查 - 以组织创建为例
  if (operation.type === 'createOrg') {
    // 检查组织是否已存在
    const existingOrg = await wpsApi.getDepartment({ id: operation.data.id });
    if (existingOrg) {
      // 已存在，直接标记为完成
      await db('sync_operations')
        .where({ id: operation.id })
        .update({
          status: 'completed',
          result: JSON.stringify(existingOrg),
          completed_at: new Date(),
          updated_at: new Date()
        });
      return existingOrg;
    }
  }
  
  // 执行操作...
  try {
    const result = await executeOperation(operation);
    // 更新操作状态
    await db('sync_operations')
      .where({ id: operation.id })
      .update({
        status: 'completed',
        result: JSON.stringify(result),
        completed_at: new Date(),
        updated_at: new Date(),
        attempts: db.raw('attempts + 1')
      });
    return result;
  } catch (error) {
    // 更新失败状态
    await db('sync_operations')
      .where({ id: operation.id })
      .update({
        status: error.permanent ? 'failed' : 'pending',
        error: JSON.stringify(error),
        updated_at: new Date(),
        attempts: db.raw('attempts + 1')
      });
    throw error;
  }
}
```

#### 3.4.5 事务支持

对于需要保证原子性的操作，使用数据库事务确保一致性：

```typescript
async function executeWithTransaction(operations) {
  // 开始事务
  const trx = await db.transaction();
  
  try {
    const results = [];
    
    for (const operation of operations) {
      // 使用事务执行操作
      const result = await executeOperationWithTransaction(operation, trx);
      results.push(result);
    }
    
    // 提交事务
    await trx.commit();
    return results;
  } catch (error) {
    // 回滚事务
    await trx.rollback();
    throw error;
  }
}
```

#### 3.4.6 回溯能力

##### 3.4.6.1 历史快照表

```sql
CREATE TABLE sync_snapshots (
  id VARCHAR(36) PRIMARY KEY,                    -- 快照ID
  task_id VARCHAR(36) NOT NULL,                  -- 任务ID
  checkpoint_id VARCHAR(36),                     -- 检查点ID
  data JSON NOT NULL,                            -- 快照数据
  type VARCHAR(20) NOT NULL,                     -- 快照类型：orgs/users/both
  created_at TIMESTAMP NOT NULL,                 -- 创建时间
  INDEX idx_task (task_id),                      -- 任务索引
  INDEX idx_checkpoint (checkpoint_id)           -- 检查点索引
);
```

##### 3.4.6.2 快照创建

```typescript
// 创建同步快照
async function createSyncSnapshot(taskId, type, data) {
  const snapshotId = uuidv4();
  
  await db('sync_snapshots').insert({
    id: snapshotId,
    task_id: taskId,
    type,
    data: JSON.stringify(data),
    created_at: new Date()
  });
  
  return snapshotId;
}

// 在关键节点创建快照
async function createCheckpointWithSnapshot(taskId, checkpointData, snapshotData) {
  // 开始事务
  const trx = await db.transaction();
  
  try {
    // 创建检查点
    await db('sync_tasks')
      .where({ id: taskId })
      .update({
        checkpoint: JSON.stringify(checkpointData),
        updated_at: new Date()
      })
      .transacting(trx);
    
    // 创建快照
    const snapshotId = uuidv4();
    await db('sync_snapshots')
      .insert({
        id: snapshotId,
        task_id: taskId,
        checkpoint_id: checkpointData.id,
        type: snapshotData.type,
        data: JSON.stringify(snapshotData.data),
        created_at: new Date()
      })
      .transacting(trx);
    
    // 提交事务
    await trx.commit();
    
    return { checkpointId: checkpointData.id, snapshotId };
  } catch (error) {
    // 回滚事务
    await trx.rollback();
    throw error;
  }
}
```

##### 3.4.6.3 回溯到历史状态

```typescript
// 回溯到指定快照
async function rollbackToSnapshot(snapshotId) {
  // 获取快照
  const snapshot = await db('sync_snapshots')
    .where({ id: snapshotId })
    .first();
  
  if (!snapshot) {
    throw new Error(`快照 ${snapshotId} 不存在`);
  }
  
  // 回溯前钩子
  await runHook('beforeRollback', { snapshot });
  
  // 解析快照数据
  const data = JSON.parse(snapshot.data);
  
  // 创建回溯任务
  const rollbackTaskId = uuidv4();
  await db('sync_tasks').insert({
    id: rollbackTaskId,
    type: 'rollback',
    status: 'pending',
    progress: 0,
    current_step: 'preparing',
    config: JSON.stringify({
      source_snapshot_id: snapshotId,
      source_task_id: snapshot.task_id
    }),
    created_at: new Date(),
    updated_at: new Date()
  });
  
  // 执行回溯
  await executeRollback(rollbackTaskId, data);
  
  // 回溯后钩子
  await runHook('afterRollback', { 
    snapshot, 
    rollbackTaskId 
  });
  
  return { 
    rollbackTaskId, 
    message: `已创建回溯任务 ${rollbackTaskId}` 
  };
}
```

#### 3.4.7 冲突处理

在恢复过程中可能遇到数据冲突，需要策略处理：

##### 3.4.7.1 冲突检测

```typescript
// 检测并处理冲突
async function detectAndResolveConflicts(operation) {
  // 根据操作类型检测不同冲突
  switch (operation.type) {
    case 'createOrg':
      return detectCreateOrgConflict(operation);
    case 'updateUser':
      return detectUpdateUserConflict(operation);
    // ...其他类型
    default:
      return { hasConflict: false, operation };
  }
}

// 检测创建组织的冲突
async function detectCreateOrgConflict(operation) {
  // 检查组织是否已存在但内容不同
  const existingOrg = await wpsApi.getDepartment({ id: operation.data.id });
  
  if (existingOrg) {
    // 组织已存在，检查是否有差异
    const differences = compareOrgProperties(existingOrg, operation.data);
    
    if (Object.keys(differences).length > 0) {
      // 存在差异，需要处理冲突
      return {
        hasConflict: true,
        existing: existingOrg,
        operation,
        differences,
        resolutionOptions: [
          { type: 'keep_existing', description: '保留现有组织数据' },
          { type: 'use_new', description: '使用新数据覆盖' },
          { type: 'merge', description: '合并数据（保留ID等关键字段）' }
        ]
      };
    }
  }
  
  // 无冲突
  return { hasConflict: false, operation };
}
```

##### 3.4.7.2 冲突解决策略

```typescript
// 解决冲突
async function resolveConflict(conflict, resolution) {
  // 前置钩子
  await runHook('beforeResolveConflict', { conflict, resolution });
  
  let resolvedOperation;
  
  switch (resolution.type) {
    case 'keep_existing':
      // 保留现有数据，将操作标记为已完成
      await db('sync_operations')
        .where({ id: conflict.operation.id })
        .update({
          status: 'completed',
          result: JSON.stringify(conflict.existing),
          completed_at: new Date(),
          updated_at: new Date()
        });
      return conflict.existing;
      
    case 'use_new':
      // 使用新数据，先删除现有数据再创建
      resolvedOperation = {
        ...conflict.operation,
        type: `update${conflict.operation.type.slice(6)}` // createOrg -> updateOrg
      };
      break;
      
    case 'merge':
      // 合并数据
      const mergedData = {
        ...conflict.existing,
        ...conflict.operation.data,
        id: conflict.existing.id // 保留原ID
      };
      
      resolvedOperation = {
        ...conflict.operation,
        type: `update${conflict.operation.type.slice(6)}`,
        data: mergedData
      };
      break;
      
    case 'custom':
      // 自定义解决方案
      resolvedOperation = {
        ...conflict.operation,
        data: resolution.customData
      };
      break;
  }
  
  // 执行解决后的操作
  const result = await executeOperation(resolvedOperation);
  
  // 后置钩子
  await runHook('afterResolveConflict', { 
    conflict, 
    resolution, 
    result 
  });
  
  return result;
}
```

##### 3.4.7.3 自动/手动冲突处理策略

```typescript
// 配置冲突处理策略
const conflictResolutionConfig = {
  // 全局默认策略
  defaultStrategy: 'ask', // ask/auto
  
  // 按操作类型的策略
  byOperationType: {
    createOrg: 'auto:merge',
    updateUser: 'auto:use_new',
    deleteOrg: 'ask'
  },
  
  // 自动处理规则
  autoRules: [
    {
      // 如果只是name变更，自动使用新数据
      condition: conflict => 
        Object.keys(conflict.differences).length === 1 && 
        conflict.differences.name,
      resolution: 'use_new'
    },
    {
      // 如果parent_id变更，需要确认
      condition: conflict => conflict.differences.parent_id,
      resolution: 'ask'
    }
  ]
};

// 处理冲突
async function handleConflict(conflict) {
  // 获取冲突处理策略
  const strategy = getConflictStrategy(conflict);
  
  if (strategy.startsWith('auto:')) {
    // 自动处理
    const resolutionType = strategy.split(':')[1];
    return resolveConflict(conflict, { type: resolutionType });
  } else {
    // 需要人工干预
    // 1. 记录冲突
    await db('sync_conflicts').insert({
      id: uuidv4(),
      task_id: conflict.operation.task_id,
      operation_id: conflict.operation.id,
      conflict_data: JSON.stringify(conflict),
      status: 'pending',
      created_at: new Date()
    });
    
    // 2. 通知管理员
    await sendNotification({
      type: 'conflict_detected',
      conflict_id: conflict.id,
      operation_type: conflict.operation.type,
      message: `同步任务 ${conflict.operation.task_id} 发现冲突，需要手动解决`
    });
    
    // 3. 暂停相关操作
    await pauseRelatedOperations(conflict.operation);
    
    // 4. 返回等待状态
    return {
      status: 'waiting_resolution',
      conflict_id: conflict.id
    };
  }
}

// 获取冲突处理策略
function getConflictStrategy(conflict) {
  // 检查操作类型特定策略
  const typeStrategy = conflictResolutionConfig.byOperationType[conflict.operation.type];
  if (typeStrategy) return typeStrategy;
  
  // 检查自动规则
  for (const rule of conflictResolutionConfig.autoRules) {
    if (rule.condition(conflict)) {
      return `auto:${rule.resolution}`;
    }
  }
  
  // 使用默认策略
  return conflictResolutionConfig.defaultStrategy;
}
```

通过以上机制，系统可以确保在出现意外（如断电、系统崩溃）时：
1. 同步任务状态被持久化保存
2. 可从断点恢复继续执行
3. 所有操作具有幂等性，避免重复执行造成问题
4. 可以回溯到历史状态
5. 能够有效处理可能出现的数据冲突

这种机制极大提高了同步过程的可靠性和鲁棒性，即使在最严重的系统故障情况下，也能保证数据最终一致性和可追溯性。 