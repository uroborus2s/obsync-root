# 1. 查询请假信息接口

## 接口概述

支持学生和教师角色查询请假申请信息，根据用户类型返回不同的数据范围。学生只能查询自己的请假申请，教师可以查询自己课程的所有学生请假申请。

## 接口规范

- **HTTP方法**: `GET`
- **路径**: `/api/icalink/v1/leave-applications`
- **权限**: 学生/教师
- **认证方式**: 通过HTTP请求头获取用户信息，无需额外认证流程

## 请求参数

### 查询参数 (Query Parameters)

```typescript
interface LeaveQueryParams {
  status?: 'all' | 'leave_pending' | 'leave' | 'leave_rejected' | 'cancelled';
  start_date?: string; // YYYY-MM-DD 格式
  end_date?: string;   // YYYY-MM-DD 格式
  course_id?: string;  // 课程ID（教师查询特定课程）
  student_id?: string; // 学生ID（教师查询特定学生）
  page?: number;       // 页码，默认1
  page_size?: number;  // 每页大小，默认20，最大100
}
```

### 参数说明

| 参数名 | 类型 | 必需 | 默认值 | 说明 |
|-------|------|------|--------|------|
| status | string | ❌ | 'all' | 请假状态筛选 |
| start_date | string | ❌ | - | 开始日期，格式：YYYY-MM-DD |
| end_date | string | ❌ | - | 结束日期，格式：YYYY-MM-DD |
| course_id | string | ❌ | - | 课程ID（仅教师可用） |
| student_id | string | ❌ | - | 学生ID（仅教师可用） |
| page | number | ❌ | 1 | 页码 |
| page_size | number | ❌ | 20 | 每页大小 |

## 响应格式

### 成功响应

```typescript
interface LeaveApplicationsResponse {
  success: boolean;
  message: string;
  data: {
    applications: Array<{
      id: number;
      attendance_record_id: number;
      student_id: string;
      student_name: string;
      class_name?: string;
      course_name?: string;
      teacher_name?: string;
      leave_type: 'sick' | 'personal' | 'emergency' | 'other';
      leave_reason: string;
      status: 'leave_pending' | 'leave' | 'leave_rejected' | 'cancelled';
      application_time: string;    // ISO 8601 格式
      class_date: string;          // YYYY-MM-DD 格式
      approval_time?: string;      // ISO 8601 格式
      approval_comment?: string;
      has_attachments: boolean;
      attachment_count: number;
    }>;
    pagination: {
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    };
  };
}
```

### 响应示例

```json
{
  "success": true,
  "message": "查询请假申请成功",
  "data": {
    "applications": [
      {
        "id": 123,
        "attendance_record_id": 456,
        "student_id": "20210001",
        "student_name": "张三",
        "class_name": "2021级1班",
        "course_name": "高等数学",
        "teacher_name": "李老师",
        "leave_type": "sick",
        "leave_reason": "感冒发烧，需要休息",
        "status": "leave_pending",
        "application_time": "2024-01-15T10:30:00Z",
        "class_date": "2024-01-16",
        "approval_time": null,
        "approval_comment": null,
        "has_attachments": true,
        "attachment_count": 2
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "page_size": 20,
      "total_pages": 1
    }
  }
}
```

## 权限控制

### 学生权限
- 只能查询自己的请假申请
- 系统自动过滤为当前学生的申请
- 忽略 `course_id` 和 `student_id` 参数

### 教师权限
- 可以查询自己授课课程的所有学生请假申请
- 可以使用 `course_id` 筛选特定课程
- 可以使用 `student_id` 筛选特定学生
- 只能查询自己有权限的课程数据

## 业务逻辑

### 数据筛选逻辑
1. **角色过滤**: 根据用户角色自动过滤数据范围
2. **状态筛选**: 支持按请假状态筛选
3. **时间范围**: 支持按申请时间或课程日期筛选
4. **课程筛选**: 教师可按课程筛选
5. **学生筛选**: 教师可按学生筛选

### 排序规则
- 默认按申请时间倒序排列
- 待审批的申请优先显示

### 分页处理
- 默认每页20条记录
- 最大每页100条记录
- 提供完整的分页信息

## 错误处理

### 常见错误

| 错误代码 | HTTP状态码 | 说明 | 解决方案 |
|---------|-----------|------|----------|
| `UNAUTHORIZED` | 401 | 用户未认证 | 检查认证信息 |
| `FORBIDDEN` | 403 | 权限不足 | 确认用户角色和权限 |
| `BAD_REQUEST` | 400 | 参数错误 | 检查请求参数格式 |
| `INTERNAL_ERROR` | 500 | 服务器错误 | 联系技术支持 |

### 错误响应示例

```json
{
  "success": false,
  "message": "日期格式错误，请使用YYYY-MM-DD格式",
  "code": "BAD_REQUEST"
}
```

## 使用示例

### 学生查询自己的请假申请

```bash
curl -X GET "/api/icalink/v1/leave-applications?status=leave_pending&page=1&page_size=10" \
  -H "X-User-Id: 20210001" \
  -H "X-User-Type: student" \
  -H "X-User-Name: %E5%BC%A0%E4%B8%89"
```

### 教师查询特定课程的请假申请

```bash
curl -X GET "/api/icalink/v1/leave-applications?course_id=123&status=all&start_date=2024-01-01&end_date=2024-01-31" \
  -H "X-User-Id: T001" \
  -H "X-User-Type: teacher" \
  -H "X-User-Name: %E6%9D%8E%E8%80%81%E5%B8%88"
```

### JavaScript调用示例

```javascript
// 学生查询
const response = await fetch('/api/icalink/v1/leave-applications?status=leave_pending', {
  method: 'GET',
  headers: {
    'X-User-Id': '20210001',
    'X-User-Type': 'student',
    'X-User-Name': encodeURIComponent('张三')
  }
});

const result = await response.json();
if (result.success) {
  console.log('请假申请列表:', result.data.applications);
} else {
  console.error('查询失败:', result.message);
}
```

## 注意事项

1. **时间格式**: 所有日期参数使用YYYY-MM-DD格式
2. **中文编码**: 请求头中的中文需要URL编码
3. **分页限制**: 单次查询最多返回100条记录
4. **权限验证**: 系统会自动验证用户对数据的访问权限
5. **缓存策略**: 查询结果可能有短暂缓存，实时性要求高的场景请注意
