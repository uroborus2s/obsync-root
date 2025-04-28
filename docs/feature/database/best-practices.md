# @stratix/database 最佳实践与实用指南

本文档提供 @stratix/database 插件的最佳实践和实用指南，帮助开发者高效使用数据库功能。

## 1. 数据库设计最佳实践

### 1.1 连接管理

- **使用环境变量存储敏感信息**：数据库连接信息应通过环境变量或配置文件提供，避免硬编码
- **配置合适的连接池大小**：根据应用负载调整连接池参数
- **设置连接超时和重试策略**：处理临时连接失败

```typescript
// 推荐配置方式
app.register(databasePlugin, {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },
  pool: {
    min: 2,
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    // 连接超时，默认 60 秒
    acquireTimeoutMillis: 60000,
    // 空闲超时，默认 30 秒
    idleTimeoutMillis: 30000,
    // 连接被标记为死亡并从池中移除前的最大错误数
    createRetryIntervalMillis: 200
  },
  acquireConnectionTimeout: 60000,
  debug: process.env.NODE_ENV === 'development'
});
```

### 1.2 多数据库连接

当应用需要连接多个数据库时：

```typescript
// 配置多个数据库连接
app.register(databasePlugin, {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  // 额外的数据库连接
  connections: {
    // 报表数据库
    reports: {
      client: 'postgresql',
      connection: {
        host: process.env.REPORTS_DB_HOST,
        database: process.env.REPORTS_DB_NAME,
        user: process.env.REPORTS_DB_USER,
        password: process.env.REPORTS_DB_PASSWORD
      }
    },
    // 只读副本
    readonly: {
      client: 'postgresql',
      connection: {
        host: process.env.READONLY_DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.READONLY_DB_USER,
        password: process.env.READONLY_DB_PASSWORD
      }
    }
  }
});

// 使用特定连接
const reportsDb = app.database.connection('reports');
const readonlyDb = app.database.connection('readonly');
```

### 1.3 模型设计

- **按领域划分模型**：将相关模型组织在一起
- **遵循单一职责原则**：一个模型应对应一个数据表和业务领域
- **命名一致性**：使用一致的命名约定
- **使用合适的字段类型**：选择最合适的数据类型
- **定义适当的索引**：平衡查询性能和写入性能

```typescript
// 良好的模型设计示例
export class Product extends BaseModel {
  static tableName = 'products';
  
  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string', length: 100, index: true },
    slug: { type: 'string', length: 120, unique: true },
    description: { type: 'text', nullable: true },
    price: { type: 'decimal', precision: 10, scale: 2, default: 0 },
    status: { type: 'enum', values: ['draft', 'active', 'archived'], default: 'draft', index: true },
    category_id: { 
      type: 'integer', 
      references: 'categories.id',
      onDelete: 'SET NULL',
      nullable: true,
      index: true
    },
    stock: { type: 'integer', default: 0 },
    featured: { type: 'boolean', default: false, index: true },
    views_count: { type: 'integer', default: 0 },
    metadata: { type: 'jsonb', nullable: true }
  };
  
  static relations = {
    category: {
      type: 'belongsTo',
      model: 'Category',
      foreignKey: 'category_id'
    },
    variants: {
      type: 'hasMany',
      model: 'ProductVariant',
      foreignKey: 'product_id'
    },
    tags: {
      type: 'belongsToMany',
      model: 'Tag',
      through: 'product_tags',
      foreignKey: 'product_id',
      otherKey: 'tag_id'
    }
  };
  
  // 业务方法
  async decreaseStock(quantity: number) {
    if (this.stock < quantity) {
      throw new Error('Not enough stock');
    }
    
    this.stock -= quantity;
    return this.save();
  }
  
  isAvailable() {
    return this.stock > 0 && this.status === 'active';
  }
  
  getFormattedPrice() {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(this.price);
  }
}
```

## 2. 查询性能优化

### 2.1 查询构建最佳实践

- **只选择需要的字段**：避免 `SELECT *`
- **使用索引支持的查询**：确保查询条件使用了索引
- **限制结果集大小**：使用 LIMIT 和分页
- **批量操作代替循环**：使用 bulk insert 和 update
- **避免 N+1 查询问题**：合理使用预加载关系

