# AutoSaveRepository 批次管理功能

## ✅ **功能完成！批次管理系统**

成功在 AutoSaveRepository 类中添加了完整的批次管理功能，实现基于时间戳的批次号生成、批次表管理和自动清理机制。

## 🎯 **核心功能**

### **1. 批次号生成 ✅**
- 基于时间戳自动生成批次号
- 格式：`YYYYMMDDHHMM`（如：202509101350）
- 确保批次号的唯一性和时间顺序

### **2. 批次表管理 ✅**
- 为每个数据集创建带批次号后缀的表名
- 格式：`${baseTableName}_${batchId}`
- 自动表结构生成和数据插入

### **3. 自动清理机制 ✅**
- 只保留最近的指定数量批次表
- 自动删除更早的批次表
- 异步清理，不影响主流程

### **4. 批次号返回 ✅**
- 操作成功后返回当前批次号
- 完整的批次信息追踪

## 🔧 **核心方法**

### **createTableWithBatch**
```typescript
async createTableWithBatch<T extends Record<string, string | number | boolean>>(
  baseTableName: string,
  dataArray: T[],
  options?: CreateTableWithBatchOptions
): Promise<DatabaseResult<BatchResult<T>>>
```

#### **选项参数**
```typescript
interface CreateTableWithBatchOptions {
  primaryKeyField?: string;    // 指定主键字段，默认添加自增id
  stringFieldLength?: number;  // 字符串字段长度，默认255
  maxBatchesToKeep?: number;   // 最大保留批次数量，默认3
}
```

#### **返回结果**
```typescript
interface BatchResult<T> {
  data: T[];      // 插入的数据（包含自动添加的字段）
  batchId: string; // 批次号（YYYYMMDDHHMM格式）
}
```

## 🎯 **使用示例**

### **基本用法**
```typescript
import { AutoSaveRepository } from '@stratix/database';

// 创建实例
const autoRepo = new AutoSaveRepository();

// 准备数据
const userData = [
  { name: "张三", age: 25, active: true, department: "技术部" },
  { name: "李四", age: 30, active: false, department: "市场部" },
  { name: "王五", age: 28, active: true, department: "技术部" }
];

// 创建批次表并插入数据
const result = await autoRepo.createTableWithBatch('user_data', userData, {
  maxBatchesToKeep: 3
});

if (result.success) {
  console.log('✅ 批次创建成功');
  console.log('批次号:', result.data.batchId);        // "202509101350"
  console.log('表名:', `user_data_${result.data.batchId}`); // "user_data_202509101350"
  console.log('插入数据:', result.data.data);
} else {
  console.error('❌ 操作失败:', result.error);
}
```

### **生成的表结构**
```sql
-- 自动生成的批次表结构
CREATE TABLE user_data_202509101350 (
  id INTEGER PRIMARY KEY AUTO_INCREMENT NOT NULL,  -- 🎯 自动主键
  name VARCHAR(255) NOT NULL,                      -- 🎯 推断的字符串类型
  age INTEGER NOT NULL,                            -- 🎯 推断的整数类型
  active BOOLEAN NOT NULL,                         -- 🎯 推断的布尔类型
  department VARCHAR(255) NOT NULL,                -- 🎯 推断的字符串类型
  created_at VARCHAR(255) NOT NULL,                -- 🎯 自动时间戳字段
  updated_at VARCHAR(255)                          -- 🎯 自动时间戳字段
);
```

### **插入结果**
```typescript
// 返回的数据包含自动添加的字段
{
  data: [
    {
      id: 1,
      name: "张三",
      age: 25,
      active: true,
      department: "技术部",
      created_at: "2025-09-10 13:50:45",  // 🎯 自动添加
      updated_at: "2025-09-10 13:50:45"   // 🎯 自动添加
    },
    // ... 其他记录
  ],
  batchId: "202509101350"  // 🎯 批次号
}
```

## 🔄 **批次生命周期管理**

### **1. 批次创建流程**
```
输入数据 → 生成批次号 → 构造批次表名 → 创建表并插入数据 → 触发清理 → 返回结果
```

### **2. 自动清理机制**
```typescript
// 示例：保留最近3个批次
const options = { maxBatchesToKeep: 3 };

// 当前批次表：
// user_data_202509101350 (最旧)
// user_data_202509101351
// user_data_202509101352
// user_data_202509101353 (最新)

// 创建新批次后：
// user_data_202509101351
// user_data_202509101352  
// user_data_202509101353
// user_data_202509101354 (新创建)
// 
// 自动删除：user_data_202509101350
```

### **3. 批次号时间线**
```
202509101350 → 2025年09月10日 13:50
202509101351 → 2025年09月10日 13:51
202509101352 → 2025年09月10日 13:52
202509101400 → 2025年09月10日 14:00
202509101401 → 2025年09月10日 14:01
```

## 🎯 **高级用法**

### **1. 自定义配置**
```typescript
// 保留更多批次
await autoRepo.createTableWithBatch('product_data', productData, {
  primaryKeyField: 'product_id',
  stringFieldLength: 500,
  maxBatchesToKeep: 5  // 保留5个批次
});

// 最小化存储
await autoRepo.createTableWithBatch('temp_data', tempData, {
  stringFieldLength: 100,
  maxBatchesToKeep: 1  // 只保留最新批次
});
```

### **2. 批次信息追踪**
```typescript
const result = await autoRepo.createTableWithBatch('order_data', orderData);

if (result.success) {
  const { data, batchId } = result.data;
  
  // 保存批次信息到元数据表
  await saveBatchMetadata({
    batchId,
    tableName: `order_data_${batchId}`,
    recordCount: data.length,
    createdAt: new Date(),
    dataHash: calculateDataHash(orderData)
  });
  
  // 发送批次完成通知
  await notifyBatchCompletion({
    batchId,
    recordCount: data.length,
    processingTime: Date.now() - startTime
  });
}
```

