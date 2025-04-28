# @stratix/utils/context 上下文工具函数文档

该模块提供了一系列用于创建和管理上下文的工具函数，帮助开发者在应用程序中有效地传递和共享数据。

## 目录

- [@stratix/utils/context 上下文工具函数文档](#stratixutilscontext-上下文工具函数文档)
  - [目录](#目录)
  - [创建上下文函数](#创建上下文函数)
    - [createContext](#createcontext)
    - [createNamespace](#createnamespace)
    - [useContext](#usecontext)
  - [上下文管理函数](#上下文管理函数)
    - [withContext](#withcontext)
    - [getContextValue](#getcontextvalue)
    - [setContextValue](#setcontextvalue)
    - [hasContextValue](#hascontextvalue)
    - [removeContextValue](#removecontextvalue)
    - [clearContext](#clearcontext)
  - [命名空间上下文函数](#命名空间上下文函数)
    - [createContextScope](#createcontextscope)
    - [mergeContexts](#mergecontexts)
    - [isolateContext](#isolatecontext)

## 创建上下文函数

### createContext

创建一个新的上下文容器，用于存储和共享数据。

```typescript
function createContext<T extends Record<string, any>>(defaultValues?: Partial<T>): Context<T>
```

**参数:**
- `defaultValues`: 上下文的默认值（可选）

**返回值:**
- 一个上下文对象，包含获取、设置和订阅上下文数据的方法

**示例:**

```javascript
import { createContext } from '@stratix/utils/context';

// 创建一个应用上下文
const appContext = createContext({
  theme: 'light',
  language: 'zh-CN',
  user: null
});

// 在应用中使用上下文
function initializeApp() {
  // 获取上下文中的主题设置
  const theme = appContext.get('theme');
  document.body.classList.add(`theme-${theme}`);
  
  // 订阅上下文变化
  appContext.subscribe('theme', (newTheme) => {
    document.body.classList.remove(`theme-${theme}`);
    document.body.classList.add(`theme-${newTheme}`);
  });
}
```

### createNamespace

创建一个命名空间上下文，用于将相关数据分组管理。

```typescript
function createNamespace<T extends Record<string, any>>(name: string, defaultValues?: Partial<T>): NamespaceContext<T>
```

**参数:**
- `name`: 命名空间名称
- `defaultValues`: 命名空间上下文的默认值（可选）

**返回值:**
- 一个命名空间上下文对象

**示例:**

```javascript
import { createNamespace } from '@stratix/utils/context';

// 创建一个用户相关的命名空间上下文
const userContext = createNamespace('user', {
  profile: null,
  preferences: { notifications: true },
  permissions: []
});

// 创建一个UI相关的命名空间上下文
const uiContext = createNamespace('ui', {
  theme: 'light',
  layout: 'default',
  sidebar: { open: true }
});

// 使用命名空间上下文
function initUserSettings() {
  const preferences = userContext.get('preferences');
  setupNotifications(preferences.notifications);
  
  userContext.subscribe('profile', (profile) => {
    if (profile) {
      console.log(`欢迎回来，${profile.name}!`);
    }
  });
}
```

### useContext

在函数中使用已创建的上下文。

```typescript
function useContext<T extends Record<string, any>>(context: Context<T>): UseContextReturn<T>
```

**参数:**
- `context`: 要使用的上下文对象

**返回值:**
- 包含上下文操作方法的对象

**示例:**

```javascript
import { createContext, useContext } from '@stratix/utils/context';

// 创建应用上下文
const appContext = createContext({
  loading: false,
  data: null,
  error: null
});

// 在组件中使用上下文
function DataComponent() {
  const { get, set, subscribe } = useContext(appContext);
  
  async function fetchData() {
    try {
      set('loading', true);
      const response = await fetch('/api/data');
      const data = await response.json();
      set('data', data);
      set('error', null);
    } catch (err) {
      set('error', err.message);
    } finally {
      set('loading', false);
    }
  }
  
  // 订阅加载状态变化
  const unsubscribe = subscribe('loading', (isLoading) => {
    updateLoadingIndicator(isLoading);
  });
  
  // 组件清理时取消订阅
  return function cleanup() {
    unsubscribe();
  };
}
```

## 上下文管理函数

### withContext

在指定上下文中执行函数。

```typescript
function withContext<T, C extends Record<string, any>>(
  context: Context<C>, 
  fn: (ctx: UseContextReturn<C>) => T
): T
```

**参数:**
- `context`: 要使用的上下文对象
- `fn`: 要在上下文中执行的函数

**返回值:**
- 函数执行结果

**示例:**

```javascript
import { createContext, withContext } from '@stratix/utils/context';

// 创建数据库上下文
const dbContext = createContext({
  connection: null,
  transactionActive: false
});

// 在事务中执行数据库操作
async function executeInTransaction(operations) {
  return withContext(dbContext, async (ctx) => {
    // 获取连接
    const connection = ctx.get('connection');
    if (!connection) throw new Error('数据库未连接');
    
    // 开始事务
    await connection.beginTransaction();
    ctx.set('transactionActive', true);
    
    try {
      // 执行操作
      const results = [];
      for (const operation of operations) {
        results.push(await operation(connection));
      }
      
      // 提交事务
      await connection.commit();
      return results;
    } catch (error) {
      // 回滚事务
      await connection.rollback();
      throw error;
    } finally {
      ctx.set('transactionActive', false);
    }
  });
}
```

### getContextValue

从上下文中获取特定键的值。

```typescript
function getContextValue<T, K extends keyof T>(context: Context<T>, key: K): T[K]
```

**参数:**
- `context`: 上下文对象
- `key`: 要获取的键

**返回值:**
- 上下文中指定键的值

**示例:**

```javascript
import { createContext, getContextValue } from '@stratix/utils/context';

// 创建配置上下文
const configContext = createContext({
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3
});

// 获取API配置
function getApiConfig() {
  const apiUrl = getContextValue(configContext, 'apiUrl');
  const timeout = getContextValue(configContext, 'timeout');
  const retries = getContextValue(configContext, 'retries');
  
  return { apiUrl, timeout, retries };
}

// 在API调用中使用配置
async function fetchData(endpoint) {
  const { apiUrl, timeout, retries } = getApiConfig();
  // 使用配置进行API调用...
}
```

### setContextValue

在上下文中设置特定键的值。

```typescript
function setContextValue<T, K extends keyof T>(context: Context<T>, key: K, value: T[K]): void
```

**参数:**
- `context`: 上下文对象
- `key`: 要设置的键
- `value`: 要设置的值

**返回值:**
- 无

**示例:**

```javascript
import { createContext, setContextValue, getContextValue } from '@stratix/utils/context';

// 创建应用状态上下文
const appStateContext = createContext({
  initialized: false,
  currentRoute: '/',
  user: null
});

// 初始化应用
function initializeApp() {
  // 执行初始化逻辑...
  
  // 更新应用状态
  setContextValue(appStateContext, 'initialized', true);
}

// 更新当前路由
function navigateTo(route) {
  const currentRoute = getContextValue(appStateContext, 'currentRoute');
  if (route !== currentRoute) {
    setContextValue(appStateContext, 'currentRoute', route);
    // 执行路由变化逻辑...
  }
}
```

### hasContextValue

检查上下文中是否存在特定键。

```typescript
function hasContextValue<T>(context: Context<T>, key: keyof T): boolean
```

**参数:**
- `context`: 上下文对象
- `key`: 要检查的键

**返回值:**
- 如果键存在且不为undefined则返回true，否则返回false

**示例:**

```javascript
import { createContext, hasContextValue, getContextValue } from '@stratix/utils/context';

// 创建用户上下文
const userContext = createContext({
  // 用户未登录时为null
  profile: null
});

// 检查用户是否已登录并获取用户信息
function getUserProfile() {
  if (hasContextValue(userContext, 'profile')) {
    const profile = getContextValue(userContext, 'profile');
    if (profile) {
      return profile;
    }
  }
  
  // 用户未登录，重定向到登录页
  redirectToLogin();
  return null;
}
```

### removeContextValue

从上下文中移除特定键值对。

```typescript
function removeContextValue<T>(context: Context<T>, key: keyof T): void
```

**参数:**
- `context`: 上下文对象
- `key`: 要移除的键

**返回值:**
- 无

**示例:**

```javascript
import { createContext, removeContextValue } from '@stratix/utils/context';

// 创建缓存上下文
const cacheContext = createContext({
  userProfiles: {},
  documentCache: {},
  temporaryData: {}
});

// 清除临时数据
function clearTemporaryData() {
  removeContextValue(cacheContext, 'temporaryData');
  // 临时数据会被重置为默认值（空对象）
}

// 用户登出时清除用户相关缓存
function logout() {
  removeContextValue(cacheContext, 'userProfiles');
  // 其他登出逻辑...
}
```

### clearContext

清除上下文中的所有数据，恢复为默认值。

```typescript
function clearContext<T>(context: Context<T>): void
```

**参数:**
- `context`: 要清除的上下文对象

**返回值:**
- 无

**示例:**

```javascript
import { createContext, clearContext } from '@stratix/utils/context';

// 创建会话上下文
const sessionContext = createContext({
  token: null,
  user: null,
  permissions: [],
  sessionStart: null
});

// 初始化会话
function initSession(userData) {
  sessionContext.set('token', userData.token);
  sessionContext.set('user', userData.profile);
  sessionContext.set('permissions', userData.permissions);
  sessionContext.set('sessionStart', new Date());
}

// 结束会话
function endSession() {
  // 清除会话数据
  clearContext(sessionContext);
  
  // 重定向到登录页
  window.location.href = '/login';
}
```

## 命名空间上下文函数

### createContextScope

创建一个隔离的上下文作用域，可以包含多个相关的上下文。

```typescript
function createContextScope(name: string): ContextScope
```

**参数:**
- `name`: 作用域名称

**返回值:**
- 上下文作用域对象

**示例:**

```javascript
import { createContextScope, createContext } from '@stratix/utils/context';

// 创建一个模块作用域
const moduleScope = createContextScope('moduleA');

// 在作用域内创建上下文
const stateContext = moduleScope.createContext('state', {
  loading: false,
  data: null
});

const configContext = moduleScope.createContext('config', {
  refreshInterval: 5000,
  enableCache: true
});

// 使用作用域内的上下文
function ModuleComponent() {
  // 获取作用域内的所有上下文状态
  const state = moduleScope.getState();
  console.log('模块状态:', state);
  // 输出: { state: { loading: false, data: null }, config: { refreshInterval: 5000, enableCache: true } }
  
  // 更新特定上下文
  stateContext.set('loading', true);
  
  // 监听整个作用域的变化
  const unsubscribe = moduleScope.subscribe((changes) => {
    console.log('模块状态变化:', changes);
  });
  
  return function cleanup() {
    unsubscribe();
  };
}
```

### mergeContexts

合并多个上下文到一个单一上下文。

```typescript
function mergeContexts<T extends Record<string, any>>(
  contexts: Context<any>[],
  options?: MergeContextOptions
): Context<T>
```

**参数:**
- `contexts`: 要合并的上下文数组
- `options`: 合并选项（可选）
  - `prefix`: 是否保留原始上下文键前缀
  - `override`: 键冲突时的覆盖策略

**返回值:**
- 合并后的上下文对象

**示例:**

```javascript
import { createContext, mergeContexts } from '@stratix/utils/context';

// 创建多个上下文
const userContext = createContext({
  id: null,
  name: null,
  role: 'guest'
});

const preferencesContext = createContext({
  theme: 'light',
  language: 'zh-CN'
});

const permissionsContext = createContext({
  read: true,
  write: false,
  admin: false
});

// 合并上下文
const appContext = mergeContexts([
  userContext,
  preferencesContext,
  permissionsContext
]);

// 使用合并后的上下文
function AppComponent() {
  // 可以从合并的上下文访问所有值
  const userName = appContext.get('name');
  const theme = appContext.get('theme');
  const hasWriteAccess = appContext.get('write');
  
  // 更新合并的上下文会同步到原始上下文
  appContext.set('theme', 'dark');
  console.log(preferencesContext.get('theme')); // 'dark'
  
  // 订阅特定值的变化
  appContext.subscribe('role', (newRole) => {
    updateUIForRole(newRole);
  });
}
```

### isolateContext

创建上下文的隔离副本，对副本的修改不会影响原始上下文。

```typescript
function isolateContext<T extends Record<string, any>>(
  context: Context<T>,
  initialOverrides?: Partial<T>
): Context<T>
```

**参数:**
- `context`: 要隔离的上下文
- `initialOverrides`: 初始覆盖值（可选）

**返回值:**
- 隔离的上下文副本

**示例:**

```javascript
import { createContext, isolateContext } from '@stratix/utils/context';

// 创建全局配置上下文
const globalConfigContext = createContext({
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  debug: false
});

// 为特定模块创建隔离的配置上下文
function initModuleWithCustomConfig() {
  // 创建隔离副本并覆盖某些配置
  const moduleConfigContext = isolateContext(globalConfigContext, {
    timeout: 10000,
    debug: true
  });
  
  // 使用模块特定配置
  console.log(moduleConfigContext.get('apiUrl')); // 'https://api.example.com' (继承自全局)
  console.log(moduleConfigContext.get('timeout')); // 10000 (被覆盖)
  
  // 修改隔离上下文不会影响全局上下文
  moduleConfigContext.set('apiUrl', 'https://module-api.example.com');
  console.log(globalConfigContext.get('apiUrl')); // 仍然是 'https://api.example.com'
  
  return moduleConfigContext;
}
``` 