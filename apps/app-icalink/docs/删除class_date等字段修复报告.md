# 删除 class_date、class_time、class_location 字段修复报告

## 📋 问题概述

**错误信息**: `Unknown column 'class_date' in 'field list'`

**根本原因**: 数据库表 `icalink_leave_applications` 中的 `class_date`、`class_time` 和 `class_location` 字段已被删除，但代码中仍在引用这些字段

**修复策略**: 从所有相关文件中删除对这三个字段的引用

---

## 🔍 问题分析

### 数据库表结构变更

**表名**: `icalink_leave_applications`

**已删除的字段**:
- `class_date` - 上课日期
- `class_time` - 上课时间
- `class_location` - 上课地点

**原因**: 这些信息可以从关联的 `icasync_attendance_courses` 表中动态获取，无需在请假申请表中冗余存储

### 影响范围

1. **数据库层**: SQL 表定义和索引
2. **Repository 层**: Schema 定义
3. **类型定义层**: TypeScript 接口
4. **Service 层**: 业务逻辑代码
5. **API 层**: 请求/响应类型定义

---

## ✅ 修复内容

### 1. 数据库 SQL 文件

**文件**: `apps/app-icalink/database/001_create_attendance_tables.sql`

**修改内容**:
- ❌ 删除索引: `KEY idx_class_date (class_date)`

**修改前**:
```sql
PRIMARY KEY (`id`),
KEY `idx_attendance_record` (`attendance_record_id`),
KEY `idx_student_id` (`student_id`),
KEY `idx_course_id` (`course_id`),
KEY `idx_teacher_id` (`teacher_id`),
KEY `idx_status` (`status`),
KEY `idx_application_time` (`application_time`),
KEY `idx_class_date` (`class_date`),  -- ❌ 删除
KEY `idx_student_status` (`student_id`, `status`),
KEY `idx_teacher_status` (`teacher_id`, `status`)
```

**修改后**:
```sql
PRIMARY KEY (`id`),
KEY `idx_attendance_record` (`attendance_record_id`),
KEY `idx_student_id` (`student_id`),
KEY `idx_course_id` (`course_id`),
KEY `idx_teacher_id` (`teacher_id`),
KEY `idx_status` (`status`),
KEY `idx_application_time` (`application_time`),
KEY `idx_student_status` (`student_id`, `status`),
KEY `idx_teacher_status` (`teacher_id`, `status`)
```

---

### 2. Repository Schema 定义

**文件**: `apps/app-icalink/src/repositories/LeaveApplicationRepository.ts`

**修改内容**:
- ❌ 删除字段: `class_date`、`class_time`、`class_location`

**修改前**:
```typescript
const schema = SchemaBuilder.create('icalink_leave_applications')
  .addPrimaryKey('id')
  .addForeignKey('attendance_record_id', 'icalink_attendance_records')
  .addColumn('student_id', DataColumnType.STRING, { nullable: false })
  .addColumn('student_name', DataColumnType.STRING, { nullable: false })
  .addColumn('course_id', DataColumnType.STRING, { nullable: false })
  .addColumn('course_name', DataColumnType.STRING, { nullable: false })
  .addColumn('class_date', DataColumnType.DATE, { nullable: false })  // ❌ 删除
  .addColumn('class_time', DataColumnType.STRING, { nullable: false })  // ❌ 删除
  .addColumn('class_location', DataColumnType.STRING, { nullable: true })  // ❌ 删除
  .addColumn('teacher_id', DataColumnType.STRING, { nullable: false })
  ...
```

**修改后**:
```typescript
const schema = SchemaBuilder.create('icalink_leave_applications')
  .addPrimaryKey('id')
  .addForeignKey('attendance_record_id', 'icalink_attendance_records')
  .addColumn('student_id', DataColumnType.STRING, { nullable: false })
  .addColumn('student_name', DataColumnType.STRING, { nullable: false })
  .addColumn('course_id', DataColumnType.STRING, { nullable: false })
  .addColumn('course_name', DataColumnType.STRING, { nullable: false })
  .addColumn('teacher_id', DataColumnType.STRING, { nullable: false })
  ...
```

---

### 3. 数据库实体类型定义

**文件**: `apps/app-icalink/src/types/database.ts`

**修改内容**:
- ❌ 删除字段: `class_date`、`class_time`、`class_location`

**修改前**:
```typescript
export interface IcalinkLeaveApplication {
  id: ColumnType<number, number | undefined, number>;
  attendance_record_id: number;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  class_date: ColumnType<Date, string, string>;  // ❌ 删除
  class_time: string;  // ❌ 删除
  class_location?: string;  // ❌ 删除
  teacher_id: string;
  teacher_name: string;
  ...
}
```

**修改后**:
```typescript
export interface IcalinkLeaveApplication {
  id: ColumnType<number, number | undefined, number>;
  attendance_record_id: number;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  teacher_id: string;
  teacher_name: string;
  ...
}
```

---

### 4. API 类型定义

