# @stratix/icasync API 接口设计文档

## 1. API 概述

### 1.1 基础信息
- **基础路径**：`/api/icasync`
- **协议**：HTTP/HTTPS
- **数据格式**：JSON
- **字符编码**：UTF-8
- **版本**：v1

### 1.2 认证方式
- 基于 JWT Token 的认证
- 支持 API Key 认证
- 角色权限控制

### 1.3 统一响应格式

#### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456789"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456789"
}
```

#### 分页响应
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456789"
}
```

## 2. 同步管理 API

### 2.1 启动全量同步

**接口地址**：`POST /api/icasync/sync/full`

**请求参数**：
```json
{
  "xnxq": "2024-2025-2",
  "options": {
    "forceRefresh": false,
    "batchSize": 100,
    "timeout": 3600000
  }
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "taskId": "task_123456789",
    "taskTreeId": "tree_987654321",
    "status": "pending",
    "estimatedDuration": 1800000,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "全量同步任务已创建"
}
```

### 2.2 启动增量同步

**接口地址**：`POST /api/icasync/sync/incremental`

**请求参数**：
```json
{
  "options": {
    "batchSize": 50,
    "timeout": 1800000
  }
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "taskId": "task_123456790",
    "taskTreeId": "tree_987654322",
    "status": "pending",
    "changesDetected": 25,
    "estimatedDuration": 300000,
    "createdAt": "2024-01-15T10:35:00.000Z"
  },
  "message": "增量同步任务已创建"
}
```

### 2.3 查询同步状态

**接口地址**：`GET /api/icasync/sync/status`

**查询参数**：
- `xnxq`：学年学期（可选）
- `taskType`：任务类型（可选）

**响应示例**：
```json
{
  "success": true,
  "data": {
    "currentTask": {
      "taskId": "task_123456789",
      "taskType": "full_sync",
      "status": "running",
      "progress": 65.5,
      "startTime": "2024-01-15T10:30:00.000Z",
      "estimatedEndTime": "2024-01-15T11:00:00.000Z"
    },
    "lastSync": {
      "taskId": "task_123456788",
      "taskType": "incremental_sync",
      "status": "completed",
      "completedAt": "2024-01-15T09:45:00.000Z",
      "duration": 180000,
      "processedItems": 15,
      "successItems": 15,
      "failedItems": 0
    },
    "statistics": {
      "totalSyncs": 156,
      "successRate": 98.7,
      "averageDuration": 450000,
      "lastWeekSyncs": 12
    }
  }
}
```

### 2.4 取消同步任务

**接口地址**：`DELETE /api/icasync/sync/{taskId}`

**路径参数**：
- `taskId`：任务ID

**响应示例**：
```json
{
  "success": true,
  "data": {
    "taskId": "task_123456789",
    "status": "cancelled",
    "cancelledAt": "2024-01-15T10:45:00.000Z"
  },
  "message": "同步任务已取消"
}
```

## 3. 任务管理 API

### 3.1 查询任务列表

**接口地址**：`GET /api/icasync/tasks`

**查询参数**：
- `status`：任务状态（pending/running/completed/failed/cancelled）
- `type`：任务类型（full_sync/incremental_sync/user_sync）
- `xnxq`：学年学期
- `page`：页码（默认1）
- `pageSize`：每页大小（默认20）
- `startDate`：开始日期
- `endDate`：结束日期

**响应示例**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "task_123456789",
        "taskTreeId": "tree_987654321",
        "taskType": "full_sync",
        "xnxq": "2024-2025-2",
        "status": "completed",
        "progress": 100,
        "totalItems": 1500,
        "processedItems": 1500,
        "failedItems": 0,
        "startTime": "2024-01-15T10:30:00.000Z",
        "endTime": "2024-01-15T10:55:00.000Z",
        "duration": 1500000,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

### 3.2 查询任务详情

**接口地址**：`GET /api/icasync/tasks/{taskId}`

