# 教师审批页面接口测试说明

## 修改内容总结

### 1. 后端接口修改

**接口地址：** `GET /api/attendance/teacher-leave-applications`

**主要变更：**
- 支持四种状态筛选：`pending`, `approved`, `rejected`, `cancelled`
- 使用 `LeaveApprovalRepository.getTeacherApprovals()` 方法获取数据
- 通过 `icalink_leave_approvals` 表关联 `icalink_student_attendance` 表
- 返回完整的学生信息、课程信息和审批信息

**返回数据结构：**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "application-id",
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

### 2. 前端页面修改

**主要变更：**
- 支持四个独立的标签页：待审批、已批准、已拒绝、已取消
- 更新了数据展示结构，适配新的接口数据格式
- 改进了 ApplicationCard 组件的布局和信息展示
- 添加了 `cancelled` 状态的图标和样式

**页面结构：**
```
Approval.tsx
├── Header (标题和返回按钮)
├── Tabs (四个状态标签页)
│   ├── 待审批 (pending_count)
│   ├── 已批准 (approved_count)
│   ├── 已拒绝 (rejected_count)
│   └── 已取消 (cancelled_count)
├── Content Area
│   ├── Error Message (错误提示)
│   ├── Loading State (加载状态)
│   ├── Empty State (空状态)
│   └── Application Cards (申请卡片列表)
└── Detail Modal (详情模态框)
```

**ApplicationCard 组件结构：**
```
ApplicationCard
├── 头部信息 (学生姓名、学号、班级、状态)
├── 课程信息 (课程名称、时间、地点)
├── 请假信息 (类型、日期)
├── 请假原因
├── 附件列表 (如果有)
├── 时间信息 (申请时间、审批时间)
├── 审批意见 (如果有)
└── 操作按钮 (查看详情、批准、拒绝)
```

## 测试步骤

### 1. 数据库准备

```sql
-- 确保数据库表结构正确
DESCRIBE icalink_leave_approvals;

-- 插入测试数据
INSERT INTO icalink_student_attendance (
  id, student_id, student_name, course_id, course_name,
  leave_date, leave_reason, leave_type, status, created_at
) VALUES (
  'test-attendance-1', '20230001', '张三', 'CS101', '计算机科学导论',
  '2024-01-15', '身体不适', 'sick', 'leave_pending', NOW()
);

INSERT INTO icalink_leave_approvals (
  id, application_id, approver_id, approver_name,
  approval_result, created_at
) VALUES (
  'test-approval-1', 'test-attendance-1', 'T001', '李老师',
  'pending', NOW()
);
```

### 2. API 测试

```bash
# 测试获取待审批记录
curl -X GET "http://localhost:3000/api/attendance/teacher-leave-applications?status=pending" \
  -H "Cookie: wps_jwt_token=your-jwt-token"

# 测试获取已批准记录
curl -X GET "http://localhost:3000/api/attendance/teacher-leave-applications?status=approved" \
  -H "Cookie: wps_jwt_token=your-jwt-token"

# 测试获取统计信息
curl -X GET "http://localhost:3000/api/attendance/teacher-leave-applications" \
  -H "Cookie: wps_jwt_token=your-jwt-token"
```

### 3. 前端页面测试

1. **访问审批页面**
   - URL: `/approval`
   - 检查页面是否正常加载

2. **标签页功能测试**
   - 点击"待审批"标签，验证显示 pending 状态的申请
   - 点击"已批准"标签，验证显示 approved 状态的申请
   - 点击"已拒绝"标签，验证显示 rejected 状态的申请
   - 点击"已取消"标签，验证显示 cancelled 状态的申请

3. **数据展示测试**
   - 验证学生信息正确显示（姓名、学号、班级）
   - 验证课程信息正确显示（课程名称、时间、地点）
   - 验证请假信息正确显示（类型、日期、原因）
   - 验证状态图标和颜色正确显示

4. **统计数据测试**
   - 验证各标签页的数量统计是否正确
   - 验证数量与实际显示的记录数是否一致

5. **交互功能测试**
   - 测试"查看详情"按钮功能
   - 测试"批准"按钮功能（仅待审批状态）
   - 测试"拒绝"按钮功能（仅待审批状态）
   - 测试附件查看和下载功能

### 4. 错误处理测试

1. **网络错误测试**
   - 断开网络连接，验证错误提示
   - 服务器返回错误，验证错误处理

2. **权限测试**
   - 使用无效JWT令牌，验证认证失败处理
   - 使用非教师身份，验证权限检查

3. **数据异常测试**
   - 空数据情况，验证空状态显示
   - 数据格式异常，验证容错处理

## 预期结果

### 1. 接口层面
- ✅ 支持四种状态筛选
- ✅ 返回正确的数据结构
- ✅ 统计信息准确
- ✅ 分页功能正常

### 2. 页面层面
- ✅ 四个标签页正常切换
- ✅ 数据正确展示
- ✅ 交互功能正常
- ✅ 错误处理完善

### 3. 用户体验
- ✅ 页面加载速度快
- ✅ 界面友好美观
- ✅ 操作反馈及时
- ✅ 错误提示清晰

## 注意事项

1. **数据一致性**
   - 确保 `icalink_leave_approvals` 表与 `icalink_student_attendance` 表数据一致
   - 验证审批状态变更后统计数据实时更新

2. **权限控制**
   - 教师只能看到自己负责审批的请假申请
   - 验证JWT认证和教师身份验证

3. **性能优化**
   - 大量数据时的分页加载
   - 避免频繁的API调用

4. **兼容性**
   - 确保在不同浏览器中正常工作
   - 移动端适配检查

## 故障排除

### 常见问题

1. **页面空白或加载失败**
   - 检查控制台错误信息
   - 验证API接口是否正常
   - 检查JWT令牌是否有效

2. **数据显示不正确**
   - 检查数据库数据是否正确
   - 验证接口返回的数据格式
   - 检查前端数据处理逻辑

3. **统计数量不匹配**
   - 检查数据库查询逻辑
   - 验证状态筛选条件
   - 检查数据同步问题

### 调试方法

1. **浏览器开发者工具**
   - 查看Network标签页的API请求
   - 检查Console标签页的错误信息
   - 使用React DevTools检查组件状态

2. **服务器日志**
   - 查看应用程序日志
   - 检查数据库查询日志
   - 监控API响应时间

3. **数据库检查**
   - 直接查询数据库验证数据
   - 检查表结构和索引
   - 验证数据关联关系 