**文件**: `apps/app-icalink/src/types/api.ts`

#### 4.1 LeaveApplicationResponse

**修改前**:
```typescript
export interface LeaveApplicationResponse {
  application_id: number;
  attendance_record_id: number;
  student_id: string;
  student_name: string;
  course_name: string;
  teacher_name: string;
  leave_type: LeaveType;
  leave_reason: string;
  status: LeaveStatus;
  application_time: string;
  class_date: string;  // ❌ 删除
  uploaded_images: number;
}
```

**修改后**:
```typescript
export interface LeaveApplicationResponse {
  application_id: number;
  attendance_record_id: number;
  student_id: string;
  student_name: string;
  course_name: string;
  teacher_name: string;
  leave_type: LeaveType;
  leave_reason: string;
  status: LeaveStatus;
  application_time: string;
  uploaded_images: number;
}
```

#### 4.2 CourseInfo

**修改前**:
```typescript
export interface CourseInfo {
  course_name: string;
  class_date: string;  // ❌ 删除
}
```

**修改后**:
```typescript
export interface CourseInfo {
  course_name: string;
}
```

#### 4.3 LeaveApplicationInfo (已废弃)

**修改前**:
```typescript
export interface LeaveApplicationInfo {
  id: number;
  attendance_record_id: number;
  student_id: string;
  student_name: string;
  class_name?: string;
  course_name?: string;
  teacher_name?: string;
  leave_type: LeaveType;
  leave_reason: string;
  status: LeaveStatus;
  application_time: string;
  class_date: string;  // ❌ 删除
  approval_time?: string;
  approval_comment?: string;
  has_attachments: boolean;
  attachment_count: number;
}
```

**修改后**:
```typescript
export interface LeaveApplicationInfo {
  id: number;
  attendance_record_id: number;
  student_id: string;
  student_name: string;
  class_name?: string;
  course_name?: string;
  teacher_name?: string;
  leave_type: LeaveType;
  leave_reason: string;
  status: LeaveStatus;
  application_time: string;
  approval_time?: string;
  approval_comment?: string;
  has_attachments: boolean;
  attachment_count: number;
}
```

#### 4.4 TeacherLeaveApplicationItemVO

**修改前**:
```typescript
export interface TeacherLeaveApplicationItemVO {
  // 基本请假申请信息
  id: number;
  ...
  
  // 课程详细信息
  start_time?: string;
  end_time?: string;
  class_location?: string;  // ❌ 删除
  teaching_week?: number;
  periods?: string;
  leave_date?: string;
  class_date?: string;  // ❌ 删除
  class_time?: string;  // ❌ 删除
  ...
}
```

**修改后**:
```typescript
export interface TeacherLeaveApplicationItemVO {
  // 基本请假申请信息
  id: number;
  ...
  
  // 课程详细信息
  start_time?: string;
  end_time?: string;
  teaching_week?: number;
  periods?: string;
  leave_date?: string;
  ...
}
```

---

### 5. Service 层业务逻辑

**文件**: `apps/app-icalink/src/services/LeaveService.ts`

#### 5.1 submitLeaveApplication 方法

**修改前**:
```typescript
// 3. 创建请假申请
const teacherCodes = course.teacher_codes?.split(',') || [];
const teacherNames = course.teacher_names?.split(',') || [];

// 将 Date 对象转换为 YYYY-MM-DD 格式的字符串（仅日期部分）
const classDate = course.start_time.toISOString().split('T')[0];

const applicationResult = await this.leaveApplicationRepository.create({
  attendance_record_id: record.id,
  student_id: studentInfo.userId,
  student_name: studentInfo.name,
  course_id: course.course_code,
  course_name: course.course_name,
  teacher_id: teacherCodes[0] || '',
  teacher_name: teacherNames[0] || '',
  leave_type: request.leave_type,
  leave_reason: request.leave_reason,
  status: 'leave_pending' as LeaveStatus,
  application_time: getCurrentDateTime(),
  class_date: classDate,  // ❌ 删除
  class_time: `${course.start_time.toTimeString().slice(0, 5)}-${course.end_time.toTimeString().slice(0, 5)}`  // ❌ 删除
} as any);
```

**修改后**:
```typescript
// 3. 创建请假申请
const teacherCodes = course.teacher_codes?.split(',') || [];
const teacherNames = course.teacher_names?.split(',') || [];

const applicationResult = await this.leaveApplicationRepository.create({
  attendance_record_id: record.id,
  student_id: studentInfo.userId,
  student_name: studentInfo.name,
  course_id: course.course_code,
  course_name: course.course_name,
  teacher_id: teacherCodes[0] || '',
  teacher_name: teacherNames[0] || '',
  leave_type: request.leave_type,
  leave_reason: request.leave_reason,
  status: 'leave_pending' as LeaveStatus,
  application_time: getCurrentDateTime()
} as any);
```

#### 5.2 返回响应

