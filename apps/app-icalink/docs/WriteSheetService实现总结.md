# WriteSheetService 实现总结

## 实现概述

本次实现完成了 `WriteSheetService` 服务，用于将 `icalink_absent_student_relations` 表中的缺勤学生关系数据同步到 WPS 多维表。

## 实现的功能

### 核心功能

1. **自动同步**
   - 服务启动时（`onReady` 方法）自动执行一次同步
   - 从数据库读取缺勤记录
   - 转换数据格式
   - 批量写入 WPS 多维表

2. **手动触发同步**
   - 提供 `triggerSync()` 公共方法
   - 可通过 API 或其他服务调用
   - 返回同步结果（成功/失败、记录数量）

3. **批量处理**
   - 每批处理 100 条记录
   - 避免单次请求数据量过大
   - 提高同步效率和稳定性

4. **数据转换**
   - 将数据库字段映射到 WPS 多维表字段
   - 转换缺勤类型为中文标签
   - 格式化日期为标准格式

5. **错误处理**
   - 完整的 try-catch 错误处理
   - 详细的错误日志记录
   - 优雅的错误恢复机制

## 技术实现

### 依赖注入

```typescript
constructor(
  private readonly logger: Logger,
  private readonly wasV7ApiDbsheet: WpsDBSheetAdapter,
  private readonly absentStudentRelationRepository: AbsentStudentRelationRepository
) {}
```

服务依赖三个组件：
- `Logger`: 日志记录
- `WpsDBSheetAdapter`: WPS 多维表 API 适配器
- `AbsentStudentRelationRepository`: 缺勤学生关系数据仓储

这些依赖通过 Stratix 框架的自动依赖注入机制注入。

### 数据流程

```
数据库查询 → 数据转换 → 批量写入
    ↓            ↓           ↓
findMany()  convertTo    createRecords()
            WpsRecords()
```

### 关键方法

1. **fetchAbsentStudentRelations()**
   - 从数据库读取缺勤记录
   - 使用 `findMany()` 方法查询
   - 按统计日期降序排序
   - 限制返回 1000 条记录

2. **convertToWpsRecords()**
   - 将数据库记录转换为 WPS 格式
   - 映射字段名称
   - 转换数据类型
   - 处理空值

3. **writeRecordsToWps()**
   - 分批写入数据
   - 调用 WPS API
   - 记录写入结果

4. **triggerSync()**
   - 手动触发同步
   - 返回同步结果
   - 可被外部调用

## 文件结构

```
apps/app-icalink/
├── src/
│   └── services/
│       └── wirteSheetService.ts          # 服务实现
├── docs/
│   ├── WriteSheetService使用说明.md      # 使用文档
│   └── WriteSheetService实现总结.md      # 本文档
└── examples/
    └── write-sheet-service-example.ts    # 使用示例
```

## 配置要求

### 1. WPS 多维表配置

需要在服务中配置以下参数：

```typescript
private readonly WPS_FILE_ID = 'your-file-id'; // WPS 文件 ID
private readonly WPS_SHEET_ID = 1; // WPS Sheet ID
```

### 2. WPS 多维表字段

WPS 多维表需要包含以下字段：

- 课程统计ID（数字）
- 课程ID（数字）
- 课程代码（文本）
- 课程名称（文本）
- 学生ID（文本）
- 学生姓名（文本）
- 学院名称（文本）
- 班级名称（文本）
- 专业名称（文本）
- 缺勤类型（文本）
- 统计日期（日期）
- 学期（文本）
- 教学周（数字）
- 星期（数字）
- 节次（文本）
- 时间段（文本）
- 请假原因（文本）

## 使用示例

### 基本使用

```typescript
// 服务会在启动时自动同步
// 无需手动调用
```

### 手动触发

```typescript
const result = await writeSheetService.triggerSync();
console.log(result);
// {
//   success: true,
//   message: '同步成功',
//   count: 150
// }
```

### 在 Controller 中使用

```typescript
@Post('/sync-absent-records')
async syncAbsentRecords(): Promise<SyncResult> {
  return await this.writeSheetService.triggerSync();
}
```

## 性能优化

1. **批量处理**
   - 每批 100 条记录
   - 减少 API 调用次数
   - 提高写入效率

2. **数据限制**
   - 默认限制 1000 条记录
   - 避免内存溢出
   - 可根据需求调整

3. **异步处理**
   - 使用 async/await
   - 非阻塞式执行
   - 提高并发性能

## 日志记录

服务提供详细的日志输出：

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

## 错误处理

所有可能的错误都被捕获并记录：

```typescript
try {
  // 执行同步
} catch (error) {
  this.logger.error('同步失败', error);
  throw error;
}
```

## 扩展建议

### 1. 从配置表读取 WPS 配置

```typescript
// 建议将 WPS_FILE_ID 和 WPS_SHEET_ID 存储在系统配置表中
const fileId = await systemConfigRepository.getValue('wps.dbsheet.file_id');
const sheetId = await systemConfigRepository.getValue('wps.dbsheet.sheet_id');
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

### 4. 添加定时任务

```typescript
// 使用 Stratix 的定时任务功能
@Executor('syncAbsentRecords')
export class SyncAbsentRecordsExecutor {
  async execute() {
    await this.writeSheetService.triggerSync();
  }
}
```

### 5. 添加同步状态记录

```typescript
// 记录每次同步的状态
interface SyncRecord {
  timestamp: Date;
  success: boolean;
  count: number;
  message: string;
}
```

## 测试建议

### 单元测试

```typescript
describe('WriteSheetService', () => {
  it('should fetch absent student relations', async () => {
    // 测试数据库查询
  });

  it('should convert records to WPS format', () => {
    // 测试数据转换
  });

  it('should write records to WPS', async () => {
    // 测试 WPS API 调用
  });
});
```

### 集成测试

```typescript
describe('WriteSheetService Integration', () => {
  it('should sync data from database to WPS', async () => {
    // 测试完整的同步流程
  });
});
```

## 注意事项

1. **WPS API 限制**
   - 注意 API 调用频率限制
   - 避免短时间内大量请求

2. **数据一致性**
   - 确保数据库和 WPS 数据一致
   - 考虑添加数据校验

3. **错误恢复**
   - 考虑添加重试机制
   - 记录失败的记录以便后续处理

4. **性能监控**
   - 监控同步耗时
   - 优化慢查询

5. **安全性**
   - 保护 WPS API 凭证
   - 验证数据合法性

## 相关文档

- [使用说明](./WriteSheetService使用说明.md)
- [使用示例](../examples/write-sheet-service-example.ts)
- [WPS DBSheet API 文档](https://open.wps.cn/documents/app-integration-dev/wps365/server/dbsheet/)
- [Stratix 框架文档](../../packages/stratix/README.md)

## 总结

本次实现完成了一个完整的数据同步服务，具有以下特点：

✅ 符合 Stratix 框架规范
✅ 完整的依赖注入
✅ 详细的日志记录
✅ 完善的错误处理
✅ 批量处理优化
✅ 清晰的代码结构
✅ 丰富的文档和示例

服务已经可以投入使用，后续可以根据实际需求进行扩展和优化。

