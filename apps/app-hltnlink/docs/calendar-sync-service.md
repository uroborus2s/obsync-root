# 课表到WPS日程同步服务

## 概述

`CalendarSyncService` 是一个完整的课表数据到WPS日程同步服务，实现了从课表数据获取、权限管理到日程创建的完整流程。

## 功能特性

### 核心功能
- ✅ **完整同步流程**: 从日历数据获取到WPS日程创建的端到端流程
- ✅ **权限管理**: 批量添加学生权限到WPS日历
- ✅ **日程创建**: 将课程数据转换为WPS日程并批量创建
- ✅ **进度跟踪**: 实时同步进度回调
- ✅ **错误处理**: 完善的错误处理和重试机制
- ✅ **数据转换**: 智能的课程数据到WPS格式转换

### 技术特性
- 🔧 **依赖注入**: 基于Stratix框架的RESOLVER依赖注入
- 🔧 **类型安全**: 完整的TypeScript类型定义
- 🔧 **异步处理**: 支持批量和并发操作
- 🔧 **配置灵活**: 丰富的同步选项配置
- 🔧 **日志记录**: 详细的操作日志和统计信息

## 服务架构

### 依赖关系
```
CalendarSyncService
├── CalendarRepository          # 日历数据访问
├── SourceCourseRepository      # 课程数据访问
├── SourceCourseSelectionsRepository  # 选课数据访问
├── WpsCalendarAdapter          # WPS日历API
├── WpsScheduleAdapter          # WPS日程API
└── Logger                      # 日志服务
```

### 数据流程
```
1. 获取日历数据 (calendars表)
   ↓
2. 循环处理每个日历
   ├── 获取权限数据 (source_course_selections表)
   ├── 批量添加WPS日历权限
   ├── 获取日程数据 (source_courses表)
   └── 转换并创建WPS日程
   ↓
3. 返回同步结果和统计信息
```

## 使用方法

### 基本用法

```typescript
import { CalendarSyncService } from '@wps/hltnlink';

// 通过依赖注入获取服务实例
const calendarSyncService = container.resolve<CalendarSyncService>('calendarSyncService');

// 设置同步参数
const syncParams = {
  batchId: '202509072151',           // 日历批次ID
  semester: '2025-2026-1',           // 学期码
  courseBatchId: '202509072149',     // 课程数据批次ID
  selectionBatchId: '202509072151',  // 选课数据批次ID
  options: {
    syncPermissions: true,
    syncSchedules: true,
    batchSize: 50,
    delayMs: 100
  }
};

// 执行同步
const result = await calendarSyncService.syncCalendarSchedules(syncParams);

if (result.success) {
  console.log('同步成功:', result.data);
} else {
  console.error('同步失败:', result.error);
}
```

### 带进度回调的用法

```typescript
// 定义进度回调
const progressCallback = (progress) => {
  console.log(`同步进度: ${progress.percentage}% - ${progress.message}`);
};

// 执行同步并监听进度
const result = await calendarSyncService.syncCalendarSchedules(
  syncParams,
  progressCallback
);
```

### 分步骤操作

```typescript
// 1. 获取日历数据
const calendarsResult = await calendarSyncService.getCalendarsForSync(
  batchId,
  semester
);

// 2. 获取权限数据
const permissionResult = await calendarSyncService.getPermissionData(
  courseSequence,
  batchId,
  semester
);

// 3. 获取日程数据
const scheduleResult = await calendarSyncService.getScheduleData(
  courseSequence,
  batchId,
  semester
);

// 4. 添加权限
const addPermissionResult = await calendarSyncService.addCalendarPermissions(
  calendarId,
  studentIds
);

// 5. 创建日程
const createScheduleResult = await calendarSyncService.batchCreateWpsSchedules(
  calendarId,
  schedules
);
```

## 配置选项

### CalendarSyncParams

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `batchId` | string | ✅ | 批次ID |
| `semester` | string | ✅ | 学期码 |
| `courseBatchId` | string | ❌ | 课程数据批次ID，默认使用batchId |
| `selectionBatchId` | string | ❌ | 选课数据批次ID，默认使用batchId |
| `forceSync` | boolean | ❌ | 是否强制重新同步 |
| `options` | CalendarSyncOptions | ❌ | 同步选项 |

### CalendarSyncOptions

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `syncPermissions` | boolean | true | 是否同步权限 |
| `syncSchedules` | boolean | true | 是否同步日程 |
| `batchSize` | number | 50 | 批量操作大小 |
| `delayMs` | number | 100 | 操作间隔（毫秒） |
| `maxRetries` | number | 3 | 最大重试次数 |

## 返回结果

### CalendarSyncResult

```typescript
interface CalendarSyncResult {
  success: boolean;                    // 是否成功
  totalCalendars: number;              // 处理的日历数量
  successfulCalendars: number;         // 成功处理的日历数量
  failedCalendars: number;             // 失败的日历数量
  permissionResults: PermissionSyncResult[];  // 权限同步结果
  scheduleResults: ScheduleSyncResult[];      // 日程同步结果
  errors: SyncError[];                 // 错误信息
  duration: number;                    // 执行时间（毫秒）
  statistics: SyncStatistics;         // 详细统计
}
```

## 数据库查询

### 权限数据查询
```sql
SELECT DISTINCT XSID 
FROM source_course_selections 
WHERE batch_id = ? 
  AND KKXQM = ? 
  AND XKKH = ?
```

### 日程数据查询
```sql
SELECT * 
FROM source_courses 
WHERE batch_id = ? 
  AND KKXQM = ? 
  AND KXH = ?
```

## 错误处理

服务提供了完善的错误处理机制：

- **API错误**: WPS API调用失败时的处理
- **数据库错误**: 数据库操作失败时的处理
- **重试机制**: 支持自动重试失败的操作
- **错误分类**: 详细的错误类型和上下文信息

## 性能优化

- **批量操作**: 支持批量添加权限和创建日程
- **并发控制**: 合理的延迟和批次大小控制
- **连接复用**: 复用数据库连接和HTTP连接
- **内存管理**: 分批处理大量数据避免内存溢出

## 监控和日志

服务提供详细的日志记录：

- 操作进度日志
- 性能统计日志
- 错误详情日志
- API调用日志

## 示例代码

完整的使用示例请参考：
- `src/examples/calendar-sync-example.ts` - 详细的使用示例
- `src/index.ts` - 应用入口示例

## 注意事项

1. **批次ID管理**: 确保传入正确的批次ID，不同的数据可能来自不同批次
2. **API限制**: 注意WPS API的调用频率限制，合理设置延迟参数
3. **数据一致性**: 确保source_courses和source_course_selections表中的数据一致
4. **权限管理**: 确保有足够的权限调用WPS API
5. **错误恢复**: 对于部分失败的情况，可以根据错误信息进行针对性重试

## 扩展开发

服务采用接口驱动设计，易于扩展：

- 实现 `ICalendarSyncService` 接口可以替换实现
- 通过依赖注入可以轻松替换依赖组件
- 支持自定义数据转换逻辑
- 支持自定义错误处理策略
