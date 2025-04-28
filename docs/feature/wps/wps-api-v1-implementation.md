# WPS开放平台V1版本API实现设计

## 1. 概述

本文档描述了基于Stratix框架开发的WPS开放平台V1版本API插件(`waiV1`)的详细实现设计。该插件专门用于集成WPS开放平台V1版本的API，提供简洁、类型安全的接口。

### 1.1 背景

WPS开放平台V1版本API是WPS开放平台较早推出的API版本，支持基础的通讯录、云文档、消息等功能。虽然WPS已推出V7版本API，但许多现有系统仍在使用V1版本，因此需要单独开发V1版本的插件。

### 1.2 与V7版本的关系

`waiV1`插件与`waiV7`插件保持相同的架构和接口风格，但针对V1版本的API进行了专门适配。这两个插件可以在同一个应用中并存使用，相互独立。

## 2. 实现细节

### 2.1 类型定义

```typescript
// src/types/config.ts
export interface WaiV1Options {
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

// src/types/request.ts
export interface WaiV1RequestError {
  message: string;
  status?: number;
  code?: string | number;
  data?: any;
}

// src/types/response.ts
export interface WaiV1PaginationParams {
  page_size?: number;
  page_number?: number; // V1版本使用page_number，而不是V7中的page_token
}

export interface WaiV1PaginationResponse {
  total_count: number;
  page_size: number;
  page_number: number;
}
```

### 2.2 Schema验证

```typescript
// src/schemas/config.ts
import { z } from 'zod';

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

// src/schemas/response.ts - 例子：部门和用户Schema
export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentid: z.string().optional(),
  order: z.number().optional(),
  createtime: z.number().optional(),
  updatetime: z.number().optional()
});

export const userSchema = z.object({
  userid: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  mobile: z.string().optional(),
  departments: z.array(
    z.object({
      department_id: z.string(),
      is_leader: z.boolean().optional()
    })
  ).optional(),
  status: z.number().optional()
});
```

### 2.3 Token管理实现

```typescript
// src/services/token.ts
import { z } from 'zod';
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
 */
function setTokenToCache(appId: string, token: string, ttl: number): void {
  if (!tokenCache) return;
  
  const expires = Date.now() + ttl;
  tokenCache.set(appId, { token, expires });
}

/**
 * 获取company_token
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
    // 创建请求客户端
    const axios = require('axios');
    const { generateWPS3Headers } = require('./signature');
    
    // V1版本获取token的路径
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
```

### 2.4 API接口实现

以通讯录API为例：

