# @stratix/icasync

Stratix 课表同步插件 - 将数据库课程数据同步到 WPS 日历系统

## 功能特性

- 🔄 **全量同步**: 支持完整的课表数据同步到WPS日历
- 📅 **增量同步**: 智能检测变更，只同步修改的数据
- 👥 **参与者管理**: 自动管理课程的学生和教师参与者
- 📋 **任务工作流**: 基于@stratix/tasks的复杂任务编排
- 🔧 **错误处理**: 完善的重试机制和错误恢复
- 📊 **监控日志**: 详细的操作日志和性能监控

## 核心业务流程

### 1. 任务聚合阶段
**全量同步策略**：每个学期全量同步前，先清空`juhe_renwu`表的所有数据，然后从`u_jw_kcb_cur`表重新聚合数据。

**聚合规则**：
- **时段分组**: 上午时段（节次 < 5）标记为'am'，下午时段（节次 > 4）标记为'pm'
- **分组键**: 按开课号(kkh)、学年学期(xnxq)、教学周(jxz)、周次(zc)、日期(rq)、课程名称(kcmc)、是否多课堂(sfdk)进行分组
- **字段聚合**: 节次、教室、教师工号、教师姓名等按分组聚合
- **数据清洗**: 过滤无效和重复数据

### 2. 日历创建任务
**全量同步策略**：每个学期全量同步前，先删除该学期的所有现有日历，然后重新创建，确保数据一致性。

对每个需要创建的日历执行以下子任务：
- **清理阶段**: 删除学期内所有现有日历和相关数据
- **日历创建**: 重新创建所有课程日历
- **日历参与者任务**: 获取所有参与者，批量创建参与者权限
- **日历日程任务**: 根据课程号获取所有课程，批量创建日程

### 3. 日历删除任务
- 调用 WAS V7 API 删除日历
- 软删除相关数据库记录

### 4. 日历更新任务
- **新增参与者**: 批量添加新参与者
- **删除参与者**: 单个删除不再需要的参与者

## 安装和配置

### 1. 安装依赖

```bash
pnpm install @stratix/icasync
```

### 2. 在 Stratix 应用中注册插件

```typescript
import { createStratixApp } from '@stratix/core';
import icasyncPlugin from '@stratix/icasync';

const app = createStratixApp();

// 注册 icasync 插件
await app.register(icasyncPlugin, {
  prefix: '/api/icasync',
  enableValidation: true,
  enableLogging: true,
  debug: process.env.NODE_ENV === 'development'
});
```

### 3. 配置依赖注入

插件需要以下全局依赖：

```typescript
// 在应用启动时配置依赖注入
container.register({
  // WAS V7 适配器
  wasV7Calendar: asClass(WpsCalendarAdapter).singleton(),
  wasV7Schedule: asClass(WpsScheduleAdapter).singleton(),
  
  // 任务工作流
  tasksWorkflow: asClass(TasksWorkflowAdapter).singleton(),
  
  // 数据库连接
  databaseManager: asClass(DatabaseManager).singleton()
});
```

## API 接口

### 全量同步

```http
POST /api/icasync/sync/full
Content-Type: application/json

{
  "xnxq": "2024-2025-1",
  "config": {
    "batchSize": 10,
    "timeout": 1800000,
    "parallel": false
  }
}
```

### 增量同步

```http
POST /api/icasync/sync/incremental
Content-Type: application/json

{
  "xnxq": "2024-2025-1",
  "config": {
    "batchSize": 20,
    "timeout": 900000,
    "parallel": true
  }
}
```

### 查询同步状态

```http
GET /api/icasync/sync/status/{workflowId}
```

### 取消同步任务

```http
DELETE /api/icasync/sync/{workflowId}
```

## 服务接口

### CalendarSyncService

日历同步核心服务：

```typescript
import type { ICalendarSyncService } from '@stratix/icasync';

// 删除学期内所有日历（全量同步前的清理）
const deleteAllResult = await calendarSyncService.deleteAllCalendarsForSemester(
  '2024-2025-1'
);

// 创建课程日历（会自动先删除现有日历）
const result = await calendarSyncService.createCourseCalendar(
  'COURSE001',
  '2024-2025-1'
);

// 批量创建日历（会自动先删除学期内所有现有日历）
const batchResult = await calendarSyncService.createCourseCalendarsBatch(
  ['COURSE001', 'COURSE002'],
  '2024-2025-1'
);

// 添加参与者
const participantResult = await calendarSyncService.addCalendarParticipants(
  'calendar-123',
  'COURSE001'
);
```

### SyncWorkflowService

工作流管理服务：

```typescript
import type { ISyncWorkflowService } from '@stratix/icasync';

// 执行全量同步工作流
const workflowResult = await syncWorkflowService.executeFullSyncWorkflow({
  xnxq: '2024-2025-1',
  syncType: 'full',
  batchSize: 10,
  parallel: false
});

// 监控工作流状态
const status = await syncWorkflowService.getWorkflowStatus(workflowResult.workflowId);
```

## 数据库表结构

### 主要数据表

- `u_jw_kcb_cur`: 当前学期课表数据
- `juhe_renwu`: 聚合任务表
- `icasync_calendar_mapping`: 日历映射表
- `icasync_calendar_participants`: 日历参与者表

详细表结构请参考 `docs/xuqiu.md`

## 配置选项

### 插件配置

```typescript
interface IcasyncPluginOptions {
  /** 数据库连接名称 */
  connectionName?: string;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** API路由前缀 */
  prefix?: string;
  /** 是否启用请求验证 */
  enableValidation?: boolean;
  /** 是否启用请求日志 */
  enableLogging?: boolean;
}
```

### 同步配置

```typescript
interface SyncWorkflowConfig {
  /** 学年学期 */
  xnxq: string;
  /** 同步类型 */
  syncType: 'full' | 'incremental';
  /** 批处理大小 */
  batchSize?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
  /** 重试次数 */
  retryCount?: number;
  /** 是否并行执行 */
  parallel?: boolean;
}
```

## 错误处理

插件提供完善的错误处理机制：

- **重试机制**: 自动重试失败的API调用
- **错误恢复**: 支持从中断点继续执行
- **详细日志**: 记录所有操作的详细信息
- **状态监控**: 实时监控同步进度和状态

## 性能优化

- **批量操作**: 支持批量创建日历和参与者
- **并发控制**: 可配置的并发执行数量
- **内存管理**: 分批处理大量数据，避免内存溢出
- **API限流**: 自动处理WPS API的限流机制

## 开发和测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test CalendarSyncService.test.ts

# 监听模式
pnpm test:watch
```

### 构建

```bash
# 构建插件
pnpm build

# 开发模式（监听文件变化）
pnpm dev
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个插件。

## 更新日志

### v1.0.0
- 初始版本发布
- 支持全量和增量同步
- 完整的WAS V7 API集成
- 基于@stratix/tasks的工作流管理
