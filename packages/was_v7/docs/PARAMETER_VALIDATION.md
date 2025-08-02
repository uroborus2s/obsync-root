# WPS V7 插件参数验证指南

## 概述

@stratix/was-v7插件现已集成了完整的参数处理和验证功能，确保插件配置的正确性和安全性。

## 功能特性

### 1. 参数处理器 (parameterProcessor)
- **默认配置合并**: 自动合并用户配置和默认配置
- **必需参数检查**: 确保 `appId` 和 `appSecret` 存在
- **配置标准化**: 统一配置格式和数据类型

### 2. 参数验证器 (parameterValidator)
- **格式验证**: 验证各参数的格式和类型
- **范围检查**: 确保数值参数在合理范围内
- **安全验证**: 生产环境强制使用 HTTPS
- **详细错误**: 提供清晰的错误信息用于调试

## 默认配置

```typescript
const DEFAULT_OPTIONS = {
  baseUrl: 'https://openapi.wps.cn',
  timeout: 60000, // 60秒
  retryTimes: 3,
  debug: false
};
```

## 使用方式

### 1. 基本配置

```typescript
// stratix.config.ts
import wasV7Plugin from '@stratix/was-v7';

export default (sensitiveConfig: any): StratixConfig => {
  return {
    plugins: [
      {
        name: '@stratix/was-v7',
        plugin: wasV7Plugin,
        options: {
          // 必需参数
          appId: sensitiveConfig.wasV7.appId,
          appSecret: sensitiveConfig.wasV7.appSecret,
          
          // 可选参数（将使用默认值）
          // baseUrl: 'https://openapi.wps.cn',
          // timeout: 60000,
          // retryTimes: 3,
          // debug: false
        }
      }
    ]
  };
};
```

### 2. 自定义配置

```typescript
export default (sensitiveConfig: any): StratixConfig => {
  return {
    plugins: [
      {
        name: '@stratix/was-v7',
        plugin: wasV7Plugin,
        options: {
          appId: sensitiveConfig.wasV7.appId,
          appSecret: sensitiveConfig.wasV7.appSecret,
          
          // 自定义配置
          baseUrl: 'https://custom-api.wps.cn',
          timeout: 30000, // 30秒
          retryTimes: 5,
          debug: process.env.NODE_ENV === 'development'
        }
      }
    ]
  };
};
```

### 3. 开发环境配置

```typescript
export default (sensitiveConfig: any): StratixConfig => {
  return {
    plugins: [
      {
        name: '@stratix/was-v7',
        plugin: wasV7Plugin,
        options: {
          appId: sensitiveConfig.wasV7.appId,
          appSecret: sensitiveConfig.wasV7.appSecret,
          
          // 开发环境配置
          baseUrl: 'http://localhost:8080', // 开发环境允许 HTTP
          timeout: 10000,
          retryTimes: 1,
          debug: true // 启用调试日志
        }
      }
    ]
  };
};
```

## 参数验证规则

### appId
- **类型**: `string`
- **必需**: 是
- **验证**: 非空字符串
- **错误示例**: `''`, `'   '`, `null`, `undefined`, `123`

### appSecret
- **类型**: `string`
- **必需**: 是
- **验证**: 非空字符串
- **错误示例**: `''`, `'   '`, `null`, `undefined`, `123`

### baseUrl
- **类型**: `string`
- **必需**: 否
- **默认值**: `'https://openapi.wps.cn'`
- **验证**: 有效的URL格式，生产环境必须使用HTTPS
- **正确示例**: 
  - `'https://openapi.wps.cn'`
  - `'https://api.example.com'`
  - `'http://localhost:3000'` (仅调试模式)
- **错误示例**: 
  - `'invalid-url'`
  - `'http://api.example.com'` (生产环境)

### timeout
- **类型**: `number`
- **必需**: 否
- **默认值**: `60000` (60秒)
- **验证**: 1 到 300000 (5分钟) 之间的正数
- **正确示例**: `30000`, `60000`, `120000`
- **错误示例**: `0`, `-1000`, `400000`, `'30000'`

