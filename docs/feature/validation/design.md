# @stratix/validation 插件设计文档

## 1. 设计理念

`@stratix/validation` 插件设计遵循 Stratix 框架的核心设计理念，包括：

- **声明式**：通过配置而非命令式代码定义验证模式
- **纯函数**：使用纯函数式API，保持无副作用
- **可组合**：验证器可自由组合，创建复杂验证流程
- **类型安全**：完全支持TypeScript类型系统，实现静态类型检查
- **插件化**：与Stratix核心框架和其他插件无缝集成

## 2. 架构设计

### 2.1 整体架构

插件采用分层架构，主要包含以下几个部分：

1. **核心模块**：封装Zod基础功能，提供核心验证API
2. **Stratix集成层**：负责与Stratix框架集成，实现插件接口
3. **扩展模块**：提供额外的验证器和功能扩展
4. **插件集成模块**：与其他Stratix插件的集成

```
@stratix/validation
├── core/               // 核心验证功能
│   ├── schema.ts       // Schema定义和处理
│   ├── validators.ts   // 基础验证器
│   └── errors.ts       // 错误处理
├── integration/        // 与其他插件集成
│   ├── web.ts          // Web插件集成
│   └── database.ts     // 数据库插件集成
├── extensions/         // 功能扩展
│   ├── custom.ts       // 自定义验证器
│   └── transforms.ts   // 转换器
├── factory.ts          // 插件工厂
├── plugin.ts           // 插件定义
└── index.ts            // 主入口
```

### 2.2 核心组件

#### 2.2.1 插件实例

插件实例是`@stratix/validation`的主要入口点，提供所有验证相关功能：

```typescript
interface ValidationPlugin {
  // 核心验证函数
  string(): StringSchema;
  number(): NumberSchema;
  boolean(): BooleanSchema;
  date(): DateSchema;
  array(schema?: Schema): ArraySchema;
  object(shape?: Record<string, Schema>): ObjectSchema;
  enum(values: readonly [string, ...string[]]): EnumSchema;
  literal(value: any): LiteralSchema;
  union(schemas: Schema[]): UnionSchema;
  intersection(schemas: Schema[]): IntersectionSchema;
  
  // 工具方法
  create(zodSchema: any): Schema; // 从原始Zod创建
  validate<T>(schema: Schema, data: any): ValidationResult<T>;
  
  // 自定义验证器
  custom(validator: CustomValidator): CustomSchema;
  
  // 高级功能
  middleware(schema: Schema): MiddlewareFactory;
  transform(schema: Schema, fn: TransformFn): TransformedSchema;
}
```

#### 2.2.2 Schema定义

Schema是验证的核心，定义数据的结构和验证规则：

```typescript
interface Schema<T = any> {
  // 基本验证方法
  parse(data: any): T;
  safeParse(data: any): ValidationResult<T>;
  
  // 组合
  and<U>(schema: Schema<U>): Schema<T & U>;
  or<U>(schema: Schema<U>): Schema<T | U>;
  
  // 转换
  transform<U>(fn: (data: T) => U): Schema<U>;
  
  // 其他通用方法
  optional(): Schema<T | undefined>;
  nullable(): Schema<T | null>;
  nullish(): Schema<T | null | undefined>;
  default(value: T): Schema<T>;
  describe(description: string): Schema<T>;
}
```

#### 2.2.3 验证结果

定义统一的验证结果接口：

```typescript
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: ValidationError;
}

interface ValidationError {
  issues: ValidationIssue[];
  message: string;
  
  // 辅助方法
  flatten(): FlattenedError;
  format(): Record<string, string>;
}

interface ValidationIssue {
  code: string;
  message: string;
  path: (string | number)[];
}

interface FlattenedError {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
}
```

### 2.3 与框架集成

#### 2.3.1 插件定义

遵循Stratix插件规范：

