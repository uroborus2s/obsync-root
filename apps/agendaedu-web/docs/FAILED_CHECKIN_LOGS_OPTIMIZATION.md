# 签到失败日志页面优化文档

## 📋 任务概述

优化"签到失败日志"页面，添加分页功能并优化数据展示字段。

## ✅ 已完成的修改

### 1. 移除任务ID字段

**修改前**：
- 表格第一列显示 `taskId`（任务ID）
- 对用户无实际意义

**修改后**：
- 移除 `taskId` 列
- 表格更加简洁，聚焦于有用信息

### 2. 添加签到数据查看功能

**新增功能**：
- 在表格中添加"签到数据"列
- 每行显示"查看详情"按钮
- 点击按钮弹出模态框展示 JSON 数据
- JSON 数据格式化显示，易于阅读
- 支持一键复制 JSON 数据到剪贴板

**实现细节**：
```typescript
// 查看详情按钮
<Button
  variant='ghost'
  size='sm'
  onClick={() => handleShowJsonData(checkinData)}
>
  <Eye className='mr-1 h-4 w-4' />
  查看详情
</Button>

// JSON 模态框
<Dialog open={isJsonModalOpen} onOpenChange={setIsJsonModalOpen}>
  <DialogContent>
    <pre>
      <code>{JSON.stringify(selectedJsonData, null, 2)}</code>
    </pre>
    <Button onClick={handleCopyJson}>
      <Copy className='h-4 w-4' />
      复制 JSON
    </Button>
  </DialogContent>
</Dialog>
```

### 3. 增强分页功能

**原有功能**：
- 基础的上一页/下一页按钮
- 固定每页 20 条记录
- 显示当前页码和总页数

**新增功能**：

#### 3.1 每页数量选择
- 支持选择每页显示 10、20、50、100 条记录
- 切换每页数量时自动重置到第一页
- 使用 Select 组件实现

```typescript
<Select
  value={pageSize.toString()}
  onValueChange={handlePageSizeChange}
>
  <SelectItem value='10'>10</SelectItem>
  <SelectItem value='20'>20</SelectItem>
  <SelectItem value='50'>50</SelectItem>
  <SelectItem value='100'>100</SelectItem>
</Select>
```

#### 3.2 跳转到指定页
- 输入框支持直接输入页码
- 按 Enter 键或点击"跳转"按钮跳转
- 自动验证页码范围（1 到总页数）
- 无效页码时显示错误提示

```typescript
<Input
  type='number'
  min='1'
  max={totalPages}
  value={jumpToPage}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      handleJumpToPage()
    }
  }}
/>
<Button onClick={handleJumpToPage}>跳转</Button>
```

#### 3.3 改进的分页信息显示
- 左侧：总记录数 + 每页数量选择器
- 右侧：上一页 + 页码信息 + 下一页 + 跳转功能
- 响应式布局，移动端自动调整为垂直布局

### 4. 优化的表格列结构

| 列名 | 说明 | 数据来源 |
|------|------|----------|
| 学生ID | 学生的用户ID | `studentInfo.userId` |
| 学生姓名 | 学生姓名 | `studentInfo.username` |
| 课程ID | 课程的外部ID | `jobData.courseExtId` |
| 签到时间 | 签到时间（格式化） | `jobData.checkinTime` |
| 失败原因 | 失败原因（红色显示） | `record.failedReason` |
| 处理时间 | 队列处理时间 | `record.processedOn` |
| 签到数据 | 查看详情按钮 | `jobData.checkinData` |

## 📊 数据结构

### API 返回数据结构

```typescript
{
  total: number,
  page: number,
  pageSize: number,
  data: Array<{
    id: string,                    // 任务ID（不再显示）
    data: {
      courseExtId: string,         // 课程ID
      studentInfo: {
        userId: string,            // 学生ID
        username: string,          // 学生姓名
        userType: string
      },
      checkinData: {               // 签到数据（JSON）
        location?: string,
        latitude?: number,
        longitude?: number,
        accuracy?: number,
        course_start_time: string,
        window_id?: string,
        photo_url?: string,
        // ... 其他字段
      },
      checkinTime: string,         // 签到时间
      isWindowCheckin: boolean
    },
    failedReason: string,          // 失败原因
    processedOn: number            // 处理时间戳
  }>
}
```

## 🎨 UI/UX 改进

### 1. 分页控制布局

```
┌─────────────────────────────────────────────────────────────┐
│ 共 150 条记录  每页显示 [20▼] 条                            │
│                                                               │
│                    [◀ 上一页] 第 1 / 8 页 [下一页 ▶]        │
│                    跳转到 [___] [跳转]                       │
└─────────────────────────────────────────────────────────────┘
```

### 2. JSON 数据模态框

