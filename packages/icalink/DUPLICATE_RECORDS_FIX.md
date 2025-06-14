# 请假申请接口重复记录修复

## 问题描述

在`/api/attendance/leave-applications`接口中，发现返回了重复的记录。虽然数据库中只有一条请假申请记录，但接口返回了两条相同的记录。

### 问题现象
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "32b54d04-b8d4-4fdf-b345-34c9b5d8bf86",
        "course_name": "数据库技术及应用",
        // ... 其他字段
      },
      {
        "id": "32b54d04-b8d4-4fdf-b345-34c9b5d8bf86",
        "course_name": "数据库技术及应用",
        // ... 相同的字段值
      }
    ],
    "total": 2,  // 错误：应该是1
    "stats": {
      "total_count": 1  // 正确：统计查询显示只有1条记录
    }
  }
}
```

## 问题原因

问题出现在`StudentAttendanceRepository.getStudentLeaveApplications()`方法中的SQL查询。原查询使用了LEFT JOIN连接`u_jw_kcb_cur`表来获取教室信息：

```sql
SELECT ...
FROM icalink_student_attendance sa
INNER JOIN icalink_attendance_records ar ON sa.attendance_record_id = ar.id
LEFT JOIN u_jw_kcb_cur kcb ON kcb.kkh = ar.kkh AND kcb.rq = ar.rq
WHERE sa.leave_reason IS NOT NULL 
  AND sa.leave_reason != ''
```

### 根本原因
`u_jw_kcb_cur`表（课表数据）中，同一个课程号（kkh）和日期（rq）可能存在多条记录，比如：
- 不同的节次
- 不同的教师
- 不同的教室
- 重复的数据

当LEFT JOIN时，一条学生考勤记录会被连接到多条课表记录，导致结果集中出现重复的学生考勤记录。

## 修复方案

### 1. 移除有问题的LEFT JOIN
将原来的查询：
```typescript
.leftJoin('u_jw_kcb_cur', (join) =>
  join
    .onRef('u_jw_kcb_cur.kkh', '=', 'icalink_attendance_records.kkh')
    .onRef('u_jw_kcb_cur.rq', '=', 'icalink_attendance_records.rq')
)
```

修改为直接查询主要表：
```typescript
.selectFrom('icalink_student_attendance')
.innerJoin('icalink_attendance_records', ...)
```

### 2. 单独查询教室信息
通过额外的查询获取教室信息，避免JOIN导致的重复：

```typescript
// 获取教室信息的映射
const courseIds = [...new Set(results.map(r => r.kkh))];
const classLocationMap = new Map<string, string>();

if (courseIds.length > 0) {
  const locationResults = await this.db
    .selectFrom('u_jw_kcb_cur')
    .select(['kkh', 'room'])
    .where('kkh', 'in', courseIds)
    .groupBy(['kkh', 'room'])
    .execute();
  
  locationResults.forEach(loc => {
    if (loc.room && !classLocationMap.has(loc.kkh)) {
      classLocationMap.set(loc.kkh, loc.room);
    }
  });
}
```

### 3. 使用映射获取教室信息
在构建返回结果时，使用映射获取教室信息：
```typescript
class_location: classLocationMap.get(result.kkh) || undefined,
```

## 修复后的效果

### 修复前
- 一条数据库记录返回多条API记录
- `total`字段不准确
- 前端显示重复数据

### 修复后
- 一条数据库记录对应一条API记录
- `total`字段准确
- 前端显示正确的数据
- 仍然能获取到教室信息

## 修复的文件

- `packages/icalink/src/repositories/student-attendance-repository.ts`
  - `getStudentLeaveApplications()`方法

## 测试验证

可以使用提供的调试SQL脚本`debug_query.sql`来验证修复效果：

1. 执行查询4（原来的查询）- 可能看到重复记录
2. 执行查询5（修复后的查询）- 应该没有重复记录
3. 执行查询6（教室信息查询）- 验证教室信息获取正常

## 性能影响

### 优化点
- 减少了复杂的JOIN操作
- 避免了笛卡尔积导致的性能问题

### 额外开销
- 增加了一次额外的教室信息查询
- 但这个查询通常很快，因为：
  - 使用了IN查询，课程数量有限
  - 有GROUP BY去重
  - 查询字段少

总体来说，性能应该有所提升，因为避免了重复数据的传输和处理。

## 注意事项

1. 如果`u_jw_kcb_cur`表中同一课程有多个教室，只会返回第一个教室
2. 如果需要显示所有教室，可以修改逻辑将教室信息合并为字符串
3. 这个修复不影响其他功能，只是优化了查询逻辑

## 扩展建议

如果将来需要显示更详细的课程信息（如多个教室、多个教师），建议：

1. 在`icalink_attendance_records`表中直接存储相关信息
2. 或者修改查询逻辑，使用字符串聚合函数合并多个值
3. 或者返回数组格式的教室/教师信息 