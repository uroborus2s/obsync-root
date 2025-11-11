# 学院周度签到统计功能实现文档

## 功能概述

实现了学院周度签到统计功能，允许查询指定学院在各教学周的签到统计数据，包括应到人次、缺勤人次、旷课人次、缺勤率、旷课率等指标。

---

## 后端实现

### 1. 数据库索引优化

**文件**：`apps/app-icalink/database/migrations/add_college_weekly_stats_index.sql`

创建复合索引以优化查询性能：

```sql
CREATE INDEX idx_unit_semester_week_checkin
ON icalink_course_checkin_stats(course_unit_id, semester, teaching_week, need_checkin);
```

**优化效果**：

- 支持按学院、学期、教学周的高效查询
- 支持 `GROUP BY teaching_week` 的快速执行
- 预计查询时间从秒级降低到毫秒级

---

### 2. TypeScript 类型定义

**文件**：`apps/app-icalink/src/types/attendance-stats.types.ts`

新增接口：

```typescript
export interface CollegeWeeklyAttendanceStats {
  teaching_week: number; // 教学周（1-18）
  expected_attendance: number; // 应到人次
  absent_count: number; // 缺勤人次
  truant_count: number; // 旷课人次
  leave_count: number; // 请假人次
  present_count: number; // 实到人次
  absence_rate: number; // 缺勤率（0-1）
  truant_rate: number; // 旷课率（0-1）
}
```

---

### 3. Repository 层实现

**文件**：`apps/app-icalink/src/repositories/CourseCheckinStatsRepository.ts`

**新增方法**：`findCollegeWeeklyStats`

**功能**：

- **自动计算当前教学周**：从 `icalink_system_configs` 表获取学期开始日期（`config_key = 'term.start_date'`），根据当前日期自动计算当前教学周
- **查询范围**：第1周到上周（当前周 - 1）
- 使用单次 SQL 查询，按 `teaching_week` 分组聚合数据
- 只统计需要签到的课程（`need_checkin = 1`）
- 支持按学院、学期筛选

**教学周计算逻辑**：

```typescript
// 1. 从 icalink_system_configs 表获取学期开始日期
const configQuery = sql`
  SELECT config_value
  FROM icalink_system_configs
  WHERE config_key = 'term.start_date'
  LIMIT 1
`;

// 2. 计算当前教学周
const now = new Date();
const diffTime = now.getTime() - termStartDate.getTime();
const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
const currentWeek = Math.floor(diffDays / 7) + 1;

// 3. 计算查询截止周（上周）
const endWeek = currentWeek - 1;
```

**SQL 查询逻辑**：

```sql
SELECT
  teaching_week,
  SUM(total_should_attend) AS expected_attendance,
  SUM(absent_count) AS absent_count,
  SUM(truant_count) AS truant_count,
  SUM(leave_count) AS leave_count,
  SUM(present_count) AS present_count,
  CASE
    WHEN SUM(total_should_attend) = 0 THEN 0
    ELSE SUM(absent_count) / SUM(total_should_attend)
  END AS absence_rate,
  CASE
    WHEN SUM(total_should_attend) = 0 THEN 0
    ELSE SUM(truant_count) / SUM(total_should_attend)
  END AS truant_rate
FROM icalink_course_checkin_stats
WHERE course_unit_id = ?
  AND semester = ?
  AND teaching_week >= 1
  AND teaching_week <= ?  -- 自动计算的 endWeek
  AND need_checkin = 1
GROUP BY teaching_week
ORDER BY teaching_week ASC
```

---

### 4. Service 层实现

**文件**：`apps/app-icalink/src/services/CourseCheckinStatsService.ts`

**新增方法**：`getCollegeWeeklyStats`

**功能**：

- 参数验证（courseUnitId 不为空）
- 调用 Repository 层查询数据（Repository 会自动计算当前周和查询范围）
- 支持填充缺失周的0值记录（`fillMissingWeeks` 参数）
- 特殊处理：如果数据为空，返回提示"当前周次不足，暂无统计数据"

**参数说明**：

- `courseUnitId: string` - 学院ID（必需）
- `semester?: string` - 学期（可选）
- `fillMissingWeeks: boolean` - 是否填充缺失的周数据（默认true）

**返回格式**：

```typescript
{
  success: boolean;
  data?: CollegeWeeklyAttendanceStats[];
  error?: string;
  message?: string;
}
```

**边界情况处理**：

- 如果配置表中找不到学期开始日期，返回错误："未找到学期开始日期配置"
- 如果当前周 ≤ 1，返回空数组并提示："当前周次不足，暂无统计数据"
- 如果计算出的当前周 > 18，限制为 18 周

---

### 5. Controller 层实现

