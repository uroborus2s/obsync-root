# TSDoc注释指南

## 简介

本指南提供了在项目中编写TSDoc注释的规范和最佳实践。良好的API文档有助于提高代码可维护性和可读性，同时为使用者提供清晰的使用指导。

## TSDoc基本格式

TSDoc注释以`/**`开始，以`*/`结束。每一行注释通常以`*`开头。

```typescript
/**
 * 函数的简要描述，通常一句话概括功能
 *
 * 这里是详细描述，可以包含多行文本，解释函数的用途、工作原理等
 *
 * @param name - 参数描述
 * @returns 返回值描述
 */
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

## 常用标签

以下是TSDoc中常用的标签：

| 标签 | 用途 |
|------|------|
| `@param` | 描述函数参数 |
| `@returns` | 描述函数返回值 |
| `@throws` | 描述可能抛出的错误 |
| `@example` | 提供使用示例 |
| `@remarks` | 提供额外注释或详细说明 |
| `@public` | 表示这是公共API |
| `@internal` | 表示这是内部实现 |
| `@deprecated` | 表示已废弃，通常需要说明替代方案 |
| `@beta` | 表示这是beta阶段的API |
| `@typeParam` | 描述泛型类型参数 |

## 格式化规则

### 参数描述

参数描述应该使用连字符分隔参数名和描述：

```typescript
/**
 * @param name - 用户名
 */
```

### 代码示例

使用三个反引号包围代码示例：

```typescript
/**
 * @example
 * ```typescript
 * const result = add(1, 2); // 返回3
 * ```
 */
```

### 特殊字符转义

在TSDoc注释中，某些字符需要转义以避免解析错误：

- `@` 字符：使用 `\@`
- `{` 和 `}` 字符：使用 `\{` 和 `\}`
- `<` 和 `>` 字符：使用 `&lt;` 和 `&gt;`

例如：

```typescript
/**
 * 发送邮件给用户
 * 
 * @param email - 邮件地址，例如 user\@example.com
 * @returns 包含 \{ success: true \} 的对象
 */
```

## 文档生成与自定义渲染器

本项目使用Microsoft API Extractor和API Documenter生成API文档。为了自动处理某些常见的TSDoc问题，我们实现了自定义渲染器。

### 自定义渲染器功能

我们的自定义渲染器(`scripts/custom-renderer.js`)可以自动处理以下问题：

1. 在代码块中转义HTML特殊字符
2. 修复TSDoc常见的转义问题（如@字符、花括号等）
3. 修复表格格式问题
4. 修复空链接和标题过长问题
5. 添加Docusaurus兼容的前言

### 使用自定义渲染器

文档生成命令已配置为自动使用自定义渲染器：

```bash
pnpm docs:generate
```

这将生成带有自动修复的API文档。

### 最佳实践

虽然自定义渲染器可以处理许多常见问题，但我们仍然建议在源代码中直接编写符合规范的TSDoc注释，而不是依赖后期修复。这样可以：

1. 保持源代码的一致性和可读性
2. 确保IDE中的文档提示正确显示
3. 避免文档生成过程中可能的信息丢失

## 示例

### 函数文档

```typescript
/**
 * 计算两个数的和
 *
 * @param a - 第一个加数
 * @param b - 第二个加数
 * @returns 两数之和
 * @throws `TypeError` 如果参数不是数字类型
 * @example
 * ```typescript
 * add(1, 2); // 返回 3
 * ```
 * @public
 */
export function add(a: number, b: number): number {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('参数必须是数字');
  }
  return a + b;
}
```

### 接口文档

```typescript
/**
 * 用户信息接口
 *
 * @public
 */
export interface User {
  /**
   * 用户ID
   */
  id: string;
  
  /**
   * 用户名
   */
  name: string;
  
  /**
   * 电子邮件地址
   */
  email: string;
  
  /**
   * 用户角色
   * @defaultValue 'user'
   */
  role?: 'admin' | 'user';
}
```

### 类文档

```typescript
/**
 * 缓存管理器类
 *
 * @remarks
 * 提供内存缓存功能，支持设置过期时间和最大缓存条目数
 *
 * @public
 */
export class CacheManager<T> {
  /**
   * 创建缓存管理器实例
   *
   * @param maxSize - 最大缓存条目数
   * @param defaultTTL - 默认缓存有效期（毫秒）
   */
  constructor(maxSize: number, defaultTTL: number) {
    // ...
  }
  
  /**
   * 设置缓存项
   *
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttl - 可选的缓存有效期，覆盖默认值
   * @returns 是否成功设置
   */
  set(key: string, value: T, ttl?: number): boolean {
    // ...
    return true;
  }
}
```

## 检查TSDoc问题

运行以下命令检查项目中的TSDoc问题：

```bash
pnpm docs:check-tsdoc
```

这将显示所有检测到的TSDoc问题和修复建议。 