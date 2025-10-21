# AutoSaveRepository - 动态表创建和数据批量写入

## ✅ **功能完成！增强的 BaseRepository 类**

成功创建了 AutoSaveRepository 类，继承自 BaseRepository，添加了动态表创建和数据批量写入功能。

## 🎯 **核心功能**

### **1. 动态表创建 ✅**
- 根据传入的数组对象自动分析数据结构
- 自动生成对应的数据库表结构
- 支持跨数据库兼容性（PostgreSQL、MySQL、SQLite、SQL Server）

### **2. 数据批量写入 ✅**
- 将数组中的所有记录批量写入到新创建的表中
- 自动集成时间戳字段管理
- 支持事务和连接管理

### **3. 字段类型推断 ✅**
- `string` → `DataColumnType.STRING`
- `number` (整数) → `DataColumnType.INTEGER`
- `number` (小数) → `DataColumnType.DECIMAL`
- `boolean` → `DataColumnType.BOOLEAN`

## 🔧 **核心方法**

### **createTableFromData**
```typescript
async createTableFromData<T extends Record<string, string | number | boolean>>(
  tableName: string,
  dataArray: T[],
  options?: CreateTableFromDataOptions
): Promise<DatabaseResult<T[]>>
```

#### **选项参数**
```typescript
interface CreateTableFromDataOptions {
  primaryKeyField?: string;        // 指定主键字段，默认添加自增id
  stringFieldLength?: number;      // 字符串字段长度，默认255
  overwriteIfExists?: boolean;     // 是否覆盖已存在的表，默认false
  enableAutoTimestamps?: boolean;  // 是否启用自动时间戳，默认true
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
  { name: "张三", age: 25, active: true, email: "zhangsan@example.com" },
  { name: "李四", age: 30, active: false, email: "lisi@example.com" },
  { name: "王五", age: 28, active: true, email: "wangwu@example.com" }
];

// 创建表并插入数据
const result = await autoRepo.createTableFromData('dynamic_users', userData, {
  primaryKeyField: 'id',
  stringFieldLength: 100,
  overwriteIfExists: false
});

if (result.success) {
  console.log('✅ 表创建成功，数据插入完成');
  console.log('插入的记录:', result.data);
} else {
  console.error('❌ 操作失败:', result.error);
}
```

### **生成的表结构**
```sql
-- 自动生成的表结构
CREATE TABLE dynamic_users (
  id INTEGER PRIMARY KEY AUTO_INCREMENT NOT NULL,
  name VARCHAR(100) NOT NULL,
  age INTEGER,
  active BOOLEAN NOT NULL,
  email VARCHAR(100) NOT NULL,
  created_at VARCHAR(255) NOT NULL,  -- 🎯 自动添加
  updated_at VARCHAR(255)            -- 🎯 自动添加
);
```

### **插入结果**
```typescript
// 返回的数据包含自动添加的字段
[
  {
    id: 1,
    name: "张三",
    age: 25,
    active: true,
    email: "zhangsan@example.com",
    created_at: "2024-01-15 10:30:45",  // 🎯 自动添加
    updated_at: "2024-01-15 10:30:45"   // 🎯 自动添加
  },
  // ... 其他记录
]
```

## 🔍 **辅助功能**

### **1. 数据结构分析**
```typescript
// 分析数据结构
const report = autoRepo.analyzeDataReport(userData);

console.log('分析摘要:', report.summary);
console.log('字段详情:', report.details.fields);
console.log('建议:', report.recommendations);

// 输出示例:
// 分析摘要: 分析了 3 条记录，发现 4 个字段。数据结构一致。
// 字段详情: [
//   { name: 'name', type: 'STRING', isNullable: false, maxLength: 2 },
//   { name: 'age', type: 'INTEGER', isNullable: false },
//   { name: 'active', type: 'BOOLEAN', isNullable: false },
//   { name: 'email', type: 'STRING', isNullable: false, maxLength: 20 }
// ]
```

### **2. SQL 预览**
```typescript
// 生成 SQL 预览
const { schema, sqlPreview } = autoRepo.generateTableCreationPreview(
  'preview_table', 
  userData, 
  { primaryKeyField: 'user_id', stringFieldLength: 150 }
);

console.log('生成的 SQL:');
console.log(sqlPreview);

// 输出:
// CREATE TABLE preview_table (
//   user_id INTEGER PRIMARY KEY AUTO_INCREMENT NOT NULL,
//   name VARCHAR(150) NOT NULL,
//   age INTEGER NOT NULL,
//   active BOOLEAN NOT NULL,
//   email VARCHAR(150) NOT NULL
// );
```

## 🚨 **错误处理**

### **1. 输入验证错误**
```typescript
// 空数组
await autoRepo.createTableFromData('test', []);
// ❌ Error: 数据数组不能为空

// 无效表名
await autoRepo.createTableFromData('123invalid', userData);
// ❌ Error: 表名格式无效：只允许字母、数字、下划线，且必须以字母或下划线开头

// 非对象数据
await autoRepo.createTableFromData('test', ['string', 123]);
// ❌ Error: 数据数组第 1 项必须是对象格式
```