```typescript
// 推荐做法 - 只选择需要的字段
const users = await User.query()
  .select('id', 'name', 'email')
  .where('active', true)
  .limit(100)
  .get();

// 推荐做法 - 预加载关系避免 N+1 问题
const posts = await Post.query()
  .select('id', 'title', 'user_id')
  .with('author', (query) => {
    query.select('id', 'name', 'email');
  })
  .with('comments', (query) => {
    query.select('id', 'content', 'post_id');
  })
  .where('status', 'published')
  .limit(20)
  .get();

// 推荐做法 - 批量插入
await User.createMany([
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' }
]);

// 推荐做法 - 批量更新
await app.database.knex('users')
  .whereIn('id', [1, 2, 3])
  .update({ active: true });
```

### 2.2 使用索引

为常用查询创建适当的索引：

```typescript
// 在模型中定义索引
static fields = {
  email: { type: 'string', unique: true },  // 唯一索引
  status: { type: 'string', index: true },  // 普通索引
  user_id: { type: 'integer', index: true } // 外键索引
};

// 或在迁移中创建索引
exports.up = function(knex) {
  return knex.schema.createTable('orders', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable();
    table.string('status').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // 单列索引
    table.index('user_id');
    table.index('status');
    
    // 复合索引 (用户ID + 创建时间)
    table.index(['user_id', 'created_at']);
  });
};
```

### 2.3 使用事务

事务确保操作的原子性，特别是处理相关表的更新时：

```typescript
// 使用事务执行多个操作
await app.database.transaction(async (trx) => {
  // 创建订单
  const [orderId] = await trx('orders').insert({
    user_id: userId,
    total: cart.total,
    status: 'pending'
  }).returning('id');
  
  // 创建订单项
  await trx('order_items').insert(
    cart.items.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price
    }))
  );
  
  // 更新产品库存
  for (const item of cart.items) {
    await trx('products')
      .where('id', item.product_id)
      .decrement('stock', item.quantity);
  }
  
  // 清空购物车
  await trx('cart_items').where('user_id', userId).delete();
});
```

## 3. 模型关系和加载策略

### 3.1 定义和使用关系

定义清晰的关系可提高代码可读性和查询效率：

```typescript
// 用户模型
export class User extends BaseModel {
  static tableName = 'users';
  
  static relations = {
    // 一对一关系
    profile: {
      type: 'hasOne',
      model: 'Profile',
      foreignKey: 'user_id'
    },
    
    // 一对多关系
    posts: {
      type: 'hasMany',
      model: 'Post',
      foreignKey: 'author_id'
    },
    
    // 多对多关系
    roles: {
      type: 'belongsToMany',
      model: 'Role',
      through: 'user_roles',
      foreignKey: 'user_id',
      otherKey: 'role_id'
    }
  };
}
```

### 3.2 加载关系的不同方式

根据场景选择合适的关系加载方式：

```typescript
// 1. 预加载 - 在初始查询中加载关系
const usersWithPosts = await User.query()
  .with('posts')
  .with('profile')
  .get();

// 2. 延迟加载 - 稍后加载关系
const user = await User.find(1);
await user.load('posts');  // 后续加载关系

// 3. 条件预加载 - 带条件的预加载
const usersWithPublishedPosts = await User.query()
  .with('posts', (query) => {
    query.where('status', 'published');
  })
  .get();

// 4. 嵌套关系加载 - 加载多层关系
const users = await User.query()
  .with('posts', (posts) => {
    posts.with('comments', (comments) => {
      comments.with('author');
    });
  })
  .get();

// 5. 计数加载 - 只加载关系数量
const usersWithPostsCount = await User.query()
  .withCount('posts as posts_count')
  .get();
```

### 3.3 避免 N+1 查询问题

N+1 查询问题是指执行一个查询获取 N 条记录，再为每条记录执行一次查询：

