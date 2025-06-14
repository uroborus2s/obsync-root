# 课程状态更新功能说明

## 概述

本次更新为 `/api/attendance/course/:kkh/history` 接口添加了课程实时状态判断功能，并对未开始和进行中的课程使用 "N/A" 代替数字显示。

## 主要修改

### 1. 类型定义更新

**文件**: `packages/icalink/src/types/attendance.ts`

- 修改 `ClassAttendanceStats` 接口：
  - 添加 `course_status` 字段，类型为 `'not_started' | 'in_progress' | 'finished'`
  - 将数字字段改为支持 `number | string` 类型：
    - `total_students`
    - `present_count` 
    - `leave_count`
    - `absent_count`
    - `attendance_rate`

- 修改 `CourseInfo` 接口：
  - 将 `lq` 字段改为可选字段 (`lq?: string`)

### 2. Repository 层更新

**文件**: `packages/icalink/src/repositories/student-attendance-repository.ts`

- 更新 `getCourseAttendanceHistory` 方法：
  - 添加课程状态判断逻辑
  - 根据当前时间与课程时间比较确定状态：
    - `not_started`: 当前时间 < 课程开始时间
    - `in_progress`: 课程开始时间 <= 当前时间 <= 课程结束时间  
    - `finished`: 当前时间 > 课程结束时间
  - 对未开始和进行中的课程，统计数字显示为 "N/A"
  - 只有已结束的课程才计入总体统计

### 3. 状态判断逻辑

```typescript
// 判断课程实时状态
const now = new Date();
const classDate = new Date(record.rq);
const [startHour, startMinute] = record.sj_f.split(':').map(Number);
const [endHour, endMinute] = record.sj_t.split(':').map(Number);

const classStartTime = new Date(classDate);
classStartTime.setHours(startHour, startMinute, 0, 0);

const classEndTime = new Date(classDate);
classEndTime.setHours(endHour, endMinute, 0, 0);

let courseStatus: 'not_started' | 'in_progress' | 'finished';
if (now < classStartTime) {
  courseStatus = 'not_started';
} else if (now >= classStartTime && now <= classEndTime) {
  courseStatus = 'in_progress';
} else {
  courseStatus = 'finished';
}
```

### 4. 数据显示规则

- **已结束的课程**: 显示实际的统计数字和出勤率
- **未开始/进行中的课程**: 
  - `total_students`: "N/A"
  - `present_count`: "N/A"
  - `leave_count`: "N/A"
  - `absent_count`: "N/A"
  - `attendance_rate`: "N/A"

### 5. 总体统计计算

- 只有已结束的课程才计入总体统计
- 平均出勤率基于已结束课程计算
- `total_students` 优先使用已结束课程的数据

## API 响应示例

```json
{
  "success": true,
  "data": {
    "course_info": {
      "kkh": "202301001",
      "course_name": "高等数学",
      "xnxq": "2023-2024-1",
      "teachers": []
    },
    "attendance_history": [
      {
        "attendance_record_id": "uuid1",
        "class_date": "2024-01-15",
        "class_time": "08:00 - 09:40",
        "class_period": "1-2",
        "teaching_week": 1,
        "total_students": "N/A",
        "present_count": "N/A", 
        "leave_count": "N/A",
        "absent_count": "N/A",
        "attendance_rate": "N/A",
        "status": "active",
        "course_status": "not_started",
        "created_at": "2024-01-14T10:00:00.000Z"
      },
      {
        "attendance_record_id": "uuid2", 
        "class_date": "2024-01-10",
        "class_time": "08:00 - 09:40",
        "class_period": "1-2",
        "teaching_week": 1,
        "total_students": 45,
        "present_count": 42,
        "leave_count": 2,
        "absent_count": 1,
        "attendance_rate": 93.33,
        "status": "closed",
        "course_status": "finished",
        "created_at": "2024-01-09T10:00:00.000Z"
      }
    ],
    "overall_stats": {
      "total_classes": 2,
      "average_attendance_rate": 93.33,
      "total_students": 45,
      "total_present": 42,
      "total_leave": 2,
      "total_absent": 1
    }
  }
}
```

## 兼容性说明

- 前端需要适配新的数据类型（`number | string`）
- 新增的 `course_status` 字段可用于前端显示课程状态
- 保持向后兼容，现有功能不受影响

## 测试建议

1. 测试不同时间点的课程状态判断
2. 验证 "N/A" 显示逻辑
3. 确认总体统计计算正确性
4. 测试边界情况（课程开始/结束时刻） 