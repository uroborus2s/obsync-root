# 未来课程状态显示优化总结

## 任务概述

优化 `AttendanceService.buildFutureTeacherView` 方法，确保未来课程的学生请假状态能够正确展示，并按照指定顺序排序。

## 完成时间

2025-11-10

---

## 问题分析

### 修改前的问题

**问题1：状态被强制覆盖**
```typescript
// 修改前：所有学生的状态都被强制改为 'unstarted'
students: studentsWithStatus.map((student) => ({
  ...student,
  absence_type: 'unstarted' as AttendanceStatus
}))
```

**影响**：
- 学生的实际请假状态（`leave`、`leave_pending`）被覆盖
- 教师无法看到哪些学生提前请假
- 请假待审批的学生无法被识别

**问题2：缺少排序逻辑**
- 学生列表没有按状态优先级排序
- 请假待审批的学生没有优先显示
- 教师需要手动查找需要审批的请假

---

## 解决方案

### 1. ✅ 保留实际状态

**修改后**：
```typescript
// 保留视图返回的实际状态，不强制覆盖
students: sortedStudents, // 直接使用学生列表，保留原始状态
```

**效果**：
- `leave_pending`: 请假待审批 → 正确显示
- `leave`: 请假已批准 → 正确显示
- `absent`: 默认状态 → 正确显示

### 2. ✅ 添加状态优先级排序

**排序规则**：
```typescript
const statusPriority: Record<string, number> = {
  leave_pending: 1, // 请假待审批 - 最优先显示
  leave: 2,         // 请假已批准 - 第二优先
  // 其他状态（absent 等）优先级为 3
};
```

**排序逻辑**：
```typescript
const sortedStudents = [...studentsWithStatus].sort((a, b) => {
  const priorityA = statusPriority[a.absence_type || ''] || 3;
  const priorityB = statusPriority[b.absence_type || ''] || 3;
  
  // 如果优先级相同，按学号排序
  if (priorityA === priorityB) {
    return (a.student_id || '').localeCompare(b.student_id || '');
  }
  
  return priorityA - priorityB;
});
```

**效果**：
1. 请假待审批（`leave_pending`）的学生显示在最前面
2. 请假已批准（`leave`）的学生显示在第二位
3. 其他状态的学生显示在最后
4. 同优先级内按学号排序

### 3. ✅ 增强日志记录

**新增状态统计日志**：
```typescript
// 统计各种状态的学生数量（用于日志）
const statusCounts = studentsWithStatus.reduce(
  (acc, student) => {
    const status = student.absence_type || 'absent';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

this.logger.debug(
  {
    courseId: course.id,
    totalStudents: repositoryStats.total_count,
    leaveCount: repositoryStats.leave_count,
    statusBreakdown: statusCounts
  },
  'Fetched future course students from v_attendance_future_details'
);
```

**新增排序结果日志**：
```typescript
this.logger.debug(
  {
    courseId: course.id,
    firstStudentStatus: sortedStudents[0]?.absence_type,
    lastStudentStatus: sortedStudents[sortedStudents.length - 1]?.absence_type
  },
  'Students sorted by status priority'
);
```

**日志示例**：
```json
{
  "courseId": 12345,
  "totalStudents": 50,
  "leaveCount": 5,
  "statusBreakdown": {
    "leave_pending": 2,
    "leave": 3,
    "absent": 45
  }
}
```

---

## 修改内容

### 文件：`apps/app-icalink/src/services/AttendanceService.ts`

**修改方法**：`buildFutureTeacherView(course: IcasyncAttendanceCourse)`

**修改行数**：第 713-821 行

**关键修改点**：

1. **更新方法注释**（第 713-740 行）：
   - 添加了排序规则说明
   - 更新了状态说明，强调保留实际状态
   - 添加了状态优先级说明

2. **添加状态统计**（第 755-763 行）：
   - 使用 `reduce` 统计各种状态的学生数量
   - 用于日志记录和调试

3. **增强日志记录**（第 765-773 行）：
   - 添加 `statusBreakdown` 字段，显示各状态的学生数量
   - 便于调试和监控

4. **定义状态优先级**（第 775-780 行）：
   - `leave_pending`: 优先级 1
   - `leave`: 优先级 2
   - 其他状态: 优先级 3

5. **实现排序逻辑**（第 782-793 行）：
   - 按状态优先级排序
   - 同优先级内按学号排序
   - 使用 `localeCompare` 确保正确的字符串排序

6. **添加排序结果日志**（第 795-803 行）：
   - 记录第一个和最后一个学生的状态
   - 验证排序是否正确

7. **保留实际状态**（第 807-818 行）：
   - 移除了强制设置 `'unstarted'` 的逻辑
   - 直接使用排序后的学生列表
   - 保留视图返回的原始状态

---

## 代码对比

### 修改前

```typescript
// 构建返回数据
// 对于未来课程，所有学生的状态统一设置为 'unstarted'
// 实际的请假状态已经在视图中计算，但前端显示时统一为 'unstarted'
const vo: TeacherCourseCompleteDataVO = {
  course,
  students: studentsWithStatus.map((student) => ({
    ...student,
    absence_type: 'unstarted' as AttendanceStatus
  })),
  stats: {
    total_count: repositoryStats.total_count,
    checkin_count: 0,
    absent_count: 0,
    leave_count: repositoryStats.leave_count,
    truant_count: 0
  },
  status: 'not_started'
};
```

