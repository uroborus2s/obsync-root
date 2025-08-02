# @stratix/icasync 服务层设计文档

## 概述

服务层负责核心业务逻辑的实现，采用函数式编程模式，提供全量同步、增量同步、用户管理等核心功能。所有服务都注册为 SINGLETON 生命周期。

## 设计原则

### 1. 函数式编程
- 所有服务方法都是纯函数或明确标识副作用
- 使用函数组合实现复杂业务逻辑
- 避免共享状态，保持线程安全

### 2. 单一职责
- 每个服务专注于特定的业务领域
- 清晰的服务边界和职责划分
- 高内聚、低耦合的设计

### 3. 错误处理
- 统一的错误处理和分类
- 详细的错误日志和监控
- 支持错误恢复和重试机制

### 4. 可测试性
- 依赖注入支持单元测试
- 纯函数易于测试和验证
- 完整的测试覆盖率

## 核心服务设计

### 1. 课程同步服务 (CourseSyncService)

负责课程数据的全量和增量同步逻辑。

```typescript
export interface CourseSyncService {
  // 全量同步
  performFullSync(xnxq: string): Promise<ServiceResult<SyncSummary>>;
  
  // 增量同步
  performIncrementalSync(): Promise<ServiceResult<SyncSummary>>;
  
  // 聚合课程数据
  aggregateCourseData(xnxq: string): Promise<ServiceResult<JuheRenwu[]>>;
  
  // 同步课程到日历
  syncCoursesToCalendars(courses: JuheRenwu[]): Promise<ServiceResult<SyncResult[]>>;
  
  // 同步日程
  syncSchedulesToWps(schedules: JuheRenwu[]): Promise<ServiceResult<SyncResult[]>>;
  
  // 处理课程变更
  handleCourseChanges(changes: CourseChange[]): Promise<ServiceResult<SyncResult[]>>;
  
  // 获取同步状态
  getSyncStatus(xnxq?: string): Promise<ServiceResult<SyncStatus>>;
}
```

#### 核心算法实现

```typescript
// 全量同步算法
const performFullSync = async (xnxq: string): Promise<ServiceResult<SyncSummary>> => {
  return pipe(
    // 1. 聚合课程数据
    () => aggregateCourseData(xnxq),
    
    // 2. 创建日历映射
    (courses) => createCalendarMappings(courses),
    
    // 3. 同步日历参与者
    (mappings) => syncCalendarParticipants(mappings),
    
    // 4. 同步日程数据
    (mappings) => syncScheduleData(mappings),
    
    // 5. 更新同步状态
    (results) => updateSyncStatus(results)
  )();
};

// 增量同步算法
const performIncrementalSync = async (): Promise<ServiceResult<SyncSummary>> => {
  return pipe(
    // 1. 获取变更数据
    () => getChangedCourses(),
    
    // 2. 处理删除的课程
    (changes) => handleDeletedCourses(changes.deleted),
    
    // 3. 处理新增/更新的课程
    (changes) => handleUpdatedCourses(changes.updated),
    
    // 4. 更新同步状态
    (results) => updateIncrementalSyncStatus(results)
  )();
};
```

### 2. 用户同步服务 (UserSyncService)

负责用户数据的同步和管理。

```typescript
export interface UserSyncService {
  // 同步用户视图
  syncUserView(): Promise<ServiceResult<UserSyncSummary>>;
  
  // 同步学生数据
  syncStudents(): Promise<ServiceResult<SyncResult[]>>;
  
  // 同步教师数据
  syncTeachers(): Promise<ServiceResult<SyncResult[]>>;
  
  // 处理用户变更
  handleUserChanges(): Promise<ServiceResult<SyncResult[]>>;
  
  // 更新日历参与者
  updateCalendarParticipants(userChanges: UserChange[]): Promise<ServiceResult<SyncResult[]>>;
  
  // 获取用户同步状态
  getUserSyncStatus(): Promise<ServiceResult<UserSyncStatus>>;
}
```

### 3. 日历管理服务 (CalendarManagementService)

负责课程日历的创建和管理，基于 CourseCalendarAdapter。

