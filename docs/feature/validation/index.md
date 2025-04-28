# @stratix/validation 数据验证插件

基于Zod实现的Stratix框架数据验证插件，提供声明式、类型安全的数据验证能力。

## 文档目录

- [设计概述](./design.md) - 插件设计理念和架构
- [安装与配置](./setup.md) - 安装步骤和基本配置
- [基本使用](./basic-usage.md) - 基础使用案例和示例
- [高级特性](./advanced.md) - 高级用法和自定义功能
- [API参考](./api.md) - 详细API文档
- [与其他插件集成](./integration.md) - 与Web、数据库等插件集成

## 插件概述

`@stratix/validation` 是Stratix框架的数据验证插件，基于Zod验证库实现。它提供了声明式配置、类型安全和高度可扩展的验证功能，主要特性包括：

- 基于配置的验证模式定义
- 类型推断和类型安全
- 与Stratix框架和其他插件无缝集成
- 支持自定义验证器和转换器
- 扩展Zod基础功能，提供更多便捷特性

## 快速开始

```typescript
import { createApp } from 'stratix';
import { validationPlugin } from '@stratix/validation';

const app = createApp();

// 注册验证插件
app.register(validationPlugin, {
  // 插件配置选项
});

// 使用验证
const schema = app.validation.object({
  name: app.validation.string().min(3),
  email: app.validation.string().email(),
  age: app.validation.number().positive().int()
});

// 验证数据
const result = schema.safeParse({
  name: 'John',
  email: 'john@example.com',
  age: 30
});

if (result.success) {
  console.log('验证通过', result.data);
} else {
  console.log('验证失败', result.error);
}
``` 