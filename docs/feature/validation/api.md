# @stratix/validation API参考

本文档提供`@stratix/validation`插件的完整API参考。

## 1. 插件API

### 1.1 插件注册

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';

// 插件注册
app.register(validationPlugin, options);
```

**参数：**

- `options: ValidationPluginOptions` - 插件配置选项（可选）

**ValidationPluginOptions接口：**

```typescript
interface ValidationPluginOptions {
  // 错误处理选项
  errorMap?: ErrorMapFn;                            // 自定义错误映射函数
  defaultErrorMessages?: Record<string, string>;    // 默认错误消息映射
  
  // 集成选项
  fastifyIntegration?: boolean;                     // 是否与Fastify集成（默认：true）
  webIntegration?: boolean;                         // 是否与Web插件集成（默认：true）
  databaseIntegration?: boolean;                    // 是否与数据库插件集成（默认：true）
  
  // 自定义验证器
  customValidators?: Record<string, CustomValidator>; // 自定义验证器
  
  // Zod选项
  zodOptions?: ZodOptions;                          // 传递给Zod的选项
}

// 错误映射函数
type ErrorMapFn = (
  issue: string, 
  ctx: { 
    path: (string | number)[];
    defaultError: string;
    data: any;
    [key: string]: any;
  }
) => { message: string };

// 自定义验证器
type CustomValidator = (
  value: any, 
  ctx: ValidationContext,
  params?: any
) => boolean;

// 验证上下文
interface ValidationContext {
  path: (string | number)[];
  addIssue: (issue: ValidationIssue) => void;
  data: any;
}

// 验证问题
interface ValidationIssue {
  code: string;
  message: string;
  path?: (string | number)[];
  [key: string]: any;
}
```

### 1.2 核心API

插件注册后会向应用实例添加`validation`属性，提供以下API：

```typescript
// 验证API
interface ValidationPlugin {
  // 基本类型验证器
  string(): StringSchema;                           // 字符串验证
  number(): NumberSchema;                           // 数字验证
  boolean(): BooleanSchema;                         // 布尔值验证
  date(): DateSchema;                               // 日期验证
  
  // 复合类型验证器
  array(schema?: Schema): ArraySchema;              // 数组验证
  object(shape?: Record<string, Schema>): ObjectSchema; // 对象验证
  record(valueSchema: Schema): RecordSchema;        // 记录验证
  
  // 高级类型验证器
  enum(values: readonly [string, ...string[]]): EnumSchema; // 枚举验证
  nativeEnum(enumObj: object): EnumSchema;          // 原生枚举验证
  literal(value: any): LiteralSchema;               // 字面量验证
  union(schemas: Schema[]): UnionSchema;            // 联合类型验证
  intersection(schemas: Schema[]): IntersectionSchema; // 交叉类型验证
  
  // 特殊类型验证器
  any(): AnySchema;                                 // 任意类型验证
  null(): NullSchema;                               // null验证
  undefined(): UndefinedSchema;                     // undefined验证
  void(): VoidSchema;                               // void验证
  unknown(): UnknownSchema;                         // 未知类型验证
  
  // 工具方法
  create(zodSchema: any): Schema;                   // 从原始Zod创建
  validate<T>(schema: Schema, data: any): ValidationResult<T>; // 验证数据
  
  // 自定义验证器
  custom(validator: CustomValidator): CustomSchema;  // 自定义验证

  // 高级功能
  middleware(schema: Schema): MiddlewareFactory;    // 创建中间件
  transform(schema: Schema, fn: TransformFn): TransformedSchema; // 数据转换
  refine(schema: Schema, refinement: RefinementFn, options?: RefinementOptions): RefinedSchema; // 细化验证
}

// 验证结果
interface ValidationResult<T> {
  success: boolean;                                 // 是否验证成功
  data?: T;                                         // 验证通过的数据
  error?: ValidationError;                          // 验证错误
}

// 验证错误
interface ValidationError {
  issues: ValidationIssue[];                        // 错误问题列表
  message: string;                                  // 错误消息
  
