import { Database } from '../src/lib/database';
import { BaseModel } from '../src/models/base-model';
import { DatabaseManager } from '../src/lib/database-manager';
import { QueryBuilder } from '../src/lib/query-builder';
import { ModelRegistry } from '../src/lib/model-registry';

// 测试使用内存SQLite数据库
const testConfig = {
  client: 'sqlite3',
  connection: {
    filename: ':memory:'
  },
  useNullAsDefault: true
};

// 创建用户模型用于测试
class User extends BaseModel {
  static tableName = 'users';

  static fields = {
    id: { type: 'increments', primary: true },
    name: { type: 'string', length: 100, nullable: false },
    email: { type: 'string', unique: true, nullable: false },
    status: {
      type: 'enum',
      values: ['active', 'inactive', 'pending'],
      default: 'pending'
    },
    created_at: { type: 'timestamp', nullable: false },
    updated_at: { type: 'timestamp', nullable: false }
  };

  static relations = {
    posts: {
      type: 'hasMany',
      model: 'Post',
      foreignKey: 'author_id',
      localKey: 'id'
    }
  };
}

// 创建文章模型用于测试
class Post extends BaseModel {
  static tableName = 'posts';

  static fields = {
    id: { type: 'increments', primary: true },
    title: { type: 'string', length: 200, nullable: false },
    content: { type: 'text', nullable: true },
    author_id: {
      type: 'integer',
      unsigned: true,
      references: 'users.id',
      onDelete: 'CASCADE'
    },
    created_at: { type: 'timestamp', nullable: false },
    updated_at: { type: 'timestamp', nullable: false }
  };

  static relations = {
    author: {
      type: 'belongsTo',
      model: 'User',
      foreignKey: 'author_id',
      localKey: 'id'
    }
  };
}

describe('Database', () => {
  let db: Database;
  let manager: DatabaseManager;

  beforeAll(async () => {
    // 初始化数据库
    db = new Database(testConfig);
    manager = new DatabaseManager();
    manager.registerConnection('default', db);

    // 注册模型
    ModelRegistry.register(User);
    ModelRegistry.register(Post);

    // 创建表
    await db.knex.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('email').unique().notNullable();
      table
        .enum('status', ['active', 'inactive', 'pending'])
        .defaultTo('pending');
      table.timestamp('created_at').notNullable().defaultTo(db.knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(db.knex.fn.now());
    });

    await db.knex.schema.createTable('posts', (table) => {
      table.increments('id').primary();
      table.string('title', 200).notNullable();
      table.text('content').nullable();
      table
        .integer('author_id')
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.timestamp('created_at').notNullable().defaultTo(db.knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(db.knex.fn.now());
    });

    // 创建测试数据
    await db.knex('users').insert([
      { name: 'John Doe', email: 'john@example.com', status: 'active' },
      { name: 'Jane Smith', email: 'jane@example.com', status: 'active' },
      { name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive' }
    ]);

    await db.knex('posts').insert([
      { title: 'First Post', content: 'Hello World', author_id: 1 },
      { title: 'Second Post', content: 'Another post', author_id: 1 },
      { title: "Jane's Post", content: 'My first post', author_id: 2 }
    ]);
  });

  afterAll(async () => {
    // 清理
    await db.knex.schema.dropTableIfExists('posts');
    await db.knex.schema.dropTableIfExists('users');
    await db.knex.destroy();
  });

  describe('Connection', () => {
    it('should connect to the database', async () => {
      expect(db).toBeDefined();
      const result = await db.knex.raw('SELECT 1+1 as result');
      expect(result).toBeDefined();
    });

    it('should get connection from manager', () => {
      const connection = manager.connection('default');
      expect(connection).toBe(db);
    });
  });

  describe('Query Builder', () => {
    it('should create query builder instance', () => {
      const query = new QueryBuilder(User, db);
      expect(query).toBeDefined();
    });

    it('should build basic where conditions', async () => {
      const query = new QueryBuilder(User, db);
      const sql = query.where('status', 'active').toSql();
      expect(sql).toContain('WHERE');
      expect(sql).toContain('status');
    });
  });

  describe('Models', () => {
    it('should find a model by id', async () => {
      const user = await User.find(1);
      expect(user).toBeDefined();
      expect(user.id).toBe(1);
      expect(user.name).toBe('John Doe');
    });

    it('should find models by condition', async () => {
      const users = await User.where('status', 'active').get();
      expect(users).toHaveLength(2);
      expect(users[0].status).toBe('active');
    });

    it('should create a new model', async () => {
      const user = await User.create({
        name: 'New User',
        email: 'new@example.com',
        status: 'pending'
      });

      expect(user).toBeDefined();
      expect(user.id).toBe(4);
      expect(user.name).toBe('New User');

      // 验证创建是否成功
      const found = await User.find(user.id);
      expect(found).toBeDefined();
      expect(found.email).toBe('new@example.com');
    });

    it('should update a model', async () => {
      const user = await User.find(1);
      user.name = 'John Updated';
      await user.save();

      // 验证更新是否成功
      const updated = await User.find(1);
      expect(updated.name).toBe('John Updated');
    });

    it('should delete a model', async () => {
      const user = await User.find(3);
      await user.delete();

      // 验证删除是否成功
      const found = await User.find(3);
      expect(found).toBeNull();
    });
  });

  describe('Relations', () => {
    it('should load related models', async () => {
      const user = await User.with('posts').find(1);
      expect(user.posts).toBeDefined();
      expect(user.posts).toHaveLength(2);
      expect(user.posts[0].title).toBe('First Post');
    });

    it('should create related models', async () => {
      const user = await User.find(2);
      const post = await user.related('posts').create({
        title: 'Another Post',
        content: 'New content'
      });

      expect(post).toBeDefined();
      expect(post.author_id).toBe(2);

      // 验证关系创建是否成功
      const posts = await Post.where('author_id', 2).get();
      expect(posts).toHaveLength(2);
    });
  });

  describe('Transactions', () => {
    it('should perform operations in a transaction', async () => {
      await db.transaction(async (trx) => {
        const user = await User.create(
          {
            name: 'Transaction User',
            email: 'transaction@example.com',
            status: 'active'
          },
          { transaction: trx }
        );

        await Post.create(
          {
            title: 'Transaction Post',
            content: 'Created in transaction',
            author_id: user.id
          },
          { transaction: trx }
        );
      });

      // 验证事务是否成功
      const user = await User.where('email', 'transaction@example.com').first();
      expect(user).toBeDefined();

      const post = await Post.where('title', 'Transaction Post').first();
      expect(post).toBeDefined();
    });

    it('should rollback when an error occurs', async () => {
      try {
        await db.transaction(async (trx) => {
          await User.create(
            {
              name: 'Rollback User',
              email: 'rollback@example.com',
              status: 'active'
            },
            { transaction: trx }
          );

          // 故意抛出错误
          throw new Error('Transaction error');
        });
      } catch (error) {
        // 预期会抛出错误
      }

      // 验证回滚是否成功
      const user = await User.where('email', 'rollback@example.com').first();
      expect(user).toBeNull();
    });
  });
});