```typescript
export interface CalendarManagementService {
  // 创建课程日历
  createCourseCalendar(course: CourseInfo): Promise<ServiceResult<CalendarInfo>>;

  // 获取或创建日历
  getOrCreateCalendar(kkh: string, courseName: string): Promise<ServiceResult<CalendarInfo>>;

  // 添加日历参与者
  addCalendarParticipants(calendarId: string, participants: ParticipantInfo[]): Promise<ServiceResult<SyncResult[]>>;

  // 移除日历参与者
  removeCalendarParticipants(calendarId: string, participants: ParticipantInfo[]): Promise<ServiceResult<SyncResult[]>>;

  // 更新日历权限
  updateCalendarPermissions(calendarId: string, permissions: PermissionUpdate[]): Promise<ServiceResult<SyncResult[]>>;

  // 删除日历
  deleteCalendar(calendarId: string): Promise<ServiceResult<boolean>>;
}
```

#### 实现示例

```typescript
export class CalendarManagementService implements CalendarManagementService {
  constructor(
    private courseCalendarAdapter: CourseCalendarAdapter,
    private calendarMappingRepository: CalendarMappingRepository,
    private userViewRepository: UserViewRepository,
    private logger: Logger
  ) {}

  async createCourseCalendar(course: CourseInfo): Promise<ServiceResult<CalendarInfo>> {
    try {
      // 检查是否已存在日历
      const existingMapping = await this.calendarMappingRepository.findByKkh(course.kkh);
      if (existingMapping) {
        return {
          success: false,
          error: {
            code: 'CALENDAR_ALREADY_EXISTS',
            message: `Calendar already exists for course ${course.kkh}`
          }
        };
      }

      // 转换课程信息
      const courseCalendarInfo: CourseCalendarInfo = {
        kkh: course.kkh,
        xnxq: course.xnxq,
        courseName: course.courseName,
        teacherNames: course.teacherNames
      };

      // 调用适配器创建日历
      const result = await this.courseCalendarAdapter.createCourseCalendar(courseCalendarInfo);

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      return {
        success: true,
        data: result.data,
        message: `Course calendar created successfully for ${course.kkh}`
      };
    } catch (error) {
      this.logger.error('Failed to create course calendar:', error);
      return {
        success: false,
        error: {
          code: 'CALENDAR_CREATION_ERROR',
          message: error.message
        }
      };
    }
  }

  async addCalendarParticipants(
    calendarId: string,
    participants: ParticipantInfo[]
  ): Promise<ServiceResult<SyncResult[]>> {
    try {
      // 转换参与者信息
      const courseParticipants: CourseParticipant[] = participants.map(p => ({
        userCode: p.userCode,
        userName: p.userName,
        userType: p.userType,
        role: p.userType === 'teacher' ? 'teacher' : 'student'
      }));

      // 调用适配器添加参与者
      const result = await this.courseCalendarAdapter.addCourseParticipants(calendarId, courseParticipants);

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      // 转换结果格式
      const syncResults: SyncResult[] = result.data.map(r => ({
        id: r.userCode,
        success: r.success,
        error: r.error
      }));

      return {
        success: true,
        data: syncResults,
        message: `Added ${syncResults.filter(r => r.success).length} participants to calendar`
      };
    } catch (error) {
      this.logger.error('Failed to add calendar participants:', error);
      return {
        success: false,
        error: {
          code: 'PARTICIPANT_ADD_ERROR',
          message: error.message
        }
      };
    }
  }
}
```

### 4. 日程管理服务 (ScheduleManagementService)

负责课程日程的创建和管理，基于 CourseScheduleAdapter。

```typescript
export interface ScheduleManagementService {
  // 创建课程日程
  createCourseSchedule(scheduleInfo: CourseScheduleInfo): Promise<ServiceResult<ScheduleInfo>>;

  // 批量创建日程
  createSchedulesBatch(schedules: CourseScheduleInfo[]): Promise<ServiceResult<SyncResult[]>>;

  // 更新日程
  updateSchedule(scheduleId: string, updates: ScheduleUpdate): Promise<ServiceResult<ScheduleInfo>>;

  // 删除日程
  deleteSchedule(scheduleId: string): Promise<ServiceResult<boolean>>;

  // 批量删除日程
  deleteSchedulesBatch(scheduleIds: string[]): Promise<ServiceResult<SyncResult[]>>;

  // 获取日程列表
  getScheduleList(calendarId: string, dateRange?: DateRange): Promise<ServiceResult<ScheduleInfo[]>>;
}
```

#### 实现示例

