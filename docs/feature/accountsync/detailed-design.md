# @stratix/accountsync 插件详细设计文档

## 1. 插件概述

`@stratix/accountsync` 是基于 Stratix 框架的通讯录同步插件，实现外部通讯录与 WPS 通讯录之间的高效数据同步。本插件设计遵循 Stratix 框架的函数式、纯配置、插件化思想，提供灵活可扩展的通讯录同步解决方案。

### 1.1 核心价值

- **通用适配能力**：支持多种外部数据源（数据库、API、自定义）接入
- **灵活同步模式**：支持全量/增量两种同步模式，满足不同场景需求
- **高度可配置**：通过配置文件定义数据源、映射关系、同步策略
- **扩展性设计**：基于扩展点机制支持自定义适配器和处理逻辑
- **可靠性保障**：完善的错误处理、日志跟踪和状态管理机制
- **开箱即用**：内置WPS通讯录对接能力，降低集成成本

### 1.2 功能范围

- 外部通讯录数据提取（支持数据库、API和自定义源）
- 数据标准化和转换（中间数据库层处理）
- 差异对比和变更检测
- 数据同步到WPS通讯录（API模式和数据返回模式）
- 同步任务管理和监控
- 同步日志和错误处理

### 1.3 插件依赖

- `@stratix/database`: 数据库访问支持
- `@stratix/cache`: 缓存服务和令牌管理
- `@stratix/queue`: 异步任务队列
- `@stratix/web`: Web API服务
- `@stratix/schedule`: 计划任务调度

## 2. 架构设计

### 2.1 整体架构

```
                            ┌───────────────────────────────────────┐
                            │           @stratix/accountsync        │
                            └───────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────┐    ┌───────────────┐    ┌─────┐    ┌───────────────┐    ┌──────────────┐
│                 │    │               │    │     │    │               │    │              │
│  外部数据源     │───▶│  源端适配器   │───▶│中间层│───▶│  目标适配器   │───▶│ WPS通讯录   │
│ (DB/API/自定义) │    │ (可扩展插件)  │    │     │    │ (API/数据返回) │    │ 或数据返回  │
│                 │    │               │    │     │    │               │    │              │
└─────────────────┘    └───────────────┘    └─────┘    └───────────────┘    └──────────────┘
                                               │
                                               │
                                     ┌─────────┴─────────┐
                                     │                   │
                                     ▼                   ▼
                               ┌──────────┐       ┌────────────┐
                               │ 全量同步 │       │ 增量同步   │
                               └──────────┘       └────────────┘
```

### 2.2 核心组件

#### 2.2.1 源端适配器 (Source Adapters)

负责从外部数据源提取通讯录数据，支持三种类型：

- **数据库适配器**：从关系型数据库读取组织和用户数据
- **API适配器**：调用外部API接口获取组织和用户数据
- **自定义适配器**：通过插件机制支持自定义数据源

#### 2.2.2 中间数据层 (Intermediate Layer)

提供统一的数据存储和处理机制：

- **全量表**：保存完整的组织和用户数据，用于全量同步和差异对比
- **增量表**：记录增量变更数据，支持高效的增量同步
- **状态表**：跟踪同步状态、进度和历史记录

#### 2.2.3 目标适配器 (Target Adapters)

负责将数据同步到目标系统：

- **WPS API适配器**：通过WPS开放平台API进行同步
- **数据返回适配器**：将同步数据格式化后返回，供外部系统处理

#### 2.2.4 同步引擎 (Sync Engine)

协调整个同步过程：

- **全量同步引擎**：处理完整数据集的同步和差异对比
- **增量同步引擎**：处理变更数据的高效同步
- **调度器**：管理同步任务的触发和执行

#### 2.2.5 管理API (Management API)

提供同步管理接口：

- 同步触发与控制
- 状态查询和监控
- 配置管理
- 日志和统计

### 2.3 插件核心结构

```typescript
// accountsync插件核心定义
const accountsyncPlugin: StratixPlugin<AccountsyncOptions> = {
  name: 'accountsync',
  dependencies: ['database', 'cache', 'queue', 'web', 'schedule'],
  optionalDependencies: [],
  register: async (app, options) => {
    // 注册内部组件
    registerComponents(app, options);
    
    // 配置路由
    if (app.hasPlugin('web')) {
      registerRoutes(app, options);
    }
    
    // 设置计划任务
    if (app.hasPlugin('schedule')) {
      setupSchedules(app, options);
    }
    
    // 初始化数据库
    await setupDatabase(app, options);
    
    // 注册公共API
    registerPublicApi(app, options);
    
    // 注册命令行接口
    registerCLI(app, options);
    
    // 应用钩子
    setupHooks(app, options);
  },
  // 配置Schema定义
  schema: {
    type: 'object',
    properties: {
      // 插件配置项...
    }
  }
};
```

## 3. 数据模型设计

### 3.1 中间数据表结构

#### 3.1.1 组织全量表 (sync_organizations)

```sql
CREATE TABLE sync_organizations (
  id VARCHAR(64) PRIMARY KEY,                    -- 组织ID
  parent_id VARCHAR(64),                         -- 父组织ID
  name VARCHAR(255) NOT NULL,                    -- 组织名称
  code VARCHAR(64),                              -- 组织编码
  order_num INT DEFAULT 0,                       -- 排序号
  path TEXT,                                     -- 组织路径
  level INT DEFAULT 0,                           -- 组织层级
  type VARCHAR(50),                              -- 组织类型
  status INT DEFAULT 1,                          -- 状态(1:正常,0:禁用)
  description TEXT,                              -- 描述
  ext_attrs JSON,                                -- 扩展属性
  source_id VARCHAR(64),                         -- 来源ID
  source_parent_id VARCHAR(64),                  -- 来源父ID
  source_updated_at TIMESTAMP,                   -- 来源更新时间
  synced BOOLEAN DEFAULT FALSE,                  -- 是否已同步
  synced_at TIMESTAMP,                           -- 同步时间
  is_deleted BOOLEAN DEFAULT FALSE,              -- 是否已删除
  deleted_at TIMESTAMP,                          -- 删除时间
  created_at TIMESTAMP NOT NULL,                 -- 创建时间
  updated_at TIMESTAMP NOT NULL,                 -- 更新时间
  tenant_id VARCHAR(64),                         -- 租户ID
  project_id VARCHAR(64),                        -- 项目ID
  
  INDEX idx_parent (parent_id),                 -- 父组织索引
  INDEX idx_synced (synced),                    -- 同步状态索引
  INDEX idx_deleted (is_deleted),               -- 删除状态索引
  INDEX idx_tenant (tenant_id),                 -- 租户索引
  INDEX idx_project (project_id)                -- 项目索引
);
```

#### 3.1.2 用户全量表 (sync_users)

```sql
CREATE TABLE sync_users (
  id VARCHAR(64) PRIMARY KEY,                   -- 用户ID
  username VARCHAR(64) NOT NULL,                -- 用户名
  name VARCHAR(64) NOT NULL,                    -- 姓名
  email VARCHAR(255),                           -- 邮箱
  mobile VARCHAR(20),                           -- 手机号
  avatar VARCHAR(255),                          -- 头像
  gender VARCHAR(10),                           -- 性别
  status INT DEFAULT 1,                         -- 状态(1:正常,0:禁用)
  employee_id VARCHAR(64),                      -- 工号
  position VARCHAR(255),                        -- 职位
  ext_attrs JSON,                               -- 扩展属性
  source_id VARCHAR(64),                        -- 来源ID
  source_updated_at TIMESTAMP,                  -- 来源更新时间
  synced BOOLEAN DEFAULT FALSE,                 -- 是否已同步
  synced_at TIMESTAMP,                          -- 同步时间
  is_deleted BOOLEAN DEFAULT FALSE,             -- 是否已删除
  deleted_at TIMESTAMP,                         -- 删除时间
  created_at TIMESTAMP NOT NULL,                -- 创建时间
  updated_at TIMESTAMP NOT NULL,                -- 更新时间
  tenant_id VARCHAR(64),                        -- 租户ID
  project_id VARCHAR(64),                       -- 项目ID
  
  INDEX idx_username (username),               -- 用户名索引
  INDEX idx_email (email),                     -- 邮箱索引
  INDEX idx_mobile (mobile),                   -- 手机号索引
  INDEX idx_synced (synced),                   -- 同步状态索引
  INDEX idx_deleted (is_deleted),              -- 删除状态索引
  INDEX idx_tenant (tenant_id),                -- 租户索引
  INDEX idx_project (project_id)               -- 项目索引
);
```

#### 3.1.3 组织用户关系全量表 (sync_org_user_relations)