  // 辅助方法
  flatten(): FlattenedError;                        // 展平错误
  format(): Record<string, string>;                 // 格式化错误
}

// 展平的错误
interface FlattenedError {
  formErrors: string[];                             // 表单级错误
  fieldErrors: Record<string, string[]>;            // 字段级错误
}
```

## 2. Schema API

所有Schema类型共享以下基础API：

### 2.1 基础Schema接口

```typescript
interface Schema<T = any> {
  // 基本验证方法
  parse(data: any): T;                              // 验证并返回数据（失败抛出异常）
  safeParse(data: any): ValidationResult<T>;        // 安全验证（不抛出异常）
  parseAsync(data: any): Promise<T>;                // 异步验证（失败抛出异常）
  safeParseAsync(data: any): Promise<ValidationResult<T>>; // 异步安全验证
  
  // 组合方法
  and<U>(schema: Schema<U>): Schema<T & U>;         // 与操作
  or<U>(schema: Schema<U>): Schema<T | U>;          // 或操作
  pipe<U>(schema: Schema<U>): Schema<U>;            // 管道操作
  
  // 转换方法
  transform<U>(fn: (data: T) => U): Schema<U>;      // 数据转换
  transformAsync<U>(fn: (data: T) => Promise<U>): Schema<U>; // 异步数据转换
  
  // 验证修饰方法
  refine(check: (data: T) => boolean, message?: string | { message: string }): Schema<T>; // 细化验证
  superRefine(refinement: SuperRefinementFn<T>): Schema<T>; // 高级细化验证
  
  // 可选性
  optional(): Schema<T | undefined>;                // 可选（允许undefined）
  nullable(): Schema<T | null>;                     // 可空（允许null）
  nullish(): Schema<T | null | undefined>;          // 可空或可选
  
  // 默认值
  default(value: T): Schema<T>;                     // 设置默认值
  default(value: () => T): Schema<T>;               // 使用函数设置默认值
  
  // 描述
  describe(description: string): Schema<T>;         // 添加描述
  
  // 品牌类型
  brand<B extends string>(brand: B): Schema<T & { __brand: B }>; // 添加品牌类型
  
  // 捕获
  catch(value: T): Schema<T>;                       // 捕获并返回默认值
  catch(value: () => T): Schema<T>;                 // 使用函数返回默认值
  
  // 工具方法
  isOptional(): boolean;                            // 检查是否可选
  isNullable(): boolean;                            // 检查是否可空
}
```

### 2.2 字符串Schema

```typescript
interface StringSchema extends Schema<string> {
  // 长度验证
  min(length: number, message?: string): StringSchema; // 最小长度
  max(length: number, message?: string): StringSchema; // 最大长度
  length(length: number, message?: string): StringSchema; // 精确长度
  
  // 格式验证
  email(message?: string): StringSchema;            // 电子邮件格式
  url(message?: string): StringSchema;              // URL格式
  uuid(message?: string): StringSchema;             // UUID格式
  regex(pattern: RegExp, message?: string): StringSchema; // 正则表达式匹配
  
  // 值验证
  startsWith(value: string, message?: string): StringSchema; // 以指定值开头
  endsWith(value: string, message?: string): StringSchema; // 以指定值结尾
  includes(value: string, message?: string): StringSchema; // 包含指定值
  
  // 日期和时间验证
  datetime(options?: { offset?: boolean, precision?: number }): StringSchema; // ISO日期时间格式
  date(): StringSchema;                             // 日期格式
  time(): StringSchema;                             // 时间格式
  
  // 字符串操作
  trim(): StringSchema;                             // 去除首尾空格
  toLowerCase(): StringSchema;                      // 转小写
  toUpperCase(): StringSchema;                      // 转大写
  
  // 自定义验证
  custom(name: string, params?: any): StringSchema; // 使用自定义验证器
}
```

### 2.3 数字Schema

```typescript
interface NumberSchema extends Schema<number> {
  // 范围验证
  min(value: number, message?: string): NumberSchema; // 最小值
  max(value: number, message?: string): NumberSchema; // 最大值
  