### **2. 数据类型不支持错误**
```typescript
const invalidData = [
  { name: "测试", data: { nested: "object" } }, // 不支持嵌套对象
  { name: "测试2", items: [1, 2, 3] }           // 不支持数组
];

await autoRepo.createTableFromData('test', invalidData);
// ❌ Error: 不支持的数据类型：记录 1 的字段 'data' 类型为 'object'。只支持 string、number、boolean 类型。
```

### **3. 字段类型不一致错误**
```typescript
const inconsistentData = [
  { name: "张三", age: 25 },      // age 是 number
  { name: "李四", age: "30岁" }   // age 是 string
];

await autoRepo.createTableFromData('test', inconsistentData);
// ❌ Error: 数据结构不一致：字段 age 在不同记录中类型不匹配
```

### **4. 表已存在错误**
```typescript
// 表已存在且未设置覆盖
await autoRepo.createTableFromData('existing_table', userData);
// ❌ Error: 表 'existing_table' 已存在。如需覆盖，请设置 overwriteIfExists: true

// 正确的覆盖方式
await autoRepo.createTableFromData('existing_table', userData, {
  overwriteIfExists: true
});
// ✅ 成功覆盖现有表
```

## 🎯 **高级用法**

### **1. 自定义主键字段**
```typescript
const productData = [
  { product_id: "P001", name: "iPhone", price: 999.99 },
  { product_id: "P002", name: "iPad", price: 599.00 }
];

// 使用现有字段作为主键
await autoRepo.createTableFromData('products', productData, {
  primaryKeyField: 'product_id'  // 使用 product_id 作为主键
});
```

### **2. 处理长字符串字段**
```typescript
const articleData = [
  { 
    title: "文章标题",
    content: "这是一篇很长的文章内容..." // 超过默认255字符
  }
];

// 设置更大的字符串长度
await autoRepo.createTableFromData('articles', articleData, {
  stringFieldLength: 1000  // 设置为1000字符
});
```

### **3. 禁用自动时间戳**
```typescript
await autoRepo.createTableFromData('simple_table', userData, {
  enableAutoTimestamps: false  // 不添加 created_at 和 updated_at 字段
});
```

## 📊 **支持的数据类型映射**

| JavaScript 类型 | 数据库类型 | 示例 |
|-----------------|------------|------|
| `string` | `VARCHAR(n)` | `"Hello World"` |
| `number` (整数) | `INTEGER` | `42`, `-10`, `0` |
| `number` (小数) | `DECIMAL(10,2)` | `3.14`, `99.99` |
| `boolean` | `BOOLEAN` | `true`, `false` |
| `null/undefined` | 设置字段为可空 | `null` |

## 🔧 **实现原理**

### **1. 数据结构分析流程**
```
输入数据 → 字段类型推断 → 一致性检查 → 生成 TableSchema → 创建表 → 批量插入
```

### **2. 字段类型推断逻辑**
```typescript
private inferDataType(value: any): DataColumnType {
  if (typeof value === 'string') return DataColumnType.STRING;
  if (typeof value === 'number') {
    return Number.isInteger(value) ? DataColumnType.INTEGER : DataColumnType.DECIMAL;
  }
  if (typeof value === 'boolean') return DataColumnType.BOOLEAN;
  return DataColumnType.STRING; // 默认类型
}
```

### **3. 自动时间戳集成**
- 继承 BaseRepository 的自动时间戳功能
- 在 `onReady` 阶段自动添加 `created_at` 和 `updated_at` 字段
- 所有插入操作自动添加时间戳

## 🎉 **核心优势**

### **1. 零配置动态表创建**
- 无需预定义表结构
- 自动分析数据并生成最优表结构
- 支持多种数据类型自动映射

### **2. 智能数据验证**
- 完整的输入验证
- 数据类型一致性检查
- 友好的错误提示

### **3. 完整功能继承**
- 继承 BaseRepository 所有功能
- 自动时间戳管理
- 事务和连接管理
- 跨数据库兼容性

### **4. 开发友好**
- 丰富的辅助方法
- SQL 预览功能
- 详细的分析报告
- 完整的 TypeScript 支持

## 📋 **最佳实践**

### **1. 数据准备**
```typescript
// ✅ 推荐：确保数据结构一致
const goodData = [
  { name: "Alice", age: 25, active: true },
  { name: "Bob", age: 30, active: false },
  { name: "Charlie", age: 35, active: true }
];

// ❌ 避免：数据类型不一致
const badData = [
  { name: "Alice", age: 25 },
  { name: "Bob", age: "30" }  // age 类型不一致
];
```

### **2. 表名规范**
```typescript
// ✅ 推荐的表名
'user_profiles'
'product_catalog'
'order_history'
'_temp_data'

// ❌ 避免的表名
'123users'      // 不能以数字开头
'user-profiles' // 不能包含连字符
'user profiles' // 不能包含空格
```

### **3. 字段长度设置**
```typescript
// 根据数据分析报告调整字段长度
const report = autoRepo.analyzeDataReport(data);
console.log('建议:', report.recommendations);

// 根据建议设置合适的长度
await autoRepo.createTableFromData('table', data, {
  stringFieldLength: 500  // 根据实际需要调整
});
```

这个 AutoSaveRepository 类为动态表创建和数据批量写入提供了完整的解决方案，大大简化了数据导入和表结构管理的工作！