```typescript
// src/services/api/contact.ts
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { sendRequest } from '../request';
import { 
  departmentSchema, 
  userSchema, 
  paginationResponseSchema 
} from '../../schemas/response';
import { WaiV1PaginationParams } from '../../types';

/**
 * 创建通讯录API
 */
export function createContactApi(client: AxiosInstance) {
  return {
    /**
     * 获取部门列表
     */
    async getDepartments(params?: { parentid?: string } & WaiV1PaginationParams) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/api/v1/departments',
          params
        },
        z.object({
          departments: z.array(departmentSchema),
          ...paginationResponseSchema.shape
        })
      );
    },
    
    /**
     * 获取部门详情
     */
    async getDepartment(departmentId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/departments/${departmentId}`
        },
        z.object({
          department: departmentSchema
        })
      );
    },
    
    /**
     * 创建部门
     */
    async createDepartment(data: {
      name: string;
      parentid?: string;
      order?: number;
      id?: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/departments',
          data
        },
        z.object({
          id: z.string()
        })
      );
    },
    
    /**
     * 更新部门
     */
    async updateDepartment(
      departmentId: string,
      data: {
        name?: string;
        parentid?: string;
        order?: number;
      }
    ) {
      return sendRequest(
        client,
        {
          method: 'PUT',
          url: `/api/v1/departments/${departmentId}`,
          data
        }
      );
    },
    
    /**
     * 删除部门
     */
    async deleteDepartment(departmentId: string) {
      return sendRequest(
        client,
        {
          method: 'DELETE',
          url: `/api/v1/departments/${departmentId}`
        }
      );
    },
    
    /**
     * 获取用户列表
     */
    async getUsers(params?: WaiV1PaginationParams) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/api/v1/users',
          params
        },
        z.object({
          users: z.array(userSchema),
          ...paginationResponseSchema.shape
        })
      );
    },
    
    /**
     * 获取部门下的用户列表
     */
    async getDepartmentUsers(departmentId: string, params?: WaiV1PaginationParams) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/departments/${departmentId}/users`,
          params
        },
        z.object({
          users: z.array(userSchema),
          ...paginationResponseSchema.shape
        })
      );
    },
    
    /**
     * 获取用户详情
     */
    async getUser(userId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/users/${userId}`
        },
        z.object({
          user: userSchema
        })
      );
    },
    
    /**
     * 创建用户
     */
    async createUser(data: {
      name: string;
      email?: string;
      mobile?: string;
      departments: Array<{
        department_id: string;
        is_leader?: boolean;
      }>;
      // 其他字段...
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/users',
          data
        },
        z.object({
          userid: z.string()
        })
      );
    },
    
    /**
     * 更新用户
     */
    async updateUser(
      userId: string,
      data: {
        name?: string;
        email?: string;
        mobile?: string;
        // 其他字段...
      }
    ) {
      return sendRequest(
        client,
        {
          method: 'PUT',
          url: `/api/v1/users/${userId}`,
          data
        }
      );
    },
    
    /**
     * 删除用户
     */
    async deleteUser(userId: string) {
      return sendRequest(
        client,
        {
          method: 'DELETE',
          url: `/api/v1/users/${userId}`
        }
      );
    }
  };
}
```

### 2.5 云文档API实现

WPS V1版本的云文档API示例：

```typescript
// src/services/api/document.ts
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { sendRequest } from '../request';
import { WaiV1PaginationParams } from '../../types';

// 文档Schema
const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number().optional(),
  create_time: z.number().optional(),
  modify_time: z.number().optional(),
  parent_id: z.string().optional(),
  creator: z.object({
    id: z.string(),
    name: z.string()
  }).optional()
});

/**
 * 创建云文档API
 */
export function createDocumentApi(client: AxiosInstance) {
  return {
    /**
     * 获取云文档列表
     */
    async getDocuments(params?: { parent_id?: string } & WaiV1PaginationParams) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/api/v1/drive/files',
          params
        },
        z.object({
          files: z.array(documentSchema),
          total_count: z.number(),
          page_size: z.number(),
          page_number: z.number()
        })
      );
    },
    
    /**
     * 获取云文档详情
     */
    async getDocument(fileId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/drive/files/${fileId}`
        },
        z.object({
          file: documentSchema
        })
      );
    },
    
    /**
     * 创建文件夹
     */
    async createFolder(data: {
      name: string;
      parent_id?: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/drive/folders',
          data
        },
        z.object({
          folder_id: z.string()
        })
      );
    },
    
    /**
     * 删除文件/文件夹
     */
    async deleteFile(fileId: string) {
      return sendRequest(
        client,
        {
          method: 'DELETE',
          url: `/api/v1/drive/files/${fileId}`
        }
      );
    },
    
    /**
     * 获取文件下载链接
     */
    async getDownloadUrl(fileId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/drive/files/${fileId}/download_url`
        },
        z.object({
          download_url: z.string(),
          expires_in: z.number()
        })
      );
    },
    
    /**
     * 获取文件上传链接
     */
    async getUploadUrl(data: {
      name: string;
      size: number;
      parent_id?: string;
      overwrite?: boolean;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/drive/files/upload_url',
          data
        },
        z.object({
          upload_url: z.string(),
          file_id: z.string(),
          expires_in: z.number()
        })
      );
    }
  };
}
```

### 2.6 消息API实现

```typescript
// src/services/api/message.ts
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { sendRequest } from '../request';

