# 签到系统出勤率计算说明

## 概述

本文档详细说明了agendaedu-web签到管理系统中出勤率的计算规则、实现逻辑和相关说明。

## 出勤率计算公式

### 基本公式

```
出勤率 = (实际出勤人数 + 请假人数) / 应签到人数 × 100%
```

### 公式组成部分

#### 1. 实际出勤人数
- **定义**: 在规定时间内完成签到的学生数量
- **包含状态**:
  - `present`: 正常签到（在规定时间内签到）
  - `late`: 迟到签到（超过规定时间但在允许范围内签到）
- **计算方式**: `COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END)`

#### 2. 请假人数
- **定义**: 已批准请假申请的学生数量
- **包含状态**:
  - `leave`: 请假（已批准的请假申请）
- **计算方式**: `COUNT(CASE WHEN status = 'leave' THEN 1 END)`

#### 3. 应签到人数
- **定义**: 根据选课数据确定的应该参与签到的学生总数
- **数据来源**: `out_jw_kcb_xs` 表中按课程代码(kkh)统计的选课学生数
- **计算方式**: `COUNT(DISTINCT kcb.xh)` (按课程统计选课学生)

#### 4. 缺勤人数（不计入出勤率）
- **定义**: 未签到且未请假的学生数量
- **包含状态**:
  - `absent`: 缺勤（未签到且未请假）
- **说明**: 缺勤不计入出勤率分子，但影响整体统计

## 不同维度的出勤率计算

### 1. 课程维度出勤率

```sql
-- 课程出勤率计算
SELECT
  c.course_code,
  c.course_name,
  COUNT(DISTINCT kcb.xh) as total_should_attend,
  COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as actual_attended,
  COUNT(CASE WHEN ar.status = 'leave' THEN 1 END) as leave_count,
  ROUND(
    (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) + 
     COUNT(CASE WHEN ar.status = 'leave' THEN 1 END)) * 100.0 / 
    (COUNT(DISTINCT c.id) * COUNT(DISTINCT kcb.xh)), 2
  ) as attendance_rate
FROM icasync_attendance_courses c
LEFT JOIN out_jw_kcb_xs kcb ON c.course_code = kcb.kkh
LEFT JOIN icalink_attendance_records ar ON c.id = ar.attendance_course_id
GROUP BY c.course_code, c.course_name
```

### 2. 学生维度出勤率

```sql
-- 学生出勤率计算
SELECT
  s.xh as student_id,
  s.xm as student_name,
  COUNT(DISTINCT c.id) as total_should_attend,
  COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) as actual_attended,
  COUNT(CASE WHEN ar.status = 'leave' THEN 1 END) as leave_count,
  ROUND(
    (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) + 
     COUNT(CASE WHEN ar.status = 'leave' THEN 1 END)) * 100.0 / 
    COUNT(DISTINCT c.id), 2
  ) as attendance_rate
FROM out_xsxx s
INNER JOIN out_jw_kcb_xs kcb ON s.xh = kcb.xh
INNER JOIN icasync_attendance_courses c ON kcb.kkh = c.course_code
LEFT JOIN icalink_attendance_records ar ON (c.id = ar.attendance_course_id AND s.xh = ar.student_id)
GROUP BY s.xh, s.xm
```

### 3. 教师维度出勤率

