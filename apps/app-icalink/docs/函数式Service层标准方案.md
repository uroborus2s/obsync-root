# 函数式 Service 层标准实现方案

## 目录
1. [标准 Service 方法签名](#1-标准-service-方法签名)
2. [函数式 vs OOP 对比](#2-函数式-vs-oop-对比)
3. [错误处理模式](#3-错误处理模式)
4. [异步操作处理](#4-异步操作处理)
5. [函数式优势分析](#5-函数式优势分析)
6. [实现示例](#6-实现示例)

---

## 1. 标准 Service 方法签名

### 1.1 现有 OOP 方式

```typescript
// 现有方式：类方法 + ServiceResult
class AttendanceService implements IAttendanceService {
  constructor(
    private readonly attendanceRecordRepository: IAttendanceRecordRepository,
    private readonly logger: Logger
  ) {}

  async getStudentAttendanceRecord(
    courseId: string,
    studentInfo: UserInfo
  ): Promise<ServiceResult<AttendanceRecord>> {
    return wrapServiceCall(async () => {
      // 业务逻辑
      const courseResult = await this.attendanceRecordRepository.findById(courseId);
      if (!isSuccessResult(courseResult)) {
        throw new Error('课程不存在');
      }
      return courseResult.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }
}
```

**问题**：
- ❌ 依赖 `this` 上下文，不是纯函数
- ❌ 错误处理通过异常，不够函数式
- ❌ 难以组合和复用
- ❌ 测试需要 mock 整个类实例

### 1.2 函数式方式（推荐）

```typescript
// 函数式方式：纯函数 + Either
import { Either, right, left, tryCatchAsync, pipe, eitherChain } from '@stratix/utils/functional';

// 定义依赖类型
type AttendanceDeps = {
  attendanceRecordRepository: IAttendanceRecordRepository;
  logger: Logger;
};

// 纯函数签名
type GetStudentAttendanceRecord = (
  deps: AttendanceDeps
) => (
  courseId: string,
  studentInfo: UserInfo
) => Promise<Either<ServiceError, AttendanceRecord>>;

// 实现
const getStudentAttendanceRecord: GetStudentAttendanceRecord = (deps) => async (courseId, studentInfo) => {
  const { attendanceRecordRepository, logger } = deps;
  
  logger.info({ courseId, studentId: studentInfo.id }, 'Getting student attendance record');
  
  return pipe(
    await tryCatchAsync(
      () => attendanceRecordRepository.findById(courseId),
      (error) => toServiceError(error, ServiceErrorCode.DATABASE_ERROR)
    ),
    eitherChain(validateCourseExists),
    eitherMap(extractCourseData)
  );
};
```

**优势**：
- ✅ 纯函数，无副作用（除了日志）
- ✅ 显式依赖注入
- ✅ 类型安全的错误处理
- ✅ 易于组合和测试

---

## 2. 函数式 vs OOP 对比

### 2.1 简单 CRUD 操作

#### OOP 方式
```typescript
class UserService {
  constructor(private readonly userRepository: IUserRepository) {}
  
  async getUserById(id: string): Promise<ServiceResult<User>> {
    return wrapServiceCall(async () => {
      const result = await this.userRepository.findById(id);
      if (!isSuccessResult(result)) {
        throw new Error('User not found');
      }
      return result.data;
    }, ServiceErrorCode.DATABASE_ERROR);
  }
}
```

#### 函数式方式
```typescript
type UserDeps = { userRepository: IUserRepository };

const getUserById = (deps: UserDeps) => (id: string): Promise<Either<ServiceError, User>> =>
  pipe(
    tryCatchAsync(
      () => deps.userRepository.findById(id),
      toServiceError(ServiceErrorCode.DATABASE_ERROR)
    ),
    eitherChain(validateUserExists)
  );
```

**对比**：
- 函数式代码更简洁（5行 vs 10行）
- 函数式更容易测试（无需 mock 类）
- 函数式更容易组合（可以直接 pipe）

### 2.2 复杂业务逻辑

#### OOP 方式
```typescript
class AttendanceService {
  async checkin(request: CheckinRequest): Promise<ServiceResult<CheckinResponse>> {
    return wrapServiceCall(async () => {
      // 步骤1：验证课程
      const courseResult = await this.attendanceCourseRepository.findById(request.courseId);
      if (!isSuccessResult(courseResult)) {
        throw new Error('课程不存在');
      }
      
      // 步骤2：验证时间窗口
      const course = courseResult.data;
      if (!this.isWithinCheckinWindow(course, new Date())) {
        throw new Error('不在签到时间范围内');
      }
      
      // 步骤3：检查重复签到
      const existingResult = await this.attendanceRecordRepository.findByCourseAndStudent(
        course.id,
        request.studentId
      );
      if (isSuccessResult(existingResult) && existingResult.data) {
        throw new Error('已经签到过了');
      }
      
      // 步骤4：创建签到记录
      const recordResult = await this.attendanceRecordRepository.create({
        course_id: course.id,
        student_id: request.studentId,
        status: AttendanceStatus.PRESENT,
        checkin_time: new Date()
      });
      
      if (!isSuccessResult(recordResult)) {
        throw new Error('签到失败');
      }
      
      return {
        success: true,
        message: '签到成功',
        record: recordResult.data
      };
    }, ServiceErrorCode.DATABASE_ERROR);
  }
}
```

#### 函数式方式
```typescript
type CheckinDeps = {
  attendanceCourseRepository: IAttendanceCourseRepository;
  attendanceRecordRepository: IAttendanceRecordRepository;
  logger: Logger;
};

// 分解为小的纯函数
const validateCourse = (courseId: string) => (deps: CheckinDeps) =>
  tryCatchAsync(
    () => deps.attendanceCourseRepository.findById(courseId),
    toServiceError(ServiceErrorCode.RESOURCE_NOT_FOUND, '课程不存在')
  );

const validateCheckinWindow = (course: Course) => (now: Date): Either<ServiceError, Course> =>
  isWithinCheckinWindow(course, now)
    ? right(course)
    : left(toServiceError(ServiceErrorCode.ATTENDANCE_WINDOW_CLOSED, '不在签到时间范围内'));

const checkDuplicateCheckin = (course: Course, studentId: string) => (deps: CheckinDeps) =>
  pipe(
    tryCatchAsync(
      () => deps.attendanceRecordRepository.findByCourseAndStudent(course.id, studentId),
      toServiceError(ServiceErrorCode.DATABASE_ERROR)
    ),
    eitherChain((existing) =>
      existing ? left(toServiceError(ServiceErrorCode.ATTENDANCE_ALREADY_EXISTS, '已经签到过了')) : right(course)
    )
  );

const createCheckinRecord = (course: Course, studentId: string) => (deps: CheckinDeps) =>
  tryCatchAsync(
    () => deps.attendanceRecordRepository.create({
      course_id: course.id,
      student_id: studentId,
      status: AttendanceStatus.PRESENT,
      checkin_time: new Date()
    }),
    toServiceError(ServiceErrorCode.DATABASE_ERROR, '签到失败')
  );

// 组合所有步骤
const checkin = (deps: CheckinDeps) => async (request: CheckinRequest): Promise<Either<ServiceError, CheckinResponse>> => {
  deps.logger.info({ request }, 'Processing checkin');
  
  return pipeAsync(
    request.courseId,
    validateCourse(deps),
    eitherChain((course) => validateCheckinWindow(course)(new Date())),
    eitherChain((course) => checkDuplicateCheckin(course, request.studentId)(deps)),
    eitherChain((course) => createCheckinRecord(course, request.studentId)(deps)),
    eitherMap((record) => ({
      success: true,
      message: '签到成功',
      record
    }))
  );
};
```

**对比**：
- 函数式将复杂逻辑分解为小的纯函数
- 每个函数职责单一，易于测试
- 通过 pipe 组合，逻辑流程清晰
- 错误处理统一，无需 try-catch

---

## 3. 错误处理模式

### 3.1 现有方式：异常 + wrapServiceCall

```typescript
async methodName(): Promise<ServiceResult<T>> {
  return wrapServiceCall(async () => {
    const result = await repository.findById(id);
    if (!isSuccessResult(result)) {
      throw new Error('Not found');  // ❌ 使用异常
    }
    return result.data;
  }, ServiceErrorCode.DATABASE_ERROR);
}
```

**问题**：
- 异常不在类型系统中，容易遗漏处理
- 需要运行时检查 `isSuccessResult`
- 错误信息可能丢失

### 3.2 函数式方式：Either 类型

```typescript
const methodName = (deps: Deps) => (id: string): Promise<Either<ServiceError, T>> =>
  pipe(
    tryCatchAsync(
      () => deps.repository.findById(id),
      toServiceError(ServiceErrorCode.DATABASE_ERROR)
    ),
    eitherChain(validateExists)  // ✅ 编译时强制错误处理
  );
```

**优势**：
- 错误在类型系统中，编译时检查
- 无需运行时 `isSuccessResult` 检查
- 错误信息完整保留

### 3.3 错误转换辅助函数

```typescript
// 将异常转换为 ServiceError
const toServiceError = (code: ServiceErrorCode, defaultMessage?: string) => (error: unknown): ServiceError => ({
  code,
  message: error instanceof Error ? error.message : (defaultMessage || 'Unknown error'),
  details: error,
  stack: error instanceof Error ? error.stack : undefined
});

// 将 DatabaseResult 转换为 Either
const databaseResultToEither = <T>(result: DatabaseResult<T>): Either<ServiceError, T> =>
  result.success && result.data
    ? right(result.data)
    : left({
        code: ServiceErrorCode.DATABASE_ERROR,
        message: result.error?.message || 'Database operation failed',
        details: result.error
      });

// 验证辅助函数
const validateExists = <T>(value: T | null | undefined, errorMessage: string): Either<ServiceError, T> =>
  value != null
    ? right(value)
    : left(toServiceError(ServiceErrorCode.RESOURCE_NOT_FOUND, errorMessage)(new Error(errorMessage)));
```

---

## 4. 异步操作处理

### 4.1 串行操作

#### OOP 方式
```typescript
async processData(): Promise<ServiceResult<Result>> {
  return wrapServiceCall(async () => {
    const step1Result = await this.step1();
    if (!isSuccessResult(step1Result)) {
      throw new Error(step1Result.error?.message);
    }
    
    const step2Result = await this.step2(step1Result.data);
    if (!isSuccessResult(step2Result)) {
      throw new Error(step2Result.error?.message);
    }
    
    const step3Result = await this.step3(step2Result.data);
    if (!isSuccessResult(step3Result)) {
      throw new Error(step3Result.error?.message);
    }
    
    return step3Result.data;
  }, ServiceErrorCode.UNKNOWN_ERROR);
}
```

#### 函数式方式
```typescript
const processData = (deps: Deps) => (): Promise<Either<ServiceError, Result>> =>
  pipeAsync(
    initialData,
    step1(deps),
    eitherChain(step2(deps)),
    eitherChain(step3(deps))
  );
```

### 4.2 并行操作

#### OOP 方式
```typescript
async fetchMultipleData(): Promise<ServiceResult<CombinedData>> {
  return wrapServiceCall(async () => {
    const [result1, result2, result3] = await Promise.all([
      this.fetchData1(),
      this.fetchData2(),
      this.fetchData3()
    ]);
    
    if (!isSuccessResult(result1)) throw new Error(result1.error?.message);
    if (!isSuccessResult(result2)) throw new Error(result2.error?.message);
    if (!isSuccessResult(result3)) throw new Error(result3.error?.message);
    
    return {
      data1: result1.data,
      data2: result2.data,
      data3: result3.data
    };
  }, ServiceErrorCode.UNKNOWN_ERROR);
}
```

#### 函数式方式
```typescript
import { eitherSequence } from '@stratix/utils/functional';

const fetchMultipleData = (deps: Deps) => (): Promise<Either<ServiceError, CombinedData>> =>
  pipe(
    Promise.all([
      fetchData1(deps)(),
      fetchData2(deps)(),
      fetchData3(deps)()
    ]),
    async (results) => eitherSequence(await results),  // 自动处理 Either 数组
    eitherMap(([data1, data2, data3]) => ({ data1, data2, data3 }))
  );
```

---

## 5. 函数式优势分析

### 5.1 可测试性

#### OOP 测试
```typescript
describe('AttendanceService', () => {
  it('should get student attendance record', async () => {
    // ❌ 需要 mock 整个类和所有依赖
    const mockRepository = {
      findById: jest.fn().mockResolvedValue({ success: true, data: mockCourse })
    };
    const mockLogger = { info: jest.fn() };
    const service = new AttendanceService(mockRepository, mockLogger);
    
    const result = await service.getStudentAttendanceRecord('course-1', mockStudent);
    
    expect(result.success).toBe(true);
  });
});
```

#### 函数式测试
```typescript
describe('getStudentAttendanceRecord', () => {
  it('should get student attendance record', async () => {
    // ✅ 只需提供依赖对象，无需 mock 类
    const deps = {
      attendanceRecordRepository: {
        findById: async (id) => right(mockCourse)
      },
      logger: { info: () => {} }
    };
    
    const result = await getStudentAttendanceRecord(deps)('course-1', mockStudent);
    
    expect(isRight(result)).toBe(true);
    expect(result.right).toEqual(mockCourse);
  });
});
```

### 5.2 可组合性

```typescript
// 函数式：轻松组合多个操作
const processUserData = pipe(
  validateUser,
  eitherChain(enrichUserData),
  eitherChain(saveUserData),
  eitherMap(formatResponse)
);

// OOP：需要创建新方法或嵌套调用
class UserService {
  async processUserData(user: User): Promise<ServiceResult<Response>> {
    const validated = await this.validateUser(user);
    if (!isSuccessResult(validated)) return validated;
    
    const enriched = await this.enrichUserData(validated.data);
    if (!isSuccessResult(enriched)) return enriched;
    
    const saved = await this.saveUserData(enriched.data);
    if (!isSuccessResult(saved)) return saved;
    
    return this.formatResponse(saved.data);
  }
}
```

### 5.3 类型安全

```typescript
// 函数式：编译时类型检查
const result: Either<ServiceError, User> = await getUserById(deps)('user-1');

// 必须处理两种情况，否则编译错误
const user = pipe(
  result,
  eitherFold(
    (error) => { /* 处理错误 */ },
    (user) => { /* 处理成功 */ }
  )
);

// OOP：运行时检查
const result: ServiceResult<User> = await service.getUserById('user-1');

// 可能忘记检查 success，导致运行时错误
const user = result.data;  // ❌ 可能是 undefined
```

---

## 6. 实现示例

### 6.1 简单查询示例

```typescript
// 获取用户信息
type GetUserByIdDeps = {
  userRepository: IUserRepository;
  logger: Logger;
};

const getUserById = (deps: GetUserByIdDeps) => (id: string): Promise<Either<ServiceError, User>> => {
  deps.logger.info({ id }, 'Getting user by id');
  
  return tryCatchAsync(
    () => deps.userRepository.findById(id),
    toServiceError(ServiceErrorCode.DATABASE_ERROR)
  ).then(eitherChain(validateExists('User not found')));
};
```

### 6.2 复杂业务逻辑示例

```typescript
// 提交请假申请
type SubmitLeaveApplicationDeps = {
  leaveApplicationRepository: ILeaveApplicationRepository;
  attendanceRecordRepository: IAttendanceRecordRepository;
  logger: Logger;
};

const submitLeaveApplication = (deps: SubmitLeaveApplicationDeps) => 
  async (request: LeaveApplicationRequest): Promise<Either<ServiceError, LeaveApplicationResponse>> => {
    deps.logger.info({ request }, 'Submitting leave application');
    
    return pipeAsync(
      request,
      validateLeaveRequest,
      eitherChain(checkConflictingLeaves(deps)),
      eitherChain(createLeaveApplication(deps)),
      eitherChain(updateAttendanceRecords(deps)),
      eitherMap(formatLeaveResponse)
    );
  };

// 辅助函数
const validateLeaveRequest = (request: LeaveApplicationRequest): Either<ServiceError, LeaveApplicationRequest> =>
  pipe(
    request,
    validateRequired('startDate', request.startDate),
    eitherChain(() => validateRequired('endDate', request.endDate)),
    eitherChain(() => validateRequired('reason', request.reason)),
    eitherChain(() => validateDateRange(request.startDate, request.endDate)),
    eitherMap(() => request)
  );

const checkConflictingLeaves = (deps: SubmitLeaveApplicationDeps) => 
  (request: LeaveApplicationRequest): Promise<Either<ServiceError, LeaveApplicationRequest>> =>
    pipe(
      tryCatchAsync(
        () => deps.leaveApplicationRepository.findConflicting(request.studentId, request.startDate, request.endDate),
        toServiceError(ServiceErrorCode.DATABASE_ERROR)
      ),
      eitherChain((conflicts) =>
        conflicts.length > 0
          ? left(toServiceError(ServiceErrorCode.LEAVE_APPLICATION_ALREADY_EXISTS, '存在冲突的请假申请')(new Error()))
          : right(request)
      )
    );
```

---

## 总结

函数式 Service 层相比传统 OOP 方式具有以下优势：

1. **类型安全**：编译时错误检查，减少运行时错误
2. **可测试性**：纯函数易于测试，无需复杂的 mock
3. **可组合性**：通过 pipe/compose 轻松组合业务逻辑
4. **可维护性**：代码更简洁，逻辑更清晰
5. **可复用性**：小的纯函数可以在多处复用

建议采用渐进式迁移策略：
- 新代码使用函数式方式
- 旧代码保持 OOP 方式，逐步重构
- 提供兼容层（Either ↔ ServiceResult 转换）