```
┌─────────────────────────────────────────────────────────────┐
│ 签到数据详情                                    [复制 JSON] │
├─────────────────────────────────────────────────────────────┤
│ {                                                             │
│   "location": "教学楼A-101",                                 │
│   "latitude": 39.9042,                                       │
│   "longitude": 116.4074,                                     │
│   "accuracy": 10,                                            │
│   "course_start_time": "2025-11-10T08:00:00Z",              │
│   "window_id": "window-123",                                 │
│   "photo_url": "oss://path/to/photo.jpg"                    │
│ }                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 技术实现

### 新增状态管理

```typescript
const [page, setPage] = useState(1)
const [pageSize, setPageSize] = useState(20)
const [jumpToPage, setJumpToPage] = useState('')
const [selectedJsonData, setSelectedJsonData] = useState<any>(null)
const [isJsonModalOpen, setIsJsonModalOpen] = useState(false)
```

### 新增处理函数

1. **handlePageSizeChange**: 处理每页数量变更
2. **handleJumpToPage**: 处理页码跳转
3. **handleShowJsonData**: 显示 JSON 数据模态框
4. **handleCopyJson**: 复制 JSON 数据到剪贴板

### 新增组件导入

```typescript
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Copy, Eye } from 'lucide-react'
import { toast } from 'sonner'
```

## ⚠️ 待完成的功能

### 学生学院、专业、班级信息展示

**当前状态**：
- 后端 API 返回的 `studentInfo` 只包含基本信息（`userId`, `username`, `userType`）
- 不包含学院（`school_name`）、专业（`major_name`）、班级（`class_name`）信息

**需要的修改**：

#### 方案 1：修改后端 API（推荐）

修改 `apps/app-icalink/src/services/AttendanceService.ts` 中的 `getFailedCheckinJobs` 方法：

```typescript
public async getFailedCheckinJobs(
  page: number,
  pageSize: number = 20
): Promise<Either<ServiceError, any>> {
  try {
    const queue = this.queueClient.getQueue('checkin');
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    const failedJobs = await queue.getFailed(start, end);
    const totalFailed = await queue.getFailedCount();

    // 🔧 新增：查询学生的完整信息
    const enrichedData = await Promise.all(
      failedJobs.map(async (job) => {
        const studentId = job.data?.studentInfo?.userId;
        const courseCode = job.data?.courseExtId;
        
        // 从 icalink_teaching_class 表查询学生信息
        let studentDetails = null;
        if (studentId && courseCode) {
          const student = await this.vTeachingClassRepository
            .findStudentByCourseAndId(courseCode, studentId);
          
          if (student) {
            studentDetails = {
              school_name: student.school_name,
              major_name: student.major_name,
              class_name: student.class_name
            };
          }
        }

        return {
          id: job.id,
          data: {
            ...job.data,
            studentDetails  // 新增字段
          },
          failedReason: job.failedReason,
          processedOn: job.processedOn
        };
      })
    );

    return right({
      total: totalFailed,
      page,
      pageSize,
      data: enrichedData
    });
  } catch (error) {
    this.logger.error('Failed to get failed checkin jobs', error);
    return left({
      code: String(ServiceErrorCode.UNKNOWN_ERROR),
      message: 'Failed to get failed checkin jobs'
    });
  }
}
```

#### 方案 2：前端单独查询（不推荐）

在前端页面加载时，为每条记录单独查询学生信息：
- 性能较差（N+1 查询问题）
- 增加前端复杂度
- 不推荐使用

### 前端表格列调整

修改 `apps/agendaedu-web/src/features/attendance/pages/failed-checkin-logs-page.tsx`：

```typescript
<TableHeader>
  <TableRow>
    <TableHead>学生ID</TableHead>
    <TableHead>学生姓名</TableHead>
    <TableHead>学院</TableHead>        {/* 新增 */}
    <TableHead>专业</TableHead>        {/* 新增 */}
    <TableHead>班级</TableHead>        {/* 新增 */}
    <TableHead>课程ID</TableHead>
    <TableHead>签到时间</TableHead>
    <TableHead>失败原因</TableHead>
    <TableHead>处理时间</TableHead>
    <TableHead className='text-center'>签到数据</TableHead>
  </TableRow>
</TableHeader>

<TableBody>
  {records.map((record) => {
    const jobData = record.data || {}
    const studentInfo = jobData.studentInfo || {}
    const studentDetails = jobData.studentDetails || {}  // 新增
    const checkinData = jobData.checkinData || {}

    return (
      <TableRow key={record.id}>
        <TableCell>{studentInfo.userId || '-'}</TableCell>
        <TableCell>{studentInfo.username || '-'}</TableCell>
        <TableCell>{studentDetails.school_name || '-'}</TableCell>  {/* 新增 */}
        <TableCell>{studentDetails.major_name || '-'}</TableCell>   {/* 新增 */}
        <TableCell>{studentDetails.class_name || '-'}</TableCell>   {/* 新增 */}
        <TableCell>{jobData.courseExtId || '-'}</TableCell>
        {/* ... 其他列 */}
      </TableRow>
    )
  })}
</TableBody>
```

## 📝 测试建议

### 功能测试

1. **分页功能**
   - ✅ 测试上一页/下一页按钮
   - ✅ 测试每页数量切换（10、20、50、100）
   - ✅ 测试跳转到指定页功能
   - ✅ 测试边界情况（第一页、最后一页）

2. **JSON 数据查看**
   - ✅ 测试点击"查看详情"按钮
   - ✅ 测试 JSON 数据格式化显示
   - ✅ 测试复制 JSON 功能
   - ✅ 测试空数据或格式错误的处理

3. **表格显示**
   - ✅ 测试所有列的数据正确显示
   - ✅ 测试时间格式化
   - ✅ 测试失败原因的截断和 tooltip

### 性能测试

1. **大数据量测试**
   - 测试 1000+ 条失败记录的分页性能
   - 测试每页 100 条记录的渲染性能

2. **网络测试**
   - 测试慢网络下的加载状态
   - 测试网络错误的处理

## 🎯 总结

### 已完成
- ✅ 移除任务ID字段
- ✅ 添加签到数据查看功能（JSON 模态框）
- ✅ 增强分页功能（每页数量选择、跳转）
- ✅ 优化分页信息显示
- ✅ 构建测试通过

### 待完成
- ⏳ 后端 API 添加学生学院、专业、班级信息
- ⏳ 前端表格添加学院、专业、班级列
- ⏳ 功能测试和性能测试

### 技术栈
- React 19 + TypeScript
- TanStack Query (数据获取)
- Radix UI + Tailwind CSS (UI 组件)
- Sonner (Toast 通知)