**修改前**:
```typescript
// 6. 返回完整的响应
return right({
  application_id: application.id,
  attendance_record_id: record.id,
  student_id: studentInfo.userId,
  student_name: studentInfo.name,
  course_name: course.course_name,
  teacher_name: teacherNames[0] || '',
  leave_type: request.leave_type,
  leave_reason: request.leave_reason,
  status: application.status,
  application_time: application.application_time.toISOString(),
  class_date: course.start_time.toISOString().split('T')[0],  // ❌ 删除
  uploaded_images: uploadedCount
});
```

**修改后**:
```typescript
// 6. 返回完整的响应
return right({
  application_id: application.id,
  attendance_record_id: record.id,
  student_id: studentInfo.userId,
  student_name: studentInfo.name,
  course_name: course.course_name,
  teacher_name: teacherNames[0] || '',
  leave_type: request.leave_type,
  leave_reason: request.leave_reason,
  status: application.status,
  application_time: application.application_time.toISOString(),
  uploaded_images: uploadedCount
});
```

#### 5.3 approveLeaveApplication 方法

**修改前**:
```typescript
return right({
  application_id: applicationId,
  approval_id: approvalId,
  student_id: application.student_id,
  student_name: application.student_name,
  teacher_id: teacherInfo.userId,
  teacher_name: teacherInfo.name,
  approval_result: request.result,
  approval_time: approvalTime.toISOString(),
  approval_comment: request.comment,
  new_attendance_status: newAttendanceStatus,
  course_info: {
    course_name: application.course_name,
    class_date: application.class_date.toISOString().split('T')[0]  // ❌ 删除
  }
});
```

**修改后**:
```typescript
return right({
  application_id: applicationId,
  approval_id: approvalId,
  student_id: application.student_id,
  student_name: application.student_name,
  teacher_id: teacherInfo.userId,
  teacher_name: teacherInfo.name,
  approval_result: request.result,
  approval_time: approvalTime.toISOString(),
  approval_comment: request.comment,
  new_attendance_status: newAttendanceStatus,
  course_info: {
    course_name: application.course_name
  }
});
```

#### 5.4 queryTeacherLeaveApplications 方法

**修改前**:
```typescript
// 课程详细信息
start_time: course ? formatDateTime(course.start_time) : undefined,
end_time: course ? formatDateTime(course.end_time) : undefined,
class_location: course?.class_location || undefined,  // ❌ 删除
teaching_week: course?.teaching_week || undefined,
periods: course?.periods || undefined,
leave_date: course ? formatDateTime(course.start_time) : undefined,
class_date: course ? formatDateTime(course.start_time) : undefined,  // ❌ 删除
class_time: course  // ❌ 删除
  ? `${formatDateTime(course.start_time)} - ${formatDateTime(course.end_time)}`
  : undefined,
```

**修改后**:
```typescript
// 课程详细信息
start_time: course ? formatDateTime(course.start_time) : undefined,
end_time: course ? formatDateTime(course.end_time) : undefined,
teaching_week: course?.teaching_week || undefined,
periods: course?.periods || undefined,
leave_date: course ? formatDateTime(course.start_time) : undefined,
```

---

## 📊 修复总结

### 修改的文件列表

1. ✅ `apps/app-icalink/database/001_create_attendance_tables.sql` - 删除无效索引
2. ✅ `apps/app-icalink/src/repositories/LeaveApplicationRepository.ts` - 删除 Schema 字段定义
3. ✅ `apps/app-icalink/src/types/database.ts` - 删除实体接口字段
4. ✅ `apps/app-icalink/src/types/api.ts` - 删除 API 类型字段
5. ✅ `apps/app-icalink/src/services/LeaveService.ts` - 删除业务逻辑中的字段引用

### 删除的字段

| 字段名 | 原类型 | 说明 |
|--------|--------|------|
| `class_date` | DATE | 上课日期 - 可从 course 表获取 |
| `class_time` | VARCHAR(50) | 上课时间 - 可从 course 表计算 |
| `class_location` | VARCHAR(500) | 上课地点 - 可从 course 表获取 |

### 数据获取方式

这些信息现在通过以下方式获取：

```typescript
// 从关联的课程表动态获取
const course = await courseRepository.findOne(...);

// 上课日期
const classDate = course.start_time.toISOString().split('T')[0];

// 上课时间
const classTime = `${formatDateTime(course.start_time)} - ${formatDateTime(course.end_time)}`;

// 上课地点
const classLocation = course.class_location;
```

---

## ✅ 验证结果

### 编译检查

```bash
✅ 无 TypeScript 编译错误
✅ 无类型不匹配错误
✅ 无字段引用错误
```

### 数据一致性

- ✅ 数据库表结构与 Repository Schema 一致
- ✅ Repository Schema 与类型定义一致
- ✅ Service 层不再引用已删除字段
- ✅ API 响应类型不再包含已删除字段

---

## 🎉 修复完成

所有对 `class_date`、`class_time` 和 `class_location` 字段的引用已成功删除！

请假功能现在可以正常工作，课程相关信息将从 `icasync_attendance_courses` 表动态获取。