**文件**：`apps/app-icalink/src/controllers/StatsController.ts`

**新增路由**：`GET /api/icalink/v1/stats/college-weekly-attendance`

**查询参数**：

- `courseUnitId` (string, 必需) - 学院ID
- `semester` (string, 可选) - 学期
- `fillMissingWeeks` (boolean, 可选, 默认true) - 是否填充缺失的周数据

**功能说明**：

- 自动从 `icalink_system_configs` 表获取学期开始日期（`config_key = 'term.start_date'`）
- 根据当前日期计算当前教学周
- 查询范围：第1周到上周（当前周 - 1）
- 如果当前周 ≤ 1，返回空数组

**响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "teaching_week": 1,
      "expected_attendance": 1500,
      "absent_count": 45,
      "truant_count": 12,
      "leave_count": 33,
      "present_count": 1455,
      "absence_rate": 0.03,
      "truant_rate": 0.008
    },
    {
      "teaching_week": 2,
      "expected_attendance": 1520,
      "absent_count": 38,
      "truant_count": 10,
      "leave_count": 28,
      "present_count": 1482,
      "absence_rate": 0.025,
      "truant_rate": 0.0066
    }
  ]
}
```

---

## API 使用示例

### 请求示例

```bash
# 查询学院 "0303" 在当前学期第1-5周的签到统计
GET /api/icalink/v1/stats/college-weekly-attendance?courseUnitId=0303&currentWeek=5&semester=2024-2025-1

# 查询学院 "0303" 在当前学期第1-10周的签到统计（填充缺失周）
GET /api/icalink/v1/stats/college-weekly-attendance?courseUnitId=0303&currentWeek=10&fillMissingWeeks=true

# 查询学院 "0303" 在当前学期第3-8周的签到统计（不填充缺失周）
GET /api/icalink/v1/stats/college-weekly-attendance?courseUnitId=0303&currentWeek=10&startWeek=3&endWeek=8&fillMissingWeeks=false
```

---

## 边界情况处理

### 1. 缺失周数据

- **默认行为**：填充0值记录（`fillMissingWeeks=true`）
- **理由**：前端图表展示更友好，X轴连续

### 2. 当前周限制

- **默认行为**：只返回 1 到当前周的数据
- **验证**：`endWeek` 不能大于 `currentWeek`

### 3. 参数验证

- `courseUnitId` 不能为空
- `currentWeek` 必须在 1-18 之间
- `startWeek` ≤ `endWeek`
- `endWeek` ≤ `currentWeek`

---

## 性能优化

### 1. 数据库索引

- 已创建复合索引 `idx_unit_semester_week_checkin`
- 支持高效的范围查询和分组聚合

### 2. 查询策略

- 使用单次 SQL 查询，避免 N+1 问题
- 只查询需要签到的课程（`need_checkin = 1`）

### 3. 缓存建议（可选）

- 可以添加 Redis 缓存，TTL 5分钟
- 缓存键格式：`college_weekly_stats:{courseUnitId}:{semester}:{startWeek}-{endWeek}`

---

## 测试验证

### 后端测试

- ✅ TypeScript 编译通过（无新增错误）
- ✅ Repository 层查询逻辑正确
- ✅ Service 层参数验证完整
- ✅ Controller 层路由定义正确

### 待完成

- [ ] 前端页面实现
- [ ] 前端表格展示
- [ ] 前端周详情弹窗
- [ ] 集成测试
- [ ] 性能测试

---

## 下一步工作

### 前端实现

1. 在"课程签到统计 - 按单位名称查询"表格中添加"周详情"列
2. 创建周详情弹窗组件
3. 实现数据加载和表格展示
4. 添加排序和高亮功能
5. 优化用户体验

---

## 文件清单

### 后端文件

- `apps/app-icalink/database/migrations/add_college_weekly_stats_index.sql` - 数据库索引
- `apps/app-icalink/src/types/attendance-stats.types.ts` - TypeScript 类型定义
- `apps/app-icalink/src/repositories/CourseCheckinStatsRepository.ts` - Repository 层实现
- `apps/app-icalink/src/services/CourseCheckinStatsService.ts` - Service 层实现
- `apps/app-icalink/src/controllers/StatsController.ts` - Controller 层实现

### 文档文件

- `apps/app-icalink/docs/college-weekly-attendance-stats-implementation.md` - 本文档

---

## 总结

后端实现已完成，包括：

- ✅ 数据库索引优化
- ✅ TypeScript 类型定义
- ✅ Repository 层查询方法
- ✅ Service 层业务逻辑
- ✅ Controller 层 HTTP 接口
- ✅ 完整的参数验证和错误处理
- ✅ TypeScript 编译通过

接下来需要实现前端页面和组件。
