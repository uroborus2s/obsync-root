# @wps/icalink-sync

基于 Stratix 框架的 iCalink 同步服务，提供学校课表数据同步到 WPS 协作日程的功能。

## 功能特性

- 📅 **课表同步**: 自动同步学校课表数据到 WPS 协作日程
- 🔄 **任务管理**: 完整的任务系统，支持任务创建、监控和管理
- 🌐 **HTTP API**: 提供 RESTful API 接口，支持外部系统集成
- 📊 **实时监控**: 任务执行状态实时监控和统计
- 🔧 **插件化架构**: 基于 Stratix 框架的模块化设计
- 📚 课程打卡任务管理
- 👥 学生打卡记录追踪
- 📊 打卡统计分析
- 🔍 多维度数据查询
- 📱 支持位置信息记录

## 新增API接口

本项目新增了以下打卡数据相关的API接口：

### 1. 任务列表查询
```http
GET /apiv2/attendance-tasks
```
获取考勤任务列表，支持按教师、学生、时间段等条件筛选。

### 2. 打卡数据查询
```http
GET /apiv2/attendance-data
```
获取学生打卡记录，支持多种筛选条件和分页。

### 3. 任务详情查询
```http
GET /apiv2/attendance-tasks/:task_id
```
获取指定任务的详细信息，包括所有学生的打卡记录。

### 4. 打卡统计数据
```http
GET /apiv2/attendance-stats
```
获取打卡统计信息，包括总体情况和趋势分析。

## 树形任务接口

### 1. 获取根任务列表（树形展示）

```
GET /apiv2/tasks/tree/roots
```

**查询参数：**
- `status` (string|array): 任务状态过滤，支持多个状态用逗号分隔
- `page` (number): 页码，默认为 1
- `page_size` (number): 每页数量，默认为 20
- `orderBy` (string): 排序字段，可选值：created_at, updated_at, priority, progress, name
- `orderDirection` (string): 排序方向，asc 或 desc，默认为 desc
- `includeChildrenCount` (boolean): 是否包含子任务计数，默认为 true

**响应格式：**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "task-001",
        "parent_id": null,
        "name": "主任务",
        "description": "这是一个主任务",
        "task_type": "sync",
        "status": "running",
        "priority": 1,
        "progress": 50.5,
        "executor_name": "sync-executor",
        "metadata": {},
        "created_at": "2025-01-07T00:00:00.000Z",
        "updated_at": "2025-01-07T00:00:00.000Z",
        "started_at": "2025-01-07T00:00:00.000Z",
        "completed_at": null,
        "childrenCount": 3
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

### 2. 获取任务的子任务列表

```
GET /apiv2/tasks/:id/tree/children
```

**路径参数：**
- `id` (string): 父任务ID

**查询参数：**
- `includeChildrenCount` (boolean): 是否包含子任务计数，默认为 true
- `status` (string|array): 任务状态过滤

**响应格式：**
```json
{
  "success": true,
  "data": [
    {
      "id": "child-001",
      "parent_id": "task-001",
      "name": "子任务1",
      "description": "这是一个子任务",
      "task_type": "sync",
      "status": "pending",
      "priority": 2,
      "progress": 0,
      "executor_name": "sync-executor",
      "metadata": {},
      "created_at": "2025-01-07T00:00:00.000Z",
      "updated_at": "2025-01-07T00:00:00.000Z",
      "started_at": null,
      "completed_at": null,
      "childrenCount": 0
    }
  ]
}
```

### 3. 获取完整的任务树结构

```
GET /apiv2/tasks/:id/tree/complete
```

**路径参数：**
- `id` (string): 根任务ID

**查询参数：**
- `maxDepth` (number): 最大深度，默认为 10
- `status` (string|array): 任务状态过滤

**响应格式：**
```json
{
  "success": true,
  "data": {
    "id": "task-001",
    "parent_id": null,
    "name": "主任务",
    "description": "这是一个主任务",
    "task_type": "sync",
    "status": "running",
    "priority": 1,
    "progress": 50.5,
    "executor_name": "sync-executor",
    "metadata": {},
    "created_at": "2025-01-07T00:00:00.000Z",
    "updated_at": "2025-01-07T00:00:00.000Z",
    "started_at": "2025-01-07T00:00:00.000Z",
    "completed_at": null,
    "depth": 0,
    "childrenCount": 2,
    "children": [
      {
        "id": "child-001",
        "parent_id": "task-001",
        "name": "子任务1",
        "description": "这是一个子任务",
        "task_type": "sync",
        "status": "completed",
        "priority": 2,
        "progress": 100,
        "executor_name": "sync-executor",
        "metadata": {},
        "created_at": "2025-01-07T00:00:00.000Z",
        "updated_at": "2025-01-07T00:00:00.000Z",
        "started_at": "2025-01-07T00:00:00.000Z",
        "completed_at": "2025-01-07T00:00:00.000Z",
        "depth": 1,
        "childrenCount": 0,
        "children": []
      }
    ]
  }
}
```

