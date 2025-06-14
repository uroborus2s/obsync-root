# @stratix/was-v1

WPS开放平台V1版本API集成插件，基于Stratix框架开发，提供对WPS开放平台V1版本API的封装。

## 安装

```bash
npm install @stratix/was-v1
```

## 功能特性

- 支持WPS开放平台V1版本的API
- 自动处理company_token的获取和缓存
- 自动处理WPS3签名
- 类型安全的API调用
- 支持模块化API调用（认证、通讯录、文档、消息等）
- **支持API模块按需加载**，提高应用性能

## 使用方法

### 基本使用

```typescript
import { createApp } from '@stratix/core';
import wasV1Plugin from '@stratix/was-v1';

const app = createApp();

// 注册插件
app.register(wasV1Plugin, {
  appId: 'your-app-id',
  appKey: 'your-app-key'
  // 其他可选配置...
});

await app.start();

// 使用API
const departments = await app.wasV1.api.contact.getDepartments();
console.log('部门列表:', departments);
```

### 插件配置

```typescript
interface WasV1Options {
  // 基础配置
  appId: string;                // WPS应用ID（必填）
  appKey: string;               // WPS应用密钥（必填）
  baseUrl?: string;             // WPS API基础URL，默认为"https://openapi.wps.cn"
  
  // Token配置
  tokenCacheEnabled?: boolean;  // 是否启用token缓存，默认为true
  tokenCacheTTL?: number;       // token缓存有效期（毫秒），默认为1小时
  
  // 请求配置
  requestTimeout?: number;      // 请求超时时间（毫秒），默认为10000
  maxRetries?: number;          // 最大重试次数，默认为3
  retryDelay?: number;          // 重试延迟时间（毫秒），默认为1000
  
  // 日志配置
  logLevel?: 'debug' | 'info' | 'warn' | 'error'; // 日志级别，默认为'info'
  
  // API模块配置，支持选择性加载模块
  apiModules?: {
    auth?: boolean;    // 是否加载认证API模块，默认为true
    contact?: boolean; // 是否加载通讯录API模块，默认为true
    document?: boolean;// 是否加载文档API模块，默认为true
    message?: boolean; // 是否加载消息API模块，默认为true
  };
}
```

### API模块按需加载

插件支持按需加载API模块，减少不必要的资源消耗：

```typescript
// 仅加载认证和文档模块
app.register(wasV1Plugin, {
  appId: 'your-app-id',
  appKey: 'your-app-key',
  apiModules: {
    auth: true,     // 加载认证模块
    document: true, // 加载文档模块
    contact: false, // 不加载通讯录模块
    message: false  // 不加载消息模块
  }
});

// 使用已加载的模块
const documents = await app.wasV1.api.document.getDocumentList();

// 未加载的模块无法使用，以下代码将抛出错误
// const departments = await app.wasV1.api.contact.getDepartments();
```

## API示例

### 认证API

```typescript
// 获取用户token
const tokenResult = await app.wasV1.api.auth.getUserToken('authorization_code');

// 刷新用户token
const refreshResult = await app.wasV1.api.auth.refreshUserToken('refresh_token');

// 获取用户信息
const userInfo = await app.wasV1.api.auth.getUserInfo('access_token');
```

### 通讯录API

```typescript
// 获取部门列表
const departments = await app.wasV1.api.contact.getDepartments();

// 获取部门详情
const department = await app.wasV1.api.contact.getDepartment('department_id');

// 创建部门
const createResult = await app.wasV1.api.contact.createDepartment({
  name: '测试部门',
  parentid: 'parent_department_id'
});

// 获取用户列表
const users = await app.wasV1.api.contact.getUsers();

// 获取用户详情
const user = await app.wasV1.api.contact.getUser('user_id');
```

### 文档API

```typescript
// 获取文档列表
const documents = await app.wasV1.api.document.getDocuments({
  parent_id: 'folder_id'
});

// 创建文件夹
const folder = await app.wasV1.api.document.createFolder({
  name: '测试文件夹',
  parent_id: 'parent_folder_id'
});

// 获取下载链接
const downloadUrl = await app.wasV1.api.document.getDownloadUrl('file_id');
```

### 消息API

```typescript
// 发送文本消息
const messageResult = await app.wasV1.api.message.sendTextMessage({
  chat_id: 'chat_id',
  content: '测试消息'
});

// 创建会话
const chatResult = await app.wasV1.api.message.createChat({
  name: '测试会话',
  user_ids: ['user1', 'user2'],
  chat_type: 'group'
});

// 获取会话消息列表
const messages = await app.wasV1.api.message.getMessages('chat_id');
```

## 高级功能

### 自定义请求

如果提供的API不能满足需求，可以使用底层请求方法：

```typescript
// 自定义API请求
const result = await app.wasV1.request({
  method: 'GET',
  url: '/custom/api/path',
  params: { key: 'value' }
});
```

### 清除Token缓存

```typescript
// 清除特定应用的token缓存
app.wasV1.token.clearCache('app_id');

// 清除所有token缓存
app.wasV1.token.clearCache();
```

## 依赖

- @stratix/core: Stratix核心框架
- @stratix/utils: Stratix工具库
- axios: HTTP请求库
- zod: 数据验证库

## 许可证

MIT 