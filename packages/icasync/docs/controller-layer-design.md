# @stratix/icasync 控制器层设计文档

## 概述

控制器层负责 API 路由和请求处理，提供同步操作的 REST API 接口。采用函数式编程模式，所有控制器都注册为 SINGLETON 生命周期。

## 设计原则

### 1. RESTful API 设计
- 遵循 REST 架构风格
- 统一的资源命名规范
- 标准的 HTTP 状态码使用

### 2. 函数式编程
- 控制器方法为纯函数
- 明确的输入输出定义
- 无副作用的请求处理

### 3. 统一响应格式
- 标准化的 API 响应结构
- 一致的错误处理机制
- 完整的请求验证

### 4. 安全性
- 请求参数验证
- 权限控制和认证
- 防止恶意请求

## API 路由设计

### 基础路径
```
/api/icasync
```

## 控制器设计

### 1. 同步控制器 (SyncController)

负责课程数据同步的 API 接口。

```typescript
export interface SyncController {
  // 全量同步
  fullSync(request: FastifyRequest<{ Body: FullSyncRequest }>, reply: FastifyReply): Promise<void>;
  
  // 增量同步
  incrementalSync(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  
  // 获取同步状态
  getSyncStatus(request: FastifyRequest<{ Querystring: SyncStatusQuery }>, reply: FastifyReply): Promise<void>;
  
  // 取消同步
  cancelSync(request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply): Promise<void>;
}
```

#### API 端点

```typescript
// POST /api/icasync/sync/full
// 启动全量同步
{
  "xnxq": "2024-2025-2",
  "options": {
    "forceRefresh": false,
    "batchSize": 100
  }
}

// POST /api/icasync/sync/incremental
// 启动增量同步
{
  "options": {
    "batchSize": 50
  }
}

// GET /api/icasync/sync/status?xnxq=2024-2025-2
// 获取同步状态

// DELETE /api/icasync/sync/{taskId}
// 取消同步任务
```

### 2. 任务控制器 (TaskController)

负责任务管理的 API 接口。

```typescript
export interface TaskController {
  // 获取任务列表
  getTasks(request: FastifyRequest<{ Querystring: TaskQuery }>, reply: FastifyReply): Promise<void>;
  
  // 获取任务详情
  getTask(request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply): Promise<void>;
  
  // 获取任务进度
  getTaskProgress(request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply): Promise<void>;
  
  // 重试失败任务
  retryTask(request: FastifyRequest<{ Params: { taskId: string } }>, reply: FastifyReply): Promise<void>;
}
```

#### API 端点

```typescript
// GET /api/icasync/tasks?status=running&type=full_sync&limit=20
// 获取任务列表

// GET /api/icasync/tasks/{taskId}
// 获取任务详情

// GET /api/icasync/tasks/{taskId}/progress
// 获取任务进度

// POST /api/icasync/tasks/{taskId}/retry
// 重试失败任务
```

### 3. 日历控制器 (CalendarController)

负责日历管理的 API 接口。

```typescript
export interface CalendarController {
  // 获取日历列表
  getCalendars(request: FastifyRequest<{ Querystring: CalendarQuery }>, reply: FastifyReply): Promise<void>;
  
  // 获取日历详情
  getCalendar(request: FastifyRequest<{ Params: { calendarId: string } }>, reply: FastifyReply): Promise<void>;
  
  // 获取日历参与者
  getCalendarParticipants(request: FastifyRequest<{ Params: { calendarId: string } }>, reply: FastifyReply): Promise<void>;
  
  // 手动创建日历
  createCalendar(request: FastifyRequest<{ Body: CreateCalendarRequest }>, reply: FastifyReply): Promise<void>;
  
  // 删除日历
  deleteCalendar(request: FastifyRequest<{ Params: { calendarId: string } }>, reply: FastifyReply): Promise<void>;
}
```

#### API 端点

```typescript
// GET /api/icasync/calendars?xnxq=2024-2025-2&status=completed
// 获取日历列表

// GET /api/icasync/calendars/{calendarId}
// 获取日历详情

// GET /api/icasync/calendars/{calendarId}/participants
// 获取日历参与者

// POST /api/icasync/calendars
// 手动创建日历
{
  "kkh": "202420252003013016705",
  "courseName": "国际税收",
  "xnxq": "2024-2025-2"
}

// DELETE /api/icasync/calendars/{calendarId}
// 删除日历
```

