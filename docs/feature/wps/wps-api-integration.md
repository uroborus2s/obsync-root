# WPS开放平台API集成详细设计

## 1. 概述

本文档描述了基于Stratix框架开发WPS开放平台API插件的详细设计方案。该插件旨在提供对WPS开放平台API的封装，简化开发人员与WPS开放平台的交互过程。

### 1.1 背景

WPS开放平台提供了丰富的API接口，允许第三方应用与WPS云文档、消息、会话等功能进行集成。由于WPS开放平台同时维护了V1和V7两个版本的API，且在实际应用中可能同时使用两个版本的API，因此需要设计两个独立但具有一致接口风格的插件来支持这两个版本。

### 1.2 目标

- 开发两个独立的Stratix插件，分别支持WPS开放平台V1和V7版本的API
- 提供简洁、一致的接口风格，方便开发人员使用
- 确保请求中包含WPS3签名校验
- 支持获取和管理company_token
- 使用zod进行数据校验
- 利用axios进行HTTP请求
- 使用@stratix/utils库提供的功能函数
- 使用Stratix框架的日志对象记录日志

## 2. 插件命名与结构

### 2.1 插件命名

为了清晰地区分WPS开放平台API的两个版本，同时保持命名简洁，我们将两个插件命名为：

1. **waiV1** - WPS API Integration V1：用于集成WPS开放平台V1版本的API
2. **waiV7** - WPS API Integration V7：用于集成WPS开放平台V7版本的API

### 2.2 目录结构

插件的基本目录结构如下（以waiV1为例，waiV7结构类似）：

```
packages/waiV1/
├── src/
│   ├── index.ts                  # 插件入口
│   ├── types/                    # 类型定义
│   │   ├── index.ts              # 类型导出
│   │   ├── config.ts             # 配置类型
│   │   ├── request.ts            # 请求相关类型
│   │   └── response.ts           # 响应相关类型
│   ├── schemas/                  # Zod验证模式
│   │   ├── index.ts              # 模式导出
│   │   ├── config.ts             # 配置验证
│   │   ├── request.ts            # 请求验证
│   │   └── response.ts           # 响应验证
│   ├── services/                 # 服务实现
│   │   ├── auth.ts               # 认证相关
│   │   ├── signature.ts          # WPS3签名实现
│   │   ├── request.ts            # 请求封装
│   │   ├── token.ts              # token管理
│   │   └── api/                  # API实现
│   │       ├── index.ts          # API导出
│   │       ├── auth.ts           # 认证API
│   │       ├── contact.ts        # 通讯录API
│   │       ├── document.ts       # 云文档API
│   │       ├── message.ts        # 消息API
│   │       └── ... 其他API
│   └── utils/                    # 工具函数
│       ├── index.ts              # 工具导出
│       ├── logger.ts             # 日志工具
│       └── helper.ts             # 辅助函数
├── package.json                  # 包信息
├── tsconfig.json                 # TypeScript配置
└── README.md                     # 说明文档
```

## 3. 架构设计

### 3.1 整体架构

插件采用分层架构设计：

1. **配置层**：处理插件配置和验证
2. **服务层**：封装核心功能，如签名、请求、Token管理等
3. **API层**：针对WPS开放平台的各个服务提供特定的API封装
4. **工具层**：提供通用工具和辅助函数

### 3.2 插件注册与初始化

插件遵循Stratix框架的插件设计规范，通过register函数进行注册：

```typescript
const waiV1Plugin: StratixPlugin<WaiV1Options> = {
  name: 'waiV1',
  dependencies: ['core'], // 依赖核心插件
  optionalDependencies: ['logger'], // 可选依赖日志插件
  
  register: async (app, options) => {
    // 验证配置
    const config = validateConfig(options);
    
    // 创建WPS客户端
    const client = createWpsClient(app, config);
    
    // 注册钩子
    app.hook('beforeClose', async () => {
      // 清理资源
    });
    
    // 添加装饰器
    app.decorate('waiV1', client);
  },
  
  // 配置验证模式
  schema: waiV1ConfigSchema
};
```

### 3.3 与Stratix框架集成

插件将与Stratix框架紧密集成：

