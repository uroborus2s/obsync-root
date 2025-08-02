# @stratix/icasync 适配器层设计文档

## 概述

适配器层负责与外部系统的集成，主要包括 @stratix/was-v7 的 WPS API 适配器和 @stratix/tasks 任务管理系统。本设计基于现有的 WPS 适配器接口，通过依赖注入获取并封装这些适配器，提供统一的接口抽象。

## 设计原则

### 1. 适配器复用
- 复用 @stratix/was-v7 中已封装的 WPS API 适配器
- 通过依赖注入获取现有适配器实例
- 避免重复实现 WPS API 调用逻辑

### 2. 函数式编程
- 适配器方法为纯函数
- 明确的输入输出定义
- 可组合的函数设计

### 3. 错误处理
- 统一的错误转换机制
- 详细的错误日志记录
- 支持重试和降级策略

### 4. 性能优化
- 批量操作支持
- 请求缓存机制
- 连接池管理

## 外部适配器集成

### 1. WPS 日历适配器集成

基于 @stratix/was-v7 的 `WpsCalendarAdapter` 接口：

```typescript
// 从容器中获取 WPS 日历适配器
const wpsCalendarAdapter = container.resolve<WpsCalendarAdapter>('wasV7Calendar');

// 可用的方法：
// - createCalendar(params: CreateCalendarParams): Promise<CalendarInfo>
// - getPrimaryCalendar(): Promise<CalendarInfo>
// - createCalendarPermission(params: CreateCalendarPermissionParams): Promise<CreateCalendarPermissionResponse>
// - getCalendarPermissionList(params: GetCalendarPermissionListParams): Promise<GetCalendarPermissionListResponse>
// - getAllCalendarPermissions(params: GetCalendarPermissionListParams): Promise<CalendarPermission[]>
// - deleteCalendar(params: DeleteCalendarParams): Promise<void>
// - batchCreateCalendarPermissions(params: BatchCreateCalendarPermissionsParams): Promise<BatchCreateCalendarPermissionsResponse>
// - deleteCalendarPermission(params: DeleteCalendarPermissionParams): Promise<void>
```

### 2. WPS 日程适配器集成

基于 @stratix/was-v7 的 `WpsScheduleAdapter` 接口：

```typescript
// 从容器中获取 WPS 日程适配器
const wpsScheduleAdapter = container.resolve<WpsScheduleAdapter>('wasV7Schedule');

// 可用的方法：
// - createSchedule(params: CreateScheduleParams): Promise<CreateScheduleResponse>
// - batchCreateSchedules(params: BatchCreateSchedulesParams): Promise<BatchCreateSchedulesResponse>
// - deleteSchedule(params: DeleteScheduleParams): Promise<void>
// - getScheduleList(params: GetScheduleListParams): Promise<GetScheduleListResponse>
// - getSchedule(params: GetScheduleParams): Promise<ScheduleInfo>
```

## 适配器设计

### 1. 课程日历适配器 (CourseCalendarAdapter)

封装课程相关的日历操作，基于 WPS 日历适配器。

```typescript
export interface CourseCalendarAdapter {
  // 课程日历管理
  createCourseCalendar(courseInfo: CourseCalendarInfo): Promise<AdapterResult<CalendarInfo>>;
  getCourseCalendar(kkh: string): Promise<AdapterResult<CalendarInfo | null>>;
  deleteCourseCalendar(calendarId: string): Promise<AdapterResult<boolean>>;
  
  // 课程日历参与者管理
  addCourseParticipants(calendarId: string, participants: CourseParticipant[]): Promise<AdapterResult<ParticipantResult[]>>;
  removeCourseParticipants(calendarId: string, userIds: string[]): Promise<AdapterResult<boolean>>;
  updateParticipantPermissions(calendarId: string, permissions: PermissionUpdate[]): Promise<AdapterResult<PermissionResult[]>>;
  
  // 批量操作
  createCourseCalendarsBatch(courses: CourseCalendarInfo[]): Promise<AdapterResult<CalendarResult[]>>;
  syncParticipantsBatch(calendarId: string, participants: CourseParticipant[]): Promise<AdapterResult<BatchResult>>;
}
```