### 修改后

```typescript
// 统计各种状态的学生数量（用于日志）
const statusCounts = studentsWithStatus.reduce(
  (acc, student) => {
    const status = student.absence_type || 'absent';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

// 定义状态优先级（用于排序）
const statusPriority: Record<string, number> = {
  leave_pending: 1, // 请假待审批 - 最优先显示
  leave: 2 // 请假已批准 - 第二优先
  // 其他状态（absent、unstarted 等）优先级为 3
};

// 对学生列表进行排序：leave_pending > leave > 其他状态
const sortedStudents = [...studentsWithStatus].sort((a, b) => {
  const priorityA = statusPriority[a.absence_type || ''] || 3;
  const priorityB = statusPriority[b.absence_type || ''] || 3;
  
  // 如果优先级相同，按学号排序
  if (priorityA === priorityB) {
    return (a.student_id || '').localeCompare(b.student_id || '');
  }
  
  return priorityA - priorityB;
});

// 构建返回数据
// 保留视图返回的实际状态（leave_pending、leave、absent 等）
const vo: TeacherCourseCompleteDataVO = {
  course,
  students: sortedStudents, // 使用排序后的学生列表，保留原始状态
  stats: {
    total_count: repositoryStats.total_count,
    checkin_count: 0,
    absent_count: 0,
    leave_count: repositoryStats.leave_count,
    truant_count: 0
  },
  status: 'not_started'
};
```

---

## 优势分析

### 1. 正确显示请假状态

**修改前**：
- 所有学生状态都是 `'unstarted'`
- 无法区分请假和未请假的学生

**修改后**：
- `leave_pending`: 请假待审批（需要教师审批）
- `leave`: 请假已批准
- `absent`: 默认状态

### 2. 优先显示需要处理的学生

**修改前**：
- 学生列表无序
- 教师需要手动查找请假待审批的学生

**修改后**：
- 请假待审批的学生自动排在最前面
- 教师一眼就能看到需要审批的请假
- 提高工作效率

### 3. 增强可调试性

**修改前**：
- 日志信息有限
- 难以追踪状态分布

**修改后**：
- 详细的状态统计日志
- 排序结果验证日志
- 便于调试和监控

### 4. 保持代码健壮性

**错误处理**：
- 使用 `|| ''` 处理空值
- 使用 `|| 3` 设置默认优先级
- 使用 `?.` 可选链操作符

**类型安全**：
- 明确的类型注解
- TypeScript 编译通过

---

## 测试验证

### 构建测试

```bash
pnpm run build @wps/app-icalink
```

**结果**：✅ 构建成功，无 TypeScript 编译错误

```
Tasks: 1 successful, 1 total
Time: 2.682s
```

### 功能测试建议

#### 测试场景1：请假待审批优先显示

**测试数据**：
- 学生A：`leave_pending`（请假待审批）
- 学生B：`leave`（请假已批准）
- 学生C：`absent`（默认状态）

**预期结果**：
- 学生列表顺序：A → B → C
- 学生A的状态显示为 `leave_pending`

#### 测试场景2：同优先级按学号排序

**测试数据**：
- 学生20210103：`leave_pending`
- 学生20210101：`leave_pending`
- 学生20210102：`leave_pending`

**预期结果**：
- 学生列表顺序：20210101 → 20210102 → 20210103

#### 测试场景3：统计信息正确

**测试数据**：
- 总人数：50
- `leave_pending`：2人
- `leave`：3人
- `absent`：45人

**预期结果**：
```json
{
  "total_count": 50,
  "leave_count": 5,
  "checkin_count": 0,
  "absent_count": 0,
  "truant_count": 0
}
```

#### 测试场景4：日志记录正确

**预期日志**：
```json
{
  "courseId": 12345,
  "totalStudents": 50,
  "leaveCount": 5,
  "statusBreakdown": {
    "leave_pending": 2,
    "leave": 3,
    "absent": 45
  }
}
```

---

## 影响范围

### 直接影响

- ✅ 未来课程的学生列表显示
- ✅ 请假状态的正确展示
- ✅ 学生列表的排序顺序

### 不影响

- ✅ 当前课程的显示逻辑（使用 `buildCurrentTeacherView`）
- ✅ 历史课程的显示逻辑（使用 `buildHistoricalTeacherView`）
- ✅ API 接口签名和返回类型
- ✅ 统计信息的计算逻辑

---

## 总结

本次优化成功解决了未来课程学生状态显示的问题，实现了以下目标：

- ✅ 保留实际的请假状态，不强制覆盖
- ✅ 按状态优先级排序，请假待审批优先显示
- ✅ 增强日志记录，便于调试和监控
- ✅ 保持代码健壮性，处理边界情况
- ✅ 构建成功，无编译错误

**核心价值**：
- 🎯 教师能够快速识别需要审批的请假
- 🎨 学生状态显示更加准确和直观
- 🔧 代码更加健壮和易于维护
- 📊 日志信息更加详细，便于调试

现在可以启动应用测试这些优化了！🚀