1. **获取日志实例**：通过app.logger获取日志对象，如果可用
2. **使用钩子系统**：利用框架的生命周期钩子管理资源
3. **装饰器模式**：将WPS客户端作为装饰器添加到app实例

## 4. 核心功能设计

### 4.1 插件配置

插件的配置选项包括：

```typescript
interface WaiV1Options {
  // 基础配置
  appId: string;                // WPS应用ID
  appKey: string;               // WPS应用密钥
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
}
```

### 4.2 WPS3签名实现

WPS3签名是WPS开放平台API调用的安全验证机制，我们使用@stratix/utils/crypto中的功能来实现：

```typescript
import { createHash } from '@stratix/utils/crypto';
import { formatRFC1123 } from '@stratix/utils/time';

/**
 * 生成WPS3签名
 * @param appKey 应用密钥
 * @param contentMd5 内容MD5值，GET请求使用URI的MD5，POST请求使用Body的MD5
 * @param url 不带域名的URL，包含URI和查询参数
 * @param contentType Content-Type，一般为'application/json'
 * @param date RFC1123格式的日期
 * @returns 签名字符串
 */
export function generateWPS3Signature(
  appKey: string,
  contentMd5: string,
  url: string,
  contentType: string,
  date: string
): string {
  // 按照WPS3签名规则拼接字符串
  const signString = appKey + contentMd5 + url + contentType + date;
  
  // 使用SHA1算法计算签名
  const signature = createHash('sha1').update(signString).digest('hex');
  
  return signature;
}

/**
 * 生成WPS3 X-Auth头
 * @param appId 应用ID
 * @param signature 签名字符串
 * @returns X-Auth头值
 */
export function generateWPS3Auth(appId: string, signature: string): string {
  return `WPS-3:${appId}:${signature}`;
}

/**
 * 计算内容MD5
 * @param data 请求数据
 * @param method HTTP方法
 * @param url 请求URL（不带域名）
 * @returns MD5哈希值（十六进制）
 */
export function calculateContentMd5(
  data: any,
  method: string,
  url: string
): string {
  if (method.toUpperCase() === 'GET') {
    // GET请求使用URL的MD5
    return createHash('md5').update(url).digest('hex');
  } else {
    // POST/PUT/DELETE等请求使用Body的MD5
    const jsonData = data ? JSON.stringify(data) : '';
    return createHash('md5').update(jsonData).digest('hex');
  }
}

/**
 * 生成WPS3请求头
 * @param appId 应用ID
 * @param appKey 应用密钥
 * @param method HTTP方法
 * @param url 请求URL（不带域名）
 * @param data 请求数据
 * @returns 包含WPS3签名的请求头
 */
export function generateWPS3Headers(
  appId: string,
  appKey: string,
  method: string,
  url: string,
  data?: any
): Record<string, string> {
  // 设置Content-Type
  const contentType = 'application/json';
  
  // 生成RFC1123格式的日期
  const date = formatRFC1123(new Date());
  
  // 计算Content-MD5
  const contentMd5 = calculateContentMd5(data, method, url);
  
  // 生成签名
  const signature = generateWPS3Signature(
    appKey,
    contentMd5,
    url,
    contentType,
    date
  );
  
  // 生成X-Auth头
  const xAuth = generateWPS3Auth(appId, signature);
  
  // 返回完整请求头
  return {
    'Content-Type': contentType,
    'Content-Md5': contentMd5,
    'Date': date,
    'X-Auth': xAuth
  };
}
```

### 4.3 API请求封装

采用axios进行HTTP请求，并进行统一封装：

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { z } from 'zod';
import { generateWPS3Headers } from './signature';
import { getCompanyToken } from './token';
import { WaiV1RequestError } from '../types';

/**
 * 创建WPS API请求客户端
 */
