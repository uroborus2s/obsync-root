# 源数据同步功能实现文档

## 概述

基于用户需求，实现了一个简单直接的数据同步功能，从外部API获取数据并通过AutoSaveRepository的`createTableWithBatch`方法直接保存到数据库中，无需复杂的数据转换。

## 核心组件

### 1. SourceCourseRepository

**文件位置**: `apps/app-hltnlink/src/repositories/SourceCourseRepository.ts`

**功能**:
- 继承自AutoSaveRepository
- 直接调用`createTableWithBatch`方法保存API原始数据
- 提供批次查询功能

**核心方法**:
```typescript
async syncSourceCoursesFromApi(apiData: any[]): Promise<DatabaseResult<any>>
async findByBatchId(batchId: string): Promise<DatabaseResult<any[]>>
```

### 2. SourceCourseSelectionsRepository

**文件位置**: `apps/app-hltnlink/src/repositories/SourceCourseSelectionsRepository.ts`

**功能**:
- 继承自AutoSaveRepository
- 直接调用`createTableWithBatch`方法保存选课API原始数据
- 提供批次查询功能

**核心方法**:
```typescript
async syncSourceCourseSelectionsFromApi(apiData: any[]): Promise<DatabaseResult<any>>
async findByBatchId(batchId: string): Promise<DatabaseResult<any[]>>
```

### 3. SourceDataSyncService

**文件位置**: `apps/app-hltnlink/src/services/SourceDataSyncService.ts`

**功能**:
- 管理API认证（JWT Token刷新）
- 分页获取API数据
- 调用Repository保存数据
- 提供统计和清理功能
- 支持课程和选课数据的独立或批量同步

**核心方法**:
```typescript
async syncCourseData(): Promise<DatabaseResult<any>>
async syncCourseSelectionsData(): Promise<DatabaseResult<any>>
async syncAllData(): Promise<DatabaseResult<any>>
async testConnection(): Promise<boolean>
```

## API接口集成

### 认证机制

使用JWT Token认证，自动刷新机制：

```typescript
const token = await axiosClient.post('/jwt/token', {
  appid: config.apiAppId,
  secret: config.apiAppSecret,
});
```

### 数据获取

分页获取数据，支持大数据量处理：

```typescript
const params = JSON.stringify({
  id: TYPES[type],
  pageSize,
  pageIndex: pageNum,
});

const resp = await axiosClient.get(
  `/api/agent/data-service/api-use?token=${token}&jsonStr=${encodeURIComponent(params)}`
);
```

## API数据格式

### 课程数据格式

接口返回的课程数据格式：

```json
{
  "JSJC": "4",           // 结束节次
  "KSJC": "3",           // 开始节次
  "JSSJ": "1110",        // 结束时间
  "SKZC": "2-18",        // 上课周次
  "JSGH": "0218",        // 教师工号
  "JXRWID": "8770.0",    // 教学任务ID
  "KCMC": "推拿学基础1",   // 课程名称
  "ROW_ID": 2,           // 行ID
  "KKXQM": "2013-2014-1", // 开课学期码
  "XQJ": "1",            // 星期几
  "SKJSMC": "第4实训室",   // 上课教室名称
  "KCH": "022311065",    // 课程号
  "ZZT": "0111111111111111110000000000000000000000000000000000", // 周状态
  "DJZ": "2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18", // 单节值
  "BZ": "",              // 备注
  "KXH": "022311065.008", // 课序号
  "ID": "100048",        // ID
  "JSXM": "刘孝品",       // 教师姓名
  "KSSJ": "940",         // 开始时间
  "JSH": "1040301"       // 教室号
}
```

### 选课数据格式

接口返回的选课数据格式：

```json
{
  "XKZT": "已选",         // 选课状态
  "XKFSDM": "01",         // 选课方式代码
  "XKID": "1283578",      // 选课ID
  "XDLBDM": "01",         // 修读类别代码
  "KCMC": "形势与政策Ⅳ",   // 课程名称
  "ROW_ID": 2,            // 行ID
  "KKXQM": "2023-2024-2", // 开课学期码
  "KCH": "A16716404",     // 课程号
  "XDLBMC": "初修",       // 修读类别名称
  "XSXM": "胡啸乾",       // 学生姓名
  "XKKH": "A16716404.01", // 选课课号
  "XKFSMC": "指定",       // 选课方式名称
  "XSID": "2022710109",   // 学生ID
  "KXHID": "40025"        // 课序号ID
}
```

## 使用方式

### 基本使用

```typescript
import SourceCourseRepository from './repositories/SourceCourseRepository.js';
import SourceCourseSelectionsRepository from './repositories/SourceCourseSelectionsRepository.js';
import SourceDataSyncService from './services/SourceDataSyncService.js';

// 1. 创建Repository
const coursesRepository = new SourceCourseRepository(logger);
const selectionsRepository = new SourceCourseSelectionsRepository(logger);

// 2. 配置同步服务
const config = {
  url: 'https://your-api-url.com',
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  timeout: 30000,
  pageSize: 1000
};

const syncService = new SourceDataSyncService(config, coursesRepository, selectionsRepository, logger);

// 3. 执行课程数据同步
const courseResult = await syncService.syncCourseData();

// 4. 执行选课数据同步
const selectionsResult = await syncService.syncCourseSelectionsData();

// 5. 或者执行所有数据同步
const allResult = await syncService.syncAllData();

if (allResult.success) {
  console.log('所有数据同步成功:');
  console.log(`课程数据: 批次 ${allResult.data.courseSync.batchId}, ${allResult.data.courseSync.count} 条记录`);
  console.log(`选课数据: 批次 ${allResult.data.selectionsSync.batchId}, ${allResult.data.selectionsSync.count} 条记录`);
} else {
  console.error('同步失败:', allResult.error);
}
```

