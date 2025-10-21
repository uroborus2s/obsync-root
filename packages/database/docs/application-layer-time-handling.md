# 应用层时间处理最佳实践

## 🎯 **问题背景**

不同数据库的时间默认值语法差异很大，使用数据库级别的时间默认值会导致跨数据库兼容性问题：

### **数据库时间函数差异**
```sql
-- PostgreSQL
CREATE TABLE users (
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- MySQL
CREATE TABLE users (
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP()
);

-- SQLite
CREATE TABLE users (
  created_at text DEFAULT (datetime('now')),
  updated_at text DEFAULT CURRENT_TIMESTAMP
);

-- SQL Server
CREATE TABLE users (
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT CURRENT_TIMESTAMP
);
```

## ✅ **解决方案：应用层时间处理**

### 1. **Schema 定义中避免时间默认值**
```typescript
// ✅ 推荐：不设置数据库级别的时间默认值
const userSchema = SchemaBuilder
  .create('users')
  .addColumn('id', ColumnType.INTEGER, { primaryKey: true, autoIncrement: true })
  .addColumn('name', ColumnType.STRING, { length: 100, nullable: false })
  .addColumn('email', ColumnType.STRING, { length: 255, unique: true })
  .addColumn('created_at', ColumnType.TIMESTAMP, { nullable: false })  // 不设置 defaultValue
  .addColumn('updated_at', ColumnType.TIMESTAMP, { nullable: true })   // 不设置 defaultValue
  .build();

// ❌ 避免：数据库级别的时间默认值
const badSchema = SchemaBuilder
  .create('users')
  .addColumn('created_at', ColumnType.TIMESTAMP, { 
    nullable: false, 
    defaultValue: 'CURRENT_TIMESTAMP'  // 跨数据库兼容性问题
  })
  .build();
```

### 2. **Repository 层处理时间字段**
```typescript
export class UserRepository extends BaseRepository<Database, 'users'> {
  constructor() {
    super(
      { connectionName: 'default' },
      userSchema,
      { enabled: true, autoEnableInDevelopment: true }
    );
  }

  /**
   * 创建用户 - 应用层处理时间字段
   */
  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResult<User>> {
    try {
      const now = new Date().toISOString();
      
      // 🎯 在应用层添加时间字段
      const userWithTimestamps = {
        ...userData,
        created_at: now,
        updated_at: now
      };

      const result = await this.create(userWithTimestamps);
      return ServiceResult.success(result);
    } catch (error) {
      return ServiceResult.error('Failed to create user', error);
    }
  }

  /**
   * 更新用户 - 自动更新 updated_at
   */
  async updateUser(id: number, userData: Partial<User>): Promise<ServiceResult<User>> {
    try {
      // 🎯 在应用层自动更新 updated_at
      const updateData = {
        ...userData,
        updated_at: new Date().toISOString()
      };

      const result = await this.update(id, updateData);
      return ServiceResult.success(result);
    } catch (error) {
      return ServiceResult.error('Failed to update user', error);
    }
  }

  /**
   * 批量创建 - 统一时间处理
   */
  async createUsers(usersData: Omit<User, 'id' | 'created_at' | 'updated_at'>[]): Promise<ServiceResult<User[]>> {
    try {
      const now = new Date().toISOString();
      
      // 🎯 批量添加时间字段
      const usersWithTimestamps = usersData.map(userData => ({
        ...userData,
        created_at: now,
        updated_at: now
      }));

      const results = await this.createMany(usersWithTimestamps);
      return ServiceResult.success(results);
    } catch (error) {
      return ServiceResult.error('Failed to create users', error);
    }
  }
}
```

### 3. **BaseRepository 增强支持**
```typescript
// 可以在 BaseRepository 中添加通用的时间处理方法
export abstract class BaseRepository<DB, TB extends keyof DB, T = any, CreateT = any, UpdateT = any> {
  
  /**
   * 添加时间戳的创建方法
   */
  protected async createWithTimestamps(data: CreateT): Promise<T> {
    const now = new Date().toISOString();
    
    const dataWithTimestamps = {
      ...data,
      ...(this.hasColumn('created_at') && { created_at: now }),
      ...(this.hasColumn('updated_at') && { updated_at: now })
    } as any;

    return this.create(dataWithTimestamps);
  }

  /**
   * 添加更新时间戳的更新方法
   */
  protected async updateWithTimestamps(id: any, data: UpdateT): Promise<T> {
    const updateData = {
      ...data,
      ...(this.hasColumn('updated_at') && { updated_at: new Date().toISOString() })
    } as any;

    return this.update(id, updateData);
  }

  /**
   * 检查表是否有指定列
   */
  private hasColumn(columnName: string): boolean {
    return this.tableSchema?.columns.some(col => col.name === columnName) || false;
  }
}
```

