# 新增执行器说明文档

本文档介绍为新流程定义开发的两个核心执行器：`createOrUpdateCalendar` 和 `addParticipant`。

## 执行器概览

### 1. CreateOrUpdateCalendarExecutor
- **执行器名称**: `createOrUpdateCalendar`
- **功能**: 创建或更新单个课程日历
- **版本**: 1.0.0
- **分类**: icasync

### 2. AddParticipantExecutor
- **执行器名称**: `addParticipant`
- **功能**: 向日历添加单个参与者
- **版本**: 1.0.0
- **分类**: icasync

## CreateOrUpdateCalendarExecutor

### 功能特性
1. **智能检查**: 自动检查指定开课号的日历是否已存在
2. **灵活模式**: 支持创建新日历和更新现有日历两种模式
3. **强制更新**: 支持强制更新模式（删除重建）
4. **增量更新**: 支持增量更新模式（保留现有数据）
5. **详细结果**: 返回详细的操作结果和日历信息
6. **异常处理**: 完善的异常情况处理和错误恢复

### 配置参数

```typescript
interface CreateOrUpdateCalendarConfig {
  /** 开课号 */
  kkh: string;
  /** 日历名称（可选） */
  name?: string;
  /** 学年学期 */
  xnxq: string;
  /** 是否强制更新 */
  forceUpdate?: boolean;
  /** 日历数据 */
  calendarData?: {
    description?: string;
    timeZone?: string;
    metadata?: Record<string, any>;
  };
  /** 同步配置 */
  syncConfig?: {
    batchSize?: number;
    timeout?: number;
    retryCount?: number;
  };
}
```

### 使用示例

#### 基本使用
```json
{
  "id": "create-calendar",
  "name": "创建或更新日历",
  "type": "task",
  "executor": "createOrUpdateCalendar",
  "config": {
    "kkh": "${calendarInfo.kkh}",
    "name": "${calendarInfo.name}",
    "xnxq": "${xnxq}",
    "forceUpdate": false
  }
}
```

#### 强制更新模式
```json
{
  "id": "force-update-calendar",
  "name": "强制更新日历",
  "type": "task",
  "executor": "createOrUpdateCalendar",
  "config": {
    "kkh": "${calendarInfo.kkh}",
    "xnxq": "${xnxq}",
    "forceUpdate": true,
    "calendarData": {
      "description": "强制更新的课程日历",
      "timeZone": "Asia/Shanghai"
    }
  }
}
```

### 返回结果

```typescript
interface CreateOrUpdateCalendarResult {
  success: boolean;
  calendarId?: string;
  calendarName?: string;
  kkh: string;
  xnxq: string;
  operation: 'created' | 'updated' | 'skipped';
  isNewCalendar: boolean;
  error?: string;
  details?: {
    existingCalendarId?: string;
    participantCount?: number;
    scheduleCount?: number;
    metadata?: Record<string, any>;
  };
  duration: number;
}
```

## AddParticipantExecutor

### 功能特性
1. **用户类型支持**: 支持学生和教师两种用户类型
2. **权限管理**: 支持reader/writer/owner权限角色配置
3. **用户映射**: 自动处理用户ID映射（外部ID到WPS内部ID）
4. **重复检查**: 防止重复添加相同参与者
5. **重试机制**: 支持重试机制和错误恢复
6. **详细结果**: 提供详细的操作结果和错误信息

### 配置参数

```typescript
interface AddParticipantConfig {
  /** 日历ID */
  calendarId: string;
  /** 参与者数据 */
  participantData: {
    userCode: string;
    userName: string;
    userType: 'student' | 'teacher';
    email?: string;
    externalUserId?: string;
    metadata?: Record<string, any>;
  };
  /** 权限角色 */
  role?: 'reader' | 'writer' | 'owner';
  /** 权限级别（兼容性字段） */
  permissions?: string;
  /** 是否跳过重复检查 */
  skipDuplicateCheck?: boolean;
  /** 重试配置 */
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}
```

### 使用示例

#### 基本使用
```json
{
  "id": "add-participant",
  "name": "添加参与者",
  "type": "task",
  "executor": "addParticipant",
  "config": {
    "calendarId": "${nodes.create-calendar.output.calendarId}",
    "participantData": "${$item}",
    "role": "reader"
  }
}
```

