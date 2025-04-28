# @stratix/database 模型系统

## 1. 模型系统概述

@stratix/database 插件提供了一个功能强大的模型系统，使得开发者可以以面向对象的方式操作数据库。模型系统基于 Knex.js 构建，但提供了更高级别的抽象和功能。

### 1.1 核心概念

- **模型类**：表示数据库表，包含表结构定义和业务逻辑
- **字段定义**：定义表字段、类型及约束
- **关系定义**：定义模型之间的关系（一对一、一对多等）
- **查询构建器**：构建和执行数据库查询的流畅 API
- **钩子**：生命周期钩子，在特定操作前后执行自定义逻辑
- **序列化**：将模型实例转换为纯 JSON 对象

## 2. 定义模型

### 2.1 基本模型定义

模型类需要继承自 `BaseModel` 类：

```typescript
import { BaseModel } from '@stratix/database';

export class User extends BaseModel {
  // 表名定义
  static tableName = 'users';
  
  // 主键定义，默认为 'id'
  static primaryKey = 'id';
  
  // 字段定义
  static fields = {
    id: { type: 'increments', primary: true },
    username: { type: 'string', length: 50, unique: true },
    email: { type: 'string', length: 100, unique: true },
    password: { type: 'string', length: 255 },
    is_active: { type: 'boolean', default: true },
    role: { type: 'string', length: 20, default: 'user' }
  };
  
  // 关系定义
  static relations = {
    posts: {
      type: 'hasMany',
      model: 'Post',
      foreignKey: 'user_id'
    },
    profile: {
      type: 'hasOne',
      model: 'Profile',
      foreignKey: 'user_id'
    }
  };
  
  // 钩子定义
  static hooks = {
    beforeCreate: async (user) => {
      // 例如，密码加密
      if (user.password) {
        user.password = await hashPassword(user.password);
      }
    },
    afterCreate: async (user) => {
      // 创建后操作
    }
  };
  
  // 隐藏字段（序列化时排除）
  static hidden = ['password'];
}
```

### 2.2 字段定义选项

每个字段可以配置多种选项：

```typescript
interface FieldOptions {
  // 字段类型
  type: FieldType;
  
  // 是否可为 null
  nullable?: boolean;
  
  // 默认值
  default?: any | (() => any);
  
  // 字段注释
  comment?: string;
  
  // 是否创建索引
  index?: boolean;
  
  // 是否创建唯一索引
  unique?: boolean;
  
  // 是否为主键
  primary?: boolean;
  
  // 字符串长度 (仅用于 string 类型)
  length?: number;
  
  // 字符集和排序规则 (字符串类型)
  charset?: string;
  collate?: string;
  
  // 数值类型选项
  unsigned?: boolean;
  precision?: number;
  scale?: number;
  
  // 枚举类型值
  values?: string[];
  
  // 外键引用
  references?: string;
  onDelete?: string;
  onUpdate?: string;
}
```

### 2.3 支持的字段类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `increments` | 自增整数 | 自动递增的主键 |
| `integer` | 整数 | 年龄、计数等 |
| `bigInteger` | 大整数 | 需要大范围的 ID 等 |
| `tinyInteger` | 小整数 | 标志、小范围值 |
| `string` | 字符串 | 用户名、邮箱等 |
| `text` | 长文本 | 文章内容、描述等 |
| `decimal` | 小数 | 价格、金额等 |
| `float` | 浮点数 | 测量值、坐标等 |
| `boolean` | 布尔值 | 状态标志 |
| `date` | 日期 | 生日等 |
| `datetime` | 日期时间 | 创建时间、更新时间等 |
| `time` | 时间 | 仅时间部分 |
| `timestamp` | 时间戳 | 系统日志时间 |
| `binary` | 二进制数据 | 文件数据 |
| `enum` | 枚举值 | 状态、类型选择 |
| `json` | JSON 数据 | 复杂结构、元数据 |
| `jsonb` | 二进制 JSON | 更高效的 JSON 存储 |
| `uuid` | UUID | 全局唯一标识符 |

## 3. 模型关系

### 3.1 关系类型

@stratix/database 支持四种基本关系类型：

1. **一对一 (hasOne)** - 模型与另一个模型的一对一关系
2. **一对多 (hasMany)** - 模型与多个其他模型实例的关系
3. **属于 (belongsTo)** - 模型属于另一个模型（与 hasOne/hasMany 相反）
4. **多对多 (belongsToMany)** - 通过中间表与另一个模型的多对多关系

### 3.2 定义关系

关系在模型的 `relations` 静态属性中定义：

