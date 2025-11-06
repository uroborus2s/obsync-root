# WPS云盘文件上传功能实现说明

## 功能概述

在WPS云盘管理页面中新增文件上传功能,允许用户将本地文件上传到WPS云盘的驱动盘或文件夹中。

## 一、上传架构

### 当前架构: 后端代理上传（v1.4.0+）

为了解决前端直接上传到WPS存储服务器的CORS跨域问题,采用**后端代理上传**架构:

```
前端 → 后端 → WPS存储服务器
```

**上传流程**:

1. **前端**: 用户选择文件,通过FormData发送到后端
2. **后端**:
   - 接收文件并计算SHA-256哈希值
   - 调用WPS API请求上传许可
   - 直接上传文件到WPS存储服务器（绕过CORS）
   - 调用WPS API完成上传确认
3. **前端**: 接收上传结果并刷新文件列表

**优势**:

- ✅ 解决CORS跨域问题
- ✅ 统一的错误处理
- ✅ 更好的安全性（Token不暴露给前端）
- ✅ 简化前端代码

**接口**:

- `POST /api/icalink/v1/wps-drive/drives/:drive_id/files/upload`
- 请求格式: `multipart/form-data`
- 参数: `file`（文件）, `parent_id`（父目录ID）

### 旧架构: 前端直传（v1.0.0-v1.3.0，已废弃）

<details>
<summary>点击查看旧架构说明</summary>

WPS云盘的文件上传采用三步流程:

#### 步骤1: 请求上传许可

- **计算文件哈希值**: 使用Web Crypto API计算文件的SHA-256哈希值
- 调用后端接口 `POST /api/icalink/v1/wps-drive/drives/:drive_id/files/request-upload`
- 提供文件名、文件大小、文件哈希值、目标位置等信息
- 获取上传地址(upload URL)、上传ID(upload_id)和可能的认证信息(headers)

**返回数据结构**:

```json
{
  "upload_id": "xxx",
  "store_request": {
    "method": "PUT",
    "url": "https://storage.wps.cn/...",
    "headers": {
      "Authorization": "Bearer xxx" // 可选，WPS API可能返回
    }
  }
}
```

#### 步骤2: 上传文件内容

- 使用HTTP PUT方法将文件内容上传到步骤1返回的地址
- 直接上传到WPS云盘的存储服务器
- **自动携带认证信息**: 如果步骤1返回了headers,会自动添加到上传请求中
- 设置正确的Content-Type请求头
- 支持上传进度监控

**上传请求示例**:

```http
PUT https://storage.wps.cn/...
Content-Type: image/png
Authorization: Bearer xxx  // 如果WPS API返回了token

<文件二进制内容>
```

#### 步骤3: 完成上传确认

- 调用后端接口 `POST /api/icalink/v1/wps-drive/drives/:drive_id/files/complete-upload`
- 通知WPS云盘上传已完成
- 获取文件的元数据信息

**问题**: 前端直接上传到WPS存储服务器会遇到CORS跨域错误,因此已废弃此架构。

</details>

## 二、技术实现

### 后端开发（app-icalink）

#### 1. Adapter层

**文件**: `packages/was_v7/src/adapters/drives.adapter.ts`

**新增方法**:

- `uploadFileToStorage(uploadUrl, fileBuffer, contentType, headers?)`: 上传文件到WPS存储服务器
  - 使用axios直接PUT文件到存储URL
  - 支持自定义Content-Type
  - 支持传递认证headers
  - 不使用WPS API签名（存储服务器不需要）

**已有方法**:

- `requestUpload(params)`: 调用WPS API请求上传许可
- `completeUpload(params)`: 调用WPS API完成上传确认

#### 2. Service层

**文件**: `apps/app-icalink/src/services/WpsDriveService.ts`

**核心方法**:

```typescript
async uploadFile(
  driveId: string,
  parentId: string,
  fileName: string,
  fileBuffer: Buffer,
  fileSize: number,
  contentType: string,
  fileHash: string
): Promise<ServiceResult<CompleteUploadResponse>>
```

**实现流程**:

1. 调用`requestUpload`获取上传URL和认证信息
2. 调用`uploadFileToStorage`上传文件到WPS存储服务器
3. 调用`completeUpload`完成上传确认
4. 返回文件信息

**特点**:

- 一体化上传流程,简化调用
- 完整的错误处理和日志记录
- 返回标准的ServiceResult格式

**旧方法（已废弃）**:

- `requestUpload(driveId, parentId, fileName, fileSize)`: 请求上传信息
- `completeUpload(driveId, uploadId, fileName, fileSize, parentId)`: 完成上传