export function createWpsApiClient(app: any, config: WaiV1Options): AxiosInstance {
  // 获取日志对象
  const logger = app.hasPlugin('logger') ? app.logger : console;
  
  // 创建axios实例
  const axiosInstance = axios.create({
    baseURL: config.baseUrl || 'https://openapi.wps.cn',
    timeout: config.requestTimeout || 10000,
    headers: {
      'Accept': 'application/json'
    }
  });
  
  // 请求拦截器：添加WPS3签名和company_token
  axiosInstance.interceptors.request.use(async (reqConfig) => {
    try {
      // 获取请求URL（不带域名）
      const url = reqConfig.url || '';
      
      // 获取请求方法
      const method = reqConfig.method?.toUpperCase() || 'GET';
      
      // 获取请求数据
      const data = reqConfig.data;
      
      // 生成WPS3签名头
      const headers = generateWPS3Headers(
        config.appId,
        config.appKey,
        method,
        url,
        data
      );
      
      // 获取company_token
      const companyToken = await getCompanyToken(app, config);
      
      // 添加company_token到请求参数
      if (method === 'GET') {
        // GET请求添加到URL参数
        reqConfig.params = {
          ...reqConfig.params,
          company_token: companyToken
        };
      } else {
        // POST/PUT等请求添加到请求体
        reqConfig.data = {
          ...reqConfig.data,
          company_token: companyToken
        };
      }
      
      // 合并请求头
      reqConfig.headers = { ...reqConfig.headers, ...headers };
      
      // 记录请求日志
      logger.debug(`WPS API请求: ${method} ${url}`, {
        headers: reqConfig.headers,
        params: reqConfig.params,
        data: reqConfig.data
      });
      
      return reqConfig;
    } catch (error) {
      logger.error('WPS API请求拦截器错误', error);
      return Promise.reject(error);
    }
  });
  
  // 响应拦截器：处理错误和响应格式化
  axiosInstance.interceptors.response.use(
    (response) => {
      // 记录响应日志
      logger.debug(`WPS API响应: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
      
      return response;
    },
    (error) => {
      // 记录错误日志
      logger.error('WPS API请求错误', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // 构造错误对象
      const requestError: WaiV1RequestError = {
        message: error.message,
        status: error.response?.status,
        code: error.response?.data?.code,
        data: error.response?.data
      };
      
      return Promise.reject(requestError);
    }
  );
  
  return axiosInstance;
}

/**
 * 发送请求并验证响应数据
 * @param client Axios客户端实例
 * @param config 请求配置
 * @param schema 响应数据验证Schema
 * @returns 验证后的响应数据
 */
export async function sendRequest<T>(
  client: AxiosInstance,
  config: AxiosRequestConfig,
  schema?: z.ZodType<T>
): Promise<T> {
  try {
    // 发送请求
    const response: AxiosResponse = await client(config);
    
    // 如果提供了schema，验证响应数据
    if (schema) {
      return schema.parse(response.data);
    }
    
    return response.data;
  } catch (error) {
    if ((error as Error).name === 'ZodError') {
      // Zod验证错误
      throw new Error(`响应数据验证失败: ${(error as Error).message}`);
    }
    
    // 其他错误
    throw error;
  }
}
```

### 4.4 Token管理

实现company_token的获取和缓存：

```typescript
import { z } from 'zod';
import { createCache } from '@stratix/utils/cache';
import { WaiV1Options } from '../types';

// 定义token响应的schema
const companyTokenResponseSchema = z.object({
  company_token: z.string(),
  expires_in: z.number().optional()
});

// 缓存实例
let tokenCache: Map<string, { token: string, expires: number }> | null = null;

/**
 * 初始化token缓存
 */
export function initTokenCache(options: WaiV1Options): void {
  if (options.tokenCacheEnabled !== false) {
    tokenCache = new Map();
  }
}

/**
 * 从缓存获取token
 * @param appId 应用ID
 * @returns 缓存的token或null
 */
function getTokenFromCache(appId: string): string | null {
  if (!tokenCache) return null;
  
  const cached = tokenCache.get(appId);
  if (!cached) return null;
  
  // 检查token是否过期
  if (cached.expires < Date.now()) {
    tokenCache.delete(appId);
    return null;
  }
  
  return cached.token;
}

/**
 * 将token存入缓存
 * @param appId 应用ID
 * @param token token值
 * @param ttl 过期时间（毫秒）
 */
function setTokenToCache(appId: string, token: string, ttl: number): void {
  if (!tokenCache) return;
  
  const expires = Date.now() + ttl;
  tokenCache.set(appId, { token, expires });
}

/**
 * 获取company_token
 * @param app Stratix应用实例
 * @param options 插件配置
 * @returns company_token
 */
export async function getCompanyToken(app: any, options: WaiV1Options): Promise<string> {
  const logger = app.hasPlugin('logger') ? app.logger : console;
  
  // 尝试从缓存获取token
  const cachedToken = getTokenFromCache(options.appId);
  if (cachedToken) {
    logger.debug('从缓存获取company_token成功');
    return cachedToken;
  }
  
  logger.debug('开始获取company_token');
  
  try {
    // 创建请求客户端（不带company_token的简化版客户端）
    const axios = require('axios');
    const { generateWPS3Headers } = require('./signature');
    
    // 设置请求URL和参数
    const url = `/oauthapi/v3/inner/company/token`;
    const queryParams = { app_id: options.appId };
    const fullUrl = `${options.baseUrl || 'https://openapi.wps.cn'}${url}?app_id=${options.appId}`;
    
    // 生成WPS3签名头
    const headers = generateWPS3Headers(
      options.appId,
      options.appKey,
      'GET',
      `${url}?app_id=${options.appId}`
    );
    
    // 发送请求
    const response = await axios.get(fullUrl, { headers });
    
    // 验证响应数据
    const result = companyTokenResponseSchema.parse(response.data);
    
    // 获取token和过期时间
    const token = result.company_token;
    const ttl = (result.expires_in || 3600) * 1000; // 转换为毫秒
    
    // 缓存token
    if (options.tokenCacheEnabled !== false) {
      setTokenToCache(options.appId, token, options.tokenCacheTTL || ttl);
    }
    
    logger.debug('获取company_token成功');
    
    return token;
  } catch (error) {
    logger.error('获取company_token失败', error);
    throw new Error(`获取company_token失败: ${(error as Error).message}`);
  }
}

/**
 * 清除token缓存
 * @param appId 应用ID，不提供则清除所有缓存
 */
export function clearTokenCache(appId?: string): void {
  if (!tokenCache) return;
  
  if (appId) {
    tokenCache.delete(appId);
  } else {
    tokenCache.clear();
  }
}
```

## 5. API模块设计

### 5.1 API模块结构

API模块采用分类组织，根据WPS开放平台的功能进行划分：

1. **认证API**：处理认证相关功能
2. **通讯录API**：处理组织和用户相关功能
3. **云文档API**：处理文档相关功能
4. **消息API**：处理消息相关功能
5. **会话API**：处理会话相关功能
6. **待办API**：处理待办相关功能
7. **日历API**：处理日历相关功能
8. **应用API**：处理应用相关功能

### 5.2 API模块实现示例

以认证API为例：

```typescript
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { sendRequest } from '../request';

// 认证响应Schema
const authResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  user_id: z.string().optional()
});

/**
 * 认证API模块
 */
export function createAuthApi(client: AxiosInstance) {
  return {
    /**
     * 获取用户的access_token
     * @param code 授权码
     * @returns 认证结果
     */
    async getUserToken(code: string) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/oauthapi/v3/user/token',
          data: { code }
        },
        authResponseSchema
      );
    },
    
    /**
     * 刷新用户的access_token
     * @param refreshToken 刷新令牌
     * @returns 新的认证结果
     */
    async refreshUserToken(refreshToken: string) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/oauthapi/v3/user/token/refresh',
          data: { refresh_token: refreshToken }
        },
        authResponseSchema
      );
    },
    
    /**
     * 获取用户信息
     * @param accessToken 用户的access_token
     * @returns 用户信息
     */
    async getUserInfo(accessToken: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/oauthapi/v3/user/info',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
    }
  };
}
```

## 6. 数据验证

### 6.1 配置验证

使用zod进行配置验证：

```typescript
import { z } from 'zod';
import { WaiV1Options } from '../types';

// 定义配置Schema
export const waiV1ConfigSchema = z.object({
  // 必填项
  appId: z.string().min(1, '应用ID不能为空'),
  appKey: z.string().min(1, '应用密钥不能为空'),
  
  // 可选项
  baseUrl: z.string().url().optional(),
  tokenCacheEnabled: z.boolean().optional(),
  tokenCacheTTL: z.number().positive().optional(),
  requestTimeout: z.number().positive().optional(),
  maxRetries: z.number().min(0).optional(),
  retryDelay: z.number().positive().optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional()
});

/**
 * 验证插件配置
 * @param options 配置选项
 * @returns 验证后的配置
 */
export function validateConfig(options: WaiV1Options): WaiV1Options {
  return waiV1ConfigSchema.parse(options);
}
```

### 6.2 请求验证

为不同的API定义请求Schema：

```typescript
import { z } from 'zod';

// 通用分页参数Schema
export const paginationSchema = z.object({
  page_size: z.number().positive().optional(),
  page_token: z.string().optional()
});

// 创建部门请求Schema
export const createDepartmentSchema = z.object({
  name: z.string().min(1, '部门名称不能为空'),
  parent_id: z.string().optional(),
  order: z.number().optional(),
  department_id: z.string().optional()
});

// 查询用户请求Schema
export const queryUserSchema = z.object({
  user_id: z.string().optional(),
  email: z.string().email().optional(),
  mobile: z.string().optional()
}).refine(data => data.user_id || data.email || data.mobile, {
  message: '用户ID、邮箱或手机号至少提供一个'
});
```

### 6.3 响应验证

为不同的API定义响应Schema：

```typescript
import { z } from 'zod';

// 通用分页响应Schema
export const paginationResponseSchema = z.object({
  page_token: z.string().optional(),
  has_more: z.boolean().optional()
});

// 部门信息Schema
export const departmentSchema = z.object({
  department_id: z.string(),
  name: z.string(),
  parent_id: z.string().optional(),
  order: z.number().optional(),
  create_time: z.number().optional(),
  update_time: z.number().optional()
});

// 用户信息Schema
export const userSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  mobile: z.string().optional(),
  departments: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']).optional()
});
```

## 7. 使用示例

### 7.1 插件注册

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

// 启动应用
await app.start();
```

### 7.2 API使用

```typescript
// 使用V1 API
const waiV1 = app.waiV1;

// 获取部门列表
const departments = await waiV1.contact.getDepartments({ parent_id: 'root' });

// 获取用户信息
const user = await waiV1.contact.getUser({ user_id: 'user123' });

// 使用V7 API
const waiV7 = app.waiV7;

// 发送消息
const result = await waiV7.message.sendMessage({
  chat_id: 'chat123',
  msg_type: 'text',
  content: { text: '测试消息' }
});
```

## 8. 插件对比与兼容性

### 8.1 插件版本区别

| 特性 | waiV1 | waiV7 |
|------|-------|-------|
| API版本 | WPS开放平台V1 | WPS开放平台V7 |
| 基础URL | https://openapi.wps.cn | https://openapi.wps.cn |
| 签名算法 | WPS3 | WPS3 |
| 主要API类别 | 通讯录、云文档、消息等 | 通讯录、云文档、消息等（结构可能不同） |
| 适用场景 | V1版本API需求 | V7版本API需求 |

### 8.2 插件并存

两个插件可以在同一个应用中并存使用，彼此互不干扰。开发人员可以根据需要选择使用适合的API版本。

例如，在同一个应用中使用两个版本的API：

```typescript
// 获取V1版本部门列表
const v1Departments = await app.waiV1.contact.getDepartments();

// 获取V7版本部门列表
const v7Departments = await app.waiV7.contact.getDepartments();
```

## 9. 测试策略

### 9.1 单元测试

为核心功能编写单元测试：

1. **签名测试**：测试WPS3签名算法的正确性
2. **配置验证测试**：测试配置验证逻辑
3. **Token管理测试**：测试Token获取和缓存逻辑

### 9.2 集成测试

测试与WPS开放平台的实际交互：

1. **认证测试**：测试获取company_token
2. **API调用测试**：测试各API的调用是否正常

## 10. 部署与发布

### 10.1 包发布

将插件发布为npm包：

```
packages/waiV1 -> @stratix/waiV1
packages/waiV7 -> @stratix/waiV7
```

### 10.2 文档发布

生成API文档并发布：

1. **API参考文档**：详细的API使用说明
2. **示例代码**：常见场景的示例代码
3. **最佳实践**：使用插件的最佳实践指南

## 11. 结论

本文档详细设计了基于Stratix框架的WPS开放平台API插件，包括waiV1和waiV7两个版本。这两个插件将大大简化开发人员与WPS开放平台的交互过程，提供类型安全、易于使用的API接口。插件的设计遵循Stratix框架的函数式编程思想和插件设计规范，并与框架紧密集成。 