**路径参数**：
- `taskId`：任务ID

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "task_123456789",
    "taskTreeId": "tree_987654321",
    "taskType": "full_sync",
    "xnxq": "2024-2025-2",
    "status": "completed",
    "progress": 100,
    "totalItems": 1500,
    "processedItems": 1500,
    "failedItems": 0,
    "startTime": "2024-01-15T10:30:00.000Z",
    "endTime": "2024-01-15T10:55:00.000Z",
    "duration": 1500000,
    "resultSummary": {
      "calendarsCreated": 85,
      "schedulesCreated": 1500,
      "participantsAdded": 2500,
      "errors": []
    },
    "taskNodes": [
      {
        "id": "node_001",
        "name": "数据准备阶段",
        "status": "completed",
        "startTime": "2024-01-15T10:30:00.000Z",
        "endTime": "2024-01-15T10:32:00.000Z",
        "duration": 120000
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:55:00.000Z"
  }
}
```

### 3.3 查询任务进度

**接口地址**：`GET /api/icasync/tasks/{taskId}/progress`

**路径参数**：
- `taskId`：任务ID

**响应示例**：
```json
{
  "success": true,
  "data": {
    "taskId": "task_123456789",
    "status": "running",
    "progress": 65.5,
    "currentPhase": "日程同步阶段",
    "currentNode": {
      "id": "node_005",
      "name": "创建课程日程",
      "status": "running",
      "progress": 80.0
    },
    "totalItems": 1500,
    "processedItems": 982,
    "failedItems": 3,
    "estimatedTimeRemaining": 520000,
    "throughput": {
      "itemsPerSecond": 2.5,
      "averageProcessingTime": 400
    },
    "lastUpdated": "2024-01-15T10:45:30.000Z"
  }
}
```

### 3.4 重试失败任务

**接口地址**：`POST /api/icasync/tasks/{taskId}/retry`

**路径参数**：
- `taskId`：任务ID

**请求参数**：
```json
{
  "retryFailedOnly": true,
  "maxRetries": 3
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "taskId": "task_123456789",
    "newTaskId": "task_123456791",
    "status": "pending",
    "retryCount": 1,
    "createdAt": "2024-01-15T11:00:00.000Z"
  },
  "message": "任务重试已启动"
}
```

## 4. 日历管理 API

### 4.1 查询日历列表

**接口地址**：`GET /api/icasync/calendars`

**查询参数**：
- `xnxq`：学年学期
- `status`：同步状态
- `kkh`：开课号
- `page`：页码
- `pageSize`：每页大小

**响应示例**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "cal_123456789",
        "kkh": "202420252003013016705",
        "xnxq": "2024-2025-2",
        "calendarId": "wps_cal_987654321",
        "calendarName": "国际税收 (202420252003013016705)",
        "courseName": "国际税收",
        "teacherNames": "王君",
        "syncStatus": "completed",
        "participantCount": 45,
        "scheduleCount": 16,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:35:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 85,
      "totalPages": 5
    }
  }
}
```

### 4.2 查询日历详情

**接口地址**：`GET /api/icasync/calendars/{calendarId}`