### 4. 日程控制器 (ScheduleController)

负责日程管理的 API 接口。

```typescript
export interface ScheduleController {
  // 获取日程列表
  getSchedules(request: FastifyRequest<{ Querystring: ScheduleQuery }>, reply: FastifyReply): Promise<void>;
  
  // 获取日程详情
  getSchedule(request: FastifyRequest<{ Params: { scheduleId: string } }>, reply: FastifyReply): Promise<void>;
  
  // 手动创建日程
  createSchedule(request: FastifyRequest<{ Body: CreateScheduleRequest }>, reply: FastifyReply): Promise<void>;
  
  // 更新日程
  updateSchedule(request: FastifyRequest<{ Params: { scheduleId: string }; Body: UpdateScheduleRequest }>, reply: FastifyReply): Promise<void>;
  
  // 删除日程
  deleteSchedule(request: FastifyRequest<{ Params: { scheduleId: string } }>, reply: FastifyReply): Promise<void>;
}
```

### 5. 用户控制器 (UserController)

负责用户管理的 API 接口。

```typescript
export interface UserController {
  // 获取用户列表
  getUsers(request: FastifyRequest<{ Querystring: UserQuery }>, reply: FastifyReply): Promise<void>;
  
  // 获取用户详情
  getUser(request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply): Promise<void>;
  
  // 同步用户数据
  syncUsers(request: FastifyRequest<{ Body: SyncUsersRequest }>, reply: FastifyReply): Promise<void>;
  
  // 获取用户同步状态
  getUserSyncStatus(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
```

### 6. 监控控制器 (MonitoringController)

负责监控和报告的 API 接口。

```typescript
export interface MonitoringController {
  // 获取系统健康状态
  getHealthStatus(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  
  // 获取同步统计
  getSyncStatistics(request: FastifyRequest<{ Querystring: StatisticsQuery }>, reply: FastifyReply): Promise<void>;
  
  // 生成同步报告
  generateSyncReport(request: FastifyRequest<{ Body: ReportRequest }>, reply: FastifyReply): Promise<void>;
  
  // 获取性能指标
  getPerformanceMetrics(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
```

## 统一响应格式

### 1. 成功响应
```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId: string;
}
```

### 2. 错误响应
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}
```

### 3. 分页响应
```typescript
interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
  requestId: string;
}
```

## 请求验证

### 1. 参数验证模式
```typescript
// 使用 JSON Schema 进行参数验证
const fullSyncSchema = {
  type: 'object',
  required: ['xnxq'],
  properties: {
    xnxq: {
      type: 'string',
      pattern: '^\\d{4}-\\d{4}-[12]$'
    },
    options: {
      type: 'object',
      properties: {
        forceRefresh: { type: 'boolean' },
        batchSize: { type: 'integer', minimum: 1, maximum: 1000 }
      }
    }
  }
};
```

### 2. 中间件集成
```typescript
// 验证中间件
const validateRequest = (schema: JSONSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const validation = ajv.validate(schema, request.body);
    if (!validation) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: ajv.errors
        }
      });
    }
  };
};
```

## 错误处理

### 1. 全局错误处理器
```typescript
const errorHandler = async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: error.name || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error'
    },
    timestamp: new Date().toISOString(),
    requestId: request.id
  };
  
  // 记录错误日志
  request.log.error(error);
  
  // 返回适当的状态码
  const statusCode = getStatusCodeFromError(error);
  reply.status(statusCode).send(errorResponse);
};
```

### 2. 业务错误映射
```typescript
const getStatusCodeFromError = (error: Error): number => {
  switch (error.constructor.name) {
    case 'ValidationError':
      return 400;
    case 'NotFoundError':
      return 404;
    case 'ConflictError':
      return 409;
    case 'RateLimitError':
      return 429;
    default:
      return 500;
  }
};
```

## 依赖注入配置

```typescript
// 控制器注册配置
export const controllerConfig = {
  // API 控制器 (SINGLETON)
  syncController: asClass(SyncController).singleton(),
  taskController: asClass(TaskController).singleton(),
  calendarController: asClass(CalendarController).singleton(),
  scheduleController: asClass(ScheduleController).singleton(),
  userController: asClass(UserController).singleton(),
  monitoringController: asClass(MonitoringController).singleton(),
};
```
