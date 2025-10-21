# Kysely CreateTableBuilder API 正确使用指南

## 问题分析

在重构 TableSchema 设计时，我们发现了 Kysely `CreateTableBuilder` API 使用上的问题。本文档提供正确的使用方式和重构建议。

## 🚨 当前问题

### 1. 错误的方法调用
```typescript
// ❌ 错误：直接在 builder 上调用列方法
builder.integer(column.name)
builder.varchar(column.name, length)

// ❌ 错误：尝试在 CreateTableBuilder 上调用列约束方法
columnBuilder.primaryKey()
columnBuilder.autoIncrement()
columnBuilder.notNull()
```

### 2. 类型错误
```typescript
// ❌ 错误：使用 any 类型
private static addColumn(builder: any, column: any): any

// ❌ 错误：错误的返回类型
): any {
```

## ✅ 正确的 Kysely API 使用方式

### 1. CreateTableBuilder 的正确模式

```typescript
import { CreateTableBuilder, sql } from 'kysely';

// ✅ 正确：使用 addColumn 方法
builder.addColumn('column_name', 'column_type', (col) => {
  return col
    .primaryKey()
    .notNull()
    .unique()
    .defaultTo(value);
});

// ✅ 正确：使用 sql 模板处理复杂类型
builder.addColumn('name', sql`varchar(100)`, (col) => col.notNull());

// ✅ 正确：处理自增主键
builder.addColumn('id', 'serial', (col) => col.primaryKey()); // PostgreSQL
builder.addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey()); // MySQL/SQLite
```

### 2. 正确的类型定义

```typescript
private static addIntegerColumn(
  builder: CreateTableBuilder<string, never>,
  column: ColumnDefinition,
  databaseType: DatabaseType
): CreateTableBuilder<string, never> {
  // 实现...
}
```

### 3. 约束应用的正确方式

```typescript
private static applyColumnConstraints(
  columnBuilder: any, // 这里是 Kysely 的 ColumnDefinitionBuilder
  constraints: ColumnConstraints
): any {
  let builder = columnBuilder;

  if (constraints.primaryKey) {
    builder = builder.primaryKey();
  }

  if (constraints.nullable === false) {
    builder = builder.notNull();
  }

  if (constraints.unique) {
    builder = builder.unique();
  }

  if (constraints.defaultValue !== undefined) {
    if (typeof constraints.defaultValue === 'string' && 
        constraints.defaultValue.toUpperCase() === 'CURRENT_TIMESTAMP') {
      builder = builder.defaultTo(sql`CURRENT_TIMESTAMP`);
    } else {
      builder = builder.defaultTo(constraints.defaultValue);
    }
  }

  if (constraints.references) {
    const ref = constraints.references;
    builder = builder.references(`${ref.table}.${ref.column}`);
    
    if (ref.onDelete) {
      builder = builder.onDelete(ref.onDelete);
    }
    
    if (ref.onUpdate) {
      builder = builder.onUpdate(ref.onUpdate);
    }
  }

  return builder;
}
```

## 🔧 重构建议

### 1. 简化的列类型处理

```typescript
/**
 * 添加整数列 - 重构版本
 */
private static addIntegerColumn(
  builder: CreateTableBuilder<string, never>,
  column: ColumnDefinition,
  databaseType: DatabaseType
): CreateTableBuilder<string, never> {
  const constraints = column.constraints || {};

  // 根据数据库类型和约束选择合适的列类型
  const columnType = TableCreator.getIntegerColumnType(databaseType, constraints);
  
  return builder.addColumn(column.name, columnType, (col) => {
    let colBuilder = col;
    
    // 只有非 PostgreSQL 数据库需要显式设置 autoIncrement
    if (constraints.autoIncrement && databaseType !== DatabaseType.POSTGRESQL) {
      colBuilder = colBuilder.autoIncrement();
    }
    
    return TableCreator.applyColumnConstraints(colBuilder, constraints);
  });
}

/**
 * 获取整数列类型
 */
private static getIntegerColumnType(
  databaseType: DatabaseType, 
  constraints: ColumnConstraints
): string | ReturnType<typeof sql> {
  if (constraints.autoIncrement && databaseType === DatabaseType.POSTGRESQL) {
    return 'serial';
  }
  return 'integer';
}
```

### 2. 字符串类型的正确处理

