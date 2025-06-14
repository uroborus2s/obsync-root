# 请假状态更新功能说明

## 概述

本次更新为icalink插件的请假功能增加了`leave_rejected`状态，并修改了相关接口和前端页面，支持通过三种不同状态查询请假单。

## 主要修改内容

### 1. 数据库表结构修改

#### 修改的表
- `icalink_student_attendance`表的`status`字段

#### 修改内容
- 原状态：`enum('present','leave','absent','pending_approval','leave_pending')`
- 新状态：`enum('present','leave','absent','pending_approval','leave_pending','leave_rejected')`

#### 数据库迁移脚本
- 文件：`packages/icalink/database/migrations/add_leave_rejected_status.sql`
- 执行SQL：
```sql
ALTER TABLE `icalink_student_attendance` 
MODIFY COLUMN `status` enum('present','leave','absent','pending_approval','leave_pending','leave_rejected') NOT NULL COMMENT '签到状态';
```

### 2. 类型定义更新

#### 修改的文件
- `packages/icalink/src/types/attendance.ts`
- `packages/icalink/src/repositories/types.ts`
- `apps/agendaedu-app/src/lib/attendance-api.ts`

#### 主要修改
- `AttendanceStatus`枚举添加`LEAVE_REJECTED = 'leave_rejected'`
- `StudentLeaveApplicationQueryParams`的status参数类型更新为：`'all' | 'leave_pending' | 'leave' | 'leave_rejected'`
- `StudentLeaveApplicationItem`的status字段类型更新为：`'leave_pending' | 'leave' | 'leave_rejected'`
- 统计信息字段名更新：
  - `pending_count` → `leave_pending_count`
  - `approved_count` → `leave_count`
  - `rejected_count` → `leave_rejected_count`

### 3. 后端API修改

#### 修改的接口
- `GET /api/attendance/leave-applications`

#### 修改内容
- 支持通过`leave_pending`、`leave`、`leave_rejected`三种状态查询请假单
- 简化了状态筛选逻辑，直接使用数据库中的状态值进行查询
- 更新了返回的统计信息字段名

#### Repository层修改
- `StudentAttendanceRepository.getStudentLeaveApplications()`方法
- `StudentAttendanceRepository.getStudentLeaveApplicationStats()`方法
- 移除了复杂的状态映射逻辑，直接使用数据库状态

### 4. 前端页面修改

#### 修改的组件
- `apps/agendaedu-app/src/pages/StudentMessages.tsx`
- `apps/agendaedu-app/src/components/StudentFloatingMessageButton.tsx`

#### 主要修改
- 标签页更新：
  - "待审批" → 查询`leave_pending`状态
  - "已批准" → 查询`leave`状态
  - "已拒绝" → 查询`leave_rejected`状态
- 状态显示函数更新：
  - `getStatusIcon()`、`getStatusText()`、`getStatusColor()`
- 统计数据字段名更新
- 浮动消息按钮使用新的状态和统计字段

## 状态说明

### 请假申请状态流转

```
学生提交请假申请 → leave_pending (待审批)
                    ↓
教师审批 → leave (已批准) 或 leave_rejected (已拒绝)
```

### 状态对应关系

| 数据库状态 | 前端显示 | 说明 |
|-----------|---------|------|
| `leave_pending` | 待审批 | 学生提交请假申请，等待教师审批 |
| `leave` | 已批准 | 教师批准了请假申请 |
| `leave_rejected` | 已拒绝 | 教师拒绝了请假申请 |

## API接口更新

### 请求参数
```typescript
interface StudentLeaveApplicationQueryParams {
  status?: 'all' | 'leave_pending' | 'leave' | 'leave_rejected';
  page?: number;
  page_size?: number;
  start_date?: string;
  end_date?: string;
}
```

### 响应数据
```typescript
interface StudentLeaveApplicationQueryResponse {
  success: boolean;
  message?: string;
  data?: {
    applications: StudentLeaveApplicationItem[];
    total: number;
    page: number;
    page_size: number;
    stats: {
      total_count: number;
      leave_pending_count: number;    // 待审批数量
      leave_count: number;            // 已批准数量
      leave_rejected_count: number;   // 已拒绝数量
    };
  };
}
```

## 使用示例

### 前端查询不同状态的请假单

```typescript
// 查询待审批的请假单
const pendingApplications = await attendanceApi.getStudentLeaveApplications({
  status: 'leave_pending'
});

// 查询已批准的请假单
const approvedApplications = await attendanceApi.getStudentLeaveApplications({
  status: 'leave'
});

// 查询已拒绝的请假单
const rejectedApplications = await attendanceApi.getStudentLeaveApplications({
  status: 'leave_rejected'
});

// 查询所有请假单
const allApplications = await attendanceApi.getStudentLeaveApplications({
  status: 'all'
});
```

## 兼容性说明

- 本次更新为向后兼容的修改
- 现有的请假数据不会受到影响
- 数据库迁移脚本可以安全执行
- 前端页面会自动适配新的状态显示

## 部署说明

1. 执行数据库迁移脚本：
```sql
-- 在数据库中执行
source packages/icalink/database/migrations/add_leave_rejected_status.sql;
```

2. 重新构建和部署后端服务：
```bash
cd packages/icalink
npm run build
```

3. 重新构建和部署前端应用：
```bash
cd apps/agendaedu-app
npm run build
```

## 测试建议

1. 测试数据库迁移是否成功
2. 测试三种状态的请假单查询功能
3. 测试前端页面的状态切换和显示
4. 测试统计数据的正确性
5. 测试教师审批功能是否正常设置状态

## 注意事项

- 确保在生产环境执行数据库迁移前进行备份
- 建议在测试环境先验证所有功能正常
- 如果有其他系统依赖这些状态值，需要同步更新 