// 消息Schema
const messageSchema = z.object({
  id: z.string(),
  sender: z.object({
    id: z.string(),
    name: z.string()
  }),
  chat_id: z.string(),
  create_time: z.number(),
  content: z.any() // 消息内容可能有多种类型
});

/**
 * 创建消息API
 */
export function createMessageApi(client: AxiosInstance) {
  return {
    /**
     * 发送文本消息
     */
    async sendTextMessage(data: {
      chat_id: string;
      content: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/messages/text',
          data
        },
        z.object({
          message_id: z.string()
        })
      );
    },
    
    /**
     * 发送图片消息
     */
    async sendImageMessage(data: {
      chat_id: string;
      image_url: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/messages/image',
          data
        },
        z.object({
          message_id: z.string()
        })
      );
    },
    
    /**
     * 发送文件消息
     */
    async sendFileMessage(data: {
      chat_id: string;
      file_id: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/messages/file',
          data
        },
        z.object({
          message_id: z.string()
        })
      );
    },
    
    /**
     * 获取消息列表
     */
    async getMessages(chatId: string, params?: {
      start_time?: number;
      end_time?: number;
      page_size?: number;
      page_number?: number;
    }) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/chats/${chatId}/messages`,
          params
        },
        z.object({
          messages: z.array(messageSchema),
          total_count: z.number(),
          page_size: z.number(),
          page_number: z.number()
        })
      );
    },
    
    /**
     * 获取消息详情
     */
    async getMessage(messageId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/messages/${messageId}`
        },
        z.object({
          message: messageSchema
        })
      );
    },
    
    /**
     * 创建会话
     */
    async createChat(data: {
      name?: string;
      user_ids: string[];
      chat_type: 'single' | 'group';
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/chats',
          data
        },
        z.object({
          chat_id: z.string()
        })
      );
    },
    
    /**
     * 获取会话详情
     */
    async getChat(chatId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/chats/${chatId}`
        }
      );
    },
    
    /**
     * 获取会话成员列表
     */
    async getChatMembers(chatId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/chats/${chatId}/members`
        }
      );
    }
  };
}
```

### 2.7 API模块集成

```typescript
// src/services/api/index.ts
import { AxiosInstance } from 'axios';
import { createAuthApi } from './auth';
import { createContactApi } from './contact';
import { createDocumentApi } from './document';
import { createMessageApi } from './message';

/**
 * 创建完整的API客户端
 */
export function createApiClient(client: AxiosInstance) {
  return {
    auth: createAuthApi(client),
    contact: createContactApi(client),
    document: createDocumentApi(client),
    message: createMessageApi(client)
  };
}
```

### 2.8 插件入口

```typescript
// src/index.ts
import { AxiosInstance } from 'axios';
import { validateConfig } from './schemas';
import { createWpsApiClient, sendRequest } from './services/request';
import { initTokenCache, getCompanyToken, clearTokenCache } from './services/token';
import { createApiClient } from './services/api';
import { WaiV1Options } from './types';

/**
 * 创建WPS客户端
 */
function createWpsClient(app: any, config: WaiV1Options) {
  // 获取日志对象
  const logger = app.hasPlugin('logger') ? app.logger : console;
  
  // 初始化token缓存
  initTokenCache(config);
  
  // 创建API客户端
  const apiClient = createWpsApiClient(app, config);
  
  // 创建API模块
  const api = createApiClient(apiClient);
  
  // 添加辅助方法
  return {
    // API模块
    ...api,
    
    // 辅助方法
    getCompanyToken: () => getCompanyToken(app, config),
    clearTokenCache: (appId?: string) => clearTokenCache(appId),
    
    // 低级API访问方法
    request: <T>(axiosConfig: any, schema?: any) => 
      sendRequest<T>(apiClient, axiosConfig, schema),
    
    // 原始客户端
    client: apiClient
  };
}

/**
 * WaiV1插件定义
 */
