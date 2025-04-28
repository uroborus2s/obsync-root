# @stratix/validation 基本使用

本文档介绍 `@stratix/validation` 插件的基本使用方法和常见场景。

## 1. 基础验证

### 1.1 创建基本验证器

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';

const app = createApp();
app.register(validationPlugin);

// 现在可以使用app.validation创建验证器
const schema = app.validation.object({
  name: app.validation.string().min(2).max(50),
  age: app.validation.number().int().positive(),
  email: app.validation.string().email(),
  isActive: app.validation.boolean().default(true)
});
```

### 1.2 验证数据

```typescript
// 使用parse方法（验证失败会抛出异常）
try {
  const validData = schema.parse({
    name: 'John',
    age: 30,
    email: 'john@example.com'
  });
  
  console.log('验证通过', validData);
  // 输出: { name: 'John', age: 30, email: 'john@example.com', isActive: true }
} catch (error) {
  console.error('验证失败', error.format());
}

// 使用safeParse方法（不会抛出异常）
const result = schema.safeParse({
  name: 'J', // 太短，不满足最小长度要求
  age: 30.5, // 不是整数
  email: 'invalid-email'
});

if (result.success) {
  console.log('验证通过', result.data);
} else {
  console.error('验证失败', result.error.format());
  // 输出包含具体错误信息的对象
}
```

## 2. 基础数据类型验证

### 2.1 字符串验证

```typescript
// 字符串验证
const stringSchema = app.validation.string()
  .min(3, '至少需要3个字符')  // 最小长度
  .max(50, '最多允许50个字符') // 最大长度
  .email('请输入有效的电子邮件地址'); // 电子邮件格式

// 更多字符串验证方法
const moreStringValidation = app.validation.string()
  .url() // URL格式
  .uuid() // UUID格式
  .regex(/^[A-Z]+$/, '只能包含大写字母') // 正则表达式
  .startsWith('https://', '必须以https://开头') // 前缀
  .endsWith('.com', '必须以.com结尾') // 后缀
  .trim() // 去除首尾空格
  .toLowerCase() // 转小写
  .toUpperCase(); // 转大写
```

### 2.2 数字验证

```typescript
// 数字验证
const numberSchema = app.validation.number()
  .int('必须是整数') // 整数
  .positive('必须是正数') // 正数
  .min(1, '最小值为1') // 最小值
  .max(100, '最大值为100'); // 最大值

// 更多数字验证
const moreNumberValidation = app.validation.number()
  .negative() // 负数
  .nonpositive() // 非正数
  .nonnegative() // 非负数
  .multipleOf(5) // 5的倍数
  .safe() // 安全整数范围
  .step(0.1); // 步长
```

### 2.3 布尔值验证

```typescript
// 布尔值验证
const booleanSchema = app.validation.boolean()
  .default(false); // 默认值

// 严格布尔值（只接受true/false）
const strictBooleanSchema = app.validation.boolean()
  .strict(); // 不进行类型转换
```

### 2.4 日期验证

```typescript
// 日期验证
const dateSchema = app.validation.date()
  .min(new Date('2023-01-01'), '日期必须在2023年之后') // 最小日期
  .max(new Date(), '日期不能晚于今天'); // 最大日期

// 更多日期验证
const moreDateValidation = app.validation.date()
  .min(new Date('2023-01-01'))
  .max(new Date())
  .transform(date => date.toISOString()); // 转换为ISO字符串
```

## 3. 复合类型验证

### 3.1 对象验证

```typescript
// 对象验证
const userSchema = app.validation.object({
  id: app.validation.string().uuid(),
  name: app.validation.string().min(2),
  email: app.validation.string().email(),
  age: app.validation.number().int().positive().optional(),
  address: app.validation.object({
    street: app.validation.string(),
    city: app.validation.string(),
    zipCode: app.validation.string().regex(/^\d{5}$/)
  }).optional()
});

// 对象操作
const partialUserSchema = userSchema.partial(); // 所有字段变为可选
const requiredUserSchema = userSchema.required(); // 所有字段变为必填
const pickedUserSchema = userSchema.pick(['id', 'name']); // 只保留指定字段
const omittedUserSchema = userSchema.omit(['address']); // 排除指定字段
```

### 3.2 数组验证

```typescript
// 数组验证
const stringArraySchema = app.validation.array(app.validation.string())
  .min(1, '至少需要1个项目') // 最小长度
  .max(10, '最多允许10个项目'); // 最大长度

// 对象数组
const userArraySchema = app.validation.array(userSchema)
  .nonempty('数组不能为空');

// 数组操作
const transformedArraySchema = stringArraySchema
  .transform(arr => arr.map(item => item.toUpperCase()));
```

### 3.3 枚举验证

```typescript
// 枚举验证
const roleSchema = app.validation.enum(['admin', 'user', 'guest'])
  .default('user');

// 或从现有枚举创建
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

const enumRoleSchema = app.validation.nativeEnum(UserRole);
```

### 3.4 联合类型和交叉类型

```typescript
// 联合类型（或）
const idSchema = app.validation.union([
  app.validation.string().uuid(),
  app.validation.number().int().positive()
]);

// 交叉类型（与）
const baseUserSchema = app.validation.object({
  id: app.validation.string().uuid(),
  createdAt: app.validation.date()
});

const detailsSchema = app.validation.object({
  name: app.validation.string(),
  email: app.validation.string().email()
});