```sql
CREATE TABLE sync_org_user_relations (
  id VARCHAR(64) PRIMARY KEY,                    -- 关系ID
  org_id VARCHAR(64) NOT NULL,                   -- 组织ID
  user_id VARCHAR(64) NOT NULL,                  -- 用户ID
  is_primary BOOLEAN DEFAULT FALSE,              -- 是否主部门
  position VARCHAR(255),                         -- 在组织中的职位
  ext_attrs JSON,                                -- 扩展属性
  source_updated_at TIMESTAMP,                   -- 来源更新时间
  synced BOOLEAN DEFAULT FALSE,                  -- 是否已同步
  synced_at TIMESTAMP,                           -- 同步时间
  is_deleted BOOLEAN DEFAULT FALSE,              -- 是否已删除
  deleted_at TIMESTAMP,                          -- 删除时间
  created_at TIMESTAMP NOT NULL,                 -- 创建时间
  updated_at TIMESTAMP NOT NULL,                 -- 更新时间
  tenant_id VARCHAR(64),                         -- 租户ID
  project_id VARCHAR(64),                        -- 项目ID
  
  UNIQUE KEY uk_org_user (org_id, user_id),      -- 组织用户唯一索引
  INDEX idx_org (org_id),                        -- 组织索引
  INDEX idx_user (user_id),                      -- 用户索引
  INDEX idx_synced (synced),                     -- 同步状态索引
  INDEX idx_deleted (is_deleted),                -- 删除状态索引
  INDEX idx_tenant (tenant_id),                  -- 租户索引
  INDEX idx_project (project_id)                 -- 项目索引
);
```

#### 3.1.4 组织增量表 (sync_incremental_orgs)

```sql
CREATE TABLE sync_incremental_orgs (
  id VARCHAR(64) PRIMARY KEY,                    -- 记录ID
  org_id VARCHAR(64) NOT NULL,                   -- 组织ID
  parent_id VARCHAR(64),                         -- 父组织ID
  name VARCHAR(255) NOT NULL,                    -- 组织名称
  change_type ENUM('create', 'update', 'delete', 'move') NOT NULL, -- 变更类型
  change_time TIMESTAMP NOT NULL,                -- 变更时间
  raw_data JSON,                                 -- 原始数据
  processed BOOLEAN DEFAULT FALSE,               -- 是否已处理
  processed_at TIMESTAMP,                        -- 处理时间
  error_message TEXT,                            -- 错误信息
  retry_count INT DEFAULT 0,                     -- 重试次数
  created_at TIMESTAMP NOT NULL,                 -- 创建时间
  updated_at TIMESTAMP NOT NULL,                 -- 更新时间
  tenant_id VARCHAR(64),                         -- 租户ID
  project_id VARCHAR(64),                        -- 项目ID
  
  INDEX idx_org (org_id),                       -- 组织索引
  INDEX idx_change_type (change_type),          -- 变更类型索引
  INDEX idx_processed (processed),              -- 处理状态索引
  INDEX idx_change_time (change_time),          -- 变更时间索引
  INDEX idx_tenant (tenant_id),                 -- 租户索引
  INDEX idx_project (project_id)                -- 项目索引
);
```

#### 3.1.5 用户增量表 (sync_incremental_users)

```sql
CREATE TABLE sync_incremental_users (
  id VARCHAR(64) PRIMARY KEY,                    -- 记录ID
  user_id VARCHAR(64) NOT NULL,                  -- 用户ID
  name VARCHAR(64) NOT NULL,                     -- 姓名
  change_type ENUM('create', 'update', 'delete') NOT NULL, -- 变更类型
  change_time TIMESTAMP NOT NULL,                -- 变更时间
  raw_data JSON,                                 -- 原始数据
  processed BOOLEAN DEFAULT FALSE,               -- 是否已处理
  processed_at TIMESTAMP,                        -- 处理时间
  error_message TEXT,                            -- 错误信息
  retry_count INT DEFAULT 0,                     -- 重试次数
  created_at TIMESTAMP NOT NULL,                 -- 创建时间
  updated_at TIMESTAMP NOT NULL,                 -- 更新时间
  tenant_id VARCHAR(64),                         -- 租户ID
  project_id VARCHAR(64),                        -- 项目ID
  
  INDEX idx_user (user_id),                     -- 用户索引
  INDEX idx_change_type (change_type),          -- 变更类型索引
  INDEX idx_processed (processed),              -- 处理状态索引
  INDEX idx_change_time (change_time),          -- 变更时间索引
  INDEX idx_tenant (tenant_id),                 -- 租户索引
  INDEX idx_project (project_id)                -- 项目索引
);
```

#### 3.1.6 组织用户关系增量表 (sync_incremental_relations)

```sql
CREATE TABLE sync_incremental_relations (
  id VARCHAR(64) PRIMARY KEY,                    -- 记录ID
  relation_id VARCHAR(64) NOT NULL,              -- 关系ID
  org_id VARCHAR(64) NOT NULL,                   -- 组织ID
  user_id VARCHAR(64) NOT NULL,                  -- 用户ID
  change_type ENUM('create', 'update', 'delete') NOT NULL, -- 变更类型
  change_time TIMESTAMP NOT NULL,                -- 变更时间
  raw_data JSON,                                 -- 原始数据
  processed BOOLEAN DEFAULT FALSE,               -- 是否已处理
  processed_at TIMESTAMP,                        -- 处理时间
  error_message TEXT,                            -- 错误信息
  retry_count INT DEFAULT 0,                     -- 重试次数
  created_at TIMESTAMP NOT NULL,                 -- 创建时间
  updated_at TIMESTAMP NOT NULL,                 -- 更新时间
  tenant_id VARCHAR(64),                         -- 租户ID
  project_id VARCHAR(64),                        -- 项目ID
  
  INDEX idx_relation (relation_id),             -- 关系索引
  INDEX idx_org_user (org_id, user_id),         -- 组织用户组合索引
  INDEX idx_change_type (change_type),          -- 变更类型索引
  INDEX idx_processed (processed),              -- 处理状态索引
  INDEX idx_change_time (change_time),          -- 变更时间索引
  INDEX idx_tenant (tenant_id),                 -- 租户索引
  INDEX idx_project (project_id)                -- 项目索引
);
```

### 3.2 同步状态表

```sql
CREATE TABLE sync_tasks (
  id VARCHAR(64) PRIMARY KEY,                 -- 任务ID
  type ENUM('full', 'incremental') NOT NULL,  -- 同步类型
  entity_type ENUM('org', 'user', 'relation', 'all') NOT NULL, -- 实体类型
  status ENUM('pending', 'running', 'completed', 'failed', 'cancelled') NOT NULL, -- 状态
  progress FLOAT DEFAULT 0,                   -- 进度(0-100)
  start_time TIMESTAMP,                       -- 开始时间
  end_time TIMESTAMP,                         -- 结束时间
  config JSON,                                -- 任务配置
  result JSON,                                -- 结果摘要
  error TEXT,                                 -- 错误信息
  source VARCHAR(255) NOT NULL,               -- 任务来源
  trigger_type ENUM('manual', 'scheduled', 'webhook', 'api'), -- 触发类型
  triggered_by VARCHAR(64),                   -- 触发者
  tenant_id VARCHAR(64),                      -- 租户ID
  project_id VARCHAR(64),                     -- 项目ID
  created_at TIMESTAMP NOT NULL,              -- 创建时间
  updated_at TIMESTAMP NOT NULL,              -- 更新时间
  
  INDEX idx_status (status),                  -- 状态索引
  INDEX idx_type (type),                      -- 同步类型索引
  INDEX idx_entity (entity_type),             -- 实体类型索引
  INDEX idx_tenant (tenant_id),               -- 租户索引
  INDEX idx_project (project_id),             -- 项目索引
  INDEX idx_created (created_at)              -- 创建时间索引
);
```

### 3.3 同步日志表

```sql
CREATE TABLE sync_logs (
  id VARCHAR(64) PRIMARY KEY,                 -- 日志ID
  task_id VARCHAR(64),                        -- 关联任务ID
  level ENUM('info', 'warn', 'error') NOT NULL, -- 日志级别
  message TEXT NOT NULL,                      -- 日志消息
  context JSON,                               -- 上下文信息
  entity_type VARCHAR(20),                    -- 实体类型
  entity_id VARCHAR(64),                      -- 实体ID
  operation VARCHAR(50),                      -- 操作类型
  tenant_id VARCHAR(64),                      -- 租户ID
  project_id VARCHAR(64),                     -- 项目ID
  created_at TIMESTAMP NOT NULL,              -- 创建时间
  
  INDEX idx_task (task_id),                   -- 任务索引
  INDEX idx_level (level),                    -- 级别索引
  INDEX idx_entity (entity_type, entity_id),  -- 实体索引
  INDEX idx_tenant (tenant_id),               -- 租户索引
  INDEX idx_project (project_id),             -- 项目索引
  INDEX idx_created (created_at)              -- 创建时间索引
);
```

### 3.4 API接口数据模型

#### 3.4.1 组织结构标准模型

