# WPS-3签名方式使用示例

## 概述

已成功实现WPS-3签名算法，用于获取WPS开放平台的服务端访问令牌。该实现完全符合WPS开放平台的WPS-3签名规范。

## 配置要求

确保在配置文件中正确设置WPS相关参数：

```typescript
// stratix.config.ts 或相关配置文件
export default {
  // ... 其他配置
  wps: {
    baseUrl: 'https://openapi.wps.cn',
    appid: 'your_wps_app_id',
    appkey: 'your_wps_app_key'
  }
}
```

## 使用方法

### 1. 基本使用

```typescript
import WPSApiService from './services/WPSApiService';

// 创建服务实例（通常通过依赖注入）
const wpsService = new WPSApiService(logger, {
  baseUrl: 'https://openapi.wps.cn',
  appid: 'your_app_id',
  appkey: 'your_app_key'
});

// 获取服务端访问令牌
try {
  const tokenResponse = await wpsService.getServerAccessToken();
  console.log('获取到的令牌:', tokenResponse);

  // 响应格式:
  // {
  //   result: 0,
  //   jsapi_token: "xxxxxx",
  //   expires_in: 7200
  // }

  // 使用服务端令牌获取JS-API调用凭证
  const ticketResponse = await wpsService.getJSAPITicket(tokenResponse.jsapi_token);
  console.log('获取到的ticket:', ticketResponse);

  // 响应格式:
  // {
  //   result: 0,
  //   ticket: "xxxxxx",
  //   expires_in: 7200
  // }
} catch (error) {
  console.error('获取令牌失败:', error);
}
```

### 2. 获取完整的JSAPI配置（推荐）

```typescript
// 一步到位获取前端所需的完整配置
try {
  const currentUrl = 'https://your-domain.com/current-page?param=value';
  const jsapiConfig = await wpsService.getWPSJSAPIConfig(currentUrl);

  console.log('JSAPI配置:', jsapiConfig);

  // 返回给前端的配置格式:
  // {
  //   appID: "your_app_id",
  //   timeStamp: 1609459200,
  //   nonceStr: "RandomStr16Chars",
  //   signature: "calculated_sha1_signature"
  // }

  // 前端可以直接使用这个配置初始化WPS JSAPI
} catch (error) {
  console.error('获取JSAPI配置失败:', error);
}
```

### 3. 在Stratix框架中使用

```typescript
// 在Controller中提供API接口
export default class WPSController {
  constructor(
    private readonly wpsApiService: WPSApiService
  ) {}

  @Post('/jsapi-config')
  async getJSAPIConfig(@Body() body: { url: string }) {
    const config = await this.wpsApiService.getWPSJSAPIConfig(body.url);
    return { success: true, data: config };
  }
}
```

## 签名算法详情

### 请求头要求

WPS-3签名需要以下HTTP头：

```http
Content-Type: application/json
Date: Wed, 23 Jan 2013 06:43:08 GMT
Content-Md5: d41d8cd98f00b204e9800998ecf8427e
X-Auth: WPS-3:your_app_id:generated_signature
```

### 签名生成步骤

1. **准备签名字符串**：
   ```
   signString = ToLower(SecretKey) + Content-Md5 + URL + Content-Type + Date
   ```

2. **计算SHA1哈希**：
   ```
   signature = SHA1(signString).toHexString()
   ```

3. **生成认证头**：
   ```
   X-Auth = "WPS-3:" + AppID + ":" + signature
   ```

### 实际示例

假设参数：
- AppID: `test_app`
- SecretKey: `SECRET123`
- URL: `/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_token`
- Date: `Wed, 23 Jan 2013 06:43:08 GMT`
- Body: `""` (空字符串)

计算过程：
```
Content-MD5 = MD5("") = "d41d8cd98f00b204e9800998ecf8427e"
signString = "secret123" + "d41d8cd98f00b204e9800998ecf8427e" + "/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_token" + "application/json" + "Wed, 23 Jan 2013 06:43:08 GMT"
signature = SHA1(signString)
X-Auth = "WPS-3:test_app:" + signature
```

## 错误处理

### 常见错误及解决方案

1. **签名验证失败**
   - 检查AppID和AppKey是否正确
   - 确认时间同步（Date头）
   - 验证URL路径是否完全匹配

2. **时间戳错误**
   - 确保服务器时间与WPS服务器时间同步
   - Date头必须使用RFC1123格式

3. **Content-MD5错误**
   - 确保计算的是请求体的MD5值
   - GET请求使用空字符串的MD5

### 调试技巧

启用调试日志查看签名详情：

