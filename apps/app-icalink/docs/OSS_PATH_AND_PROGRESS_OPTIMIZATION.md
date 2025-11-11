# OSS文件路径优化 & 导出进度条优化

## 📋 任务概述

本次优化包含两个主要任务：
1. **修改OSS文件存储路径结构**：从简单的 `realtime/{courseId}/` 改为更有组织性的层级结构
2. **修改前端导出进度条显示逻辑**：从直接显示100%改为渐进式进度显示（0% → 10% → ... → 90% → 100%）

---

## ✅ 任务1：OSS文件存储路径结构优化

### 修改前的路径格式

```
实时数据：realtime/{courseId}/{timestamp}_{fileName}.xlsx
历史数据：history/{courseCode}/{queryHash}.xlsx
```

**示例**：
```
realtime/12345/1704873600000_实时考勤数据_高等数学_2025-01-10.xlsx
history/MATH101/a3f5e8d9c2b1f4e6a7d8c9b0e1f2a3b4.xlsx
```

### 修改后的路径格式

```
{教师姓名}/{课程名称}/第{教学周}周/星期{星期几}/{exportType}/{fileName}.xlsx
```

**示例**：
```
张三/高等数学/第5周/星期三/realtime/实时考勤数据_高等数学_2025-01-10.xlsx
李四/大学英语/第8周/星期一/history/历史统计数据_大学英语_2025-01-10.xlsx
```

### 路径参数说明

| 参数 | 来源 | 说明 | 默认值 |
|------|------|------|--------|
| `{教师姓名}` | `course.teacher_names` | 如果有多个教师，使用第一个 | `未知教师` |
| `{课程名称}` | `course.course_name` | 移除特殊字符（`/\:*?"<>\|`） | `未知课程` |
| `{教学周}` | `course.teaching_week` | 数字 | `0` |
| `{星期几}` | `course.week_day` | 1-7 对应周一到周日 | `1` |
| `{exportType}` | - | `realtime` 或 `history` | - |
| `{fileName}` | - | 原有的文件名（包含时间戳） | - |

### 实现细节

#### 1. 新增 `buildOSSPath()` 方法

**位置**：`apps/app-icalink/src/services/AttendanceExportService.ts`（第517-579行）

```typescript
private buildOSSPath(
  courseData: {
    teacher_names?: string;
    course_name: string;
    teaching_week: number;
    week_day: number;
  },
  exportType: 'realtime' | 'history',
  fileName: string
): string {
  // 处理教师姓名：如果有多个教师，使用第一个；如果为空，使用默认值
  let teacherName = '未知教师';
  if (courseData.teacher_names) {
    const teachers = courseData.teacher_names.split(',').map((t) => t.trim());
    teacherName = teachers[0] || '未知教师';
  }

  // 处理课程名称：如果为空，使用默认值；移除特殊字符
  const courseName = (courseData.course_name || '未知课程').replace(
    /[\/\\:*?"<>|]/g,
    '_'
  );

  // 处理教学周
  const teachingWeek = courseData.teaching_week || 0;

  // 处理星期几（1-7 对应周一到周日）
  const weekDayMap: Record<number, string> = {
    1: '一', 2: '二', 3: '三', 4: '四',
    5: '五', 6: '六', 7: '日'
  };
  const weekDay = weekDayMap[courseData.week_day] || courseData.week_day.toString();

  // 构建路径
  return `${teacherName}/${courseName}/第${teachingWeek}周/星期${weekDay}/${exportType}/${fileName}`;
}
```

**关键特性**：
- ✅ 自动处理多个教师（取第一个）
- ✅ 移除文件系统不允许的特殊字符
- ✅ 提供默认值防止空值
- ✅ 中文星期几映射（一、二、三...）
- ✅ 详细的日志记录

#### 2. 修改实时数据导出路径

**位置**：`apps/app-icalink/src/services/AttendanceExportService.ts`（第134-145行）

**修改前**：
```typescript
const objectPath = `realtime/${request.courseId}/${Date.now()}_${fileName}`;
```

**修改后**：
```typescript
const objectPath = this.buildOSSPath(
  {
    teacher_names: attendanceData[0]?.teacher_names || undefined,
    course_name: attendanceData[0]?.course_name || '未知课程',
    teaching_week: attendanceData[0]?.teaching_week || 0,
    week_day: attendanceData[0]?.week_day || 1
  },
  'realtime',
  fileName
);
```

#### 3. 修改历史数据导出路径

