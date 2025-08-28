# 工作流管理系统 API 接口文档

基于 Stratix 框架的工作流管理系统完整 REST API 文档。

## 概述

本文档描述了工作流管理系统的所有 HTTP 接口，包括工作流定义管理、实例控制、定时任务、监控统计和执行日志等功能模块。

### 基础信息

- **基础URL**: `/api/workflows`
- **认证方式**: Bearer Token
- **响应格式**: JSON
- **字符编码**: UTF-8

### 统一响应格式

所有接口都遵循统一的响应格式：

```json
{
  "success": boolean,
  "data": any,
  "error": string,
  "errorDetails": any,
  "timestamp": string
}
```

### 分页响应格式

列表接口使用统一的分页响应格式：

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": number,
    "page": number,
    "pageSize": number,
    "totalPages": number,
    "hasNext": boolean,
    "hasPrev": boolean
  },
  "timestamp": string
}
```

## 1. 工作流定义管理

### 1.1 获取工作流定义列表

**接口**: `GET /api/workflows/definitions`

**描述**: 获取工作流定义列表，支持分页和过滤

**查询参数**:
- `page` (number, 可选): 页码，默认1
- `pageSize` (number, 可选): 每页大小，默认20
- `status` (string, 可选): 状态过滤 (draft|active|deprecated|archived)
- `category` (string, 可选): 分类过滤
- `isActive` (boolean, 可选): 是否活跃
- `search` (string, 可选): 搜索关键词

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "user-onboarding",
        "version": "1.0.0",
        "displayName": "用户入职流程",
        "description": "新用户入职自动化流程",
        "status": "active",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 1.2 创建工作流定义

**接口**: `POST /api/workflows/definitions`

**描述**: 创建新的工作流定义

**请求体**:
```json
{
  "name": "user-onboarding",
  "version": "1.0.0",
  "displayName": "用户入职流程",
  "description": "新用户入职自动化流程",
  "definition": {
    "nodes": [
      {
        "nodeId": "create-account",
        "nodeName": "创建账户",
        "type": "simple",
        "executor": "userCreator",
        "maxRetries": 3
      }
    ],
    "connections": []
  },
  "category": "hr",
  "tags": ["onboarding", "automation"],
  "status": "draft",
  "isActive": false,
  "timeoutSeconds": 3600,
  "maxRetries": 3,
  "retryDelaySeconds": 5
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "user-onboarding",
    "version": "1.0.0",
    "displayName": "用户入职流程",
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 1.3 更新工作流定义

**接口**: `PUT /api/workflows/definitions/:id`

**描述**: 更新指定的工作流定义

**路径参数**:
- `id` (number): 工作流定义ID

**请求体**: 与创建接口相同，所有字段都是可选的

### 1.4 删除工作流定义

**接口**: `DELETE /api/workflows/definitions/:id`

**描述**: 删除指定的工作流定义

**路径参数**:
- `id` (number): 工作流定义ID

### 1.5 验证工作流定义

**接口**: `POST /api/workflows/definitions/validate`

**描述**: 验证工作流定义的有效性

**请求体**:
```json
{
  "definition": {
    "nodes": [...],
    "connections": [...]
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "message": "Workflow definition is valid"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 2. 工作流实例控制

### 2.1 启动工作流

**接口**: `POST /api/workflows/instances/start`

**描述**: 启动新的工作流实例

**请求体**:
```json
{
  "workflowDefinitionId": 1,
  "inputData": {
    "userId": 12345,
    "department": "engineering"
  },
  "contextData": {
    "instanceType": "user-onboarding",
    "externalId": "ext-123",
    "createdBy": "admin",
    "priority": "high"
  },
  "businessKey": "user-12345",
  "mutexKey": "user-onboarding-12345",
  "resume": false
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1001,
    "workflowDefinitionId": 1,
    "name": "user-onboarding-now",
    "status": "running",
    "startedAt": "2024-01-01T00:00:00Z",
    "inputData": {...},
    "contextData": {...}
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 2.2 停止工作流实例

**接口**: `POST /api/workflows/instances/:id/stop`

**描述**: 停止运行中的工作流实例

**路径参数**:
- `id` (number): 工作流实例ID

**请求体**:
```json
{
  "reason": "Manual stop by admin",
  "force": false
}
```

### 2.3 获取工作流状态

**接口**: `GET /api/workflows/instances/:id/status`

**描述**: 获取工作流实例的详细状态

**响应示例**:
```json
{
  "success": true,
  "data": {
    "instanceId": 1001,
    "status": "running",
    "currentNodeId": "create-account",
    "startedAt": "2024-01-01T00:00:00Z",
    "retryCount": 0,
    "maxRetries": 3,
    "progress": {
      "totalNodes": 5,
      "completedNodes": 2,
      "failedNodes": 0,
      "percentage": 40
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 3. 定时任务管理

### 3.1 创建定时任务

**接口**: `POST /api/workflows/schedules`

**描述**: 创建新的定时任务

**请求体**:
```json
{
  "name": "daily-sync",
  "executorName": "dataSyncer",
  "workflowDefinitionId": 1,
  "cronExpression": "0 2 * * *",
  "timezone": "Asia/Shanghai",
  "enabled": true,
  "maxInstances": 1,
  "inputData": {
    "source": "external-api",
    "target": "internal-db"
  },
  "contextData": {
    "priority": "normal"
  },
  "businessKey": "daily-sync",
  "createdBy": "admin"
}
```

### 3.2 获取定时任务列表

**接口**: `GET /api/workflows/schedules`

**描述**: 获取定时任务列表

**查询参数**:
- `page` (number, 可选): 页码
- `pageSize` (number, 可选): 每页大小
- `enabled` (boolean, 可选): 是否启用过滤
- `workflowDefinitionId` (number, 可选): 工作流定义ID过滤
- `executorName` (string, 可选): 执行器名称过滤

### 3.3 手动触发定时任务

**接口**: `POST /api/workflows/schedules/:id/trigger`

**描述**: 手动触发指定的定时任务

**请求体**:
```json
{
  "ignoreConcurrency": false,
  "inputData": {
    "customParam": "value"
  },
  "reason": "Manual trigger for testing"
}
```

### 3.4 获取执行历史

**接口**: `GET /api/workflows/schedules/:id/executions`

**描述**: 获取定时任务的执行历史

**查询参数**:
- `page` (number, 可选): 页码
- `pageSize` (number, 可选): 每页大小
- `status` (string, 可选): 状态过滤 (success|failed|timeout|running)
- `startedAfter` (string, 可选): 开始时间范围
- `startedBefore` (string, 可选): 结束时间范围

## 4. 监控统计

### 4.1 获取执行统计

**接口**: `GET /api/workflows/monitoring/stats`

**描述**: 获取工作流执行统计信息

**查询参数**:
- `workflowDefinitionId` (number, 可选): 工作流定义ID过滤
- `startDate` (string, 可选): 开始时间
- `endDate` (string, 可选): 结束时间
- `timeRange` (string, 可选): 时间范围 (hour|day|week|month|year)
- `groupBy` (string, 可选): 分组方式 (status|definition|date|hour)

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalInstances": 1000,
    "runningInstances": 5,
    "completedInstances": 950,
    "failedInstances": 40,
    "interruptedInstances": 5,
    "successRate": 95.0,
    "averageExecutionTime": 120,
    "statusBreakdown": {
      "pending": 0,
      "running": 5,
      "completed": 950,
      "failed": 40,
      "interrupted": 5
    },
    "definitionBreakdown": [
      {
        "definitionId": 1,
        "definitionName": "user-onboarding",
        "count": 500,
        "successRate": 98.0
      }
    ]
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 4.2 获取系统健康状态

**接口**: `GET /api/workflows/monitoring/health`

**描述**: 获取系统整体健康状态

**响应示例**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "components": {
      "database": "healthy",
      "scheduler": "healthy",
      "executor": "healthy"
    },
    "uptime": 86400,
    "lastCheck": "2024-01-01T00:00:00Z",
    "details": {
      "totalWorkflows": 10,
      "activeSchedules": 5,
      "runningInstances": 3,
      "queuedTasks": 0
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 5. 执行日志

### 5.1 获取日志列表

**接口**: `GET /api/workflows/logs`

**描述**: 获取执行日志列表

**查询参数**:
- `page` (number, 可选): 页码
- `pageSize` (number, 可选): 每页大小
- `workflowInstanceId` (number, 可选): 工作流实例ID过滤
- `nodeInstanceId` (number, 可选): 节点实例ID过滤
- `level` (string, 可选): 日志级别过滤 (debug|info|warn|error)
- `startTime` (string, 可选): 开始时间
- `endTime` (string, 可选): 结束时间
- `search` (string, 可选): 搜索关键词

### 5.2 导出日志

**接口**: `GET /api/workflows/logs/export`

**描述**: 导出日志数据

**查询参数**:
- `format` (string, 可选): 导出格式 (json|csv|txt)，默认json
- `workflowInstanceId` (number, 可选): 工作流实例ID过滤
- `level` (string, 可选): 日志级别过滤
- `startTime` (string, 可选): 开始时间
- `endTime` (string, 可选): 结束时间
- `limit` (number, 可选): 导出数量限制，默认1000

## 错误码说明

| HTTP状态码 | 错误类型 | 说明 |
|-----------|---------|------|
| 200 | 成功 | 请求成功 |
| 201 | 创建成功 | 资源创建成功 |
| 400 | 请求错误 | 请求参数错误或缺失 |
| 401 | 未认证 | 缺少或无效的认证信息 |
| 403 | 权限不足 | 没有访问权限 |
| 404 | 资源不存在 | 请求的资源不存在 |
| 409 | 冲突 | 资源已存在或状态冲突 |
| 500 | 服务器错误 | 内部服务器错误 |
| 501 | 未实现 | 功能尚未实现 |

## 使用示例

### 完整工作流创建和执行示例

```bash
# 1. 创建工作流定义
curl -X POST /api/workflows/definitions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "data-processing",
    "version": "1.0.0",
    "displayName": "数据处理流程",
    "definition": {
      "nodes": [
        {
          "nodeId": "validate",
          "nodeName": "数据验证",
          "type": "simple",
          "executor": "dataValidator",
          "maxRetries": 3
        },
        {
          "nodeId": "process",
          "nodeName": "数据处理",
          "type": "simple",
          "executor": "dataProcessor",
          "maxRetries": 2,
          "dependsOn": ["validate"]
        }
      ]
    },
    "status": "active",
    "isActive": true
  }'

# 2. 启动工作流实例
curl -X POST /api/workflows/instances/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "workflowDefinitionId": 1,
    "inputData": {
      "dataSource": "file.csv",
      "outputFormat": "json"
    },
    "contextData": {
      "priority": "high",
      "createdBy": "user123"
    }
  }'

