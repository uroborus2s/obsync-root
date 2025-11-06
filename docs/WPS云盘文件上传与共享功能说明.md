# WPS 云盘文件上传与共享功能完整实现

## 📋 功能概述

本文档记录了 WPS 云盘文件上传功能的完整实现，包括：

1. **文件上传**：后端代理上传模式，解决 CORS 问题
2. **自动共享**：上传完成后自动开启文件共享
3. **共享链接**：获取并返回文件的共享链接 URL

---

## 🔄 完整上传流程（四步）

### 步骤1：请求上传许可 (requestUpload)

```typescript
const uploadInfo = await this.wasV7ApiDrive.requestUpload({
  drive_id: driveId,
  parent_id: parentId,
  name: fileName,
  size: fileSize,
  hashes: [{ sum: fileHash, type: 'sha256' }],
  on_name_conflict: 'rename'
});
```

**返回**：
- `upload_id`: 上传任务ID
- `store_request.url`: 存储服务器上传URL
- `store_request.headers`: 上传所需的请求头

---

### 步骤2：上传文件到存储服务器 (uploadFileToStorage)

```typescript
await this.wasV7ApiDrive.uploadFileToStorage(
  uploadInfo.store_request.url,
  fileBuffer,
  contentType,
  uploadInfo.store_request.headers
);
```

**说明**：
- 使用 `axios.put()` 直接上传到 WPS 存储服务器
- 不使用 `httpClient`，因为存储服务器不需要 KSO-1 签名
- 文件已上传到存储，但 WPS API 还不知道

---

### 步骤3：完成上传确认 (completeUpload)

```typescript
const fileInfo = await this.wasV7ApiDrive.completeUpload({
  drive_id: driveId,
  upload_id: uploadInfo.upload_id,
  name: fileName,
  size: fileSize,
  parent_id: parentId
});
```

**返回**：
- `file_id`: 文件ID
- `name`: 文件名
- `size`: 文件大小
- `ctime`: 创建时间
- 其他文件元数据

**说明**：
- ✅ 此时文件才真正完成上传
- ✅ 文件会出现在云盘列表中
- ✅ 可以通过 WPS API 查询、下载、分享

---

### 步骤4：开启共享并获取链接（新增）

```typescript
// 4.1 开启文件分享
await this.wasV7ApiDrive.openLinkOfFile({
  drive_id: driveId,
  file_id: fileInfo.file_id,
  scope: 'company' // 公司范围
});

// 4.2 重新获取文件元数据以获取共享链接
const updatedFileInfo = await this.wasV7ApiDrive.getFileMeta({
  file_id: fileInfo.file_id,
  with_permission: false,
  with_ext_attrs: false,
  with_drive: false
});

const shareUrl = updatedFileInfo.link_url;
```

**说明**：
- `openLinkOfFile` 只返回 `{ code: number }`，不直接返回链接
- 需要调用 `getFileMeta` 重新获取文件信息
- `link_url` 字段包含共享链接
- 如果共享失败，不影响文件上传成功状态

---

## 📝 代码实现

### Service 层 (WpsDriveService.ts)

```typescript
public async uploadFile(
  driveId: string,
  parentId: string,
  fileName: string,
  fileBuffer: Buffer,
  fileSize: number,
  contentType: string,
  fileHash: string
): Promise<{
  success: boolean;
  data?: CompleteUploadResponse & {
    shareUrl?: string;
    shareEnabled?: boolean;
  };
  error?: string;
}> {
  try {
    // 步骤1-3: 上传文件（省略）
    
    // 步骤4: 设置文件为可共享状态并获取共享链接
    let shareUrl: string | undefined;
    let shareEnabled = false;

    try {
      // 开启文件分享（公司范围）
      await this.wasV7ApiDrive.openLinkOfFile({
        drive_id: driveId,
        file_id: fileInfo.file_id,
        scope: 'company'
      });

      // 重新获取文件元数据以获取共享链接
      const updatedFileInfo = await this.wasV7ApiDrive.getFileMeta({
        file_id: fileInfo.file_id
      });

      shareUrl = updatedFileInfo.link_url;
      shareEnabled = true;

      this.logger.info('File sharing configured successfully', {
        fileId: fileInfo.file_id,
        shareUrl
      });
    } catch (shareError: any) {
      // 共享失败不影响文件上传成功状态
      this.logger.warn('Failed to enable file sharing', {
        fileId: fileInfo.file_id,
        shareError: shareError.message
      });
    }

    return {
      success: true,
      data: {
        ...fileInfo,
        shareUrl,
        shareEnabled
      }
    };
  } catch (error: any) {
    // 错误处理
  }
}
```