```typescript
export class ScheduleManagementService implements ScheduleManagementService {
  constructor(
    private courseScheduleAdapter: CourseScheduleAdapter,
    private scheduleMappingRepository: ScheduleMappingRepository,
    private juheRenwuRepository: JuheRenwuRepository,
    private logger: Logger
  ) {}

  async createSchedulesBatch(schedules: CourseScheduleInfo[]): Promise<ServiceResult<SyncResult[]>> {
    try {
      // 验证日程数据
      const validationResult = await this.validateSchedules(schedules);
      if (!validationResult.success) {
        return validationResult;
      }

      // 调用适配器批量创建日程
      const result = await this.courseScheduleAdapter.createCourseSchedulesBatch(schedules);

      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      // 转换结果格式
      const syncResults: SyncResult[] = result.data.map(r => ({
        id: r.juheRenwuId.toString(),
        success: r.success,
        error: r.error
      }));

      // 更新聚合任务状态
      await this.updateJuheRenwuStatus(result.data);

      return {
        success: true,
        data: syncResults,
        message: `Created ${syncResults.filter(r => r.success).length} schedules successfully`
      };
    } catch (error) {
      this.logger.error('Failed to create schedules batch:', error);
      return {
        success: false,
        error: {
          code: 'SCHEDULE_BATCH_CREATE_ERROR',
          message: error.message
        }
      };
    }
  }

  private async validateSchedules(schedules: CourseScheduleInfo[]): Promise<ServiceResult<void>> {
    // 验证日程数据的完整性和有效性
    for (const schedule of schedules) {
      if (!schedule.calendarId || !schedule.courseName || !schedule.startTime || !schedule.endTime) {
        return {
          success: false,
          error: {
            code: 'INVALID_SCHEDULE_DATA',
            message: 'Schedule data is incomplete'
          }
        };
      }

      // 验证时间格式
      if (new Date(schedule.startTime) >= new Date(schedule.endTime)) {
        return {
          success: false,
          error: {
            code: 'INVALID_TIME_RANGE',
            message: 'Start time must be before end time'
          }
        };
      }
    }

    return { success: true };
  }

  private async updateJuheRenwuStatus(results: ScheduleResult[]): Promise<void> {
    const successfulIds = results.filter(r => r.success).map(r => r.juheRenwuId);

    if (successfulIds.length > 0) {
      await this.juheRenwuRepository.updateSyncStatusBatch(successfulIds, '2'); // 2 = 学生日历已推送
    }
  }
}
```

### 5. 任务管理服务 (TaskManagementService)

负责与 @stratix/tasks 的集成，管理同步任务的执行。

```typescript
export interface TaskManagementService {
  // 创建全量同步任务
  createFullSyncTask(xnxq: string): Promise<ServiceResult<TaskInfo>>;
  
  // 创建增量同步任务
  createIncrementalSyncTask(): Promise<ServiceResult<TaskInfo>>;
  
  // 创建用户同步任务
  createUserSyncTask(): Promise<ServiceResult<TaskInfo>>;
  
  // 执行同步任务
  executeSyncTask(taskId: string): Promise<ServiceResult<TaskExecution>>;
  
  // 监控任务进度
  monitorTaskProgress(taskId: string): Promise<ServiceResult<TaskProgress>>;
  
  // 取消任务
  cancelTask(taskId: string): Promise<ServiceResult<boolean>>;
  
  // 获取任务历史
  getTaskHistory(taskType?: string, limit?: number): Promise<ServiceResult<TaskInfo[]>>;
}
```

### 6. 数据验证服务 (DataValidationService)

负责数据的验证和清洗。

```typescript
export interface DataValidationService {
  // 验证课程数据
  validateCourseData(courses: CourseRaw[]): Promise<ServiceResult<ValidationResult>>;
  
  // 验证用户数据
  validateUserData(users: UserInfo[]): Promise<ServiceResult<ValidationResult>>;
  
  // 验证日程数据
  validateScheduleData(schedules: JuheRenwu[]): Promise<ServiceResult<ValidationResult>>;
  
  // 清洗数据
  cleanseData<T>(data: T[], rules: CleansingRule[]): Promise<ServiceResult<T[]>>;
  
  // 检查数据一致性
  checkDataConsistency(): Promise<ServiceResult<ConsistencyReport>>;
}
```

### 7. 监控和报告服务 (MonitoringService)

负责同步过程的监控和报告生成。

```typescript
export interface MonitoringService {
  // 记录同步事件
  recordSyncEvent(event: SyncEvent): Promise<ServiceResult<void>>;
  
  // 生成同步报告
  generateSyncReport(dateRange: DateRange): Promise<ServiceResult<SyncReport>>;
  
  // 获取同步统计
  getSyncStatistics(period: TimePeriod): Promise<ServiceResult<SyncStatistics>>;
  
  // 检查系统健康状态
  checkSystemHealth(): Promise<ServiceResult<HealthStatus>>;
  
  // 发送告警通知
  sendAlert(alert: AlertInfo): Promise<ServiceResult<void>>;
  
  // 获取性能指标
  getPerformanceMetrics(): Promise<ServiceResult<PerformanceMetrics>>;
}
```