// 组合两个对象schema
const fullUserSchema = app.validation.intersection(
  baseUserSchema, 
  detailsSchema
);
```

## 4. 高级验证功能

### 4.1 可选值和默认值

```typescript
// 可选字段
const optionalSchema = app.validation.object({
  required: app.validation.string(),
  optional: app.validation.string().optional(), // 等同于.or(undefined)
  nullable: app.validation.string().nullable(), // 等同于.or(null)
  nullish: app.validation.string().nullish()    // 等同于.or(null).or(undefined)
});

// 默认值
const defaultSchema = app.validation.object({
  name: app.validation.string().default('匿名'),
  role: app.validation.enum(['admin', 'user']).default('user'),
  timestamp: app.validation.date().default(() => new Date())
});
```

### 4.2 自定义验证和转换

```typescript
// 自定义验证
const customSchema = app.validation.string().refine(
  value => value.length % 2 === 0,
  { message: '字符串长度必须是偶数' }
);

// 使用superRefine进行更复杂的验证
const passwordSchema = app.validation.string().superRefine((value, ctx) => {
  if (value.length < 8) {
    ctx.addIssue({
      code: 'too_small',
      minimum: 8,
      message: '密码至少需要8个字符'
    });
  }
  
  if (!/[A-Z]/.test(value)) {
    ctx.addIssue({
      code: 'custom',
      message: '密码必须包含至少一个大写字母'
    });
  }
  
  if (!/\d/.test(value)) {
    ctx.addIssue({
      code: 'custom',
      message: '密码必须包含至少一个数字'
    });
  }
});

// 数据转换
const transformSchema = app.validation.string()
  .transform(value => value.toUpperCase());

// 链式转换
const multiTransformSchema = app.validation.string()
  .trim()
  .toLowerCase()
  .transform(value => `prefix_${value}`)
  .transform(value => value.replace(/\s+/g, '_'));
```

### 4.3 异步验证

```typescript
// 异步验证
const asyncSchema = app.validation.string().refine(
  async value => {
    // 模拟数据库查询
    const result = await checkUsernameExists(value);
    return !result; // 用户名不存在时验证通过
  },
  { message: '用户名已存在' }
);

// 使用异步验证
async function validateUsername(username) {
  try {
    await asyncSchema.parseAsync(username);
    return { valid: true };
  } catch (error) {
    return { valid: false, errors: error.format() };
  }
}
```

## 5. 与Web插件集成

### 5.1 请求验证

```typescript
// 添加路由时进行请求验证
app.register(require('@stratix/web'), {
  routes: {
    '/api/users': {
      post: {
        // 请求验证配置
        validate: {
          body: {
            username: app.validation.string().min(3).max(20),
            email: app.validation.string().email(),
            password: app.validation.string().min(8)
          },
          query: {
            includeDetails: app.validation.boolean().optional()
          },
          params: {},
          headers: {
            'content-type': app.validation.string()
          }
        },
        handler: async (request, reply) => {
          // 此时request.body已经通过验证并转换类型
          const { username, email, password } = request.body;
          // 业务逻辑...
          return { success: true };
        }
      }
    }
  }
});
```

### 5.2 响应验证

```typescript
// 添加响应验证
app.register(require('@stratix/web'), {
  routes: {
    '/api/users/:id': {
      get: {
        validate: {
          params: {
            id: app.validation.string().uuid()
          },
          response: {
            200: app.validation.object({
              id: app.validation.string().uuid(),
              username: app.validation.string(),
              email: app.validation.string().email(),
              createdAt: app.validation.string().datetime()
            })
          }
        },
        handler: async (request, reply) => {
          const user = await getUserById(request.params.id);
          return user;
        }
      }
    }
  }
});
```

## 6. 与数据库插件集成

```typescript
// 定义模型验证规则
app.register(require('@stratix/database'), {
  // 数据库配置...
  models: {
    users: {
      // 数据验证schema
      schema: {
        id: app.validation.string().uuid(),
        username: app.validation.string().min(3).max(20),
        email: app.validation.string().email(),
        password: app.validation.string(),
        role: app.validation.enum(['admin', 'user', 'guest']).default('user'),
        createdAt: app.validation.date().default(() => new Date())
      },
      // 模型配置
      // ...
    }
  }
});

// 使用模型
async function createUser(userData) {
  // 数据在创建前会自动进行验证
  return await app.db.models.users.create(userData);
}
```

## 7. 错误处理

### 7.1 错误格式化

```typescript
// 当验证失败时
try {
  const data = schema.parse(invalidData);
} catch (error) {
  // 获取原始错误对象
  console.error(error.errors);
  
  // 格式化为易读的对象
  const formatted = error.format();
  console.error(formatted);
  
  // 格式化为平面错误消息数组
  const flatErrors = error.flatten();
  console.error(flatErrors.formErrors);  // 顶级错误
  console.error(flatErrors.fieldErrors); // 字段级错误
}
```

### 7.2 自定义错误处理

```typescript
// 在Web应用中使用自定义错误处理
app.register(require('@stratix/web'), {
  // ...
  hooks: {
    onError: async (request, reply, error) => {
      // 检查是否为验证错误
      if (error.name === 'ZodError') {
        // 自定义错误响应格式
        return reply.code(400).send({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: '请求数据验证失败',
          errors: error.flatten().fieldErrors,
          timestamp: new Date().toISOString()
        });
      }
      
      // 其他错误交给默认处理器
      return false;
    }
  }
});
```

## 8. 性能优化

```typescript
// 预编译常用schema
const precompiledSchemas = {
  user: app.validation.object({
    // 用户schema定义...
  }),
  product: app.validation.object({
    // 产品schema定义...
  }),
  // 其他常用schema...
};

// 在应用中复用预编译的schema
function validateUserData(data) {
  return precompiledSchemas.user.safeParse(data);
}
``` 