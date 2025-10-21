# 数据同步功能使用指南

基于 @stratix/database 插件库的 AutoSaveRepository 模块实现的课程和选课数据同步功能。

## 功能概述

本数据同步功能提供以下核心能力：

1. **自动表创建**: 基于数据结构动态创建数据库表
2. **批次管理**: 为每次数据导入生成唯一批次号，支持批次清理
3. **数据转换**: 将API返回的JSON格式转换为数据库存储格式
4. **错误处理**: 完整的数据验证和错误处理机制
5. **性能优化**: 支持批量操作和事务处理

## 架构设计

### 分层架构

```
Controller Layer (HTTP接口)
    ↓
Service Layer (业务逻辑)
    ↓
Repository Layer (数据访问)
    ↓
AutoSaveRepository (自动保存基类)
    ↓
Database Layer (数据库操作)
```

### 核心组件

- **CourseRepository**: 课程数据仓储，继承自AutoSaveRepository
- **CourseSelectionsRepository**: 选课数据仓储，继承自AutoSaveRepository
- **DataSyncService**: 数据同步服务，协调API数据获取和存储
- **CourseDataTransformer**: 数据转换工具，处理API到数据库的格式转换

## 快速开始

### 1. 依赖注入配置

在Stratix应用的插件入口文件中配置依赖注入：

```typescript
import { withRegisterAutoDI } from '@stratix/core';
import { CourseRepository } from './repositories/CourseRepository.js';
import { CourseSelectionsRepository } from './repositories/CourseSelectionsRepository.js';
import { DataSyncService } from './services/DataSyncService.js';

export default withRegisterAutoDI(async function hltnlinkPlugin(fastify) {
  // 注册Repository
  fastify.register(async function repositoriesPlugin(fastify) {
    fastify.decorate('courseRepository', new CourseRepository(fastify.log));
    fastify.decorate('courseSelectionsRepository', new CourseSelectionsRepository(fastify.log));
  });

  // 注册Service
  fastify.register(async function servicesPlugin(fastify) {
    fastify.decorate('dataSyncService', new DataSyncService(
      fastify.log,
      fastify.courseRepository,
      fastify.courseSelectionsRepository
    ));
  });
}, {
  autoDiscovery: {
    enabled: true,
    scanModes: ['repositories', 'services', 'controllers']
  }
});
```

### 2. 基本使用示例

```typescript
import type { Logger } from '@stratix/core';
import { DataSyncService } from './services/DataSyncService.js';
import type { DataSyncConfig } from './types/course-sync.js';

// 在Controller或其他业务逻辑中使用
export class DataSyncController {
  constructor(
    private readonly logger: Logger,
    private readonly dataSyncService: DataSyncService
  ) {}

  async syncCourses() {
    const config: DataSyncConfig = {
      timeout: 30000,
      retries: 3,
      token: 'your-api-token'
    };

    const result = await this.dataSyncService.syncCoursesFromApi(
      'https://api.example.com/courses',
      config
    );

    if (result.success) {
      this.logger.info(`同步成功: 批次=${result.batchId}, 记录数=${result.count}`);
      return result;
    } else {
      this.logger.error(`同步失败: ${result.error}`);
      throw new Error(result.error);
    }
  }
}
```

## API数据格式

### 课程数据格式 (ApiCourseData)

```typescript
{
  course_id: string;           // 课程ID
  course_name: string;         // 课程名称
  course_code: string;         // 课程代码
  credits: number;             // 学分
  semester: string;            // 学期
  academic_year: string;       // 学年
  instructor: string;          // 授课教师
  instructor_id: string;       // 教师ID
  course_type: string;         // 课程类型
  department: string;          // 开课院系
  schedule_time?: string;      // 上课时间
  classroom?: string;          // 教室
  status: 'active' | 'inactive' | 'cancelled';
  max_students?: number;       // 最大学生数
  current_students?: number;   // 当前学生数
  description?: string;        // 课程描述
}
```

### 选课数据格式 (ApiCourseSelectionData)

```typescript
{
  selection_id: string;        // 选课ID
  course_id: string;           // 课程ID
  student_id: string;          // 学生ID
  student_name: string;        // 学生姓名
  student_class: string;       // 学生班级
  student_major: string;       // 学生专业
  student_department: string;  // 学生院系
  selection_time: string;      // 选课时间
  status: 'selected' | 'confirmed' | 'dropped' | 'cancelled';
  grade?: number;              // 成绩
  grade_level?: string;        // 成绩等级
  is_passed?: boolean;         // 是否通过
  remarks?: string;            // 备注
}
```

