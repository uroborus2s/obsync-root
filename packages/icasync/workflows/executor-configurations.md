# @stratix/icasync 执行器配置指南

## 概述

本文档详细说明了 @stratix/icasync 工作流中各个执行器的配置参数、默认值和约束条件。配置已针对重构后的架构进行优化。

## 执行器重构状态

- ✅ **已重构完成**: 使用 Service 层架构，生产就绪
- ⚠️ **部分重构**: 基本重构完成，但需要完善 Service 层方法
- ❌ **待重构**: 仍使用 DatabaseAPI，需要重构为 Service 层架构

---

## 1. DataAggregationProcessor ✅

**状态**: 已重构完成  
**版本**: 2.0.0  
**架构**: 基于 ICourseAggregationService

### 配置参数

```typescript
interface DataAggregationConfig {
  xnxq: string;                    // 必需：学年学期
  batchSize?: number;              // 可选：批处理大小
  clearExisting?: boolean;         // 可选：是否清理现有数据
  useNativeSQL?: boolean;          // 可选：是否使用原生SQL
  incrementalMode?: boolean;       // 可选：是否增量模式
}
```

### 默认值和约束

| 参数 | 默认值 | 约束 | 说明 |
|------|--------|------|------|
| `xnxq` | - | 必需，格式：YYYY-YYYY-N | 学年学期标识 |
| `batchSize` | 1000 | 10-10000 | 批处理大小，影响内存使用 |
| `clearExisting` | false | - | 全量同步时建议设为 true |
| `useNativeSQL` | true | - | 使用原生SQL提高性能 |
| `incrementalMode` | false | - | 增量同步时设为 true |

### 使用示例

```typescript
// 全量同步配置
{
  xnxq: '2024-2025-1',
  batchSize: 1000,
  clearExisting: true,
  useNativeSQL: true,
  incrementalMode: false
}

// 增量同步配置
{
  xnxq: '2024-2025-1',
  batchSize: 500,
  clearExisting: false,
  useNativeSQL: true,
  incrementalMode: true
}
```

---

## 2. CalendarCreationProcessor ✅

**状态**: 已重构完成  
**版本**: 2.0.0  
**架构**: 基于 ICalendarSyncService + ICourseAggregationService

### 配置参数

```typescript
interface CalendarCreationConfig {
  xnxq: string;                    // 必需：学年学期
  batchSize?: number;              // 可选：批处理大小
  maxConcurrency?: number;         // 可选：最大并发数
  timeout?: number;                // 可选：超时时间(ms)
  retryCount?: number;             // 可选：重试次数
}
```

### 默认值和约束

| 参数 | 默认值 | 约束 | 说明 |
|------|--------|------|------|
| `xnxq` | - | 必需，格式：YYYY-YYYY-N | 学年学期标识 |
| `batchSize` | 50 | 10-1000 | 批处理大小，建议50-100 |
| `maxConcurrency` | 10 | 1-50 | 并发数，避免API限流 |
| `timeout` | 30000 | ≥1000 | 单个任务超时时间 |
| `retryCount` | 3 | 0-10 | 失败重试次数 |

### 使用示例

```typescript
// 标准配置
{
  xnxq: '2024-2025-1',
  batchSize: 50,
  maxConcurrency: 10,
  timeout: 30000,
  retryCount: 3
}

// 高性能配置（大数据量）
{
  xnxq: '2024-2025-1',
  batchSize: 100,
  maxConcurrency: 20,
  timeout: 45000,
  retryCount: 2
}
```

---

## 3. ParticipantManagementProcessor ⚠️

**状态**: 部分重构  
**版本**: 1.5.0  
**架构**: 基于 ICalendarSyncService（需要完善 getCreatedCalendars 方法）

### 配置参数

```typescript
interface ParticipantManagementConfig {
  xnxq: string;                    // 必需：学年学期
  batchSize?: number;              // 可选：批处理大小
  maxConcurrency?: number;         // 可选：最大并发数
  timeout?: number;                // 可选：超时时间(ms)
}
```

### 默认值和约束

| 参数 | 默认值 | 约束 | 说明 |
|------|--------|------|------|
| `xnxq` | - | 必需，格式：YYYY-YYYY-N | 学年学期标识 |
| `batchSize` | 100 | 10-500 | 批处理大小 |
| `maxConcurrency` | 10 | 1-20 | 并发数，参与者添加较慢 |
| `timeout` | 30000 | ≥1000 | 单个任务超时时间 |

### 待完善功能

- 需要在 `ICalendarSyncService` 中实现 `getCreatedCalendars()` 方法
- 需要完善参与者权限管理逻辑

