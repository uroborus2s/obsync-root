# 教师审批接口测试文档

## 接口信息
- **接口路径**: `/api/attendance/teacher-leave-applications`
- **请求方法**: GET
- **功能**: 获取教师的请假审批记录

## 修复内容

### 1. 数据库表结构修改
修改了 `icalink_leave_approvals` 表的 `approval_result` 字段，支持四种状态：
- `pending`: 未处理
- `approved`: 批准  
- `rejected`: 拒绝
- `cancelled`: 取消

### 2. Repository层修复
- 修复了 `LeaveApprovalRepository` 中的 SQL 查询问题
- 使用 Kysely 的 `sql` 模板字符串正确执行原生 SQL
- 实现了 `getTeacherApprovals()` 和 `getTeacherApprovalStats()` 方法

### 3. 字段映射修复
修复了 SQL 查询中的字段名映射问题：
- `sa.xh as student_id`: 学生学号字段映射
- `sa.xm as student_name`: 学生姓名字段映射  
- `ar.kkh as course_id`: 课程开课号字段映射
- `ar.kcmc as course_name`: 课程名称字段映射
- `ar.rq as leave_date`: 请假日期字段映射
- 添加了与 `icalink_attendance_records` 表的关联查询

### 4. 主要修复点
1. **SQL 执行方式**: 从错误的 `executeQuery` 方法改为正确的 `sql` 模板字符串
2. **参数绑定**: 使用模板字符串的参数插值而不是占位符
3. **类型导入**: 修复了 `sql` 的导入方式
4. **字段名映射**: 修复了数据库字段名与接口返回字段名的映射关系
5. **表关联**: 添加了与考勤记录表的关联查询获取课程信息

## 数据库表关联关系

```
icalink_leave_approvals (审批记录表)
├── application_id → icalink_student_attendance.id (学生考勤记录)
└── icalink_student_attendance
    └── attendance_record_id → icalink_attendance_records.id (考勤记录)
```

## 请求参数

### Query Parameters
- `status` (可选): 审批状态筛选
  - `pending`: 待处理
  - `approved`: 已批准
  - `rejected`: 已拒绝
  - `cancelled`: 已取消
- `page` (可选): 页码，默认 1
- `page_size` (可选): 每页大小，默认 20
- `start_date` (可选): 开始日期 (YYYY-MM-DD)
- `end_date` (可选): 结束日期 (YYYY-MM-DD)

## 响应格式

```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "审批记录ID",
        "student_id": "学生学号",
        "student_name": "学生姓名",
        "course_id": "课程开课号",
        "course_name": "课程名称",
        "leave_date": "请假日期",
        "leave_reason": "请假原因",
        "leave_type": "请假类型",
        "status": "审批状态",
        "approval_comment": "审批意见",
        "approval_time": "审批时间",
        "application_time": "申请时间",
        "approval_id": "审批记录ID"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "stats": {
      "pending_count": 10,
      "processed_count": 90,
      "approved_count": 80,
      "rejected_count": 8,
      "cancelled_count": 2,
      "total_count": 100
    }
  }
}
```

## 测试用例

### 1. 获取所有审批记录
```bash
GET /api/attendance/teacher-leave-applications
```

### 2. 获取待处理的审批记录
```bash
GET /api/attendance/teacher-leave-applications?status=pending
```

### 3. 获取已批准的审批记录
```bash
GET /api/attendance/teacher-leave-applications?status=approved
```

### 4. 获取已拒绝的审批记录
```bash
GET /api/attendance/teacher-leave-applications?status=rejected
```

### 5. 获取已取消的审批记录
```bash
GET /api/attendance/teacher-leave-applications?status=cancelled
```

### 6. 分页查询
```bash
GET /api/attendance/teacher-leave-applications?page=2&page_size=10
```

### 7. 日期范围查询
```bash
GET /api/attendance/teacher-leave-applications?start_date=2024-01-01&end_date=2024-01-31
```

## 注意事项

1. **数据库迁移**: 需要先执行 `update_approval_result_status.sql` 迁移脚本
2. **权限验证**: 接口会验证教师身份和JWT令牌
3. **数据关联**: 通过 `icalink_leave_approvals` 表的 `approver_id` 关联教师
4. **状态统计**: 返回各种状态的统计信息
5. **字段映射**: 数据库字段名与接口返回字段名进行了正确映射

## 可能的错误

1. **JWT令牌问题**: 确保请求头包含有效的认证令牌
2. **教师信息不存在**: 确保教师信息在系统中存在
3. **数据库连接问题**: 确保数据库连接正常
4. **表结构问题**: 确保数据库表结构已更新
5. **字段名错误**: 已修复字段名映射问题

## 前端页面支持

修改后的接口支持前端 `Approval.tsx` 页面的四个标签页：
- 未处理 (pending)
- 已批准 (approved) 
- 已拒绝 (rejected)
- 已取消 (cancelled) 