const waiV1Plugin = {
  name: 'waiV1',
  dependencies: ['core'],
  optionalDependencies: ['logger'],
  
  register: async (app: any, options: WaiV1Options) => {
    // 验证配置
    const config = validateConfig(options);
    
    // 创建WPS客户端
    const client = createWpsClient(app, config);
    
    // 注册钩子
    app.hook('beforeClose', async () => {
      // 清理缓存
      clearTokenCache();
    });
    
    // 添加装饰器
    app.decorate('waiV1', client);
  },
  
  // 配置验证模式
  schema: waiV1ConfigSchema
};

export default waiV1Plugin;
```

## 3. V1与V7版本的区别

WPS开放平台V1版本与V7版本有一些重要区别，开发人员在使用时需要注意：

### 3.1 分页参数

- V1版本：使用`page_number`和`page_size`
- V7版本：使用`page_token`和`page_size`

### 3.2 字段命名

- V1版本：如`departmentid`、`userid`等
- V7版本：如`department_id`、`user_id`等，采用更一致的下划线命名法

### 3.3 功能支持

V7版本比V1版本支持更多功能，例如多维表格、审批流等。如果需要使用这些高级功能，应选择V7版本插件。

## 4. 使用示例

```typescript
// 引入并注册插件
import { createApp } from '@stratix/core';
import waiV1Plugin from '@stratix/waiV1';

const app = createApp();

app.register(waiV1Plugin, {
  appId: 'your-app-id',
  appKey: 'your-app-key'
});

await app.start();

// 使用通讯录API
const departments = await app.waiV1.contact.getDepartments({ parentid: '0' });
console.log('部门列表:', departments);

// 使用云文档API
const documents = await app.waiV1.document.getDocuments();
console.log('文档列表:', documents);

// 创建文件夹
const folderResult = await app.waiV1.document.createFolder({
  name: '测试文件夹',
  parent_id: 'root'
});
console.log('新文件夹ID:', folderResult.folder_id);

// 发送消息
const messageResult = await app.waiV1.message.sendTextMessage({
  chat_id: 'chat123',
  content: '测试消息'
});
console.log('消息ID:', messageResult.message_id);
```

## 5. 并存使用V1和V7版本

在同一个应用中同时使用V1和V7版本API的示例：

```typescript
import { createApp } from '@stratix/core';
import waiV1Plugin from '@stratix/waiV1';
import waiV7Plugin from '@stratix/waiV7';

const app = createApp();

// 注册V1插件
app.register(waiV1Plugin, {
  appId: 'v1-app-id',
  appKey: 'v1-app-key'
});

// 注册V7插件
app.register(waiV7Plugin, {
  appId: 'v7-app-id',
  appKey: 'v7-app-key'
});

await app.start();

// 使用V1版本API获取部门列表
const v1Departments = await app.waiV1.contact.getDepartments();

// 使用V7版本API获取部门列表
const v7Departments = await app.waiV7.contact.getDepartments();

// 使用V1版本API发送消息
await app.waiV1.message.sendTextMessage({
  chat_id: 'chat123',
  content: '通过V1 API发送的消息'
});

// 使用V7版本API发送消息
await app.waiV7.message.sendMessage({
  chat_id: 'chat123',
  msg_type: 'text',
  content: { text: '通过V7 API发送的消息' }
});
```

## 6. 总结

本文档详细描述了WPS开放平台V1版本API插件的实现设计。该插件提供了一组简洁、类型安全的接口，使开发人员能够轻松集成WPS开放平台V1版本的API。尽管V1版本在功能上不如V7版本丰富，但对于现有系统集成或只需基础功能的场景，V1版本插件仍然是一个很好的选择。

通过使用zod进行数据验证、axios进行HTTP请求以及Stratix框架的钩子系统和日志功能，插件实现了高质量的代码和良好的用户体验。开发人员可以根据自己的需求选择使用V1版本插件、V7版本插件或同时使用两者。 