---

## 4. ScheduleCreationProcessor ❌

**状态**: 待重构  
**版本**: 1.0.0  
**架构**: 当前仍使用 DatabaseAPI，需要重构为 Service 层

### 配置参数

```typescript
interface ScheduleCreationConfig {
  xnxq: string;                    // 必需：学年学期
  batchSize?: number;              // 可选：批处理大小
  maxConcurrency?: number;         // 可选：最大并发数
  createAttendanceRecords?: boolean; // 可选：是否创建打卡记录
  timeout?: number;                // 可选：超时时间(ms)
}
```

### 重构计划

- 移除 DatabaseAPI 依赖
- 注入 ICalendarSyncService 和 IScheduleService
- 使用 Service 层方法创建日程

---

## 5. StatusUpdateProcessor ❌

**状态**: 待重构  
**版本**: 1.0.0  
**架构**: 当前仍使用 DatabaseAPI，需要重构为 Service 层

### 配置参数

```typescript
interface StatusUpdateConfig {
  xnxq: string;                    // 必需：学年学期
  markAsCompleted?: boolean;       // 可选：是否标记为完成
  updateTimestamp?: boolean;       // 可选：是否更新时间戳
}
```

### 重构计划

- 移除 DatabaseAPI 依赖
- 注入相应的 Service 层服务
- 使用 Service 层方法更新状态

---

## 6. SyncCompletionProcessor ❌

**状态**: 待重构  
**版本**: 1.0.0  
**架构**: 当前仍使用 DatabaseAPI，需要重构为 Service 层

### 配置参数

```typescript
interface SyncCompletionConfig {
  xnxq: string;                    // 必需：学年学期
  generateReport?: boolean;        // 可选：是否生成报告
  sendNotification?: boolean;      // 可选：是否发送通知
  cleanupTempData?: boolean;       // 可选：是否清理临时数据
  updateLastSyncTime?: boolean;    // 可选：是否更新最后同步时间
  incrementalMode?: boolean;       // 可选：是否增量模式
}
```

### 重构计划

- 移除 DatabaseAPI 依赖
- 创建 ISyncWorkflowService 和 INotificationService
- 使用 Service 层方法生成报告和发送通知

---

## 7. ChangeDetectionProcessor ❌

**状态**: 待重构  
**版本**: 1.0.0  
**架构**: 当前仍使用 DatabaseAPI，需要重构为 Service 层

### 配置参数

```typescript
interface ChangeDetectionConfig {
  xnxq: string;                    // 必需：学年学期
  detectChanges?: boolean;         // 可选：是否检测变更
  compareWithExisting?: boolean;   // 可选：是否与现有数据比较
  generateChangeReport?: boolean;  // 可选：是否生成变更报告
  timeWindow?: number;             // 可选：检测时间窗口(小时)
}
```

### 重构计划

- 移除 DatabaseAPI 依赖
- 创建 IChangeDetectionService
- 使用 Service 层方法检测变更

---

## 工作流级别配置

### 全量同步工作流

```typescript
{
  // 输入参数
  xnxq: '2024-2025-1',           // 必需
  batchSize: 100,                // 推荐值
  maxConcurrency: 10,            // 推荐值
  timeout: '45m',                // 全量同步需要更长时间
  clearExisting: true,           // 全量同步推荐开启
  createAttendanceRecords: false, // 根据需要设置
  sendNotification: true         // 推荐开启
}
```

### 增量同步工作流

```typescript
{
  // 输入参数
  xnxq: '2024-2025-1',           // 必需
  timeWindow: 24,                // 检测最近24小时变更
  batchSize: 50,                 // 增量同步使用较小批次
  maxConcurrency: 5,             // 增量同步使用较低并发
  timeout: '20m',                // 增量同步通常较快
  generateChangeReport: true,    // 推荐开启
  sendNotification: false        // 增量同步默认不发送
}
```

## 性能调优建议

### 大数据量场景（>10000课程）

- `batchSize`: 增加到 200-500
- `maxConcurrency`: 增加到 15-20
- `timeout`: 增加到 60000ms
- 考虑分批执行或使用增量同步

### 小数据量场景（<1000课程）

- `batchSize`: 减少到 20-50
- `maxConcurrency`: 减少到 3-5
- `timeout`: 保持默认值
- 可以使用较高的重试次数

### 网络环境较差

- 减少 `maxConcurrency` 到 3-5
- 增加 `timeout` 到 45000-60000ms
- 增加 `retryCount` 到 5-10
- 考虑使用更小的 `batchSize`
