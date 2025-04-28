# @stratix/database API 参考

本文档提供了 @stratix/database 插件的 API 参考，详细说明了各个类、方法和属性。

## 1. 核心类

### 1.1 DatabaseManager

`DatabaseManager` 负责管理多个数据库连接，是数据库插件的核心管理类。

#### 主要方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `constructor()` | - | `DatabaseManager` | 创建数据库管理器实例 |
| `setDefaultConnection(name)` | `name: string` | `void` | 设置默认连接名称 |
| `getDefaultConnection()` | - | `string` | 获取默认连接名称 |
| `registerConnection(name, connection)` | `name: string, connection: Database` | `void` | 注册数据库连接 |
| `addConnection(name, config)` | `name: string, config: DatabaseConfig` | `Database` | 创建并注册新的数据库连接 |
| `connection(name?)` | `name?: string` | `Database` | 获取指定名称的数据库连接 |
| `hasConnection(name)` | `name: string` | `boolean` | 检查指定的连接是否存在 |
| `getConnectionNames()` | - | `string[]` | 获取所有连接名称 |
| `initializeFromConfig(config, defaultName?)` | `config: DatabaseConfig, defaultName?: string` | `void` | 从配置初始化多个连接 |
| `closeConnection(name?)` | `name?: string` | `Promise<void>` | 关闭指定的连接 |
| `closeAll()` | - | `Promise<void>` | 关闭所有连接 |

#### 使用示例

```typescript
// 创建数据库管理器
const dbManager = new DatabaseManager();

// 添加多个连接
dbManager.addConnection('default', {
  client: 'postgresql',
  connection: {
    host: 'localhost',
    database: 'main_db',
    user: 'postgres',
    password: 'postgres'
  }
});

dbManager.addConnection('reports', {
  client: 'postgresql',
  connection: {
    host: 'reports.example.com',
    database: 'reports_db',
    user: 'reports_user',
    password: 'secret'
  }
});

// 获取连接
const db = dbManager.connection();
const reportsDb = dbManager.connection('reports');

// 关闭连接
await dbManager.closeAll();
```

### 1.2 Database

`Database` 类封装了 Knex 实例，提供数据库连接和查询功能。

#### 主要方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `constructor(config)` | `config: DatabaseConfig` | `Database` | 创建数据库实例 |
| `getKnex()` | - | `Knex` | 获取内部 Knex 实例 |
| `raw(sql, bindings?)` | `sql: string, bindings?: any` | `Promise<Knex.Raw<T>>` | 执行原始 SQL 查询 |
| `statement(sql, bindings?)` | `sql: string, bindings?: any` | `Promise<void>` | 执行不返回结果的 SQL 语句 |
| `beginTransaction()` | - | `Promise<Knex.Transaction>` | 开始事务 |
| `transaction(callback)` | `callback: (trx: Knex.Transaction) => Promise<T>` | `Promise<T>` | 在事务中执行操作 |
| `close()` | - | `Promise<void>` | 关闭数据库连接 |

#### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `knex` | `Knex` | Knex 实例 |

#### 使用示例

```typescript
// 创建数据库实例
const db = new Database({
  client: 'postgresql',
  connection: {
    host: 'localhost',
    database: 'my_db',
    user: 'postgres',
    password: 'postgres'
  }
});

// 执行原始 SQL
const result = await db.raw('SELECT * FROM users WHERE id = ?', [1]);

// 使用 Knex 查询构建器
const users = await db.knex('users').where('active', true).select('*');

// 执行事务
await db.transaction(async (trx) => {
  await trx('users').insert({ name: 'John' });
  await trx('logs').insert({ action: 'user_created' });
});

// 关闭连接
await db.close();
```

### 1.3 BaseModel

`BaseModel` 是所有模型的基类，提供了与数据库表交互的方法。

#### 静态属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `tableName` | `string` | 必须设置 | 表名 |
| `primaryKey` | `string` | `'id'` | 主键名 |
| `fields` | `Record<string, any>` | `{}` | 字段定义 |
| `relations` | `Record<string, any>` | `{}` | 关系定义 |
| `hooks` | `ModelHooks` | `undefined` | 模型钩子 |
| `timestamps` | `boolean` | `true` | 是否使用时间戳 |
| `createdAtColumn` | `string` | `'created_at'` | 创建时间字段名 |
| `updatedAtColumn` | `string` | `'updated_at'` | 更新时间字段名 |
| `softDeletes` | `boolean` | `false` | 是否使用软删除 |
| `deletedAtColumn` | `string` | `'deleted_at'` | 软删除时间字段名 |
| `hidden` | `string[]` | `[]` | 隐藏字段（序列化时排除） |
| `connection` | `string` | `'default'` | 默认数据库连接名 |

