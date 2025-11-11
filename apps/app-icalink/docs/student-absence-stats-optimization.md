# 学生缺勤统计查询性能优化

## 📋 问题描述

在学工签到统计页面（`apps/agendaedu-web/src/features/attendance/components/student-absence-stats.tsx`）中，当用户点击班级节点时，需要查询该班级的学生缺勤统计数据。

**原有实现的性能问题：**

- 后端服务 `VStudentAbsenceRateSummaryService` 从视图 `v_student_absence_rate_summary` 获取数据
- 视图查询导致**全表扫描**，速度太慢
- 影响用户体验

---

## ✅ 优化方案（已完成）

### 核心思路

**完全移除视图 `v_student_absence_rate_summary`**，改为**直接查询明细表** `icalink_student_absence_rate_detail`，并在查询时进行实时聚合。

### 优化策略

采用**激进式清理方案**，彻底删除视图及其相关代码：

1. ✅ 在 `StudentAbsenceRateDetailRepository` 中实现通用查询方法 `findStudentSummary`
2. ✅ 删除 `VStudentAbsenceRateSummaryRepository` 文件
3. ✅ 修改 `VStudentAbsenceRateSummaryService` 依赖注入，改为使用 `StudentAbsenceRateDetailRepository`
4. ✅ 从类型定义中移除视图引用
5. ⏸️ 创建数据库迁移脚本（待执行）
6. ⏸️ 删除视图定义文件（待执行）

### 优化内容

#### 1. **Repository 层优化**

**文件：** `apps/app-icalink/src/repositories/VStudentAbsenceRateSummaryRepository.ts`

**修改内容：**

##### 1.1 `findWithPagination` 方法

- **原实现：** 使用 Kysely 查询构建器查询视图 `v_student_absence_rate_summary`
- **新实现：** 使用 Kysely 的 `sql` 模板标签直接查询明细表 `icalink_student_absence_rate_detail`
- **查询逻辑：**

  ```sql
  SELECT
    student_id,
    student_name,
    class_id,
    class_name,
    school_id,
    school_name,
    major_id,
    major_name,
    grade,
    gender,
    semester,

    COUNT(DISTINCT course_code) AS total_courses,
    SUM(total_sessions) AS total_sessions,
    SUM(completed_sessions) AS completed_sessions,

    SUM(absent_count) AS total_absent_count,
    SUM(leave_count) AS total_leave_count,
    SUM(truant_count) AS total_truant_count,

    (SUM(absent_count) + SUM(truant_count)) / NULLIF(SUM(completed_sessions), 0) AS overall_absence_rate,
    SUM(truant_count) / NULLIF(SUM(completed_sessions), 0) AS overall_truant_rate,
    SUM(leave_count) / NULLIF(SUM(completed_sessions), 0) AS overall_leave_rate,

    AVG(absence_rate) AS avg_absence_rate,
    AVG(truant_rate) AS avg_truant_rate,
    AVG(leave_rate) AS avg_leave_rate,

    MAX(absence_rate) AS max_absence_rate,
    MAX(truant_rate) AS max_truant_rate,
    MAX(leave_rate) AS max_leave_rate,

    MAX(updated_at) AS last_updated_at

  FROM icalink_student_absence_rate_detail
  WHERE CONCAT(school_id, grade, major_id, class_id) = ?
    AND (student_id = ? OR student_name LIKE ?)
  GROUP BY student_id, semester
  ORDER BY overall_absence_rate DESC
  LIMIT ? OFFSET ?
  ```

##### 1.2 `findByClassId` 方法（新增）

- **用途：** 根据班级ID直接查询学生缺勤统计数据
- **参数：**
  - `classId`: 班级ID
  - `searchKeyword`: 搜索关键词（学生ID或学生姓名）
  - `page`: 页码（从1开始）
  - `pageSize`: 每页数量
- **查询逻辑：**
  ```sql
  SELECT ... (同上)
  FROM icalink_student_absence_rate_detail
  WHERE class_id = ?
    AND (student_id = ? OR student_name LIKE ?)
  GROUP BY student_id, semester
  ORDER BY student_name
  LIMIT ? OFFSET ?
  ```

#### 2. **Service 层更新**

**文件：** `apps/app-icalink/src/services/VStudentAbsenceRateSummaryService.ts`

**修改内容：**

- 更新 `IVStudentAbsenceRateSummaryService` 接口，为 `findByClassId` 方法添加新参数
- 更新 `VStudentAbsenceRateSummaryService` 实现，传递新参数到 Repository 层

---

## 🔧 技术实现细节

### Kysely SQL 模板标签用法