```typescript
interface Organization {
  id: string;                // 组织ID
  name: string;              // 组织名称
  parentId?: string;         // 父组织ID
  code?: string;             // 组织编码
  order?: number;            // 排序号
  path?: string;             // 组织路径
  level?: number;            // 组织层级
  type?: string;             // 组织类型
  status?: number;           // 状态(1:正常,0:禁用)
  description?: string;      // 描述
  extAttrs?: Record<string, any>; // 扩展属性
}
```

#### 3.4.2 用户标准模型

```typescript
interface User {
  id: string;                // 用户ID
  username: string;          // 用户名
  name: string;              // 姓名
  email?: string;            // 邮箱
  mobile?: string;           // 手机号
  avatar?: string;           // 头像
  gender?: string;           // 性别
  status?: number;           // 状态(1:正常,0:禁用)
  employeeId?: string;       // 工号
  position?: string;         // 职位
  extAttrs?: Record<string, any>; // 扩展属性
}
```

#### 3.4.3 组织用户关系标准模型

```typescript
interface OrgUserRelation {
  id: string;                // 关系ID
  orgId: string;             // 组织ID
  userId: string;            // 用户ID
  isPrimary?: boolean;       // 是否主部门
  position?: string;         // 在组织中的职位
  extAttrs?: Record<string, any>; // 扩展属性
}
```

## 4. 同步流程设计

### 4.1 全量同步流程

全量同步是对整个通讯录数据进行完整同步，适用于初始同步或需要全面校准的场景。流程如下：

#### 4.1.1 全量同步主流程

```
┌─────────────┐     ┌─────────────┐     ┌───────────────┐     ┌────────────────┐     ┌────────────────┐
│ 任务初始化  │────▶│ 源端数据获取 │────▶│ 数据标准化处理 │────▶│ 与目标端对比   │────▶│ 执行同步操作   │
└─────────────┘     └─────────────┘     └───────────────┘     └────────────────┘     └────────────────┘
      │                                                                                      │
      └──────────────────────────────┬───────────────────────────────────────────────────────┘
                                     ▼
                              ┌────────────────┐
                              │ 结果统计与报告 │
                              └────────────────┘
```

#### 4.1.2 全量同步实现代码

```typescript
// 全量同步主函数
async function performFullSync(config: FullSyncConfig): Promise<SyncResult> {
  try {
    // 1. 创建同步任务记录
    const taskId = await createSyncTask({
      type: 'full',
      entityType: config.entityType || 'all',
      status: 'running',
      startTime: new Date(),
      config: config,
      triggerType: config.triggerType,
      triggeredBy: config.triggeredBy,
      source: config.source
    });
    
    // 2. 记录开始日志
    await logSync(taskId, 'info', '开始全量同步', { config });
    
    // 3. 获取源端数据
    const sourceData = await fetchSourceData(config);
    
    // 4. 标准化数据并保存到中间表
    await saveToIntermediateTables(sourceData, config);
    
    // 5. 与目标端数据进行比对
    const diffResult = await compareWithTarget(config);
    
    // 6. 执行同步操作
    const syncResult = await executeSync(diffResult, config);
    
    // 7. 更新同步状态
    await updateSyncTask(taskId, {
      status: 'completed',
      endTime: new Date(),
      result: syncResult
    });
    
    // 8. 记录完成日志
    await logSync(taskId, 'info', '全量同步完成', { result: syncResult });
    
    return syncResult;
  } catch (error) {
    // 记录错误并更新任务状态
    await logSync(taskId, 'error', '全量同步失败', { error: error.message });
    await updateSyncTask(taskId, {
      status: 'failed',
      endTime: new Date(),
      error: error.message
    });
    
    throw error;
  }
}
```

#### 4.1.3 源端数据获取

在实际项目中，不同系统的通讯录数据来源和结构各不相同，@stratix/accountsync 插件通过灵活的适配器模式实现跨系统数据获取。源端数据获取是整个同步流程的起点，我们设计了三种适配器以满足不同场景需求：

##### 4.1.3.1 适配器工厂与注册机制

```typescript
// 适配器注册表
const sourceAdapters = new Map<string, SourceAdapterFactory>();

// 适配器工厂类型定义
type SourceAdapterFactory = (config: any) => SourceAdapter;

// 注册适配器的函数
function registerSourceAdapter(type: string, factory: SourceAdapterFactory): void {
  sourceAdapters.set(type, factory);
}

// 获取适配器的工厂函数
function getSourceAdapter(type: string, config: any): SourceAdapter {
  // 先查找注册的自定义适配器
  if (sourceAdapters.has(type)) {
    const factory = sourceAdapters.get(type);
    return factory(config);
  }
  
  // 内置适配器处理
  switch (type) {
    case 'database':
      return new DatabaseSourceAdapter(config);
    case 'api':
      return new ApiSourceAdapter(config);
    case 'custom':
      return createCustomSourceAdapter(config.handler);
    default:
      throw new Error(`不支持的源类型: ${type}`);
  }
}

// 从源端获取数据的通用函数
async function fetchSourceData(config: FullSyncConfig): Promise<SourceData> {
  // 获取适配器实例
  const adapter = getSourceAdapter(config.source.type, config.source.config);
  
  // 初始化适配器(如果需要)
  if (adapter.initialize) {
    await adapter.initialize();
  }
  
  try {
    // 使用适配器获取数据
    return await adapter.fetchData({
      entityTypes: config.entityTypes || ['org', 'user', 'relation'],
      filter: config.source.filter,
      options: config.source.options
    });
  } finally {
    // 确保资源释放
    if (adapter.close) {
      await adapter.close();
    }
  }
}
```

##### 4.1.3.2 数据库适配器(DatabaseSourceAdapter)高级配置

DatabaseSourceAdapter支持多种关系型数据库，并允许通过配置灵活映射字段：

```typescript
// 数据库源配置类型
interface DatabaseSourceConfig {
  // 数据库客户端类型('mysql', 'postgresql', 'sqlite', 'mssql')
  client: string;
  
  // 连接配置
  connection: {
    host: string;
    port?: number;
    user: string;
    password: string;
    database: string;
    // 其他数据库特定配置...
  };
  
  // 连接池配置
  pool?: {
    min?: number;
    max?: number;
  };
  
  // 表配置
  tables: {
    // 组织表配置
    org: {
      // 表名
      table: string;
      
      // 字段映射: { 标准字段: 数据库字段 }
      mappings: {
        id: string;
        name: string;
        parentId?: string;
        code?: string;
        order?: string;
        status?: string;
        path?: string;
        level?: string;
        type?: string;
        description?: string;
        createdAt?: string;
        updatedAt?: string;
        deletedAt?: string;
        // 可以映射到extAttrs的其他字段
        [key: string]: string;
      };
      
      // 可选: 自定义查询构建函数
      queryBuilder?: (knex: any, table: string, filter: any, options: any) => any;
      
      // 可选: 原始SQL查询(支持参数化)
      rawQuery?: string;
      
      // 增量同步字段
      incrementalField?: string;
      
      // 创建时间字段(用于区分新增和更新)
      createdField?: string;
    };
    
    // 用户表配置(结构同org)
    user: { /* 类似组织表配置 */ };
    
    // 组织用户关系表配置(结构同org)
    relation: { /* 类似组织表配置 */ };
  };
  
  // 增量策略('timestamp', 'changelog', 'version')
  incrementalStrategy?: string;
  
  // 变更日志表(当增量策略为'changelog'时使用)
  changelogTable?: {
    table: string;
    entityTypeField: string;
    entityIdField: string;
    changeTypeField: string;
    timestampField: string;
    // 其他字段...
  };
}

// 使用示例
const dbSourceConfig: DatabaseSourceConfig = {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'db_user',
    password: 'db_password',
    database: 'hr_system'
  },
  pool: { min: 2, max: 10 },
  tables: {
    org: {
      table: 'departments',
      mappings: {
        id: 'dept_id',
        name: 'dept_name',
        parentId: 'parent_dept_id',
        code: 'dept_code',
        order: 'display_order',
        status: 'status',
        // 自定义字段映射到extAttrs
        'extAttrs.deptType': 'dept_type',
        'extAttrs.manager': 'manager_id'
      },
      // 自定义查询构建示例
      queryBuilder: (knex, table, filter, options) => {
        let query = knex(table).where('tenant_id', options.tenantId);
        if (filter && filter.status) {
          query = query.where('status', filter.status);
        }
        return query.orderBy('display_order');
      },
      incrementalField: 'update_time'
    },
    user: {
      table: 'employees',
      mappings: {
        id: 'emp_id',
        username: 'account',
        name: 'emp_name',
        email: 'email_address',
        mobile: 'phone_number',
        status: 'emp_status',
        // 更多映射...
      },
      incrementalField: 'last_modified'
    },
    relation: {
      table: 'dept_emp_relations',
      mappings: {
        id: 'relation_id',
        orgId: 'dept_id',
        userId: 'emp_id',
        isPrimary: 'is_primary',
        // 更多映射...
      },
      incrementalField: 'update_time'
    }
  },
  incrementalStrategy: 'timestamp'
};
```