  // 类型验证
  int(message?: string): NumberSchema;              // 整数
  positive(message?: string): NumberSchema;         // 正数
  negative(message?: string): NumberSchema;         // 负数
  nonpositive(message?: string): NumberSchema;      // 非正数
  nonnegative(message?: string): NumberSchema;      // 非负数
  
  // 其他验证
  multipleOf(value: number, message?: string): NumberSchema; // 倍数
  finite(message?: string): NumberSchema;           // 有限数
  safe(message?: string): NumberSchema;             // 安全整数范围
  
  // 格式化
  step(step: number): NumberSchema;                 // 设置步长
  round(method: 'ceil' | 'floor' | 'trunc' | 'round'): NumberSchema; // 四舍五入
  
  // 自定义验证
  custom(name: string, params?: any): NumberSchema; // 使用自定义验证器
}
```

### 2.4 布尔Schema

```typescript
interface BooleanSchema extends Schema<boolean> {
  // 严格模式
  strict(message?: string): BooleanSchema;          // 仅接受true/false
  
  // 自定义验证
  custom(name: string, params?: any): BooleanSchema; // 使用自定义验证器
}
```

### 2.5 日期Schema

```typescript
interface DateSchema extends Schema<Date> {
  // 范围验证
  min(date: Date, message?: string): DateSchema;    // 最早日期
  max(date: Date, message?: string): DateSchema;    // 最晚日期
  
  // 自定义验证
  custom(name: string, params?: any): DateSchema;   // 使用自定义验证器
}
```

### 2.6 数组Schema

```typescript
interface ArraySchema<T = any> extends Schema<T[]> {
  // 长度验证
  min(length: number, message?: string): ArraySchema<T>; // 最小长度
  max(length: number, message?: string): ArraySchema<T>; // 最大长度
  length(length: number, message?: string): ArraySchema<T>; // 精确长度
  nonempty(message?: string): ArraySchema<T>;       // 非空数组
  
  // 元素验证
  element(schema: Schema<T>): ArraySchema<T>;       // 设置元素Schema
  
  // 数组操作
  sort(): ArraySchema<T>;                           // 排序
  unique(keyOrMapper?: (item: T) => any): ArraySchema<T>; // 去重
  
  // 自定义验证
  custom(name: string, params?: any): ArraySchema<T>; // 使用自定义验证器
}
```

### 2.7 对象Schema

```typescript
interface ObjectSchema<T = any> extends Schema<T> {
  // 字段验证
  shape<S extends Record<string, Schema>>(shape: S): ObjectSchema<T & { [K in keyof S]: S[K] extends Schema<infer U> ? U : never }>; // 设置形状
  extend<S extends Record<string, Schema>>(shape: S): ObjectSchema<T & { [K in keyof S]: S[K] extends Schema<infer U> ? U : never }>; // 扩展形状
  
  // 字段修饰
  pick<K extends keyof T>(keys: readonly K[]): ObjectSchema<Pick<T, K>>; // 选择字段
  omit<K extends keyof T>(keys: readonly K[]): ObjectSchema<Omit<T, K>>; // 排除字段
  partial(): ObjectSchema<Partial<T>>;              // 所有字段变为可选
  deepPartial(): ObjectSchema<DeepPartial<T>>;      // 深度可选
  required(): ObjectSchema<Required<T>>;            // 所有字段变为必填
  
  // 额外字段
  strict(message?: string): ObjectSchema<T>;        // 严格模式，不允许额外字段
  strip(): ObjectSchema<T>;                         // 剥离未定义字段
  passthrough(): ObjectSchema<T>;                   // 传递未定义字段
  
  // 自定义验证
  custom(name: string, params?: any): ObjectSchema<T>; // 使用自定义验证器
  
  // 高级验证
  refine(
    check: (data: T) => boolean, 
    message?: string | { message: string, path?: (string | number)[] }
  ): ObjectSchema<T>;                                // 对象细化验证
}
```

### 2.8 联合和交叉Schema

```typescript
interface UnionSchema<T = any> extends Schema<T> {
  // 自定义验证
  custom(name: string, params?: any): UnionSchema<T>; // 使用自定义验证器
}