```typescript
/**
 * 添加字符串列 - 重构版本
 */
private static addStringColumn(
  builder: CreateTableBuilder<string, never>,
  column: ColumnDefinition,
  databaseType: DatabaseType
): CreateTableBuilder<string, never> {
  const constraints = column.constraints || {};
  
  // 根据数据库类型获取字符串类型
  const columnType = TableCreator.getStringColumnType(databaseType, constraints);
  
  return builder.addColumn(column.name, columnType, (col) =>
    TableCreator.applyColumnConstraints(col, constraints)
  );
}

/**
 * 获取字符串列类型
 */
private static getStringColumnType(
  databaseType: DatabaseType,
  constraints: ColumnConstraints
): string | ReturnType<typeof sql> {
  switch (databaseType) {
    case DatabaseType.POSTGRESQL:
      return constraints.length 
        ? sql`varchar(${sql.lit(constraints.length)})`
        : 'varchar';
    case DatabaseType.MYSQL:
      return constraints.length 
        ? sql`varchar(${sql.lit(constraints.length)})`
        : sql`varchar(255)`;
    case DatabaseType.SQLITE:
      return 'text';
    case DatabaseType.MSSQL:
      return constraints.length 
        ? sql`nvarchar(${sql.lit(constraints.length)})`
        : sql`nvarchar(255)`;
    default:
      return 'varchar';
  }
}
```

### 3. 统一的类型映射方法

```typescript
/**
 * 统一的列添加方法
 */
private static addColumnWithType(
  builder: CreateTableBuilder<string, never>,
  column: ColumnDefinition,
  databaseType: DatabaseType
): CreateTableBuilder<string, never> {
  const constraints = column.constraints || {};
  
  // 获取数据库特定的列类型
  const columnType = TableCreator.getColumnTypeForDatabase(
    column.type, 
    databaseType, 
    constraints
  );
  
  return builder.addColumn(column.name, columnType, (col) => {
    let colBuilder = col;
    
    // 处理自增（仅对支持的类型和数据库）
    if (constraints.autoIncrement && 
        TableCreator.shouldApplyAutoIncrement(column.type, databaseType)) {
      colBuilder = colBuilder.autoIncrement();
    }
    
    return TableCreator.applyColumnConstraints(colBuilder, constraints);
  });
}

/**
 * 获取数据库特定的列类型
 */
private static getColumnTypeForDatabase(
  columnType: ColumnType,
  databaseType: DatabaseType,
  constraints: ColumnConstraints
): string | ReturnType<typeof sql> {
  // 使用我们之前定义的 DATABASE_TYPE_MAPPING
  const mapping = DATABASE_TYPE_MAPPING[databaseType];
  const baseType = mapping[columnType];
  
  // 处理需要参数的类型
  switch (columnType) {
    case ColumnType.STRING:
      if (constraints.length) {
        return sql.raw(`${baseType}(${constraints.length})`);
      }
      return baseType === 'varchar' ? sql`varchar(255)` : baseType;
      
    case ColumnType.DECIMAL:
      if (constraints.precision && constraints.scale) {
        return sql.raw(`${baseType}(${constraints.precision},${constraints.scale})`);
      }
      return baseType;
      
    case ColumnType.INTEGER:
      // PostgreSQL 自增使用 serial
      if (constraints.autoIncrement && databaseType === DatabaseType.POSTGRESQL) {
        return 'serial';
      }
      return baseType;
      
    case ColumnType.BIGINT:
      // PostgreSQL 自增使用 bigserial
      if (constraints.autoIncrement && databaseType === DatabaseType.POSTGRESQL) {
        return 'bigserial';
      }
      return baseType;
      
    default:
      return baseType;
  }
}
```

## 📋 重构步骤

### 1. 立即修复
1. 修正所有方法的类型定义
2. 使用正确的 `addColumn` API
3. 移除错误的直接方法调用

### 2. 中期重构
1. 实现统一的 `getColumnTypeForDatabase` 方法
2. 简化各个具体的列类型方法
3. 完善约束应用逻辑

### 3. 长期优化
1. 添加完整的类型安全
2. 实现更好的错误处理
3. 添加单元测试验证各数据库的 DDL 生成

## 🎯 预期效果

重构完成后，我们将有：

1. **类型安全**：完整的 TypeScript 类型支持
2. **正确的 API 使用**：符合 Kysely 最佳实践
3. **跨数据库兼容**：统一的 Schema 定义
4. **可维护性**：清晰的代码结构和错误处理

这个重构将确保我们的跨数据库 TableSchema 设计能够正确工作，并提供良好的开发体验。