# 3. 查看执行状态
curl -X GET /api/workflows/instances/1001/status \
  -H "Authorization: Bearer <token>"

# 4. 创建定时任务
curl -X POST /api/workflows/schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "daily-data-processing",
    "executorName": "dataProcessor",
    "cronExpression": "0 2 * * *",
    "timezone": "Asia/Shanghai",
    "enabled": true,
    "inputData": {
      "source": "daily-data",
      "target": "processed-data"
    }
  }'
```

## 认证和权限

所有API接口都需要有效的认证令牌。在请求头中包含：

```
Authorization: Bearer <your-access-token>
```

不同的接口可能需要不同的权限级别：
- **读取权限**: 查看工作流定义、实例状态、日志等
- **执行权限**: 启动、停止工作流实例
- **管理权限**: 创建、修改、删除工作流定义和定时任务
- **系统权限**: 访问监控数据、系统健康状态

## 限制和配额

- **请求频率**: 每分钟最多1000次请求
- **分页大小**: 最大100条记录
- **日志导出**: 单次最多导出10000条记录
- **并发实例**: 每个工作流定义最多100个并发实例

## 版本兼容性

当前API版本: `v3.0.0`

API遵循语义化版本控制，向后兼容性保证：
- 主版本号变更：可能包含破坏性变更
- 次版本号变更：新增功能，向后兼容
- 修订版本号变更：错误修复，向后兼容

## 集成指南

### 在Stratix应用中使用

Controller已经按照Stratix框架规范实现，使用 `@Controller` 装饰器标记，会通过框架的自动发现机制自动注册。

```typescript
// 在你的Stratix应用入口文件中
import { withRegisterAutoDI } from '@stratix/core';

