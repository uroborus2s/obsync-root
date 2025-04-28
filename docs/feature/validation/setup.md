# @stratix/validation 安装与配置

本文档介绍如何安装和配置 `@stratix/validation` 插件。

## 1. 安装

### 1.1 通过包管理器安装

使用npm:

```bash
npm install @stratix/validation zod
```

使用pnpm:

```bash
pnpm add @stratix/validation zod
```

使用yarn:

```bash
yarn add @stratix/validation zod
```

### 1.2 包依赖

- `zod` - 核心验证库
- `@stratix/utils` - Stratix工具库

## 2. 基本配置

### 2.1 注册插件

在Stratix应用中注册validation插件：

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';

const app = createApp();

// 注册插件（无配置）
app.register(validationPlugin);

// 或者使用配置选项
app.register(validationPlugin, {
  // 插件配置选项
  defaultErrorMessages: {
    invalid_type: '类型无效',
    required: '该字段不能为空'
  }
});

// 启动应用
await app.start();
```

### 2.2 配置选项

validation插件支持以下配置选项：

```typescript
interface ValidationPluginOptions {
  // 错误处理选项
  errorMap?: ErrorMapFn;                            // 自定义错误映射函数
  defaultErrorMessages?: Record<string, string>;    // 默认错误消息
  
  // 集成选项
  fastifyIntegration?: boolean;                     // 是否与Fastify集成（默认：true）
  webIntegration?: boolean;                         // 是否与Web插件集成（默认：true）
  databaseIntegration?: boolean;                    // 是否与数据库插件集成（默认：true）
  
  // 自定义验证器
  customValidators?: Record<string, CustomValidator>; // 自定义验证器
  
  // Zod选项
  zodOptions?: ZodOptions;                          // 传递给Zod的选项
}
```

## 3. 高级配置

### 3.1 自定义错误消息

```typescript
app.register(validationPlugin, {
  defaultErrorMessages: {
    invalid_type: '字段类型不正确',
    required: '此字段为必填项',
    invalid_string: '无效的字符串',
    too_small: '值太小',
    too_big: '值太大',
    invalid_enum_value: '无效的枚举值',
    invalid_email: '无效的电子邮件格式',
    invalid_date: '无效的日期格式'
    // 更多错误类型...
  }
});
```

### 3.2 自定义错误映射

```typescript
import { z } from 'zod';