### **3. 批次数据查询**
```typescript
// 查询最新批次的数据
const latestBatchId = '202509101354';
const latestData = await autoRepo.findAll(`user_data_${latestBatchId}`);

// 查询特定时间范围的批次
const batchesInRange = [
  'user_data_202509101350',
  'user_data_202509101351', 
  'user_data_202509101352'
];

for (const tableName of batchesInRange) {
  const batchData = await autoRepo.findAll(tableName);
  console.log(`批次 ${tableName}:`, batchData);
}
```

## 🚨 **错误处理**

### **1. 批次号生成失败**
```typescript
try {
  const result = await autoRepo.createTableWithBatch('test_data', testData);
} catch (error) {
  if (error.message.includes('批次号生成失败')) {
    console.error('时间系统异常，请检查系统时间设置');
  }
}
```

### **2. 表创建失败**
```typescript
const result = await autoRepo.createTableWithBatch('invalid_data', invalidData);

if (!result.success) {
  if (result.error?.message.includes('表已存在')) {
    console.log('批次表冲突，系统会自动重试');
  } else if (result.error?.message.includes('数据类型不支持')) {
    console.error('数据格式错误，请检查输入数据');
  }
}
```

### **3. 清理失败处理**
```typescript
// 清理失败不会影响主流程
const result = await autoRepo.createTableWithBatch('user_data', userData);

// 即使清理失败，数据插入仍然成功
if (result.success) {
  console.log('✅ 数据插入成功，批次号:', result.data.batchId);
  // 清理失败会记录警告日志，但不影响结果
}
```

## 📊 **批次号格式详解**

### **格式规范**
```
YYYYMMDDHHMM
│││││││││││└─ 分钟 (00-59)
││││││││││└── 小时 (00-23)  
│││││││││└─── 日期 (01-31)
││││││││└──── 月份 (01-12)
│││││││└───── 年份 (2020-2100)
```

### **有效示例**
```typescript
const validBatchIds = [
  '202509101350',  // 2025-09-10 13:50
  '202512311259',  // 2025-12-31 12:59
  '202501010000',  // 2025-01-01 00:00
  '202506151230'   // 2025-06-15 12:30
];
```

### **无效示例**
```typescript
const invalidBatchIds = [
  '20250910135',   // ❌ 长度不够
  '2025091013500', // ❌ 长度过长
  'abc123456789',  // ❌ 包含字母
  '202513101350',  // ❌ 月份无效 (13)
  '202509321350',  // ❌ 日期无效 (32)
  '202509102560',  // ❌ 分钟无效 (60)
  '202509102400'   // ❌ 小时无效 (24)
];
```

## 🔧 **实现原理**

### **1. 批次号生成算法**
```typescript
private generateBatchId(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}${hour}${minute}`;
}
```

### **2. 批次表清理流程**
```typescript
// 1. 查找所有批次表
const batchTables = await this.findBatchTables(baseTableName);

// 2. 按批次号排序（最新的在前）
const sortedBatches = batchTables.sort((a, b) => b.batchId.localeCompare(a.batchId));

// 3. 确定需要删除的批次表
const tablesToDelete = sortedBatches.slice(maxBatchesToKeep);

// 4. 异步删除旧批次表
for (const batch of tablesToDelete) {
  await this.dropTable(batch.tableName);
}
```

### **3. 批次表名解析**
```typescript
// 从表名提取批次号
private extractBatchId(tableName: string, baseTableName: string): string | null {
  const prefix = `${baseTableName}_`;
  if (!tableName.startsWith(prefix)) {
    return null;
  }
  
  return tableName.substring(prefix.length);
}
```

## 🎉 **核心优势**

### **1. 时间戳唯一性**
- 基于分钟级时间戳确保批次号唯一性
- 自然的时间顺序排序
- 便于批次追踪和管理

### **2. 自动生命周期管理**
- 无需手动管理批次表
- 自动清理旧数据，节省存储空间
- 异步清理，不影响性能

### **3. 数据版本控制**
- 每个批次都是独立的数据快照
- 支持历史数据查询和对比
- 便于数据回滚和恢复

### **4. 完全兼容现有功能**
- 继承 BaseRepository 所有功能
- 兼容自动时间戳管理
- 支持跨数据库兼容性
- 保持现有的事务和连接管理

## 📋 **最佳实践**

### **1. 批次数量设置**
```typescript
// 高频数据更新：保留较少批次
{ maxBatchesToKeep: 2 }

// 重要业务数据：保留更多批次
{ maxBatchesToKeep: 10 }

// 临时数据处理：只保留最新
{ maxBatchesToKeep: 1 }
```

### **2. 表名规范**
```typescript
// ✅ 推荐的基础表名
'user_profiles'     → user_profiles_202509101350
'order_history'     → order_history_202509101350
'product_catalog'   → product_catalog_202509101350

// ❌ 避免的表名
'user-profiles'     // 包含连字符
'123_orders'        // 以数字开头
'temp data'         // 包含空格
```

### **3. 监控和告警**
```typescript
// 监控批次创建频率
const batchFrequency = await monitorBatchCreation('user_data');
if (batchFrequency > 100) { // 每小时超过100个批次
  await sendAlert('批次创建频率过高，请检查数据源');
}

// 监控存储使用情况
const storageUsage = await calculateBatchStorageUsage('user_data');
if (storageUsage > 1000000) { // 超过1GB
  await sendAlert('批次数据占用存储过多，建议调整保留策略');
}
```

这个批次管理功能为数据版本控制和历史追踪提供了完整的企业级解决方案，大大简化了数据批次处理工作流程！
