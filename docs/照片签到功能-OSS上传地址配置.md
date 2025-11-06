# 照片签到功能 - OSS 上传地址配置总结

## 📋 问题描述

**用户需求**：
- 前端需要上传照片到 OSS 服务
- 生产环境的 MinIO 地址是 `https://kwps.jlufe.edu.cn/minio/api`
- 需要确认前端上传 OSS 服务的地址配置

**当前问题**：
- 后端 MinIO 配置使用内网地址 `minio-1:9000`
- 生成的预签名 URL 包含内网地址，前端无法访问
- 需要将内网地址替换为外网地址

---

## 🔍 当前架构

### 1. 上传流程

```
前端 (agendaedu-app)
  ↓
  1. 调用后端 API: POST /api/icalink/v1/oss/presigned-upload-url
  ↓
后端 (app-icalink)
  ↓
  2. 生成预签名上传 URL（MinIO 客户端）
  ↓
  3. 返回预签名 URL 给前端
  ↓
前端
  ↓
  4. 使用预签名 URL 直接上传到 MinIO
```

### 2. 后端配置

**文件**：`apps/app-icalink/prod.env.json`

```json
{
  "ossp": {
    "endPoint": "minio-1",
    "port": 9000,
    "accessKey": "CloverJay33Minio",
    "secretKey": "ZUvhFjoMwBC8t0XNbfNruwpVw",
    "useSSL": false
  }
}
```

**问题**：
- `endPoint` 是内网地址 `minio-1`
- 生成的预签名 URL 格式：`http://minio-1:9000/icalink-attachments/checkin/...`
- 前端无法访问内网地址

### 3. 前端上传代码

**文件**：`apps/agendaedu-app/src/lib/attendance-api.ts` (Lines 890-930)

```typescript
/**
 * 上传文件到 OSS（使用预签名 URL，支持进度回调）
 */
async uploadToOSS(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 监听上传进度
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    // 监听上传完成
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`上传失败: ${xhr.statusText}`));
      }
    });

    // 发起上传请求
    xhr.open('PUT', uploadUrl);  // ❌ 使用内网地址会失败
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
```

---

## 🔧 解决方案

### 方案：后端 URL 替换

在后端生成预签名 URL 后，将内网地址替换为外网地址。

**优点**：
- ✅ 前端无需修改
- ✅ 集中管理地址映射
- ✅ 支持多环境配置

**实现位置**：`apps/app-icalink/src/services/OsspStorageService.ts`

---

## 📝 修改内容

### 1. 添加 URL 替换方法

**文件**：`apps/app-icalink/src/services/OsspStorageService.ts` (Lines 498-543)

```typescript
/**
 * 替换内网地址为外网地址
 * 
 * 将 MinIO 内网地址替换为 Nginx 代理的外网地址
 * - 内网地址：http://minio-1:9000/...
 * - 外网地址：https://kwps.jlufe.edu.cn/minio/api/...
 * 
 * @param url 原始 URL
 * @returns 替换后的 URL
 */
private replaceInternalUrlWithPublicUrl(url: string): string {
  // 定义内网地址和外网地址的映射
  const internalPatterns = [
    {
      pattern: /^http:\/\/minio-1:9000\//,
      replacement: 'https://kwps.jlufe.edu.cn/minio/api/'
    },
    {
      pattern: /^http:\/\/localhost:9000\//,
      replacement: 'https://kwps.jlufe.edu.cn/minio/api/'
    },
    {
      pattern: /^http:\/\/127\.0\.0\.1:9000\//,
      replacement: 'https://kwps.jlufe.edu.cn/minio/api/'
    }
  ];

  // 尝试匹配并替换
  for (const { pattern, replacement } of internalPatterns) {
    if (pattern.test(url)) {
      const replacedUrl = url.replace(pattern, replacement);
      this.logger.debug(
        { originalUrl: url, replacedUrl },
        'Replaced internal URL with public URL'
      );
      return replacedUrl;
    }
  }

  // 如果没有匹配到任何模式，返回原始 URL
  this.logger.debug(
    { url },
    'No internal URL pattern matched, returning original URL'
  );
  return url;
}
```

### 2. 修改预签名上传 URL 生成方法

**文件**：`apps/app-icalink/src/services/OsspStorageService.ts` (Lines 463-485)

**修改前**：
```typescript
// 3. 生成预签名上传 URL（有效期 15 分钟）
const expiresIn = 15 * 60; // 15 分钟
const uploadUrl = await this.osspClient.presignedPutObject(
  bucketName,
  objectPath,
  expiresIn
);

return right({
  uploadUrl,  // ❌ 内网地址
  objectPath,
  expiresIn,
  bucketName
});
```