使用 Kysely 的 `sql` 模板标签进行参数绑定，避免 SQL 注入：

```typescript
import { sql } from '@stratix/database';

// ✅ 正确：使用 sql 模板标签
const query = sql<VStudentAbsenceRateSummary>`
  SELECT * FROM table
  WHERE class_id = ${classId}
    AND student_name LIKE ${`%${keyword}%`}
  LIMIT ${pageSize} OFFSET ${offset}
`;

const result = await query.execute(connection);
const data = result.rows;
```

### 条件查询处理

根据不同的参数组合，构建不同的 SQL 查询：

```typescript
if (exDeptId && searchKeyword) {
  // 有 exDeptId 和 searchKeyword
  query = sql`SELECT ... WHERE CONCAT(...) = ${remainingPart} AND (...)`;
} else if (exDeptId) {
  // 只有 exDeptId
  query = sql`SELECT ... WHERE CONCAT(...) = ${remainingPart}`;
} else if (searchKeyword) {
  // 只有 searchKeyword
  query = sql`SELECT ... WHERE (student_id = ${searchKeyword} OR ...)`;
} else {
  // 没有过滤条件
  query = sql`SELECT ... `;
}
```

---

## 📊 数据库索引优化

**文件：** `apps/app-icalink/database/migrations/add_index_for_student_absence_rate_detail.sql`

### 建议添加的索引

#### 1. `idx_class_id`

```sql
ALTER TABLE icalink_student_absence_rate_detail
ADD INDEX idx_class_id (class_id);
```

- **用途：** 支持 `WHERE class_id = ?` 查询
- **使用场景：** 点击班级节点时查询该班级的学生缺勤统计

#### 2. `idx_school_grade_major_class`

```sql
ALTER TABLE icalink_student_absence_rate_detail
ADD INDEX idx_school_grade_major_class (school_id, grade, major_id, class_id);
```

- **用途：** 优化 `WHERE CONCAT(school_id, grade, major_id, class_id) = ?` 查询
- **使用场景：** 从组织架构树的 `ex_dept_id` 提取组合ID进行查询
- **注意：** MySQL 不支持函数索引（CONCAT），但组合索引可以优化部分查询

#### 3. `idx_student_name`

```sql
ALTER TABLE icalink_student_absence_rate_detail
ADD INDEX idx_student_name (student_name);
```

- **用途：** 支持 `WHERE student_name LIKE 'keyword%'` 查询
- **使用场景：** 按学生姓名搜索
- **注意：** `LIKE '%keyword%'` 无法使用索引，但 `LIKE 'keyword%'` 可以使用索引

---

## 🎯 预期效果

### 性能提升

- ✅ **避免全表扫描**：直接查询明细表，使用索引加速
- ✅ **减少数据传输**：只查询需要的字段，减少网络传输
- ✅ **实时聚合**：在查询时进行聚合，避免视图维护开销

### 兼容性

- ✅ **前端无需修改**：返回的数据结构与原有接口一致
- ✅ **向后兼容**：保持原有 API 接口不变

---

## 📝 部署步骤

### 1. 代码部署

```bash
# 构建后端服务
cd apps/app-icalink
pnpm run build

# 重启服务
pm2 restart app-icalink
```

### 2. 数据库索引部署

```bash
# 连接到生产数据库
mysql -u username -p database_name

# 执行索引创建脚本
source apps/app-icalink/database/migrations/add_index_for_student_absence_rate_detail.sql

# 验证索引是否创建成功
SHOW INDEX FROM icalink_student_absence_rate_detail;
```

### 3. 性能测试

```sql
-- 测试1：按班级ID查询
EXPLAIN SELECT * FROM icalink_student_absence_rate_detail WHERE class_id = '202401';
-- 预期：type = ref, key = idx_class_id

-- 测试2：按组合ID查询
EXPLAIN SELECT * FROM icalink_student_absence_rate_detail
WHERE CONCAT(school_id, grade, major_id, class_id) = '01202401';
-- 预期：type = index, key = idx_school_grade_major_class

-- 测试3：按学生姓名前缀查询
EXPLAIN SELECT * FROM icalink_student_absence_rate_detail WHERE student_name LIKE '张%';
-- 预期：type = range, key = idx_student_name
```

---

## ⚠️ 注意事项

1. **索引创建时间**：根据数据量，索引创建可能需要 1-5 分钟，期间表会被锁定
2. **索引维护开销**：添加索引会增加写入操作的开销，但查询性能提升远大于写入开销
3. **CONCAT 函数索引**：MySQL 不支持函数索引，建议未来考虑将 `CONCAT(school_id, grade, major_id, class_id)` 存储为单独字段并建立索引

