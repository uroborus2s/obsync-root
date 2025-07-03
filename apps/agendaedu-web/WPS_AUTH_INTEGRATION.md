# WPS授权集成说明

本文档说明了agendaedu-web项目中集成的WPS OAuth2.0授权流程，实现了当API返回401错误时自动重定向到WPS授权页面的功能。

## 功能概述

当用户访问任务页面或其他需要授权的页面时，如果后端API返回401未授权错误，系统会：

1. **自动检测401错误** - TaskApiService会检测API响应中的401状态码
2. **保存当前页面** - 将当前页面URL保存到sessionStorage中
3. **构造授权URL** - 根据WPS开放平台规范构造OAuth2.0授权链接
4. **重定向到WPS** - 自动跳转到WPS官方授权页面
5. **处理授权回调** - 授权成功后处理回调并跳转回原页面

## 技术实现

### 1. TaskApiService增强

位置：`src/lib/task-api.ts`

主要改动：
- 在`makeRequest`方法中添加401错误检测
- 添加`handleUnauthorized`方法处理401错误
- 添加`buildWpsAuthUrl`方法构造WPS授权URL
- 使用`credentials: 'include'`支持服务端session

```typescript
// 处理401未授权错误
if (response.status === 401) {
  this.handleUnauthorized()
  throw new Error('需要重新授权')
}
```

### 2. 授权回调页面

位置：`src/routes/auth/callback.tsx`

功能：
- 处理WPS OAuth2.0授权回调
- 解析授权码并获取访问令牌
- 跳转回原页面或默认页面
- 提供友好的加载和错误提示界面

### 3. WPS授权配置

根据[WPS开放平台文档](https://365.kdocs.cn/3rd/open/documents/app-integration-dev/wps365/server/certification-authorization/user-authorization/flow.html)配置：

- **Client ID**: `AK20250614WBSGPX`
- **授权URL**: `https://openapi.wps.cn/oauth2/auth`
- **回调地址**: `${origin}/auth/callback`
- **权限范围**: `kso.user_base.read`

## 使用流程

### 用户体验流程

**方式一：页面访问时检测未登录**
1. 用户访问 `/web/tasks` 页面
2. 系统检测到用户未登录
3. 直接重定向到WPS授权页面（无中间页面）
4. 用户在WPS页面完成登录授权
5. 系统处理授权回调，获取访问令牌
6. 自动跳转回任务页面，继续正常使用

**方式二：API调用时检测401错误**
1. 用户访问页面，页面调用任务API获取数据
2. 如果API返回401错误，系统自动重定向到WPS授权页面
3. 用户在WPS页面完成登录授权
4. 系统处理授权回调，获取访问令牌
5. 自动跳转回原页面，继续正常使用

### 开发者集成

任何需要API调用的页面都会自动获得401错误处理功能，无需额外代码：

```typescript
// 正常的API调用
const data = await taskApi.getTaskStats()

// 如果返回401，会自动处理授权流程
// 开发者无需手动处理401错误
```

## 配置说明

### 环境配置

确保以下配置正确：

1. **API基础URL**: 默认为 `http://localhost:8090`（对应icalink-api端口）
2. **回调地址**: 需要在WPS开放平台后台配置相同的回调地址
3. **应用ID**: 确保使用正确的WPS应用ID

### 本地开发

本地开发时的回调地址：`http://localhost:5173/auth/callback`

### 生产环境

生产环境的回调地址：`https://chat.whzhsc.cn/auth/callback`

## 错误处理

系统提供了完善的错误处理机制：

1. **网络错误**: 显示"网络连接失败"提示
2. **授权错误**: 显示具体的授权失败原因
3. **超时错误**: 自动重试或提示用户刷新
4. **回调错误**: 在回调页面显示错误信息并自动跳转

## 安全考虑

1. **状态参数**: 使用state参数防止CSRF攻击
2. **HTTPS**: 生产环境强制使用HTTPS
3. **令牌存储**: 访问令牌安全存储在AuthManager中
4. **会话管理**: 支持服务端session管理

## 调试和测试

### 测试401错误处理

1. 访问任务页面：`http://localhost:5173/web/tasks`
2. 如果后端未启动或返回401，会自动触发授权流程
3. 观察浏览器控制台的日志输出
4. 验证授权后是否正确跳转回原页面

### 常见问题

1. **无限重定向**: 检查回调地址配置是否正确
2. **授权失败**: 检查应用ID和权限范围配置
3. **跳转失败**: 检查sessionStorage中是否正确保存了原页面URL

## 相关文件

- `src/lib/task-api.ts` - 任务API服务和401错误处理
- `src/routes/auth/callback.tsx` - 授权回调页面
- `src/lib/auth-manager.ts` - WPS授权管理器
- `src/features/tasks/pages/tasks-page.tsx` - 任务页面（使用示例）

## 参考文档

- [WPS开放平台用户授权流程](https://365.kdocs.cn/3rd/open/documents/app-integration-dev/wps365/server/certification-authorization/user-authorization/flow.html)
- [OAuth2.0 RFC文档](https://tools.ietf.org/html/rfc6749) 