# buildFutureTeacherView 方法实现说明

## 实现目标

实现 `buildFutureTeacherView` 方法的完整业务逻辑，返回未来课程的教学班数据和请假匹配数据。

## 实现方案

### 1. 数据源分析

#### 1.1 v_attendance_realtime_details 视图

该视图是核心数据源，包含以下关键信息：

```sql
CREATE VIEW v_attendance_realtime_details AS
SELECT
    sessions.id AS attendance_course_id,
    sessions.external_id,
    sessions.course_code,
    sessions.course_name,
    roster_u.student_id,
    roster_u.student_name,
    roster_u.class_name,
    roster_u.major_name,
    -- 计算最终状态（包括请假状态）
    CASE
        WHEN ar.manual_override_by IS NOT NULL THEN ar.status
        WHEN ar.status IN ('leave', 'leave_pending') THEN ar.status
        WHEN lw.window_id IS NOT NULL THEN ...
        WHEN ar.id IS NOT NULL THEN ar.status
        ELSE 'absent'
    END AS final_status
FROM
    icasync.icasync_attendance_courses AS sessions
JOIN
    syncdb.out_jw_kcb_xs AS roster_oxs ON ...
JOIN
    syncdb.out_xsxx AS roster_u ON ...
LEFT JOIN
    icalink_attendance_records ar ON ...
```

**关键特性**：
- 自动关联教学班学生（`out_jw_kcb_xs` + `out_xsxx`）
- 自动关联签到记录（`icalink_attendance_records`）
- 自动计算最终状态（包括请假状态）

#### 1.2 请假状态的处理

对于未来课程，学生可以提前请假：
1. 学生提交请假申请 → 创建 `icalink_attendance_records` 记录，状态为 `leave_pending`
2. 教师审批通过 → 更新记录状态为 `leave`
3. 教师审批拒绝 → 更新记录状态为 `leave_rejected`

`v_attendance_realtime_details` 视图会自动显示这些请假状态。

### 2. 实现逻辑

#### 2.1 使用现有的 Repository 方法

使用 `CourseStudentRepository.findStudentsWithRealtimeStatus` 方法：

```typescript
const result = await this.courseStudentRepository.findStudentsWithRealtimeStatus(
  course.course_code,
  course.semester,
  course.external_id
);
```

**该方法的功能**：
1. 查询教学班的所有学生（`out_jw_kcb_xs` + `out_xsxx`）
2. LEFT JOIN `v_attendance_realtime_details` 视图获取实时考勤状态
3. 计算统计信息（总人数、签到人数、请假人数等）
4. 按考勤状态排序（缺勤、请假、旷课的放在前面）

#### 2.2 返回数据结构

```typescript
const vo: TeacherCourseCompleteDataVO = {
  course,                    // 课程信息
  students: studentsWithStatus,  // 学生列表及其状态
  stats: {
    total_count: repositoryStats.total_count,
    checkin_count: 0,        // 未来课程还未开始签到
    absent_count: repositoryStats.absent_count,
    leave_count: repositoryStats.leave_count
  },
  status: 'not_started'      // 未来课程状态
};
```

### 3. 完整实现代码

```typescript
/**
 * 构建未来课程的教师视图
 * 数据源：v_attendance_realtime_details 视图
 *
 * @description
 * 未来课程的教师视图需要显示：
 * 1. 教学班的所有学生列表
 * 2. 学生的请假状态（如果有提前请假）
 * 3. 统计信息（总人数、请假人数等）
 *
 * 数据来源：
 * - 教学班学生：通过 CourseStudentRepository 查询
 * - 请假状态：通过 v_attendance_realtime_details 视图获取（视图会自动关联 icalink_attendance_records 表）
 */
private async buildFutureTeacherView(
  course: IcasyncAttendanceCourse
): Promise<Either<ServiceError, TeacherCourseCompleteDataVO>> {
  this.logger.debug({ courseId: course.id }, 'Building future teacher view');

  // 1. 通过 Repository 查询教学班学生及其实时考勤状态
  // 这个方法会关联 out_jw_kcb_xs、out_xsxx 和 v_attendance_realtime_details
  // 对于未来课程，v_attendance_realtime_details 视图会显示学生的请假状态（如果有提前请假）
  const result =
    await this.courseStudentRepository.findStudentsWithRealtimeStatus(
      course.course_code,
      course.semester,
      course.external_id
    );

  const { students: studentsWithStatus, stats: repositoryStats } = result;

  this.logger.debug(
    {
      courseId: course.id,
      totalStudents: repositoryStats.total_count,
      leaveCount: repositoryStats.leave_count
    },
    'Fetched future course students with leave status'
  );

  // 2. 构建返回数据
  // 对于未来课程，学生的状态可能是：
  // - 'absent': 默认状态（还未签到）
  // - 'leave': 已批准的请假
  // - 'leave_pending': 待审批的请假
  const vo: TeacherCourseCompleteDataVO = {
    course,
    students: studentsWithStatus,
    stats: {
      total_count: repositoryStats.total_count,
      checkin_count: 0, // 未来课程还未开始签到
      absent_count: repositoryStats.absent_count,
      leave_count: repositoryStats.leave_count
    },
    status: 'not_started'
  };

  return right(vo);
}
```

