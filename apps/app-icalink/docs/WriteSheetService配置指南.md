# WriteSheetService 配置指南

## 概述

`WriteSheetService` 现在支持通过构造函数参数进行灵活配置，包括批量写入大小、WPS 文件 ID 和 Sheet ID。

## 配置选项

### WriteSheetServiceOptions 接口

```typescript
export interface WriteSheetServiceOptions {
  /**
   * 批量写入大小（每批写入的记录数）
   * @default 100
   */
  batchSize?: number;

  /**
   * WPS 文件 ID
   * @default '459309344199'
   */
  fileId?: string;

  /**
   * WPS Sheet ID
   * @default 1
   */
  sheetId?: number;
}
```

### 配置参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `batchSize` | `number` | `100` | 每批写入的记录数，必须是大于 0 的整数 |
| `fileId` | `string` | `'459309344199'` | WPS 文件 ID |
| `sheetId` | `number` | `1` | WPS Sheet ID |

## 使用方法

### 1. 使用默认配置

如果不传入任何配置选项，服务将使用默认值：

```typescript
const writeSheetService = new WriteSheetService(
  logger,
  wasV7ApiDbsheet,
  absentStudentRelationRepository
  // 不传入 options，使用默认配置
);

// 默认配置：
// - batchSize: 100
// - fileId: '459309344199'
// - sheetId: 1
```

### 2. 自定义批量大小

只配置批量大小，其他使用默认值：

```typescript
const writeSheetService = new WriteSheetService(
  logger,
  wasV7ApiDbsheet,
  absentStudentRelationRepository,
  {
    batchSize: 50 // 每批写入 50 条记录
  }
);
```

### 3. 完整配置

配置所有选项：

```typescript
const writeSheetService = new WriteSheetService(
  logger,
  wasV7ApiDbsheet,
  absentStudentRelationRepository,
  {
    batchSize: 200,           // 每批写入 200 条记录
    fileId: 'your-file-id',   // 自定义 WPS 文件 ID
    sheetId: 2                // 自定义 WPS Sheet ID
  }
);
```

### 4. 在 Stratix 框架中使用

在 Stratix 框架的插件入口文件中配置：

```typescript
// apps/app-icalink/src/index.ts
import { withRegisterAutoDI } from '@stratix/core';
import WriteSheetService from './services/wirteSheetService.js';

export default withRegisterAutoDI(
  async (fastify, opts) => {
    // 注册服务时传入配置
    fastify.container.register({
      writeSheetService: asClass(WriteSheetService)
        .scoped()
        .inject(() => ({
          logger: fastify.container.resolve('logger'),
          wasV7ApiDbsheet: fastify.container.resolve('wasV7ApiDbsheet'),
          absentStudentRelationRepository: fastify.container.resolve('absentStudentRelationRepository'),
          options: {
            batchSize: 150,  // 自定义批量大小
            fileId: fastify.config.WPS_FILE_ID,  // 从配置读取
            sheetId: fastify.config.WPS_SHEET_ID
          }
        }))
    });
  },
  {
    autoDiscovery: {
      enabled: true,
      patterns: ['services/**/*.ts', 'repositories/**/*.ts']
    }
  }
);
```

### 5. 从系统配置表读取

推荐方式：从系统配置表动态读取配置：

```typescript
import { SystemConfigRepository } from './repositories/SystemConfigRepository.js';

// 在服务初始化时读取配置
const systemConfigRepo = container.resolve<SystemConfigRepository>('systemConfigRepository');

const batchSize = await systemConfigRepo.getValue('wps.dbsheet.batch_size', 100);
const fileId = await systemConfigRepo.getValue('wps.dbsheet.file_id', '459309344199');
const sheetId = await systemConfigRepo.getValue('wps.dbsheet.sheet_id', 1);

const writeSheetService = new WriteSheetService(
  logger,
  wasV7ApiDbsheet,
  absentStudentRelationRepository,
  {
    batchSize: Number(batchSize),
    fileId: String(fileId),
    sheetId: Number(sheetId)
  }
);
```

