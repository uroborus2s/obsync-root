# insertId 字段名称修复总结

## 问题发现

用户发现在 `NodeInstanceRepository.create` 方法中，我们错误地假设 `BaseRepository.create` 返回的数据包含 `id` 字段，但实际上返回的是 `insertId` 字段。

### 实际返回的数据结构

```typescript
createdData = {
  insertId: 1n,                    // BigInt 类型的插入ID
  numInsertedOrUpdatedRows: 1n,    // BigInt 类型的影响行数
  // [[Prototype]]: Object
}
```

## 修复内容

### 1. 字段名称修正

**修复前（错误）：**
```typescript
const recordId = createdData?.id;  // ❌ 错误：字段名不对
```

**修复后（正确）：**
```typescript
const recordId = createdData?.insertId || createdData?.id;  // ✅ 正确：检查两种可能的字段名
```

### 2. BigInt 类型处理

**修复前：**
```typescript
const fullRecordResult = await this.findById(createdData.id);  // ❌ 可能传入 BigInt
```

**修复后：**
```typescript
// 将 BigInt 转换为 number（如果需要）
const idValue = typeof recordId === 'bigint' ? Number(recordId) : recordId;
const fullRecordResult = await this.findById(idValue);  // ✅ 确保传入正确类型
```

### 3. 类型安全处理

**修复前：**
```typescript
const recordId = createdData?.insertId;  // ❌ TypeScript 报错：属性不存在
```

**修复后：**
```typescript
const insertResult = createdData as any;  // ✅ 使用类型断言处理运行时差异
const recordId = insertResult?.insertId || insertResult?.id;
```

### 4. 错误消息改进

**修复前：**
```typescript
throw QueryError.create('Create operation did not return record ID');
```

**修复后：**
```typescript
throw QueryError.create(
  'Create operation did not return record ID (checked both insertId and id fields)'
);
```

### 5. 调试日志增强

**修复前：**
```typescript
this.logger.debug('Create result incomplete, fetching full record', {
  createdData,
  hasId: !!createdData?.id,
  isComplete: this.isCompleteRecord(createdData)
});
```

**修复后：**
```typescript
this.logger.debug('Create result incomplete, fetching full record', {
  createdData,
  recordId,
  hasInsertId: !!insertResult?.insertId,
  hasId: !!insertResult?.id,
  isComplete: this.isCompleteRecord(createdData)
});
```

## 修复的关键代码

```typescript
// 检查返回的数据是否完整
const createdData = result.data;
if (!createdData || !this.isCompleteRecord(createdData)) {
  // 如果返回的数据不完整，重新查询完整记录
  // 从插入结果中提取ID（可能是 insertId 或 id）
  // 使用类型断言处理运行时数据结构与类型定义的差异
  const insertResult = createdData as any;
  const recordId = insertResult?.insertId || insertResult?.id;

  this.logger.debug('Create result incomplete, fetching full record', {
    createdData,
    recordId,
    hasInsertId: !!insertResult?.insertId,
    hasId: !!insertResult?.id,
    isComplete: this.isCompleteRecord(createdData)
  });

  if (!recordId) {
    throw QueryError.create(
      'Create operation did not return record ID (checked both insertId and id fields)'
    );
  }

  // 将 BigInt 转换为 number（如果需要）
  const idValue = typeof recordId === 'bigint' ? Number(recordId) : recordId;

  const fullRecordResult = await this.findById(idValue);
  if (!fullRecordResult.success || !fullRecordResult.data) {
    throw QueryError.create(
      `Failed to fetch complete record after creation: ${idValue}`
    );
  }

  return fullRecordResult.data;
}
```

## 测试更新

同时更新了相关测试，以反映正确的数据结构：

```typescript
const incompleteRecord = {
  // 数据库插入操作的典型返回结果
  insertId: 1n, // BigInt 类型
  numInsertedOrUpdatedRows: 1n
  // 缺少业务字段
};
```

## 修复效果

- ✅ **正确处理字段名称**：支持 `insertId` 和 `id` 两种字段名
- ✅ **BigInt 类型安全**：正确处理 BigInt 到 number 的转换
- ✅ **类型安全**：使用类型断言避免 TypeScript 编译错误
- ✅ **更好的错误消息**：提供更详细的错误信息
- ✅ **增强的调试信息**：记录更多有用的调试信息
- ✅ **向后兼容**：同时支持新旧字段名称

这个修复确保了 `NodeInstanceRepository.create` 方法能够正确处理各种数据库驱动返回的不同数据结构，提高了代码的健壮性和兼容性。