```typescript
// 定义 Post 模型
export class Post extends BaseModel {
  static tableName = 'posts';
  
  static fields = {
    id: { type: 'increments', primary: true },
    title: { type: 'string', length: 100 },
    content: { type: 'text' },
    user_id: { 
      type: 'integer', 
      references: 'users.id',
      onDelete: 'CASCADE' 
    },
    status: { type: 'string', default: 'draft' }
  };
  
  static relations = {
    // 属于关系 (Post 属于 User)
    author: {
      type: 'belongsTo',
      model: 'User',
      foreignKey: 'user_id',
      localKey: 'id'
    },
    
    // 一对多关系 (Post 有多个 Comment)
    comments: {
      type: 'hasMany',
      model: 'Comment',
      foreignKey: 'post_id',
      localKey: 'id'
    },
    
    // 多对多关系 (Post 有多个 Tag，通过 post_tags 表)
    tags: {
      type: 'belongsToMany',
      model: 'Tag',
      through: 'post_tags',
      foreignKey: 'post_id',
      otherKey: 'tag_id',
      pivotFields: ['created_at']
    }
  };
}
```

### 3.3 使用关系

加载和使用关系：

```typescript
// 获取文章及其作者
const post = await Post.query()
  .with('author')
  .where('id', 1)
  .first();

console.log(post.author.username);

// 获取文章及其评论
const postWithComments = await Post.query()
  .with('comments', (query) => {
    query.orderBy('created_at', 'desc');
  })
  .where('id', 1)
  .first();

for (const comment of postWithComments.comments) {
  console.log(comment.content);
}

// 获取带有标签的文章
const postWithTags = await Post.query()
  .with('tags')
  .where('id', 1)
  .first();

for (const tag of postWithTags.tags) {
  console.log(tag.name);
}
```

## 4. 模型实例方法

模型实例提供多种方法，用于操作单条记录：

```typescript
// 创建用户实例
const user = new User({
  username: 'johndoe',
  email: 'john@example.com',
  password: 'secret'
});

// 保存实例
await user.save();

// 获取属性
const username = user.getAttribute('username');
// 或直接通过属性访问
const email = user.email;

// 设置属性
user.setAttribute('role', 'admin');
// 或直接通过属性设置
user.is_active = true;

// 批量设置属性
user.fill({
  role: 'admin',
  is_active: true
});

// 检查属性是否已修改
if (user.isDirty('role')) {
  console.log('角色已修改');
}

// 获取已修改的属性
const dirtyAttributes = user.getDirty();

// 删除记录
await user.delete();

// 强制删除（忽略软删除）
await user.forceDelete();

// 恢复软删除的记录
await user.restore();

// 刷新实例（从数据库重新加载）
await user.refresh();

// 加载关系
await user.load('posts');
```

## 5. 静态模型方法

模型类提供多种静态方法，用于查询和操作多条记录：

```typescript
// 根据 ID 查找
const user = await User.find(1);

// 根据条件查找
const admin = await User.findBy({ role: 'admin' });

// 获取所有记录
const allUsers = await User.all();

// 创建新记录
const newUser = await User.create({
  username: 'janedoe',
  email: 'jane@example.com',
  password: 'secret'
});

// 更新或创建（如果不存在则创建，存在则更新）
const user = await User.updateOrCreate(
  { email: 'john@example.com' },
  { username: 'johndoe2', role: 'editor' }
);

// 创建多条记录
const users = await User.createMany([
  { username: 'user1', email: 'user1@example.com' },
  { username: 'user2', email: 'user2@example.com' }
]);

// 开始构建查询
const query = User.query();

// 条件查询
const activeUsers = await User.where('is_active', true).get();

// 加载关系
const usersWithPosts = await User.with('posts').get();
```

## 6. 查询构建器

查询构建器提供流畅的链式 API，用于构建和执行复杂查询：

```typescript
// 基本查询构建
const users = await User.query()
  .where('role', 'admin')
  .where('is_active', true)
  .orderBy('created_at', 'desc')
  .limit(10)
  .offset(20)
  .get();

// 高级条件查询
const results = await User.query()
  .where('role', 'admin')
  .orWhere((query) => {
    query.where('role', 'editor').where('is_verified', true);
  })
  .whereNotNull('email_verified_at')
  .get();

// 聚合查询
const count = await User.query().count('* as total');
const maxId = await User.query().max('id as max_id');
const stats = await User.query()
  .select('role')
  .count('* as count')
  .groupBy('role')
  .get();

// 关联查询
const usersWithPosts = await User.query()
  .with('posts', (query) => {
    query.where('status', 'published');
  })
  .where('is_active', true)
  .get();

// 分页查询
const paginator = await User.query()
  .where('is_active', true)
  .orderBy('created_at', 'desc')
  .paginate(1, 15);

console.log(`总记录数: ${paginator.total}`);
console.log(`当前页: ${paginator.currentPage}`);
console.log(`每页条数: ${paginator.perPage}`);
console.log(`总页数: ${paginator.lastPage}`);

// 遍历数据
for (const user of paginator.data) {
  console.log(user.username);
}

// 子查询
const usersWithRecentPosts = await User.query()
  .whereExists((query) => {
    query
      .select('*')
      .from('posts')
      .whereRaw('posts.user_id = users.id')
      .where('created_at', '>=', lastWeek);
  })
  .get();
```

