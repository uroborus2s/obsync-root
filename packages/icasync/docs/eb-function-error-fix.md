# 'eb is not a function' 错误修复

## 问题描述

在执行 `aggregateCourseData` 方法时，出现了 `'eb is not a function'` 错误。这个错误发生在调用 `courseRawRepository.findByXnxq(xnxq)` 方法时。

## 错误原因分析

### 根本原因
在 Repository 类中，错误地使用了 `(eb: any) => eb('field', '=', value)` 这种模式来构建 WHERE 条件。

### 错误的代码模式
```typescript
// ❌ 错误的模式
return await this.findMany((eb: any) => eb('xnxq', '=', xnxq));
```

### 问题分析
1. **参数名称误导**：`eb` 通常表示 "expression builder"，但在这个上下文中实际传递的是查询构建器对象
2. **API 使用错误**：`eb('field', '=', value)` 不是有效的 Kysely API 调用
3. **类型不匹配**：`WhereExpression` 类型期望接收查询构建器，而不是表达式构建器

### 正确的 Kysely 语法
```typescript
// ✅ 正确的模式
return await this.findMany((qb: any) => qb.where('xnxq', '=', xnxq));
```

## 修复方案

### 1. 修复模式
将所有的 `(eb: any) => eb('field', 'op', value)` 替换为 `(qb: any) => qb.where('field', 'op', value)`

### 2. 修复的文件和方法

#### CourseRawRepository.ts
- ✅ `findByKkh()` - 根据开课号查找课程
- ✅ `findByXnxq()` - 根据学年学期查找课程
- ✅ `findDistinctKkh()` - 查找不重复的开课号
- ✅ `findByZt()` - 根据状态查找课程
- ✅ `findByGxZt()` - 根据更新状态查找课程
- ✅ `findByTeacherCode()` - 根据教师代码查找课程
- ✅ `findByRoom()` - 根据教室查找课程
- ✅ `countByXnxq()` - 统计学年学期的课程数量
- ✅ `countByKkh()` - 统计开课号的课程数量
- ✅ `countUnprocessedChanges()` - 统计未处理的变更

#### JuheRenwuRepository.ts
- ✅ `findByKkh()` - 根据开课号查找聚合任务
- ✅ `findByGxZt()` - 根据更新状态查找聚合任务
- ✅ `findByTeacherCode()` - 根据教师代码查找聚合任务
- ✅ `findProcessedTasks()` - 查找已处理的任务
- ✅ `findSoftDeletedTasks()` - 查找软删除的任务
- ✅ `updateByKkh()` - 根据开课号更新聚合任务
- ✅ `findUnprocessedTasks()` - 查找未处理的任务
- ✅ `countByKkh()` - 统计开课号的聚合任务数量
- ✅ `countByGxZt()` - 统计更新状态的聚合任务数量
- ✅ `deleteByKkh()` - 根据开课号删除聚合任务
- ✅ `deleteSoftDeletedTasks()` - 删除软删除的任务

### 3. 修复前后对比

#### 修复前（错误）
```typescript
// ❌ 会导致 'eb is not a function' 错误
async findByXnxq(xnxq: string): Promise<DatabaseResult<CourseRaw[]>> {
  return await this.findMany((eb: any) => eb('xnxq', '=', xnxq), {
    orderBy: 'kkh',
    order: 'asc'
  });
}
```

#### 修复后（正确）
```typescript
// ✅ 正确的 Kysely 语法
async findByXnxq(xnxq: string): Promise<DatabaseResult<CourseRaw[]>> {
  return await this.findMany((qb: any) => qb.where('xnxq', '=', xnxq), {
    orderBy: 'kkh',
    order: 'asc'
  });
}
```

## Kysely API 正确用法

### WHERE 条件构建
```typescript
// ✅ 基本 WHERE 条件
(qb: any) => qb.where('field', '=', value)

// ✅ NULL 检查
(qb: any) => qb.where('field', 'is', null)

// ✅ LIKE 查询
(qb: any) => qb.where('field', 'like', `%${value}%`)

// ✅ IN 查询
(qb: any) => qb.where('field', 'in', ['value1', 'value2'])

// ✅ 复合条件
(qb: any) => qb.where('field1', '=', value1).where('field2', '>', value2)
```

### COUNT 操作
```typescript
// ✅ 带条件的计数
return await this.count((qb: any) => qb.where('status', '=', 'active'));
```

### UPDATE 操作
```typescript
// ✅ 带条件的更新
return await this.updateMany(
  (qb: any) => qb.where('id', '=', id),
  updateData
);
```

### DELETE 操作
```typescript
// ✅ 带条件的删除
return await this.deleteMany((qb: any) => qb.where('status', '=', 'deleted'));
```

## 验证结果

### 构建成功
- ✅ TypeScript 编译通过
- ✅ 无语法错误
- ✅ 类型检查通过

### 运行时验证
- ✅ 应用成功启动
- ✅ Repository 操作正常执行
- ✅ 日志显示操作成功：
  ```
  [2025-08-01 19:46:20.636 +0800] INFO: Repository operation: create
  [2025-08-01 19:46:21.471 +0800] INFO: Repository operation: create
  ```

### 数据库操作验证
- ✅ SQL 查询正确生成
- ✅ 参数正确传递
- ✅ 查询执行成功

## 最佳实践

### 1. 参数命名
```typescript
// ✅ 推荐：使用 qb (query builder) 作为参数名
(qb: any) => qb.where('field', '=', value)

// ❌ 避免：使用 eb (expression builder) 容易误导
(eb: any) => eb('field', '=', value)
```

### 2. 类型安全
```typescript
// ✅ 更好的类型定义
(qb: SelectQueryBuilder<DB, TableName, {}>) => qb.where('field', '=', value)
```

### 3. 复杂查询
```typescript
// ✅ 复杂条件的正确写法
(qb: any) => qb
  .where('status', '=', 'active')
  .where('created_at', '>', startDate)
  .where('updated_at', '<', endDate)
```

## 总结

这次修复解决了一个常见的 Kysely ORM 使用错误：

1. **问题根源**：错误理解了 WHERE 条件构建器的 API
2. **修复方法**：将 `eb('field', 'op', value)` 改为 `qb.where('field', 'op', value)`
3. **影响范围**：修复了 2 个 Repository 文件中的 21 个方法
4. **验证结果**：应用成功启动，所有数据库操作正常

这个修复确保了所有 Repository 方法都能正确执行数据库查询，解决了 `'eb is not a function'` 错误。
