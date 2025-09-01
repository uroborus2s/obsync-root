# 多附件上传错误修复

## 问题描述

学生请假接口在上传多个附件时报错：

```json
{
    "success": false,
    "message": "Cannot read properties of undefined (reading 'toString')",
    "code": "DATABASE_ERROR"
}
```

## 问题原因分析

### 1. 主要问题

错误发生在 `LeaveService.processLeaveAttachments` 方法中，具体原因：

1. **附件ID获取失败**：`createResult.data.id` 可能为undefined
2. **签到记录ID获取失败**：`(record as any).insertId` 可能为undefined
3. **数据库返回格式不一致**：不同情况下返回的数据结构不同

### 2. 错误位置

#### 2.1 附件创建后ID获取
```typescript
// 原有问题代码
if (createResult.success) {
  const createdAttachment = createResult.data;
  if (createdAttachment && createdAttachment.id) {  // createdAttachment.id 可能undefined
    attachmentIds.push(createdAttachment.id);
  }
}
```

#### 2.2 签到记录ID获取
```typescript
// 原有问题代码
const applicationData = {
  attendance_record_id: (record as any).insertId.toString(),  // insertId 可能undefined
  // ...
};
```

## 修复方案

### 1. 增强附件ID获取逻辑

```typescript
if (createResult.success && createResult.data) {
  // 处理不同的返回数据格式
  let attachmentId: number = 0;
  
  if (typeof createResult.data === 'number') {
    // 直接返回ID
    attachmentId = createResult.data;
  } else if (typeof createResult.data === 'object') {
    // 返回对象，尝试获取ID
    const data = createResult.data as any;
    attachmentId = data.id || data.insertId || data.value?.id || data.value?.insertId || 0;
  }
  
  if (attachmentId > 0) {
    attachmentIds.push(attachmentId);
    totalSize += image.size;
  } else {
    errors.push({
      fileName: image.name,
      error: '无法获取附件ID'
    });
  }
}
```

### 2. 增强签到记录ID获取逻辑

```typescript
// 创建请假申请
const attendanceRecordId = (record as any).id || (record as any).insertId;
if (!attendanceRecordId) {
  throw new Error('无法获取签到记录ID，请假申请创建失败');
}

const applicationData = {
  attendance_record_id: attendanceRecordId.toString(),
  // ...
};
```

### 3. 增强错误处理和日志

```typescript
// 成功上传日志
this.logger.debug(
  { 
    fileName: image.name, 
    attachmentId, 
    size: image.size 
  },
  'Attachment uploaded successfully'
);

// 失败处理日志
this.logger.error(
  { 
    fileName: image.name, 
    createResultData: createResult.data 
  },
  'Failed to get attachment ID from create result'
);
```

## 修复后的完整流程

### 1. 附件处理流程

```
前端上传多个附件
    ↓
LeaveService.uploadAttachments
    ↓
格式化附件数据 (file_name → name, file_content → content)
    ↓
LeaveService.processLeaveAttachments
    ↓
循环处理每个附件:
  - 验证文件类型和大小
  - Base64解码
  - 创建数据库记录
  - 安全获取附件ID (多种格式兼容)
  - 记录成功/失败信息
    ↓
返回处理结果 (uploadedCount, attachmentIds, errors)
```

### 2. 数据库返回格式兼容

支持以下几种可能的返回格式：

| 返回类型 | 示例 | ID获取方式 |
|---------|------|-----------|
| 数字 | `123` | 直接使用 |
| 对象-直接ID | `{id: 123}` | `data.id` |
| 对象-insertId | `{insertId: 123}` | `data.insertId` |
| 嵌套对象 | `{value: {id: 123}}` | `data.value.id` |

### 3. 错误处理策略

- **部分成功**：某些附件上传成功，某些失败
- **完全失败**：所有附件都上传失败
- **详细错误信息**：每个失败的附件都有具体错误原因

## 测试验证

### 1. 测试场景

#### 场景1：单个附件上传
```bash
curl -X POST "http://localhost:3001/api/icalink/v1/leave-applications" \
  -H "Content-Type: application/json" \
  -H "Cookie: userType=student; userId=student123" \
  -d '{
    "attendance_record_id": "20242025200113205600320242025241pm",
    "leave_type": "sick",
    "leave_reason": "感冒发烧",
    "attachments": [
      {
        "file_name": "test1.jpg",
        "file_type": "image/jpeg",
        "file_size": 1024000,
        "file_content": "base64_encoded_content..."
      }
    ]
  }'
```

#### 场景2：多个附件上传
```bash
curl -X POST "http://localhost:3001/api/icalink/v1/leave-applications" \
  -H "Content-Type: application/json" \
  -H "Cookie: userType=student; userId=student123" \
  -d '{
    "attendance_record_id": "20242025200113205600320242025241pm",
    "leave_type": "sick", 
    "leave_reason": "感冒发烧",
    "attachments": [
      {
        "file_name": "test1.jpg",
        "file_type": "image/jpeg", 
        "file_size": 1024000,
        "file_content": "base64_content1..."
      },
      {
        "file_name": "test2.png",
        "file_type": "image/png",
        "file_size": 2048000, 
        "file_content": "base64_content2..."
      }
    ]
  }'
```

### 2. 预期结果

#### 成功响应
```json
{
  "success": true,
  "message": "请假申请提交成功",
  "data": {
    "application_id": 123,
    "student_id": "student123",
    "status": "leave_pending",
    "application_time": "2024-01-15 10:30:00"
  }
}
```

#### 部分失败响应
```json
{
  "success": true,
  "message": "请假申请提交成功，部分附件上传失败",
  "data": {
    "application_id": 123,
    "uploaded_attachments": 1,
    "failed_attachments": [
      {
        "fileName": "test2.png",
        "error": "文件大小不能超过10MB"
      }
    ]
  }
}
```

## 监控和日志

### 1. 关键日志点

- 附件处理开始：记录附件数量
- 单个附件处理：记录文件名、大小、结果
- 附件处理完成：记录成功数量、失败数量、总大小

### 2. 错误监控

```bash
# 查看附件相关错误
tail -f logs/app.log | grep "attachment"

# 查看数据库相关错误  
tail -f logs/app.log | grep "DATABASE_ERROR"
```

## 相关文件

- `apps/app-icalink/src/services/LeaveService.ts` - 主要修复文件
- `apps/app-icalink/src/repositories/LeaveAttachmentRepository.ts` - 附件数据访问
- `apps/agendaedu-app/src/pages/Leave.tsx` - 前端上传逻辑
