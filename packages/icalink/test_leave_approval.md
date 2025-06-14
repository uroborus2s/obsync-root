# 请假审批功能测试说明

## 功能概述

修改了学生请假接口 `/api/attendance/leave`，现在支持为每位授课教师创建独立的审批记录。

## 主要变更

### 1. 数据库表结构修改

- 修改 `icalink_leave_approvals` 表，添加 `pending` 状态支持
- `approval_result` 字段：`enum('pending','approved','rejected')` 默认 `'pending'`
- `approval_time` 字段：改为可选，`datetime DEFAULT NULL`

### 2. 新增 LeaveApprovalRepository

- 创建了 `LeaveApprovalRepository` 类来处理审批记录
- 支持批量创建审批记录
- 支持查询待审批记录
- 支持更新审批结果

### 3. 修改学生请假接口

- 获取课程的所有授课教师信息
- 为每位教师创建一条待审批记录到 `icalink_leave_approvals` 表
- 返回消息包含教师数量信息

## 数据流程

1. 学生提交请假申请
2. 系统获取该课程的所有授课教师
3. 在 `icalink_student_attendance` 表创建请假记录（状态：`leave_pending`）
4. 为每位教师在 `icalink_leave_approvals` 表创建审批记录（状态：`pending`）
5. 返回成功响应

## 测试步骤

### 1. 执行数据库迁移

```sql
-- 修改approval_result字段，添加pending状态
ALTER TABLE `icalink_leave_approvals` 
MODIFY COLUMN `approval_result` enum('pending','approved','rejected') DEFAULT 'pending' COMMENT '审批结果：pending待审批，approved批准，rejected拒绝';

-- 修改approval_time字段为可选
ALTER TABLE `icalink_leave_approvals` 
MODIFY COLUMN `approval_time` datetime DEFAULT NULL COMMENT '审批时间';
```

### 2. 测试请假接口

```bash
POST /api/attendance/leave
Content-Type: application/json
Authorization: Bearer <student_token>

{
  "attendance_record_id": "test-attendance-record-id",
  "leave_reason": "身体不适，需要请假",
  "leave_type": "sick"
}
```

### 3. 验证结果

#### 检查学生考勤记录
```sql
SELECT * FROM icalink_student_attendance 
WHERE attendance_record_id = 'test-attendance-record-id' 
AND status = 'leave_pending';
```

#### 检查教师审批记录
```sql
SELECT * FROM icalink_leave_approvals 
WHERE application_id = '<student_attendance_id>' 
AND approval_result = 'pending';
```

应该看到：
- 1条学生考勤记录（状态：`leave_pending`）
- N条教师审批记录（状态：`pending`，N为该课程的授课教师数量）

## 预期响应

```json
{
  "success": true,
  "message": "请假申请提交成功，已发送给2位授课教师审批",
  "data": {
    "id": "student-attendance-record-id",
    "status": "leave_pending",
    "leave_time": "2025-06-14T10:30:00.000Z",
    "leave_reason": "身体不适，需要请假",
    "approver": {
      "id": "teacher001",
      "name": "张老师"
    }
  }
}
```

## 注意事项

1. 如果课程没有分配教师，请假申请仍会成功，但不会创建审批记录
2. 审批记录创建失败不会影响请假申请的成功
3. 主要审批人（approver）仍然是第一位教师，保持向后兼容性
4. 所有教师都需要审批通过，请假才能最终批准（具体审批逻辑需要在后续实现）

## 后续开发

1. 实现教师审批接口，支持查询和处理待审批记录
2. 实现审批状态同步逻辑（所有教师都同意才批准）
3. 添加审批通知功能
4. 完善审批历史记录查询 