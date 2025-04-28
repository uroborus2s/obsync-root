# WPS开放平台API插件文档

## 概述

本目录包含基于Stratix框架开发的WPS开放平台API插件的详细设计文档。这些插件旨在简化与WPS开放平台API的集成，提供类型安全、易于使用的接口。

WPS开放平台提供了V1和V7两个版本的API，为了支持这两个版本，我们设计了两个独立的插件：`waiV1`和`waiV7`，它们可以并存使用。

## 文档列表

- [WPS开放平台API集成详细设计](./wps-api-integration.md) - 整体架构和通用设计
- [WPS开放平台V1版本API实现设计](./wps-api-v1-implementation.md) - V1版本插件的详细实现
- [WPS开放平台V7版本API实现设计](./wps-api-v7-implementation.md) - V7版本插件的详细实现

## 插件概述

### waiV1 - WPS API Integration V1

用于集成WPS开放平台V1版本的API，支持基础的通讯录、云文档、消息等功能。

### waiV7 - WPS API Integration V7

用于集成WPS开放平台V7版本的API，支持更丰富的功能，如多维表格、审批流等。

## 快速开始

### 安装

```bash
# 安装V1版本插件
npm install @stratix/waiV1

# 安装V7版本插件
npm install @stratix/waiV7
```

### 基本使用

```typescript
import { createApp } from '@stratix/core';
import waiV1Plugin from '@stratix/waiV1';
import waiV7Plugin from '@stratix/waiV7';

const app = createApp();

// 注册V1插件
app.register(waiV1Plugin, {
  appId: 'your-app-id-v1',
  appKey: 'your-app-key-v1'
});

// 注册V7插件
app.register(waiV7Plugin, {
  appId: 'your-app-id-v7',
  appKey: 'your-app-key-v7'
});

await app.start();

// 使用V1 API
const departments = await app.waiV1.contact.getDepartments();

// 使用V7 API
const users = await app.waiV7.contact.getUsers();
```

## 关键特性

- WPS3签名自动处理
- company_token自动获取与缓存
- 基于zod的请求和响应数据验证
- 请求自动重试
- 详细的错误处理和日志记录
- 类型安全的API接口

## 版本差异

V1和V7版本的主要区别：

- **分页参数**：V1使用page_number，V7使用page_token
- **字段命名**：V7版本更一致地使用下划线命名法
- **功能支持**：V7版本支持更多高级功能

详细的API文档和使用示例请参考各个具体文档。 