##### 4.1.3.3 API适配器(ApiSourceAdapter)高级配置

ApiSourceAdapter支持从外部API接口获取数据，并提供丰富的配置选项：

```typescript
// API源配置类型
interface ApiSourceConfig {
  // API基础URL
  baseUrl: string;
  
  // 请求超时时间(毫秒)
  timeout?: number;
  
  // 固定请求头
  headers?: Record<string, string>;
  
  // 认证配置
  auth?: {
    // 认证类型: 'none', 'basic', 'bearer', 'apikey', 'oauth2'
    type: string;
    
    // 基本认证
    username?: string;
    password?: string;
    
    // Bearer令牌认证
    token?: string;
    
    // 令牌获取配置(用于动态获取令牌)
    tokenUrl?: string;
    tokenMethod?: 'GET' | 'POST';
    tokenParams?: Record<string, any>;
    
    // API Key认证
    apiKeyName?: string;
    apiKeyValue?: string;
    apiKeyIn?: 'header' | 'query';
    
    // OAuth2认证
    clientId?: string;
    clientSecret?: string;
    scope?: string;
    // 其他OAuth参数...
  };
  
  // 端点配置
  endpoints: {
    // 组织端点配置
    org: {
      // 列表接口
      list: string;
      
      // 详情接口(可选)
      detail?: string;
      
      // 变更接口(增量同步用)
      changes?: string;
      
      // 请求参数
      params?: Record<string, any>;
      
      // 响应数据路径(如: 'data.items')
      dataPath?: string;
      
      // 字段映射: { 标准字段: API字段 }
      mappings: {
        id: string;
        name: string;
        parentId?: string;
        // 其他字段映射...
        [key: string]: string;
      };
      
      // 自定义请求拦截器(可选)
      requestInterceptor?: (config: any) => any;
      
      // 自定义响应拦截器(可选)
      responseInterceptor?: (response: any) => any;
    };
    
    // 用户端点配置
    user: { /* 类似组织配置 */ };
    
    // 组织用户关系端点配置
    relation: { /* 类似组织配置 */ };
  };
  
  // 请求并发限制
  concurrency?: number;
  
  // 重试配置
  retry?: {
    // 最大重试次数
    maxRetries: number;
    
    // 重试延迟(毫秒)
    retryDelay: number;
    
    // 启用指数退避
    exponentialBackoff?: boolean;
  };
  
  // 分页配置
  pagination?: {
    // 分页类型: 'page', 'offset', 'cursor'
    type: string;
    
    // 页码参数名
    pageParam?: string;
    
    // 每页大小参数名
    sizeParam?: string;
    
    // 默认页大小
    defaultSize?: number;
    
    // 游标参数名(当type为'cursor'时)
    cursorParam?: string;
    
    // 下一页游标的响应路径
    nextCursorPath?: string;
  };
}

// 使用示例
const apiSourceConfig: ApiSourceConfig = {
  baseUrl: 'https://api.example.com/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Version': '1.0'
  },
  auth: {
    type: 'bearer',
    tokenUrl: 'https://api.example.com/v1/auth/token',
    tokenMethod: 'POST',
    tokenParams: {
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret',
      grantType: 'client_credentials'
    }
  },
  endpoints: {
    org: {
      list: '/departments',
      changes: '/departments/changes',
      params: {
        status: 'active'
      },
      dataPath: 'data.departments',
      mappings: {
        id: 'department_id',
        name: 'department_name',
        parentId: 'parent_id',
        code: 'code',
        order: 'order',
        'extAttrs.manager': 'manager_id',
        'extAttrs.location': 'location'
      },
      // 自定义请求拦截器示例
      requestInterceptor: (config) => {
        config.headers['X-Tenant-ID'] = 'tenant-123';
        return config;
      }
    },
    user: {
      list: '/employees',
      changes: '/employees/changes',
      dataPath: 'data.employees',
      mappings: {
        id: 'employee_id',
        username: 'login_name',
        name: 'full_name',
        email: 'email',
        mobile: 'phone',
        // 更多映射...
      }
    },
    relation: {
      list: '/employee-departments',
      dataPath: 'data',
      mappings: {
        id: 'id',
        orgId: 'department_id',
        userId: 'employee_id',
        isPrimary: 'is_primary',
        // 更多映射...
      }
    }
  },
  concurrency: 3,
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true
  },
  pagination: {
    type: 'page',
    pageParam: 'page',
    sizeParam: 'size',
    defaultSize: 100
  }
};
```

##### 4.1.3.4 自定义适配器(CustomSourceAdapter)实现方案

CustomSourceAdapter提供最大的灵活性，允许开发者实现特定的业务逻辑：

```typescript
// 自定义源处理器接口
interface CustomSourceHandler {
  // 获取数据方法(必须)
  fetchData: (params: {
    entityTypes: string[];
    filter?: any;
    options?: any;
  }) => Promise<SourceData>;
  
  // 获取变更方法(可选)
  fetchChanges?: (params: {
    entityTypes: string[];
    since: Date | string;
    version?: string;
    filter?: any;
    options?: any;
  }) => Promise<ChangeResult>;
  
  // 初始化方法(可选)
  initialize?: () => Promise<void>;
  
  // 关闭资源方法(可选)
  close?: () => Promise<void>;
}

// 创建自定义适配器的函数
function createCustomSourceAdapter(handler: CustomSourceHandler): SourceAdapter {
  return {
    fetchData: handler.fetchData,
    fetchChanges: handler.fetchChanges || async () => {
      // 默认空实现
      return {
        orgs: { created: [], updated: [], deleted: [] },
        users: { created: [], updated: [], deleted: [] },
        relations: { created: [], updated: [], deleted: [] }
      };
    },
    initialize: handler.initialize,
    close: handler.close
  };
}

// 创建和注册自定义适配器的示例
function createAndRegisterLdapAdapter(app: StratixApp) {
  // 创建自定义LDAP适配器
  const ldapAdapter: CustomSourceHandler = {
    initialize: async function() {
      // 初始化LDAP连接
      this.client = ldap.createClient({
        url: this.config.url,
        reconnect: true
      });
      
      // 绑定
      await promisify(this.client.bind).call(
        this.client, 
        this.config.bindDn, 
        this.config.bindPassword
      );
    },
    
    fetchData: async function(params) {
      const result: SourceData = { orgs: [], users: [], relations: [] };
      
      // 获取组织数据
      if (params.entityTypes.includes('org')) {
        const orgs = await this.searchLdap(
          this.config.baseDn,
          this.config.orgFilter,
          this.config.orgAttributes
        );
        
        result.orgs = orgs.map(entry => this.mapOrgEntry(entry));
      }
      
      // 获取用户数据
      if (params.entityTypes.includes('user')) {
        const users = await this.searchLdap(
          this.config.baseDn,
          this.config.userFilter,
          this.config.userAttributes
        );
        
        result.users = users.map(entry => this.mapUserEntry(entry));
      }
      
      // 生成关系数据(在LDAP中通常通过memberOf属性或其他属性关联)
      if (params.entityTypes.includes('relation')) {
        // 实现关系提取逻辑...
      }
      
      return result;
    },
    
    close: async function() {
      if (this.client) {
        await promisify(this.client.unbind).call(this.client);
      }
    },
    
    // LDAP搜索辅助方法
    searchLdap: async function(baseDn, filter, attributes) {
      // 实现LDAP搜索...
    },
    
    // 映射方法
    mapOrgEntry: function(entry) {
      // 将LDAP条目映射为组织对象...
    },
    
    mapUserEntry: function(entry) {
      // 将LDAP条目映射为用户对象...
    }
  };
  
  // 注册适配器
  app.accountsync.registerSourceAdapter('ldap', (config) => {
    const adapter = createCustomSourceAdapter({
      ...ldapAdapter,
      config // 配置将被传递给适配器
    });
    return adapter;
  });
}
```

##### 4.1.3.5 适配器集成与配置示例

以下是在插件配置中使用不同适配器的完整示例：

```typescript
// 插件配置示例
const accountsyncOptions = {
  source: {
    // 默认数据源类型
    type: 'database',
    
    // 各类适配器配置
    database: {
      // 参考DatabaseSourceConfig
      client: 'postgresql',
      connection: { /* 数据库连接信息 */ },
      tables: { /* 表映射配置 */ }
    },
    
    api: {
      // 参考ApiSourceConfig
      baseUrl: 'https://api.example.com',
      auth: { /* 认证配置 */ },
      endpoints: { /* 端点配置 */ }
    },
    
    // 自定义适配器配置(对应注册的适配器类型)
    ldap: {
      url: 'ldap://ldap.example.com',
      bindDn: 'cn=admin,dc=example,dc=com',
      bindPassword: 'admin-password',
      baseDn: 'dc=example,dc=com',
      orgFilter: '(&(objectClass=organizationalUnit))',
      userFilter: '(&(objectClass=inetOrgPerson))',
      // 更多LDAP特定配置...
    }
  },
  
  // 其他配置...
};
```