```typescript
import { createApp, StratixPlugin } from 'stratix';
import { validationFactory } from './factory';

export interface ValidationPluginOptions {
  // 错误处理选项
  errorMap?: ErrorMapFn;
  defaultErrorMessages?: Record<string, string>;
  
  // 自定义验证器
  customValidators?: Record<string, CustomValidator>;
  
  // 集成选项
  fastifyIntegration?: boolean;
  webIntegration?: boolean;
  databaseIntegration?: boolean;
}

export const validationPlugin: StratixPlugin<ValidationPluginOptions> = {
  name: 'validation',
  dependencies: [],
  optionalDependencies: ['web', 'database'],
  register: async (app, options) => {
    // 创建验证实例
    const validation = validationFactory(options);
    
    // 添加装饰器
    app.decorate('validation', validation);
    
    // 与其他插件集成
    if (options.webIntegration !== false && app.hasPlugin('web')) {
      integrationWithWeb(app, validation, options);
    }
    
    if (options.databaseIntegration !== false && app.hasPlugin('database')) {
      integrationWithDatabase(app, validation, options);
    }
    
    // 注册生命周期钩子
    app.hook('beforeClose', async () => {
      // 清理工作...
    });
  },
  schema: {
    type: 'object',
    properties: {
      errorMap: { type: 'object' },
      defaultErrorMessages: { type: 'object' },
      customValidators: { type: 'object' },
      fastifyIntegration: { type: 'boolean' },
      webIntegration: { type: 'boolean' },
      databaseIntegration: { type: 'boolean' }
    }
  }
};
```

### 2.4 与其他插件集成

#### 2.4.1 Web插件集成

```typescript
function integrationWithWeb(app, validation, options) {
  const { web } = app;
  
  // 扩展路由定义，支持验证
  web.extendRouteDefinition((routeDef) => {
    if (routeDef.validate) {
      // 添加请求验证中间件
      const validator = createRequestValidator(validation, routeDef.validate);
      routeDef.preHandler = [].concat(validator, routeDef.preHandler || []);
    }
    return routeDef;
  });
  
  // 添加全局验证中间件工厂
  web.addDecorator('validateRequest', (schema) => {
    return createRequestValidator(validation, schema);
  });
}

// 请求验证中间件工厂
function createRequestValidator(validation, schema) {
  return async (request, reply) => {
    try {
      // 验证请求参数
      if (schema.params) {
        request.params = validation.object(schema.params).parse(request.params);
      }
      
      // 验证查询参数
      if (schema.query) {
        request.query = validation.object(schema.query).parse(request.query);
      }
      
      // 验证请求体
      if (schema.body) {
        request.body = validation.object(schema.body).parse(request.body);
      }
      
      // 验证请求头
      if (schema.headers) {
        // 只验证指定的头部
        const headers = {};
        const headerSchema = validation.object(schema.headers);
        for (const key in schema.headers) {
          headers[key] = request.headers[key];
        }
        headerSchema.parse(headers);
      }
    } catch (error) {
      // 处理验证错误
      reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation Error',
        validation: error.flatten()
      });
      throw error;
    }
  };
}
```

#### 2.4.2 数据库插件集成

```typescript
function integrationWithDatabase(app, validation, options) {
  const { database } = app;
  
  // 扩展模型定义
  database.extendModel((modelDef) => {
    if (modelDef.schema) {
      // 创建验证Schema
      const validationSchema = convertDbSchemaToValidation(validation, modelDef.schema);
      
      // 添加验证方法
      modelDef.validate = (data) => validationSchema.safeParse(data);
      
      // 添加钩子
      modelDef.hooks = modelDef.hooks || {};
      const originalBeforeCreate = modelDef.hooks.beforeCreate || (async (data) => data);
      
      modelDef.hooks.beforeCreate = async (data) => {
        // 在创建前验证
        const result = validationSchema.safeParse(data);
        if (!result.success) {
          throw new Error(`Validation Error: ${result.error.message}`);
        }
        
        // 调用原始钩子
        return originalBeforeCreate(result.data);
      };
    }
    
    return modelDef;
  });
}
```

## 3. 与Zod集成

### 3.1 Zod包装

插件核心是对Zod库的包装，提供符合Stratix风格的API：

