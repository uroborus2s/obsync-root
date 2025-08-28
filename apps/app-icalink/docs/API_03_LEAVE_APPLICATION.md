# 3. 学生请假申请接口

## 接口概述

学生请假申请接口，仅限学生使用。支持上传图片附件，自动生成缩略图，更新对应签到记录状态。

## 接口规范

- **HTTP方法**: `POST`
- **路径**: `/api/icalink/v1/leave-applications`
- **权限**: 仅限学生
- **认证方式**: 通过HTTP请求头获取用户信息，无需额外认证流程

## 请求参数

### 请求体 (Request Body)

```typescript
interface LeaveApplicationRequest {
  attendance_record_id: number;           // 关联的签到记录ID
  leave_type: 'sick' | 'personal' | 'emergency' | 'other';
  leave_reason: string;                   // 请假原因（最少5字符）
  images?: Array<{                        // 图片附件（可选）
    name: string;                         // 文件名
    type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    size: number;                         // 文件大小（字节）
    content: string;                      // Base64编码的图片内容
  }>;
}
```

### 参数说明

| 参数名 | 类型 | 必需 | 说明 |
|-------|------|------|------|
| attendance_record_id | number | ✅ | 关联的签到记录ID |
| leave_type | string | ✅ | 请假类型 |
| leave_reason | string | ✅ | 请假原因，最少5个字符 |
| images | array | ❌ | 图片附件数组，最多5张 |

### 请假类型说明

| 类型值 | 中文名称 | 说明 |
|-------|---------|------|
| sick | 病假 | 因疾病需要请假 |
| personal | 事假 | 因个人事务需要请假 |
| emergency | 紧急事假 | 紧急情况需要请假 |
| other | 其他 | 其他原因请假 |

### 图片要求

- **格式**: 支持 JPEG、PNG、GIF、WebP
- **大小**: 单张图片最大10MB
- **数量**: 最多上传5张图片
- **编码**: 使用Base64编码

## 响应格式

### 成功响应

```typescript
interface LeaveApplicationResponse {
  success: boolean;
  message: string;
  data: {
    application_id: number;
    attendance_record_id: number;
    student_id: string;
    student_name: string;
    course_name: string;
    teacher_name: string;
    leave_type: string;
    leave_reason: string;
    status: 'leave_pending';
    application_time: string;       // ISO 8601 格式
    class_date: string;             // YYYY-MM-DD 格式
    uploaded_images: number;        // 上传的图片数量
  };
}
```

### 响应示例

```json
{
  "success": true,
  "message": "请假申请提交成功",
  "data": {
    "application_id": 123,
    "attendance_record_id": 456,
    "student_id": "20210001",
    "student_name": "张三",
    "course_name": "高等数学",
    "teacher_name": "李老师",
    "leave_type": "sick",
    "leave_reason": "感冒发烧，需要休息治疗",
    "status": "leave_pending",
    "application_time": "2024-01-15T10:30:00Z",
    "class_date": "2024-01-16",
    "uploaded_images": 2
  }
}
```

## 权限控制

### 学生权限验证
- 仅限学生角色可以提交请假申请
- 验证签到记录属于当前学生
- 检查学生对该课程的访问权限

### 记录状态验证
- 只能对"缺勤"状态的记录申请请假
- 已有请假申请的记录不能重复申请
- 已签到的记录不能申请请假

## 业务逻辑

### 请假申请流程
1. **验证权限**: 检查学生身份和记录权限
2. **验证状态**: 确认记录状态允许申请请假
3. **保存申请**: 创建请假申请记录
4. **处理附件**: 保存图片附件并生成缩略图
5. **更新状态**: 将签到记录状态更新为"请假待审批"
6. **发送通知**: 通知相关教师有新的请假申请

### 图片处理逻辑
1. **格式验证**: 检查图片格式是否支持
2. **大小验证**: 检查图片大小是否超限
3. **内容解码**: 解码Base64图片内容
4. **尺寸获取**: 获取图片宽度和高度
5. **缩略图生成**: 自动生成200x200的缩略图
6. **数据保存**: 保存原图和缩略图到数据库

### 数据验证规则
- 请假原因最少5个字符，最多500个字符
- 图片文件名不能包含特殊字符
- 图片内容必须是有效的Base64编码
- 单张图片大小不超过10MB
- 总图片数量不超过5张

## 错误处理

### 常见错误