#### 实现示例

```typescript
export class CourseCalendarAdapter implements CourseCalendarAdapter {
  constructor(
    private wpsCalendarAdapter: WpsCalendarAdapter,
    private calendarMappingRepository: CalendarMappingRepository,
    private logger: Logger
  ) {}

  async createCourseCalendar(courseInfo: CourseCalendarInfo): Promise<AdapterResult<CalendarInfo>> {
    try {
      // 转换课程信息为 WPS 日历格式
      const calendarParams = this.transformCourseToCalendar(courseInfo);
      
      // 调用 WPS API 创建日历
      const calendar = await this.wpsCalendarAdapter.createCalendar(calendarParams);
      
      // 保存映射关系
      await this.calendarMappingRepository.create({
        kkh: courseInfo.kkh,
        xnxq: courseInfo.xnxq,
        calendar_id: calendar.id,
        calendar_name: calendar.summary,
        sync_status: 'completed'
      });
      
      return {
        success: true,
        data: calendar,
        metadata: {
          source: 'wps-calendar-api',
          operation: 'create-course-calendar',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return this.handleError(error, 'createCourseCalendar');
    }
  }

  async addCourseParticipants(
    calendarId: string, 
    participants: CourseParticipant[]
  ): Promise<AdapterResult<ParticipantResult[]>> {
    try {
      // 转换参与者信息为 WPS 格式
      const wpsParticipants = participants.map(p => ({
        user_id: p.userCode,
        role: this.mapPermissionRole(p.role),
        id_type: 'external' as const
      }));
      
      // 批量创建日历权限
      const result = await this.wpsCalendarAdapter.batchCreateCalendarPermissions({
        calendar_id: calendarId,
        permissions: wpsParticipants
      });
      
      // 保存参与者映射
      await this.saveParticipantMappings(calendarId, participants, result);
      
      return {
        success: true,
        data: result.results.map(r => ({
          userCode: r.user_id,
          success: r.success,
          permissionId: r.permission_id,
          error: r.error
        })),
        metadata: {
          source: 'wps-calendar-api',
          operation: 'add-course-participants',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return this.handleError(error, 'addCourseParticipants');
    }
  }

  private transformCourseToCalendar(courseInfo: CourseCalendarInfo): CreateCalendarParams {
    return {
      summary: `${courseInfo.courseName} (${courseInfo.kkh})`
    };
  }

  private mapPermissionRole(role: 'student' | 'teacher'): 'reader' | 'writer' | 'owner' {
    switch (role) {
      case 'teacher':
        return 'owner';
      case 'student':
        return 'reader';
      default:
        return 'reader';
    }
  }

  private async saveParticipantMappings(
    calendarId: string,
    participants: CourseParticipant[],
    result: BatchCreateCalendarPermissionsResponse
  ): Promise<void> {
    // 实现参与者映射保存逻辑
  }

  private handleError(error: any, operation: string): AdapterResult<any> {
    this.logger.error(`Course Calendar Adapter Error [${operation}]:`, error);
    
    return {
      success: false,
      error: {
        code: error.code || 'COURSE_CALENDAR_ERROR',
        message: error.message || 'Course calendar operation failed',
        details: error
      },
      metadata: {
        source: 'course-calendar-adapter',
        operation,
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

### 2. 课程日程适配器 (CourseScheduleAdapter)

封装课程相关的日程操作，基于 WPS 日程适配器。

```typescript
export interface CourseScheduleAdapter {
  // 课程日程管理
  createCourseSchedule(scheduleInfo: CourseScheduleInfo): Promise<AdapterResult<ScheduleInfo>>;
  getCourseSchedule(scheduleId: string): Promise<AdapterResult<ScheduleInfo | null>>;
  updateCourseSchedule(scheduleId: string, updates: ScheduleUpdate): Promise<AdapterResult<ScheduleInfo>>;
  deleteCourseSchedule(scheduleId: string): Promise<AdapterResult<boolean>>;
  
  // 批量操作
  createCourseSchedulesBatch(schedules: CourseScheduleInfo[]): Promise<AdapterResult<ScheduleResult[]>>;
  deleteCourseSchedulesBatch(scheduleIds: string[]): Promise<AdapterResult<BatchResult>>;
  