## 批量大小配置建议

### 性能考虑

| 批量大小 | 适用场景 | 优点 | 缺点 |
|---------|---------|------|------|
| 10-50 | 网络不稳定、API 限流严格 | 请求失败影响小、重试成本低 | 总请求次数多、总耗时长 |
| 50-100 | 一般场景（推荐） | 平衡性能和稳定性 | - |
| 100-200 | 网络稳定、数据量大 | 请求次数少、总耗时短 | 单次请求失败影响大 |
| 200-500 | 内网环境、高性能需求 | 最快的同步速度 | 可能超过 API 限制 |
| 500+ | 不推荐 | - | 容易超时、失败重试成本高 |

### 推荐配置

```typescript
// 开发环境：使用较小的批量大小，便于调试
const devOptions = {
  batchSize: 50
};

// 测试环境：使用中等批量大小
const testOptions = {
  batchSize: 100
};

// 生产环境：根据实际情况调整
const prodOptions = {
  batchSize: 150  // 可根据监控数据调整
};
```

## 参数验证

### 批量大小验证规则

服务会在初始化时自动验证批量大小：

1. **必须是整数**：`Number.isInteger(batchSize)` 必须为 `true`
2. **必须大于 0**：`batchSize > 0`
3. **建议不超过 1000**：超过 1000 会输出警告日志

### 验证失败示例

```typescript
// ❌ 错误：批量大小为 0
new WriteSheetService(logger, adapter, repo, { batchSize: 0 });
// 抛出错误: "批量大小必须是大于 0 的整数，当前值: 0"

// ❌ 错误：批量大小为负数
new WriteSheetService(logger, adapter, repo, { batchSize: -10 });
// 抛出错误: "批量大小必须是大于 0 的整数，当前值: -10"

// ❌ 错误：批量大小为小数
new WriteSheetService(logger, adapter, repo, { batchSize: 50.5 });
// 抛出错误: "批量大小必须是大于 0 的整数，当前值: 50.5"

// ⚠️ 警告：批量大小过大
new WriteSheetService(logger, adapter, repo, { batchSize: 1500 });
// 输出警告: "批量大小 1500 较大，可能导致 API 请求超时，建议设置为 1000 以下"
```

## 日志输出

### 初始化日志

服务初始化时会输出配置信息：

```
[INFO] WriteSheetService 初始化完成 {
  fileId: '459309344199',
  sheetId: 1,
  batchSize: 100
}
```

### 写入日志

批量写入时会输出详细的进度信息：

```
[INFO] 准备写入 350 条记录到 WPS 多维表（批量大小: 100 条/批）
[INFO] 总共 350 条记录，分为 4 批处理
[INFO] [1/4] 开始写入第 1 批，共 100 条记录
[INFO] [1/4] 第 1 批写入成功，返回 100 条记录
[INFO] [2/4] 开始写入第 2 批，共 100 条记录
[INFO] [2/4] 第 2 批写入成功，返回 100 条记录
[INFO] [3/4] 开始写入第 3 批，共 100 条记录
[INFO] [3/4] 第 3 批写入成功，返回 100 条记录
[INFO] [4/4] 开始写入第 4 批，共 50 条记录
[INFO] [4/4] 第 4 批写入成功，返回 50 条记录
[INFO] ✅ 所有记录写入完成！总计 350 条记录，分 4 批处理
```

## 配置最佳实践

### 1. 环境变量配置

```bash
# .env.development
WPS_DBSHEET_BATCH_SIZE=50
WPS_DBSHEET_FILE_ID=dev-file-id
WPS_DBSHEET_SHEET_ID=1

# .env.production
WPS_DBSHEET_BATCH_SIZE=150
WPS_DBSHEET_FILE_ID=prod-file-id
WPS_DBSHEET_SHEET_ID=1
```

### 2. 配置文件

