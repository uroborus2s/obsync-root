# 撤回后再次请假的逻辑说明

## 问题背景

在原有的实现中，撤回请假申请后无法再次提交请假申请，因为重复检查逻辑会检查所有状态的请假申请，包括已取消的申请。

## 修复方案

### 1. 问题分析

**原有逻辑问题**：
```typescript
// 原有的检查逻辑
const existingApplication = await this.leaveApplicationRepository.findByAttendanceRecord(recordId);
if (existingApplication.data) {
  throw new Error('该签到记录已存在请假申请'); // 包括已取消的申请
}
```

**问题**：
- 撤回操作只是将状态改为 `cancelled`，记录仍然存在
- 重复检查会找到已取消的申请，阻止新的申请

### 2. 修复实现

#### 2.1 新增Repository方法

在 `LeaveApplicationRepository` 中新增方法：

```typescript
/**
 * 根据签到记录ID查找有效的请假申请（排除已取消的申请）
 */
async findActiveByAttendanceRecord(
  attendanceRecordId: number
): Promise<ServiceResult<IcalinkLeaveApplication | null>> {
  return wrapServiceCall(async () => {
    const result = await this.findOne((qb) =>
      qb
        .where('attendance_record_id', '=', attendanceRecordId)
        .where('status', '!=', 'cancelled')  // 排除已取消的申请
    );
    
    return extractOptionFromServiceResult<IcalinkLeaveApplication>(result);
  }, ServiceErrorCode.DATABASE_ERROR);
}
```

#### 2.2 更新Service逻辑

在 `LeaveService.submitLeaveApplication` 中更新检查逻辑：

```typescript
// 检查是否已存在有效的请假申请（排除已取消的申请）
if (record && record.id) {
  const activeApplication = await this.leaveApplicationRepository.findActiveByAttendanceRecord(record.id);
  if (isSuccessResult(activeApplication) && activeApplication.data) {
    const app = activeApplication.data;
    throw new Error(`该签到记录已存在有效的请假申请，当前状态：${app.status}`);
  }
}
```

#### 2.3 更新接口定义

在 `ILeaveApplicationRepository` 接口中添加新方法定义。

## 完整流程说明

### 3.1 撤回请假申请流程

1. **状态更新**：
   - `icalink_leave_applications.status`: `leave_pending/leave/leave_rejected` → `cancelled`
   - `icalink_attendance_records.status`: `leave_pending/leave` → `absent`
   - `icalink_leave_approvals.approval_result`: `pending` → `cancelled`

2. **数据保留**：
   - 所有记录都保留在数据库中
   - 不删除任何数据，只更新状态
   - 保持完整的审计追踪

### 3.2 再次请假申请流程

1. **重复检查**：
   - 使用 `findActiveByAttendanceRecord` 方法
   - 只检查非 `cancelled` 状态的申请
   - 允许在已取消申请的基础上创建新申请

2. **新申请创建**：
   - 创建新的请假申请记录
   - 更新签到记录状态为 `leave_pending`
   - 创建新的审批记录

## 状态转换图

```
初始状态: absent
    ↓ (提交请假)
leave_pending
    ↓ (撤回)
cancelled + absent
    ↓ (再次请假)
leave_pending (新记录)
```

## 数据库状态示例

### 撤回前
```sql
-- icalink_leave_applications
id=1, attendance_record_id=100, status='leave_pending'

-- icalink_attendance_records  
id=100, status='leave_pending'
```

### 撤回后
```sql
-- icalink_leave_applications
id=1, attendance_record_id=100, status='cancelled'

-- icalink_attendance_records
id=100, status='absent'
```

### 再次请假后
```sql
-- icalink_leave_applications
id=1, attendance_record_id=100, status='cancelled'  -- 旧记录保留
id=2, attendance_record_id=100, status='leave_pending'  -- 新记录

-- icalink_attendance_records
id=100, status='leave_pending'  -- 状态更新
```

## 测试场景

### 场景1：正常撤回后再次请假
1. 学生提交请假申请 → 成功
2. 学生撤回请假申请 → 成功
3. 学生再次提交请假申请 → 成功 ✅

### 场景2：有效申请存在时的重复检查
1. 学生提交请假申请 → 成功
2. 学生再次提交请假申请 → 失败（提示已存在有效申请）✅

### 场景3：多次撤回和重新申请
1. 学生提交请假申请 → 成功
2. 学生撤回请假申请 → 成功
3. 学生再次提交请假申请 → 成功
4. 学生再次撤回请假申请 → 成功
5. 学生第三次提交请假申请 → 成功 ✅

## 注意事项

1. **数据完整性**：所有历史记录都会保留，便于审计和统计
2. **性能考虑**：查询时需要过滤状态，建议在 `status` 字段上建立索引
3. **业务规则**：撤回后的再次申请被视为全新的申请，需要重新审批
4. **时间限制**：撤回和再次申请都需要在课程开始前完成

## 相关文件

- `apps/app-icalink/src/services/LeaveService.ts`
- `apps/app-icalink/src/repositories/LeaveApplicationRepository.ts`
- `apps/app-icalink/src/repositories/interfaces/ILeaveApplicationRepository.ts`