## 7. 高级特性

### 7.1 软删除

启用软删除功能：

```typescript
export class Post extends BaseModel {
  static tableName = 'posts';
  static primaryKey = 'id';
  
  // 启用软删除
  static softDeletes = true;
  
  // 自定义软删除字段名（默认为 deleted_at）
  static deletedAtColumn = 'deleted_at';
  
  static fields = {
    // ...字段定义
  };
}
```

软删除操作：

```typescript
// 软删除记录
await post.delete();

// 强制删除记录（绕过软删除）
await post.forceDelete();

// 恢复已软删除的记录
await post.restore();

// 查询时包含软删除的记录
const allPosts = await Post.query().withTrashed().get();

// 只查询软删除的记录
const trashedPosts = await Post.query().onlyTrashed().get();
```

### 7.2 模型事件与钩子

可用的生命周期钩子：

```typescript
export class User extends BaseModel {
  static hooks = {
    // 创建前
    beforeCreate: async (user) => {
      // 例如加密密码
    },
    
    // 创建后
    afterCreate: async (user) => {
      // 例如发送欢迎邮件
    },
    
    // 更新前
    beforeUpdate: async (user) => {
      // 更新前逻辑
    },
    
    // 更新后
    afterUpdate: async (user) => {
      // 更新后逻辑
    },
    
    // 保存前（创建或更新）
    beforeSave: async (user) => {
      // 保存前逻辑
    },
    
    // 保存后（创建或更新）
    afterSave: async (user) => {
      // 保存后逻辑
    },
    
    // 删除前
    beforeDelete: async (user) => {
      // 删除前逻辑
    },
    
    // 删除后
    afterDelete: async (user) => {
      // 删除后逻辑
    },
    
    // 恢复前（软删除）
    beforeRestore: async (user) => {
      // 恢复前逻辑
    },
    
    // 恢复后（软删除）
    afterRestore: async (user) => {
      // 恢复后逻辑
    }
  };
}
```

### 7.3 数据源同步

@stratix/database 提供了 `SourceTrackableModel` 基类，用于从外部数据源同步数据：

```typescript
import { SourceTrackableModel, SyncStatus } from '@stratix/database';

export class Product extends SourceTrackableModel {
  static tableName = 'products';
  
  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string', length: 100 },
    description: { type: 'text', nullable: true },
    price: { type: 'decimal', precision: 10, scale: 2, default: 0 },
    sku: { type: 'string', length: 50, unique: true },
    category: { type: 'string', length: 50, nullable: true },
    stock: { type: 'integer', default: 0 },
    is_active: { type: 'boolean', default: true }
    // SourceTrackableModel 自动添加源跟踪字段
  };
  
  // 数据源映射方法（将外部数据映射到模型字段）
  static mapSourceData(sourceData, source) {
    return {
      name: sourceData.title,
      description: sourceData.body_html,
      price: sourceData.price,
      sku: sourceData.code,
      category: sourceData.product_type,
      stock: sourceData.inventory_quantity
    };
  }
  
  // 自定义业务方法
  async updateStock(quantity) {
    this.stock += quantity;
    return this.save();
  }
  
  getFormattedPrice() {
    return `¥${this.price.toFixed(2)}`;
  }
}
```

使用源同步功能：

```typescript
// 从外部 API 获取产品数据
const productsData = await fetchProductsFromAPI();

// 批量同步产品
const products = await Product.syncBatchFromSource(
  productsData,
  'external-shop'
);

// 单个同步产品
const product = await Product.syncFromSource(
  productData,
  'external-shop',
  'ext-123' // 源 ID
);
```

### 7.4 事务

在模型操作中使用事务：

```typescript
// 开始事务
await app.database.transaction(async (trx) => {
  // 在事务中创建用户
  const user = await User.create({
    username: 'johndoe',
    email: 'john@example.com'
  }, { transaction: trx });
  
  // 在同一事务中创建用户资料
  await Profile.create({
    user_id: user.id,
    bio: 'Full stack developer',
    avatar: 'default.jpg'
  }, { transaction: trx });
  
  // 事务会自动提交
  // 如果发生错误，事务会自动回滚
});
```

### 7.5 模型注册与发现

自动注册模型：

```typescript
import { ModelRegistry } from '@stratix/database';

// 从目录自动注册所有模型
await ModelRegistry.autoRegisterFromDirectory(
  './models',  // 模型目录路径
  'BaseModel'  // 基类名称
);

// 手动注册模型
ModelRegistry.register(User);
ModelRegistry.register(Post);

// 获取注册的模型
const UserModel = ModelRegistry.getModel('User');
const allModels = ModelRegistry.getAllModels();
``` 