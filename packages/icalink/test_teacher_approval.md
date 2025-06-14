# 教师审批功能测试文档

## 功能概述

本文档描述了教师审批功能的实现和测试方法。该功能允许教师查看和审批学生的请假申请，支持四种审批状态：待审批(pending)、已批准(approved)、已拒绝(rejected)、已取消(cancelled)。

## 数据库变更

### 1. 修改 icalink_leave_approvals 表

```sql
-- 修改approval_result字段，添加更多状态选项
ALTER TABLE `icalink_leave_approvals` 
MODIFY COLUMN `approval_result` enum('pending','approved','rejected','cancelled') DEFAULT 'pending' 
COMMENT '审批结果：pending未处理，approved批准，rejected拒绝，cancelled取消';
```

### 2. 数据流程

1. 学生提交请假申请 → `icalink_student_attendance` 表创建记录（状态：`leave_pending`）
2. 系统为每位授课教师创建审批记录 → `icalink_leave_approvals` 表（状态：`pending`）
3. 教师审批 → 更新 `icalink_leave_approvals` 表的审批状态和意见

## API 接口

### 1. 获取教师审批记录

**接口地址：** `GET /api/attendance/teacher-leave-applications`

**查询参数：**
- `status`: 'pending' | 'approved' | 'rejected' | 'cancelled' (可选)
- `page`: 页码 (可选，默认1)
- `page_size`: 每页大小 (可选，默认20)
- `start_date`: 开始日期 (可选)
- `end_date`: 结束日期 (可选)

**响应示例：**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "approval-id",
        "application_id": "attendance-record-id",
        "student_id": "20230001",
        "student_name": "张三",
        "course_id": "CS101",
        "course_name": "计算机科学导论",
        "leave_date": "2024-01-15",
        "leave_reason": "身体不适",
        "leave_type": "sick",
        "status": "pending",
        "approval_comment": null,
        "approval_time": null,
        "application_time": "2024-01-15T08:00:00Z",
        "approval_id": "approval-uuid"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "stats": {
      "pending_count": 5,
      "approved_count": 10,
      "rejected_count": 2,
      "cancelled_count": 1,
      "total_count": 18
    }
  }
}
```

### 2. 教师审批请假申请

**接口地址：** `POST /api/attendance/teacher-approve-leave`

**请求体：**
```json
{
  "application_id": "attendance-record-id",
  "action": "approve", // 'approve' | 'reject'
  "comment": "同意请假申请"
}
```

## 前端页面

### 1. 审批页面 (Approval.tsx)

页面支持四个标签页：
- **待审批** - 显示状态为 `pending` 的申请
- **已批准** - 显示状态为 `approved` 的申请  
- **已拒绝** - 显示状态为 `rejected` 的申请
- **已取消** - 显示状态为 `cancelled` 的申请

### 2. 功能特性

- 按状态筛选审批记录
- 查看申请详情
- 批准/拒绝操作（仅对待审批状态）
- 查看和下载附件
- 统计信息显示

## 测试步骤

### 1. 数据库测试

```sql
-- 1. 检查表结构是否正确修改
DESCRIBE icalink_leave_approvals;

-- 2. 插入测试数据
INSERT INTO icalink_leave_approvals (
  id, application_id, approver_id, approver_name, 
  approval_result, created_at
) VALUES (
  'test-approval-1', 'test-app-1', 'T001', '张老师', 
  'pending', NOW()
);

-- 3. 查询测试
SELECT * FROM icalink_leave_approvals WHERE approver_id = 'T001';
```

### 2. API 测试

```bash
# 1. 获取待审批记录
curl -X GET "http://localhost:3000/api/attendance/teacher-leave-applications?status=pending" \
  -H "Cookie: wps_jwt_token=your-jwt-token"

# 2. 获取统计信息
curl -X GET "http://localhost:3000/api/attendance/teacher-leave-applications" \
  -H "Cookie: wps_jwt_token=your-jwt-token"

# 3. 审批申请
curl -X POST "http://localhost:3000/api/attendance/teacher-approve-leave" \
  -H "Content-Type: application/json" \
  -H "Cookie: wps_jwt_token=your-jwt-token" \
  -d '{
    "application_id": "test-app-1",
    "action": "approve",
    "comment": "同意请假"
  }'
```

### 3. 前端测试

1. 访问审批页面：`/approval`
2. 验证四个标签页是否正确显示
3. 测试状态切换功能
4. 测试审批操作
5. 验证统计数据是否正确

## 预期结果

1. **数据库层面**：
   - `icalink_leave_approvals` 表支持四种审批状态
   - 审批记录正确关联学生请假申请

2. **API层面**：
   - 支持按状态筛选审批记录
   - 返回正确的统计信息
   - 审批操作成功更新状态

3. **前端层面**：
   - 四个标签页正确显示对应状态的记录
   - 统计数字准确反映各状态的数量
   - 审批操作界面友好，反馈及时

## 注意事项

1. 确保JWT认证正常工作
2. 验证教师权限，只能审批自己授课的请假申请
3. 审批状态变更后，相关统计数据应实时更新
4. 错误处理要完善，提供友好的错误提示

## 故障排除

### 常见问题

1. **类型错误**：确保前后端类型定义一致
2. **权限问题**：检查JWT令牌和教师身份验证
3. **数据不一致**：验证数据库表结构和数据完整性
4. **API调用失败**：检查网络连接和服务器状态

### 调试方法

1. 查看浏览器控制台错误信息
2. 检查服务器日志
3. 使用API测试工具验证接口
4. 检查数据库数据是否正确 