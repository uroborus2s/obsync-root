# 5. 审批请假申请接口

## 接口概述

教师审批请假申请接口，仅限教师使用。支持批准或拒绝请假申请，自动更新相关记录状态。

## 接口规范

- **HTTP方法**: `PUT`
- **路径**: `/api/icalink/v1/leave-applications/:application_id/approval`
- **权限**: 仅限教师
- **认证方式**: 通过HTTP请求头获取用户信息，无需额外认证流程

## 请求参数

### 路径参数 (Path Parameters)

```typescript
interface ApprovalPathParams {
  application_id: string; // 请假申请ID
}
```

### 请求体 (Request Body)

```typescript
interface ApprovalRequest {
  result: 'approved' | 'rejected';        // 审批结果
  comment?: string;                       // 审批意见（可选）
}
```

### 参数说明

| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| application_id | string | ✅ | 请假申请ID |
| result | string | ✅ | 审批结果：approved(批准) 或 rejected(拒绝) |
| comment | string | ❌ | 审批意见，最多500字符 |

## 响应格式

### 成功响应

```typescript
interface ApprovalResponse {
  success: boolean;
  message: string;
  data: {
    application_id: number;
    student_id: string;
    student_name: string;
    teacher_id: string;
    teacher_name: string;
    approval_result: 'approved' | 'rejected';
    approval_time: string;              // ISO 8601 格式
    approval_comment?: string;
    new_attendance_status: 'leave' | 'absent';
    course_info: {
      course_name: string;
      class_date: string;
    };
  };
}
```

### 批准响应示例

```json
{
  "success": true,
  "message": "请假申请审批完成",
  "data": {
    "application_id": 123,
    "student_id": "20210001",
    "student_name": "张三",
    "teacher_id": "T001",
    "teacher_name": "李老师",
    "approval_result": "approved",
    "approval_time": "2024-01-15T16:30:00Z",
    "approval_comment": "病假批准，注意休息",
    "new_attendance_status": "leave",
    "course_info": {
      "course_name": "高等数学",
      "class_date": "2024-01-16"
    }
  }
}
```

### 拒绝响应示例

```json
{
  "success": true,
  "message": "请假申请审批完成",
  "data": {
    "application_id": 124,
    "student_id": "20210002",
    "student_name": "李四",
    "teacher_id": "T001",
    "teacher_name": "李老师",
    "approval_result": "rejected",
    "approval_time": "2024-01-15T16:35:00Z",
    "approval_comment": "请假理由不充分，建议提供更详细的说明",
    "new_attendance_status": "absent",
    "course_info": {
      "course_name": "高等数学",
      "class_date": "2024-01-16"
    }
  }
}
```

## 权限控制

### 教师权限验证
- 仅限教师角色可以审批请假申请
- 只能审批自己课程的请假申请
- 验证教师对该课程的授课权限

### 申请状态验证
- 只能审批"待审批"状态的申请
- 已审批的申请不能重复审批
- 已撤回的申请不能审批

## 业务逻辑

### 审批权限验证
1. **教师身份**: 验证用户是否为教师角色
2. **课程权限**: 确认教师是否为该课程的授课教师
3. **申请状态**: 检查申请是否处于待审批状态
4. **时间有效性**: 可选择设置审批时间限制

### 审批处理流程
1. **验证权限**: 检查教师身份和课程权限
2. **验证状态**: 确认申请状态允许审批
3. **记录审批**: 保存审批结果、时间和意见
4. **更新状态**: 根据审批结果更新申请和记录状态
5. **发送通知**: 通知学生审批结果
6. **记录日志**: 记录审批操作日志

### 状态更新逻辑

#### 批准申请时
- **申请状态**: `leave_pending` → `leave`
- **记录状态**: `leave_pending` → `leave`
- **通知内容**: 请假申请已批准

#### 拒绝申请时
- **申请状态**: `leave_pending` → `leave_rejected`
- **记录状态**: `leave_pending` → `absent`
- **通知内容**: 请假申请已拒绝