### 查询数据

```typescript
// 根据批次ID查询课程数据
const courseQueryResult = await coursesRepository.findByBatchId('202409101533');

if (courseQueryResult.success) {
  console.log(`找到 ${courseQueryResult.data.length} 条课程记录`);
  courseQueryResult.data.forEach(record => {
    console.log(`课程: ${record.KCMC}, 教师: ${record.JSXM}`);
  });
}

// 根据批次ID查询选课数据
const selectionsQueryResult = await selectionsRepository.findByBatchId('202409101534');

if (selectionsQueryResult.success) {
  console.log(`找到 ${selectionsQueryResult.data.length} 条选课记录`);
  selectionsQueryResult.data.forEach(record => {
    console.log(`学生: ${record.STUDENT_ID}, 课程: ${record.COURSE_NAME}`);
  });
}
```

## 配置说明

### SourceDataSyncConfig

```typescript
interface SourceDataSyncConfig {
  url: string;               // API基础URL
  appId: string;             // 应用ID
  appSecret: string;         // 应用密钥
  timeout?: number;          // 请求超时时间（毫秒）
  retries?: number;          // 重试次数
  pageSize?: number;         // 分页大小
  maxBatchesToKeep?: number; // 批次保留数量
}
```

## 数据库表结构

AutoSaveRepository会根据API数据自动创建表结构：

**source_courses表**（课程数据）：
- API返回的所有原始字段
- `batch_id`: 批次标识
- `created_at`: 创建时间
- `updated_at`: 更新时间

**source_course_selections表**（选课数据）：
- API返回的所有原始字段
- `batch_id`: 批次标识
- `created_at`: 创建时间
- `updated_at`: 更新时间

## 批次管理

- **批次ID格式**: `YYYYMMDDHHMM`（如：202409101533）
- **自动生成**: 每次同步自动生成新的批次ID
- **数据隔离**: 不同批次的数据完全隔离
- **批次清理**: 支持保留最新N个批次，自动清理旧数据

## 错误处理

### 常见错误类型

1. **API认证失败**: Token获取失败或过期
2. **网络超时**: API请求超时
3. **数据格式错误**: API返回数据格式不符合预期
4. **数据库错误**: 数据保存失败

### 错误处理策略

- 自动重试机制
- 详细错误日志记录
- 优雅降级处理
- 事务回滚保证数据一致性

## 性能特性

- **分页处理**: 支持大数据量分页获取
- **批量保存**: 使用AutoSaveRepository的批量保存功能
- **连接复用**: HTTP连接池和数据库连接池
- **内存优化**: 流式处理，避免内存溢出

## 监控和日志

### 日志级别

- **INFO**: 同步开始/结束、统计信息
- **WARN**: 数据验证警告、重试信息
- **ERROR**: 同步失败、系统错误
- **DEBUG**: 详细的调试信息

### 监控指标

- 同步成功率
- 数据处理量
- 响应时间
- 错误率统计

## 测试验证

### 单元测试

**文件位置**: `apps/app-hltnlink/src/tests/source-data-sync.test.ts`

**测试覆盖**:
- SourceCourseRepository测试（空数据处理、API数据处理、批次查询）
- SourceCourseSelectionsRepository测试（空数据处理、API数据处理、批次查询）
- API数据格式验证
- 批次ID生成
- 配置验证
- 错误处理

### 运行测试

```bash
cd apps/app-hltnlink
pnpm test src/tests/source-data-sync.test.ts --run
```

**测试结果**: 10个测试全部通过 ✅

## 示例代码

**文件位置**: `apps/app-hltnlink/src/examples/source-data-sync-example.ts`

包含完整的使用示例：
- 基本课程数据同步操作
- 选课数据同步操作
- 所有数据批量同步
- 数据查询
- 定时同步
- 错误处理

**可用的示例函数**:
```typescript
// 课程数据同步示例
await runSourceDataSyncExample(logger);

// 选课数据同步示例
await runCourseSelectionsExample(logger);

// 所有数据同步示例
await runAllDataSyncExample(logger);
```

## 扩展性

### 支持新的数据类型

1. 在`TYPES`常量中添加新类型
2. 创建对应的Repository类
3. 扩展SourceDataSyncService

### 自定义数据处理

虽然当前实现直接保存原始数据，但可以通过以下方式扩展：

1. 在Repository中添加数据预处理逻辑
2. 实现自定义的数据验证规则
3. 添加数据清洗和标准化功能

## 总结

本实现提供了一个简单、直接、高效的数据同步解决方案：

✅ **直接保存**: 无需复杂转换，直接保存API原始数据
✅ **自动表创建**: 利用AutoSaveRepository的动态表创建功能
✅ **批次管理**: 完整的批次管理和数据隔离
✅ **多数据类型支持**: 支持课程和选课数据的独立或批量同步
✅ **错误处理**: 完善的错误处理和重试机制
✅ **性能优化**: 分页处理和批量操作
✅ **测试验证**: 完整的单元测试覆盖（10个测试全部通过）
✅ **时间库优化**: 使用date-fns替代dayjs，更轻量化

该方案满足了用户的核心需求：从接口获取数据并调用AutoSaveRepository的方法保存到数据库中，现在支持课程和选课两种数据类型的同步，实现简单高效，易于维护和扩展。
