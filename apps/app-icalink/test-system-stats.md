# 系统级别全局统计接口测试文档

## 接口信息

**接口路径**: `GET /api/icalink/v1/attendance/overall-stats`

**功能**: 获取系统级别的全局统计数据，包括课程总数、学生总数、考勤统计等

## 修改内容

### 1. Repository层 (AttendanceStatsRepository.ts)
- 新增 `getSystemOverallStats()` 方法
- 实现7个核心统计查询：
  - 系统课程总数 (icasync_calendar_mapping)
  - 系统学生总数 (out_xsxx)
  - 开启考勤的课程数 (icasync_attendance_courses)
  - 总考勤人次 (out_jw_kcb_xs + icasync_attendance_courses)
  - 系统整体出勤率 (icalink_attendance_records)
  - 今日活跃课程数
  - 总签到记录数

### 2. Service层 (AttendanceService.ts)
- 新增 `getSystemOverallStats()` 方法
- 调用Repository层获取统计数据
- 添加错误处理和日志记录

### 3. Controller层 (AttendanceController.ts)
- 修改 `getOverallStats()` 方法
- 移除教师权限限制，允许系统级用户访问
- 调用新的系统统计服务

### 4. 接口定义更新
- IAttendanceStatsRepository: 添加 `getSystemOverallStats()` 接口
- IAttendanceService: 添加 `getSystemOverallStats()` 接口

## 返回数据结构

```typescript
{
  success: true,
  data: {
    total_courses: number,           // 系统课程总数
    total_students: number,          // 系统学生总数  
    attendance_enabled_courses: number, // 开启考勤的课程数
    total_attendance_capacity: number,  // 总考勤人次（所有课程学生数之和）
    average_attendance_rate: number,    // 系统整体出勤率
    active_courses_today: number,       // 今日活跃课程数
    total_checkin_records: number       // 总签到记录数
  }
}
```

## 测试用例

### 1. 基本功能测试
```bash
curl -X GET "http://localhost:3001/api/icalink/v1/attendance/overall-stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 权限测试
- ✅ 已登录用户可以访问
- ❌ 未登录用户返回401

### 3. 数据验证
- 验证返回的数字都是非负整数
- 验证出勤率在0-100之间
- 验证数据的逻辑一致性

## 数据库查询说明

### 1. 课程总数统计
```sql
SELECT COUNT(DISTINCT kkh) as total_courses 
FROM icasync_calendar_mapping
```

### 2. 学生总数统计
```sql
SELECT COUNT(*) as total_students 
FROM out_xsxx 
WHERE zt IS NULL OR zt NOT IN ('毕业', '退学')
```

### 3. 开启考勤的课程数
```sql
SELECT COUNT(DISTINCT course_code) as attendance_enabled_courses
FROM icasync_attendance_courses
WHERE attendance_enabled = true
```

### 4. 总考勤人次计算
```sql
SELECT COALESCE(SUM(student_count), 0) as total_attendance_capacity
FROM (
  SELECT kkh, COUNT(DISTINCT xh) as student_count
  FROM out_jw_kcb_xs 
  WHERE kkh IN (
    SELECT DISTINCT course_code 
    FROM icasync_attendance_courses 
    WHERE attendance_enabled = true
  )
  GROUP BY kkh
) course_students
```

### 5. 系统整体出勤率
```sql
SELECT 
  CASE 
    WHEN COUNT(ar.id) > 0 THEN 
      ROUND(
        (SUM(
          CASE 
            WHEN ar.status = 'present' THEN 1 
            ELSE 0 
          END
        )::numeric / COUNT(ar.id)::numeric) * 100, 
        2
      )
    ELSE 0 
  END as average_attendance_rate
FROM icalink_attendance_records ar
INNER JOIN icasync_attendance_courses c ON ar.attendance_course_id = c.id
WHERE c.attendance_enabled = true
```

## 性能优化建议

1. **索引优化**:
   - icasync_calendar_mapping.kkh
   - out_xsxx.zt
   - icasync_attendance_courses.attendance_enabled
   - icalink_attendance_records.status

2. **缓存策略**:
   - 考虑添加Redis缓存，缓存时间5-10分钟
   - 在数据更新时清除相关缓存

3. **查询优化**:
   - 考虑将多个查询合并为一个复杂查询
   - 使用数据库视图预计算部分统计数据

## 注意事项

1. **数据一致性**: 确保统计数据反映真实的业务状态
2. **性能影响**: 大数据量时可能影响响应时间，建议添加缓存
3. **权限控制**: 当前移除了教师权限限制，根据需要可以调整
4. **错误处理**: 已添加完整的错误处理和日志记录