```typescript
// 在日志中会看到类似信息：
{
  url: '/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_token',
  contentType: 'application/json',
  date: 'Wed, 23 Jan 2013 06:43:08 GMT',
  contentMd5: 'd41d8cd98f00b204e9800998ecf8427e',
  authHeader: 'WPS-3:your_app_id:...'
}
```

## 测试验证

运行测试脚本验证实现：

```bash
# 运行WPS-3签名测试
npx ts-node src/test/wps3-signature-test.ts
```

测试将验证：
- MD5计算正确性
- SHA1计算正确性
- RFC1123日期格式
- 完整签名流程
- X-Auth头格式

## 注意事项

1. **安全性**：
   - AppKey应该安全存储，不要暴露在客户端代码中
   - 使用HTTPS确保传输安全

2. **时间同步**：
   - 服务器时间必须准确，建议使用NTP同步
   - WPS服务器可能对时间差有限制

3. **字符编码**：
   - 所有字符串使用UTF-8编码
   - 哈希计算使用二进制数据

4. **缓存策略**：
   - 令牌有过期时间（通常7200秒）
   - 建议实现令牌缓存和自动刷新机制

## 前端集成示例

### HTML页面集成

```html
<!DOCTYPE html>
<html>
<head>
    <title>WPS JSAPI示例</title>
    <!-- 引入WPS JSAPI SDK -->
    <script src="https://wpscdn.cn/wps/jsapi/wps.js"></script>
</head>
<body>
    <button id="openDoc">打开文档</button>

    <script>
        // 从后端获取JSAPI配置
        async function initWPSJSAPI() {
            try {
                const response = await fetch('/api/wps/jsapi-config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: window.location.href
                    })
                });

                const result = await response.json();
                const config = result.data;

                // 初始化WPS JSAPI
                window.WPS.config({
                    appID: config.appID,
                    timeStamp: config.timeStamp,
                    nonceStr: config.nonceStr,
                    signature: config.signature,
                    jsApiList: [
                        'openDocument',
                        'saveDocument'
                    ]
                });

                window.WPS.ready(function() {
                    console.log('WPS JSAPI初始化成功');

                    // 绑定按钮事件
                    document.getElementById('openDoc').onclick = function() {
                        window.WPS.openDocument({
                            url: 'https://example.com/document.docx',
                            success: function(res) {
                                console.log('文档打开成功', res);
                            },
                            fail: function(err) {
                                console.error('文档打开失败', err);
                            }
                        });
                    };
                });

                window.WPS.error(function(res) {
                    console.error('WPS JSAPI初始化失败:', res);
                });

            } catch (error) {
                console.error('获取JSAPI配置失败:', error);
            }
        }

        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', initWPSJSAPI);
    </script>
</body>
</html>
```

### React组件示例

```typescript
import React, { useEffect, useState } from 'react';

interface WPSJSAPIConfig {
  appID: string;
  timeStamp: number;
  nonceStr: string;
  signature: string;
}

const WPSComponent: React.FC = () => {
  const [isWPSReady, setIsWPSReady] = useState(false);

  useEffect(() => {
    initWPSJSAPI();
  }, []);

  const initWPSJSAPI = async () => {
    try {
      const response = await fetch('/api/wps/jsapi-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: window.location.href
        })
      });

      const result = await response.json();
      const config: WPSJSAPIConfig = result.data;

      (window as any).WPS.config({
        appID: config.appID,
        timeStamp: config.timeStamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: ['openDocument', 'saveDocument']
      });

      (window as any).WPS.ready(() => {
        console.log('WPS JSAPI初始化成功');
        setIsWPSReady(true);
      });

      (window as any).WPS.error((res: any) => {
        console.error('WPS JSAPI初始化失败:', res);
      });

    } catch (error) {
      console.error('获取JSAPI配置失败:', error);
    }
  };

  const openDocument = () => {
    if (!isWPSReady) {
      alert('WPS JSAPI未就绪');
      return;
    }

    (window as any).WPS.openDocument({
      url: 'https://example.com/document.docx',
      success: (res: any) => {
        console.log('文档打开成功', res);
      },
      fail: (err: any) => {
        console.error('文档打开失败', err);
      }
    });
  };

  return (
    <div>
      <h2>WPS JSAPI示例</h2>
      <button onClick={openDocument} disabled={!isWPSReady}>
        {isWPSReady ? '打开文档' : 'WPS JSAPI加载中...'}
      </button>
    </div>
  );
};

export default WPSComponent;
```

## 后续开发建议

1. **令牌缓存**：实现令牌缓存机制，避免频繁请求
2. **自动重试**：添加网络错误的自动重试逻辑
3. **监控告警**：添加令牌获取失败的监控和告警
4. **性能优化**：考虑使用连接池优化HTTP请求性能
5. **前端缓存**：在前端缓存JSAPI配置，避免重复请求
