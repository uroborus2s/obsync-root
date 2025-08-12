# ICAsync 适配器使用示例

本文档展示如何使用ICAsync插件的各种同步适配器来启动全量更新和增量更新业务流程。

## 概述

ICAsync插件提供了三种主要的同步适配器：

1. **FullSyncAdapter** - 全量同步适配器
2. **IncrementalSyncAdapter** - 增量同步适配器  
3. **UserSyncAdapter** - 用户同步适配器

所有适配器都集成了新的业务规则引擎，确保：
- 每个学期只能执行一次全量同步
- 同一时刻只能有一个同步类型在执行

## 1. 全量同步适配器 (FullSyncAdapter)

### 基本用法

```typescript
import type { AwilixContainer } from '@stratix/core';
import FullSyncAdapter from '@stratix/icasync/adapters/full-sync.adapter';

// 在控制器或服务中使用
class SyncController {
  private fullSyncAdapter: FullSyncAdapter;

  constructor(container: AwilixContainer) {
    this.fullSyncAdapter = new FullSyncAdapter(container);
  }

  async executeFullSync(xnxq: string) {
    const config = {
      xnxq: '2024-2025-1',
      batchSize: 100,
      timeout: 1800000 // 30分钟
    };

    const result = await this.fullSyncAdapter.executeFullSync(config);
    
    if (result.status === 'completed') {
      console.log('全量同步完成', result.details);
    } else if (result.status === 'skipped') {
      console.log('全量同步被跳过', result.details.reason);
    } else {
      console.error('全量同步失败', result.errors);
    }

    return result;
  }
}
```

### 错误处理

```typescript
const result = await fullSyncAdapter.executeFullSync(config);

switch (result.status) {
  case 'completed':
    // 同步成功完成
    break;
    
  case 'skipped':
    // 同步被业务规则跳过
    if (result.details.reason === 'semester_limit') {
      console.log('该学期已执行过全量同步');
    } else if (result.details.reason === 'type_mutex') {
      console.log('已有其他类型同步在执行');
    }
    break;
    
  case 'failed':
    // 同步执行失败
    console.error('同步失败:', result.errors);
    break;
}
```

## 2. 增量同步适配器 (IncrementalSyncAdapter)

### 基本用法

```typescript
import IncrementalSyncAdapter from '@stratix/icasync/adapters/incremental-sync.adapter';

class IncrementalSyncController {
  private incrementalSyncAdapter: IncrementalSyncAdapter;

  constructor(container: AwilixContainer) {
    this.incrementalSyncAdapter = new IncrementalSyncAdapter(container);
  }

  async executeIncrementalSync(xnxq: string) {
    const config = {
      xnxq: '2024-2025-1',
      batchSize: 50,
      timeout: 1200000, // 20分钟
      lastSyncTime: new Date('2024-01-01'),
      syncScope: 'courses' // 'all' | 'courses' | 'students' | 'schedules'
    };

    const result = await this.incrementalSyncAdapter.executeIncrementalSync(config);
    return result;
  }

  // 检查是否有正在运行的增量同步
  async checkRunningSync(xnxq: string) {
    const status = await this.incrementalSyncAdapter.checkRunningIncrementalSync(xnxq);
    
    if (status.isRunning) {
      console.log('增量同步正在运行', status.instance?.id);
    } else {
      console.log('没有正在运行的增量同步');
    }

    return status;
  }

  // 获取同步历史
  async getSyncHistory(xnxq: string) {
    const history = await this.incrementalSyncAdapter.getSyncHistory(xnxq, 10);
    
    if (history.success) {
      console.log('同步历史:', history.instances?.length);
    }

    return history;
  }

  // 取消正在运行的同步
  async cancelSync(xnxq: string) {
    const result = await this.incrementalSyncAdapter.cancelIncrementalSync(xnxq);
    
    if (result.success) {
      console.log(`取消了 ${result.cancelledInstances} 个同步实例`);
    }

    return result;
  }
}
```

## 3. 用户同步适配器 (UserSyncAdapter)

### 批量用户同步