通过这种设计，@stratix/accountsync 插件能够适应各种不同的数据源场景，开发者可以:

1. 使用内置的数据库适配器连接各种关系型数据库
2. 使用API适配器连接REST或其他HTTP API
3. 实现和注册自定义适配器以支持特殊数据源(如LDAP、ActiveDirectory、SAP等)
4. 通过纯配置方式定制字段映射和数据转换
5. 以声明式方式定义同步逻辑，无需修改核心代码

每个项目可以根据实际需求选择合适的适配器类型，并通过配置文件进行适配，实现通讯录同步功能的真正可移植性和可定制性。

### 4.2 增量同步流程

增量同步只处理自上次同步以来发生变更的数据，提高同步效率。流程如下：

#### 4.2.1 增量同步主流程

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
│ 获取上次状态 │────▶│ 获取源端变更数据 │────▶│ 保存到增量表    │────▶│ 标记变更类型   │
└─────────────┘     └─────────────────┘     └─────────────────┘     └────────────────┘
                                                                            │
                                                                            ▼
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
│ 结果统计    │◀────│ 执行增量操作    │◀────│ 按顺序排序变更  │◀────│ 生成操作清单   │
└─────────────┘     └─────────────────┘     └─────────────────┘     └────────────────┘
```

#### 4.2.2 增量同步实现代码

```typescript
// 增量同步主函数
async function performIncrementalSync(config: IncrementalSyncConfig): Promise<SyncResult> {
  try {
    // 1. 创建同步任务记录
    const taskId = await createSyncTask({
      type: 'incremental',
      entityType: config.entityType || 'all',
      status: 'running',
      startTime: new Date(),
      config: config,
      triggerType: config.triggerType,
      triggeredBy: config.triggeredBy,
      source: config.source
    });
    
    // 2. 记录开始日志
    await logSync(taskId, 'info', '开始增量同步', { config });
    
    // 3. 获取上次同步状态
    const lastSyncState = await getLastSyncState(config.entityType);
    
    // 4. 获取源端变更数据
    const changes = await fetchSourceChanges(config, lastSyncState);
    
    // 5. 保存变更到增量表
    await saveChangesToIncrementalTables(changes, config);
    
    // 6. 标记变更类型并生成操作清单
    const operations = await generateIncrementalOperations(config);
    
    // 7. 排序变更(确保组织层级顺序、关系依赖等)
    const sortedOperations = sortIncrementalOperations(operations);
    
    // 8. 执行增量操作
    const syncResult = await executeIncrementalOperations(sortedOperations, config);
    
    // 9. 更新同步状态
    await updateSyncTask(taskId, {
      status: 'completed',
      endTime: new Date(),
      result: syncResult
    });
    
    // 10. 更新增量同步状态
    await updateIncrementalSyncState(config.entityType, {
      lastSyncAt: new Date(),
      lastSyncVersion: changes.version,
      successCount: (lastSyncState.successCount || 0) + 1
    });
    
    // 11. 记录完成日志
    await logSync(taskId, 'info', '增量同步完成', { result: syncResult });
    
    return syncResult;
  } catch (error) {
    // 记录错误并更新任务状态
    await logSync(taskId, 'error', '增量同步失败', { error: error.message });
    await updateSyncTask(taskId, {
      status: 'failed',
      endTime: new Date(),
      error: error.message
    });
    
    // 更新增量错误计数
    await updateIncrementalSyncState(config.entityType, {
      errorCount: (lastSyncState.errorCount || 0) + 1,
      lastError: error.message,
      lastErrorAt: new Date()
    });
    
    throw error;
  }
}
```

#### 4.2.3 获取源端变更数据

```typescript
// 获取源端变更数据
async function fetchSourceChanges(
  config: IncrementalSyncConfig, 
  lastState: IncrementalSyncState
): Promise<ChangeResult> {
  // 根据源类型选择适配器
  const adapter = getSourceAdapter(config.source.type);
  
  // 使用适配器获取变更数据
  const changes = await adapter.fetchChanges({
    entityTypes: config.entityTypes || ['org', 'user', 'relation'],
    since: lastState.lastSyncAt,
    version: lastState.lastSyncVersion,
    filter: config.source.filter,
    options: config.source.options
  });
  
  return changes;
}
```

#### 4.2.4 执行增量操作

```typescript
// 执行增量操作
async function executeIncrementalOperations(
  operations: SyncOperation[], 
  config: IncrementalSyncConfig
): Promise<SyncResult> {
  // 获取目标适配器
  const targetAdapter = getTargetAdapter(config.target.type);
  
  const result: SyncResult = {
    orgs: { created: 0, updated: 0, deleted: 0, failed: 0 },
    users: { created: 0, updated: 0, deleted: 0, failed: 0 },
    relations: { created: 0, updated: 0, deleted: 0, failed: 0 }
  };
  
  // 按顺序执行操作
  for (const op of operations) {
    try {
      // 前置钩子
      await runHook('beforeOperation', { operation: op, config });
      
      let opResult;
      
      // 根据操作类型和实体类型执行对应操作
      switch (op.operationType) {
        case 'create':
          opResult = await targetAdapter.create(op.entityType, op.data);
          result[`${op.entityType}s`].created++;
          break;
        case 'update':
          opResult = await targetAdapter.update(op.entityType, op.entityId, op.data);
          result[`${op.entityType}s`].updated++;
          break;
        case 'delete':
          opResult = await targetAdapter.delete(op.entityType, op.entityId);
          result[`${op.entityType}s`].deleted++;
          break;
      }
      
      // 标记增量记录为已处理
      await markIncrementalProcessed(op.recordId, true);
      
      // 后置钩子
      await runHook('afterOperation', { operation: op, result: opResult, config });
      
    } catch (error) {
      // 记录错误
      await logSync(null, 'error', `增量操作失败: ${op.operationType} ${op.entityType} ${op.entityId}`, { error: error.message });
      
      // 更新失败计数
      result[`${op.entityType}s`].failed++;
      
      // 标记增量记录处理失败
      await markIncrementalProcessed(op.recordId, false, error.message);
      
      // 异常处理钩子
      await runHook('onOperationError', { operation: op, error, config });
      
      // 根据配置决定是否继续
      if (config.stopOnError) {
        throw error;
      }
    }
  }
  
  return result;
}
```

### 4.3 目标同步实现

#### 4.3.1 WPS API同步适配器

```typescript
// WPS API目标适配器
class WpsApiTargetAdapter implements TargetAdapter {
  private config: WpsApiConfig;
  private tokenManager: TokenManager;
  
  constructor(config: WpsApiConfig) {
    this.config = config;
    this.tokenManager = new TokenManager(config);
  }
  
  // 获取当前数据
  async fetchCurrentData(): Promise<TargetData> {
    // 获取访问令牌
    const token = await this.tokenManager.getAccessToken();
    
    // 获取组织列表
    const orgs = await this.fetchAllOrganizations(token);
    
    // 获取用户列表
    const users = await this.fetchAllUsers(token);
    
    // 获取组织用户关系
    const relations = await this.fetchAllRelations(token);
    
    return { orgs, users, relations };
  }
  
  // 创建实体
  async create(entityType: EntityType, data: any): Promise<any> {
    const token = await this.tokenManager.getAccessToken();
    
    switch (entityType) {
      case 'org':
        return this.createOrganization(token, data);
      case 'user':
        return this.createUser(token, data);
      case 'relation':
        return this.createRelation(token, data);
      default:
        throw new Error(`不支持的实体类型: ${entityType}`);
    }
  }
  
  // 更新实体
  async update(entityType: EntityType, id: string, data: any): Promise<any> {
    const token = await this.tokenManager.getAccessToken();
    
    switch (entityType) {
      case 'org':
        return this.updateOrganization(token, id, data);
      case 'user':
        return this.updateUser(token, id, data);
      case 'relation':
        return this.updateRelation(token, id, data);
      default:
        throw new Error(`不支持的实体类型: ${entityType}`);
    }
  }
  
  // 删除实体
  async delete(entityType: EntityType, id: string): Promise<any> {
    const token = await this.tokenManager.getAccessToken();
    
    switch (entityType) {
      case 'org':
        return this.deleteOrganization(token, id);
      case 'user':
        return this.deleteUser(token, id);
      case 'relation':
        return this.deleteRelation(token, id);
      default:
        throw new Error(`不支持的实体类型: ${entityType}`);
    }
  }
  
