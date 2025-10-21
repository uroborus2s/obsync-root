# Repository层TableSchema配置和自动表创建功能

## 概述

本文档描述了为@wps/hltnlink应用的Repository层配置tableSchema和自动表创建功能的实现。

## 实现内容

### 1. Schema定义文件

创建了完整的表结构Schema定义文件：

#### 文件结构
```
src/repositories/schemas/
├── calendar-schema.ts          # Calendar表Schema定义
├── course-class-schema.ts      # CourseClass表Schema定义  
├── calendar-schedule-schema.ts # CalendarSchedule表Schema定义
└── index.ts                   # 统一导出和工具函数
```

#### Schema特性
- **完整的列定义**：包含所有字段的类型、约束、注释
- **外键关系**：正确配置表间的外键引用关系
- **索引配置**：为查询优化配置了合适的索引
- **类型安全**：使用ColumnType枚举确保类型一致性

### 2. Repository类配置

为所有Repository类添加了tableSchema配置：

#### CalendarRepository
```typescript
// 表结构定义 - 用于自动表创建
protected readonly tableSchema = calendarTableSchema;

constructor(logger: Logger) {
  super(undefined, { enabled: true, createIndexes: true });
  this.logger = logger;
}
```

#### CourseClassRepository
```typescript
// 表结构定义 - 用于自动表创建
protected readonly tableSchema = courseClassTableSchema;

constructor(logger: Logger) {
  super(undefined, { enabled: true, createIndexes: true });
  this.logger = logger;
}
```

#### CalendarScheduleRepository
```typescript
// 表结构定义 - 用于自动表创建
protected readonly tableSchema = calendarScheduleTableSchema;

constructor(logger: Logger) {
  super(undefined, { enabled: true, createIndexes: true });
  this.logger = logger;
}
```

### 3. 自动表创建配置

所有Repository都启用了自动表创建功能：

- **enabled: true** - 启用自动表创建
- **createIndexes: true** - 自动创建索引
- **BaseRepository集成** - 利用@stratix/database的BaseRepository自动表创建能力

### 4. Schema工具函数

在`schemas/index.ts`中提供了便利的工具函数：

```typescript
// 获取所有表Schema
export const allTableSchemas = {
  calendars: calendarTableSchema,
  course_classes: courseClassTableSchema,
  calendar_schedules: calendarScheduleTableSchema
};

// 表创建顺序（考虑外键依赖）
export const tableCreationOrder = [
  'calendars',           // 主表，无外键依赖
  'course_classes',      // 依赖calendars表
  'calendar_schedules'   // 依赖calendars表
];

// 工具函数
export function getTableSchema(tableName: keyof typeof allTableSchemas);
export function getAllTableSchemas();
export function getTableSchemasInOrder();
```

## 表结构详情

### 1. calendars表
- **主键**: calendar_id (自增)
- **唯一索引**: wps_calendar_id
- **外键**: 无
- **特殊字段**: metadata (JSON格式)

### 2. course_classes表
- **主键**: id (自增)
- **外键**: calendar_id → calendars.calendar_id
- **唯一索引**: (calendar_id, student_number)
- **特殊字段**: extra_info (JSON格式)

### 3. calendar_schedules表
- **主键**: id (自增)
- **外键**: calendar_id → calendars.calendar_id
- **时间索引**: (start_time, end_time)
- **特殊字段**: metadata (JSON格式)

## 测试验证

### 1. 单元测试
- **repository-unit.test.ts**: 16个测试全部通过
- 验证Repository类实例化、方法存在性、类型一致性

### 2. Schema测试
- **repository-schema.test.ts**: 15个测试全部通过
- 验证Schema定义正确性、外键关系、索引配置
- 验证Repository与Schema的集成

### 测试结果
```
✓ src/__tests__/repositories/repository-unit.test.ts (16 tests) 4ms
✓ src/__tests__/repositories/repository-schema.test.ts (15 tests) 5ms

Test Files  2 passed (2)
Tests  31 passed (31)
```

## 技术特点

### 1. 类型安全
- 使用ColumnType枚举替代字符串字面量
- 完整的TypeScript类型定义
- 编译时类型检查

### 2. 依赖关系管理
- 正确的表创建顺序
- 外键约束配置
- 级联删除/更新策略

### 3. 性能优化
- 合理的索引配置
- 查询优化索引
- 唯一约束索引

### 4. 可维护性
- 模块化Schema定义
- 统一的导出管理
- 完整的文档注释

## 使用方式

### 1. 自动表创建
Repository在初始化时会自动检查并创建表结构：

```typescript
const repository = new CalendarRepository(logger);
// 表会在首次使用时自动创建
```

### 2. Schema访问
```typescript
import { 
  calendarTableSchema, 
  getAllTableSchemas,
  getTableSchemasInOrder 
} from './schemas/index.js';

// 获取特定表Schema
const schema = calendarTableSchema;

// 获取所有Schema
const allSchemas = getAllTableSchemas();

// 按创建顺序获取Schema
const orderedSchemas = getTableSchemasInOrder();
```

## 总结

成功为@wps/hltnlink应用的Repository层配置了完整的tableSchema和自动表创建功能：

1. ✅ **Schema定义完整** - 三个表的完整Schema定义
2. ✅ **Repository配置** - 所有Repository类启用自动表创建
3. ✅ **类型安全** - 使用ColumnType枚举确保类型一致性
4. ✅ **外键关系** - 正确配置表间依赖关系
5. ✅ **索引优化** - 为查询性能配置合适索引
6. ✅ **测试验证** - 31个测试全部通过
7. ✅ **工具函数** - 提供便利的Schema管理工具

该实现遵循Stratix框架的最佳实践，利用@stratix/database包的BaseRepository自动表创建能力，为应用提供了可靠的数据层基础设施。