### 审批记录保存
- 审批教师ID和姓名
- 审批时间（精确到秒）
- 审批结果（批准/拒绝）
- 审批意见（可选）
- 审批操作的IP地址和设备信息

## 错误处理

### 常见错误

| 错误代码 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 用户未认证 | 检查认证信息 |
| `FORBIDDEN` | 403 | 非教师用户或无课程权限 | 确认用户角色和课程权限 |
| `NOT_FOUND` | 404 | 申请不存在 | 确认申请ID正确 |
| `CONFLICT` | 409 | 申请已被审批 | 提示申请状态 |
| `BAD_REQUEST` | 400 | 审批结果无效或意见过长 | 检查请求参数 |

### 错误响应示例

```json
{
  "success": false,
  "message": "您无权审批此请假申请",
  "code": "FORBIDDEN",
  "data": {
    "course_teacher": "王老师",
    "current_user": "李老师"
  }
}
```

```json
{
  "success": false,
  "message": "申请已被审批，无法重复操作",
  "code": "CONFLICT",
  "data": {
    "application_status": "leave",
    "approved_by": "王老师",
    "approval_time": "2024-01-15T14:00:00Z"
  }
}
```

```json
{
  "success": false,
  "message": "审批意见过长，最多500个字符",
  "code": "BAD_REQUEST",
  "data": {
    "max_length": 500,
    "current_length": 650
  }
}
```

## 使用示例

### 批准申请

```bash
curl -X PUT "/api/icalink/v1/leave-applications/123/approval" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88" \
  -d '{
    "result": "approved",
    "comment": "病假批准，注意休息"
  }'
```

### 拒绝申请

```bash
curl -X PUT "/api/icalink/v1/leave-applications/124/approval" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88" \
  -d '{
    "result": "rejected",
    "comment": "请假理由不充分，建议提供更详细的说明"
  }'
```

### JavaScript调用示例

```javascript
// 审批请假申请
async function approveLeaveApplication(applicationId, result, comment = '') {
  try {
    const response = await fetch(`/api/icalink/v1/leave-applications/${applicationId}/approval`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': 'T001',
        'X-User-Type': 'teacher',
        'X-User-Name': encodeURIComponent('李老师')
      },
      body: JSON.stringify({
        result: result,
        comment: comment
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('审批成功:', data.data);
      const resultText = result === 'approved' ? '批准' : '拒绝';
      alert(`请假申请${resultText}成功`);
      return data.data;
    } else {
      console.error('审批失败:', data.message);
      alert(`审批失败: ${data.message}`);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('网络错误:', error);
    alert('网络错误，请重试');
    throw error;
  }
}

// 批准申请
function approveApplication(applicationId, comment) {
  return approveLeaveApplication(applicationId, 'approved', comment);
}

// 拒绝申请
function rejectApplication(applicationId, comment) {
  return approveLeaveApplication(applicationId, 'rejected', comment);
}

// 批量审批
async function batchApproval(applications, result, comment = '') {
  const results = [];
  for (const app of applications) {
    try {
      const result_data = await approveLeaveApplication(app.id, result, comment);
      results.push({ 
        id: app.id, 
        success: true, 
        data: result_data 
      });
    } catch (error) {
      results.push({ 
        id: app.id, 
        success: false, 
        error: error.message 
      });
    }
  }
  return results;
}
```

### Vue.js组件示例