#### 静态方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `setDatabaseManager(manager)` | `manager: DatabaseManager` | `void` | 设置数据库管理器 |
| `getDatabaseManager()` | - | `DatabaseManager` | 获取数据库管理器 |
| `getConnection(connectionName?)` | `connectionName?: string` | `Database` | 获取数据库连接 |
| `query(options?)` | `options?: QueryOptions` | `QueryBuilder` | 创建查询构建器 |
| `find(id, options?)` | `id: any, options?: QueryOptions` | `Promise<any>` | 根据 ID 查找记录 |
| `findBy(conditions, options?)` | `conditions: Record<string, any>, options?: QueryOptions` | `Promise<any>` | 根据条件查找记录 |
| `all(options?)` | `options?: QueryOptions` | `Promise<any[]>` | 获取所有记录 |
| `create(data, options?)` | `data: Record<string, any>, options?: QueryOptions` | `Promise<any>` | 创建新记录 |
| `updateOrCreate(conditions, values, options?)` | `conditions: Record<string, any>, values: Record<string, any>, options?: QueryOptions` | `Promise<any>` | 更新或创建记录 |
| `createMany(dataArray, options?)` | `dataArray: Record<string, any>[], options?: QueryOptions` | `Promise<any[]>` | 创建多条记录 |
| `where(column, operator, value?)` | `column: string, operator: any, value?: any` | `QueryBuilder` | 开始条件查询 |
| `with(relation, callback?)` | `relation: string, callback?: Function` | `QueryBuilder` | 开始关系查询 |

#### 实例方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `constructor(attributes?)` | `attributes?: Record<string, any>` | `BaseModel` | 创建模型实例 |
| `getPrimaryKeyValue()` | - | `any` | 获取主键值 |
| `getAttribute(key)` | `key: string` | `any` | 获取属性值 |
| `setAttribute(key, value)` | `key: string, value: any` | `void` | 设置属性值 |
| `getAttributes()` | - | `Record<string, any>` | 获取所有属性 |
| `fill(attributes)` | `attributes: Record<string, any>` | `this` | 批量设置属性 |
| `isDirty(attribute?)` | `attribute?: string` | `boolean` | 检查属性是否已修改 |
| `getDirty()` | - | `Record<string, any>` | 获取已修改的属性 |
| `save(options?)` | `options?: QueryOptions` | `Promise<boolean>` | 保存实例 |
| `delete(options?)` | `options?: QueryOptions` | `Promise<boolean>` | 删除记录 |
| `forceDelete(options?)` | `options?: QueryOptions` | `Promise<boolean>` | 强制删除记录 |
| `restore(options?)` | `options?: QueryOptions` | `Promise<boolean>` | 恢复软删除的记录 |
| `refresh(options?)` | `options?: QueryOptions` | `Promise<boolean>` | 刷新实例 |
| `related(relation)` | `relation: string` | `any` | 获取关联的模型实例 |
| `toJSON()` | - | `Record<string, any>` | 将模型转换为 JSON 对象 |

#### 使用示例

```typescript
// 定义模型
class User extends BaseModel {
  static tableName = 'users';
  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string', length: 100 },
    email: { type: 'string', length: 100, unique: true }
  };
}

// 设置数据库管理器
User.setDatabaseManager(dbManager);

// 使用静态方法
const users = await User.all();
const user = await User.find(1);
const admin = await User.findBy({ role: 'admin' });
const newUser = await User.create({ name: 'John', email: 'john@example.com' });

// 使用实例方法
user.name = 'John Doe';
await user.save();

if (user.isDirty('email')) {
  console.log('Email has been changed');
}

await user.delete();
```

### 1.4 QueryBuilder

`QueryBuilder` 提供流畅的链式 API，用于构建和执行复杂查询。

