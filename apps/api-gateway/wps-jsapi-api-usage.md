# WPS JSAPI API 使用指南

## 概述

修改后的`getWPSJSAPITicket`方法现在返回完整的WPS JSAPI配置信息，包含前端初始化所需的所有参数。

## API 接口

### 1. 获取WPS JSAPI配置（推荐使用）

**接口地址**: `GET /api/auth/wps/jsapi-ticket?url={页面URL}`

**请求参数**:
- `url` (必需): 当前页面的完整URL，用于签名计算

**响应格式**:
```json
{
  "success": true,
  "data": {
    "appID": "your_wps_app_id",
    "timeStamp": 1609459200,
    "nonceStr": "RandomStr16Chars",
    "signature": "calculated_sha1_signature"
  },
  "message": "WPS JSAPI配置获取成功"
}
```

**使用示例**:
```javascript
// 前端调用示例
const currentUrl = encodeURIComponent(window.location.href);
const response = await fetch(`/api/auth/wps/jsapi-ticket?url=${currentUrl}`);
const result = await response.json();

if (result.success) {
  const config = result.data;
  
  // 直接使用返回的配置初始化WPS JSAPI
  window.WPS.config({
    appID: config.appID,
    timeStamp: config.timeStamp,
    nonceStr: config.nonceStr,
    signature: config.signature,
    jsApiList: [
      'openDocument',
      'saveDocument',
      'closeDocument'
    ]
  });
  
  window.WPS.ready(function() {
    console.log('WPS JSAPI初始化成功');
  });
  
  window.WPS.error(function(res) {
    console.error('WPS JSAPI初始化失败:', res);
  });
}
```

### 2. 获取服务端访问令牌（可选）

**接口地址**: `GET /api/auth/wps/server-token`

**响应格式**:
```json
{
  "success": true,
  "data": {
    "jsapi_token": "server_access_token_string",
    "expires_in": 7200,
    "token_type": "Bearer"
  },
  "message": "服务端访问令牌获取成功"
}
```

## 完整的前端集成示例

### HTML + JavaScript

```html
<!DOCTYPE html>
<html>
<head>
    <title>WPS JSAPI集成示例</title>
    <script src="https://wpscdn.cn/wps/jsapi/wps.js"></script>
</head>
<body>
    <div id="app">
        <h1>WPS文档操作</h1>
        <button id="openDoc" disabled>打开文档</button>
        <button id="saveDoc" disabled>保存文档</button>
        <div id="status">正在初始化WPS JSAPI...</div>
    </div>

    <script>
        class WPSManager {
            constructor() {
                this.isReady = false;
                this.init();
            }

            async init() {
                try {
                    await this.initWPSJSAPI();
                } catch (error) {
                    console.error('WPS JSAPI初始化失败:', error);
                    document.getElementById('status').textContent = 'WPS JSAPI初始化失败';
                }
            }

            async initWPSJSAPI() {
                // 获取当前页面URL
                const currentUrl = encodeURIComponent(window.location.href);
                
                // 调用后端API获取JSAPI配置
                const response = await fetch(`/api/auth/wps/jsapi-ticket?url=${currentUrl}`);
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.message || '获取JSAPI配置失败');
                }

                const config = result.data;

                // 初始化WPS JSAPI
                window.WPS.config({
                    appID: config.appID,
                    timeStamp: config.timeStamp,
                    nonceStr: config.nonceStr,
                    signature: config.signature,
                    jsApiList: [
                        'openDocument',
                        'saveDocument',
                        'closeDocument',
                        'getFileInfo'
                    ]
                });

                // 设置回调
                window.WPS.ready(() => {
                    this.onWPSReady();
                });

                window.WPS.error((res) => {
                    this.onWPSError(res);
                });
            }

            onWPSReady() {
                console.log('WPS JSAPI初始化成功');
                this.isReady = true;
                
                // 更新UI状态
                document.getElementById('status').textContent = 'WPS JSAPI已就绪';
                document.getElementById('openDoc').disabled = false;
                document.getElementById('saveDoc').disabled = false;

                // 绑定事件
                this.bindEvents();
            }

            onWPSError(res) {
                console.error('WPS JSAPI初始化失败:', res);
                document.getElementById('status').textContent = `WPS JSAPI初始化失败: ${res.errMsg}`;
            }

            bindEvents() {
                document.getElementById('openDoc').onclick = () => {
                    this.openDocument();
                };

                document.getElementById('saveDoc').onclick = () => {
                    this.saveDocument();
                };
            }

            openDocument() {
                if (!this.isReady) {
                    alert('WPS JSAPI未就绪');
                    return;
                }

                window.WPS.openDocument({
                    url: 'https://example.com/sample.docx',
                    success: (res) => {
                        console.log('文档打开成功:', res);
                        alert('文档打开成功');
                    },
                    fail: (err) => {
                        console.error('文档打开失败:', err);
                        alert('文档打开失败: ' + err.errMsg);
                    }
                });
            }

            saveDocument() {
                if (!this.isReady) {
                    alert('WPS JSAPI未就绪');
                    return;
                }

                window.WPS.saveDocument({
                    success: (res) => {
                        console.log('文档保存成功:', res);
                        alert('文档保存成功');
                    },
                    fail: (err) => {
                        console.error('文档保存失败:', err);
                        alert('文档保存失败: ' + err.errMsg);
                    }
                });
            }
        }

        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', () => {
            new WPSManager();
        });
    </script>
</body>
</html>
```

