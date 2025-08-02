# @stratix/icasync 适配器类型定义

## 概述

本文档定义了 @stratix/icasync 适配器层所需的类型定义，包括课程信息、日程信息、参与者信息等核心数据结构。

## 基础类型定义

### 1. 适配器结果类型

```typescript
export interface AdapterError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
  category?: 'network' | 'validation' | 'business' | 'system';
}

export interface AdapterResult<T> {
  success: boolean;
  data?: T;
  error?: AdapterError;
  metadata?: {
    source: string;
    operation: string;
    timestamp: string;
    duration?: number;
  };
}
```

### 2. 课程相关类型

```typescript
export interface CourseInfo {
  kkh: string;                    // 开课号
  xnxq: string;                   // 学年学期
  courseName: string;             // 课程名称
  teacherNames: string;           // 教师姓名
  teacherCodes?: string;          // 教师工号
}

export interface CourseCalendarInfo {
  kkh: string;                    // 开课号
  xnxq: string;                   // 学年学期
  courseName: string;             // 课程名称
  teacherNames: string;           // 教师姓名
  description?: string;           // 日历描述
}

export interface CourseScheduleInfo {
  juheRenwuId: number;            // 聚合任务ID
  kkh: string;                    // 开课号
  calendarId: string;             // WPS日历ID
  courseName: string;             // 课程名称
  teacherNames: string;           // 教师姓名
  startTime: string;              // 开始时间 (ISO 8601)
  endTime: string;                // 结束时间 (ISO 8601)
  location?: string;              // 上课地点
  description?: string;           // 日程描述
}
```

### 3. 参与者相关类型

```typescript
export interface CourseParticipant {
  userCode: string;               // 用户编号（学号/工号）
  userName: string;               // 用户姓名
  userType: 'student' | 'teacher'; // 用户类型
  role: 'student' | 'teacher';    // 角色
  email?: string;                 // 邮箱
}

export interface ParticipantInfo {
  userCode: string;               // 用户编号
  userName: string;               // 用户姓名
  userType: 'student' | 'teacher'; // 用户类型
  email?: string;                 // 邮箱
}

export interface ParticipantResult {
  userCode: string;               // 用户编号
  success: boolean;               // 操作是否成功
  permissionId?: string;          // 权限ID
  error?: string;                 // 错误信息
}

export interface PermissionUpdate {
  userCode: string;               // 用户编号
  role: 'reader' | 'writer' | 'owner'; // 权限角色
}

export interface PermissionResult {
  userCode: string;               // 用户编号
  success: boolean;               // 操作是否成功
  error?: string;                 // 错误信息
}
```

### 4. 操作结果类型

```typescript
export interface CalendarResult {
  kkh: string;                    // 开课号
  calendarId?: string;            // 日历ID
  success: boolean;               // 操作是否成功
  error?: string;                 // 错误信息
}

export interface ScheduleResult {
  juheRenwuId: number;            // 聚合任务ID
  scheduleId?: string;            // 日程ID
  success: boolean;               // 操作是否成功
  error?: string;                 // 错误信息
}

export interface BatchResult {
  total: number;                  // 总数
  success: number;                // 成功数
  failed: number;                 // 失败数
  errors: string[];               // 错误列表
}

export interface SyncResult {
  id: string;                     // 记录ID
  success: boolean;               // 操作是否成功
  error?: string;                 // 错误信息
}
```

### 5. 任务相关类型

```typescript
export interface SyncTaskInfo {
  name: string;                   // 任务名称
  description: string;            // 任务描述
  taskType: 'full_sync' | 'incremental_sync' | 'user_sync'; // 任务类型
  xnxq?: string;                  // 学年学期
  metadata?: any;                 // 元数据
}

export interface TaskTreeInfo {
  id: string;                     // 任务树ID
  name: string;                   // 任务树名称
  status: TaskStatus;             // 任务状态
  progress: number;               // 执行进度
  createdAt: string;              // 创建时间
  updatedAt: string;              // 更新时间
}

export interface TaskNodeInfo {
  id: string;                     // 节点ID
  name: string;                   // 节点名称
  parentId?: string;              // 父节点ID
  method: string;                 // 处理方法
  executionParams: any;           // 执行参数
  status: TaskStatus;             // 节点状态
}

export interface TaskNodeUpdate {
  name?: string;                  // 节点名称
  status?: TaskStatus;            // 节点状态
  progress?: number;              // 执行进度
  result?: any;                   // 执行结果
}

export interface TaskExecution {
  taskTreeId: string;             // 任务树ID
  status: TaskStatus;             // 执行状态
  startTime: string;              // 开始时间
  estimatedEndTime?: string;      // 预计结束时间
}

export interface TaskProgress {
  taskTreeId: string;             // 任务树ID
  progress: number;               // 总体进度
  currentPhase: string;           // 当前阶段
  currentNode?: TaskNodeInfo;     // 当前节点
  estimatedTimeRemaining?: number; // 预计剩余时间
}

export interface TaskInfo {
  id: string;                     // 任务ID
  name: string;                   // 任务名称
  taskType: string;               // 任务类型
  status: TaskStatus;             // 任务状态
  createdAt: string;              // 创建时间
  completedAt?: string;           // 完成时间
}

export interface TaskHistoryFilter {
  taskType?: string;              // 任务类型
  status?: TaskStatus;            // 任务状态
  startDate?: string;             // 开始日期
  endDate?: string;               // 结束日期
  limit?: number;                 // 限制数量
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

export interface TaskProcessor {
  name: string;                   // 处理器名称
  execute(params: TaskExecutionParams): Promise<TaskResult>;
}

export interface TaskExecutionParams {
  taskType: string;               // 任务类型
  data: any;                      // 任务数据
  context?: any;                  // 执行上下文
}

export interface TaskResult {
  success: boolean;               // 执行是否成功
  data?: any;                     // 执行结果数据
  error?: string;                 // 错误信息
  message?: string;               // 执行消息
  retryable?: boolean;            // 是否可重试
}
```

