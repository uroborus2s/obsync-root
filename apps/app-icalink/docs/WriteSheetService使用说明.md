# WriteSheetService 使用说明

## 概述

`WriteSheetService` 是一个用于将缺勤学生关系数据同步到 WPS 多维表的服务。该服务会从 `icalink_absent_student_relations` 表中读取缺勤记录，并将其写入到 WPS 多维表中。

## 功能特性

- ✅ 自动从数据库读取缺勤学生关系记录
- ✅ 将数据转换为 WPS 多维表格式
- ✅ 批量写入数据到 WPS 多维表（每批 100 条记录）
- ✅ 支持手动触发同步
- ✅ 完整的错误处理和日志记录

## 配置说明

### 1. WPS 多维表配置

在使用服务之前，需要配置 WPS 多维表的 `fileId` 和 `sheetId`：

```typescript
// 在 wirteSheetService.ts 中修改以下配置
private readonly WPS_FILE_ID = 'your-file-id'; // 替换为实际的 WPS 文件 ID
private readonly WPS_SHEET_ID = 1; // 替换为实际的 WPS Sheet ID
```

**建议**：将这些配置存储在系统配置表中，通过依赖注入的方式读取。

### 2. WPS 多维表字段映射

服务会将数据库字段映射到 WPS 多维表字段，确保 WPS 多维表中包含以下字段：

| WPS 字段名 | 数据库字段 | 类型 | 说明 |
|-----------|-----------|------|------|
| 课程统计ID | course_stats_id | 数字 | 关联课程统计ID |
| 课程ID | course_id | 数字 | 课程ID（课节ID） |
| 课程代码 | course_code | 文本 | 课程代码 |
| 课程名称 | course_name | 文本 | 课程名称 |
| 学生ID | student_id | 文本 | 学生学号 |
| 学生姓名 | student_name | 文本 | 学生姓名 |
| 学院名称 | school_name | 文本 | 学院名称 |
| 班级名称 | class_name | 文本 | 班级名称 |
| 专业名称 | major_name | 文本 | 专业名称 |
| 缺勤类型 | absence_type | 文本 | 缺勤/旷课/请假/请假待审批 |
| 统计日期 | stat_date | 日期 | 统计日期 |
| 学期 | semester | 文本 | 学期 |
| 教学周 | teaching_week | 数字 | 教学周 |
| 星期 | week_day | 数字 | 星期几 |
| 节次 | periods | 文本 | 节次 |
| 时间段 | time_period | 文本 | 时间段（am/pm） |
| 请假原因 | leave_reason | 文本 | 请假原因 |

## 使用方法

### 1. 自动同步

服务在启动时会自动执行一次同步：

```typescript
// 服务启动时自动调用 onReady 方法
async onReady() {
  this.logger.info('WriteSheetService ready');
  
  try {
    // 自动同步缺勤记录到 WPS
    await this.syncAbsentStudentRelationsToWps();
  } catch (error) {
    this.logger.error('Failed to sync absent student relations to WPS', error);
  }
}
```

### 2. 手动触发同步

可以通过调用 `triggerSync` 方法手动触发同步：

```typescript
// 在 Controller 或其他服务中调用
const result = await writeSheetService.triggerSync();

console.log(result);
// {
//   success: true,
//   message: '同步成功',
//   count: 150
// }
```

### 3. 创建 API 端点（可选）

可以创建一个 API 端点来手动触发同步：

```typescript
// 在 Controller 中添加
@Post('/sync-absent-records')
async syncAbsentRecords(
  @Inject() writeSheetService: WriteSheetService
): Promise<{ success: boolean; message: string; count: number }> {
  return await writeSheetService.triggerSync();
}
```

## 数据流程

```
1. 从数据库读取缺勤记录
   ↓
   fetchAbsentStudentRelations()
   - 查询 icalink_absent_student_relations 表
   - 按统计日期降序排序
   - 限制返回 1000 条记录

2. 转换数据格式
   ↓
   convertToWpsRecords()
   - 将数据库字段映射到 WPS 字段
   - 转换缺勤类型为中文标签
   - 格式化日期

3. 批量写入 WPS 多维表
   ↓
   writeRecordsToWps()
   - 分批处理（每批 100 条）
   - 调用 WPS DBSheet API
   - 记录写入结果
```