#### 在循环中使用
```json
{
  "id": "process-participants",
  "name": "批量处理参与者",
  "type": "loop",
  "loopType": "dynamic",
  "sourceExpression": "participants",
  "maxConcurrency": 15,
  "taskTemplate": {
    "id": "add-participant",
    "name": "添加参与者",
    "type": "task",
    "executor": "addParticipant",
    "config": {
      "calendarId": "${nodes.create-calendar.output.calendarId}",
      "participantData": "${$item}",
      "role": "${$item.role || \"reader\"}",
      "permissions": "${$item.permissions || \"read\"}"
    }
  }
}
```

#### 高级配置
```json
{
  "id": "add-teacher",
  "name": "添加教师",
  "type": "task",
  "executor": "addParticipant",
  "config": {
    "calendarId": "${calendarId}",
    "participantData": {
      "userCode": "${teacher.gh}",
      "userName": "${teacher.xm}",
      "userType": "teacher",
      "email": "${teacher.email}",
      "externalUserId": "${teacher.wpsUserId}"
    },
    "role": "writer",
    "skipDuplicateCheck": false,
    "retryConfig": {
      "maxRetries": 3,
      "retryDelay": 1000
    }
  }
}
```

### 返回结果

```typescript
interface AddParticipantResult {
  success: boolean;
  userCode: string;
  userName: string;
  userType: 'student' | 'teacher';
  calendarId: string;
  permissionId?: string;
  role: string;
  operation: 'added' | 'skipped' | 'updated';
  isNewParticipant: boolean;
  error?: string;
  details?: {
    existingPermissionId?: string;
    wpsUserId?: string;
    metadata?: Record<string, any>;
  };
  duration: number;
}
```

## 工作流集成

### 在多循环工作流中的使用

这两个执行器专为新的多循环工作流设计，可以在以下场景中使用：

1. **日历创建阶段**: 使用 `createOrUpdateCalendar` 创建或更新课程日历
2. **参与者添加阶段**: 使用 `addParticipant` 在并行循环中批量添加参与者

### 典型工作流结构

```json
{
  "nodes": [
    {
      "id": "create-calendar",
      "executor": "createOrUpdateCalendar",
      "config": {
        "kkh": "${calendarInfo.kkh}",
        "xnxq": "${xnxq}"
      }
    },
    {
      "id": "process-participants",
      "type": "loop",
      "dependsOn": ["create-calendar"],
      "sourceExpression": "participants",
      "taskTemplate": {
        "executor": "addParticipant",
        "config": {
          "calendarId": "${nodes.create-calendar.output.calendarId}",
          "participantData": "${$item}"
        }
      }
    }
  ]
}
```

## 错误处理

### 常见错误类型

1. **配置验证错误**: 参数格式不正确或缺失必要字段
2. **业务逻辑错误**: 日历不存在、用户不存在等
3. **外部API错误**: WPS API调用失败
4. **数据库错误**: 数据库连接或操作失败

### 错误恢复策略

1. **重试机制**: 对于临时性错误，执行器会自动重试
2. **优雅降级**: 部分失败时继续执行其他操作
3. **详细日志**: 记录详细的错误信息便于调试
4. **状态保持**: 保持操作状态，支持断点续传

## 性能优化

### 并发控制
- `addParticipant` 支持在循环中并发执行
- 建议并发数：参与者添加 ≤ 15，权限设置 ≤ 10

### 批量优化
- 使用循环模板批量处理参与者
- 避免单个任务处理大量数据

### 缓存策略
- 执行器内部缓存用户映射信息
- 减少重复的API调用

## 监控和调试

### 日志级别
- **INFO**: 正常操作流程
- **WARN**: 可恢复的错误或异常情况
- **ERROR**: 严重错误或失败操作

### 性能指标
- 执行时长 (duration)
- 成功率统计
- 重试次数统计

### 健康检查
两个执行器都提供健康检查接口，可用于监控系统状态。

## 测试

### 单元测试
- 配置验证测试
- 业务逻辑测试
- 错误处理测试
- 健康检查测试

### 集成测试
- 与WPS API的集成测试
- 与数据库的集成测试
- 工作流集成测试

运行测试：
```bash
# 运行单元测试
pnpm test packages/icasync/src/executors/__tests__/

# 运行特定执行器测试
pnpm test CreateOrUpdateCalendarExecutor.test.ts
pnpm test AddParticipantExecutor.test.ts
```