```vue
<template>
  <div class="approval-panel">
    <div class="application-details">
      <h3>{{ application.student_name }} - {{ application.course_name }}</h3>
      <p><strong>请假类型:</strong> {{ leaveTypeText }}</p>
      <p><strong>请假原因:</strong> {{ application.leave_reason }}</p>
      <p><strong>申请时间:</strong> {{ formatTime(application.application_time) }}</p>
      <p><strong>课程日期:</strong> {{ application.class_date }}</p>
      
      <div v-if="application.has_attachments" class="attachments">
        <button @click="viewAttachments" class="btn btn-info">
          查看附件 ({{ application.attachment_count }}张)
        </button>
      </div>
    </div>

    <div class="approval-form" v-if="!approved">
      <h4>审批意见</h4>
      <textarea 
        v-model="comment" 
        placeholder="请输入审批意见（可选）"
        maxlength="500"
        rows="4"
      ></textarea>
      <div class="char-count">{{ comment.length }}/500</div>
      
      <div class="approval-actions">
        <button 
          @click="approve" 
          class="btn btn-success"
          :disabled="processing"
        >
          {{ processing && pendingAction === 'approve' ? '批准中...' : '批准' }}
        </button>
        <button 
          @click="reject" 
          class="btn btn-danger"
          :disabled="processing"
        >
          {{ processing && pendingAction === 'reject' ? '拒绝中...' : '拒绝' }}
        </button>
      </div>
    </div>

    <div v-else class="approval-result">
      <div class="alert" :class="approvalResult === 'approved' ? 'alert-success' : 'alert-danger'">
        <h4>审批完成</h4>
        <p>结果: {{ approvalResult === 'approved' ? '已批准' : '已拒绝' }}</p>
        <p v-if="approvalComment">意见: {{ approvalComment }}</p>
        <p>时间: {{ formatTime(approvalTime) }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    application: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      comment: '',
      processing: false,
      pendingAction: null,
      approved: false,
      approvalResult: null,
      approvalComment: null,
      approvalTime: null
    };
  },
  computed: {
    leaveTypeText() {
      const types = {
        sick: '病假',
        personal: '事假',
        emergency: '紧急事假',
        other: '其他'
      };
      return types[this.application.leave_type] || '未知';
    }
  },
  methods: {
    async approve() {
      if (!confirm('确定要批准这个请假申请吗？')) return;
      
      this.processing = true;
      this.pendingAction = 'approve';
      
      try {
        const result = await approveLeaveApplication(
          this.application.id, 
          'approved', 
          this.comment
        );
        this.handleApprovalSuccess(result);
      } catch (error) {
        // 错误已在函数内处理
      } finally {
        this.processing = false;
        this.pendingAction = null;
      }
    },
    
    async reject() {
      if (!confirm('确定要拒绝这个请假申请吗？')) return;
      
      this.processing = true;
      this.pendingAction = 'reject';
      
      try {
        const result = await approveLeaveApplication(
          this.application.id, 
          'rejected', 
          this.comment
        );
        this.handleApprovalSuccess(result);
      } catch (error) {
        // 错误已在函数内处理
      } finally {
        this.processing = false;
        this.pendingAction = null;
      }
    },
    
    handleApprovalSuccess(result) {
      this.approved = true;
      this.approvalResult = result.approval_result;
      this.approvalComment = result.approval_comment;
      this.approvalTime = result.approval_time;
      this.$emit('approved', result);
    },
    
    viewAttachments() {
      this.$emit('view-attachments', this.application.id);
    },
    
    formatTime(timeString) {
      return new Date(timeString).toLocaleString('zh-CN');
    }
  }
};
</script>
```

## 注意事项

1. **审批权限**: 只能审批自己课程的申请
2. **状态限制**: 只能审批待审批状态的申请
3. **不可撤销**: 审批操作不可撤销
4. **意见长度**: 审批意见最多500字符
5. **通知机制**: 审批后会自动通知学生
6. **记录完整性**: 所有审批信息都会永久保存
7. **时间记录**: 审批时间精确到秒
8. **日志追踪**: 所有审批操作都有完整日志

## 相关接口

- [查询请假信息接口](./API_01_LEAVE_QUERY.md) - 查看待审批申请
- [查看请假申请附件接口](./API_06_LEAVE_ATTACHMENTS.md) - 查看申请附件
- [本次课学生考勤信息查询接口](./API_09_CURRENT_ATTENDANCE.md) - 查看课程考勤状态