#### 3. Controller层

**文件**: `apps/app-icalink/src/controllers/WpsDriveController.ts`

**核心接口**:

```typescript
@Post('/api/icalink/v1/wps-drive/drives/:drive_id/files/upload')
async uploadFile(request, reply)
```

**功能**:

- 接收multipart/form-data格式的文件上传
- 解析文件和parent_id参数
- 计算文件SHA-256哈希值
- 调用Service层的uploadFile方法
- 返回上传结果

**参数**:

- `drive_id` (路径参数): 驱动盘ID
- `file` (表单字段): 上传的文件
- `parent_id` (表单字段): 父目录ID

**配置**:

在`stratix.config.ts`中注册@fastify/multipart插件:

```typescript
hooks: {
  afterFastifyCreated: async (fastify) => {
    await fastify.register(multipart, {
      limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
      }
    });
  };
}
```

**旧接口（已废弃）**:

- `POST /api/icalink/v1/wps-drive/drives/:drive_id/files/request-upload`: 请求上传
- `POST /api/icalink/v1/wps-drive/drives/:drive_id/files/complete-upload`: 完成上传

### 前端开发（agendaedu-web）

#### 1. API客户端

**文件**: `apps/agendaedu-web/src/features/wps-drive/api.ts`

**核心方法**:

```typescript
async uploadFile(
  params: {
    drive_id: string
    parent_id: string
    file: File
  },
  onProgress?: (progress: number) => void
): Promise<FileInfo>
```

**实现**:

- 创建FormData包含文件和parent_id
- 使用axios发送multipart/form-data请求到后端
- 支持上传进度回调
- 返回文件信息

**旧方法（已废弃）**:

- `calculateFileSHA256(file)`: 计算文件SHA-256哈希值
- `requestUpload(params)`: 请求上传信息
- `requestUploadWithHash(params)`: 自动计算哈希值并请求上传
- `uploadFileContent(uploadUrl, file, onProgress)`: 上传文件内容
- `completeUpload(params)`: 完成上传

#### 2. UI组件

**文件**: `apps/agendaedu-web/src/features/wps-drive/index.tsx`

**功能**:

- 上传按钮: 在右侧详情区域的CardHeader中
- 上传对话框: 使用Dialog组件
- 文件选择: 支持多文件选择
- 进度显示: 实时显示上传进度

**状态管理**:

```typescript
const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
const [uploadProgress, setUploadProgress] = useState(0);
const [isUploading, setIsUploading] = useState(false);
```

**上传逻辑**:

```typescript
const handleUploadFiles = async () => {
  // 1. 确定上传目标位置
  let targetDriveId: string;
  let targetParentId: string;

  // 2. 遍历所有选中的文件
  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];

    // 3. 调用一体化上传方法
    await wpsDriveApi.uploadFile(
      {
        drive_id: targetDriveId,
        parent_id: targetParentId,
        file
      },
      (progress) => {
        // 4. 更新进度
        const fileProgress =
          ((i + progress / 100) / selectedFiles.length) * 100;
        setUploadProgress(Math.round(fileProgress));
      }
    );
  }

  // 5. 刷新文件列表
  queryClient.invalidateQueries({
    queryKey: ['wps-children', targetDriveId, targetParentId]
  });
};
```

## 三、功能特性

### 1. 上传目标位置

- **驱动盘根目录**: 选中驱动盘时,上传到根目录(parent_id='0')
- **文件夹**: 选中文件夹时,上传到该文件夹内

### 2. 多文件上传

- 支持一次选择多个文件
- 按顺序依次上传
- 显示总体上传进度

### 3. 上传进度

- 实时显示上传进度百分比
- 进度条可视化展示
- 支持单文件和多文件进度计算

### 4. 错误处理

- 网络错误提示
- 上传失败提示
- 参数验证错误提示

### 5. 用户体验

- 上传中禁用操作按钮
- 上传成功后自动刷新文件列表
- 上传成功后自动关闭对话框
- Toast消息提示

### 6. 文件哈希值计算

- **算法**: SHA-256
- **实现**: 使用Web Crypto API (`crypto.subtle.digest`)
- **格式**: 小写十六进制字符串（64个字符）
- **用途**: 文件完整性校验，防止文件在传输过程中损坏
- **性能**:
  - 小文件（<10MB）: 几乎无感知
  - 中等文件（10-100MB）: 可能需要几秒钟
  - 大文件（>100MB）: 可能需要较长时间
- **优化**: 哈希值计算在上传前异步进行，不会阻塞UI

## 四、使用说明

