# @stratix/tasks API 设计文档

## 📋 概述

本文档描述了 @stratix/tasks 工作流引擎的完整 API 设计，包括 REST API、GraphQL API 和 SDK 接口。

## 🌐 REST API 设计

### 1. API 基础信息

**Base URL:** `/api/workflows`  
**版本:** `v1`  
**认证:** Bearer Token  
**内容类型:** `application/json`

### 2. 工作流定义管理

#### 2.1 创建工作流定义

```http
POST /api/workflows/definitions
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "data-processing",
  "version": "1.0.0",
  "description": "数据处理工作流",
  "definition": {
    "tasks": [
      {
        "id": "validate",
        "name": "数据验证",
        "type": "executor",
        "executor": "data-validator",
        "parameters": {
          "schema": "user-data-schema"
        }
      },
      {
        "id": "transform",
        "name": "数据转换",
        "type": "executor",
        "executor": "data-transformer",
        "dependencies": ["validate"]
      }
    ]
  },
  "tags": ["data", "etl"],
  "category": "data-processing"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "wf-def-001",
    "name": "data-processing",
    "version": "1.0.0",
    "status": "active",
    "createdAt": "2025-08-02T10:00:00Z"
  }
}
```

#### 2.2 获取工作流定义列表

```http
GET /api/workflows/definitions?page=1&limit=20&category=data-processing&status=active
```

**查询参数:**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20, 最大: 100)
- `category`: 分类过滤
- `status`: 状态过滤 (active, inactive)
- `search`: 名称搜索

**响应:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "wf-def-001",
        "name": "data-processing",
        "version": "1.0.0",
        "description": "数据处理工作流",
        "category": "data-processing",
        "status": "active",
        "createdAt": "2025-08-02T10:00:00Z",
        "updatedAt": "2025-08-02T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### 2.3 获取工作流定义详情

```http
GET /api/workflows/definitions/{definitionId}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "wf-def-001",
    "name": "data-processing",
    "version": "1.0.0",
    "description": "数据处理工作流",
    "definition": {
      "tasks": [...],
      "triggers": [...],
      "variables": {...}
    },
    "tags": ["data", "etl"],
    "category": "data-processing",
    "status": "active",
    "createdBy": "user-001",
    "createdAt": "2025-08-02T10:00:00Z",
    "updatedAt": "2025-08-02T10:00:00Z"
  }
}
```

#### 2.4 更新工作流定义

```http
PUT /api/workflows/definitions/{definitionId}
Content-Type: application/json

{
  "description": "更新后的描述",
  "definition": {
    "tasks": [...],
    "variables": {...}
  },
  "tags": ["data", "etl", "updated"]
}
```

#### 2.5 删除工作流定义

```http
DELETE /api/workflows/definitions/{definitionId}
```

### 3. 工作流实例管理

#### 3.1 启动工作流实例

```http
POST /api/workflows/instances
Content-Type: application/json

{
  "definitionId": "wf-def-001",
  "name": "数据处理任务-20250802",
  "input": {
    "sourceFile": "/data/input.csv",
    "targetTable": "processed_data"
  },
  "variables": {
    "batchSize": 1000,
    "timeout": 3600
  },
  "priority": 5,
  "scheduledAt": "2025-08-02T14:00:00Z",
  "correlationId": "batch-001"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "wf-inst-001",
    "definitionId": "wf-def-001",
    "status": "pending",
    "priority": 5,
    "scheduledAt": "2025-08-02T14:00:00Z",
    "createdAt": "2025-08-02T12:00:00Z"
  }
}
```

#### 3.2 获取工作流实例列表

```http
GET /api/workflows/instances?status=running&definitionId=wf-def-001&page=1&limit=20
```

**查询参数:**
- `status`: 状态过滤 (pending, running, completed, failed, cancelled)
- `definitionId`: 定义ID过滤
- `correlationId`: 关联ID过滤
- `startDate`: 开始时间过滤
- `endDate`: 结束时间过滤

#### 3.3 获取工作流实例详情

```http
GET /api/workflows/instances/{instanceId}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "wf-inst-001",
    "definitionId": "wf-def-001",
    "definitionName": "data-processing",
    "status": "running",
    "progress": {
      "totalTasks": 3,
      "completedTasks": 1,
      "failedTasks": 0,
      "percentage": 33.33
    },
    "input": {...},
    "output": {...},
    "variables": {...},
    "startedAt": "2025-08-02T14:00:00Z",
    "estimatedCompletionAt": "2025-08-02T14:30:00Z",
    "createdAt": "2025-08-02T12:00:00Z",
    "updatedAt": "2025-08-02T14:05:00Z"
  }
}
```

#### 3.4 工作流实例操作

**暂停工作流:**
```http
POST /api/workflows/instances/{instanceId}/pause
```

**恢复工作流:**
```http
POST /api/workflows/instances/{instanceId}/resume
```

**取消工作流:**
```http
POST /api/workflows/instances/{instanceId}/cancel
```

**重试工作流:**
```http
POST /api/workflows/instances/{instanceId}/retry
Content-Type: application/json

{
  "retryFailedTasks": true,
  "resetVariables": false
}
```

### 4. 任务实例管理

