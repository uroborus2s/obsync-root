# 新版教师审批接口测试说明

## 功能概述

新版教师审批接口基于`icalink_leave_approvals`表实现，支持多教师审批流程。当学生提交请假申请时，系统会为每位授课教师创建独立的审批记录，教师可以通过审批记录ID进行审批。

## 主要特性

### 1. 基于审批记录ID的审批
- 接口路径：`POST /api/attendance/teacher-process-approval`
- 参数：`approval_id`（审批记录ID）、`action`（approve/reject）、`comment`（可选）

### 2. 智能状态管理
- **pending**：还有待审批的记录
- **approved**：所有记录都已审批且没有拒绝
- **rejected**：有任何一条记录被拒绝

### 3. 权限验证
- 只有对应的审批人才能审批自己的记录
- 防止重复审批（已处理的记录不能再次审批）

## 数据流程

1. 学生提交请假申请 → 创建`icalink_student_attendance`记录（状态：`leave_pending`）
2. 系统获取课程所有教师 → 为每位教师创建`icalink_leave_approvals`记录（状态：`pending`）
3. 教师通过审批记录ID进行审批 → 更新对应的审批记录
4. 系统检查所有审批记录状态 → 更新请假单最终状态

## API接口

### 请求格式
```json
{
  "approval_id": "审批记录ID",
  "action": "approve", // 或 "reject"
  "comment": "审批意见（可选）"
}
```

### 响应格式
```json
{
  "success": true,
  "message": "请假申请已批准",
  "data": {
    "approval_id": "审批记录ID",
    "application_id": "请假申请ID",
    "action": "approve",
    "final_status": "approved", // pending/approved/rejected
    "approval_time": "2024-01-01T12:00:00.000Z",
    "approval_comment": "审批意见"
  }
}
```

## 测试步骤

### 1. 准备测试数据
确保数据库中有：
- 学生请假记录（`icalink_student_attendance`表，状态为`leave_pending`）
- 对应的审批记录（`icalink_leave_approvals`表，状态为`pending`）

### 2. 测试审批接口
```bash
# 教师审批通过
curl -X POST http://localhost:3000/api/attendance/teacher-process-approval \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <teacher_token>" \
  -d '{
    "approval_id": "审批记录ID",
    "action": "approve",
    "comment": "同意请假"
  }'

# 教师审批拒绝
curl -X POST http://localhost:3000/api/attendance/teacher-process-approval \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <teacher_token>" \
  -d '{
    "approval_id": "审批记录ID",
    "action": "reject",
    "comment": "请假理由不充分"
  }'
```

### 3. 验证结果

#### 检查审批记录更新
```sql
SELECT * FROM icalink_leave_approvals 
WHERE id = '审批记录ID';
```

#### 检查请假单状态更新
```sql
SELECT sa.*, la.approval_result 
FROM icalink_student_attendance sa
LEFT JOIN icalink_leave_approvals la ON sa.id = la.application_id
WHERE sa.id = '请假申请ID';
```

## 错误处理

### 常见错误码
- **400**：参数错误（缺少approval_id或action无效）
- **403**：权限错误（审批记录不存在或无权限审批）
- **404**：教师信息不存在
- **409**：状态冲突（审批记录已处理）
- **500**：服务器内部错误

### 错误示例
```json
{
  "success": false,
  "message": "该审批记录已处理，无法重复审批"
}
```

## 与旧版接口的区别

| 特性 | 旧版接口 | 新版接口 |
|------|----------|----------|
| 参数 | application_id | approval_id |
| 审批流程 | 单一教师 | 多教师协同 |
| 状态管理 | 简单二元 | 智能三态 |
| 权限控制 | 基于课程 | 基于审批记录 |
| 数据表 | student_attendance | leave_approvals |

## 注意事项

1. **向后兼容**：旧版接口仍然可用，但建议使用新版接口
2. **权限验证**：确保JWT令牌包含正确的教师信息
3. **状态一致性**：系统会自动维护审批状态的一致性
4. **并发处理**：支持多个教师同时审批不同的记录

## 前端集成

### TypeScript类型定义
```typescript
interface TeacherApprovalRequest {
  approval_id: string;
  action: 'approve' | 'reject';
  comment?: string;
}

interface TeacherApprovalResponse {
  success: boolean;
  message: string;
  data?: {
    approval_id: string;
    application_id: string;
    action: 'approve' | 'reject';
    final_status: 'pending' | 'approved' | 'rejected';
    approval_time: string;
    approval_comment?: string;
  };
}
```

### API调用示例
```typescript
const apiService = new AttendanceApiService();

try {
  const result = await apiService.teacherProcessApproval({
    approval_id: 'approval-record-id',
    action: 'approve',
    comment: '同意请假'
  });
  
  console.log('审批结果:', result.data?.final_status);
} catch (error) {
  console.error('审批失败:', error);
}
``` 