export default withRegisterAutoDI(async (fastify, options) => {
  // Controller会通过自动发现机制自动注册
  // 无需手动注册
}, {
  autoDiscovery: {
    enabled: true,
    patterns: ['**/*{Repository,Service,Controller,Executor,Adapter}.{ts,js}']
  }
});
```

**关键要点**：
1. **自动发现**：Controller通过 `@Controller` 装饰器自动注册
2. **路由路径**：Controller中已包含完整的API路径
3. **依赖注入**：通过构造函数注入Service层依赖
4. **统一响应**：所有接口使用统一的响应格式

### 客户端SDK示例

```typescript
// 简单的客户端示例
class WorkflowApiClient {
  constructor(private baseUrl: string, private token: string) {}

  private async request(method: string, path: string, data?: any) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: data ? JSON.stringify(data) : undefined
    });

    return response.json();
  }

  // 工作流定义管理
  async createDefinition(definition: any) {
    return this.request('POST', '/api/workflows/definitions', definition);
  }

  async getDefinitions(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/api/workflows/definitions?${query}`);
  }

  // 工作流实例控制
  async startWorkflow(request: any) {
    return this.request('POST', '/api/workflows/instances/start', request);
  }

  async stopWorkflow(instanceId: number, reason?: string) {
    return this.request('POST', `/api/workflows/instances/${instanceId}/stop`, { reason });
  }

  // 监控统计
  async getStats() {
    return this.request('GET', '/api/workflows/monitoring/stats');
  }

  async getSystemHealth() {
    return this.request('GET', '/api/workflows/monitoring/health');
  }
}

// 使用示例
const client = new WorkflowApiClient('http://localhost:3000', 'your-token');

// 创建并启动工作流
const definition = await client.createDefinition({
  name: 'user-registration',
  version: '1.0.0',
  definition: { /* 工作流定义 */ }
});

const instance = await client.startWorkflow({
  workflowDefinitionId: definition.data.id,
  inputData: { email: 'user@example.com' }
});
```