## 依赖注入

服务依赖以下组件：

```typescript
constructor(
  private readonly logger: Logger,
  private readonly wasV7ApiDbsheet: WpsDBSheetAdapter,
  private readonly absentStudentRelationRepository: AbsentStudentRelationRepository
) {}
```

这些依赖会通过 Stratix 框架的自动依赖注入机制自动注入。

## 错误处理

服务包含完整的错误处理机制：

- 数据库查询失败：记录错误日志并抛出异常
- WPS API 调用失败：记录错误日志并抛出异常
- 数据转换失败：记录错误日志并抛出异常

所有错误都会被记录到日志中，便于排查问题。

## 性能优化

### 批量处理

服务采用批量处理机制，每批写入 100 条记录，避免单次请求数据量过大：

```typescript
const batchSize = 100; // 每批写入 100 条记录
const batches = this.chunkArray(records, batchSize);
```

### 数据限制

默认限制每次查询返回 1000 条记录，避免一次性加载过多数据：

```typescript
{
  orderBy: { field: 'stat_date', direction: 'desc' },
  limit: 1000 // 限制返回数量
}
```

可以根据实际需求调整这个限制。

## 日志输出

服务会输出详细的日志信息：

```
[INFO] WriteSheetService ready
[INFO] 开始同步缺勤学生关系数据到 WPS 多维表
[INFO] 从数据库读取缺勤学生关系记录
[INFO] 找到 150 条缺勤记录，准备写入 WPS 多维表
[INFO] 准备写入 150 条记录到 WPS 多维表
[INFO] 写入第 1/2 批，共 100 条记录
[INFO] 第 1 批写入成功，返回 100 条记录
[INFO] 写入第 2/2 批，共 50 条记录
[INFO] 第 2 批写入成功，返回 50 条记录
[INFO] 所有记录写入完成
[INFO] 成功同步 150 条缺勤记录到 WPS 多维表
```

## 注意事项

1. **WPS 配置**：确保 `WPS_FILE_ID` 和 `WPS_SHEET_ID` 配置正确
2. **字段映射**：确保 WPS 多维表中的字段名称与代码中的映射一致
3. **权限**：确保 WPS API 有权限访问目标文件和 Sheet
4. **数据量**：如果数据量很大，建议添加日期范围过滤条件
5. **定时任务**：可以配合定时任务定期同步数据

## 扩展建议

### 1. 从配置表读取 WPS 配置

```typescript
constructor(
  private readonly logger: Logger,
  private readonly wasV7ApiDbsheet: WpsDBSheetAdapter,
  private readonly absentStudentRelationRepository: AbsentStudentRelationRepository,
  private readonly systemConfigRepository: SystemConfigRepository
) {}

async onReady() {
  // 从配置表读取 WPS 配置
  const fileId = await this.systemConfigRepository.getValue('wps.dbsheet.file_id');
  const sheetId = await this.systemConfigRepository.getValue('wps.dbsheet.sheet_id');
  
  // 使用配置值...
}
```

### 2. 添加日期范围过滤

```typescript
// 只同步最近 7 天的数据
const startDate = new Date();
startDate.setDate(startDate.getDate() - 7);

const records = await this.absentStudentRelationRepository.findByDateRange(
  startDate,
  new Date()
);
```

### 3. 添加增量同步

```typescript
// 记录上次同步时间，只同步新增数据
const lastSyncTime = await this.getLastSyncTime();
const records = await this.absentStudentRelationRepository.findMany(
  (qb) => qb.where('created_at', '>', lastSyncTime)
);
```

## 相关文档

- [WPS DBSheet API 文档](https://open.wps.cn/documents/app-integration-dev/wps365/server/dbsheet/)
- [Stratix 框架文档](../../packages/stratix/README.md)
- [AbsentStudentRelationRepository 文档](../src/repositories/AbsentStudentRelationRepository.ts)