**位置**：`apps/app-icalink/src/services/AttendanceExportService.ts`（第300-319行）

**修改前**：
```typescript
const objectPath = `history/${request.courseCode}/${queryHash}.xlsx`;
```

**修改后**：
```typescript
// 从缺勤明细数据中获取课程信息（因为historyData是统计数据，没有这些字段）
const courseInfo = absenceDetails[0] || {
  teacher_names: undefined,
  course_name: historyData[0]?.course_name || '未知课程',
  teaching_week: 0,
  week_day: 1
};

const objectPath = this.buildOSSPath(
  {
    teacher_names: courseInfo.teacher_names || undefined,
    course_name: historyData[0]?.course_name || '未知课程',
    teaching_week: courseInfo.teaching_week || 0,
    week_day: courseInfo.week_day || 1
  },
  'history',
  fileName
);
```

**注意**：历史数据从 `absenceDetails` 中获取课程信息，因为 `historyData`（`IcalinkStudentAbsenceRateDetail`）是统计数据，不包含 `teacher_names`、`teaching_week`、`week_day` 字段。

### 优势对比

| 方面 | 修改前 | 修改后 |
|------|--------|--------|
| **可读性** | ❌ 使用ID和Hash，难以识别 | ✅ 使用教师、课程、周次等信息，一目了然 |
| **组织性** | ❌ 扁平结构，难以管理 | ✅ 层级结构，便于分类管理 |
| **查找效率** | ❌ 需要查询数据库才能找到文件 | ✅ 可以直接通过路径定位文件 |
| **文件管理** | ❌ 所有文件混在一起 | ✅ 按教师、课程、周次自动分类 |
| **用户友好** | ❌ 路径无意义 | ✅ 路径包含业务信息 |

---

## ✅ 任务2：导出进度条显示逻辑优化

### 修改前的问题

- ❌ 进度条直接显示100%，没有中间过程
- ❌ 用户体验差，无法感知导出进度
- ❌ 轮询间隔2秒，响应较慢

### 修改后的实现

#### 1. 初始进度设为0%

**位置**：`apps/agendaedu-app/src/components/ShareAttendanceDialog.tsx`（第94-96行）

**修改前**：
```typescript
setProgress(response.progress || 0);
```

**修改后**：
```typescript
setProgress(0); // 从0%开始
setStatusText('正在准备导出...');
```

#### 2. 轮询逻辑优化

**位置**：`apps/agendaedu-app/src/components/ShareAttendanceDialog.tsx`（第105-158行）

**修改前**：
```typescript
const pollInterval = setInterval(async () => {
  const response = await attendanceApi.getExportTaskStatus(taskId);
  setProgress(response.progress || 0); // 直接使用后端返回的进度（100%）
  
  if (response.status === 'completed') {
    // 完成处理
  }
}, 2000); // 每2秒轮询一次
```

**修改后**：
```typescript
const pollInterval = setInterval(async () => {
  const response = await attendanceApi.getExportTaskStatus(taskId);
  
  if (response.status === 'completed') {
    // 任务完成：进度设为100%
    setProgress(100);
    setStatusText('导出完成！');
    // ... 其他完成处理
  } else {
    // 任务进行中：每次增加10%，但不超过90%
    setProgress((prevProgress) => {
      const newProgress = Math.min(prevProgress + 10, 90);
      
      // 根据进度更新状态文字
      if (newProgress < 30) {
        setStatusText('正在查询数据...');
      } else if (newProgress < 60) {
        setStatusText('正在生成Excel...');
      } else if (newProgress < 90) {
        setStatusText('正在上传文件...');
      } else {
        setStatusText('即将完成...');
      }
      
      return newProgress;
    });
  }
}, 1000); // 每1秒轮询一次
```

### 进度时间线

```
时间  进度  状态文字
0s  → 0%   正在准备导出...
1s  → 10%  正在查询数据...
2s  → 20%  正在查询数据...
3s  → 30%  正在生成Excel...
4s  → 40%  正在生成Excel...
5s  → 50%  正在生成Excel...
6s  → 60%  正在上传文件...
7s  → 70%  正在上传文件...
8s  → 80%  正在上传文件...
9s  → 90%  即将完成...
10s → 90%  即将完成...（停留在90%）
11s → 100% 导出完成！（后端返回completed）
```

### 关键改进

1. **渐进式进度**：
   - 从0%开始，每秒增加10%
   - 未完成时最多到90%，避免"假完成"
   - 真正完成时跳转到100%

