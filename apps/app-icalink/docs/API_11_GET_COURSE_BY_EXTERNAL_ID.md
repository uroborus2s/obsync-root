# API_11: 根据external_id获取课程信息接口

## 接口概述

根据外部ID获取课程详细信息的API接口。

## 接口信息

- **URL**: `/api/icalink/v1/courses/external/:external_id`
- **方法**: `GET`
- **认证**: 需要用户身份认证

## 请求参数

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| external_id | string | 是 | 课程外部ID，长度1-200字符 |

### 请求示例

```http
GET /api/icalink/v1/courses/external/course-001 HTTP/1.1
Host: api.example.com
Authorization: Bearer <token>
Content-Type: application/json
```

## 响应格式

### 成功响应 (200)

```json
{
  "success": true,
  "message": "课程信息获取成功",
  "data": {
    "id": 1,
    "external_id": "course-001",
    "course_code": "CS101",
    "course_name": "计算机基础",
    "semester": "2024-1",
    "teaching_week": 1,
    "week_day": 1,
    "teacher_codes": "001,002",
    "teacher_names": "张老师,李老师",
    "class_location": "教学楼A101",
    "start_time": "2024-01-01T08:00:00.000Z",
    "end_time": "2024-01-01T10:00:00.000Z",
    "time_period": "am",
    "attendance_enabled": true,
    "periods": "1-2",
    "attendance_start_offset": -30,
    "attendance_end_offset": 60,
    "late_threshold": 10,
    "auto_absent_after": 60,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z",
    "teacher_info": [
      {
        "teacher_id": "001",
        "teacher_name": "张老师",
        "department": null
      },
      {
        "teacher_id": "002",
        "teacher_name": "李老师",
        "department": null
      }
    ]
  }
}
```

### 错误响应

#### 400 - 参数错误

```json
{
  "success": false,
  "message": "外部ID参数无效",
  "code": "INVALID_EXTERNAL_ID"
}
```

#### 404 - 课程不存在

```json
{
  "success": false,
  "message": "课程不存在",
  "code": "COURSE_NOT_FOUND"
}
```

#### 500 - 服务器错误

```json
{
  "success": false,
  "message": "获取课程信息失败",
  "code": "COURSE_FETCH_ERROR"
}
```

## 响应字段说明

### 课程基本信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | number | 课程内部ID |
| external_id | string | 课程外部ID |
| course_code | string | 课程代码 |
| course_name | string | 课程名称 |
| semester | string | 学期 |
| teaching_week | number | 教学周 |
| week_day | number | 星期几(1-7) |
| teacher_codes | string | 教师工号列表(逗号分隔) |
| teacher_names | string | 教师姓名列表(逗号分隔) |
| class_location | string | 上课地点 |

### 时间信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| start_time | string | 开始时间(ISO 8601格式) |
| end_time | string | 结束时间(ISO 8601格式) |
| time_period | string | 时间段(am/pm) |
| periods | string | 节次 |

### 考勤配置

| 字段名 | 类型 | 说明 |
|--------|------|------|
| attendance_enabled | boolean | 是否启用考勤 |
| attendance_start_offset | number | 考勤开始时间偏移(分钟) |
| attendance_end_offset | number | 考勤结束时间偏移(分钟) |
| late_threshold | number | 迟到阈值(分钟) |
| auto_absent_after | number | 自动标记缺勤时间(分钟) |

### 教师信息

| 字段名 | 类型 | 说明 |
|--------|------|------|
| teacher_info | array | 教师信息列表 |
| teacher_info[].teacher_id | string | 教师工号 |
| teacher_info[].teacher_name | string | 教师姓名 |
| teacher_info[].department | string | 所属部门(可为null) |

### 元数据

| 字段名 | 类型 | 说明 |
|--------|------|------|
| created_at | string | 创建时间(ISO 8601格式) |
| updated_at | string | 更新时间(ISO 8601格式) |

## 实现说明

### 数据源

- 数据来源：`icasync_attendance_courses` 数据库表
- 查询条件：根据 `external_id` 字段进行精确匹配

### 架构层次

1. **Controller层**: `AttendanceController.getCourseByExternalId`
   - 参数验证
   - 调用Repository层获取数据
   - 数据格式转换
   - 错误处理

2. **Repository层**: `AttendanceCourseRepository.findByExternalId`
   - 数据库查询
   - 结果封装

### 错误处理

- 参数验证失败：返回400错误
- 课程不存在：返回404错误
- 数据库错误：返回500错误
- 系统异常：返回500错误

### 日志记录

- 请求开始：记录external_id和用户信息
- 成功响应：记录external_id和课程ID
- 错误情况：记录详细错误信息

## 使用示例

### JavaScript/TypeScript

```typescript
const response = await fetch('/api/icalink/v1/courses/external/course-001', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();

if (result.success) {
  console.log('课程信息:', result.data);
  console.log('课程名称:', result.data.course_name);
  console.log('教师列表:', result.data.teacher_info);
} else {
  console.error('获取失败:', result.message);
}
```

### cURL

```bash
curl -X GET \
  "https://api.example.com/api/icalink/v1/courses/external/course-001" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## 注意事项

1. **external_id格式**: 支持字母、数字、特殊字符，长度限制1-200字符
2. **时间格式**: 所有时间字段均为ISO 8601格式的UTC时间
3. **教师信息**: 从teacher_codes和teacher_names字段解析，支持多个教师
4. **空值处理**: 可选字段为null时不影响接口正常返回
5. **性能考虑**: 单次查询，响应时间通常在100ms以内

## 测试用例

详见测试文件：`src/tests/controllers/getCourseByExternalId.test.ts`

包含以下测试场景：
- 成功获取课程信息
- 参数验证
- 课程不存在
- 数据库错误
- 教师信息处理
- 边界情况处理