### 4. **Service 层的时间处理**
```typescript
export class UserService {
  constructor(private userRepository: UserRepository) {}

  /**
   * 创建用户 - Service 层也可以处理时间逻辑
   */
  async createUser(userData: CreateUserRequest): Promise<ServiceResult<User>> {
    // 🎯 可以在 Service 层添加业务相关的时间逻辑
    const userWithBusinessLogic = {
      ...userData,
      // 例如：根据用户时区调整时间
      timezone: userData.timezone || 'UTC',
      // 例如：设置试用期结束时间
      trial_ends_at: this.calculateTrialEndDate()
    };

    return this.userRepository.createUser(userWithBusinessLogic);
  }

  private calculateTrialEndDate(): string {
    const trialDays = 30;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + trialDays);
    return endDate.toISOString();
  }
}
```

## 🎯 **时间处理工具函数**

### **统一的时间工具类**
```typescript
export class TimeUtils {
  /**
   * 获取当前 UTC 时间的 ISO 字符串
   */
  static now(): string {
    return new Date().toISOString();
  }

  /**
   * 获取指定时区的当前时间
   */
  static nowInTimezone(timezone: string): string {
    return new Date().toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T') + 'Z';
  }

  /**
   * 格式化时间为数据库兼容格式
   */
  static formatForDatabase(date: Date): string {
    return date.toISOString();
  }

  /**
   * 添加时间到指定日期
   */
  static addDays(date: Date, days: number): string {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString();
  }

  /**
   * 获取日期范围的开始和结束时间
   */
  static getDayRange(date: Date): { start: string; end: string } {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }
}
```

### **Repository 中使用时间工具**
```typescript
export class UserRepository extends BaseRepository<Database, 'users'> {
  async createUser(userData: CreateUserData): Promise<ServiceResult<User>> {
    try {
      const userWithTimestamps = {
        ...userData,
        created_at: TimeUtils.now(),
        updated_at: TimeUtils.now(),
        // 业务逻辑：设置试用期
        trial_ends_at: TimeUtils.addDays(new Date(), 30)
      };

      const result = await this.create(userWithTimestamps);
      return ServiceResult.success(result);
    } catch (error) {
      return ServiceResult.error('Failed to create user', error);
    }
  }

  async findUsersByDateRange(startDate: Date, endDate: Date): Promise<User[]> {
    const startRange = TimeUtils.getDayRange(startDate);
    const endRange = TimeUtils.getDayRange(endDate);
    
    return this.findMany({
      where: (qb) => qb
        .where('created_at', '>=', startRange.start)
        .where('created_at', '<=', endRange.end)
    });
  }
}
```

## 📊 **优势对比**

| 方面 | 数据库默认值 | 应用层处理 |
|------|-------------|------------|
| **跨数据库兼容性** | ❌ 语法差异大 | ✅ 完全兼容 |
| **时区处理** | ❌ 复杂 | ✅ 灵活控制 |
| **业务逻辑** | ❌ 有限 | ✅ 完全控制 |
| **测试友好性** | ❌ 难以模拟 | ✅ 易于测试 |
| **调试能力** | ❌ 黑盒 | ✅ 透明可控 |
| **性能** | ✅ 略快 | ✅ 可接受 |

## 🔧 **实施建议**

### 1. **立即实施**
- 在所有新的 Schema 定义中避免时间默认值
- 在 Repository 的 create/update 方法中添加时间处理

### 2. **渐进迁移**
- 对于现有表，可以保留数据库默认值，但在应用层覆盖
- 逐步迁移到应用层时间处理

### 3. **团队规范**
- 建立时间处理的编码规范
- 使用统一的时间工具类
- 在代码审查中检查时间处理逻辑

## 🎉 **总结**

通过应用层时间处理，我们实现了：

1. **✅ 跨数据库兼容性**：统一的时间字符串格式
2. **✅ 业务逻辑控制**：灵活的时间计算和处理
3. **✅ 测试友好性**：可控的时间生成和模拟
4. **✅ 调试透明性**：清晰的时间处理逻辑
5. **✅ 维护简单性**：集中的时间处理工具

这种方法完全符合 Stratix 框架的跨数据库兼容性目标，同时提供了更好的开发体验和业务控制能力！