app.register(validationPlugin, {
  errorMap: (issue, ctx) => {
    // 获取字段路径
    const path = ctx.path.join('.');
    
    // 根据错误类型和路径自定义消息
    if (issue === z.ZodIssueCode.invalid_type) {
      if (ctx.data === undefined) {
        return { message: `${path || '值'} 不能为空` };
      }
      return { message: `${path || '值'} 应为 ${ctx.expected} 类型` };
    }
    
    // 邮箱格式错误
    if (issue === z.ZodIssueCode.invalid_string && ctx.validation === 'email') {
      return { message: `${path || '电子邮件'} 格式不正确` };
    }
    
    // 枚举值错误
    if (issue === z.ZodIssueCode.invalid_enum_value) {
      return { 
        message: `${path || '值'} 必须是以下值之一: ${ctx.options.join(', ')}` 
      };
    }
    
    // 使用默认错误消息
    return { message: ctx.defaultError };
  }
});
```

### 3.3 与其他插件集成配置

```typescript
app.register(validationPlugin, {
  // 控制与其他插件的集成
  webIntegration: true,     // 与Web插件集成
  databaseIntegration: true // 与数据库插件集成
});
```

### 3.4 自定义验证器

```typescript
app.register(validationPlugin, {
  customValidators: {
    // 自定义中国大陆手机号验证器
    isChinaPhoneNumber: (value, ctx) => {
      const pattern = /^1[3-9]\d{9}$/;
      return pattern.test(value) || ctx.addIssue({
        code: 'custom',
        message: '无效的中国大陆手机号'
      });
    },
    
    // 自定义密码强度验证器
    isStrongPassword: (value, ctx) => {
      const hasLower = /[a-z]/.test(value);
      const hasUpper = /[A-Z]/.test(value);
      const hasNumber = /\d/.test(value);
      const hasSpecial = /[!@#$%^&*]/.test(value);
      
      const isStrong = hasLower && hasUpper && hasNumber && hasSpecial;
      
      return isStrong || ctx.addIssue({
        code: 'custom',
        message: '密码必须包含大小写字母、数字和特殊字符'
      });
    }
  }
});
```

## 4. 环境变量配置

validation插件支持通过环境变量进行配置：

```
# 错误消息语言
STRATIX_VALIDATION_LOCALE=zh-CN

# 是否启用与Web插件集成
STRATIX_VALIDATION_WEB_INTEGRATION=true

# 是否启用与数据库插件集成  
STRATIX_VALIDATION_DB_INTEGRATION=true
```

## 5. 配置最佳实践

### 5.1 推荐配置

```typescript
app.register(validationPlugin, {
  // 默认中文错误消息
  defaultErrorMessages: {
    invalid_type: '字段类型不正确',
    required: '此字段为必填项',
    invalid_string: '无效的字符串',
    too_small: '值太小',
    too_big: '值太大',
    invalid_enum_value: '无效的枚举值',
    invalid_email: '无效的电子邮件格式',
    invalid_date: '无效的日期格式'
  },
  
  // 启用所有集成
  webIntegration: true,
  databaseIntegration: true,
  fastifyIntegration: true,
  
  // 自定义常用验证器
  customValidators: {
    isChinaPhoneNumber: (value, ctx) => {
      const pattern = /^1[3-9]\d{9}$/;
      return pattern.test(value) || ctx.addIssue({
        code: 'custom',
        message: '无效的中国大陆手机号'
      });
    }
  }
});
```

### 5.2 按环境配置

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';

const app = createApp();

// 根据环境配置验证插件
app.register(validationPlugin, {
  // 开发环境下更详细的错误信息
  defaultErrorMessages: process.env.NODE_ENV === 'development' 
    ? {
        invalid_type: '字段 "${path}" 类型应为 ${expected}，但收到了 ${received}',
        required: '字段 "${path}" 不能为空',
        // 更多详细错误消息...
      }
    : {
        // 生产环境下更简洁的错误消息
        invalid_type: '类型错误',
        required: '必填项',
        // 更多简洁错误消息...
      }
});
```

## 6. 配置示例

### 6.1 基本Web应用配置

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';
import { webPlugin } from '@stratix/web';

const app = createApp();

// 注册插件
app.register(validationPlugin, {
  defaultErrorMessages: {
    invalid_type: '类型无效',
    required: '必填项',
    invalid_string: '无效的字符串',
    invalid_email: '无效的电子邮件'
  }
});

app.register(webPlugin, {
  port: 3000,
  routes: {
    '/api/users': {
      post: {
        // 使用验证插件进行请求验证
        validate: {
          body: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
            age: { type: 'number', optional: true }
          }
        },
        handler: async (request, reply) => {
          // 处理验证通过的请求...
          return { success: true };
        }
      }
    }
  }
});

// 启动应用
app.start().catch(console.error);
```

### 6.2 与数据库集成配置

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';
import { databasePlugin } from '@stratix/database';

const app = createApp();

// 注册验证插件
app.register(validationPlugin);

// 注册数据库插件
app.register(databasePlugin, {
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'my_database'
  },
  models: {
    users: {
      // 模型验证Schema，会被validation插件处理
      schema: {
        id: { type: 'string', uuid: true },
        username: { type: 'string', minLength: 3, maxLength: 20 },
        email: { type: 'string', format: 'email' },
        created_at: { type: 'date' }
      }
    }
  }
});

// 启动应用
app.start().catch(console.error);
``` 