---

## 📚 相关文件

- **Repository 层：** `apps/app-icalink/src/repositories/StudentAbsenceRateDetailRepository.ts` (新增通用查询方法)
- **Service 层：** `apps/app-icalink/src/services/VStudentAbsenceRateSummaryService.ts` (已修改依赖注入)
- **前端组件：** `apps/agendaedu-web/src/features/attendance/components/student-absence-stats.tsx` (无需修改)
- **数据库迁移：**
  - `apps/app-icalink/database/migrations/add_index_for_student_absence_rate_detail.sql` (索引优化)
  - `apps/app-icalink/database/migrations/drop_view_student_absence_rate_summary.sql` (删除视图，待执行)
- **表结构：** `apps/app-icalink/database/tables/icalink_student_absence_rate_detail.sql`
- **已删除文件：** `apps/app-icalink/src/repositories/VStudentAbsenceRateSummaryRepository.ts` (已删除)

---

## 🆕 新增功能说明

### `StudentAbsenceRateDetailRepository.findStudentSummary()` 通用查询方法

这是一个功能强大的通用查询方法，支持：

#### 支持的查询条件（所有条件都是可选的）

- `studentId`: 学号（精确匹配）
- `studentName`: 学生姓名（模糊匹配，使用 `LIKE %name%`）
- `classId`: 班级ID（精确匹配）
- `className`: 班级名称（模糊匹配）
- `schoolId`: 学院ID（精确匹配）
- `schoolName`: 学院名称（模糊匹配）
- `majorId`: 专业ID（精确匹配）
- `majorName`: 专业名称（模糊匹配）
- `grade`: 年级（精确匹配）
- `semester`: 学期（精确匹配）
- `minAbsenceRate`: 最低缺勤率阈值（用于查询高缺勤率学生）

#### 支持的功能

- ✅ 多条件组合查询（所有条件都是可选的，可以任意组合）
- ✅ 分页功能（`page`, `pageSize`）
- ✅ 排序功能（`sortField`, `sortOrder`）
- ✅ 按学生维度聚合统计（`GROUP BY student_id, semester`）
- ✅ 实时计算缺勤率、旷课率、请假率等统计指标

#### 便捷方法（基于 `findStudentSummary` 实现）

为了保持代码可读性，提供了以下便捷方法：

1. **`findStudentSummaryByClassId`**: 按班级ID查询学生缺勤统计
2. **`findStudentSummaryByStudentId`**: 按学号查询单个学生的缺勤统计
3. **`findStudentSummaryBySchoolId`**: 按学院ID查询学生缺勤统计
4. **`findHighAbsenceRateStudentsSummary`**: 查询高缺勤率学生
5. **`findStudentSummaryWithPagination`**: 支持 `exDeptId` 格式的分页查询（兼容现有 Controller 调用）

---

## 🔄 代码迁移说明

### 已删除的文件

- ❌ `apps/app-icalink/src/repositories/VStudentAbsenceRateSummaryRepository.ts`

### 已修改的文件

- ✅ `apps/app-icalink/src/repositories/StudentAbsenceRateDetailRepository.ts` (新增通用查询方法)
- ✅ `apps/app-icalink/src/services/VStudentAbsenceRateSummaryService.ts` (修改依赖注入)
- ✅ `apps/app-icalink/src/types/database.ts` (注释掉视图类型定义)

### 无需修改的文件

- ✅ `apps/app-icalink/src/controllers/StatsController.ts` (接口保持不变)
- ✅ `apps/agendaedu-web/src/features/attendance/components/student-absence-stats.tsx` (前端无需修改)

---

## 📝 待执行的操作

### 1. 数据库视图删除（需人工确认）

**迁移脚本：** `apps/app-icalink/database/migrations/drop_view_student_absence_rate_summary.sql`

**执行步骤：**

```bash
# 1. 连接到生产数据库
mysql -u username -p database_name

# 2. 执行迁移脚本
source apps/app-icalink/database/migrations/drop_view_student_absence_rate_summary.sql

# 3. 验证视图已删除
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'v_student_absence_rate_summary';
-- 应该返回空结果
```

**注意事项：**

- ⚠️ 执行前请确保新代码已部署到生产环境
- ⚠️ 执行前请确保新代码已经过充分测试
- ⚠️ 执行前请备份数据库（以防需要回滚）

### 2. 视图定义文件删除（需人工确认）

**文件：** `apps/app-icalink/database/view/v_student_absence_rate_summary.sql`

**删除时机：** 在生产环境成功执行迁移脚本后，可以删除该文件

**回滚方案：** 如需回滚，可重新执行该文件重建视图
