# WPS开放平台V7版本API实现设计

## 1. 概述

本文档描述了基于Stratix框架开发的WPS开放平台V7版本API插件(`waiV7`)的详细实现设计。该插件专门用于集成WPS开放平台V7版本的API，提供简洁、类型安全的接口。

### 1.1 背景

WPS开放平台V7版本API是针对WPS云文档、消息、会话等功能的最新版本接口。与V1版本相比，V7版本提供了更丰富的功能和更完善的接口设计。本插件旨在简化开发人员与WPS开放平台V7版本API的交互。

### 1.2 与V1版本的关系

`waiV7`插件与`waiV1`插件保持相同的架构和接口风格，但针对V7版本的API进行了专门适配。这两个插件可以在同一个应用中并存使用，相互独立。

## 2. 实现细节

### 2.1 类型定义

```typescript
// src/types/config.ts
export interface WaiV7Options {
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
export interface WaiV7RequestError {
  message: string;
  status?: number;
  code?: string | number;
  data?: any;
}

// src/types/response.ts
export interface WaiV7PaginationParams {
  page_size?: number;
  page_token?: string;
}

export interface WaiV7PaginationResponse {
  page_token?: string;
  has_more?: boolean;
}
```

### 2.2 Schema验证

```typescript
// src/schemas/config.ts
import { z } from 'zod';

export const waiV7ConfigSchema = z.object({
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

// src/schemas/request.ts - 例子：部门请求Schema
export const createDepartmentSchema = z.object({
  name: z.string().min(1, '部门名称不能为空'),
  parent_id: z.string().optional(),
  order: z.number().optional(),
  department_id: z.string().optional()
});
```

### 2.3 Token管理实现

```typescript
// src/services/token.ts
import { z } from 'zod';
import { createCache } from '@stratix/utils/cache';
import { WaiV7Options } from '../types';

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
export function initTokenCache(options: WaiV7Options): void {
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
export async function getCompanyToken(app: any, options: WaiV7Options): Promise<string> {
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
    
    // 设置请求URL和参数
    const url = `/oauthapi/v7/inner/company/token`;
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
import { WaiV7PaginationParams } from '../../types';

/**
 * 创建通讯录API
 */
export function createContactApi(client: AxiosInstance) {
  return {
    /**
     * 获取部门列表
     */
    async getDepartments(params: { parent_id?: string } & WaiV7PaginationParams) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/api/v7/contact/departments',
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
          url: `/api/v7/contact/departments/${departmentId}`
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
      parent_id?: string;
      order?: number;
      department_id?: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v7/contact/departments',
          data
        },
        z.object({
          department_id: z.string()
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
        parent_id?: string;
        order?: number;
      }
    ) {
      return sendRequest(
        client,
        {
          method: 'PUT',
          url: `/api/v7/contact/departments/${departmentId}`,
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
          url: `/api/v7/contact/departments/${departmentId}`
        }
      );
    },
    
    /**
     * 获取用户列表
     */
    async getUsers(params?: WaiV7PaginationParams) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/api/v7/contact/users',
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
    async getDepartmentUsers(departmentId: string, params?: WaiV7PaginationParams) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v7/contact/departments/${departmentId}/users`,
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
          url: `/api/v7/contact/users/${userId}`
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
      departments: string[];
      // 其他字段...
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v7/contact/users',
          data
        },
        z.object({
          user_id: z.string()
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
          url: `/api/v7/contact/users/${userId}`,
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
          url: `/api/v7/contact/users/${userId}`
        }
      );
    }
  };
}
```

### 2.5 API模块集成

```typescript
// src/services/api/index.ts
import { AxiosInstance } from 'axios';
import { createAuthApi } from './auth';
import { createContactApi } from './contact';
import { createDocumentApi } from './document';
import { createMessageApi } from './message';
import { createTaskApi } from './task';
import { createAppApi } from './app';

/**
 * 创建完整的API客户端
 */
export function createApiClient(client: AxiosInstance) {
  return {
    auth: createAuthApi(client),
    contact: createContactApi(client),
    document: createDocumentApi(client),
    message: createMessageApi(client),
    task: createTaskApi(client),
    app: createAppApi(client)
  };
}
```

### 2.6 插件入口

```typescript
// src/index.ts
import { AxiosInstance } from 'axios';
import { validateConfig } from './schemas';
import { createWpsApiClient, sendRequest } from './services/request';
import { initTokenCache, getCompanyToken, clearTokenCache } from './services/token';
import { createApiClient } from './services/api';
import { WaiV7Options } from './types';

