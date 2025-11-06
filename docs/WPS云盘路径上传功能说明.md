# WPS 云盘路径上传功能说明

## 📋 功能概述

本文档说明如何使用路径字符串（如 `/folder1/folder2`）上传文件到 WPS 云盘。

---

## 🎯 功能特性

### 1. 支持路径字符串上传

- **必需参数**：`parent_id`（父文件夹ID）
- **可选参数**：`parent_path`（父文件夹路径，如 `/folder1/folder2`）

### 2. 路径格式

- **格式**：`/folder1/folder2/folder3`
- **说明**：
  - 以 `/` 开头（可选，会自动处理）
  - 使用 `/` 分隔文件夹名称
  - 不包含文件名（文件名单独指定）

### 3. 路径转换

后端会自动将路径字符串转换为 WPS API 所需的数组格式：

```typescript
// 输入
parent_path: '/folder1/folder2'

// 转换为
parent_path: ['folder1', 'folder2']
```

---

## 📝 使用示例

### 前端调用

```typescript
import { wpsDriveApi } from '@/features/wps-drive/api'

// 示例1: 只使用 parent_id（上传到根目录）
await wpsDriveApi.uploadFile({
  drive_id: 'q60YOE5',
  parent_id: '0',
  file: fileObject
})

// 示例2: 使用 parent_id + parent_path（上传到指定路径）
await wpsDriveApi.uploadFile({
  drive_id: 'q60YOE5',
  parent_id: '0',
  parent_path: '/2024/photos',
  file: fileObject
})

// 示例3: 上传到文件夹
await wpsDriveApi.uploadFile({
  drive_id: 'q60YOE5',
  parent_id: 'folder_abc123',
  parent_path: '/subfolder1/subfolder2',
  file: fileObject
})
```

---

## 🔄 完整流程

### 1. 前端发送请求

```typescript
const formData = new FormData()
formData.append('parent_id', '0')           // ✅ 必需
formData.append('parent_path', '/folder1')  // ✅ 可选
formData.append('file', fileObject)         // ✅ 必需

await axios.post('/api/icalink/v1/wps-drive/drives/xxx/files/upload', formData)
```

### 2. 后端解析参数

```typescript
// Controller 层
let parent_id: string | null = null;
let parent_path: string | null = null;
let fileData: any = null;

for await (const part of request.parts()) {
  if (part.fieldname === 'parent_id') {
    parent_id = part.value;
  } else if (part.fieldname === 'parent_path') {
    parent_path = part.value;
  } else if (part.type === 'file') {
    fileData = part;
  }
}
```

### 3. Service 层处理

```typescript
// 转换路径字符串为数组
let parent_path_array: string[] | undefined;
if (parentPath) {
  parent_path_array = parentPath
    .replace(/^\/+/, '')  // 移除开头的斜杠
    .split('/')
    .filter(segment => segment.length > 0);
}

// 调用 WPS API
await wasV7ApiDrive.requestUpload({
  drive_id: driveId,
  parent_id: parentId,
  name: fileName,
  size: fileSize,
  hashes: [{ sum: fileHash, type: 'sha256' }],
  on_name_conflict: 'rename',
  parent_path: parent_path_array  // ✅ 传递数组格式
});
```

---

## 📊 路径转换示例

| 输入路径 | 转换后的数组 | 说明 |
|---------|------------|------|
| `/folder1` | `['folder1']` | 单层路径 |
| `/folder1/folder2` | `['folder1', 'folder2']` | 两层路径 |
| `/2024/photos/vacation` | `['2024', 'photos', 'vacation']` | 三层路径 |
| `folder1/folder2` | `['folder1', 'folder2']` | 无开头斜杠（自动处理） |
| `/folder1//folder2/` | `['folder1', 'folder2']` | 多余斜杠（自动过滤） |

---

## 🎯 参数说明

### UploadFileParams 接口

```typescript
export interface UploadFileParams {
  /** 驱动盘ID（必需） */
  drive_id: string
  
  /** 父文件夹ID（必需） */
  parent_id: string
  
  /** 要上传的文件（必需） */
  file: File
  
  /** 父文件夹路径（可选，如 '/folder1/folder2'） */
  parent_path?: string
}
```

### 参数组合规则

