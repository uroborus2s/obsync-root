# HTTP状态码错误处理机制验证指南

## 概述

本文档描述了agendaedu-web前端项目中实现的HTTP状态码错误处理机制，包括401未授权和403权限不足的处理流程。

## 实现的功能

### 1. 401未授权处理
- **自动重定向**：检测到401错误时自动重定向到WPS登录页面
- **保存返回路径**：保存当前页面路径，登录成功后返回原页面
- **清除认证信息**：清除本地存储的认证token
- **用户友好界面**：提供倒计时自动跳转和手动登录选项

### 2. 403权限不足处理
- **错误日志记录**：详细记录权限错误信息用于调试
- **专用错误页面**：显示用户友好的权限不足提示
- **错误详情展示**：可展开查看详细的错误信息
- **联系支持功能**：提供联系技术支持的便捷方式

## 手动验证步骤

### 验证401错误处理

1. **模拟401错误**
   ```javascript
   // 在浏览器控制台执行
   fetch('/api/protected-endpoint', {
     method: 'GET',
     headers: {
       'Authorization': 'Bearer invalid-token'
     }
   })
   ```

2. **预期行为**
   - 控制台显示401错误日志
   - 自动保存当前页面路径
   - 10秒倒计时后自动跳转到登录页面
   - 或用户可点击"立即登录"按钮

3. **验证点**
   - [ ] 错误日志正确记录
   - [ ] 页面路径已保存到sessionStorage
   - [ ] 401错误页面正确显示
   - [ ] 自动跳转功能正常
   - [ ] 手动登录按钮可用

### 验证403错误处理

1. **模拟403错误**
   ```javascript
   // 在浏览器控制台执行
   fetch('/api/admin-only-endpoint', {
     method: 'DELETE',
     headers: {
       'Content-Type': 'application/json'
     }
   })
   ```

2. **预期行为**
   - 控制台显示403权限错误日志
   - 错误信息存储到sessionStorage
   - 自动跳转到403错误页面
   - 显示详细的错误信息

3. **验证点**
   - [ ] 权限错误日志正确记录
   - [ ] 错误详情存储到sessionStorage
   - [ ] 403错误页面正确显示
   - [ ] 错误详情可以展开查看
   - [ ] 联系支持功能可用

## 技术实现验证

### API拦截器验证

1. **检查响应拦截器**
   ```typescript
   // 在 apps/agendaedu-web/src/lib/api-client.ts
   // 验证401和403错误处理逻辑已正确实现
   ```

2. **验证点**
   - [ ] 401错误调用handle401Error函数
   - [ ] 403错误调用handle403Error函数
   - [ ] 错误信息正确传递给处理函数

### 错误处理工具函数验证

1. **检查工具函数**
   ```typescript
   // 在 apps/agendaedu-web/src/utils/error-handler.ts
   // 验证错误信息提取和日志记录功能
   ```

2. **验证点**
   - [ ] extractErrorInfo正确提取错误信息
   - [ ] handle401Error正确处理401错误
   - [ ] handle403Error正确处理403错误并存储信息

### 错误页面组件验证

1. **401错误页面**
   ```typescript
   // 在 apps/agendaedu-web/src/features/errors/unauthorized-error.tsx
   // 验证自动重定向和用户交互功能
   ```

2. **403错误页面**
   ```typescript
   // 在 apps/agendaedu-web/src/features/errors/forbidden.tsx
   // 验证错误详情显示和支持联系功能
   ```

## 浏览器测试场景

### 场景1：用户会话过期
1. 用户正在浏览某个页面
2. 会话在后台过期
3. 用户执行需要认证的操作
4. 系统检测到401错误并自动处理

### 场景2：权限不足访问
1. 普通用户尝试访问管理员功能
2. 系统返回403错误
3. 显示权限不足页面
4. 用户可查看错误详情并联系支持

### 场景3：网络错误处理
1. 网络连接不稳定
2. API请求失败
3. 系统显示适当的错误提示
4. 用户可重试操作

## 日志监控

### 控制台日志格式
```
🔒 权限错误: {
  type: "UNAUTHORIZED",
  url: "/api/protected",
  method: "GET",
  status: 401,
  timestamp: "2025-01-23T10:30:00.000Z",
  currentPath: "https://example.com/dashboard"
}
```

### SessionStorage存储
```
Key: "last_403_error"
Value: {
  "url": "/api/admin",
  "method": "DELETE",
  "status": 403,
  "message": "权限不足",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "currentPath": "https://example.com/admin"
}
```

## 故障排除

### 常见问题

1. **401错误未自动跳转**
   - 检查authManager是否正确导入
   - 验证WPS认证配置是否正确
   - 确认redirectToAuth方法可用

2. **403错误页面未显示错误详情**
   - 检查sessionStorage中是否有错误信息
   - 验证getStoredErrorInfo函数是否正常工作
   - 确认错误信息格式正确

3. **错误日志未记录**
   - 检查控制台是否有JavaScript错误
   - 验证错误处理函数是否被调用
   - 确认日志级别配置正确

## 性能考虑

- 错误信息存储使用sessionStorage，页面关闭后自动清除
- 错误日志仅在开发环境详细记录，生产环境简化
- 自动跳转使用setTimeout避免阻塞用户界面
- 错误处理不影响正常业务流程的性能

## 安全考虑

- 敏感信息不记录在错误日志中
- 用户认证信息在401错误时立即清除
- 错误详情仅在必要时显示给用户
- 支持联系功能不暴露系统内部信息