| 错误代码 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 用户未认证 | 检查认证信息 |
| `FORBIDDEN` | 403 | 非学生用户或无记录权限 | 确认用户角色和权限 |
| `BAD_REQUEST` | 400 | 请假原因过短或图片格式错误 | 检查请求参数 |
| `NOT_FOUND` | 404 | 签到记录不存在 | 确认记录ID正确 |
| `CONFLICT` | 409 | 该记录已有请假申请 | 提示重复申请 |
| `PAYLOAD_TOO_LARGE` | 413 | 图片文件过大 | 压缩图片后重试 |
| `UNPROCESSABLE_ENTITY` | 422 | 记录状态不允许请假 | 检查记录状态 |

### 错误响应示例

```json
{
  "success": false,
  "message": "请假原因至少需要5个字符",
  "code": "BAD_REQUEST"
}
```

```json
{
  "success": false,
  "message": "该签到记录已有请假申请，无法重复申请",
  "code": "CONFLICT",
  "data": {
    "existing_application_id": 123,
    "application_status": "leave_pending"
  }
}
```

```json
{
  "success": false,
  "message": "图片文件过大，单张图片不能超过10MB",
  "code": "PAYLOAD_TOO_LARGE",
  "data": {
    "max_size": 10485760,
    "received_size": 15728640
  }
}
```

## 使用示例

### 基本请假申请

```bash
curl -X POST "/api/icalink/v1/leave-applications" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89" \
  -d '{
    "attendance_record_id": 456,
    "leave_type": "sick",
    "leave_reason": "感冒发烧，需要休息治疗"
  }'
```

### 带图片附件的请假申请

```bash
curl -X POST "/api/icalink/v1/leave-applications" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89" \
  -d '{
    "attendance_record_id": 456,
    "leave_type": "sick",
    "leave_reason": "感冒发烧，需要休息治疗，附上医院诊断证明",
    "images": [
      {
        "name": "diagnosis.jpg",
        "type": "image/jpeg",
        "size": 1024000,
        "content": "/9j/4AAQSkZJRgABAQEAYABgAAD..."
      }
    ]
  }'
```

### JavaScript调用示例

```javascript
// 文件转Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]; // 移除data:image/jpeg;base64,前缀
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// 提交请假申请
async function submitLeaveApplication(recordId, leaveType, reason, imageFiles = []) {
  try {
    // 处理图片文件
    const images = [];
    for (const file of imageFiles) {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`图片 ${file.name} 超过10MB限制`);
      }
      
      const content = await fileToBase64(file);
      images.push({
        name: file.name,
        type: file.type,
        size: file.size,
        content: content
      });
    }

    const response = await fetch('/api/icalink/v1/leave-applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': '20210001',
        'X-User-Type': 'student',
        'X-User-Name': encodeURIComponent('张三')
      },
      body: JSON.stringify({
        attendance_record_id: recordId,
        leave_type: leaveType,
        leave_reason: reason,
        images: images
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('请假申请提交成功:', result.data);
      alert('请假申请提交成功，等待教师审批');
    } else {
      console.error('提交失败:', result.message);
      alert(`提交失败: ${result.message}`);
    }
  } catch (error) {
    console.error('错误:', error);
    alert(`提交失败: ${error.message}`);
  }
}

// 使用示例
const fileInput = document.getElementById('imageFiles');
const files = Array.from(fileInput.files);

submitLeaveApplication(
  456,                    // 签到记录ID
  'sick',                 // 请假类型
  '感冒发烧，需要休息',    // 请假原因
  files                   // 图片文件数组
);
```

## 注意事项

1. **请假时机**: 只能对缺勤记录申请请假
2. **原因长度**: 请假原因至少5个字符
3. **图片限制**: 单张最大10MB，总数最多5张
4. **格式支持**: 仅支持常见图片格式
5. **Base64编码**: 确保图片正确编码
6. **网络超时**: 上传大图片时注意网络超时
7. **重复申请**: 每个记录只能申请一次请假
8. **状态更新**: 申请后记录状态自动更新

## 相关接口

- [查询请假信息接口](./API_01_LEAVE_QUERY.md) - 查看申请状态
- [撤回请假申请接口](./API_04_LEAVE_WITHDRAW.md) - 撤回申请
- [查看请假申请附件接口](./API_06_LEAVE_ATTACHMENTS.md) - 查看附件