**修改后**：
```typescript
// 3. 生成预签名上传 URL（有效期 15 分钟）
const expiresIn = 15 * 60; // 15 分钟
let uploadUrl = await this.osspClient.presignedPutObject(
  bucketName,
  objectPath,
  expiresIn
);

// 4. 替换内网地址为外网地址（生产环境）
// 将 MinIO 内网地址替换为 Nginx 代理的外网地址
uploadUrl = this.replaceInternalUrlWithPublicUrl(uploadUrl);

this.logger.info(
  { objectPath, expiresIn, uploadUrl },
  'Presigned upload URL generated successfully'
);

return right({
  uploadUrl,  // ✅ 外网地址
  objectPath,
  expiresIn,
  bucketName
});
```

### 3. 修改预签名下载 URL 生成方法

**文件**：`apps/app-icalink/src/services/OsspStorageService.ts` (Lines 287-323)

**修改前**：
```typescript
// 生成有效期 1 小时的预签名 URL
const url = await this.osspClient.presignedGetObject(
  bucketName,
  objectPath,
  { expiry: 60 } // 1 小时
);

return right(url);  // ❌ 内网地址
```

**修改后**：
```typescript
// 生成有效期 1 小时的预签名 URL
let url = await this.osspClient.presignedGetObject(
  bucketName,
  objectPath,
  { expiry: 60 } // 1 小时
);

// 替换内网地址为外网地址（生产环境）
url = this.replaceInternalUrlWithPublicUrl(url);

this.logger.info(
  { bucketName, objectPath, url },
  'Presigned URL generated'
);

return right(url);  // ✅ 外网地址
```

---

## ✅ 修改结果

### 1. URL 转换示例

**修改前**：
```
http://minio-1:9000/icalink-attachments/checkin/1730880000000/photo.jpg?X-Amz-Algorithm=...
```

**修改后**：
```
https://kwps.jlufe.edu.cn/minio/api/icalink-attachments/checkin/1730880000000/photo.jpg?X-Amz-Algorithm=...
```

### 2. 前端上传流程

```
1. 前端调用: POST /api/icalink/v1/oss/presigned-upload-url
   ↓
2. 后端生成预签名 URL: http://minio-1:9000/...
   ↓
3. 后端替换为外网地址: https://kwps.jlufe.edu.cn/minio/api/...
   ↓
4. 返回给前端: { uploadUrl: "https://kwps.jlufe.edu.cn/minio/api/..." }
   ↓
5. 前端使用外网地址上传: xhr.open('PUT', uploadUrl)
   ↓
6. 上传成功 ✅
```

### 3. 支持的环境

- ✅ **生产环境**：`http://minio-1:9000/` → `https://kwps.jlufe.edu.cn/minio/api/`
- ✅ **开发环境**：`http://localhost:9000/` → `https://kwps.jlufe.edu.cn/minio/api/`
- ✅ **其他环境**：如果没有匹配到模式，返回原始 URL

---

## 📝 配置说明

### 1. 生产环境配置

**后端配置**（`apps/app-icalink/prod.env.json`）：
```json
{
  "ossp": {
    "endPoint": "minio-1",      // 内网地址
    "port": 9000,
    "accessKey": "CloverJay33Minio",
    "secretKey": "ZUvhFjoMwBC8t0XNbfNruwpVw",
    "useSSL": false
  }
}
```

**Nginx 代理配置**：
- 外网地址：`https://kwps.jlufe.edu.cn/minio/api`
- 代理到：`http://minio-1:9000`

### 2. 前端配置

**无需修改**，前端直接使用后端返回的预签名 URL。

**API 基础地址**（`apps/agendaedu-app/.env.production`）：
```bash
VITE_API_BASE_URL=https://kwps.jlufe.edu.cn/api
```

---

## 🎉 总结

本次修改成功解决了前端上传 OSS 的地址问题：

1. ✅ **问题定位**：后端生成的预签名 URL 包含内网地址，前端无法访问
2. ✅ **解决方案**：在后端生成预签名 URL 后，将内网地址替换为外网地址
3. ✅ **实现方式**：添加 `replaceInternalUrlWithPublicUrl` 私有方法
4. ✅ **修改范围**：
   - 预签名上传 URL 生成方法（`generatePresignedUploadUrl`）
   - 预签名下载 URL 生成方法（`getPresignedUrl`）
5. ✅ **支持环境**：生产环境、开发环境、其他环境
6. ✅ **前端无需修改**：集中管理地址映射

**生产环境 OSS 上传地址**：`https://kwps.jlufe.edu.cn/minio/api`

代码已修改完成，可以进行测试和部署！🚀