**路径参数**：
- `calendarId`：日历ID

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "cal_123456789",
    "kkh": "202420252003013016705",
    "xnxq": "2024-2025-2",
    "calendarId": "wps_cal_987654321",
    "calendarName": "国际税收 (202420252003013016705)",
    "courseName": "国际税收",
    "teacherNames": "王君",
    "syncStatus": "completed",
    "participants": [
      {
        "userCode": "101049",
        "userName": "王君",
        "userType": "teacher",
        "role": "owner"
      },
      {
        "userCode": "2021001001",
        "userName": "张三",
        "userType": "student",
        "role": "reader"
      }
    ],
    "schedules": [
      {
        "id": "sch_123456789",
        "scheduleId": "wps_sch_987654321",
        "summary": "国际税收",
        "startTime": "2025-03-03T08:00:00.000Z",
        "endTime": "2025-03-03T08:45:00.000Z",
        "location": "第一教学楼 1422",
        "syncStatus": "completed"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### 4.3 手动创建日历

**接口地址**：`POST /api/icasync/calendars`

**请求参数**：
```json
{
  "kkh": "202420252003013016705",
  "courseName": "国际税收",
  "xnxq": "2024-2025-2",
  "teacherNames": "王君",
  "description": "国际税收课程日历"
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "id": "cal_123456790",
    "kkh": "202420252003013016705",
    "calendarId": "wps_cal_987654322",
    "calendarName": "国际税收 (202420252003013016705)",
    "syncStatus": "completed",
    "createdAt": "2024-01-15T11:00:00.000Z"
  },
  "message": "日历创建成功"
}
```

### 4.4 删除日历

**接口地址**：`DELETE /api/icasync/calendars/{calendarId}`

**路径参数**：
- `calendarId`：日历ID

**响应示例**：
```json
{
  "success": true,
  "data": {
    "calendarId": "wps_cal_987654321",
    "deletedAt": "2024-01-15T11:05:00.000Z"
  },
  "message": "日历删除成功"
}
```

## 5. 用户管理 API

### 5.1 查询用户列表

**接口地址**：`GET /api/icasync/users`

**查询参数**：
- `userType`：用户类型（student/teacher）
- `collegeCode`：学院代码
- `majorCode`：专业代码
- `classCode`：班级代码
- `syncStatus`：同步状态
- `page`：页码
- `pageSize`：每页大小

**响应示例**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "user_123456789",
        "userCode": "2021001001",
        "userName": "张三",
        "userType": "student",
        "collegeName": "计算机学院",
        "majorName": "软件工程",
        "className": "软工2101",
        "phone": "13800138001",
        "email": "zhangsan@example.com",
        "wpsUserId": "wps_user_123",
        "syncStatus": "completed",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:35:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 2500,
      "totalPages": 125
    }
  }
}
```

### 5.2 同步用户数据

**接口地址**：`POST /api/icasync/users/sync`

**请求参数**：
```json
{
  "userType": "student",
  "forceRefresh": false
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "taskId": "task_123456792",
    "syncType": "user_sync",
    "userType": "student",
    "estimatedCount": 2500,
    "createdAt": "2024-01-15T11:10:00.000Z"
  },
  "message": "用户同步任务已启动"
}
```

## 6. 监控报告 API

### 6.1 系统健康检查

**接口地址**：`GET /api/icasync/health`

**响应示例**：
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T11:15:00.000Z",
    "uptime": 86400000,
    "version": "1.0.0",
    "dependencies": {
      "database": {
        "status": "healthy",
        "responseTime": 15
      },
      "wpsApi": {
        "status": "healthy",
        "responseTime": 120
      },
      "taskManager": {
        "status": "healthy",
        "activeTaskTrees": 1
      }
    },
    "metrics": {
      "memoryUsage": 65.5,
      "cpuUsage": 25.3,
      "activeConnections": 12
    }
  }
}
```

### 6.2 同步统计报告

**接口地址**：`GET /api/icasync/statistics`

**查询参数**：
- `period`：统计周期（day/week/month）
- `startDate`：开始日期
- `endDate`：结束日期

**响应示例**：
```json
{
  "success": true,
  "data": {
    "period": "week",
    "startDate": "2024-01-08T00:00:00.000Z",
    "endDate": "2024-01-15T00:00:00.000Z",
    "summary": {
      "totalSyncs": 12,
      "successfulSyncs": 11,
      "failedSyncs": 1,
      "successRate": 91.7,
      "totalProcessedItems": 18500,
      "averageDuration": 450000
    },
    "dailyStats": [
      {
        "date": "2024-01-15",
        "syncs": 2,
        "success": 2,
        "failed": 0,
        "processedItems": 3000,
        "averageDuration": 420000
      }
    ],
    "typeStats": {
      "full_sync": {
        "count": 2,
        "successRate": 100,
        "averageDuration": 1800000
      },
      "incremental_sync": {
        "count": 9,
        "successRate": 88.9,
        "averageDuration": 300000
      },
      "user_sync": {
        "count": 1,
        "successRate": 100,
        "averageDuration": 600000
      }
    }
  }
}
```