interface IntersectionSchema<T = any> extends Schema<T> {
  // 自定义验证
  custom(name: string, params?: any): IntersectionSchema<T>; // 使用自定义验证器
}
```

### 2.9 枚举Schema

```typescript
interface EnumSchema<T = any> extends Schema<T> {
  // 默认值
  default(value: T): EnumSchema<T>;                 // 设置默认值
  
  // 自定义验证
  custom(name: string, params?: any): EnumSchema<T>; // 使用自定义验证器
}
```

## 3. 中间件API

### 3.1 Web中间件

```typescript
// Web中间件工厂
interface WebValidationMiddleware {
  // 请求验证中间件
  body<T>(schema: Schema<T>): FastifyMiddleware;           // 请求体验证
  query<T>(schema: Schema<T>): FastifyMiddleware;          // 查询参数验证
  params<T>(schema: Schema<T>): FastifyMiddleware;         // 路径参数验证
  headers<T>(schema: Schema<T>): FastifyMiddleware;        // 请求头验证
  
  // 组合验证
  request<B = any, Q = any, P = any, H = any>(options: {
    body?: Schema<B>;
    query?: Schema<Q>;
    params?: Schema<P>;
    headers?: Schema<H>;
  }): FastifyMiddleware;
}

// 中间件类型
type FastifyMiddleware = (request: any, reply: any, next?: Function) => Promise<void> | void;
```

### 3.2 路由验证配置

```typescript
// 路由验证配置接口
interface RouteValidationConfig {
  body?: Schema<any> | Record<string, any>;         // 请求体验证
  query?: Schema<any> | Record<string, any>;        // 查询参数验证
  params?: Schema<any> | Record<string, any>;       // 路径参数验证
  headers?: Schema<any> | Record<string, any>;      // 请求头验证
  response?: {                                      // 响应验证
    [statusCode: number | string]: Schema<any>;
  };
}
```

## 4. 辅助工具API

### 4.1 Schema转换工具

```typescript
interface SchemaConverter {
  // 转换JSON Schema为验证Schema
  fromJsonSchema(jsonSchema: any): Schema;
  
  // 转换验证Schema为JSON Schema
  toJsonSchema(schema: Schema): any;
  
  // 从TypeScript类型定义生成Schema
  fromType<T>(): Schema<T>;
  
  // 生成TypeScript类型定义
  toTypeString(schema: Schema): string;
}
```

### 4.2 错误处理工具

```typescript
interface ErrorFormatter {
  // 格式化验证错误
  format(error: ValidationError): any;
  
  // 本地化错误消息
  localize(error: ValidationError, locale: string): ValidationError;
  
  // 创建自定义错误格式化器
  create(formatFn: (error: ValidationError) => any): ErrorFormatter;
}
```

## 5. 集成API

### 5.1 Web插件集成

```typescript
interface WebIntegration {
  // 路由验证
  validateRoute(route: any, options: ValidationPluginOptions): any;
  
  // 中间件工厂
  createMiddleware(app: any): WebValidationMiddleware;
  
  // 响应验证
  validateResponse(schema: Schema, data: any): any;
}
```

### 5.2 数据库插件集成

```typescript
interface DatabaseIntegration {
  // 模型验证
  validateModel(model: any, options: ValidationPluginOptions): any;
  
  // 从数据库模型生成Schema
  schemaFromModel(model: any): Schema;
  
  // 数据验证钩子
  createHooks(model: any, schema: Schema): any;
}
```

## 6. 类型定义

```typescript
// 深度部分类型
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

// 高级细化函数
type SuperRefinementFn<T> = (
  value: T,
  context: {
    path: (string | number)[];
    addIssue: (issue: ValidationIssue) => void;
    data: any;
  }
) => void;

// 转换函数
type TransformFn<T, U> = (value: T) => U;

// 异步转换函数
type AsyncTransformFn<T, U> = (value: T) => Promise<U>;
``` 