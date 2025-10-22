# 创建 WPS 多维表字段使用指南

## 功能概述

`createWpsFields()` 方法用于批量创建 WPS 多维表字段，从 `ABSENT_STUDENT_RELATION_FIELDS` 配置中读取字段定义，自动跳过已创建的字段（ID 和 课程统计ID），从课程ID字段开始逐个创建剩余的 18 个字段。

## 方法签名

```typescript
async createWpsFields(): Promise<void>
```

## 功能特性

### ✅ 核心功能

1. **自动跳过已创建字段**
   - 跳过索引 0：`ID` 字段
   - 跳过索引 1：`课程统计ID` 字段
   - 从索引 2 开始：`课程ID` 字段

2. **逐个创建字段**
   - 每次 API 调用只创建一个字段
   - 按照 `ABSENT_STUDENT_RELATION_FIELDS` 数组顺序创建
   - 确保字段创建的可控性和可追踪性

3. **智能错误处理**
   - 字段已存在：记录警告，跳过该字段，继续创建下一个
   - 创建失败：记录错误，继续创建下一个字段
   - 所有字段处理完成后，如果有失败的字段则抛出异常

4. **API 频率限制保护**
   - 每个字段创建后延迟 200ms
   - 避免触发 WPS API 的频率限制
   - 最后一个字段创建后不延迟

5. **详细的日志记录**
   - 开始创建时记录总字段数
   - 每个字段创建时显示进度 `[1/18]`
   - 显示字段名称和类型
   - 记录创建结果（成功/已存在/失败）
   - 完成时输出统计摘要

## 使用方法

### 方式 1：在 Controller 中调用

```typescript
import { Controller, Get } from '@stratix/core';
import WriteSheetService from '../services/wirteSheetService.js';

@Controller('/api/wps')
export default class WpsController {
  constructor(private readonly writeSheetService: WriteSheetService) {}

  /**
   * 创建 WPS 多维表字段
   * GET /api/wps/create-fields
   */
  @Get('/create-fields')
  async createFields() {
    try {
      await this.writeSheetService.createWpsFields();
      return {
        success: true,
        message: 'WPS 多维表字段创建成功'
      };
    } catch (error: any) {
      return {
        success: false,
        message: '字段创建失败',
        error: error.message
      };
    }
  }
}
```

### 方式 2：在初始化脚本中调用

```typescript
import { container } from '@stratix/core';
import WriteSheetService from './services/wirteSheetService.js';

async function initializeWpsFields() {
  const writeSheetService = container.resolve<WriteSheetService>('writeSheetService');
  
  try {
    console.log('开始初始化 WPS 多维表字段...');
    await writeSheetService.createWpsFields();
    console.log('✅ WPS 多维表字段初始化完成');
  } catch (error) {
    console.error('❌ WPS 多维表字段初始化失败', error);
    process.exit(1);
  }
}

// 执行初始化
initializeWpsFields();
```

### 方式 3：在 onReady 中自动调用

```typescript
onReady() {
  const process = async () => {
    this.logger.info('WriteSheetService ready');

    try {
      // 首次启动时创建字段
      await this.createWpsFields();
      
      // 然后同步数据
      await this.syncAbsentStudentRelationsToWps();
    } catch (error) {
      this.logger.error('Failed to initialize WPS fields', error);
    }
  };
  process();
}
```

### 方式 4：使用命令行工具

```typescript
// scripts/create-wps-fields.ts
import { bootstrap } from '@stratix/core';
import WriteSheetService from '../src/services/wirteSheetService.js';

async function main() {
  const app = await bootstrap();
  const writeSheetService = app.container.resolve<WriteSheetService>('writeSheetService');
  
  await writeSheetService.createWpsFields();
  
  await app.close();
}

main().catch(console.error);
```

运行命令：
```bash
pnpm tsx scripts/create-wps-fields.ts
```

## 日志输出示例

### 成功创建所有字段

```
[INFO] 开始批量创建 WPS 多维表字段
[INFO] 需要创建 18 个字段（跳过 ID 和 课程统计ID）
[INFO] [1/18] 正在创建字段: 课程ID (类型: Number)
[INFO] [1/18] ✅ 字段 "课程ID" 创建成功
[INFO] [2/18] 正在创建字段: 课程代码 (类型: SingleLineText)
[INFO] [2/18] ✅ 字段 "课程代码" 创建成功
[INFO] [3/18] 正在创建字段: 课程名称 (类型: SingleLineText)
[INFO] [3/18] ✅ 字段 "课程名称" 创建成功
...
[INFO] [18/18] 正在创建字段: 更新时间 (类型: Date)
[INFO] [18/18] ✅ 字段 "更新时间" 创建成功
[INFO] WPS 多维表字段创建完成 { 总字段数: 18, 成功创建: 18, 已存在跳过: 0, 创建失败: 0 }
```

