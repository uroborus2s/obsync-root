# 签到失败日志功能实现说明

## 功能概述

在签到应用中新增"签到失败日志"功能,用于查看和管理签到队列中失败的任务记录。该功能包含后端接口和前端页面两部分。

## 后端实现

### 接口信息

**后端接口已存在**,无需额外开发:

- **路由**: `GET /api/icalink/v1/attendance/failed-checkin-jobs`
- **位置**: `apps/app-icalink/src/controllers/AttendanceController.ts`
- **服务层**: `apps/app-icalink/src/services/AttendanceService.ts`

### 接口参数

**Query参数**:
- `page`: 页码 (可选,默认为1)
- `pageSize`: 每页数量 (可选,默认为20)

### 返回数据格式

```json
{
  "success": true,
  "message": "获取失败的签到队列任务成功",
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "data": [
      {
        "id": "job-id-123",
        "data": {
          "courseExtId": "course-123",
          "studentInfo": {
            "userId": "student-001",
            "username": "张三",
            "userType": "student"
          },
          "checkinData": {},
          "checkinTime": "2025-11-04T10:00:00.000Z",
          "isWindowCheckin": false
        },
        "failedReason": "签到时间窗口已关闭",
        "processedOn": 1730707200000
      }
    ]
  }
}
```

## 前端实现

### 1. 菜单配置

**文件**: `apps/agendaedu-web/src/components/layout/data/sidebar-data.ts`

在"签到管理"菜单组下新增"签到失败日志"子菜单项:

```typescript
{
  title: '签到失败日志',
  url: '/attendance/failed-logs' as const,
  icon: Activity,
  permission: {
    requiredRoles: ['teacher', 'admin', 'super_admin'],
    mode: 'or',
  },
}
```

### 2. API服务

**文件**: `apps/agendaedu-web/src/lib/attendance-api.ts`

新增`getFailedCheckinJobs`方法:

```typescript
async getFailedCheckinJobs(
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<{
  total: number
  page: number
  pageSize: number
  data: Array<{
    id: string
    data: any
    failedReason: string
    processedOn: number
  }>
}>>
```

### 3. 路由配置

**文件**: `apps/agendaedu-web/src/routes/_authenticated/attendance/failed-logs.tsx`

创建路由文件,使用TanStack Router的文件路由系统:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { FailedCheckinLogsPage } from '@/features/attendance/pages/failed-checkin-logs-page'

export const Route = createFileRoute('/_authenticated/attendance/failed-logs')({
  component: FailedCheckinLogsPage,
})
```

### 4. 页面组件

**文件**: `apps/agendaedu-web/src/features/attendance/pages/failed-checkin-logs-page.tsx`

主要功能:
- 使用`@tanstack/react-query`进行数据获取和缓存
- 支持分页展示(每页20条)
- 展示失败任务的关键信息:
  - 任务ID
  - 学生ID和姓名
  - 课程ID
  - 签到时间
  - 失败原因
  - 处理时间
- 响应式布局,适配不同屏幕尺寸

## 技术栈

### 后端
- **框架**: Stratix (基于Fastify 5 + Awilix 12)
- **队列**: BullMQ (Redis消息队列)
- **数据库**: MySQL 8.0+
- **语言**: TypeScript 5.0+

### 前端
- **框架**: React 19 + TypeScript
- **路由**: TanStack Router
- **状态管理**: TanStack Query (React Query)
- **UI组件**: Radix UI + Tailwind CSS
- **HTTP客户端**: Fetch API

## 权限控制

该功能需要以下任一角色权限:
- `teacher` (教师)
- `admin` (管理员)
- `super_admin` (超级管理员)

权限检查在以下层面实施:
1. **路由级别**: 通过`_authenticated`布局路由
2. **菜单级别**: 通过`permission`配置
3. **后端级别**: 通过认证中间件

## 使用说明

### 访问路径

1. 登录系统后,在左侧导航栏找到"签到管理"菜单组
2. 点击展开,选择"签到失败日志"子菜单
3. 系统将跳转到`/attendance/failed-logs`页面

### 功能操作

1. **查看失败记录**: 页面自动加载失败的签到任务列表
2. **分页浏览**: 使用底部的"上一页"/"下一页"按钮切换页面
3. **查看详情**: 鼠标悬停在失败原因上可查看完整错误信息

### 数据刷新

- 页面使用React Query的缓存机制
- 切换页面时会保留上一页数据(placeholderData)
- 可通过刷新浏览器重新加载最新数据

## 测试建议

### 后端测试
```bash
# 测试接口
curl -X GET "http://localhost:8090/api/icalink/v1/attendance/failed-checkin-jobs?page=1&pageSize=20" \
  -H "Cookie: your-session-cookie"
```

### 前端测试
1. 启动开发服务器: `pnpm dev`
2. 访问: `http://localhost:5173/attendance/failed-logs`
3. 验证:
   - 页面正常加载
   - 数据正确显示
   - 分页功能正常
   - 权限控制生效

## 注意事项

1. **数据来源**: 失败日志来自Redis消息队列,不是数据库表
2. **数据保留**: 失败任务的保留时间取决于队列配置
3. **性能考虑**: 大量失败任务可能影响查询性能,建议定期清理
4. **错误处理**: 页面已实现加载状态和错误提示
5. **响应式设计**: 表格在小屏幕上可横向滚动

## 后续优化建议

1. **搜索功能**: 添加按学生ID、课程ID等条件搜索
2. **时间筛选**: 支持按时间范围筛选失败记录
3. **导出功能**: 支持导出失败记录为Excel或CSV
4. **重试机制**: 提供手动重试失败任务的功能
5. **详情弹窗**: 点击记录显示完整的任务数据和堆栈信息
6. **实时更新**: 使用WebSocket实现失败记录的实时推送
7. **统计图表**: 添加失败原因分布、失败趋势等可视化图表

## 相关文件清单

### 后端文件
- `apps/app-icalink/src/controllers/AttendanceController.ts` (已存在)
- `apps/app-icalink/src/services/AttendanceService.ts` (已存在)

### 前端文件
- `apps/agendaedu-web/src/components/layout/data/sidebar-data.ts` (已修改)
- `apps/agendaedu-web/src/lib/attendance-api.ts` (已修改)
- `apps/agendaedu-web/src/routes/_authenticated/attendance/failed-logs.tsx` (新建)
- `apps/agendaedu-web/src/features/attendance/pages/failed-checkin-logs-page.tsx` (新建)

## 版本信息

- **实现日期**: 2025-11-04
- **版本**: v1.0.0
- **开发者**: AI Assistant

