# 考勤记录查询调试指南

## 问题描述

`getStudentCompleteData` 方法中的 `attendanceRecord` 需要从 `icalink_attendance_records` 表中获取数据，但可能没有正确实现数据库查询。

## 调试步骤

### 1. 检查数据库中是否有考勤记录

```sql
-- 查看考勤记录表中的数据
SELECT 
    id,
    attendance_course_id,
    student_id,
    student_name,
    status,
    created_at,
    updated_at
FROM icalink_attendance_records 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看特定学生的考勤记录
SELECT 
    ar.id,
    ar.attendance_course_id,
    ar.student_id,
    ar.student_name,
    ar.status,
    ac.course_name,
    ac.external_id
FROM icalink_attendance_records ar
LEFT JOIN icasync_attendance_courses ac ON ar.attendance_course_id = ac.id
WHERE ar.student_id = '你的学生ID'
ORDER BY ar.created_at DESC;
```

### 2. 检查课程表中的数据

```sql
-- 查看课程表中的数据
SELECT 
    id,
    external_id,
    course_code,
    course_name,
    start_time,
    end_time
FROM icasync_attendance_courses 
ORDER BY start_time DESC 
LIMIT 10;
```

### 3. 验证查询逻辑

在 `AttendanceService.getStudentCompleteData` 方法中，我已经添加了调试日志：

```typescript
// 查找学生的考勤记录
this.logger.info(
  { courseId: course.id, studentId: studentInfo.id },
  'Querying attendance record for student'
);

const recordResult = await this.attendanceRecordRepository.findByCourseAndStudent(
  course.id,
  studentInfo.id
);

let attendanceRecord = null;
if (isSuccessResult(recordResult)) {
  attendanceRecord = recordResult.data;
  this.logger.info(
    { 
      courseId: course.id, 
      studentId: studentInfo.id, 
      recordId: attendanceRecord?.id,
      status: attendanceRecord?.status 
    },
    'Found attendance record for student'
  );
} else {
  this.logger.info(
    { 
      courseId: course.id, 
      studentId: studentInfo.id, 
      error: recordResult.error?.message 
    },
    'No attendance record found for student'
  );
}
```

### 4. 检查日志输出

启动应用后，访问学生端页面，查看日志输出：

```bash
# 查看应用日志
tail -f logs/app.log | grep "attendance record"

# 或者查看特定的日志文件
grep "Querying attendance record" logs/*.log
grep "Found attendance record" logs/*.log
grep "No attendance record found" logs/*.log
```

### 5. 可能的问题和解决方案

#### 问题1：课程ID不匹配
- **现象**：日志显示查询了，但没有找到记录
- **原因**：`course.id` 与数据库中的 `attendance_course_id` 不匹配
- **解决**：检查传入的 `course` 对象的 `id` 字段是否正确

#### 问题2：学生ID不匹配
- **现象**：日志显示查询了，但没有找到记录
- **原因**：`studentInfo.id` 与数据库中的 `student_id` 不匹配
- **解决**：检查学生ID的格式和值

#### 问题3：数据库连接问题
- **现象**：查询报错
- **原因**：数据库连接配置错误
- **解决**：检查数据库连接配置

#### 问题4：表不存在或字段不匹配
- **现象**：SQL错误
- **原因**：表结构与代码不匹配
- **解决**：检查数据库迁移是否正确执行

### 6. 手动测试查询

可以在数据库中手动执行查询来验证：

```sql
-- 模拟 findByCourseAndStudent 的查询
SELECT * FROM icalink_attendance_records 
WHERE attendance_course_id = 你的课程ID 
AND student_id = '你的学生ID';
```

### 7. 验证 Repository 方法

检查 `AttendanceRecordRepository.findByCourseAndStudent` 方法：

```typescript
async findByCourseAndStudent(
  courseId: number,
  studentId: string
): Promise<ServiceResult<IcalinkAttendanceRecord | null>> {
  return wrapServiceCall(async () => {
    const result = await this.findOne((qb) =>
      qb
        .where('attendance_course_id', '=', courseId)
        .where('student_id', '=', studentId)
    );

    if (!result.success) {
      throw new Error(
        result.error?.message || 'Failed to find attendance record'
      );
    }

    return extractOptionFromServiceResult<IcalinkAttendanceRecord>(result);
  }, ServiceErrorCode.DATABASE_ERROR);
}
```

### 8. 测试数据准备

如果数据库中没有测试数据，可以手动插入一条记录：

```sql
-- 插入测试考勤记录
INSERT INTO icalink_attendance_records (
    attendance_course_id,
    student_id,
    student_name,
    status,
    created_by
) VALUES (
    你的课程ID,
    '你的学生ID',
    '测试学生',
    'leave_pending',
    '你的学生ID'
);
```

### 9. 前端验证

在前端页面中，检查返回的数据：

```javascript
// 在浏览器控制台中检查
console.log('attendance_status:', attendanceData?.data?.attendance_status);
```

应该看到：
- 如果有考勤记录：`status` 应该是数据库中的实际状态（如 `'leave_pending'`）
- 如果没有考勤记录：`status` 应该是基于课程状态的默认值（如 `'not_started'`）

## 预期结果

修复后的系统应该：

1. **正确查询数据库**：从 `icalink_attendance_records` 表中查询学生的考勤记录
2. **正确返回状态**：如果有考勤记录，返回记录中的 `status` 字段
3. **正确处理空记录**：如果没有考勤记录，返回基于课程状态的默认值
4. **前端正确响应**：请假按钮根据 `attendance_status.status` 正确显示状态

通过以上调试步骤，可以确定问题所在并进行相应的修复。