### 部分字段已存在

```
[INFO] 开始批量创建 WPS 多维表字段
[INFO] 需要创建 18 个字段（跳过 ID 和 课程统计ID）
[INFO] [1/18] 正在创建字段: 课程ID (类型: Number)
[WARN] [1/18] ⚠️  字段 "课程ID" 已存在，跳过创建
[INFO] [2/18] 正在创建字段: 课程代码 (类型: SingleLineText)
[WARN] [2/18] ⚠️  字段 "课程代码" 已存在，跳过创建
[INFO] [3/18] 正在创建字段: 课程名称 (类型: SingleLineText)
[INFO] [3/18] ✅ 字段 "课程名称" 创建成功
...
[INFO] WPS 多维表字段创建完成 { 总字段数: 18, 成功创建: 10, 已存在跳过: 8, 创建失败: 0 }
```

### 部分字段创建失败

```
[INFO] 开始批量创建 WPS 多维表字段
[INFO] 需要创建 18 个字段（跳过 ID 和 课程统计ID）
[INFO] [1/18] 正在创建字段: 课程ID (类型: Number)
[INFO] [1/18] ✅ 字段 "课程ID" 创建成功
[INFO] [2/18] 正在创建字段: 课程代码 (类型: SingleLineText)
[ERROR] [2/18] ❌ 字段 "课程代码" 创建失败 Error: Network timeout
[INFO] [3/18] 正在创建字段: 课程名称 (类型: SingleLineText)
[INFO] [3/18] ✅ 字段 "课程名称" 创建成功
...
[INFO] WPS 多维表字段创建完成 { 总字段数: 18, 成功创建: 16, 已存在跳过: 0, 创建失败: 2 }
[ERROR] 部分字段创建失败：成功 16，失败 2，跳过 0
```

## 创建的字段列表

从索引 2 开始创建的 18 个字段：

| 序号 | 字段名称 | 字段类型 | 特殊配置 |
|------|---------|---------|---------|
| 1 | 课程ID | Number | 整数格式 |
| 2 | 课程代码 | SingleLineText | - |
| 3 | 课程名称 | SingleLineText | - |
| 4 | 学生ID | SingleLineText | - |
| 5 | 学生姓名 | SingleLineText | - |
| 6 | 学院名称 | SingleLineText | - |
| 7 | 班级名称 | SingleLineText | - |
| 8 | 专业名称 | SingleLineText | - |
| 9 | 缺勤类型 | SingleSelect | 4个选项（缺勤/旷课/请假/请假待审批） |
| 10 | 统计日期 | Date | - |
| 11 | 学期 | SingleLineText | - |
| 12 | 教学周 | Number | 整数格式 |
| 13 | 星期 | Number | 整数格式（1-7） |
| 14 | 节次 | SingleLineText | - |
| 15 | 时间段 | SingleSelect | 2个选项（上午/下午） |
| 16 | 请假原因 | MultiLineText | - |
| 17 | 创建时间 | Date | - |
| 18 | 更新时间 | Date | - |

## 错误处理

### 错误类型 1：字段已存在

**错误信息**：
```
字段 "课程ID" 已存在
```

**处理方式**：
- 记录警告日志
- 跳过该字段
- 继续创建下一个字段
- 不影响整体流程

### 错误类型 2：网络超时

**错误信息**：
```
Network timeout
```

**处理方式**：
- 记录错误日志
- 继续创建下一个字段
- 最后抛出异常提示有失败的字段

**解决方案**：
- 检查网络连接
- 重新运行创建方法
- 已创建的字段会被自动跳过

### 错误类型 3：API 权限不足

**错误信息**：
```
Permission denied
```

**处理方式**：
- 记录错误日志
- 停止创建流程

**解决方案**：
- 检查 WPS API 访问权限
- 确认 fileId 和 sheetId 正确
- 验证 API Token 有效性

### 错误类型 4：字段类型不支持

**错误信息**：
```
Unsupported field type
```

**处理方式**：
- 记录错误日志
- 继续创建下一个字段