## 数据流程图

```
┌─────────────────────────────────────────────────────────────┐
│ buildFutureTeacherView(course)                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ CourseStudentRepository.findStudentsWithRealtimeStatus()    │
│ - 查询教学班学生（out_jw_kcb_xs + out_xsxx）                │
│ - LEFT JOIN v_attendance_realtime_details                   │
│ - 计算统计信息                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ v_attendance_realtime_details 视图                          │
│ - 关联 icasync_attendance_courses                           │
│ - 关联 out_jw_kcb_xs（教学班学生）                          │
│ - 关联 out_xsxx（学生信息）                                 │
│ - LEFT JOIN icalink_attendance_records（签到/请假记录）     │
│ - 计算 final_status（包括请假状态）                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 返回数据                                                     │
│ - students: 学生列表及其状态                                 │
│   - student_id, student_name, class_name, major_name        │
│   - absence_type: 'absent' | 'leave' | 'leave_pending'      │
│ - stats: 统计信息                                            │
│   - total_count: 总人数                                      │
│   - checkin_count: 0（未来课程）                             │
│   - absent_count: 缺勤人数                                   │
│   - leave_count: 请假人数                                    │
│ - status: 'not_started'                                     │
└─────────────────────────────────────────────────────────────┘
```

## 学生状态说明

对于未来课程，学生的 `absence_type` 可能是：

| 状态 | 说明 | 来源 |
|------|------|------|
| `absent` | 默认状态（还未签到） | 视图中 COALESCE(vard.final_status, 'absent') |
| `leave` | 已批准的请假 | icalink_attendance_records 表，status = 'leave' |
| `leave_pending` | 待审批的请假 | icalink_attendance_records 表，status = 'leave_pending' |

**注意**：未来课程不会有 `present`（已签到）或 `late`（迟到）状态，因为课程还未开始。

## 与其他视图方法的对比

### buildCurrentTeacherView（当前课程）

- 数据源：`v_attendance_realtime_details` 视图
- 状态：`absent`, `present`, `late`, `leave`, `leave_pending`, `truant`
- 特点：包含签到窗口信息（`attendance_window`）

### buildHistoricalTeacherView（历史课程）

- 数据源：`icalink_absent_student_relations` 表
- 状态：`absent`, `present`, `late`, `leave`, `truant`
- 特点：最终确定的考勤状态

### buildFutureTeacherView（未来课程）

- 数据源：`v_attendance_realtime_details` 视图
- 状态：`absent`, `leave`, `leave_pending`
- 特点：只显示请假状态，不包含签到数据

## 优势

1. **复用现有逻辑**：使用 `CourseStudentRepository.findStudentsWithRealtimeStatus` 方法，避免重复代码
2. **数据一致性**：与当前课程使用相同的数据源和查询逻辑
3. **自动关联**：`v_attendance_realtime_details` 视图自动处理请假状态的关联
4. **性能优化**：视图已经过性能优化（使用 STRAIGHT_JOIN 和索引）
5. **代码简洁**：实现逻辑清晰，易于维护

## 测试建议

### 1. 功能测试

- [ ] 未来课程返回教学班所有学生
- [ ] 学生默认状态为 `absent`
- [ ] 提前请假的学生状态为 `leave_pending`
- [ ] 审批通过的请假状态为 `leave`
- [ ] 统计信息正确（总人数、请假人数）

### 2. 边界测试

- [ ] 没有学生的课程
- [ ] 所有学生都请假的课程
- [ ] 部分学生请假的课程

### 3. 性能测试

- [ ] 大班级（100+ 学生）的查询性能
- [ ] 并发查询性能

## 总结

本次实现通过复用现有的 `CourseStudentRepository.findStudentsWithRealtimeStatus` 方法和 `v_attendance_realtime_details` 视图，成功实现了未来课程的教师视图功能。实现逻辑简洁、高效，与现有代码风格保持一致，符合 Stratix 框架的分层架构规范。