---

### 前端类型定义 (types.ts)

```typescript
export interface FileInfo {
  // ... 其他字段
  
  /** 共享链接URL（仅在上传后返回） */
  shareUrl?: string
  
  /** 是否成功开启共享（仅在上传后返回） */
  shareEnabled?: boolean
}
```

---

## 🎯 返回值说明

### 成功响应

```json
{
  "success": true,
  "data": {
    "file_id": "abc123",
    "name": "test.png",
    "size": 123456,
    "ctime": 1699123456,
    "mtime": 1699123456,
    "drive_id": "q60YOE5",
    "parent_id": "0",
    "type": "file",
    "version": 1,
    "shareUrl": "https://wps.cn/share/xxx",
    "shareEnabled": true
  },
  "message": "文件上传成功"
}
```

### 共享失败但上传成功

```json
{
  "success": true,
  "data": {
    "file_id": "abc123",
    "name": "test.png",
    // ... 其他字段
    "shareUrl": undefined,
    "shareEnabled": false
  },
  "message": "文件上传成功"
}
```

---

## 🔍 错误处理

### 1. 上传失败

如果步骤1-3任何一步失败，整个上传失败：

```json
{
  "success": false,
  "error": "Failed to upload file: xxx"
}
```

### 2. 共享失败

如果步骤4失败，文件上传仍然成功，但共享未开启：

- `shareEnabled: false`
- `shareUrl: undefined`
- 后端日志记录警告信息

---

## 📊 日志输出

### 成功上传并共享

```
[INFO] Starting integrated file upload
[DEBUG] Step 1: Requesting upload permission
[DEBUG] Upload permission granted
[DEBUG] Step 2: Uploading file to storage server
[DEBUG] File uploaded to storage server successfully
[DEBUG] Step 3: Completing upload
[INFO] Integrated file upload completed successfully
[DEBUG] Step 4: Enabling file sharing
[DEBUG] File sharing enabled, fetching share URL
[INFO] File sharing configured successfully: { shareUrl: 'https://...' }
```

### 上传成功但共享失败

```
[INFO] Starting integrated file upload
[DEBUG] Step 1-3: ... (成功)
[INFO] Integrated file upload completed successfully
[DEBUG] Step 4: Enabling file sharing
[WARN] Failed to enable file sharing, but file upload succeeded: { shareError: 'xxx' }
```

---

## 🧪 测试建议

### 1. 正常上传测试

- 上传一个小文件（< 1MB）
- 验证返回的 `shareUrl` 是否有效
- 验证 `shareEnabled` 为 `true`

### 2. 大文件上传测试

- 上传一个大文件（10-50MB）
- 验证上传进度
- 验证共享链接

### 3. 共享失败测试

- 模拟 `openLinkOfFile` 失败
- 验证文件仍然上传成功
- 验证 `shareEnabled` 为 `false`

### 4. 权限测试

- 使用不同权限的用户上传
- 验证共享范围（company）是否正确

---

## 🎉 功能优势

1. ✅ **一次上传，自动共享**：无需手动开启共享
2. ✅ **即时可用**：上传完成即可获取共享链接
3. ✅ **容错性强**：共享失败不影响文件上传
4. ✅ **日志完整**：每个步骤都有详细日志
5. ✅ **类型安全**：TypeScript 类型定义完整

---

## 📚 相关文档

- [WPS云盘文件上传功能实现说明.md](./WPS云盘文件上传功能实现说明.md)
- [@fastify/multipart 字段解析问题修复说明](../MULTIPART-FIX-EXPLANATION.md)
- [测试指南](../TESTING-GUIDE.md)