  // 实现WPS API调用方法...
}
```

#### 4.3.2 数据返回适配器

```typescript
// 数据返回适配器
class DataReturnTargetAdapter implements TargetAdapter {
  private config: DataReturnConfig;
  private resultData: {
    orgs: { created: any[], updated: any[], deleted: any[] },
    users: { created: any[], updated: any[], deleted: any[] },
    relations: { created: any[], updated: any[], deleted: any[] }
  };
  
  constructor(config: DataReturnConfig) {
    this.config = config;
    this.resultData = {
      orgs: { created: [], updated: [], deleted: [] },
      users: { created: [], updated: [], deleted: [] },
      relations: { created: [], updated: [], deleted: [] }
    };
  }
  
  // 获取当前数据 - 数据返回模式不需要获取目标端数据
  async fetchCurrentData(): Promise<TargetData> {
    return { orgs: [], users: [], relations: [] };
  }
  
  // 创建实体 - 只收集不实际操作
  async create(entityType: EntityType, data: any): Promise<any> {
    switch (entityType) {
      case 'org':
        this.resultData.orgs.created.push(data);
        break;
      case 'user':
        this.resultData.users.created.push(data);
        break;
      case 'relation':
        this.resultData.relations.created.push(data);
        break;
    }
    return { success: true, id: data.id };
  }
  
  // 更新实体 - 只收集不实际操作
  async update(entityType: EntityType, id: string, data: any): Promise<any> {
    switch (entityType) {
      case 'org':
        this.resultData.orgs.updated.push({ id, ...data });
        break;
      case 'user':
        this.resultData.users.updated.push({ id, ...data });
        break;
      case 'relation':
        this.resultData.relations.updated.push({ id, ...data });
        break;
    }
    return { success: true };
  }
  
  // 删除实体 - 只收集不实际操作
  async delete(entityType: EntityType, id: string): Promise<any> {
    switch (entityType) {
      case 'org':
        this.resultData.orgs.deleted.push({ id });
        break;
      case 'user':
        this.resultData.users.deleted.push({ id });
        break;
      case 'relation':
        this.resultData.relations.deleted.push({ id });
        break;
    }
    return { success: true };
  }
  
  // 获取收集的结果数据
  getResultData(): any {
    return this.resultData;
  }
} 
```

## 5. API设计

### 5.1 插件公共API

`@stratix/accountsync` 插件在应用实例上注册以下API：

```typescript
app.decorate('accountsync', {
  // 执行全量同步
  fullSync: async (config: FullSyncConfig) => Promise<SyncResult>,
  
  // 执行增量同步
  incrementalSync: async (config: IncrementalSyncConfig) => Promise<SyncResult>,
  
  // 获取同步状态
  getSyncStatus: async (taskId: string) => Promise<SyncTask>,
  
  // 获取同步历史
  getSyncHistory: async (query: SyncHistoryQuery) => Promise<PaginatedResult<SyncTask>>,
  
  // 获取同步日志
  getSyncLogs: async (query: SyncLogsQuery) => Promise<PaginatedResult<SyncLog>>,
  
  // 取消同步任务
  cancelSync: async (taskId: string) => Promise<boolean>,
  
  // 注册源适配器
  registerSourceAdapter: (type: string, adapter: SourceAdapter) => void,
  
  // 注册目标适配器
  registerTargetAdapter: (type: string, adapter: TargetAdapter) => void,
  
  // 获取配置
  getConfig: () => AccountsyncConfig,
  
  // 更新配置
  updateConfig: (config: Partial<AccountsyncConfig>) => Promise<AccountsyncConfig>
});
```

### 5.2 HTTP API接口

插件注册以下HTTP API路由：

```typescript
// 注册REST API
app.register(require('@stratix/web'), {
  routes: {
    '/api/accountsync': {
      // 获取同步配置
      '/config': {
        get: async (request, reply) => {
          return app.accountsync.getConfig();
        }
      },
      
      // 触发全量同步
      '/sync/full': {
        post: {
          schema: {
            body: {
              type: 'object',
              properties: {
                entityType: { type: 'string', enum: ['org', 'user', 'relation', 'all'] },
                source: { type: 'object' },
                target: { type: 'object' },
                options: { type: 'object' }
              }
            }
          },
          handler: async (request, reply) => {
            const result = await app.accountsync.fullSync({
              ...request.body,
              triggerType: 'api',
              triggeredBy: request.user?.id
            });
            return result;
          }
        }
      },
      
      // 触发增量同步
      '/sync/incremental': {
        post: {
          schema: {
            body: {
              type: 'object',
              properties: {
                entityType: { type: 'string', enum: ['org', 'user', 'relation', 'all'] },
                source: { type: 'object' },
                target: { type: 'object' },
                options: { type: 'object' }
              }
            }
          },
          handler: async (request, reply) => {
            const result = await app.accountsync.incrementalSync({
              ...request.body,
              triggerType: 'api',
              triggeredBy: request.user?.id
            });
            return result;
          }
        }
      },
      
      // 获取同步任务状态
      '/tasks/:id': {
        get: async (request, reply) => {
          return app.accountsync.getSyncStatus(request.params.id);
        }
      },
      
      // 获取同步历史
      '/tasks': {
        get: {
          schema: {
            querystring: {
              type: 'object',
              properties: {
                page: { type: 'integer', minimum: 1 },
                pageSize: { type: 'integer', minimum: 1, maximum: 100 },
                type: { type: 'string', enum: ['full', 'incremental'] },
                entityType: { type: 'string' },
                status: { type: 'string' },
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' }
              }
            }
          },
          handler: async (request, reply) => {
            return app.accountsync.getSyncHistory(request.query);
          }
        }
      },
      
      // 获取同步日志
      '/logs': {
        get: {
          schema: {
            querystring: {
              type: 'object',
              properties: {
                taskId: { type: 'string' },
                level: { type: 'string' },
                entityType: { type: 'string' },
                entityId: { type: 'string' },
                page: { type: 'integer', minimum: 1 },
                pageSize: { type: 'integer', minimum: 1, maximum: 100 }
              }
            }
          },
          handler: async (request, reply) => {
            return app.accountsync.getSyncLogs(request.query);
          }
        }
      },
      
      // 取消同步任务
      '/tasks/:id/cancel': {
        post: async (request, reply) => {
          return app.accountsync.cancelSync(request.params.id);
        }
      },
      
      // 外部增量变更通知接口
      '/notify/changes': {
        post: {
          schema: {
            body: {
              type: 'object',
              properties: {
                entityType: { type: 'string' },
                changes: { type: 'array' }
              },
              required: ['entityType', 'changes']
            }
          },
          handler: async (request, reply) => {
            // 处理外部变更通知
            const result = await processChangeNotification(request.body);
            return result;
          }
        }
      }
    }
  }
});
```

### 5.3 Webhook接口

插件支持对外回调通知：

```typescript
// 同步结果回调
async function notifySyncResult(result: SyncResult, config: WebhookConfig): Promise<void> {
  if (!config.webhook || !config.webhook.enabled) {
    return;
  }
  
  try {
    const { url, headers = {}, timeout = 10000 } = config.webhook;
    
    // 构建通知数据
    const data = {
      type: 'sync_result',
      result,
      taskId: config.taskId,
      timestamp: new Date().toISOString()
    };
    
    // 发送HTTP请求
    await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout
    });
  } catch (error) {
    // 记录错误但不影响主流程
    await logSync(config.taskId, 'error', '同步结果通知失败', { error: error.message });
  }
}
```

## 6. 源端适配器设计

源端适配器负责从不同类型的外部系统获取通讯录数据。

### 6.1 源适配器接口

```typescript
// 源适配器接口
interface SourceAdapter {
  // 全量获取数据
  fetchData(params: {
    entityTypes: string[];
    filter?: any;
    options?: any;
  }): Promise<SourceData>;
  
  // 获取增量变更
  fetchChanges(params: {
    entityTypes: string[];
    since: Date | string;
    version?: string;
    filter?: any;
    options?: any;
  }): Promise<ChangeResult>;
  
  // 初始化适配器（可选）
  initialize?(): Promise<void>;
  
  // 关闭适配器资源（可选）
  close?(): Promise<void>;
}

// 数据源类型
interface SourceData {
  orgs: Organization[];
  users: User[];
  relations: OrgUserRelation[];
  metadata?: any;
}

// 变更结果类型
interface ChangeResult {
  orgs: {
    created: Organization[];
    updated: Organization[];
    deleted: { id: string }[];
  };
  users: {
    created: User[];
    updated: User[];
    deleted: { id: string }[];
  };
  relations: {
    created: OrgUserRelation[];
    updated: OrgUserRelation[];
    deleted: { id: string }[];
  };
  version?: string;
  metadata?: any;
}
```

### 6.2 数据库源适配器

```typescript
// 数据库源适配器
class DatabaseSourceAdapter implements SourceAdapter {
  private config: DatabaseSourceConfig;
  private db: any; // Knex实例
  
  constructor(config: DatabaseSourceConfig) {
    this.config = config;
  }
  