### 访问上传功能

1. 登录系统,进入WPS云盘管理页面
2. 在左侧树形结构中选择一个驱动盘或文件夹
3. 右侧详情区域会显示"上传文件"按钮

### 上传文件

1. 点击"上传文件"按钮
2. 在弹出的对话框中点击"选择文件"
3. 选择一个或多个文件
4. 点击"开始上传"按钮
5. 等待上传完成

### 上传限制

- **文件大小**: 由WPS云盘配置决定
- **文件类型**: 无限制,支持所有类型
- **同名处理**: 自动重命名(on_name_conflict='rename')

## 五、数据流

```
用户选择文件
    ↓
点击上传按钮
    ↓
前端: 计算文件SHA-256哈希值 (Web Crypto API)
    ↓
前端: requestUploadWithHash() → 后端Controller → Service → Adapter → WPS API
    ↓                              (传递文件名、大小、哈希值)
获取上传地址和upload_id
    ↓
前端: uploadFileContent() → 直接上传到WPS存储服务器
    ↓                        (WPS服务器验证哈希值)
上传完成
    ↓
前端: completeUpload() → 后端Controller → Service → Adapter → WPS API
    ↓
获取文件元数据
    ↓
刷新文件列表
```

## 六、文件清单

### 后端文件

1. `apps/app-icalink/src/services/interfaces/IWpsDriveService.ts` - Service接口更新
2. `apps/app-icalink/src/services/WpsDriveService.ts` - Service实现更新
3. `apps/app-icalink/src/controllers/WpsDriveController.ts` - Controller更新
4. `packages/was_v7/src/adapters/drives.adapter.ts` - Adapter(已存在)
5. `packages/was_v7/src/types/drive.ts` - 类型定义(已存在)

### 前端文件

1. `apps/agendaedu-web/src/features/wps-drive/api.ts` - API客户端更新
2. `apps/agendaedu-web/src/features/wps-drive/index.tsx` - 页面组件更新

## 七、测试建议

### 后端测试

```bash
# 测试请求上传接口
curl -X POST "http://localhost:8090/api/icalink/v1/wps-drive/drives/{drive_id}/files/request-upload" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "parent_id": "0",
    "file_name": "test.txt",
    "file_size": 1024
  }'

# 测试完成上传接口
curl -X POST "http://localhost:8090/api/icalink/v1/wps-drive/drives/{drive_id}/files/complete-upload" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "upload_id": "xxx",
    "file_name": "test.txt",
    "file_size": 1024,
    "parent_id": "0"
  }'
```

### 前端测试

1. 启动开发服务器: `pnpm dev`
2. 访问WPS云盘管理页面
3. 测试场景:
   - 上传单个文件
   - 上传多个文件
   - 上传大文件(观察进度)
   - 上传到驱动盘根目录
   - 上传到文件夹
   - 取消上传
   - 网络中断测试

## 八、文件哈希值计算技术细节

### 8.1 哈希算法选择

- **算法**: SHA-256
- **原因**:
  - WPS云盘API支持MD5和SHA-256算法
  - Web Crypto API原生支持SHA-256,但不支持MD5
  - SHA-256比SHA-1更安全,是现代推荐的哈希算法
  - 无需引入第三方库,减少依赖
- **安全性**: SHA-256是目前广泛使用的安全哈希算法,适用于文件完整性校验

### 8.2 实现方式

```typescript
async function calculateFileSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}
```

### 8.3 性能考虑

- **小文件** (<10MB): 计算时间 <100ms
- **中等文件** (10-100MB): 计算时间 100ms-1s
- **大文件** (>100MB): 计算时间 >1s

### 8.4 浏览器兼容性

- **Web Crypto API**: 所有现代浏览器都支持SHA-256
- **支持的算法**: SHA-1, SHA-256, SHA-384, SHA-512 (不支持MD5!)
- **IE11**: 不支持,需要使用polyfill或第三方库(如crypto-js)

### 8.5 数据格式

- **输入**: File对象
- **输出**: 64个字符的小写十六进制字符串
- **示例**: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

### 8.6 传递给后端

```typescript
// 前端
const fileHash = await calculateFileSHA256(file);

// 后端接收
{
  file_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
}

// 后端转换为WPS API格式
{
  hashes: [
    {
      sum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      type: 'sha256'
    }
  ];
}
```

## 九、注意事项

