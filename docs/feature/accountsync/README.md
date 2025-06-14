# @stratix/accountsync 通讯录同步插件

`@stratix/accountsync` 是基于 Stratix 框架开发的通讯录同步插件，提供从外部系统到 WPS 通讯录的数据同步功能。

## 核心功能

- **多源支持**：支持从数据库、API、自定义数据源读取通讯录数据
- **双模同步**：支持全量同步和增量同步两种模式
- **字段映射**：灵活的字段映射和数据转换能力
- **中间数据层**：通过中间数据库实现数据标准化和差异比对
- **多目标适配**：支持同步到WPS开放平台API或返回标准格式的数据
- **任务管理**：完整的同步任务创建、执行、监控和调度功能
- **可扩展性**：插件化设计，支持自定义数据源和目标适配器

## 系统架构

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐    ┌───────────────┐
│  外部数据源     │───>│  源数据适配器     │───>│  中间数据库    │───>│  目标适配器   │───>┌─────────────┐
│ (数据库/API接口) │    │ (可配置/可扩展)   │    │ (全量/增量表)  │    │ (可配置/可扩展)│    │ WPS通讯录   │
└─────────────────┘    └──────────────────┘    └────────────────┘    └───────────────┘    └─────────────┘
```

## 快速使用指南

### 安装

```bash
npm install @stratix/accountsync
```

### 基本配置

```typescript
import { createApp } from 'stratix';
import { accountsyncPlugin } from '@stratix/accountsync';

const app = createApp({
  plugins: {
    database: { /* 数据库配置 */ },
    cache: { /* 缓存配置 */ },
    queue: { /* 队列配置 */ },
    web: { /* Web服务配置 */ },
    schedule: { /* 定时调度配置 */ }
  }
});

app.register(accountsyncPlugin, {
  // 插件配置
  database: {
    tablePrefix: 'sync_'
  },
  api: {
    prefix: '/api/accountsync'
  }
});

await app.start();
```

### 数据库数据源配置示例

```typescript
const dbSourceConfig = {
  type: 'database',
  connection: {
    client: 'mysql',
    connection: {
      host: 'localhost',
      port: 3306,
      user: 'user',
      password: 'password',
      database: 'external_db'
    }
  },
  organizations: {
    table: 'departments',
    mapping: {
      id: 'dept_id',
      orgCode: 'dept_code',
      orgName: 'dept_name',
      parentId: 'parent_id'
    }
  },
  users: {
    table: 'employees',
    mapping: {
      id: 'emp_id',
      username: 'account',
      realName: 'name',
      email: 'email',
      mobile: 'phone'
    }
  },
  relations: {
    table: 'dept_emp_relation',
    mapping: {
      id: 'relation_id',
      orgId: 'dept_id',
      userId: 'emp_id',
      isPrimary: 'is_primary'
    }
  }
};
```

### WPS API目标配置示例

```typescript
const wpsTargetConfig = {
  type: 'wps-api',
  baseUrl: 'https://open.wps.cn',
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  tenantId: 'your-tenant-id'
};
```

### 创建同步任务

```typescript
// 全量同步
const fullSyncTaskId = await app.accountsync.syncFull({
  name: '每日全量同步',
  source: dbSourceConfig,
  target: wpsTargetConfig
});

// 增量同步
const incrementalSyncTaskId = await app.accountsync.syncIncremental({
  name: '每小时增量同步',
  source: dbSourceConfig,
  target: wpsTargetConfig,
  schedule: {
    cron: '0 * * * *'  // 每小时执行一次
  }
});
```

### 监控同步状态

```typescript
// 获取同步任务状态
const taskStatus = await app.accountsync.getSyncStatus(fullSyncTaskId);

// 输出示例
{
  id: 'task-id',
  name: '每日全量同步',
  status: 'success',
  startTime: '2023-06-01T08:00:00Z',
  endTime: '2023-06-01T08:05:30Z',
  totalCount: 1500,
  successCount: 1495,
  errorCount: 5
}
```

## 详细文档

完整的设计文档和API参考请查看：

- [详细设计文档](./detailed-design.md)

## 后续规划

- 支持更多外部数据源类型
- 优化大数据量同步性能
- 提供可视化管理界面
- 支持多租户隔离 