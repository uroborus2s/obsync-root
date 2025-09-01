# WPS-3签名完整工作流程

## 概述

现在WPSApiService已经完全支持WPS-3签名方式，包括：
1. `getServerAccessToken()` - 获取服务端访问令牌
2. `getJSAPITicket(accessToken)` - 获取JS-API调用凭证

两个方法都使用相同的WPS-3签名算法，确保与WPS开放平台的安全认证。

## 完整工作流程

### 步骤1: 配置WPS服务

```typescript
// 在配置文件中设置WPS参数
const wpsConfig = {
  baseUrl: 'https://openapi.wps.cn',
  appid: 'your_wps_app_id',
  appkey: 'your_wps_app_key'
};

// 创建WPS服务实例
const wpsService = new WPSApiService(logger, wpsConfig);
```

### 步骤2: 获取服务端访问令牌

```typescript
try {
  // 使用WPS-3签名获取服务端令牌
  const tokenResponse = await wpsService.getServerAccessToken();
  
  console.log('服务端令牌获取成功:', {
    result: tokenResponse.result,
    jsapi_token: tokenResponse.jsapi_token,
    expires_in: tokenResponse.expires_in
  });
  
  // 保存令牌用于后续使用
  const serverToken = tokenResponse.jsapi_token;
  
} catch (error) {
  console.error('获取服务端令牌失败:', error);
  throw error;
}
```

### 步骤3: 获取JS-API调用凭证

```typescript
try {
  // 使用服务端令牌获取JS-API ticket
  const ticketResponse = await wpsService.getJSAPITicket(serverToken);
  
  console.log('JS-API凭证获取成功:', {
    result: ticketResponse.result,
    ticket: ticketResponse.ticket,
    expires_in: ticketResponse.expires_in
  });
  
  // 使用ticket进行JS-API调用
  const jsapiTicket = ticketResponse.ticket;
  
} catch (error) {
  console.error('获取JS-API凭证失败:', error);
  throw error;
}
```

### 步骤4: 完整的集成示例

```typescript
export class WPSIntegrationService {
  constructor(private wpsApiService: WPSApiService) {}

  /**
   * 获取WPS JS-API所需的完整凭证信息
   */
  async getWPSCredentials(): Promise<{
    serverToken: string;
    jsapiTicket: string;
    expiresIn: number;
  }> {
    try {
      // 1. 获取服务端访问令牌
      const tokenResponse = await this.wpsApiService.getServerAccessToken();
      
      if (tokenResponse.result !== 0) {
        throw new Error(`获取服务端令牌失败: ${tokenResponse.result}`);
      }

      // 2. 获取JS-API调用凭证
      const ticketResponse = await this.wpsApiService.getJSAPITicket(
        tokenResponse.jsapi_token
      );
      
      if (ticketResponse.result !== 0) {
        throw new Error(`获取JS-API凭证失败: ${ticketResponse.result}`);
      }

      return {
        serverToken: tokenResponse.jsapi_token,
        jsapiTicket: ticketResponse.ticket,
        expiresIn: Math.min(tokenResponse.expires_in, ticketResponse.expires_in)
      };
      
    } catch (error) {
      console.error('WPS凭证获取失败:', error);
      throw error;
    }
  }

  /**
   * 带缓存的凭证获取（推荐用于生产环境）
   */
  private credentialsCache: {
    data?: any;
    expiresAt?: number;
  } = {};

  async getCachedWPSCredentials() {
    const now = Date.now();
    
    // 检查缓存是否有效（提前5分钟过期）
    if (
      this.credentialsCache.data && 
      this.credentialsCache.expiresAt && 
      now < this.credentialsCache.expiresAt - 300000
    ) {
      return this.credentialsCache.data;
    }

    // 获取新的凭证
    const credentials = await this.getWPSCredentials();
    
    // 更新缓存
    this.credentialsCache = {
      data: credentials,
      expiresAt: now + (credentials.expiresIn * 1000)
    };

    return credentials;
  }
}
```

## WPS-3签名详细流程

### 对于getServerAccessToken

1. **请求信息**:
   - URL: `/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_token`
   - Method: GET
   - Body: 空字符串

2. **签名计算**:
   ```
   Content-MD5 = MD5("") = "d41d8cd98f00b204e9800998ecf8427e"
   Date = RFC1123格式的当前时间
   SignString = ToLower(AppKey) + Content-MD5 + URL + "application/json" + Date
   Signature = SHA1(SignString)
   X-Auth = "WPS-3:" + AppID + ":" + Signature
   ```

### 对于getJSAPITicket

1. **请求信息**:
   - URL: `/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_ticket?jsapi_token=ACCESS_TOKEN`
   - Method: GET
   - Body: 空字符串

2. **签名计算**:
   ```
   Content-MD5 = MD5("") = "d41d8cd98f00b204e9800998ecf8427e"
   Date = RFC1123格式的当前时间
   SignString = ToLower(AppKey) + Content-MD5 + URL_WITH_QUERY + "application/json" + Date
   Signature = SHA1(SignString)
   X-Auth = "WPS-3:" + AppID + ":" + Signature
   ```

## 错误处理最佳实践

```typescript
async function handleWPSApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof Error) {
      // 记录详细错误信息
      console.error('WPS API调用失败:', {
        message: error.message,
        stack: error.stack
      });
      
      // 根据错误类型进行不同处理
      if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('WPS API认证失败，请检查AppID和AppKey');
      } else if (error.message.includes('timeout')) {
        throw new Error('WPS API请求超时，请稍后重试');
      } else {
        throw new Error(`WPS API调用失败: ${error.message}`);
      }
    }
    throw error;
  }
}

// 使用示例
const credentials = await handleWPSApiCall(() => 
  integrationService.getWPSCredentials()
);
```

## 监控和日志

建议在生产环境中添加以下监控：

```typescript
// 1. 性能监控
const startTime = Date.now();
const credentials = await wpsService.getServerAccessToken();
const duration = Date.now() - startTime;

console.log('WPS API性能指标:', {
  operation: 'getServerAccessToken',
  duration: `${duration}ms`,
  success: true
});

// 2. 错误率监控
let successCount = 0;
let errorCount = 0;

// 在每次API调用后更新计数器
// 定期报告错误率
setInterval(() => {
  const total = successCount + errorCount;
  const errorRate = total > 0 ? (errorCount / total) * 100 : 0;
  
  console.log('WPS API错误率:', {
    errorRate: `${errorRate.toFixed(2)}%`,
    successCount,
    errorCount,
    total
  });
}, 60000); // 每分钟报告一次
```

## 安全注意事项

1. **AppKey保护**: 确保AppKey不会暴露在客户端代码或日志中
2. **HTTPS使用**: 所有WPS API调用都应使用HTTPS
3. **令牌管理**: 实现安全的令牌存储和刷新机制
4. **访问控制**: 限制对WPS凭证的访问权限
5. **日志脱敏**: 在日志中隐藏敏感信息（如完整的签名）

现在您的WPS API服务已经完全支持WPS-3签名方式，可以安全可靠地与WPS开放平台进行交互了。
