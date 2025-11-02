# 课程日历功能优化 - 后端API文档

## 概述

本次优化将课程日历功能从树形结构改为分页列表模式，提供更好的性能和用户体验。

## 技术栈

- **框架**: Stratix (Fastify 5 + Awilix 12)
- **数据库**: MySQL (通过 Kysely 查询构建器)
- **架构**: Repository → Service → Controller 三层架构

---

## API接口列表

### 1. 获取日历-课程关联列表（主列表）

**接口地址**: `GET /api/icalink/v1/course-calendar/courses`

**功能描述**: 分页查询日历与课程的关联列表，支持搜索功能

**数据来源**: 
- `icasync_calendar_mapping` ⋈ `v_course_checkin_stats_summary`
- 关联字段: `icasync_calendar_mapping.kkh` = `v_course_checkin_stats_summary.course_code`

**请求参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码（从1开始） |
| page_size | number | 否 | 20 | 每页数量（1-100） |
| search | string | 否 | - | 搜索关键词（支持课程代码、课程名称、教师姓名、教师代码） |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "course_code": "CS101",
        "course_name": "计算机科学导论",
        "semester": "2024-2025-1",
        "teacher_name": "张三",
        "teacher_codes": "T001",
        "total_students": 50,
        "total_sessions": 16,
        "completed_sessions": 8,
        "present_count": 380,
        "leave_count": 15,
        "absent_count": 5,
        "attendance_rate": 95.0,
        "calendar_id": "cal_123456",
        "calendar_name": "2024秋季课表"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

**HTTP状态码**:
- `200`: 成功
- `400`: 参数错误
- `500`: 服务器内部错误

---

### 2. 获取课程的课节列表

**接口地址**: `GET /api/icalink/v1/course-calendar/courses/:course_code/sessions`

**功能描述**: 根据课程代码分页查询该课程的所有课节信息

**数据来源**: `icasync_attendance_courses`

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| course_code | string | 是 | 课程代码 |

**查询参数**:

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | number | 否 | 1 | 页码（从1开始） |
| page_size | number | 否 | 20 | 每页数量（1-100） |

**响应示例**:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "course_code": "CS101",
        "course_name": "计算机科学导论",
        "external_id": "ext_001",
        "start_time": "2024-09-01T08:00:00Z",
        "end_time": "2024-09-01T09:40:00Z",
        "location": "教学楼A101",
        "teacher_id": "T001",
        "teacher_name": "张三",
        "week_number": 1,
        "day_of_week": 1,
        "session_number": 1,
        "need_checkin": true,
        "created_at": "2024-08-20T10:00:00Z",
        "updated_at": "2024-08-20T10:00:00Z",
        "deleted_at": null
      }
    ],
    "total": 16,
    "page": 1,
    "page_size": 20,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

**HTTP状态码**:
- `200`: 成功
- `400`: 参数错误（课程代码为空或分页参数无效）
- `500`: 服务器内部错误

---

### 3. 获取课程分享人列表

**接口地址**: `GET /api/icalink/v1/course-calendar/:calendar_id/share-participants`

**功能描述**: 根据日历ID获取该课程的所有分享人信息

**数据来源**: WPS API (`wasV7ApiCalendar.getAllCalendarPermissions`)

**路径参数**:

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| calendar_id | string | 是 | 日历ID |

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "perm_001",
      "calendarId": "cal_123456",
      "userId": "user_001",
      "role": "owner"
    },
    {
      "id": "perm_002",
      "calendarId": "cal_123456",
      "userId": "user_002",
      "role": "editor"
    }
  ]
}
```

**HTTP状态码**:
- `200`: 成功
- `400`: 参数错误（日历ID为空）
- `404`: 日历不存在
- `500`: 服务器内部错误

---

## 数据库设计

### 表结构

#### 1. icasync_calendar_mapping（日历映射表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键 |
| calendar_id | varchar(255) | 日历ID |
| calendar_name | varchar(255) | 日历名称 |
| kkh | varchar(50) | 课程代码 |
| is_deleted | boolean | 是否删除 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### 2. v_course_checkin_stats_summary（课程签到统计汇总视图）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| course_code | varchar(50) | 课程代码 |
| course_name | varchar(255) | 课程名称 |
| semester | varchar(50) | 学期 |
| teacher_name | varchar(100) | 教师姓名 |
| teacher_codes | text | 教师代码（多个用逗号分隔） |
| total_students | int | 总学生数 |
| total_sessions | int | 总课节数 |
| completed_sessions | int | 已完成课节数 |
| present_count | int | 出勤次数 |
| leave_count | int | 请假次数 |
| absent_count | int | 缺勤次数 |
| attendance_rate | decimal(5,2) | 出勤率 |

#### 3. icasync_attendance_courses（考勤课程表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | bigint | 主键 |
| course_code | varchar(50) | 课程代码 |
| course_name | varchar(255) | 课程名称 |
| external_id | varchar(255) | 外部ID |
| start_time | timestamp | 开始时间 |
| end_time | timestamp | 结束时间 |
| location | varchar(255) | 上课地点 |
| teacher_id | varchar(50) | 教师ID |
| teacher_name | varchar(100) | 教师姓名 |
| week_number | int | 教学周 |
| day_of_week | int | 星期几（1-7） |
| session_number | int | 第几节课 |
| need_checkin | boolean | 是否需要签到 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |
| deleted_at | timestamp | 删除时间 |

---

## 代码结构

### Repository层

#### CalendarMappingRepository

**文件路径**: `apps/app-icalink/src/repositories/CalendarMappingRepository.ts`

**主要方法**:

```typescript
// 分页查询日历-课程关联列表
async findCalendarCoursesWithPagination(
  page: number,
  pageSize: number,
  searchKeyword?: string
): Promise<ICalendarCourseItem[]>