## 服务间协作模式

### 1. 服务编排
```typescript
// 全量同步的服务编排
const fullSyncOrchestration = async (xnxq: string) => {
  // 1. 创建同步任务
  const task = await taskManagementService.createFullSyncTask(xnxq);
  
  // 2. 执行课程同步
  const syncResult = await courseSyncService.performFullSync(xnxq);
  
  // 3. 更新任务状态
  await taskManagementService.updateTaskStatus(task.id, syncResult);
  
  // 4. 生成报告
  await monitoringService.generateSyncReport(syncResult);
  
  return syncResult;
};
```

### 2. 事件驱动
```typescript
// 事件发布订阅模式
export interface SyncEventBus {
  publish(event: SyncEvent): Promise<void>;
  subscribe(eventType: string, handler: EventHandler): void;
}

// 事件处理示例
const handleCourseUpdated = async (event: CourseUpdatedEvent) => {
  await courseSyncService.handleCourseChanges([event.courseChange]);
  await monitoringService.recordSyncEvent(event);
};
```

### 3. 错误处理策略
```typescript
// 统一错误处理
const withErrorHandling = <T>(
  operation: () => Promise<ServiceResult<T>>,
  retryConfig?: RetryConfig
): Promise<ServiceResult<T>> => {
  return pipe(
    operation,
    handleServiceError,
    retryOnFailure(retryConfig),
    logError
  )();
};
```

## 依赖注入配置

使用自动扫描注册容器对象

```typescript
// 服务自动注册配置
// 通过 @stratix/core 的自动发现机制注册服务
// 服务文件需要遵循命名规范：*.service.ts
// 所有服务都注册为 SINGLETON 生命周期

// 服务依赖关系示例
export class CalendarManagementService {
  constructor(
    // 通过依赖注入获取适配器
    private courseCalendarAdapter: CourseCalendarAdapter,
    private calendarMappingRepository: CalendarMappingRepository,
    private userViewRepository: UserViewRepository,
    private logger: Logger
  ) {}
}

// 适配器依赖关系示例
export class CourseCalendarAdapter {
  constructor(
    // 从容器中获取 WPS 适配器
    private wpsCalendarAdapter: WpsCalendarAdapter, // 来自 'wasV7Calendar'
    private calendarMappingRepository: CalendarMappingRepository,
    private logger: Logger
  ) {}
}
```

### 容器解析示例

```typescript
// 在服务中获取 WPS 适配器
const wpsCalendarAdapter = container.resolve<WpsCalendarAdapter>('wasV7Calendar');
const wpsScheduleAdapter = container.resolve<WpsScheduleAdapter>('wasV7Schedule');

// 在适配器工厂中创建适配器
export class IcasyncAdapterFactory {
  constructor(private container: AwilixContainer) {}

  createCourseCalendarAdapter(): CourseCalendarAdapter {
    return new CourseCalendarAdapter(
      this.container.resolve<WpsCalendarAdapter>('wasV7Calendar'),
      this.container.resolve('calendarMappingRepository'),
      this.container.resolve('logger')
    );
  }
}
```

## 性能优化策略

### 1. 批量处理
- 批量创建日历和日程
- 批量更新同步状态
- 分页处理大量数据

### 2. 并发控制
- 限制并发请求数量
- 使用队列管理任务执行
- 避免API限流

### 3. 缓存策略
- 缓存用户映射关系
- 缓存日历信息
- 减少重复查询

### 4. 错误恢复
- 自动重试机制
- 断点续传功能
- 数据一致性检查

## 函数式编程实现示例

### 1. 管道操作
```typescript
import { pipe } from '@stratix/utils/functional';

const syncCoursesPipeline = pipe(
  validateCourseData,
  aggregateCourseData,
  createCalendarMappings,
  syncToWpsCalendars,
  updateSyncStatus
);
```

### 2. 错误处理组合
```typescript
import { Either, TaskEither } from '@stratix/utils/functional';

const safeSync = (data: CourseData): TaskEither<SyncError, SyncResult> =>
  pipe(
    data,
    validateData,
    chain(processData),
    chain(syncToWps),
    mapLeft(handleSyncError)
  );
```
