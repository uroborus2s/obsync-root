# @stratix/tasks-api

@stratix/tasks-api 是一个为 Stratix 框架设计的任务管理 REST API 插件，提供完整的任务CRUD操作、任务控制、统计信息和执行器管理功能。

## 安装

```bash
pnpm add @stratix/tasks-api
```

## 配置

```typescript
import { tasksApiPlugin } from '@stratix/tasks-api';

// 在 Stratix 应用中注册插件
app.register(tasksApiPlugin, {
  prefix: '/api/tasks',  // API路径前缀
  healthCheck: true,     // 启用健康检查端点
  taskManagement: true,  // 启用任务管理功能
  taskControl: true,     // 启用任务控制功能
  statistics: true       // 启用统计功能
});
```

## API 接口文档

所有接口默认使用 `/api/tasks` 作为基础路径。

### 任务管理接口

#### 1. 创建任务

**POST** `/`

创建新的任务。

**请求体：**
```json
{
  "parentId": "parent-task-id",  // 可选，父任务ID
  "name": "任务名称",             // 必需，任务名称
  "description": "任务描述",      // 可选，任务描述
  "type": "directory|leaf",      // 必需，任务类型
  "executorConfig": {            // 可选，执行器配置（叶子任务必需）
    "name": "executor-name",
    "params": {},
    "timeout": 30000,
    "retries": 3,
    "retryDelay": 1000
  },
  "metadata": {                  // 可选，任务元数据
    "tags": ["tag1", "tag2"],
    "priority": 1,
    "createdBy": "user-id"
  }
}
```

**响应：** `201 Created`
```json
{
  "id": "task-id",
  "parentId": "parent-task-id",
  "name": "任务名称",
  "description": "任务描述",
  "type": "directory",
  "status": "pending",
  "progress": 0,
  "executorConfig": {...},
  "metadata": {...},
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### 2. 获取单个任务

**GET** `/:id`

根据ID获取任务详情。

**响应：** `200 OK`
```json
{
  "id": "task-id",
  "name": "任务名称",
  "status": "running",
  "progress": 50,
  ...
}
```

#### 3. 更新任务

**PUT** `/:id`

更新任务信息。

**请求体：**
```json
{
  "name": "新的任务名称",
  "description": "新的描述",
  "executorConfig": {...},
  "metadata": {...}
}
```

**响应：** `200 OK` - 返回更新后的任务信息

#### 4. 删除任务

**DELETE** `/:id`

删除指定任务。

**查询参数：**
- `cascade=true`: 级联删除所有子任务
- `force=true`: 强制删除（即使任务正在运行）

**响应：** `204 No Content`

#### 5. 查询任务列表

**GET** `/`

根据条件查询任务列表。

**查询参数：**
- `parentId`: 父任务ID
- `status`: 任务状态，可以是单个值或数组
- `type`: 任务类型 (directory|leaf)
- `tags`: 标签数组
- `offset`: 分页偏移
- `limit`: 分页大小（最大100）
- `orderBy`: 排序字段
- `orderDirection`: 排序方向 (ASC|DESC)

**示例：**
```
GET /api/tasks?parentId=root-id&status=running&status=pending&limit=20
```

**响应：** `200 OK`
```json
[
  {
    "id": "task-1",
    "name": "任务1",
    ...
  },
  {
    "id": "task-2", 
    "name": "任务2",
    ...
  }
]
```

#### 6. 获取任务树

**GET** `/tree`

获取任务的树形结构。

**查询参数：**
- `rootId`: 可选，指定根任务ID，若不提供则返回所有根任务

**响应：** `200 OK`
```json
[
  {
    "id": "root-task",
    "name": "根任务",
    "children": [
      {
        "id": "child-task",
        "name": "子任务",
        "depth": 1,
        "path": ["root-task"],
        "children": []
      }
    ],
    "depth": 0,
    "path": []
  }
]
```

### 任务控制接口

#### 1. 启动任务

**POST** `/:id/start`

启动指定任务。

**请求体：**
```json
{
  "cascade": false,  // 是否级联启动子任务
  "force": false     // 是否强制启动
}
```

**响应：** `204 No Content`

#### 2. 暂停任务

**POST** `/:id/pause`

暂停正在运行的任务。

**请求体：**
```json
{
  "cascade": false,  // 是否级联暂停子任务
  "force": false     // 是否强制暂停
}
```

**响应：** `204 No Content`

#### 3. 恢复任务

**POST** `/:id/resume`

恢复已暂停的任务。

**请求体：**
```json
{
  "cascade": false,  // 是否级联恢复子任务
  "force": false     // 是否强制恢复
}
```

**响应：** `204 No Content`

#### 4. 停止任务

**POST** `/:id/stop`

停止运行中或暂停的任务。

**请求体：**
```json
{
  "cascade": false,  // 是否级联停止子任务
  "force": false     // 是否强制停止
}
```

**响应：** `204 No Content`

### 统计信息接口

#### 1. 获取统计信息

**GET** `/stats`

获取任务统计信息。

**响应：** `200 OK`
```json
{
  "total": 100,
  "pending": 20,
  "running": 30,
  "paused": 10,
  "completed": 25,
  "failed": 10,
  "stopped": 5,
  "avgExecutionTime": 5000,
  "successRate": 71.43
}
```

#### 2. 获取执行器列表

**GET** `/executors`

获取已注册的执行器列表。

**响应：** `200 OK`
```json
{
  "executors": [
    {
      "name": "http-request",
      "description": "HTTP请求执行器",
      "defaultConfig": {
        "timeout": 30000,
        "retries": 3
      }
    },
    {
      "name": "shell-command",
      "description": "Shell命令执行器",
      "defaultConfig": {
        "timeout": 60000,
        "retries": 1
      }
    }
  ]
}
```

#### 3. 清理任务

**POST** `/cleanup`

清理旧的已完成或失败的任务。

**请求体：**
```json
{
  "olderThan": "2024-01-01T00:00:00Z"  // 可选，清理早于此时间的任务
}
```

**响应：** `200 OK`
```json
{
  "deletedCount": 50
}
```

### 系统接口

#### 健康检查

**GET** `/health`

检查服务健康状态。

**响应：** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "@stratix/tasks-api",
  "taskManager": {
    "running": true
  }
}
```

## 错误处理

所有接口在出错时会返回标准的HTTP错误状态码和错误信息：

**4xx 客户端错误：**
```json
{
  "error": "Task not found",
  "statusCode": 404
}
```

**5xx 服务器错误：**
```json
{
  "error": "Internal server error",
  "statusCode": 500
}
```

## 任务状态说明

- `pending`: 待执行
- `running`: 运行中
- `paused`: 已暂停
- `completed`: 已完成
- `failed`: 执行失败
- `stopped`: 已停止

## 任务类型说明

- `directory`: 目录任务，只能包含子任务，不能直接执行
- `leaf`: 叶子任务，可以配置执行器并直接执行

## 使用示例

### 创建任务树

```typescript
// 创建根任务
const rootTask = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: '网站开发项目',
    type: 'directory'
  })
});

// 创建子任务
const childTask = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    parentId: rootTask.id,
    name: '前端开发',
    type: 'leaf',
    executorConfig: {
      name: 'build-frontend',
      timeout: 600000
    }
  })
});
```

### 任务控制

```typescript
// 启动任务
await fetch(`/api/tasks/${taskId}/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cascade: true })
});

// 暂停任务
await fetch(`/api/tasks/${taskId}/pause`, {
  method: 'POST'
});
```

## 许可证

MIT 