#### 4.1 获取任务实例列表

```http
GET /api/workflows/instances/{instanceId}/tasks
```

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "id": "task-inst-001",
      "workflowInstanceId": "wf-inst-001",
      "taskDefinitionId": "validate",
      "name": "数据验证",
      "type": "executor",
      "status": "completed",
      "executorName": "data-validator",
      "startedAt": "2025-08-02T14:00:00Z",
      "completedAt": "2025-08-02T14:02:00Z",
      "duration": 120000,
      "retryCount": 0
    }
  ]
}
```

#### 4.2 获取任务实例详情

```http
GET /api/workflows/tasks/{taskInstanceId}
```

#### 4.3 重试任务

```http
POST /api/workflows/tasks/{taskInstanceId}/retry
```

### 5. 执行历史和监控

#### 5.1 获取执行历史

```http
GET /api/workflows/instances/{instanceId}/history?eventType=task_completed&page=1&limit=50
```

**响应:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1001,
        "eventType": "task_completed",
        "taskInstanceId": "task-inst-001",
        "message": "数据验证任务完成",
        "duration": 120000,
        "eventData": {
          "recordsProcessed": 1000,
          "validRecords": 950,
          "invalidRecords": 50
        },
        "createdAt": "2025-08-02T14:02:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### 5.2 获取实时状态

```http
GET /api/workflows/instances/{instanceId}/status
```

**响应:**
```json
{
  "success": true,
  "data": {
    "status": "running",
    "currentTask": {
      "id": "task-inst-002",
      "name": "数据转换",
      "status": "running",
      "progress": 45.5,
      "estimatedCompletion": "2025-08-02T14:15:00Z"
    },
    "metrics": {
      "executionTime": 300000,
      "memoryUsage": 512.5,
      "cpuUsage": 25.3
    }
  }
}
```

### 6. 调度管理

#### 6.1 创建调度

```http
POST /api/workflows/schedules
Content-Type: application/json

{
  "definitionId": "wf-def-001",
  "name": "每日数据处理",
  "triggerType": "cron",
  "triggerConfig": {
    "cron": "0 2 * * *",
    "timezone": "Asia/Shanghai"
  },
  "input": {
    "sourceFile": "/data/daily/*.csv"
  },
  "isActive": true
}
```

#### 6.2 获取调度列表

```http
GET /api/workflows/schedules?definitionId=wf-def-001&isActive=true
```

#### 6.3 更新调度

```http
PUT /api/workflows/schedules/{scheduleId}
```

#### 6.4 删除调度

```http
DELETE /api/workflows/schedules/{scheduleId}
```

### 7. 性能指标

#### 7.1 获取工作流性能统计

```http
GET /api/workflows/metrics/performance?definitionId=wf-def-001&period=7d
```

**响应:**
```json
{
  "success": true,
  "data": {
    "definitionId": "wf-def-001",
    "period": "7d",
    "statistics": {
      "totalExecutions": 42,
      "successfulExecutions": 38,
      "failedExecutions": 4,
      "successRate": 90.48,
      "averageDuration": 1800000,
      "medianDuration": 1650000,
      "p95Duration": 2400000
    },
    "trends": [
      {
        "date": "2025-08-01",
        "executions": 6,
        "successRate": 100,
        "averageDuration": 1750000
      }
    ]
  }
}
```

#### 7.2 获取系统指标

```http
GET /api/workflows/metrics/system
```

### 8. 错误处理

#### 8.1 标准错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "工作流定义未找到",
    "details": {
      "definitionId": "wf-def-999"
    },
    "timestamp": "2025-08-02T14:00:00Z",
    "requestId": "req-001"
  }
}
```

#### 8.2 常见错误码

| 错误码 | HTTP状态码 | 描述 |
|--------|------------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `UNAUTHORIZED` | 401 | 未授权访问 |
| `FORBIDDEN` | 403 | 权限不足 |
| `WORKFLOW_NOT_FOUND` | 404 | 工作流未找到 |
| `WORKFLOW_ALREADY_EXISTS` | 409 | 工作流已存在 |
| `WORKFLOW_EXECUTION_ERROR` | 422 | 工作流执行错误 |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 |

## 🔌 SDK 接口设计

### 1. TypeScript SDK

```typescript
import { WorkflowClient } from '@stratix/tasks/client';

// 创建客户端
const client = new WorkflowClient({
  baseUrl: 'http://localhost:3000/api/workflows',
  apiKey: 'your-api-key'
});

// 启动工作流
const instance = await client.startWorkflow({
  definitionId: 'wf-def-001',
  input: { sourceFile: '/data/input.csv' }
});

// 监听状态变化
client.onStatusChange(instance.id, (status) => {
  console.log('工作流状态变化:', status);
});

// 等待完成
const result = await client.waitForCompletion(instance.id);
```

### 2. 事件订阅

```typescript
// WebSocket 事件订阅
const subscription = client.subscribe({
  instanceId: 'wf-inst-001',
  events: ['status_change', 'task_completed', 'workflow_completed']
});

subscription.on('status_change', (event) => {
  console.log('状态变化:', event);
});

subscription.on('task_completed', (event) => {
  console.log('任务完成:', event);
});
```