1. **只有 `parent_id`**：
   - 文件上传到 `parent_id` 指定的文件夹
   - 不使用路径

2. **`parent_id` + `parent_path`**：
   - 文件上传到 `parent_id` 下的 `parent_path` 路径
   - 如果路径不存在，WPS API 会自动创建

---

## 🔍 日志输出

### 前端日志

```
开始上传文件: test.png 到驱动盘: q60YOE5
父目录ID: 0
父目录路径: /folder1/folder2
FormData 内容:
  - parent_id: 0
  - parent_path: /folder1/folder2
  - file: test.png 123456 bytes
```

### 后端日志

```
[INFO] Starting integrated file upload: {
  driveId: 'q60YOE5',
  parentId: '0',
  fileName: 'test.png',
  fileSize: 123456,
  parentPath: '/folder1/folder2'
}

[DEBUG] Converted parent_path: {
  original: '/folder1/folder2',
  array: ['folder1', 'folder2']
}

[DEBUG] Step 1: Requesting upload permission
[DEBUG] Upload permission granted
[DEBUG] Step 2: Uploading file to storage server
[DEBUG] Step 3: Completing upload
[INFO] Integrated file upload completed successfully
```

---

## ⚠️ 注意事项

### 1. parent_id 是必需的

即使使用 `parent_path`，`parent_id` 仍然是必需的：

```typescript
// ❌ 错误：缺少 parent_id
await wpsDriveApi.uploadFile({
  drive_id: 'q60YOE5',
  parent_path: '/folder1',
  file: fileObject
})

// ✅ 正确：包含 parent_id
await wpsDriveApi.uploadFile({
  drive_id: 'q60YOE5',
  parent_id: '0',
  parent_path: '/folder1',
  file: fileObject
})
```

### 2. 路径自动创建

如果 `parent_path` 指定的路径不存在，WPS API 会自动创建：

```typescript
// 如果 /2024/photos 不存在，会自动创建
await wpsDriveApi.uploadFile({
  drive_id: 'q60YOE5',
  parent_id: '0',
  parent_path: '/2024/photos',
  file: fileObject
})
```

### 3. 路径格式灵活

以下格式都是有效的：

```typescript
parent_path: '/folder1/folder2'   // ✅ 推荐
parent_path: 'folder1/folder2'    // ✅ 自动处理
parent_path: '/folder1//folder2/' // ✅ 自动过滤多余斜杠
```

---

## 🧪 测试示例

### 测试1: 上传到根目录

```typescript
const result = await wpsDriveApi.uploadFile({
  drive_id: 'q60YOE5',
  parent_id: '0',
  file: new File(['test'], 'test.txt')
})

console.log('文件ID:', result.id)
console.log('共享链接:', result.shareUrl)
```

### 测试2: 上传到指定路径

```typescript
const result = await wpsDriveApi.uploadFile({
  drive_id: 'q60YOE5',
  parent_id: '0',
  parent_path: '/2024/documents',
  file: new File(['test'], 'report.pdf')
})

console.log('文件ID:', result.id)
console.log('父路径:', result.parent_id)
```

### 测试3: 上传到文件夹的子路径

```typescript
const result = await wpsDriveApi.uploadFile({
  drive_id: 'q60YOE5',
  parent_id: 'folder_abc123',
  parent_path: '/subfolder1/subfolder2',
  file: new File(['test'], 'image.png')
})

console.log('文件ID:', result.id)
```

---

## 📚 相关文档

- [WPS云盘文件上传与共享功能说明](./WPS云盘文件上传与共享功能说明.md)
- [@fastify/multipart 字段解析问题修复说明](../MULTIPART-FIX-EXPLANATION.md)
- [实现总结](../FILE-UPLOAD-IMPLEMENTATION-SUMMARY.md)

---

## 🎉 功能优势

1. ✅ **灵活性**：支持 `parent_id` 和 `parent_path` 两种方式
2. ✅ **自动创建**：路径不存在时自动创建
3. ✅ **格式宽松**：自动处理各种路径格式
4. ✅ **向后兼容**：`parent_path` 是可选的，不影响现有功能
5. ✅ **类型安全**：完整的 TypeScript 类型定义

---

**最后更新**：2025-11-05
**版本**：v1.0.0