1. **文件大小限制**: 需要根据WPS云盘配置设置合理的文件大小限制
2. **并发上传**: 当前实现是串行上传,如需并发上传需要修改逻辑
3. **断点续传**: 当前不支持断点续传,大文件上传失败需要重新上传
4. **网络超时**: 大文件上传可能需要较长时间,需要设置合理的超时时间
5. **权限控制**: 确保用户有上传权限
6. **存储空间**: 上传前应检查驱动盘剩余空间
7. **哈希值计算**: 大文件哈希值计算可能耗时较长,建议在UI上显示"正在准备上传..."提示

## 九、后续优化建议

1. **分片上传**: 支持大文件分片上传,提高稳定性
2. **断点续传**: 支持上传中断后继续上传
3. **并发上传**: 支持多文件并发上传,提高效率
4. **拖拽上传**: 支持拖拽文件到页面上传
5. **上传队列**: 显示上传队列和每个文件的状态
6. **文件预览**: 上传前预览文件信息
7. **上传历史**: 记录上传历史和失败记录
8. **空间检查**: 上传前检查驱动盘剩余空间
9. **文件验证**: 上传前验证文件类型和大小
10. **批量操作**: 支持批量上传、暂停、取消

## 十一、版本信息

### v1.3.0 (2025-11-04)

**新增功能**:

- ✅ 支持WPS API返回的认证Token安全传递
- ✅ `StoreRequest` 接口新增 `headers` 字段支持
- ✅ 上传请求自动携带WPS API返回的认证信息

**技术改进**:

- 更新 `packages/was_v7/src/types/drive.ts` 的 `StoreRequest` 接口,添加可选的 `headers` 字段
- 修改 `uploadFileContent()` 方法,支持传递自定义请求头
- 前端自动从 `store_request.headers` 中提取认证信息并添加到上传请求
- 支持Authorization Bearer Token等认证方式

**安全性**:

- Token仅用于单次上传请求,不长期存储
- Token通过HTTPS安全传输
- 完全兼容WPS云盘API的认证机制

### v1.4.0 (2025-11-04) - 架构重构

**重大变更**:

- 🔄 **架构变更**: 从前端直传改为后端代理上传
- ✅ **解决CORS问题**: 后端服务器到WPS存储服务器的请求不受浏览器CORS限制
- ✅ **简化前端代码**: 前端只需一次API调用即可完成上传
- ✅ **提升安全性**: Token和认证信息不暴露给前端

**新增功能**:

- 后端Adapter层: `uploadFileToStorage()` 方法
- 后端Service层: `uploadFile()` 一体化上传方法
- 后端Controller层: `POST /upload` multipart文件上传接口
- 前端API客户端: `uploadFile()` FormData上传方法
- Fastify multipart插件集成

**技术细节**:

- 使用@fastify/multipart处理文件上传
- 后端使用crypto模块计算SHA-256哈希值
- 使用axios直接PUT文件到WPS存储服务器
- 支持最大50MB文件上传

**废弃**:

- ❌ 前端三步上传流程（requestUpload → uploadFileContent → completeUpload）
- ❌ 前端SHA-256哈希值计算
- ❌ 前端XMLHttpRequest直接上传到WPS存储服务器

### v1.2.1 (2025-11-04)

**Bug修复**:

- 🐛 修复上传到WPS存储服务器时403错误
- ✅ 添加Content-Type请求头到PUT请求
- ✅ 使用文件的MIME类型,如果没有则使用application/octet-stream

**技术细节**:

- 在 `uploadFileContent()` 方法中添加 `xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')`
- 解决了WPS存储服务器拒绝没有Content-Type的请求的问题

### v1.2.0 (2025-11-04)

**算法升级**:

- ✅ 使用SHA-256哈希算法(符合WPS API规范)
- ✅ Web Crypto API原生支持,无需第三方库
- ✅ 更高的安全性和可靠性

**技术改进**:

- 前端使用 `calculateFileSHA256()` 函数
- 后端Service层使用 `type: 'sha256'`
- 更新类型定义支持sha256
- 完整的文档说明

### v1.1.0 (2025-11-04)

**新增功能**:

- ✅ 文件哈希值计算功能
- ✅ 使用Web Crypto API实现高性能哈希计算
- ✅ 自动在上传前计算并传递哈希值
- ✅ 支持文件完整性校验

**技术改进**:

- 前端新增哈希计算函数
- 前端新增 `requestUploadWithHash()` 便捷方法
- 后端Service层支持接收和传递哈希值
- 后端Controller层支持接收哈希值参数
- 完整的文档说明和技术细节

### v1.0.0 (2025-11-04)

**初始版本**:

- ✅ 基础文件上传功能
- ✅ 三步上传流程
- ✅ 多文件上传支持
- ✅ 上传进度显示
- ✅ 完整的错误处理
