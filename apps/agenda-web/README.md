# @stratix/agendaedu-web

一个基于 React + TypeScript + Vite 构建的现代化任务管理前端应用，使用 shadcn/ui 组件库提供优雅的用户界面。

## 特性

- 🎯 **任务管理**: 支持多级任务创建、编辑、删除和状态管理
- 🌳 **树形结构**: 直观的任务层级展示，支持任务树的多层展示
- 🎮 **任务控制**: 启动、暂停、恢复、停止等完整的任务生命周期管理
- 📊 **实时统计**: 任务统计信息和进度展示
- 🎨 **现代UI**: 基于 shadcn/ui 的专业企业级中台设计
- 📱 **响应式**: 支持桌面和移动端的响应式布局
- 🚀 **高性能**: 使用 TanStack Table 实现高性能表格展示

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **UI组件**: shadcn/ui (基于 Radix UI + Tailwind CSS)
- **表格**: TanStack Table
- **状态管理**: 内置 React Hooks
- **API客户端**: 自定义 fetch 封装
- **开发环境**: Mock API 支持

## 项目结构

```
src/
├── components/          # 组件
│   ├── ui/             # shadcn/ui 基础组件
│   ├── AppSidebar.tsx  # 应用侧边栏
│   ├── TaskActions.tsx # 任务操作按钮
│   └── TaskStatusBadge.tsx # 任务状态徽章
├── api/                # API客户端
│   ├── client.ts       # 主API客户端
│   ├── mockClient.ts   # Mock API实现
│   └── mockData.ts     # Mock数据
├── types/              # TypeScript类型定义
│   └── task.ts         # 任务相关类型
├── hooks/              # 自定义Hooks
├── lib/                # 工具函数
└── styles/             # 样式文件
```

## 开发

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 类型检查

```bash
pnpm type-check
```

## 配置

### 环境变量

在 `.env` 文件中配置：

```env
# API配置
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_MOCK_API=true

# 其他配置
VITE_APP_TITLE=任务管理系统
```

### Mock API

项目内置了完整的 Mock API，支持所有任务管理功能：

- 任务 CRUD 操作
- 任务状态控制
- 任务树结构
- 统计信息
- 执行器管理

设置 `VITE_USE_MOCK_API=true` 启用 Mock API 模式。

## 主要功能

### 1. 任务列表管理

- 支持表格和树形视图
- 多种过滤和排序选项
- 分页和虚拟滚动支持
- 批量操作功能

### 2. 任务操作

- **创建任务**: 支持目录和叶子任务类型
- **编辑任务**: 名称、描述、执行器配置等
- **状态控制**: 启动、暂停、恢复、停止
- **删除任务**: 支持级联删除

### 3. 任务树视图

- 多级任务层次展示
- 可展开/折叠节点
- 拖拽重新排序（计划中）
- 进度汇总显示

### 4. 统计面板

- 任务状态分布
- 执行时间统计
- 成功率分析
- 实时数据更新

## API集成

项目通过 `taskApiClient` 与后端 `@stratix/tasks-api` 进行交互：

```typescript
import { taskApiClient } from '@/api/client';

// 获取任务列表
const tasks = await taskApiClient.queryTasks({
  status: ['running', 'pending'],
  limit: 20
});

// 启动任务
await taskApiClient.startTask(taskId, { cascade: true });

// 获取任务统计
const stats = await taskApiClient.getStats();
```

## 组件使用

### TaskActions 组件

```tsx
import { TaskActions } from '@/components/TaskActions';

<TaskActions
  task={task}
  onStart={(id, options) => handleStart(id, options)}
  onPause={(id, options) => handlePause(id, options)}
  onEdit={(task) => handleEdit(task)}
  onDelete={(id, options) => handleDelete(id, options)}
/>
```

### TaskStatusBadge 组件

```tsx
import { TaskStatusBadge } from '@/components/TaskStatusBadge';

<TaskStatusBadge status={task.status} />
```

## 自定义

### 添加新的任务状态

1. 更新 `src/types/task.ts` 中的 `TaskStatus` 类型
2. 在 `TaskStatusBadge.tsx` 中添加对应的样式配置
3. 更新相关的组件逻辑

### 添加新的操作按钮

在 `TaskActions.tsx` 中添加新的按钮和处理逻辑：

```tsx
{/* 自定义操作按钮 */}
{canCustomAction && onCustomAction && (
  <Button
    variant='outline'
    size='sm'
    onClick={() => onCustomAction(task.id)}
    title='自定义操作'
  >
    <CustomIcon className='h-4 w-4' />
  </Button>
)}
```

## 部署

### Docker 部署

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "preview"]
```

### 静态部署

构建后的 `dist` 目录可以直接部署到任何静态文件服务器：

```bash
pnpm build
# 将 dist/ 目录内容部署到服务器
```

## 贡献

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

MIT License
