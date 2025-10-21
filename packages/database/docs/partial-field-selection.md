# BaseRepository 部分字段选择功能

## 概述

BaseRepository 现在支持在查询时选择部分字段，而不是总是返回所有字段。这可以：
- 减少数据传输量
- 提高查询性能
- 只获取需要的数据

## 支持的方法

以下方法现在都支持部分字段选择：

1. `findById(id, options?)`
2. `findOne(criteria, options?)`
3. `findMany(criteria?, options?)`
4. `findAll(options?)`

## 使用方式

### 1. findById - 选择特定字段

```typescript
// ❌ 旧方式：返回所有字段
const userMaybe = await userRepository.findById(123);

// ✅ 新方式：只返回指定字段
const userMaybe = await userRepository.findById(123, {
  select: ['id', 'username', 'email']
});

if (isSome(userMaybe)) {
  const user = userMaybe.value;
  // user 只包含 id, username, email 字段
}
```

### 2. findOne - 选择特定字段

```typescript
// ❌ 旧方式：返回所有字段
const userMaybe = await userRepository.findOne((qb) =>
  qb.where('email', '=', 'user@example.com')
);

// ✅ 新方式：只返回指定字段
const userMaybe = await userRepository.findOne(
  (qb) => qb.where('email', '=', 'user@example.com'),
  { select: ['id', 'username', 'email'] }
);
```

### 3. findMany - 选择特定字段

```typescript
// ❌ 旧方式：返回所有字段
const users = await userRepository.findMany(
  (qb) => qb.where('status', '=', 'active'),
  { limit: 10 }
);

// ✅ 新方式：只返回指定字段
const users = await userRepository.findMany(
  (qb) => qb.where('status', '=', 'active'),
  {
    limit: 10,
    select: ['id', 'username', 'email', 'created_at']
  }
);
```

### 4. findAll - 选择特定字段

```typescript
// ❌ 旧方式：返回所有字段
const allUsers = await userRepository.findAll({ limit: 100 });

// ✅ 新方式：只返回指定字段
const allUsers = await userRepository.findAll({
  limit: 100,
  select: ['id', 'username']
});
```

## 实际应用示例

### 示例 1：AttendanceRecordRepository

```typescript
// 在 AttendanceRecordRepository 中
public async findByCourseAndStudent(
  courseId: number,
  studentId: string
): Promise<
  Array<{
    id: number;
    checkin_time: Date | null;
    status: string;
    last_checkin_source: string;
    last_checkin_reason: string;
    window_id: string;
  }>
> {
  if (!courseId || !studentId) {
    this.logger.warn('findByCourseAndStudent called with invalid parameters');
    return [];
  }

  this.logger.debug(
    { courseId, studentId },
    'Finding attendance records by course and student'
  );

  // ✅ 使用 select 选项只获取需要的字段
  const records = await this.findMany(
    (qb) =>
      qb
        .where('attendance_course_id', '=', courseId)
        .where('student_id', '=', studentId),
    {
      orderBy: { field: 'checkin_time', direction: 'desc' },
      select: [
        'id',
        'checkin_time',
        'status',
        'last_checkin_source',
        'last_checkin_reason',
        'window_id'
      ]
    }
  );

  // 转换为需要的格式
  return records.map((record) => ({
    id: record.id,
    checkin_time: record.checkin_time ?? null,
    status: record.status,
    last_checkin_source: record.last_checkin_source || '',
    last_checkin_reason: record.last_checkin_reason || '',
    window_id: record.window_id || ''
  }));
}
```

### 示例 2：用户列表只显示基本信息

```typescript
// 在 UserService 中
async getUserList(): Promise<Array<{ id: number; username: string; email: string }>> {
  const users = await this.userRepository.findMany(
    (qb) => qb.where('status', '=', 'active'),
    {
      select: ['id', 'username', 'email'],
      orderBy: { field: 'created_at', direction: 'desc' },
      limit: 50
    }
  );

  return users;
}
```

### 示例 3：验证窗口只需要部分字段

```typescript
// 在 VerificationWindowRepository 中
public async findLatestByCourse(
  courseId: number
): Promise<
  | {
      id: number;
      window_id: string;
      course_id: number;
      verification_round: number;
      open_time: Date;
      duration_minutes: number;
    }
  | undefined
> {
  const windowMaybe = await this.findOne(
    (qb) =>
      qb
        .where('course_id', '=', courseId)
        .orderBy('verification_round', 'desc'),
    {
      select: [
        'id',
        'window_id',
        'course_id',
        'verification_round',
        'open_time',
        'duration_minutes'
      ]
    }
  );

  return isNone(windowMaybe) ? undefined : windowMaybe.value;
}
```

## 性能优化建议

### 1. 只选择需要的字段

```typescript
// ❌ 不好：获取所有字段（可能包含大文本字段）
const articles = await articleRepository.findMany(
  (qb) => qb.where('status', '=', 'published')
);

// ✅ 好：只获取列表需要的字段
const articles = await articleRepository.findMany(
  (qb) => qb.where('status', '=', 'published'),
  {
    select: ['id', 'title', 'author', 'created_at'],
    limit: 20
  }
);
```

### 2. 列表和详情使用不同的字段选择

```typescript
// 列表页：只需要基本信息
async getArticleList() {
  return await this.articleRepository.findMany(undefined, {
    select: ['id', 'title', 'author', 'created_at'],
    limit: 20
  });
}

// 详情页：需要完整信息
async getArticleDetail(id: number) {
  return await this.articleRepository.findById(id);
  // 不传 select 参数，返回所有字段
}
```

### 3. 避免选择大字段

```typescript
// ❌ 不好：在列表查询中包含大文本字段
const articles = await articleRepository.findMany(undefined, {
  select: ['id', 'title', 'content', 'description'], // content 可能很大
  limit: 100
});

// ✅ 好：列表只选择小字段
const articles = await articleRepository.findMany(undefined, {
  select: ['id', 'title', 'description'], // 不包含 content
  limit: 100
});
```

## 类型安全

TypeScript 会确保你只能选择存在的字段：

```typescript
// ✅ 正确：字段存在
const users = await userRepository.findMany(undefined, {
  select: ['id', 'username', 'email']
});

// ❌ 错误：TypeScript 会报错，因为 'nonexistent' 不是 User 的字段
const users = await userRepository.findMany(undefined, {
  select: ['id', 'username', 'nonexistent'] // TypeScript 错误
});
```

## 向后兼容

所有现有代码都可以继续工作，因为 `select` 参数是可选的：

```typescript
// ✅ 旧代码仍然有效：不传 select 参数，返回所有字段
const user = await userRepository.findById(123);
const users = await userRepository.findMany();
```

## 总结

**优势**：
- ✅ 减少数据传输量
- ✅ 提高查询性能
- ✅ 类型安全
- ✅ 向后兼容
- ✅ 简洁的 API

**使用场景**：
- 列表查询（只需要显示字段）
- 统计查询（只需要计数字段）
- 关联查询（只需要外键字段）
- 大表查询（避免传输大字段）

**最佳实践**：
- 列表页使用 `select` 只获取需要的字段
- 详情页不使用 `select`，获取完整数据
- 避免在 `select` 中包含大文本或 BLOB 字段
- 使用 TypeScript 的类型检查确保字段名正确