```typescript
// 错误示例 - N+1 问题
const posts = await Post.all();
for (const post of posts) {
  // 这会为每篇文章执行一次额外查询
  const author = await User.find(post.user_id);
  console.log(author.name);
}

// 正确示例 - 使用预加载
const posts = await Post.query()
  .with('author')
  .get();

for (const post of posts) {
  // 已经加载，不会产生额外查询
  console.log(post.author.name);
}
```

## 4. 迁移和数据库版本控制

### 4.1 创建和运行迁移

迁移是管理数据库架构变更的最佳实践：

```typescript
// 迁移配置
app.register(databasePlugin, {
  // ...其他配置
  migrations: {
    directory: './migrations',
    tableName: 'migrations'
  }
});

// 创建迁移文件
// 使用 CLI 命令: stratix db:migration:create create_users_table

// 创建用户表的迁移示例
exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};

// 运行迁移
// 使用 CLI 命令: stratix db:migrate
```

### 4.2 种子数据

种子数据用于填充测试或初始数据：

```typescript
// 种子配置
app.register(databasePlugin, {
  // ...其他配置
  seeds: {
    directory: './seeds',
    environment: {
      development: ['dev'],
      test: ['test'],
      production: ['prod']
    }
  }
});

// 创建种子文件
// 使用 CLI 命令: stratix db:seed:create users

// 用户种子示例
exports.seed = function(knex) {
  // 清空表
  return knex('users').del()
    .then(function() {
      // 插入数据
      return knex('users').insert([
        {
          name: '管理员',
          email: 'admin@example.com',
          password: 'hashed_password',
          is_active: true
        },
        {
          name: '测试用户',
          email: 'test@example.com',
          password: 'hashed_password',
          is_active: true
        }
      ]);
    });
};

// 运行种子
// 使用 CLI 命令: stratix db:seed
```

## 5. 安全最佳实践

### 5.1 防止 SQL 注入

使用参数化查询和 Knex 查询构建器防止 SQL 注入：

```typescript
// 不安全示例 - 容易受到 SQL 注入攻击
const userId = req.params.id;
const user = await db.raw(`SELECT * FROM users WHERE id = ${userId}`);

// 安全示例 - 使用参数化查询
const user = await db.raw('SELECT * FROM users WHERE id = ?', [userId]);

// 更安全 - 使用查询构建器
const user = await db('users').where('id', userId).first();

// 或使用模型
const user = await User.find(userId);
```

### 5.2 保护敏感数据

通过模型的 `hidden` 属性在序列化时保护敏感字段：

```typescript
export class User extends BaseModel {
  static tableName = 'users';
  
  // 序列化时隐藏敏感字段
  static hidden = ['password', 'remember_token', 'api_key'];
  
  // ...其他定义
}

// 使用时会自动排除隐藏字段
const user = await User.find(1);
const json = user.toJSON(); // password 不会包含在结果中
```

### 5.3 使用事务保证数据一致性

事务可确保关联操作的完整性：

```typescript
try {
  await app.database.transaction(async (trx) => {
    // 扣减账户余额
    await trx('accounts')
      .where('id', accountId)
      .decrement('balance', amount);
      
    // 检查余额是否足够
    const account = await trx('accounts')
      .where('id', accountId)
      .first();
      
    if (account.balance < 0) {
      throw new Error('余额不足');
    }
    
    // 创建交易记录
    await trx('transactions').insert({
      account_id: accountId,
      amount: -amount,
      type: 'withdrawal',
      status: 'completed'
    });
  });
  
  return { success: true };
} catch (error) {
  return { success: false, error: error.message };
}
```

## 6. 测试数据库代码

### 6.1 设置测试环境

为测试配置单独的数据库连接：

```typescript
// test/setup.js
const { createApp } = require('stratix');
const databasePlugin = require('@stratix/database');

async function setupTestDatabase() {
  const app = createApp({ name: 'test-app' });
  
  app.register(databasePlugin, {
    client: 'sqlite3',
    connection: {
      filename: ':memory:'  // 使用内存数据库进行测试
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds/test'
    }
  });
  
  await app.start();
  
  // 运行迁移
  await app.database.knex.migrate.latest();
  
  // 运行种子
  await app.database.knex.seed.run();
  
  return app;
}

module.exports = { setupTestDatabase };
```

### 6.2 编写数据库测试