### React 组件示例

```typescript
import React, { useEffect, useState } from 'react';

interface WPSJSAPIConfig {
  appID: string;
  timeStamp: number;
  nonceStr: string;
  signature: string;
}

const WPSDocumentManager: React.FC = () => {
  const [isWPSReady, setIsWPSReady] = useState(false);
  const [status, setStatus] = useState('正在初始化WPS JSAPI...');

  useEffect(() => {
    initWPSJSAPI();
  }, []);

  const initWPSJSAPI = async () => {
    try {
      const currentUrl = encodeURIComponent(window.location.href);
      const response = await fetch(`/api/auth/wps/jsapi-ticket?url=${currentUrl}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '获取JSAPI配置失败');
      }

      const config: WPSJSAPIConfig = result.data;

      (window as any).WPS.config({
        appID: config.appID,
        timeStamp: config.timeStamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: ['openDocument', 'saveDocument', 'closeDocument']
      });

      (window as any).WPS.ready(() => {
        console.log('WPS JSAPI初始化成功');
        setIsWPSReady(true);
        setStatus('WPS JSAPI已就绪');
      });

      (window as any).WPS.error((res: any) => {
        console.error('WPS JSAPI初始化失败:', res);
        setStatus(`WPS JSAPI初始化失败: ${res.errMsg}`);
      });

    } catch (error) {
      console.error('WPS JSAPI初始化失败:', error);
      setStatus('WPS JSAPI初始化失败');
    }
  };

  const openDocument = () => {
    if (!isWPSReady) {
      alert('WPS JSAPI未就绪');
      return;
    }

    (window as any).WPS.openDocument({
      url: 'https://example.com/sample.docx',
      success: (res: any) => {
        console.log('文档打开成功:', res);
        alert('文档打开成功');
      },
      fail: (err: any) => {
        console.error('文档打开失败:', err);
        alert('文档打开失败: ' + err.errMsg);
      }
    });
  };

  return (
    <div>
      <h1>WPS文档管理器</h1>
      <div>状态: {status}</div>
      <button onClick={openDocument} disabled={!isWPSReady}>
        打开文档
      </button>
    </div>
  );
};

export default WPSDocumentManager;
```

## 错误处理

### 常见错误及解决方案

1. **URL参数缺失**
   ```json
   {
     "success": false,
     "error": "MISSING_URL",
     "message": "缺少页面URL参数"
   }
   ```
   解决方案: 确保请求中包含正确的URL参数

2. **签名验证失败**
   ```json
   {
     "success": false,
     "error": "JSAPI_CONFIG_ERROR",
     "message": "获取WPS JSAPI配置失败"
   }
   ```
   解决方案: 检查WPS应用配置和网络连接

3. **WPS JSAPI初始化失败**
   - 检查WPS JSAPI SDK是否正确加载
   - 确认返回的配置参数格式正确
   - 验证当前域名是否在WPS应用白名单中

## 注意事项

1. **URL编码**: 传递给API的URL参数需要进行URL编码
2. **域名白名单**: 确保当前域名已添加到WPS应用的安全域名白名单中
3. **HTTPS要求**: 生产环境建议使用HTTPS协议
4. **缓存策略**: 可以在前端缓存配置信息，避免重复请求
5. **错误重试**: 建议实现网络错误的自动重试机制

现在您可以直接使用修改后的API接口获取完整的WPS JSAPI配置信息，简化前端集成流程。