**解决方案**：
- 检查 `ABSENT_STUDENT_RELATION_FIELDS` 配置
- 确认字段类型在 `DBSheetFieldType` 枚举中存在

## 性能优化

### 1. API 调用频率控制

```typescript
// 每个字段创建后延迟 200ms
await this.delay(200);
```

**优点**：
- 避免触发 API 频率限制
- 提高创建成功率
- 减少网络拥塞

**调整建议**：
- 网络稳定：可减少到 100ms
- 网络不稳定：可增加到 500ms

### 2. 批量创建 vs 逐个创建

**当前实现**：逐个创建（每次 1 个字段）

**优点**：
- 更好的错误隔离
- 详细的进度追踪
- 失败后可以重试单个字段

**替代方案**：批量创建（每次 5 个字段）

```typescript
// 分批创建，每批 5 个字段
const batchSize = 5;
for (let i = 0; i < fieldsToCreate.length; i += batchSize) {
  const batch = fieldsToCreate.slice(i, i + batchSize);
  await this.wasV7ApiDbsheet.createFields(this.WPS_FILE_ID, this.WPS_SHEET_ID, {
    fields: batch
  });
}
```

## 最佳实践

### 1. 首次部署时创建字段

```typescript
// 在应用首次部署时运行
async function deployInit() {
  const service = container.resolve<WriteSheetService>('writeSheetService');
  await service.createWpsFields();
}
```

### 2. 使用环境变量控制

```typescript
// 只在开发环境自动创建字段
if (process.env.NODE_ENV === 'development') {
  await writeSheetService.createWpsFields();
}
```

### 3. 添加幂等性检查

```typescript
// 检查字段是否已全部创建
async function needsFieldCreation(): Promise<boolean> {
  const schemas = await wasV7ApiDbsheet.getSchemas(fileId);
  const existingFields = schemas.fields.map(f => f.name);
  const requiredFields = ABSENT_STUDENT_RELATION_FIELDS.map(f => f.name);
  
  return !requiredFields.every(field => existingFields.includes(field));
}

if (await needsFieldCreation()) {
  await writeSheetService.createWpsFields();
}
```

### 4. 记录创建历史

```typescript
// 创建成功后记录到数据库
await db.insert('wps_field_creation_history', {
  file_id: fileId,
  sheet_id: sheetId,
  fields_created: successCount,
  created_at: new Date()
});
```

## 故障排查

### 问题 1：所有字段创建失败

**症状**：所有字段都返回创建失败

**可能原因**：
- WPS API Token 无效
- fileId 或 sheetId 错误
- 网络连接问题

**排查步骤**：
1. 检查日志中的错误信息
2. 验证 WPS API 配置
3. 测试网络连接
4. 手动调用 WPS API 测试

### 问题 2：部分字段创建失败

**症状**：某些字段创建成功，某些失败

**可能原因**：
- 网络不稳定
- API 频率限制
- 特定字段类型不支持

**排查步骤**：
1. 查看失败字段的类型
2. 检查是否有特殊配置
3. 增加延迟时间
4. 重新运行创建方法

### 问题 3：字段已存在但仍然报错

**症状**：日志显示字段已存在，但抛出异常

**可能原因**：
- 错误信息判断逻辑不完整
- WPS API 返回的错误信息格式变化

**解决方案**：
```typescript
// 更新错误判断逻辑
if (
  errorMessage.includes('已存在') ||
  errorMessage.includes('already exists') ||
  errorMessage.includes('duplicate') ||
  errorMessage.includes('exist')  // 添加更多判断条件
) {
  // 跳过
}
```

## 相关文档

- [WPS 多维表字段映射表](./WPS多维表字段映射表.md)
- [WriteSheetService 使用说明](./WriteSheetService使用说明.md)
- [WriteSheetService 配置指南](./WriteSheetService配置指南.md)
- [快速参考](./快速参考.md)

## 总结

`createWpsFields()` 方法提供了一个可靠、可追踪的方式来批量创建 WPS 多维表字段：

✅ **自动化**：从配置文件读取字段定义，无需手动配置
✅ **智能跳过**：自动跳过已创建的字段，支持重复运行
✅ **错误隔离**：单个字段失败不影响其他字段创建
✅ **详细日志**：完整的进度追踪和结果统计
✅ **频率保护**：内置延迟机制避免 API 限制
✅ **幂等性**：可以安全地多次运行

建议在应用首次部署或字段配置更新时使用此方法初始化 WPS 多维表结构。