使用事务包装测试以自动回滚更改：

```typescript
// test/models/user.test.js
const { setupTestDatabase } = require('../setup');
const { expect } = require('chai');

describe('User Model', () => {
  let app;
  let User;
  
  before(async () => {
    app = await setupTestDatabase();
    User = app.models.User;
  });
  
  after(async () => {
    await app.close();
  });
  
  it('should create a user', async () => {
    // 使用事务包装测试
    await app.database.transaction(async (trx) => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }, { transaction: trx });
      
      expect(user).to.exist;
      expect(user.id).to.be.a('number');
      expect(user.name).to.equal('Test User');
      
      // 事务会自动回滚，不会污染数据库
      
      // 手动回滚也可以
      trx.rollback();
    });
  });
  
  it('should find user by email', async () => {
    // 假设种子数据中包含此用户
    const user = await User.findBy({ email: 'admin@example.com' });
    
    expect(user).to.exist;
    expect(user.name).to.equal('管理员');
  });
});
```

## 7. 实用技巧

### 7.1 利用模型钩子实现业务逻辑

模型钩子可用于封装常见的业务逻辑：

```typescript
export class Order extends BaseModel {
  static tableName = 'orders';
  
  static hooks = {
    // 创建前自动生成订单号
    beforeCreate: async (order) => {
      if (!order.order_number) {
        const date = new Date();
        const timestamp = Math.floor(date.getTime() / 1000);
        const random = Math.floor(Math.random() * 10000);
        order.order_number = `ORD-${timestamp}-${random}`;
      }
    },
    
    // 创建后自动发送通知
    afterCreate: async (order) => {
      // 发送订单确认邮件
      await sendOrderConfirmationEmail(order);
      
      // 通知库存系统
      await notifyInventorySystem(order);
    },
    
    // 更新状态时的业务逻辑
    beforeUpdate: async (order) => {
      const oldStatus = order._original.status;
      const newStatus = order._attributes.status;
      
      if (oldStatus !== newStatus) {
        order.status_changed_at = new Date();
        
        // 记录状态变更历史
        await StatusHistory.create({
          order_id: order.id,
          from_status: oldStatus,
          to_status: newStatus,
          changed_by: order._attributes.updated_by || 'system'
        });
      }
    }
  };
}
```

### 7.2 使用查询作用域简化常用查询

查询作用域可以封装常见的查询条件：

```typescript
export class Product extends BaseModel {
  static tableName = 'products';
  
  // 定义静态方法作为查询作用域
  static scopeActive(query) {
    return query.where('status', 'active');
  }
  
  static scopeFeatured(query) {
    return query.where('featured', true);
  }
  
  static scopeInStock(query) {
    return query.where('stock', '>', 0);
  }
  
  static scopeInCategory(query, categoryId) {
    return query.where('category_id', categoryId);
  }
  
  static scopePriceRange(query, min, max) {
    return query.whereBetween('price', [min, max]);
  }
}

// 使用作用域
const featuredProducts = await Product.query()
  .scopeActive()
  .scopeFeatured()
  .scopeInStock()
  .limit(10)
  .get();

// 组合使用多个作用域
const categoryProducts = await Product.query()
  .scopeActive()
  .scopeInCategory(5)
  .scopePriceRange(100, 500)
  .orderBy('price')
  .get();
```

### 7.3 使用动态关系

根据条件加载不同关系或定制关系查询：

```typescript
// 动态关系查询
async function getUsersWithRecentPosts(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return await User.query()
    .with('posts', (query) => {
      query.where('created_at', '>=', date.toISOString());
      query.orderBy('created_at', 'desc');
    })
    .get();
}

// 根据用户角色加载不同关系
async function getUserDetails(userId, userRole) {
  const query = User.query().where('id', userId);
  
  // 基本关系
  query.with('profile');
  
  // 根据角色加载额外关系
  if (userRole === 'admin') {
    query.with('permissions');
    query.with('activityLogs');
  } else if (userRole === 'customer') {
    query.with('orders', (q) => {
      q.orderBy('created_at', 'desc').limit(5);
    });
    query.with('wishlist');
  }
  
  return await query.first();
}
``` 