# @stratix/icasync 仓库层设计文档

## 概述

仓库层负责数据访问和持久化逻辑，采用函数式编程模式，基于 @stratix/database 提供的 Kysely 查询构建器实现类型安全的数据操作。

## 设计原则

### 1. 函数式编程
- 所有仓库方法都是纯函数
- 避免副作用，保持函数的可预测性
- 使用函数组合实现复杂查询

### 2. 类型安全
- 基于 Kysely 的类型安全查询
- 完整的 TypeScript 类型定义
- 编译时类型检查

### 3. 错误处理
- 统一的错误处理机制
- 详细的错误信息和分类
- 支持错误重试和恢复

### 4. 性能优化
- 高效的查询策略
- 批量操作支持
- 连接池管理

## 仓库接口设计

### 1. 基础仓库接口 (BaseRepository)

```typescript
import type { DatabaseResult } from '@stratix/database';

export interface BaseRepository<T, TInsert, TUpdate> {
  // 基础 CRUD 操作
  findById(id: string): Promise<DatabaseResult<T | null>>;
  findMany(filter?: Partial<T>): Promise<DatabaseResult<T[]>>;
  create(data: TInsert): Promise<DatabaseResult<T>>;
  update(id: string, data: TUpdate): Promise<DatabaseResult<T | null>>;
  delete(id: string): Promise<DatabaseResult<boolean>>;
  
  // 批量操作
  createMany(data: TInsert[]): Promise<DatabaseResult<T[]>>;
  updateMany(filter: Partial<T>, data: TUpdate): Promise<DatabaseResult<number>>;
  deleteMany(filter: Partial<T>): Promise<DatabaseResult<number>>;
  
  // 查询操作
  count(filter?: Partial<T>): Promise<DatabaseResult<number>>;
  exists(filter: Partial<T>): Promise<DatabaseResult<boolean>>;
}
```

### 2. 原始数据仓库

#### 课程原始数据仓库 (CourseRawRepository)

```typescript
export interface CourseRawRepository extends BaseRepository<CourseRaw, NewCourseRaw, CourseRawUpdate> {
  // 按学期查询
  findByXnxq(xnxq: string): Promise<DatabaseResult<CourseRaw[]>>;
  
  // 查询未处理的增量数据
  findUnprocessedIncremental(): Promise<DatabaseResult<CourseRaw[]>>;
  
  // 按开课号和日期查询
  findByKkhAndDate(kkh: string, rq: string): Promise<DatabaseResult<CourseRaw[]>>;
  
  // 更新同步状态
  updateSyncStatus(ids: string[], status: string, updateTime?: string): Promise<DatabaseResult<number>>;
  
  // 获取变化的课程数据
  findChangedCourses(): Promise<DatabaseResult<{ kkh: string; rq: string }[]>>;
}
```

#### 聚合任务仓库 (JuheRenwuRepository)

```typescript
export interface JuheRenwuRepository extends BaseRepository<JuheRenwu, NewJuheRenwu, JuheRenwuUpdate> {
  // 按开课号查询
  findByKkh(kkh: string): Promise<DatabaseResult<JuheRenwu[]>>;
  
  // 按学期查询
  findByXnxq(xnxq: string): Promise<DatabaseResult<JuheRenwu[]>>;
  
  // 按同步状态查询
  findByGxZt(gxZt: string): Promise<DatabaseResult<JuheRenwu[]>>;
  
  // 软删除
  softDelete(ids: number[], gxZt: string): Promise<DatabaseResult<number>>;
  
  // 聚合课程数据
  aggregateFromRaw(xnxq: string): Promise<DatabaseResult<JuheRenwu[]>>;
  
  // 批量更新同步状态
  updateSyncStatusBatch(ids: number[], gxZt: string, gxSj?: string): Promise<DatabaseResult<number>>;
}
```

#### 学生课程关联仓库 (StudentCourseRepository)

```typescript
export interface StudentCourseRepository extends BaseRepository<StudentCourse, NewStudentCourse, StudentCourseUpdate> {
  // 按开课号查询学生列表
  findStudentsByKkh(kkh: string): Promise<DatabaseResult<StudentCourse[]>>;
  
  // 按学生编号查询课程列表
  findCoursesByStudent(xh: string): Promise<DatabaseResult<StudentCourse[]>>;
  
  // 按学期查询
  findByXnxq(xnxq: string): Promise<DatabaseResult<StudentCourse[]>>;
  
  // 获取教学班信息
  getClassInfo(kkh: string): Promise<DatabaseResult<ClassInfo[]>>;
}
```