### 任务状态

任务支持以下状态：
- `pending`: 等待中
- `running`: 运行中
- `paused`: 已暂停
- `success`: 成功
- `failed`: 失败
- `cancelled`: 已取消
- `completed`: 已完成

### 前端集成建议

#### 1. 懒加载树形结构

```javascript
// 1. 首先获取根任务列表
const rootTasks = await fetch('/apiv2/tasks/tree/roots?page=1&page_size=20');

// 2. 当用户展开节点时，动态加载子任务
const loadChildren = async (taskId) => {
  const children = await fetch(`/apiv2/tasks/${taskId}/tree/children`);
  return children.data;
};

// 3. 如果需要完整树结构（小型树），可以一次性获取
const completeTree = await fetch(`/apiv2/tasks/${rootTaskId}/tree/complete?maxDepth=5`);
```

#### 2. 树形组件数据格式

接口返回的数据已经包含了树形展示所需的所有字段：
- `childrenCount`: 子任务数量，用于显示展开/折叠图标
- `depth`: 节点深度，用于缩进显示
- `children`: 子任务数组（完整树结构接口）

#### 3. 状态过滤

```javascript
// 只显示运行中和等待中的任务
const activeTasks = await fetch('/apiv2/tasks/tree/roots?status=running,pending');

// 只显示已完成的任务
const completedTasks = await fetch('/apiv2/tasks/tree/roots?status=success,completed');
```

## 快速开始

### 环境要求

- Node.js >= 22.0.0
- MySQL 数据库
- pnpm 包管理器

### 安装依赖

```bash
# 在项目根目录
pnpm install

# 或在当前目录
cd apps/icalink-sync
pnpm install
```

### 配置环境

1. 复制环境配置文件：
```bash
cp dev.env.json.example dev.env.json
```

2. 编辑 `dev.env.json` 配置文件，填入数据库连接信息和其他必要配置。

3. 加密环境配置：
```bash
pnpm env:dev
```

### 启动服务

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start
```

服务启动后，默认在 `http://localhost:3000` 提供 HTTP API 服务。

## Tasks API

本项目提供完整的任务管理 API 接口，支持任务的创建、查询、控制等操作。

### 主要接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/tasks/statistics` | 获取任务统计信息 |
| GET | `/api/tasks/tree` | 获取任务树视图 |
| GET | `/api/tasks/roots` | 获取根任务列表 |
| GET | `/api/tasks/:id` | 根据ID获取任务详情 |
| GET | `/api/tasks/by-name/:name` | 根据名称获取任务详情 |
| POST | `/api/tasks` | 创建新任务 |
| POST | `/api/tasks/:id/start` | 启动任务 |
| POST | `/api/tasks/:id/pause` | 暂停任务 |
| POST | `/api/tasks/:id/resume` | 恢复任务 |
| POST | `/api/tasks/:id/cancel` | 取消任务 |
| POST | `/api/tasks/:id/success` | 标记任务成功 |
| POST | `/api/tasks/:id/fail` | 标记任务失败 |
| POST | `/api/tasks/recovery` | 恢复运行中的任务 |

### API 文档

详细的 API 文档请参考：[Tasks API 文档](src/plugin/sync/controllers/README.md)

### 测试 API

项目提供了完整的 API 测试脚本：

```bash
# 确保服务正在运行
pnpm dev

# 在另一个终端运行测试脚本
node test-tasks-api.js
```

## 项目结构

```
apps/icalink-sync/
├── src/
│   ├── plugin/
│   │   └── sync/
│   │       ├── controllers/          # HTTP 控制器
│   │       │   ├── tasks.controller.ts
│   │       │   └── README.md         # API 文档
│   │       ├── services/             # 业务服务
│   │       ├── repositories/         # 数据访问层
│   │       ├── types/               # 类型定义
│   │       └── plugin.ts            # 插件入口
│   ├── stratix.config.ts            # Stratix 配置
│   └── index.ts                     # 应用入口
├── test-tasks-api.js                # API 测试脚本
├── CHANGELOG.md                     # 更新日志
└── package.json
```

## 开发指南

### 添加新的 API 接口

1. 在 `TasksController` 中添加新的路由处理方法
2. 在 `registerRoutes()` 方法中注册新的路由
3. 更新 API 文档
4. 添加相应的测试用例

### 扩展任务功能

1. 在 `@stratix/tasks` 包中扩展任务相关功能
2. 在控制器中调用新的服务方法
3. 更新 API 接口以支持新功能

## 技术栈

- **框架**: Stratix Framework
- **运行时**: Node.js 22+
- **数据库**: MySQL
- **任务系统**: @stratix/tasks
- **Web 框架**: Fastify (通过 @stratix/web)
- **依赖注入**: Awilix
- **语言**: TypeScript

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](../../LICENSE) 文件。 