/**
 * 创建WPS客户端
 */
function createWpsClient(app: any, config: WaiV7Options) {
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
 * WaiV7插件定义
 */
const waiV7Plugin = {
  name: 'waiV7',
  dependencies: ['core'],
  optionalDependencies: ['logger'],
  
  register: async (app: any, options: WaiV7Options) => {
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
    app.decorate('waiV7', client);
  },
  
  // 配置验证模式
  schema: waiV7ConfigSchema
};

export default waiV7Plugin;
```

## 3. V7版本特定API

WPS开放平台V7版本提供了一些V1版本不支持的特定API，以下是几个示例：

### 3.1 多维表格API

```typescript
// src/services/api/sheet.ts
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { sendRequest } from '../request';

export function createSheetApi(client: AxiosInstance) {
  return {
    /**
     * 获取多维表格列表
     */
    async getSheets(params?: {
      space_id?: string;
      folder_id?: string;
      page_size?: number;
      page_token?: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/api/v7/sheet/sheets',
          params
        }
      );
    },
    
    /**
     * 创建多维表格
     */
    async createSheet(data: {
      name: string;
      folder_id?: string;
      space_id?: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v7/sheet/sheets',
          data
        }
      );
    },
    
    /**
     * 获取多维表格详情
     */
    async getSheet(sheetId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v7/sheet/sheets/${sheetId}`
        }
      );
    },
    
    /**
     * 获取多维表格视图列表
     */
    async getViews(sheetId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v7/sheet/sheets/${sheetId}/views`
        }
      );
    },
    
    /**
     * 获取多维表格数据
     */
    async getRecords(sheetId: string, viewId: string, params?: {
      page_size?: number;
      page_token?: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v7/sheet/sheets/${sheetId}/views/${viewId}/records`,
          params
        }
      );
    },
    
    /**
     * 添加多维表格记录
     */
    async addRecord(sheetId: string, viewId: string, data: {
      fields: Record<string, any>;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: `/api/v7/sheet/sheets/${sheetId}/views/${viewId}/records`,
          data
        }
      );
    }
  };
}
```

### 3.2 审批流API

```typescript
// src/services/api/approval.ts
import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { sendRequest } from '../request';

export function createApprovalApi(client: AxiosInstance) {
  return {
    /**
     * 获取审批定义列表
     */
    async getDefinitions(params?: {
      page_size?: number;
      page_token?: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/api/v7/approval/definitions',
          params
        }
      );
    },
    
    /**
     * 获取审批定义详情
     */
    async getDefinition(definitionId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v7/approval/definitions/${definitionId}`
        }
      );
    },
    
    /**
     * 发起审批
     */
    async createInstance(data: {
      definition_id: string;
      title: string;
      form_data: Record<string, any>;
      initiator_id: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v7/approval/instances',
          data
        }
      );
    },
    
    /**
     * 获取审批实例详情
     */
    async getInstance(instanceId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v7/approval/instances/${instanceId}`
        }
      );
    },
    
    /**
     * 审批操作
     */
    async approve(taskId: string, data: {
      action: 'approve' | 'reject' | 'transfer';
      comment?: string;
      assignee_id?: string; // 当action为transfer时需要
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: `/api/v7/approval/tasks/${taskId}/approve`,
          data
        }
      );
    }
  };
}
```

## 4. 使用示例

```typescript
// 引入并注册插件
import { createApp } from '@stratix/core';
import waiV7Plugin from '@stratix/waiV7';

const app = createApp();

app.register(waiV7Plugin, {
  appId: 'your-app-id',
  appKey: 'your-app-key'
});

await app.start();

// 使用通讯录API
const departments = await app.waiV7.contact.getDepartments({ parent_id: 'root' });
console.log('部门列表:', departments);

// 使用云文档API
const documents = await app.waiV7.document.getDocuments();
console.log('文档列表:', documents);

// 使用多维表格API
const sheets = await app.waiV7.sheet.getSheets();
console.log('多维表格列表:', sheets);

// 使用审批流API
const approvalDefinitions = await app.waiV7.approval.getDefinitions();
console.log('审批定义列表:', approvalDefinitions);
```

## 5. 总结

本文档详细描述了WPS开放平台V7版本API插件的实现设计。该插件提供了一组简洁、类型安全的接口，使开发人员能够轻松集成WPS开放平台V7版本的API。通过使用zod进行数据验证、axios进行HTTP请求以及Stratix框架的钩子系统和日志功能，插件实现了高质量的代码和良好的用户体验。 