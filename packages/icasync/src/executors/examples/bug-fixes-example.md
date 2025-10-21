# Bug修复示例 - 用户过滤和时间格式

## 修复的问题

### 问题1: 日志中没有显示不存在的用户ID
**问题描述**: 警告日志只显示消息，但没有具体的用户ID列表

**修复前**:
```
[2025-09-03 17:34:12.514 +0800] WARN (stratix-app): 发现不存在的用户ID，将跳过这些用户的权限添加
    env: "development"
```

**修复后**:
```
[2025-09-03 17:34:12.514 +0800] WARN (stratix-app): 发现不存在的用户ID，将跳过这些用户的权限添加: 2021002, INVALID001
    env: "development"
    calendarId: "cal-123"
    batchNumber: 1
    nonExistentUserIds: ["2021002", "INVALID001"]
    nonExistentCount: 2
    totalUserIds: 4
```

### 问题2: 数据库写入时间不是本地时间
**问题描述**: 写入数据库的时间比本地时间少8小时（UTC时间）

**修复前**:
```javascript
// 使用UTC时间
const updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
// 结果: 2025-09-03 09:35:12 (比本地时间少8小时)
```

**修复后**:
```javascript
// 使用date-fns获取本地时间
import { format } from 'date-fns';
const updateTime = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
// 结果: 2025-09-03 17:35:12 (正确的本地时间)
```

## 代码修改详情

### 1. 日志格式修复

**文件**: `AddSingleCalendarPermissionProcessor.ts`

```typescript
// 修复前
this.logger.warn('发现不存在的用户ID，将跳过这些用户的权限添加', {
  calendarId,
  batchNumber,
  nonExistentUserIds,
  nonExistentCount: nonExistentUserIds.length,
  totalUserIds: userIds.length
});

// 修复后
this.logger.warn(
  `发现不存在的用户ID，将跳过这些用户的权限添加: ${nonExistentUserIds.join(', ')}`,
  {
    calendarId,
    batchNumber,
    nonExistentUserIds,
    nonExistentCount: nonExistentUserIds.length,
    totalUserIds: userIds.length
  }
);
```

### 2. 时间格式修复

**文件**: `PermissionStatusRepository.ts`

```typescript
// 添加date-fns依赖
import { format } from 'date-fns';

// 修复前
const updateTime = new Date()
  .toISOString()
  .slice(0, 19)
  .replace('T', ' ');

// 修复后
private getLocalMySQLDateTime(): string {
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
}

const updateTime = this.getLocalMySQLDateTime();
```

## 测试验证

### 1. 用户过滤日志测试

```typescript
it('应该过滤掉不存在的用户ID并记录警告', async () => {
  // Mock WPS API返回部分用户存在
  mockWpsUserAdapter.getUsersByExUserIds.mockResolvedValue({
    items: [
      { ex_user_id: '2021001', user_name: 'Student1' },
      { ex_user_id: 'T001', user_name: 'Teacher1' }
      // 注意：2021002 和 INVALID001 不在返回结果中
    ]
  });

  const result = await processor.addSingleBatchPermissions(
    'cal-123',
    ['2021001', '2021002', 'T001', 'INVALID001'],
    1
  );

  // 验证警告日志包含具体的用户ID
  expect(mockLogger.warn).toHaveBeenCalledWith(
    '发现不存在的用户ID，将跳过这些用户的权限添加: 2021002, INVALID001',
    expect.objectContaining({
      nonExistentUserIds: ['2021002', 'INVALID001'],
      nonExistentCount: 2,
      totalUserIds: 4
    })
  );
});
```

### 2. 时间格式测试

```typescript
it('应该使用正确的本地时间格式', async () => {
  let capturedUpdateTime: string;
  
  // Mock数据库执行，捕获时间参数
  mockDatabaseApi.executeQuery.mockImplementation(async (queryFn) => {
    const mockDb = {
      execute: vi.fn().mockImplementation((query) => {
        const queryString = query.toString();
        const timeMatch = queryString.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
        if (timeMatch) {
          capturedUpdateTime = timeMatch[0];
        }
        return Promise.resolve({ numAffectedRows: 1 });
      })
    };
    return queryFn(mockDb);
  });

  await repository.updateStudentCourseStatus({
    kkh: 'TEST001',
    gxZt: '3'
  });

  // 验证时间格式正确
  expect(capturedUpdateTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  
  // 验证时间接近当前时间
  const capturedTime = new Date(capturedUpdateTime);
  const now = new Date();
  const timeDiff = Math.abs(now.getTime() - capturedTime.getTime());
  expect(timeDiff).toBeLessThan(60000); // 小于1分钟
});
```

## 实际运行效果

### 场景1: 部分用户不存在

**输入**:
```typescript
const userIds = ['2021001', '2021002', 'T001', 'INVALID_USER'];
```

**日志输出**:
```
[2025-09-03 17:35:12.123 +0800] WARN: 发现不存在的用户ID，将跳过这些用户的权限添加: 2021002, INVALID_USER
    calendarId: "cal-123"
    batchNumber: 1
    nonExistentUserIds: ["2021002", "INVALID_USER"]
    nonExistentCount: 2
    totalUserIds: 4

[2025-09-03 17:35:12.456 +0800] DEBUG: 成功添加权限批次
    calendarId: "cal-123"
    batchNumber: 1
    originalUserCount: 4
    validUserCount: 2
    skippedUserCount: 2
```

**数据库更新**:
```sql
UPDATE out_jw_kcb_xs 
SET gx_zt = '3', gx_sj = '2025-09-03 17:35:12'
WHERE kkh = 'CS101-2023-1' AND gx_zt IS NULL;
```

### 场景2: 所有用户都存在

**输入**:
```typescript
const userIds = ['2021001', 'T001'];
```

**日志输出**:
```
[2025-09-03 17:35:12.789 +0800] DEBUG: 成功添加权限批次
    calendarId: "cal-123"
    batchNumber: 1
    originalUserCount: 2
    validUserCount: 2
    skippedUserCount: 0
```

**数据库更新**:
```sql
UPDATE out_jw_kcb_xs 
SET gx_zt = '3', gx_sj = '2025-09-03 17:35:12'
WHERE kkh = 'CS101-2023-1' AND gx_zt IS NULL;
```

## 依赖更新

确保项目中已安装date-fns依赖：

```bash
pnpm add date-fns
pnpm add -D @types/date-fns  # 如果使用TypeScript
```

## 总结

这两个修复提升了系统的可观测性和数据准确性：

1. **更清晰的日志**: 直接在日志消息中显示问题用户ID，便于快速定位问题
2. **正确的时间记录**: 使用本地时间而不是UTC时间，确保数据库中的时间戳准确反映操作时间
3. **简化的实现**: 使用date-fns库替代复杂的手动时间格式化
4. **完整的测试**: 添加了相应的测试用例确保修复有效