## 批次管理

### 批次ID格式

批次ID采用时间戳格式：`YYYYMMDDHHMM`

例如：`202409101533` 表示 2024年9月10日15:33

### 批次清理策略

默认保留最新的3个批次，自动删除更早的批次数据：

```typescript
// 清理旧批次，保留最新5个批次
const cleanupResult = await dataSyncService.cleanupOldBatches(5);

console.log('清理结果:', {
  coursesCleanup: cleanupResult.coursesCleanup,
  selectionsCleanup: cleanupResult.selectionsCleanup
});
```

## 数据验证

### 自动验证规则

- **课程数据验证**:
  - course_id: 必填，非空字符串
  - course_name: 必填，非空字符串
  - credits: 必填，正整数
  - status: 必须为有效状态值

- **选课数据验证**:
  - selection_id: 必填，非空字符串
  - course_id: 必填，非空字符串
  - student_id: 必填，非空字符串
  - grade: 可选，0-100之间的数值

### 手动验证

```typescript
// 验证单条数据
const isValid = await courseRepository.validateCourseData(courseData);

// 批量验证
const validationResult = await courseRepository.validateCoursesData(coursesData);
if (!validationResult.data.valid) {
  console.log('验证错误:', validationResult.data.errors);
}
```

## 性能优化

### 批量处理

数据同步支持批量处理，默认批次大小为1000条记录：

```typescript
const config: DataSyncConfig = {
  batchSize: 2000,  // 自定义批次大小
  timeout: 60000,   // 增加超时时间
  retries: 5        // 增加重试次数
};
```

### 事务处理

所有数据库操作都在事务中执行，确保数据一致性：

```typescript
// AutoSaveRepository自动处理事务
const result = await courseRepository.createTableWithBatch(coursesData);
// 如果任何步骤失败，整个事务会回滚
```

## 错误处理

### 常见错误类型

1. **API连接错误**: 网络超时、认证失败
2. **数据格式错误**: JSON解析失败、字段缺失
3. **数据验证错误**: 数据不符合验证规则
4. **数据库错误**: 表创建失败、插入失败

### 错误处理示例

```typescript
try {
  const result = await dataSyncService.syncCoursesFromApi(apiUrl, config);
  
  if (!result.success) {
    // 处理业务逻辑错误
    logger.error('同步失败:', result.error);
    
    // 根据错误类型进行不同处理
    if (result.error?.includes('timeout')) {
      // 处理超时错误
    } else if (result.error?.includes('validation')) {
      // 处理验证错误
    }
  }
} catch (error) {
  // 处理系统级错误
  logger.error('系统错误:', error);
}
```

## 监控和统计

### 同步统计信息

```typescript
const stats = await dataSyncService.getSyncStatistics();
console.log('同步统计:', {
  totalSyncs: stats.totalSyncs,
  successCount: stats.successCount,
  failureCount: stats.failureCount,
  averageDuration: stats.averageDuration
});
```

### 数据统计查询

```typescript
// 课程统计
const courseStats = await courseRepository.getCourseStatistics();

// 选课统计
const selectionStats = await courseSelectionsRepository.getSelectionStatistics();

// 特定课程的选课统计
const courseSelectionStats = await courseSelectionsRepository
  .getCourseSelectionStats('CS101');
```

## 测试

运行单元测试：

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test course-data-transformer.test.ts

# 运行测试并生成覆盖率报告
pnpm test --coverage
```

## 最佳实践

1. **定期清理**: 设置定时任务定期清理旧批次数据
2. **监控日志**: 关注同步过程中的错误和警告日志
3. **数据备份**: 在大批量同步前备份重要数据
4. **性能调优**: 根据数据量调整批次大小和超时时间
5. **错误重试**: 配置合适的重试策略处理临时性错误

## 故障排除

### 常见问题

1. **表创建失败**: 检查数据库权限和连接配置
2. **数据验证失败**: 检查API返回的数据格式是否符合预期
3. **批次清理失败**: 检查是否有外键约束阻止删除
4. **性能问题**: 考虑调整批次大小或增加数据库连接池

### 调试技巧

1. 启用详细日志记录
2. 使用小批量数据进行测试
3. 检查数据库表结构是否正确创建
4. 验证API返回的数据格式