### retryTimes
- **类型**: `number`
- **必需**: 否
- **默认值**: `3`
- **验证**: 0 到 10 之间的整数
- **正确示例**: `0`, `3`, `5`, `10`
- **错误示例**: `-1`, `15`, `'3'`

### debug
- **类型**: `boolean`
- **必需**: 否
- **默认值**: `false`
- **验证**: 布尔值
- **正确示例**: `true`, `false`
- **错误示例**: `'true'`, `1`, `0`

## 错误处理

### 1. 参数验证错误

```typescript
try {
  // 插件加载
} catch (error) {
  if (error instanceof ParameterValidationError) {
    console.error(`配置错误 [${error.field}]: ${error.message}`);
    
    // 根据字段进行特定处理
    switch (error.field) {
      case 'appId':
        console.error('请检查 WPS 应用 ID 配置');
        break;
      case 'appSecret':
        console.error('请检查 WPS 应用密钥配置');
        break;
      case 'baseUrl':
        console.error('请检查 API 端点 URL 配置');
        break;
      default:
        console.error('请检查插件配置');
    }
  }
}
```

### 2. 常见错误及解决方案

#### 错误: "appId is required"
**原因**: 未提供 appId 参数
**解决**: 在插件配置中添加有效的 appId

```typescript
options: {
  appId: 'your-wps-app-id', // 添加这行
  appSecret: 'your-wps-app-secret'
}
```

#### 错误: "baseUrl must use HTTPS protocol in production"
**原因**: 生产环境使用了 HTTP 协议
**解决**: 使用 HTTPS 或启用调试模式

```typescript
options: {
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  baseUrl: 'https://api.example.com', // 使用 HTTPS
  // 或者启用调试模式
  debug: true
}
```

#### 错误: "timeout must be a positive number between 1 and 300000"
**原因**: timeout 值超出允许范围
**解决**: 设置合理的 timeout 值

```typescript
options: {
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  timeout: 60000 // 60秒，在允许范围内
}
```

## 调试功能

### 1. 启用调试日志

```typescript
options: {
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  debug: true // 启用调试模式
}
```

### 2. 调试日志输出

启用调试模式后，插件会输出配置信息（敏感信息已隐藏）：

```
WPS V7 plugin configuration: {
  appId: "your_app***",
  appSecret: "***",
  baseUrl: "https://openapi.wps.cn",
  timeout: 60000,
  retryTimes: 3,
  debug: true
}
```

## 最佳实践

### 1. 环境配置分离

```typescript
// 开发环境
const developmentConfig = {
  appId: process.env.WPS_DEV_APP_ID,
  appSecret: process.env.WPS_DEV_APP_SECRET,
  baseUrl: 'http://localhost:8080',
  debug: true,
  timeout: 10000
};

// 生产环境
const productionConfig = {
  appId: process.env.WPS_PROD_APP_ID,
  appSecret: process.env.WPS_PROD_APP_SECRET,
  baseUrl: 'https://openapi.wps.cn',
  debug: false,
  timeout: 60000
};

const config = process.env.NODE_ENV === 'production' 
  ? productionConfig 
  : developmentConfig;
```

### 2. 敏感信息保护

```typescript
// ❌ 不要在代码中硬编码敏感信息
options: {
  appId: 'hardcoded-app-id',
  appSecret: 'hardcoded-secret'
}

// ✅ 使用环境变量
options: {
  appId: process.env.WPS_APP_ID,
  appSecret: process.env.WPS_APP_SECRET
}
```

### 3. 配置验证

```typescript
// 在应用启动前验证配置
function validateConfig() {
  if (!process.env.WPS_APP_ID) {
    throw new Error('WPS_APP_ID environment variable is required');
  }
  if (!process.env.WPS_APP_SECRET) {
    throw new Error('WPS_APP_SECRET environment variable is required');
  }
}

validateConfig();
```

## 集成测试

插件提供了完整的参数验证测试用例，确保配置验证的正确性：

```bash
# 运行参数验证测试
cd packages/was_v7
pnpm test plugin-validation.test.ts
```

测试覆盖了所有参数的验证规则、错误处理和成功场景，确保插件配置的可靠性。