```typescript
// config/wps.config.ts
export const wpsConfig = {
  development: {
    batchSize: 50,
    fileId: process.env.WPS_DBSHEET_FILE_ID || 'dev-file-id',
    sheetId: 1
  },
  test: {
    batchSize: 100,
    fileId: process.env.WPS_DBSHEET_FILE_ID || 'test-file-id',
    sheetId: 1
  },
  production: {
    batchSize: 150,
    fileId: process.env.WPS_DBSHEET_FILE_ID || 'prod-file-id',
    sheetId: 1
  }
};

// 使用配置
const env = process.env.NODE_ENV || 'development';
const config = wpsConfig[env];

const writeSheetService = new WriteSheetService(
  logger,
  wasV7ApiDbsheet,
  absentStudentRelationRepository,
  config
);
```

### 3. 数据库配置表

在 `system_configs` 表中添加配置：

```sql
INSERT INTO system_configs (config_key, config_value, description) VALUES
('wps.dbsheet.batch_size', '100', 'WPS 多维表批量写入大小'),
('wps.dbsheet.file_id', '459309344199', 'WPS 文件 ID'),
('wps.dbsheet.sheet_id', '1', 'WPS Sheet ID');
```

## 动态调整批量大小

### 根据数据量动态调整

```typescript
class DynamicWriteSheetService extends WriteSheetService {
  async syncWithDynamicBatchSize(records: any[]) {
    // 根据记录数量动态调整批量大小
    let batchSize = this.batchSize;
    
    if (records.length < 100) {
      batchSize = 50;  // 数据量小，使用小批量
    } else if (records.length > 1000) {
      batchSize = 200; // 数据量大，使用大批量
    }
    
    this.logger.info(`动态调整批量大小为 ${batchSize}`);
    
    // 使用调整后的批量大小
    const batches = this.chunkArray(records, batchSize);
    // ... 处理逻辑
  }
}
```

### 根据 API 响应时间调整

```typescript
class AdaptiveWriteSheetService extends WriteSheetService {
  private async writeWithAdaptiveBatchSize(records: any[]) {
    let currentBatchSize = this.batchSize;
    
    for (const batch of this.chunkArray(records, currentBatchSize)) {
      const startTime = Date.now();
      
      await this.wasV7ApiDbsheet.createRecords(
        this.WPS_FILE_ID,
        this.WPS_SHEET_ID,
        { records: batch }
      );
      
      const duration = Date.now() - startTime;
      
      // 如果响应时间过长，减小批量大小
      if (duration > 5000 && currentBatchSize > 50) {
        currentBatchSize = Math.floor(currentBatchSize * 0.8);
        this.logger.info(`响应时间过长，调整批量大小为 ${currentBatchSize}`);
      }
      // 如果响应时间很快，增加批量大小
      else if (duration < 1000 && currentBatchSize < 500) {
        currentBatchSize = Math.floor(currentBatchSize * 1.2);
        this.logger.info(`响应时间良好，调整批量大小为 ${currentBatchSize}`);
      }
    }
  }
}
```

## 故障排查

### 问题 1：批量大小验证失败

**错误信息**：
```
批量大小必须是大于 0 的整数，当前值: 0
```

**解决方案**：
- 检查传入的 `batchSize` 值是否为正整数
- 确保配置文件中的值类型正确（不是字符串）
- 使用 `Number()` 转换配置值

### 问题 2：API 请求超时

**现象**：
- 日志显示某批次写入时间过长
- 出现超时错误

**解决方案**：
- 减小 `batchSize` 值（例如从 200 降到 100）
- 检查网络连接
- 检查 WPS API 服务状态

### 问题 3：批量大小过大警告

**警告信息**：
```
批量大小 1500 较大，可能导致 API 请求超时，建议设置为 1000 以下
```

**解决方案**：
- 将 `batchSize` 调整到 1000 以下
- 如果确实需要大批量，进行充分测试
- 监控 API 响应时间和成功率

## 相关文档

- [WriteSheetService 使用说明](./WriteSheetService使用说明.md)
- [WriteSheetService 实现总结](./WriteSheetService实现总结.md)
- [使用示例](../examples/write-sheet-service-example.ts)