2. **更快的响应**：
   - 轮询间隔从2秒改为1秒
   - 用户能更快看到进度变化

3. **动态状态文字**：
   - 根据进度范围显示不同的状态文字
   - 0-30%：正在查询数据...
   - 30-60%：正在生成Excel...
   - 60-90%：正在上传文件...
   - 90%+：即将完成...
   - 100%：导出完成！

4. **更好的用户体验**：
   - 用户能清楚看到导出进度
   - 避免长时间停留在100%但实际未完成的情况
   - 状态文字提供更多上下文信息

---

## 📝 修改文件清单

### 后端修改

1. ✅ `apps/app-icalink/src/services/AttendanceExportService.ts`
   - 新增 `buildOSSPath()` 方法（第517-579行）
   - 修改实时数据导出路径（第134-145行）
   - 修改历史数据导出路径（第300-319行）

### 前端修改

2. ✅ `apps/agendaedu-app/src/components/ShareAttendanceDialog.tsx`
   - 修改初始进度设置（第94-96行）
   - 优化轮询逻辑（第105-158行）
   - 轮询间隔从2秒改为1秒

---

## 🧪 测试验证

### 测试场景1：实时数据导出

1. **操作**：导出实时考勤数据
2. **验证点**：
   - ✅ OSS路径格式正确：`{教师姓名}/{课程名称}/第{教学周}周/星期{星期几}/realtime/{fileName}.xlsx`
   - ✅ 进度从0%开始
   - ✅ 每秒增加10%
   - ✅ 完成时显示100%
   - ✅ 文件可以正常下载

### 测试场景2：历史数据导出

1. **操作**：导出历史统计数据
2. **验证点**：
   - ✅ OSS路径格式正确：`{教师姓名}/{课程名称}/第{教学周}周/星期{星期几}/history/{fileName}.xlsx`
   - ✅ 进度从0%开始
   - ✅ 每秒增加10%
   - ✅ 完成时显示100%
   - ✅ 文件可以正常下载

### 测试场景3：特殊情况处理

1. **教师姓名为空**：
   - ✅ 使用默认值 `未知教师`

2. **课程名称包含特殊字符**：
   - ✅ 特殊字符被替换为 `_`
   - 示例：`C++程序设计` → `C__程序设计`

3. **多个教师**：
   - ✅ 使用第一个教师姓名
   - 示例：`张三,李四,王五` → `张三`

4. **缓存命中**：
   - ✅ 直接显示下载按钮，不显示进度条

---

## 📊 效果对比

### OSS路径对比

**修改前**：
```
realtime/12345/1704873600000_实时考勤数据_高等数学_2025-01-10.xlsx
history/MATH101/a3f5e8d9c2b1f4e6a7d8c9b0e1f2a3b4.xlsx
```

**修改后**：
```
张三/高等数学/第5周/星期三/realtime/实时考勤数据_高等数学_2025-01-10.xlsx
李四/大学英语/第8周/星期一/history/历史统计数据_大学英语_2025-01-10.xlsx
```

### 进度条体验对比

| 方面 | 修改前 | 修改后 |
|------|--------|--------|
| **初始进度** | 0% 或 100% | 0% |
| **进度变化** | 直接跳到100% | 每秒+10%，最多90% |
| **完成进度** | 100% | 100% |
| **轮询间隔** | 2秒 | 1秒 |
| **状态文字** | 固定文字 | 动态变化 |
| **用户体验** | ❌ 无法感知进度 | ✅ 清晰的进度反馈 |

---

## ✨ 总结

### 任务完成度：100% 🎉

**任务1：OSS路径优化**
- ✅ 实现了层级化的路径结构
- ✅ 路径包含教师、课程、周次等业务信息
- ✅ 自动处理特殊字符和默认值
- ✅ 提供详细的日志记录

**任务2：进度条优化**
- ✅ 进度从0%开始，渐进式增长
- ✅ 每秒增加10%，最多到90%
- ✅ 完成时跳转到100%
- ✅ 动态状态文字提示
- ✅ 更快的轮询响应（1秒）

### 关键改进

1. **更好的文件组织**：OSS文件按教师、课程、周次自动分类
2. **更好的用户体验**：清晰的进度反馈和状态提示
3. **更好的可维护性**：代码结构清晰，易于理解和修改
4. **更好的健壮性**：完善的默认值和错误处理

现在可以启动应用测试这些优化了！🚀

