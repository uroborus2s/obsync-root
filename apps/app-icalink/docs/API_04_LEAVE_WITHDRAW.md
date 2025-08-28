# 4. 撤回请假申请接口

## 接口概述

学生撤回请假申请接口，仅限学生使用。只能撤回"待审批"状态的申请，撤回后恢复签到记录状态。

## 接口规范

- **HTTP方法**: `DELETE`
- **路径**: `/api/icalink/v1/leave-applications/:application_id`
- **权限**: 仅限学生
- **认证方式**: 通过HTTP请求头获取用户信息，无需额外认证流程

## 请求参数

### 路径参数 (Path Parameters)

```typescript
interface WithdrawPathParams {
  application_id: string; // 请假申请ID
}
```

### 请求体 (Request Body)

```typescript
interface WithdrawRequest {
  reason?: string; // 撤回原因（可选）
}
```

### 参数说明

| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| application_id | string | ✅ | 请假申请ID |
| reason | string | ❌ | 撤回原因，最多200字符 |

## 响应格式

### 成功响应

```typescript
interface WithdrawResponse {
  success: boolean;
  message: string;
  data: {
    application_id: number;
    student_id: string;
    original_status: string;
    new_status: 'cancelled';
    withdraw_time: string;          // ISO 8601 格式
    withdraw_reason?: string;
    attendance_record: {
      record_id: number;
      original_status: string;
      new_status: 'absent';
    };
  };
}
```

### 响应示例

```json
{
  "success": true,
  "message": "请假申请撤回成功",
  "data": {
    "application_id": 123,
    "student_id": "20210001",
    "original_status": "leave_pending",
    "new_status": "cancelled",
    "withdraw_time": "2024-01-15T14:30:00Z",
    "withdraw_reason": "身体已恢复，不需要请假了",
    "attendance_record": {
      "record_id": 456,
      "original_status": "leave_pending",
      "new_status": "absent"
    }
  }
}
```

## 权限控制

### 学生权限验证
- 仅限学生角色可以撤回申请
- 只能撤回自己提交的请假申请
- 验证申请的所有权

### 状态限制
- 只能撤回"待审批"状态的申请
- 已审批的申请不能撤回
- 已取消的申请不能重复撤回

## 业务逻辑

### 撤回条件验证
1. **申请存在性**: 验证申请ID是否存在
2. **所有权验证**: 确认申请属于当前学生
3. **状态检查**: 只允许撤回待审批状态的申请
4. **时间限制**: 可选择设置撤回时间限制

### 撤回处理流程
1. **验证权限**: 检查学生身份和申请所有权
2. **验证状态**: 确认申请状态允许撤回
3. **更新申请**: 将申请状态更新为"已取消"
4. **恢复记录**: 将签到记录状态恢复为"缺勤"
5. **记录日志**: 记录撤回时间和原因
6. **发送通知**: 通知相关教师申请已撤回

### 状态变更逻辑
- **申请状态**: `leave_pending` → `cancelled`
- **记录状态**: `leave_pending` → `absent`
- **撤回时间**: 记录撤回的具体时间
- **撤回原因**: 可选的撤回说明

## 错误处理

### 常见错误

| 错误代码 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 用户未认证 | 检查认证信息 |
| `FORBIDDEN` | 403 | 非学生用户或非本人申请 | 确认用户角色和申请所有权 |
| `NOT_FOUND` | 404 | 申请不存在 | 确认申请ID正确 |
| `CONFLICT` | 409 | 申请已被审批，无法撤回 | 提示申请状态 |
| `BAD_REQUEST` | 400 | 撤回原因过长 | 检查原因长度 |

### 错误响应示例

```json
{
  "success": false,
  "message": "申请不存在或已被删除",
  "code": "NOT_FOUND"
}
```

```json
{
  "success": false,
  "message": "申请已被审批，无法撤回",
  "code": "CONFLICT",
  "data": {
    "application_status": "leave",
    "approval_time": "2024-01-15T12:00:00Z",
    "approved_by": "李老师"
  }
}
```

```json
{
  "success": false,
  "message": "您无权撤回此申请",
  "code": "FORBIDDEN",
  "data": {
    "application_owner": "20210002",
    "current_user": "20210001"
  }
}
```

## 使用示例

### 基本撤回

```bash
curl -X DELETE "/api/icalink/v1/leave-applications/123" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89"
```

### 带撤回原因

```bash
curl -X DELETE "/api/icalink/v1/leave-applications/123" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89" \
  -d '{
    "reason": "身体已恢复，不需要请假了"
  }'
```

### JavaScript调用示例