  // 初始化数据库连接
  async initialize(): Promise<void> {
    this.db = require('knex')({
      client: this.config.client,
      connection: this.config.connection,
      pool: this.config.pool
    });
  }
  
  // 全量获取数据
  async fetchData(params: any): Promise<SourceData> {
    const { entityTypes, filter, options } = params;
    const result: SourceData = { orgs: [], users: [], relations: [] };
    
    // 获取组织数据
    if (entityTypes.includes('org')) {
      const { table, mappings, query } = this.config.tables.org;
      
      let queryBuilder = this.db(table);
      
      // 应用自定义查询
      if (query) {
        if (typeof query === 'function') {
          queryBuilder = query(queryBuilder, filter, options);
        } else if (typeof query === 'string') {
          queryBuilder = this.db.raw(query, filter || {});
        }
      }
      
      // 应用过滤条件
      if (filter && filter.org) {
        Object.entries(filter.org).forEach(([key, value]) => {
          queryBuilder = queryBuilder.where(key, value);
        });
      }
      
      // 执行查询
      const rows = await queryBuilder;
      
      // 映射字段
      result.orgs = rows.map(row => mapFields(row, mappings));
    }
    
    // 获取用户数据
    if (entityTypes.includes('user')) {
      const { table, mappings, query } = this.config.tables.user;
      
      // 类似组织的查询逻辑...
      // 省略实现
    }
    
    // 获取关系数据
    if (entityTypes.includes('relation')) {
      const { table, mappings, query } = this.config.tables.relation;
      
      // 类似组织的查询逻辑...
      // 省略实现
    }
    
    return result;
  }
  
  // 获取增量变更
  async fetchChanges(params: any): Promise<ChangeResult> {
    const { entityTypes, since, version, filter, options } = params;
    const result: ChangeResult = {
      orgs: { created: [], updated: [], deleted: [] },
      users: { created: [], updated: [], deleted: [] },
      relations: { created: [], updated: [], deleted: [] }
    };
    
    // 确定增量字段策略
    const strategy = this.config.incrementalStrategy || 'timestamp';
    
    // 基于时间戳的增量查询
    if (strategy === 'timestamp') {
      // 查询组织变更
      if (entityTypes.includes('org')) {
        const { table, mappings, incrementalField = 'updated_at' } = this.config.tables.org;
        
        // 查询新增和更新的记录
        const changedRows = await this.db(table)
          .where(incrementalField, '>=', since)
          .whereNull('deleted_at');
          
        // 查询删除的记录
        const deletedRows = await this.db(table)
          .where('deleted_at', '>=', since)
          .whereNotNull('deleted_at');
        
        // 分类处理
        for (const row of changedRows) {
          const mappedRow = mapFields(row, mappings);
          const createdField = this.config.tables.org.createdField || 'created_at';
          
          if (new Date(row[createdField]) >= new Date(since)) {
            result.orgs.created.push(mappedRow);
          } else {
            result.orgs.updated.push(mappedRow);
          }
        }
        
        // 处理删除记录
        result.orgs.deleted = deletedRows.map(row => ({ id: row.id }));
      }
      
      // 查询用户和关系变更 - 类似组织的逻辑...
      // 省略实现
    }
    // 基于变更日志表的增量查询
    else if (strategy === 'changelog') {
      // 变更日志表查询逻辑...
      // 省略实现
    }
    
    return result;
  }
  
  // 关闭数据库连接
  async close(): Promise<void> {
    if (this.db) {
      await this.db.destroy();
    }
  }
}
```

### 6.3 API源适配器

```typescript
// API源适配器
class ApiSourceAdapter implements SourceAdapter {
  private config: ApiSourceConfig;
  private httpClient: any;
  
  constructor(config: ApiSourceConfig) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: config.headers || {}
    });
  }
  
  // 初始化（如认证）
  async initialize(): Promise<void> {
    if (this.config.auth) {
      const { type, ...authConfig } = this.config.auth;
      
      if (type === 'basic') {
        this.httpClient.defaults.auth = {
          username: authConfig.username,
          password: authConfig.password
        };
      } else if (type === 'bearer') {
        // 获取令牌
        const token = await this.getToken(authConfig);
        this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }
  }
  
  // 全量获取数据
  async fetchData(params: any): Promise<SourceData> {
    const { entityTypes, filter, options } = params;
    const result: SourceData = { orgs: [], users: [], relations: [] };
    
    // 获取组织数据
    if (entityTypes.includes('org')) {
      const endpoint = this.getEndpoint('org', 'list');
      
      // 构建请求参数
      const requestParams = {
        ...this.config.endpoints.org.params,
        ...filter
      };
      
      // 发送请求
      const response = await this.httpClient.get(endpoint, { params: requestParams });
      
      // 提取数据并映射字段
      const data = this.extractData(response.data, this.config.endpoints.org.dataPath);
      result.orgs = data.map(item => mapFields(item, this.config.endpoints.org.mappings));
    }
    
    // 获取用户和关系数据 - 类似组织的逻辑...
    // 省略实现
    
    return result;
  }
  
  // 获取增量变更
  async fetchChanges(params: any): Promise<ChangeResult> {
    const { entityTypes, since, version, filter, options } = params;
    
    // 根据API增量接口实现变更获取
    // 省略实现
    
    return {
      orgs: { created: [], updated: [], deleted: [] },
      users: { created: [], updated: [], deleted: [] },
      relations: { created: [], updated: [], deleted: [] }
    };
  }
  
  // 获取接口地址
  private getEndpoint(entityType: string, operation: string): string {
    return this.config.endpoints[entityType][operation];
  }
  
  // 提取数据
  private extractData(responseData: any, path: string | null): any[] {
    if (!path) {
      return Array.isArray(responseData) ? responseData : [responseData];
    }
    
    const parts = path.split('.');
    let result = responseData;
    
    for (const part of parts) {
      result = result[part];
      if (result === undefined) {
        return [];
      }
    }
    
    return Array.isArray(result) ? result : [result];
  }
  
  // 获取认证令牌
  private async getToken(authConfig: any): Promise<string> {
    // 根据配置实现不同的令牌获取逻辑
    // 省略实现
    return 'token';
  }
}
```

### 6.4 自定义源适配器

```typescript
// 自定义源适配器工厂
function createCustomSourceAdapter(handler: CustomSourceHandler): SourceAdapter {
  return {
    // 全量获取数据
    fetchData: async (params) => {
      return handler.fetchData(params);
    },
    
    // 获取增量变更
    fetchChanges: async (params) => {
      if (handler.fetchChanges) {
        return handler.fetchChanges(params);
      }
      
      // 如果未实现增量方法，则返回空结果
      return {
        orgs: { created: [], updated: [], deleted: [] },
        users: { created: [], updated: [], deleted: [] },
        relations: { created: [], updated: [], deleted: [] }
      };
    },
    
    // 初始化
    initialize: async () => {
      if (handler.initialize) {
        await handler.initialize();
      }
    },
    
    // 关闭
    close: async () => {
      if (handler.close) {
        await handler.close();
      }
    }
  };
}

// 使用示例
const customAdapter = createCustomSourceAdapter({
  fetchData: async (params) => {
    // 自定义实现数据获取逻辑
    return {
      orgs: [],
      users: [],
      relations: []
    };
  },
  
  fetchChanges: async (params) => {
    // 自定义实现变更获取逻辑
    return {
      orgs: { created: [], updated: [], deleted: [] },
      users: { created: [], updated: [], deleted: [] },
      relations: { created: [], updated: [], deleted: [] }
    };
  }
});
```

## 7. 配置说明

### 7.1 插件配置结构

```typescript
// 插件主配置
interface AccountsyncPluginOptions {
  // 数据源配置
  source: {
    // 默认数据源类型：database, api, custom
    type: string;
    
    // 数据库源配置
    database?: DatabaseSourceConfig;
    
    // API源配置
    api?: ApiSourceConfig;
    
    // 自定义源配置
    custom?: any;
  };
  
  // 目标配置
  target: {
    // 目标类型：wps_api, data_return
    type: string;
    
    // 同步模式
    mode: 'wps_api' | 'data_return';
    
    // WPS API配置
    wps?: WpsApiConfig;
  };
  
