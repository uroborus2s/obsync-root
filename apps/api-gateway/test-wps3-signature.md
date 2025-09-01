# WPS-3签名算法实现测试文档

## 实现说明

根据WPS开放平台的WPS-3签名算法规范，已实现了新的`getServerAccessToken`方法。

### 签名算法核心要素

1. **Header要求**：
   - `Content-Type`: `application/json`
   - `Date`: RFC1123格式的日期（如：Wed, 23 Jan 2013 06:43:08 GMT）
   - `Content-Md5`: HTTP请求Body的MD5值（十六进制字符串）
   - `X-Auth`: WPS-3签名

2. **签名生成步骤**：
   ```
   SIGN = sha1(ToLower(SecretKey) + Content-Md5 + URL + Content-Type + Date).HexString()
   X-Auth = "WPS-3:" + AppID + ":" + SIGN
   ```

### 实现的方法

#### 1. 辅助方法
- `generateRFC1123Date()`: 生成RFC1123格式的日期
- `calculateMD5(content)`: 计算MD5哈希值
- `calculateSHA1(content)`: 计算SHA1哈希值
- `generateWPS3Signature()`: 生成WPS-3签名
- `generateWPS3AuthHeader()`: 生成认证头

#### 2. 主要方法
- `getServerAccessToken()`: 使用WPS-3签名获取服务端凭证
- `getJSAPITicket(accessToken)`: 使用WPS-3签名获取JS-API调用凭证

### 请求示例

#### 1. getServerAccessToken 请求示例

```typescript
// 请求URL
const requestUrl = '/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_token';

// 请求头
const headers = {
  'Content-Type': 'application/json',
  'Date': 'Wed, 23 Jan 2013 06:43:08 GMT',
  'Content-Md5': 'd41d8cd98f00b204e9800998ecf8427e', // 空字符串的MD5
  'X-Auth': 'WPS-3:your_app_id:generated_signature',
  'User-Agent': 'Stratix-Gateway/1.0.0'
};
```

#### 2. getJSAPITicket 请求示例

```typescript
// 请求URL（包含jsapi_token参数）
const requestUrl = '/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_ticket?jsapi_token=your_access_token';

// 请求头
const headers = {
  'Content-Type': 'application/json',
  'Date': 'Wed, 23 Jan 2013 06:43:08 GMT',
  'Content-Md5': 'd41d8cd98f00b204e9800998ecf8427e', // 空字符串的MD5
  'X-Auth': 'WPS-3:your_app_id:generated_signature',
  'User-Agent': 'Stratix-Gateway/1.0.0'
};
```

### 签名计算示例

假设：
- AppID: `test_app_id`
- SecretKey: `test_secret_key`
- URL: `/kopen/woa/api/v1/developer/app/sdk/auth/jsapi_token`
- Content-Type: `application/json`
- Date: `Wed, 23 Jan 2013 06:43:08 GMT`
- Content-Md5: `d41d8cd98f00b204e9800998ecf8427e` (空字符串的MD5)

签名字符串：
```
test_secret_key + d41d8cd98f00b204e9800998ecf8427e + /kopen/woa/api/v1/developer/app/sdk/auth/jsapi_token + application/json + Wed, 23 Jan 2013 06:43:08 GMT
```

最终X-Auth头：
```
WPS-3:test_app_id:calculated_sha1_hash
```

## 测试方法

### 1. 单元测试
可以创建单元测试来验证各个辅助方法：

```typescript
// 测试MD5计算
const md5 = service.calculateMD5('');
console.log(md5); // 应该输出: d41d8cd98f00b204e9800998ecf8427e

// 测试SHA1计算
const sha1 = service.calculateSHA1('test');
console.log(sha1); // 应该输出: a94a8fe5ccb19ba61c4c0873d391e987982fbbd3

// 测试RFC1123日期格式
const date = service.generateRFC1123Date();
console.log(date); // 应该输出类似: Wed, 23 Jan 2013 06:43:08 GMT
```

### 2. 集成测试
调用实际的WPS API来验证签名是否正确：

```typescript
const wpsService = new WPSApiService(logger, {
  baseUrl: 'https://openapi.wps.cn',
  appid: 'your_app_id',
  appkey: 'your_app_key'
});

try {
  const token = await wpsService.getServerAccessToken();
  console.log('Token obtained successfully:', token);
} catch (error) {
  console.error('Failed to get token:', error);
}
```

## 注意事项

1. **时间同步**: 确保服务器时间与WPS服务器时间同步，避免因时间差导致签名验证失败
2. **字符编码**: 所有字符串都使用UTF-8编码
3. **大小写**: SecretKey需要转换为小写
4. **URL格式**: URL只包含路径和查询参数，不包含域名
5. **Content-Md5**: 即使是GET请求，也需要计算空字符串的MD5值

## 错误排查

如果遇到签名验证失败，可以检查：

1. **AppID和AppKey**: 确保配置正确
2. **时间格式**: 确保Date头使用RFC1123格式
3. **URL路径**: 确保URL路径完全匹配
4. **字符串拼接**: 确保签名字符串的拼接顺序正确
5. **哈希算法**: 确保使用正确的MD5和SHA1算法

## 调试日志

实现中包含了详细的调试日志：

```typescript
this.logger.debug('WPS-3 signature details', {
  url: requestUrl,
  contentType,
  date,
  contentMd5,
  authHeader: authHeader.substring(0, 20) + '...'
});
```

这些日志可以帮助排查签名生成过程中的问题。

## 预期响应

成功的响应格式：
```json
{
  "result": 0,
  "jsapi_token": "xxxxxx",
  "expires_in": 7200
}
```

失败的响应可能包含错误码和错误信息，需要根据具体错误进行调试。