#### 用户信息仓库 (UserInfoRepository)

```typescript
export interface UserInfoRepository {
  // 学生信息操作
  findStudentById(id: string): Promise<DatabaseResult<StudentInfo | null>>;
  findStudentByXh(xh: string): Promise<DatabaseResult<StudentInfo | null>>;
  findStudentsByClass(bjdm: string): Promise<DatabaseResult<StudentInfo[]>>;
  findUnprocessedStudents(): Promise<DatabaseResult<StudentInfo[]>>;
  
  // 教师信息操作
  findTeacherById(id: string): Promise<DatabaseResult<TeacherInfo | null>>;
  findTeacherByGh(gh: string): Promise<DatabaseResult<TeacherInfo | null>>;
  findTeachersByDept(ssdwdm: string): Promise<DatabaseResult<TeacherInfo[]>>;
  findUnprocessedTeachers(): Promise<DatabaseResult<TeacherInfo[]>>;
  
  // 统一用户查询
  findUserByCode(userCode: string, userType: 'student' | 'teacher'): Promise<DatabaseResult<UserInfo | null>>;
}
```

### 3. 同步数据仓库

#### 日历映射仓库 (CalendarMappingRepository)

```typescript
export interface CalendarMappingRepository extends BaseRepository<CalendarMapping, NewCalendarMapping, CalendarMappingUpdate> {
  // 按开课号查询
  findByKkh(kkh: string): Promise<DatabaseResult<CalendarMapping | null>>;
  
  // 按日历ID查询
  findByCalendarId(calendarId: string): Promise<DatabaseResult<CalendarMapping | null>>;
  
  // 按学期查询
  findByXnxq(xnxq: string): Promise<DatabaseResult<CalendarMapping[]>>;
  
  // 按同步状态查询
  findBySyncStatus(status: SyncStatus): Promise<DatabaseResult<CalendarMapping[]>>;
  
  // 更新同步状态
  updateSyncStatus(id: string, status: SyncStatus): Promise<DatabaseResult<CalendarMapping | null>>;
  
  // 批量创建映射
  createMappingsBatch(mappings: NewCalendarMapping[]): Promise<DatabaseResult<CalendarMapping[]>>;
}
```

#### 日程映射仓库 (ScheduleMappingRepository)

```typescript
export interface ScheduleMappingRepository extends BaseRepository<ScheduleMapping, NewScheduleMapping, ScheduleMappingUpdate> {
  // 按聚合任务ID查询
  findByJuheRenwuId(juheRenwuId: number): Promise<DatabaseResult<ScheduleMapping | null>>;
  
  // 按开课号查询
  findByKkh(kkh: string): Promise<DatabaseResult<ScheduleMapping[]>>;
  
  // 按日历ID查询
  findByCalendarId(calendarId: string): Promise<DatabaseResult<ScheduleMapping[]>>;
  
  // 按日程ID查询
  findByScheduleId(scheduleId: string): Promise<DatabaseResult<ScheduleMapping | null>>;
  
  // 按同步状态查询
  findBySyncStatus(status: SyncStatus): Promise<DatabaseResult<ScheduleMapping[]>>;
  
  // 更新同步状态
  updateSyncStatus(id: string, status: SyncStatus): Promise<DatabaseResult<ScheduleMapping | null>>;
  
  // 批量删除映射
  deleteMappingsBatch(juheRenwuIds: number[]): Promise<DatabaseResult<number>>;
}
```

#### 用户视图仓库 (UserViewRepository)