#### 主要方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `select(...columns)` | `...columns: string[]` | `this` | 指定要选择的列 |
| `where(column, operator, value?)` | `column: string, operator: any, value?: any` | `this` | 添加 WHERE 条件 |
| `orWhere(column, operator, value?)` | `column: string, operator: any, value?: any` | `this` | 添加 OR WHERE 条件 |
| `whereIn(column, values)` | `column: string, values: any[]` | `this` | 添加 WHERE IN 条件 |
| `whereNull(column)` | `column: string` | `this` | 添加 WHERE NULL 条件 |
| `whereNotNull(column)` | `column: string` | `this` | 添加 WHERE NOT NULL 条件 |
| `orderBy(column, direction?)` | `column: string, direction?: 'asc' \| 'desc'` | `this` | 添加排序规则 |
| `groupBy(...columns)` | `...columns: string[]` | `this` | 添加分组规则 |
| `limit(value)` | `value: number` | `this` | 限制结果数量 |
| `offset(value)` | `value: number` | `this` | 设置结果偏移量 |
| `count(column?)` | `column?: string` | `Promise<number>` | 获取记录数量 |
| `max(column)` | `column: string` | `Promise<any>` | 获取最大值 |
| `min(column)` | `column: string` | `Promise<any>` | 获取最小值 |
| `sum(column)` | `column: string` | `Promise<number>` | 获取合计值 |
| `avg(column)` | `column: string` | `Promise<number>` | 获取平均值 |
| `with(relation, callback?)` | `relation: string, callback?: Function` | `this` | 预加载关系 |
| `withTrashed()` | - | `this` | 包含软删除的记录 |
| `onlyTrashed()` | - | `this` | 只查询软删除的记录 |
| `insert(data)` | `data: Record<string, any>` | `Promise<number[]>` | 插入记录 |
| `update(data)` | `data: Record<string, any>` | `Promise<number>` | 更新记录 |
| `delete()` | - | `Promise<number>` | 删除记录 |
| `paginate(page, perPage?)` | `page: number, perPage?: number` | `Promise<PaginationResult<T>>` | 分页查询 |
| `first()` | - | `Promise<T \| null>` | 获取第一条记录 |
| `get()` | - | `Promise<T[]>` | 执行查询并获取结果 |

#### 使用示例

```typescript
// 使用查询构建器
const users = await User.query()
  .where('active', true)
  .orderBy('created_at', 'desc')
  .limit(10)
  .get();

// 聚合查询
const count = await User.query().where('active', true).count();
const maxId = await User.query().max('id');

// 分页查询
const paginator = await User.query()
  .where('active', true)
  .orderBy('name')
  .paginate(2, 15);

console.log(`总记录数: ${paginator.total}`);
console.log(`当前页: ${paginator.currentPage}`);
console.log(`每页条数: ${paginator.perPage}`);
console.log(`总页数: ${paginator.lastPage}`);

// 关系查询
const usersWithPosts = await User.query()
  .with('posts', (query) => {
    query.where('published', true);
  })
  .get();

// 软删除查询
const allUsers = await User.query().withTrashed().get();
const trashedUsers = await User.query().onlyTrashed().get();
```

### 1.5 ModelRegistry

`ModelRegistry` 负责管理模型的注册和检索。

#### 静态方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `register(modelClass)` | `modelClass: any` | `void` | 注册一个模型类 |
| `getModel(name)` | `name: string` | `any` | 根据名称获取模型类 |
| `hasModel(name)` | `name: string` | `boolean` | 检查模型是否已注册 |
| `getModelNames()` | - | `string[]` | 获取所有已注册的模型名称 |
| `getAllModels()` | - | `Record<string, any>` | 获取所有已注册的模型 |
| `autoRegisterFromDirectory(directory, baseClassName?)` | `directory: string, baseClassName?: string` | `Promise<void>` | 从目录自动注册模型 |
| `clearAll()` | - | `void` | 清除所有已注册的模型 |

#### 使用示例

```typescript
import { ModelRegistry } from '@stratix/database';
import { User } from './models/User';
import { Post } from './models/Post';

// 手动注册模型
ModelRegistry.register(User);
ModelRegistry.register(Post);

// 验证模型是否已注册
if (ModelRegistry.hasModel('User')) {
  console.log('User model is registered');
}

// 获取模型
const UserModel = ModelRegistry.getModel('User');
const allModels = ModelRegistry.getAllModels();

// 自动注册目录中的所有模型
await ModelRegistry.autoRegisterFromDirectory('./models', 'BaseModel');
```

### 1.6 SourceTrackableModel

`SourceTrackableModel` 继承自 `BaseModel`，提供从外部数据源同步数据的功能。

#### 静态方法

| 方法 | 参数 | 返回值 | 描述 |
|------|------|--------|------|
| `mapSourceData(sourceData, source, model?)` | `sourceData: any, source: string, model?: SourceTrackableModel` | `Record<string, any>` | 将源数据映射到模型字段 |
| `syncFromSource(sourceData, source, sourceId, options?)` | `sourceData: any, source: string, sourceId: string, options?: SyncOptions` | `Promise<SourceTrackableModel>` | 从源同步单个记录 |
| `syncBatchFromSource(sourcesData, source, options?)` | `sourcesData: any[], source: string, options?: SyncOptions` | `Promise<SourceTrackableModel[]>` | 从源批量同步记录 |

#### SyncOptions 接口

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `sourceIdField` | `string` | `'id'` | 源数据中的 ID 字段名 |
| `sourceUpdatedAtField` | `string` | `'updated_at'` | 源数据中的更新时间字段名 |
| `transaction` | `Knex.Transaction` | `undefined` | 事务对象 |
| `queryCallback` | `Function` | `undefined` | 查询回调函数 |

#### 源状态枚举