```typescript
import UserSyncAdapter from '@stratix/icasync/adapters/user-sync.adapter';

class UserSyncController {
  private userSyncAdapter: UserSyncAdapter;

  constructor(container: AwilixContainer) {
    this.userSyncAdapter = new UserSyncAdapter(container);
  }

  // 批量用户同步
  async executeBatchUserSync(xnxq: string, userIds: string[]) {
    const result = await this.userSyncAdapter.executeBatchUserSync(
      xnxq,
      userIds,
      {
        userType: 'student',
        batchSize: 20,
        syncScope: 'profile'
      }
    );

    return result;
  }

  // 单个用户同步
  async executeSingleUserSync(xnxq: string, userId: string) {
    const result = await this.userSyncAdapter.executeSingleUserSync(
      xnxq,
      userId,
      {
        userType: 'student',
        syncScope: 'all'
      }
    );

    return result;
  }

  // 完整配置的用户同步
  async executeUserSync(xnxq: string) {
    const config = {
      xnxq: '2024-2025-1',
      userIds: ['user1', 'user2', 'user3'],
      userType: 'teacher' as const,
      batchSize: 10,
      timeout: 900000, // 15分钟
      syncScope: 'courses' as const
    };

    const result = await this.userSyncAdapter.executeUserSync(config);
    return result;
  }
}
```

## 4. 在HTTP控制器中使用

```typescript
import { Controller, Get, Post, Body } from '@stratix/core';

@Controller('/api/sync')
export class SyncApiController {
  constructor(
    private readonly fullSyncAdapter: FullSyncAdapter,
    private readonly incrementalSyncAdapter: IncrementalSyncAdapter,
    private readonly userSyncAdapter: UserSyncAdapter
  ) {}

  @Post('/full')
  async startFullSync(@Body() body: { xnxq: string; batchSize?: number }) {
    try {
      const result = await this.fullSyncAdapter.executeFullSync({
        xnxq: body.xnxq,
        batchSize: body.batchSize || 100
      });

      return {
        success: result.status === 'completed',
        status: result.status,
        message: result.status === 'skipped' ? result.details.message : undefined,
        data: result.details
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @Post('/incremental')
  async startIncrementalSync(@Body() body: { 
    xnxq: string; 
    syncScope?: string;
    lastSyncTime?: string;
  }) {
    try {
      const result = await this.incrementalSyncAdapter.executeIncrementalSync({
        xnxq: body.xnxq,
        syncScope: body.syncScope as any || 'all',
        lastSyncTime: body.lastSyncTime ? new Date(body.lastSyncTime) : undefined
      });

      return {
        success: result.status === 'completed',
        status: result.status,
        data: result.details
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @Post('/user')
  async startUserSync(@Body() body: { 
    xnxq: string; 
    userIds: string[];
    userType?: string;
  }) {
    try {
      const result = await this.userSyncAdapter.executeBatchUserSync(
        body.xnxq,
        body.userIds,
        {
          userType: body.userType as any || 'all'
        }
      );

      return {
        success: result.status === 'completed',
        status: result.status,
        processedCount: result.processedCount,
        data: result.details
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  @Get('/status/:xnxq')
  async getSyncStatus(@Param('xnxq') xnxq: string) {
    try {
      const [fullStatus, incrementalStatus, userStatus] = await Promise.all([
        this.fullSyncAdapter.checkRunningFullSync?.(xnxq) || { isRunning: false },
        this.incrementalSyncAdapter.checkRunningIncrementalSync(xnxq),
        this.userSyncAdapter.checkRunningUserSync(xnxq)
      ]);

      return {
        success: true,
        data: {
          xnxq,
          fullSync: fullStatus,
          incrementalSync: incrementalStatus,
          userSync: userStatus
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
```

## 5. 业务规则说明

### 学期全量同步限制
- 每个学期只能执行一次全量同步
- 即使前一次执行失败，也不能重复执行
- 返回状态：`skipped`，原因：`semester_limit`

### 同步类型互斥
- 同一时刻只能有一个同步类型在执行
- 包括全量同步、增量同步、用户同步
- 返回状态：`skipped`，原因：`type_mutex`

### 错误处理最佳实践
1. 检查返回状态 (`completed`, `skipped`, `failed`)
2. 根据跳过原因提供用户友好的提示
3. 记录详细的错误信息用于调试
4. 实现重试机制（仅对非业务规则错误）

## 6. 监控和日志

所有适配器都提供详细的日志记录：

```typescript
// 日志示例
[FullSyncAdapter] Starting full sync for 2024-2025-1
[FullSyncAdapter] 全量同步被业务规则阻止 { reason: 'semester_limit' }
[FullSyncAdapter] 互斥工作流创建成功，ID: 12345
[FullSyncAdapter] Full sync completed for 2024-2025-1
```

建议在生产环境中配置适当的日志级别和监控告警。