```typescript
export interface UserViewRepository extends BaseRepository<UserView, NewUserView, UserViewUpdate> {
  // 按用户编号查询
  findByUserCode(userCode: string, userType?: 'student' | 'teacher'): Promise<DatabaseResult<UserView | null>>;
  
  // 按用户类型查询
  findByUserType(userType: 'student' | 'teacher'): Promise<DatabaseResult<UserView[]>>;
  
  // 按学院查询
  findByCollege(collegeCode: string): Promise<DatabaseResult<UserView[]>>;
  
  // 按班级查询学生
  findStudentsByClass(classCode: string): Promise<DatabaseResult<UserView[]>>;
  
  // 按同步状态查询
  findBySyncStatus(status: SyncStatus): Promise<DatabaseResult<UserView[]>>;
  
  // 同步用户数据
  syncFromOriginalTables(): Promise<DatabaseResult<number>>;
  
  // 更新WPS用户ID
  updateWpsUserId(id: string, wpsUserId: string): Promise<DatabaseResult<UserView | null>>;
}
```

#### 日历参与者仓库 (CalendarParticipantsRepository)

```typescript
export interface CalendarParticipantsRepository extends BaseRepository<CalendarParticipant, NewCalendarParticipant, CalendarParticipantUpdate> {
  // 按日历ID查询参与者
  findByCalendarId(calendarId: string): Promise<DatabaseResult<CalendarParticipant[]>>;

  // 按开课号查询参与者
  findByKkh(kkh: string): Promise<DatabaseResult<CalendarParticipant[]>>;

  // 按用户查询参与的日历
  findByUserCode(userCode: string): Promise<DatabaseResult<CalendarParticipant[]>>;

  // 按用户类型查询
  findByUserType(userType: 'student' | 'teacher'): Promise<DatabaseResult<CalendarParticipant[]>>;

  // 按权限角色查询
  findByPermissionRole(role: 'reader' | 'writer' | 'owner'): Promise<DatabaseResult<CalendarParticipant[]>>;

  // 批量添加参与者
  createParticipantsBatch(participants: NewCalendarParticipant[]): Promise<DatabaseResult<CalendarParticipant[]>>;

  // 批量移除参与者（软删除）
  deleteByCalendarId(calendarId: string): Promise<DatabaseResult<number>>;
  deleteByUserCode(userCode: string): Promise<DatabaseResult<number>>;

  // 更新参与者权限
  updatePermissionRole(id: number, role: 'reader' | 'writer' | 'owner'): Promise<DatabaseResult<CalendarParticipant | null>>;

  // 软删除相关操作
  hardDelete(id: number): Promise<DatabaseResult<boolean>>;
  findDeleted(): Promise<DatabaseResult<CalendarParticipant[]>>;
  restore(id: number): Promise<DatabaseResult<CalendarParticipant | null>>;
}
```

#### 同步任务仓库 (SyncTaskRepository)

```typescript
export interface SyncTaskRepository extends BaseRepository<SyncTask, NewSyncTask, SyncTaskUpdate> {
  // 按任务类型查询
  findByTaskType(taskType: 'full_sync' | 'incremental_sync' | 'user_sync'): Promise<DatabaseResult<SyncTask[]>>;
  
  // 按学期查询
  findByXnxq(xnxq: string): Promise<DatabaseResult<SyncTask[]>>;
  
  // 按状态查询
  findByStatus(status: TaskStatus): Promise<DatabaseResult<SyncTask[]>>;
  
  // 查询运行中的任务
  findRunningTasks(): Promise<DatabaseResult<SyncTask[]>>;
  
  // 更新任务进度
  updateProgress(id: string, progress: number, processedItems: number): Promise<DatabaseResult<SyncTask | null>>;
  
  // 更新任务状态
  updateStatus(id: string, status: TaskStatus, errorMessage?: string): Promise<DatabaseResult<SyncTask | null>>;
  
  // 完成任务
  completeTask(id: string, resultSummary: any): Promise<DatabaseResult<SyncTask | null>>;
  
  // 获取最近的同步任务
  getLatestSyncTask(taskType: string, xnxq?: string): Promise<DatabaseResult<SyncTask | null>>;
}
```

## 实现策略

### 1. 基础仓库实现
- 继承 @stratix/database 的 BaseRepository
- 实现通用的 CRUD 操作
- 提供类型安全的查询构建

### 2. 专用仓库实现
- 基于业务需求扩展特定方法
- 实现复杂的查询逻辑
- 支持事务操作

### 3. 错误处理
- 统一的错误处理机制
- 详细的错误日志记录
- 支持错误重试策略

### 4. 性能优化
- 使用索引优化查询性能
- 实现查询结果缓存
- 支持分页和批量操作

## 依赖注入配置
使用自动扫描注册容器对象