```sql
-- 教师出勤率计算（需要处理多教师情况）
SELECT
  teacher_code,
  teacher_name,
  COUNT(DISTINCT c.course_code) as course_count,
  COUNT(DISTINCT c.id) as class_count,
  ROUND(
    (COUNT(CASE WHEN ar.status IN ('present', 'late') THEN 1 END) + 
     COUNT(CASE WHEN ar.status = 'leave' THEN 1 END)) * 100.0 / 
    (COUNT(DISTINCT c.id) * COUNT(DISTINCT kcb.xh)), 2
  ) as attendance_rate
FROM (
  -- 拆分教师字段的子查询
  SELECT 
    SUBSTRING_INDEX(SUBSTRING_INDEX(c.teacher_codes, ',', numbers.n), ',', -1) as teacher_code,
    SUBSTRING_INDEX(SUBSTRING_INDEX(c.teacher_names, ',', numbers.n), ',', -1) as teacher_name,
    c.*
  FROM icasync_attendance_courses c
  CROSS JOIN (SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3) numbers
  WHERE CHAR_LENGTH(c.teacher_codes) - CHAR_LENGTH(REPLACE(c.teacher_codes, ',', '')) >= numbers.n - 1
) teacher_courses c
LEFT JOIN out_jw_kcb_xs kcb ON c.course_code = kcb.kkh
LEFT JOIN icalink_attendance_records ar ON c.id = ar.attendance_course_id
GROUP BY teacher_code, teacher_name
```

## 状态说明

### 签到状态定义

| 状态 | 英文标识 | 中文说明 | 是否计入出勤 | 备注 |
|------|----------|----------|--------------|------|
| 正常签到 | `present` | 在规定时间内完成签到 | ✅ 是 | 最理想状态 |
| 迟到签到 | `late` | 超过规定时间但在允许范围内签到 | ✅ 是 | 计入出勤但标记迟到 |
| 请假 | `leave` | 已批准的请假申请 | ✅ 是 | 合理缺席，计入出勤 |
| 缺勤 | `absent` | 未签到且未请假 | ❌ 否 | 不合理缺席 |
| 未开始 | `not_started` | 签到尚未开始 | - | 中性状态 |
| 待审批 | `pending_approval` | 请假申请待审批 | ❌ 否 | 临时状态 |

## 计算逻辑的设计原则

### 1. 公平性原则
- 请假学生不应影响课程整体出勤率
- 合理的请假应当计入出勤，体现人性化管理

### 2. 准确性原则
- 基于选课数据确定应签到人数，避免统计偏差
- 区分不同签到状态，精确计算各项指标

### 3. 一致性原则
- 所有维度的出勤率计算使用相同的基础公式
- 确保不同统计口径下的数据一致性

### 4. 可追溯性原则
- 保留详细的签到记录和状态变更历史
- 支持按时间段、学期等维度进行回溯分析

## 特殊情况处理

### 1. 多教师课程
- 按教师工号拆分统计
- 每个教师独立计算出勤率

### 2. 跨学期课程
- 按学期分别统计
- 支持跨学期汇总分析

### 3. 补课和调课
- 基于实际上课记录计算
- 不受原定课表影响

### 4. 退课学生
- 基于选课表的实时状态
- 退课后不计入应签到人数

## API接口说明

### 获取出勤率计算说明
```
GET /api/icalink/v1/attendance/stats/explanation
```

返回出勤率计算的详细说明，包括公式、状态定义等信息。

### 各维度统计接口
- 课程统计: `GET /api/icalink/v1/attendance/stats/courses`
- 教师统计: `GET /api/icalink/v1/attendance/stats/teachers`
- 学生统计: `GET /api/icalink/v1/attendance/stats/students`
- 排行榜: `GET /api/icalink/v1/attendance/stats/rankings/{type}`

## 前端展示说明

### 1. 出勤率颜色标识
- 绿色 (≥90%): 优秀
- 蓝色 (≥80%): 良好
- 黄色 (≥70%): 一般
- 橙色 (≥60%): 较差
- 红色 (<60%): 很差

### 2. 计算说明展示
在所有涉及出勤率的页面都会显示计算说明，帮助用户理解数据含义。

### 3. 数据钻取
支持从汇总数据钻取到明细数据，便于问题定位和分析。

## 总结

本签到系统的出勤率计算充分考虑了教育管理的实际需求，通过科学合理的计算公式，确保了统计数据的准确性和公平性。请假计入出勤的设计体现了人性化管理理念，有助于客观反映真实的教学出勤情况。