```typescript
enum SyncStatus {
  PENDING = 'pending',   // 等待同步
  SYNCED = 'synced',     // 同步成功
  FAILED = 'failed',     // 同步失败
  DELETED = 'deleted'    // 在源中已删除
}
```

#### 使用示例

```typescript
import { SourceTrackableModel, SyncStatus } from '@stratix/database';

class Product extends SourceTrackableModel {
  static tableName = 'products';
  
  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string' },
    price: { type: 'decimal', precision: 10, scale: 2 },
    sku: { type: 'string', unique: true },
    stock: { type: 'integer', default: 0 }
    // SourceTrackableModel 自动添加源跟踪字段
  };
  
  // 将外部数据映射到模型字段
  static mapSourceData(sourceData, source) {
    return {
      name: sourceData.title,
      price: sourceData.price,
      sku: sourceData.code,
      stock: sourceData.inventory
    };
  }
  
  // 自定义业务方法
  async updateStock(quantity) {
    this.stock += quantity;
    return this.save();
  }
}

// 使用
const externalData = await fetchProductsFromAPI();
const products = await Product.syncBatchFromSource(
  externalData,
  'shopify-store'
);

// 获取同步状态
const syncedProducts = products.filter(p => 
  p.getAttribute('sync_status') === SyncStatus.SYNCED
);
```

## 2. 类型定义

### 2.1 DatabaseConfig

```typescript
interface DatabaseConfig extends Knex.Config {
  /**
   * 是否启用调试模式
   */
  debug?: boolean;

  /**
   * 多数据库连接配置
   */
  connections?: Record<string, Knex.Config>;

  /**
   * 模型配置
   */
  models?: {
    /**
     * 模型文件目录
     */
    directory?: string;

    /**
     * 基础模型类名
     */
    baseClass?: string;

    /**
     * 是否自动注册目录下所有模型
     */
    autoRegister?: boolean;
  };

  /**
   * 迁移配置
   */
  migrations?: {
    /**
     * 迁移文件目录
     */
    directory?: string;

    /**
     * 迁移表名
     */
    tableName?: string;

    /**
     * 是否自动从模型生成迁移
     */
    autoGenerate?: boolean;
  };

  /**
   * 种子配置
   */
  seeds?: {
    /**
     * 种子文件目录
     */
    directory?: string;

    /**
     * 不同环境使用的种子目录
     */
    environment?: Record<string, string[]>;
  };
}
```

### 2.2 字段定义类型

```typescript
/**
 * 字段类型定义
 */
type FieldType =
  | 'increments'
  | 'integer'
  | 'bigInteger'
  | 'tinyInteger'
  | 'string'
  | 'text'
  | 'decimal'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'time'
  | 'timestamp'
  | 'binary'
  | 'enum'
  | 'json'
  | 'jsonb'
  | 'uuid';

/**
 * 字段定义，合并所有可能的字段选项
 */
type FieldDefinition = BaseFieldOptions &
  Partial<
    StringFieldOptions &
      NumberFieldOptions &
      EnumFieldOptions &
      DatetimeFieldOptions &
      ReferenceOptions
  >;
```

### 2.3 关系定义类型

```typescript
/**
 * 关系类型
 */
type RelationType = 'hasOne' | 'hasMany' | 'belongsTo' | 'belongsToMany';

/**
 * 关系定义，合并所有可能的关系类型
 */
type RelationDefinition =
  | HasOneRelation
  | HasManyRelation
  | BelongsToRelation
  | BelongsToManyRelation;
```

### 2.4 查询和钩子类型

```typescript
/**
 * 模型查询选项
 */
interface QueryOptions {
  /**
   * 事务对象
   */
  transaction?: Knex.Transaction;

  /**
   * 是否强制删除（软删除情况下）
   */
  force?: boolean;

  /**
   * 其他选项
   */
  [key: string]: any;
}

/**
 * 钩子类型
 */
type HookType =
  | 'beforeCreate'
  | 'afterCreate'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeSave'
  | 'afterSave'
  | 'beforeDelete'
  | 'afterDelete'
  | 'beforeRestore'
  | 'afterRestore';

/**
 * 钩子函数类型
 */
type HookFunction = (
  model: any,
  options?: QueryOptions
) => Promise<void> | void;
```

### 2.5 分页结果

```typescript
/**
 * 分页结果
 */
interface PaginationResult<T> {
  /**
   * 数据结果
   */
  data: T[];

  /**
   * 总记录数
   */
  total: number;

  /**
   * 当前页
   */
  currentPage: number;

  /**
   * 每页记录数
   */
  perPage: number;

  /**
   * 总页数
   */
  lastPage: number;

  /**
   * 是否有更多页
   */
  hasMorePages: boolean;

  /**
   * 第一条记录的索引
   */
  from: number | null;

  /**
   * 最后一条记录的索引
   */
  to: number | null;
}
``` 