### 6. 缓存相关类型

```typescript
export interface CacheStats {
  hitRate: number;                // 命中率
  missRate: number;               // 未命中率
  totalKeys: number;              // 总键数
  memoryUsage: number;            // 内存使用量
  uptime: number;                 // 运行时间
}

export interface RetryConfig {
  maxRetries: number;             // 最大重试次数
  delay: number;                  // 重试延迟（毫秒）
  backoff?: 'linear' | 'exponential'; // 退避策略
  maxDelay?: number;              // 最大延迟
}
```

### 7. 数据转换类型

```typescript
export interface CourseRaw {
  id: string;                     // 原始记录ID
  kkh: string;                    // 开课号
  xnxq: string;                   // 学年学期
  jxz: string;                    // 教学周
  zc: string;                     // 周次
  jc: string;                     // 节次
  room: string;                   // 教室
  ghs: string;                    // 教师工号组
  xms: string;                    // 教师姓名组
  kcmc: string;                   // 课程名称
  zt: string;                     // 状态标识
  gx_zt: string;                  // 更新状态
  gx_sj: string;                  // 更新时间
}

export interface JuheRenwu {
  id: number;                     // 聚合任务ID
  kkh: string;                    // 开课号
  rq: string;                     // 日期
  jc_s: string;                   // 节次合并
  room_s: string;                 // 教室合并
  gh_s: string;                   // 教师工号组
  xm_s: string;                   // 教师姓名组
  sj_f: string;                   // 开始时间
  sj_t: string;                   // 结束时间
  gx_zt: string;                  // 更新状态
  gx_sj: string;                  // 更新时间
}

export interface StudentInfo {
  xh: string;                     // 学号
  xm: string;                     // 姓名
  xydm: string;                   // 学院代码
  xymc: string;                   // 学院名称
  zydm: string;                   // 专业代码
  zymc: string;                   // 专业名称
  bjdm: string;                   // 班级代码
  bjmc: string;                   // 班级名称
  sjhm?: string;                  // 手机号
  dzyx?: string;                  // 邮箱
}

export interface TeacherInfo {
  gh: string;                     // 工号
  xm: string;                     // 姓名
  ssdwdm: string;                 // 所属单位代码
  ssdwmc: string;                 // 所属单位名称
  sjhm?: string;                  // 手机号
  dzyx?: string;                  // 邮箱
}

export interface UserView {
  id: number;                     // 主键ID
  user_code: string;              // 用户编号
  user_name: string;              // 用户姓名
  user_type: 'student' | 'teacher'; // 用户类型
  college_code?: string;          // 学院代码
  college_name?: string;          // 学院名称
  major_code?: string;            // 专业/部门代码
  major_name?: string;            // 专业/部门名称
  class_code?: string;            // 班级代码
  class_name?: string;            // 班级名称
  phone?: string;                 // 手机号
  email?: string;                 // 邮箱
  wps_user_id?: string;           // WPS用户ID
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed'; // 同步状态
}
```

### 8. 日期和时间类型

```typescript
export interface DateRange {
  startDate: string;              // 开始日期 (YYYY-MM-DD)
  endDate: string;                // 结束日期 (YYYY-MM-DD)
}

export interface TimeSlot {
  startTime: string;              // 开始时间 (HH:mm)
  endTime: string;                // 结束时间 (HH:mm)
}

export interface ScheduleUpdate {
  summary?: string;               // 日程标题
  description?: string;           // 日程描述
  startTime?: string;             // 开始时间
  endTime?: string;               // 结束时间
  location?: string;              // 地点
}
```

## 导入和使用

```typescript
// 在适配器中使用类型
import type {
  CourseCalendarInfo,
  CourseScheduleInfo,
  CourseParticipant,
  AdapterResult,
  CalendarResult,
  ScheduleResult
} from './types/adapter-types';

// 在服务中使用类型
import type {
  SyncResult,
  TaskInfo,
  TaskProgress,
  ServiceResult
} from './types/adapter-types';
```