```javascript
// 撤回请假申请
async function withdrawLeaveApplication(applicationId, reason = '') {
  try {
    const response = await fetch(`/api/icalink/v1/leave-applications/${applicationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': '20210001',
        'X-User-Type': 'student',
        'X-User-Name': encodeURIComponent('张三')
      },
      body: reason ? JSON.stringify({ reason }) : undefined
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('撤回成功:', result.data);
      alert('请假申请撤回成功');
      return result.data;
    } else {
      console.error('撤回失败:', result.message);
      alert(`撤回失败: ${result.message}`);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('网络错误:', error);
    alert('网络错误，请重试');
    throw error;
  }
}

// 确认撤回对话框
function confirmWithdraw(applicationId) {
  const reason = prompt('请输入撤回原因（可选）:');
  if (reason !== null) { // 用户点击了确定
    withdrawLeaveApplication(applicationId, reason)
      .then(() => {
        // 刷新页面或更新UI
        location.reload();
      })
      .catch(error => {
        console.error('撤回失败:', error);
      });
  }
}

// 批量撤回（如果需要）
async function batchWithdrawApplications(applicationIds, reason = '') {
  const results = [];
  for (const id of applicationIds) {
    try {
      const result = await withdrawLeaveApplication(id, reason);
      results.push({ id, success: true, data: result });
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  }
  return results;
}
```

### Vue.js组件示例

```vue
<template>
  <div class="leave-application-item">
    <div class="application-info">
      <h3>{{ application.course_name }}</h3>
      <p>请假类型: {{ leaveTypeText }}</p>
      <p>申请时间: {{ formatTime(application.application_time) }}</p>
      <p>状态: {{ statusText }}</p>
    </div>
    
    <div class="actions" v-if="canWithdraw">
      <button 
        @click="showWithdrawDialog = true"
        class="btn btn-warning"
        :disabled="withdrawing"
      >
        {{ withdrawing ? '撤回中...' : '撤回申请' }}
      </button>
    </div>

    <!-- 撤回确认对话框 -->
    <div v-if="showWithdrawDialog" class="modal">
      <div class="modal-content">
        <h4>确认撤回申请</h4>
        <p>撤回后将无法恢复，确定要撤回这个请假申请吗？</p>
        <textarea 
          v-model="withdrawReason" 
          placeholder="撤回原因（可选）"
          maxlength="200"
        ></textarea>
        <div class="modal-actions">
          <button @click="confirmWithdraw" class="btn btn-danger">确认撤回</button>
          <button @click="showWithdrawDialog = false" class="btn btn-secondary">取消</button>
        </div>
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
      showWithdrawDialog: false,
      withdrawReason: '',
      withdrawing: false
    };
  },
  computed: {
    canWithdraw() {
      return this.application.status === 'leave_pending';
    },
    leaveTypeText() {
      const types = {
        sick: '病假',
        personal: '事假',
        emergency: '紧急事假',
        other: '其他'
      };
      return types[this.application.leave_type] || '未知';
    },
    statusText() {
      const statuses = {
        leave_pending: '待审批',
        leave: '已批准',
        leave_rejected: '已拒绝',
        cancelled: '已撤回'
      };
      return statuses[this.application.status] || '未知';
    }
  },
  methods: {
    async confirmWithdraw() {
      this.withdrawing = true;
      try {
        await withdrawLeaveApplication(this.application.id, this.withdrawReason);
        this.showWithdrawDialog = false;
        this.withdrawReason = '';
        this.$emit('withdrawn', this.application.id);
      } catch (error) {
        // 错误已在函数内处理
      } finally {
        this.withdrawing = false;
      }
    },
    formatTime(timeString) {
      return new Date(timeString).toLocaleString('zh-CN');
    }
  }
};
</script>
```

## 注意事项

1. **撤回时机**: 只能撤回待审批状态的申请
2. **不可恢复**: 撤回操作不可恢复
3. **状态恢复**: 撤回后签到记录恢复为缺勤状态
4. **时间限制**: 可能有撤回时间限制（根据业务需求）
5. **通知机制**: 撤回后会通知相关教师
6. **原因记录**: 撤回原因会被永久记录
7. **权限验证**: 只能撤回自己的申请
8. **日志记录**: 所有撤回操作都会记录日志

## 相关接口

- [查询请假信息接口](./API_01_LEAVE_QUERY.md) - 查看申请状态
- [学生请假申请接口](./API_03_LEAVE_APPLICATION.md) - 提交申请
- [审批请假申请接口](./API_05_LEAVE_APPROVAL.md) - 教师审批