// 获取总数
async getCalendarCoursesTotalCount(
  searchKeyword?: string
): Promise<number>
```

#### AttendanceCoursesRepository

**文件路径**: `apps/app-icalink/src/repositories/AttendanceCoursesRepository.ts`

**主要方法**:

```typescript
// 根据课程代码分页查询课节
async findByCourseCodeWithPagination(
  courseCode: string,
  page: number,
  pageSize: number
): Promise<IcasyncAttendanceCourse[]>

// 获取总数
async getTotalCountByCourseCode(
  courseCode: string
): Promise<number>
```

### Service层

**文件路径**: `apps/app-icalink/src/services/CourseCalendarService.ts`

**主要方法**:

```typescript
// 分页查询日历-课程关联列表
async getCalendarCoursesWithPagination(
  page: number,
  pageSize: number,
  searchKeyword?: string
): Promise<ServiceResult<PaginatedResult<ICalendarCourseItem>>>

// 根据课程代码分页查询课节列表
async getCourseSessionsByCourseCode(
  courseCode: string,
  page: number,
  pageSize: number
): Promise<ServiceResult<PaginatedResult<IcasyncAttendanceCourse>>>

// 根据日历ID获取课程分享人列表
async getCourseShareParticipants(
  calendarId: string
): Promise<ServiceResult<CalendarParticipant[]>>
```

### Controller层

**文件路径**: `apps/app-icalink/src/controllers/CourseCalendarController.ts`

**路由注册**:

```typescript
@Get('/api/icalink/v1/course-calendar/courses')
async getCalendarCourses(...)

@Get('/api/icalink/v1/course-calendar/courses/:course_code/sessions')
async getCourseSessions(...)

@Get('/api/icalink/v1/course-calendar/:calendar_id/share-participants')
async getCourseShareParticipants(...)
```

---

## 前端集成指南

### 1. 主列表页面

**功能**:
- 显示日历-课程关联列表
- 支持分页（每页20条）
- 支持搜索（课程代码、课程名称、教师姓名、教师代码）
- 每行显示"查看详情"按钮

**API调用**:
```typescript
GET /api/icalink/v1/course-calendar/courses?page=1&page_size=20&search=计算机
```

### 2. 详情页面（Tab页）

#### Tab 1: 课节列表

**功能**:
- 显示该课程的所有课节
- 支持分页（每页20条）

**API调用**:
```typescript
GET /api/icalink/v1/course-calendar/courses/CS101/sessions?page=1&page_size=20
```

#### Tab 2: 分享人列表

**功能**:
- 显示该课程的所有分享人
- 不分页（一次性返回所有数据）

**API调用**:
```typescript
GET /api/icalink/v1/course-calendar/cal_123456/share-participants
```

---

## 测试建议

### 1. 单元测试

- Repository层：测试数据库查询逻辑
- Service层：测试业务逻辑和参数验证
- Controller层：测试HTTP请求处理和响应格式

### 2. 集成测试

- 测试完整的请求-响应流程
- 测试分页功能
- 测试搜索功能
- 测试错误处理

### 3. 性能测试

- 测试大数据量下的分页性能
- 测试搜索性能
- 测试并发请求处理

---

## 注意事项

1. **分页参数验证**: 
   - `page` 必须 >= 1
   - `page_size` 必须在 1-100 之间

2. **搜索功能**: 
   - 使用模糊匹配（LIKE）
   - 支持多字段搜索（OR条件）

3. **错误处理**: 
   - 统一使用 `ServiceResult` 格式
   - 提供清晰的错误信息和错误代码

4. **性能优化**: 
   - 使用数据库索引
   - 限制每页最大数量为100
   - 使用JOIN查询减少数据库访问次数

5. **数据一致性**: 
   - 软删除记录不显示（`is_deleted = false`, `deleted_at IS NULL`）
   - 按时间排序（课节列表按 `start_time` 升序）

---

## 更新日志

### 2025-11-02

- ✅ 创建 `AttendanceCoursesRepository`
- ✅ 更新 `CalendarMappingRepository`，添加主列表查询方法
- ✅ 更新 `CourseCalendarService`，实现三个新方法
- ✅ 更新 `CourseCalendarController`，添加三个新API接口
- ✅ 所有代码通过TypeScript编译
- ✅ 应用成功启动，路由注册成功

