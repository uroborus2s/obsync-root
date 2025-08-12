# 认证接口修复说明

## 问题描述

首页 `http://localhost:5173/web/dashboard` 在加载时会请求 `https://chat.whzhsc.cn/apiv2/tasks/tree/roots?page=1&page_size=1` 接口来检查认证状态，这是不正确的。首页应该请求网关的认证接口 `/api/auth/verify`，如果接口返回401，则重定向到登录页面。

## 问题根源

在 `apps/agendaedu-web/src/components/layout/authenticated-layout.tsx` 文件中的 `DirectAuthRedirect` 组件使用了错误的接口来检查认证状态：

```typescript
// 错误的做法
fetch('https://chat.whzhsc.cn/apiv2/tasks/tree/roots?page=1&page_size=1', {
  method: 'GET',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
})
```

## 修复方案

### 1. 更新认证检查逻辑

将 `DirectAuthRedirect` 组件修改为使用网关认证管理器：

```typescript
// 修复后的做法
function DirectAuthRedirect() {
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await authManager.checkAuthStatus()
        const state = authManager.getState()
        
        if (!state.isAuthenticated) {
          const currentUrl = window.location.href
          authManager.redirectToAuth(currentUrl)
        }
      } catch (error) {
        console.error('认证检查失败:', error)
        const currentUrl = window.location.href
        authManager.redirectToAuth(currentUrl)
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [])
  
  // ... 其余代码
}
```

### 2. 创建统一配置管理

创建了 `apps/agendaedu-web/src/lib/config.ts` 文件来统一管理不同环境的配置：

```typescript
export const appConfig: AppConfig = {
  apiBaseUrl: getApiBaseUrl(),
  authBaseUrl: getAuthBaseUrl(),
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  environment: getEnvironment(),
}

export const authConfig = {
  verifyPath: '/api/auth/verify',
  logoutPath: '/api/auth/logout',
  authPageUrl: '/api/auth/authorization',
  checkInterval: 5 * 60 * 1000, // 5分钟
}
```

### 3. 更新API客户端配置

更新 `api-client.ts` 以使用配置管理：

```typescript
constructor(baseURL?: string) {
  this.client = axios.create({
    baseURL: baseURL || appConfig.apiBaseUrl,
    timeout: networkConfig.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
```

### 4. 更新认证API服务

更新 `auth-api.ts` 以使用配置路径：

```typescript
async verifyAuth(): Promise<AuthVerifyResponse> {
  try {
    const response = await apiClient.get<AuthVerifyResponse>(
      authConfig.verifyPath  // 使用配置的路径
    )
    return response
  } catch (error: any) {
    // 错误处理...
  }
}
```

## 修复效果

### 修复前
- ❌ 首页请求 `https://chat.whzhsc.cn/apiv2/tasks/tree/roots` 检查认证
- ❌ 使用了错误的任务接口来验证认证状态
- ❌ 硬编码的API地址，不适合不同环境

### 修复后
- ✅ 首页使用网关认证管理器检查认证状态
- ✅ 调用正确的认证接口 `/api/auth/verify`
- ✅ 统一的配置管理，支持不同环境
- ✅ 401错误时正确重定向到认证页面

## 环境适配

配置系统会根据当前环境自动选择正确的API地址：

### 开发环境 (localhost:5173)
- API基础URL: `http://localhost:8080` (网关地址)
- 认证接口: `http://localhost:8080/api/auth/verify`

### 生产环境 (*.whzhsc.cn)
- API基础URL: 当前域名 (例如: `https://chat.whzhsc.cn`)
- 认证接口: `https://chat.whzhsc.cn/api/auth/verify`

## 接口流程

### 正确的认证流程
1. 用户访问首页 `/web/dashboard`
2. `AuthenticatedLayout` 组件检查认证状态
3. 调用 `authManager.checkAuthStatus()`
4. 发送请求到 `/api/auth/verify`
5. 如果返回401，重定向到认证页面
6. 如果认证成功，显示正常页面内容

### 认证接口规范
- **验证接口**: `GET /api/auth/verify`
  - 成功: 返回用户信息
  - 失败: 返回401状态码
- **认证页面**: `/api/auth/authorization`
  - WPS OAuth流程入口

## 测试验证

### 验证步骤
1. 启动开发服务器: `pnpm run dev`
2. 访问首页: `http://localhost:5173/web/dashboard`
3. 检查网络请求，确认调用的是 `/api/auth/verify`
4. 验证401错误时正确跳转到认证页面

### 预期结果
- ✅ 不再请求 `apiv2/tasks/tree/roots` 接口
- ✅ 正确请求 `/api/auth/verify` 接口
- ✅ 401错误时正确处理和跳转
- ✅ 认证成功时正常显示页面

## 相关文件

### 修改的文件
- `apps/agendaedu-web/src/components/layout/authenticated-layout.tsx`
- `apps/agendaedu-web/src/lib/api-client.ts`
- `apps/agendaedu-web/src/lib/auth-api.ts`

### 新增的文件
- `apps/agendaedu-web/src/lib/config.ts`

### 配置文件
- 支持环境变量 `VITE_API_BASE_URL` 覆盖默认配置
- 自动检测开发/生产环境并使用相应配置

## 后续优化建议

1. **错误处理增强**: 添加更详细的错误信息和用户提示
2. **性能优化**: 实现认证状态缓存，避免重复检查
3. **监控集成**: 添加认证失败的监控和报警
4. **测试覆盖**: 增加认证流程的自动化测试