  // 查询操作
  getCourseSchedulesByCalendar(calendarId: string, dateRange?: DateRange): Promise<AdapterResult<ScheduleInfo[]>>;
  getCourseSchedulesByDateRange(calendarId: string, startDate: string, endDate: string): Promise<AdapterResult<ScheduleInfo[]>>;
}
```

#### 实现示例

```typescript
export class CourseScheduleAdapter implements CourseScheduleAdapter {
  constructor(
    private wpsScheduleAdapter: WpsScheduleAdapter,
    private scheduleMappingRepository: ScheduleMappingRepository,
    private logger: Logger
  ) {}

  async createCourseSchedule(scheduleInfo: CourseScheduleInfo): Promise<AdapterResult<ScheduleInfo>> {
    try {
      // 转换课程日程信息为 WPS 格式
      const scheduleParams = this.transformCourseToSchedule(scheduleInfo);
      
      // 调用 WPS API 创建日程
      const schedule = await this.wpsScheduleAdapter.createSchedule(scheduleParams);
      
      // 保存映射关系
      await this.scheduleMappingRepository.create({
        juhe_renwu_id: scheduleInfo.juheRenwuId,
        kkh: scheduleInfo.kkh,
        calendar_id: scheduleInfo.calendarId,
        schedule_id: schedule.id,
        schedule_summary: schedule.summary,
        sync_status: 'completed'
      });
      
      return {
        success: true,
        data: schedule,
        metadata: {
          source: 'wps-schedule-api',
          operation: 'create-course-schedule',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return this.handleError(error, 'createCourseSchedule');
    }
  }

  async createCourseSchedulesBatch(schedules: CourseScheduleInfo[]): Promise<AdapterResult<ScheduleResult[]>> {
    try {
      // 按日历ID分组
      const schedulesByCalendar = this.groupSchedulesByCalendar(schedules);
      const allResults: ScheduleResult[] = [];
      
      // 为每个日历批量创建日程
      for (const [calendarId, calendarSchedules] of schedulesByCalendar) {
        const wpsSchedules = calendarSchedules.map(s => this.transformCourseToScheduleEvent(s));
        
        const batchResult = await this.wpsScheduleAdapter.batchCreateSchedules({
          calendar_id: calendarId,
          events: wpsSchedules
        });
        
        // 保存映射关系
        await this.saveBatchScheduleMappings(calendarSchedules, batchResult);
        
        // 转换结果格式
        const results = batchResult.created_events.map((event, index) => ({
          juheRenwuId: calendarSchedules[index].juheRenwuId,
          scheduleId: event.id,
          success: true,
          error: null
        }));
        
        allResults.push(...results);
      }
      
      return {
        success: true,
        data: allResults,
        metadata: {
          source: 'wps-schedule-api',
          operation: 'create-course-schedules-batch',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return this.handleError(error, 'createCourseSchedulesBatch');
    }
  }

  private transformCourseToSchedule(scheduleInfo: CourseScheduleInfo): CreateScheduleParams {
    return {
      calendar_id: scheduleInfo.calendarId,
      summary: scheduleInfo.courseName,
      description: `课程：${scheduleInfo.courseName}\n教师：${scheduleInfo.teacherNames}\n教室：${scheduleInfo.location}`,
      start_time: {
        datetime: scheduleInfo.startTime
      },
      end_time: {
        datetime: scheduleInfo.endTime
      },
      is_all_day: false,
      status: 'confirmed',
      transparency: 'opaque',
      visibility: 'default'
    };
  }

  private transformCourseToScheduleEvent(scheduleInfo: CourseScheduleInfo) {
    const { calendar_id, ...eventData } = this.transformCourseToSchedule(scheduleInfo);
    return eventData;
  }

  private groupSchedulesByCalendar(schedules: CourseScheduleInfo[]): Map<string, CourseScheduleInfo[]> {
    const grouped = new Map<string, CourseScheduleInfo[]>();
    
    for (const schedule of schedules) {
      const existing = grouped.get(schedule.calendarId) || [];
      existing.push(schedule);
      grouped.set(schedule.calendarId, existing);
    }
    
    return grouped;
  }

  private async saveBatchScheduleMappings(
    schedules: CourseScheduleInfo[],
    result: BatchCreateSchedulesResponse
  ): Promise<void> {
    // 实现批量映射保存逻辑
  }

  private handleError(error: any, operation: string): AdapterResult<any> {
    this.logger.error(`Course Schedule Adapter Error [${operation}]:`, error);
    
    return {
      success: false,
      error: {
        code: error.code || 'COURSE_SCHEDULE_ERROR',
        message: error.message || 'Course schedule operation failed',
        details: error
      },
      metadata: {
        source: 'course-schedule-adapter',
        operation,
        timestamp: new Date().toISOString()
      }
    };
  }
}
```

### 3. 任务管理适配器 (TaskManagementAdapter)

封装 @stratix/tasks 的任务管理功能。

```typescript
export interface TaskManagementAdapter {
  // 任务树管理
  createSyncTaskTree(taskInfo: SyncTaskInfo): Promise<AdapterResult<TaskTreeInfo>>;
  getTaskTree(taskTreeId: string): Promise<AdapterResult<TaskTreeInfo>>;
  deleteTaskTree(taskTreeId: string): Promise<AdapterResult<boolean>>;

  // 任务节点管理
  addTaskNode(taskTreeId: string, nodeInfo: TaskNodeInfo): Promise<AdapterResult<TaskNodeInfo>>;
  updateTaskNode(nodeId: string, updates: TaskNodeUpdate): Promise<AdapterResult<TaskNodeInfo>>;
  getTaskNode(nodeId: string): Promise<AdapterResult<TaskNodeInfo>>;

  // 任务执行
  executeTaskTree(taskTreeId: string): Promise<AdapterResult<TaskExecution>>;
  pauseTaskTree(taskTreeId: string): Promise<AdapterResult<boolean>>;
  resumeTaskTree(taskTreeId: string): Promise<AdapterResult<boolean>>;
  cancelTaskTree(taskTreeId: string): Promise<AdapterResult<boolean>>;

  // 任务监控
  getTaskProgress(taskTreeId: string): Promise<AdapterResult<TaskProgress>>;
  getTaskHistory(filter?: TaskHistoryFilter): Promise<AdapterResult<TaskInfo[]>>;

  // 任务处理器注册
  registerTaskProcessor(processorName: string, processor: TaskProcessor): Promise<AdapterResult<boolean>>;
}
```

### 4. 数据转换适配器 (DataTransformAdapter)

负责数据格式的转换和映射。

```typescript
export interface DataTransformAdapter {
  // 课程数据转换
  transformCourseRawToJuheRenwu(courseRaw: CourseRaw[]): Promise<AdapterResult<JuheRenwu[]>>;
  transformJuheRenwuToSchedule(juheRenwu: JuheRenwu): Promise<AdapterResult<CourseScheduleInfo>>;

  // 用户数据转换
  transformStudentToUserView(student: StudentInfo): Promise<AdapterResult<UserView>>;
  transformTeacherToUserView(teacher: TeacherInfo): Promise<AdapterResult<UserView>>;

  // WPS 数据转换
  transformUserViewToWpsParticipant(userView: UserView): Promise<AdapterResult<CourseParticipant>>;
  transformCourseToWpsCalendar(course: CourseInfo): Promise<AdapterResult<CourseCalendarInfo>>;

  // 批量转换
  batchTransform<T, R>(items: T[], transformer: (item: T) => Promise<AdapterResult<R>>): Promise<AdapterResult<R[]>>;
}
```

### 5. 缓存适配器 (CacheAdapter)

提供缓存功能的适配器。

```typescript
export interface CacheAdapter {
  // 基础缓存操作
  get<T>(key: string): Promise<AdapterResult<T | null>>;
  set<T>(key: string, value: T, ttl?: number): Promise<AdapterResult<boolean>>;
  delete(key: string): Promise<AdapterResult<boolean>>;
  exists(key: string): Promise<AdapterResult<boolean>>;

  // 批量操作
  mget<T>(keys: string[]): Promise<AdapterResult<(T | null)[]>>;
  mset<T>(items: { key: string; value: T; ttl?: number }[]): Promise<AdapterResult<boolean>>;

  // 模式操作
  deletePattern(pattern: string): Promise<AdapterResult<number>>;
  getKeys(pattern: string): Promise<AdapterResult<string[]>>;

  // 缓存统计
  getStats(): Promise<AdapterResult<CacheStats>>;
  clear(): Promise<AdapterResult<boolean>>;
}
```

## 适配器工厂

### 1. 适配器工厂接口

```typescript
export interface AdapterFactory {
  createCourseCalendarAdapter(): CourseCalendarAdapter;
  createCourseScheduleAdapter(): CourseScheduleAdapter;
  createTaskAdapter(): TaskManagementAdapter;
  createDataTransformAdapter(): DataTransformAdapter;
  createCacheAdapter(): CacheAdapter;
}
```

### 2. 工厂实现

```typescript
export class IcasyncAdapterFactory implements AdapterFactory {
  constructor(
    private container: AwilixContainer,
    private logger: Logger
  ) {}

  createCourseCalendarAdapter(): CourseCalendarAdapter {
    // 从容器中获取 WPS 日历适配器
    const wpsCalendarAdapter = this.container.resolve<WpsCalendarAdapter>('wasV7Calendar');
    const calendarMappingRepository = this.container.resolve('calendarMappingRepository');

    return new CourseCalendarAdapter(wpsCalendarAdapter, calendarMappingRepository, this.logger);
  }

  createCourseScheduleAdapter(): CourseScheduleAdapter {
    // 从容器中获取 WPS 日程适配器
    const wpsScheduleAdapter = this.container.resolve<WpsScheduleAdapter>('wasV7Schedule');
    const scheduleMappingRepository = this.container.resolve('scheduleMappingRepository');

    return new CourseScheduleAdapter(wpsScheduleAdapter, scheduleMappingRepository, this.logger);
  }

  createTaskAdapter(): TaskManagementAdapter {
    // 从容器中获取任务管理相关服务
    const taskTreeAdapter = this.container.resolve('taskTreeAdapter');
    const taskNodeAdapter = this.container.resolve('taskNodeAdapter');
    const taskExecutionAdapter = this.container.resolve('taskExecutionAdapter');

    return new TaskManagementAdapter(taskTreeAdapter, taskNodeAdapter, taskExecutionAdapter, this.logger);
  }

  // ... 其他适配器创建方法
}
```

## 错误处理策略

### 1. 统一错误格式

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

### 2. 重试机制

```typescript
export const withRetry = <T>(
  operation: () => Promise<AdapterResult<T>>,
  retryConfig: RetryConfig = { maxRetries: 3, delay: 1000 }
): Promise<AdapterResult<T>> => {
  return pipe(
    operation,
    retryOnFailure(retryConfig),
    logRetryAttempts
  )();
};
```

## 依赖注入配置

使用自动扫描注册容器对象

```typescript
// 适配器自动注册配置
// 通过 @stratix/core 的自动发现机制注册适配器
// 适配器文件需要遵循命名规范：*.adapter.ts
// 并导出默认的适配器配置对象

// 示例适配器配置
export default {
  adapterName: 'courseCalendar',
  factory: (container: AwilixContainer) => {
    const wpsCalendarAdapter = container.resolve<WpsCalendarAdapter>('wasV7Calendar');
    const calendarMappingRepository = container.resolve('calendarMappingRepository');
    const logger = container.resolve('logger');

    return new CourseCalendarAdapter(wpsCalendarAdapter, calendarMappingRepository, logger);
  }
};
```

## 性能优化策略

### 1. 批量处理
- WPS API 调用使用批量接口
- 数据库操作批量执行
- 减少网络往返次数

### 2. 缓存策略
- 用户映射关系缓存
- 日历信息缓存
- API 响应缓存

### 3. 并发控制
- 限制并发 API 调用数量
- 使用队列管理请求
- 避免 API 限流

### 4. 连接池管理
- 复用 HTTP 连接
- 管理数据库连接池
- 优化资源使用