  // 同步配置
  sync: {
    // 默认同步类型
    defaultType: 'full' | 'incremental';
    
    // 全量同步配置
    full: {
      // 同步间隔（毫秒）
      interval?: number;
      
      // 批处理大小
      batchSize?: number;
      
      // 冲突处理策略
      conflictStrategy?: 'source_wins' | 'target_wins' | 'newer_wins' | 'manual';
    };
    
    // 增量同步配置
    incremental: {
      // 是否启用
      enabled: boolean;
      
      // 检查间隔（毫秒）
      interval?: number;
      
      // 增量方式
      strategy?: 'timestamp' | 'version' | 'changelog';
      
      // 最大增量次数，超过后执行全量
      maxCount?: number;
      
      // 最大增量间隔（小时），超过后执行全量
      maxInterval?: number;
    };
    
    // 定时任务配置
    schedule: {
      // 是否启用
      enabled: boolean;
      
      // 全量同步cron表达式
      fullCron?: string;
      
      // 增量同步cron表达式
      incrementalCron?: string;
    };
    
    // 通知配置
    notification: {
      // 是否启用
      enabled: boolean;
      
      // Webhook配置
      webhook?: {
        url: string;
        headers?: Record<string, string>;
        events?: string[];
      };
      
      // 邮件通知配置
      email?: {
        enabled: boolean;
        recipients: string[];
        events?: string[];
      };
    };
  };
  
  // 中间表配置
  database: {
    // 表前缀
    tablePrefix?: string;
    
    // 是否创建索引
    createIndexes?: boolean;
    
    // 是否使用软删除
    softDelete?: boolean;
  };
  
  // 字段映射配置
  fieldMappings: {
    // 组织字段映射
    org?: Record<string, string>;
    
    // 用户字段映射
    user?: Record<string, string>;
    
    // 关系字段映射
    relation?: Record<string, string>;
  };
  
  // Web API配置
  api?: {
    // 是否启用API
    enabled: boolean;
    
    // 路由前缀
    prefix?: string;
    
    // 是否需要认证
    requireAuth?: boolean;
  };
}
```

### 7.2 配置示例

```javascript
// 完整配置示例
module.exports = {
  // 插件配置
  plugins: {
    // 数据库插件配置
    database: {
      client: 'mysql2',
      connection: {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'password',
        database: 'stratix_app'
      }
    },
    
    // 缓存插件配置
    cache: {
      driver: 'redis',
      config: {
        host: 'localhost',
        port: 6379
      }
    },
    
    // 队列插件配置
    queue: {
      driver: 'redis',
      prefix: 'stratix:queue'
    },
    
    // 计划任务插件配置
    schedule: {
      timezone: 'Asia/Shanghai'
    },
    
    // Web插件配置
    web: {
      port: 3000,
      cors: true
    },
    
    // 通讯录同步插件配置
    accountsync: {
      // 数据源配置
      source: {
        type: 'database',
        database: {
          // 使用主数据库连接
          client: 'mysql2',
          connection: {
            host: 'external-db',
            port: 3306,
            user: 'sync_user',
            password: 'sync_password',
            database: 'external_directory'
          },
          tables: {
            org: {
              table: 'departments',
              mappings: {
                id: 'dept_id',
                name: 'dept_name',
                parentId: 'parent_id',
                code: 'dept_code',
                order: 'sort_order'
              },
              incrementalField: 'update_time'
            },
            user: {
              table: 'employees',
              mappings: {
                id: 'emp_id',
                name: 'emp_name',
                username: 'account',
                email: 'email',
                mobile: 'phone'
              },
              incrementalField: 'update_time'
            },
            relation: {
              table: 'dept_emp_relation',
              mappings: {
                id: 'relation_id',
                orgId: 'dept_id',
                userId: 'emp_id',
                isPrimary: 'is_primary'
              },
              incrementalField: 'update_time'
            }
          }
        }
      },
      
      // 目标配置
      target: {
        type: 'wps_api',
        mode: 'wps_api',
        wps: {
          clientId: 'your-client-id',
          clientSecret: 'your-client-secret',
          baseUrl: 'https://open.wps.cn/api/v3',
          cacheToken: true,
          tokenCacheTTL: 7200 // 2小时
        }
      },
      
      // 同步配置
      sync: {
        defaultType: 'incremental',
        full: {
          interval: 86400000, // 24小时
          batchSize: 100,
          conflictStrategy: 'source_wins'
        },
        incremental: {
          enabled: true,
          interval: 300000, // 5分钟
          strategy: 'timestamp',
          maxCount: 10,
          maxInterval: 24 // 24小时
        },
        schedule: {
          enabled: true,
          fullCron: '0 0 * * 0', // 每周日0点
          incrementalCron: '*/10 * * * *' // 每10分钟
        },
        notification: {
          enabled: true,
          webhook: {
            url: 'https://example.com/webhook/sync',
            events: ['sync.completed', 'sync.failed']
          }
        }
      },
      
      // API配置
      api: {
        enabled: true,
        prefix: '/api/accountsync',
        requireAuth: true
      }
    }
  }
}; 
```

## 8. 安全与性能考虑

### 8.1 安全考虑

#### 8.1.1 数据安全

- **数据加密**：敏感配置信息（如API密钥、数据库凭证）支持加密存储
- **传输安全**：所有外部API通信强制使用HTTPS
- **令牌管理**：WPS API令牌安全存储在缓存中，过期自动刷新
- **访问控制**：插件API接口支持基于角色的访问控制
- **数据隔离**：支持多租户数据隔离，确保租户间数据安全

#### 8.1.2 操作安全

- **幂等性设计**：同步操作支持幂等设计，避免重复执行引起的问题
- **操作日志**：记录所有同步操作，支持审计和回溯
- **失败处理**：完善的错误处理和回滚机制
- **安全校验**：所有外部输入数据进行验证和安全过滤

### 8.2 性能优化

#### 8.2.1 数据处理优化

- **批量处理**：批量插入和更新数据，减少数据库交互次数
- **增量同步**：精确识别变更数据，避免全量处理开销
- **数据分页**：大数据量分页处理，避免内存溢出
- **并行处理**：支持独立实体并行同步，提高处理效率

#### 8.2.2 资源控制

- **连接池管理**：数据库连接池合理配置，避免资源耗尽
- **请求限流**：对外部API调用实施速率限制，避免触发限流
- **超时控制**：所有外部请求设置合理超时，防止阻塞
- **资源释放**：确保所有资源在使用后正确释放

#### 8.2.3 缓存策略

- **令牌缓存**：WPS API令牌缓存，减少令牌获取频率
- **结果缓存**：短期缓存查询结果，减少重复查询
- **元数据缓存**：缓存配置和映射信息，提高处理速度

## 9. 部署与管理

### 9.1 部署说明

#### 9.1.1 安装插件

```bash
# 安装插件及其依赖
npm install @stratix/accountsync @stratix/database @stratix/cache @stratix/queue @stratix/web @stratix/schedule
```

#### 9.1.2 应用配置

```javascript
// 在应用配置中添加accountsync插件
const app = createApp({
  plugins: {
    // 添加依赖插件
    database: { /* 配置 */ },
    cache: { /* 配置 */ },
    queue: { /* 配置 */ },
    web: { /* 配置 */ },
    schedule: { /* 配置 */ },
    
    // 添加accountsync插件
    accountsync: {
      // 插件配置...
    }
  }
});
```

#### 9.1.3 数据库初始化

```bash
# 运行数据库迁移
npx stratix migrate:up --plugin=accountsync
```

### 9.2 管理与监控

#### 9.2.1 管理界面

插件提供Web管理界面，可通过以下路径访问：

- 同步任务管理：`/admin/accountsync/tasks`
- 同步配置管理：`/admin/accountsync/config`
- 同步日志查看：`/admin/accountsync/logs`
- 源适配器管理：`/admin/accountsync/adapters/source`
- 目标适配器管理：`/admin/accountsync/adapters/target`

#### 9.2.2 监控指标

插件提供以下监控指标：

- **同步成功率**：同步任务成功率统计
- **同步耗时**：同步任务执行时间统计
- **数据量指标**：各类型数据处理量统计
- **错误率监控**：同步错误类型和频率统计
- **资源使用率**：同步过程CPU/内存使用监控

#### 9.2.3 告警机制

支持配置以下告警：

- **同步失败告警**：同步任务失败时触发告警
- **同步超时告警**：同步任务执行时间过长触发告警
- **错误阈值告警**：错误数超过阈值触发告警
- **资源告警**：资源使用率超阈值触发告警

## 10. 总结

`@stratix/accountsync` 插件提供了一个完整的通讯录同步解决方案，具有以下特点：

1. **架构灵活**：基于 Stratix 框架的插件化、纯配置设计理念，实现高度可配置和可扩展的同步架构
2. **多源支持**：支持数据库、API和自定义三种外部数据源类型，适应各种集成场景
3. **双模同步**：支持全量和增量两种同步模式，兼顾数据一致性和性能效率
4. **中间层设计**：通过中间数据库层实现数据标准化和差异比对，提升同步可靠性
5. **目标灵活性**：支持WPS开放平台API直接同步和数据返回两种模式，满足不同应用场景
6. **安全可靠**：完善的安全措施、错误处理和日志机制，确保同步过程可靠和可追溯
7. **高性能**：批量处理、增量识别、并行处理等多种性能优化手段，保障同步效率

通过本插件，实现了外部通讯录系统与WPS通讯录的无缝集成，大幅降低了异构系统通讯录同步的开发和维护成本。