```typescript
import * as z from 'zod';
import { Schema } from './types';

export function createZodWrapper(options) {
  return {
    string(): Schema<string> {
      return wrapZodSchema(z.string(), options);
    },
    
    number(): Schema<number> {
      return wrapZodSchema(z.number(), options);
    },
    
    boolean(): Schema<boolean> {
      return wrapZodSchema(z.boolean(), options);
    },
    
    // 包装其他Zod类型...
    
    // 从原始Zod创建
    create<T>(zodSchema: z.ZodType<T>): Schema<T> {
      return wrapZodSchema(zodSchema, options);
    }
  };
}

// 包装Zod Schema
function wrapZodSchema<T>(zodSchema: z.ZodType<T>, options): Schema<T> {
  // 实现Schema接口封装原始Zod方法
  // ...
}
```

### 3.2 错误处理和本地化

自定义错误处理和消息本地化：

```typescript
interface ErrorMapFn {
  (issue: z.ZodIssueCode, params: z.ErrorMapCtx): { message: string };
}

// 创建自定义错误映射
function createErrorMap(options: ValidationPluginOptions): ErrorMapFn {
  const defaultMessages = {
    invalid_type: '类型无效',
    required: '该字段是必填的',
    // 其他默认错误消息...
    ...options.defaultErrorMessages
  };
  
  return (issue, params) => {
    // 使用自定义错误映射或默认消息
    const message = options.errorMap?.(issue, params)?.message || 
      defaultMessages[issue] || 
      `验证错误: ${issue}`;
    
    return { message };
  };
}
```

## 4. 工具函数和实用工具

### 4.1 利用@stratix/utils

插件将利用`@stratix/utils`库的工具函数，特别是验证相关的工具：

```typescript
import { object, string, array, isObject, isString, isArray } from '@stratix/utils';

// 使用utils库中的对象操作函数
function mergeSchemas(schema1, schema2) {
  return object.merge(schema1, schema2);
}

// 使用utils库中的类型检查函数
function validateType(value, type) {
  switch (type) {
    case 'string': return isString(value);
    case 'object': return isObject(value);
    case 'array': return isArray(value);
    // ...其他类型
  }
}
```

## 5. 使用场景和示例

### 5.1 基本使用

```typescript
// 创建应用
const app = createApp();

// 注册验证插件
app.register(validationPlugin);

// 创建验证模式
const userSchema = app.validation.object({
  username: app.validation.string().min(3).max(20),
  email: app.validation.string().email(),
  age: app.validation.number().int().positive().optional(),
  role: app.validation.enum(['admin', 'user', 'guest']).default('user')
});

// 验证数据
function validateUser(data) {
  const result = userSchema.safeParse(data);
  
  if (result.success) {
    return result.data; // 验证通过，返回类型安全的数据
  } else {
    console.error('验证失败', result.error.format());
    throw new Error('用户数据无效');
  }
}
```

### 5.2 与Web插件集成

```typescript
// 创建应用
const app = createApp();

// 注册插件
app.register(validationPlugin);
app.register(webPlugin, {
  routes: {
    '/api/users': {
      post: {
        // 定义验证规则
        validate: {
          body: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 }
          },
          query: {
            includeProfile: { type: 'boolean', optional: true }
          }
        },
        handler: async (request, reply) => {
          // 此时request.body已经通过验证
          const { username, email, password } = request.body;
          // 处理创建用户...
          return { id: 1, username, email };
        }
      }
    }
  }
});
```

## 6. 插件实现路线图

### 6.1 第一阶段：基础功能

- 实现核心验证API
- 基本Zod集成
- 插件注册和初始化

### 6.2 第二阶段：集成功能

- Web插件集成
- 数据库插件集成
- 错误处理和本地化

### 6.3 第三阶段：高级功能

- 自定义验证器
- 复杂验证逻辑
- 性能优化

## 7. 技术风险和解决方案

### 7.1 依赖管理

**风险**：Zod库更新可能导致API不兼容。
**解决方案**：锁定依赖版本，建立集成测试确保兼容性。

### 7.2 性能考量

**风险**：复杂验证可能影响性能。
**解决方案**：
- 实现验证结果缓存
- 提供异步验证选项
- 懒加载Zod组件

### 7.3 类型安全

**风险**：TypeScript类型推断复杂度。
**解决方案**：确保完整的类型声明，并提供类型辅助函数。 