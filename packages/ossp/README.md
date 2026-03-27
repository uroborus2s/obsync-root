# @stratix/ossp

基于Stratix框架的对象存储服务(OSS)插件，提供完整的对象存储操作能力。

## 特性

- 🚀 **多提供商支持**: 支持MinIO、AWS S3、阿里云OSS等多种对象存储提供商
- 🔧 **完整功能**: 文件上传、下载、删除、复制、移动等完整OSS操作
- 📦 **存储桶管理**: 创建、删除、列表、统计等存储桶管理功能
- 🔗 **预签名URL**: 支持生成预签名上传/下载URL
- 📊 **批量操作**: 支持批量文件上传、删除等操作
- ⚡ **异步任务**: 基于Executor的异步任务执行
- 🛡️ **类型安全**: 完整的TypeScript类型定义
- 🧪 **测试覆盖**: 完整的单元测试和集成测试
- 📖 **标准架构**: 遵循Stratix框架的标准分层架构

## 安装

```bash
npm install @stratix/ossp
# 或
yarn add @stratix/ossp
# 或
pnpm add @stratix/ossp
```

## 快速开始

### 基本配置

#### MinIO 配置

```typescript
import Fastify from 'fastify';
import ossp from '@stratix/ossp';
import { OssProvider } from '@stratix/ossp';

const fastify = Fastify();

// 注册OSS插件 - MinIO
await fastify.register(ossp, {
  oss: {
    provider: OssProvider.MINIO,
    endpoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKeyId: 'your-access-key',
    accessKeySecret: 'your-secret-key',
    region: 'us-east-1'
  }
});
```

#### 阿里云 OSS 配置

```typescript
import Fastify from 'fastify';
import ossp from '@stratix/ossp';
import { OssProvider } from '@stratix/ossp';

const fastify = Fastify();

// 注册OSS插件 - 阿里云OSS
await fastify.register(ossp, {
  oss: {
    provider: OssProvider.ALIYUN_OSS,
    accessKeyId: 'your-access-key-id',
    accessKeySecret: 'your-access-key-secret',
    region: 'oss-cn-hangzhou',
    bucket: 'your-bucket-name',
    endpoint: 'oss-cn-hangzhou.aliyuncs.com', // 可选，自定义域名
    secure: true, // 是否使用HTTPS，默认true
    timeout: 60000 // 超时时间，默认60秒
  }
});

await fastify.listen({ port: 3000 });
```

### 环境变量配置

```bash
# .env
OSS_PROVIDER=minio
OSS_ENDPOINT=localhost
OSS_PORT=9000
OSS_USE_SSL=false
OSS_ACCESS_KEY_ID=your-access-key
OSS_ACCESS_KEY_SECRET=your-secret-key
OSS_REGION=us-east-1
```

## API 接口

### 存储桶管理

#### 列出所有存储桶
```http
GET /oss/buckets
```

#### 创建存储桶
```http
POST /oss/buckets/{bucketName}
Content-Type: application/json

{
  "region": "us-east-1"
}
```

#### 删除存储桶
```http
DELETE /oss/buckets/{bucketName}?force=true
```

#### 检查存储桶是否存在
```http
HEAD /oss/buckets/{bucketName}
```

#### 获取存储桶信息
```http
GET /oss/buckets/{bucketName}
```

#### 获取存储桶统计信息
```http
GET /oss/buckets/{bucketName}/stats
```

#### 清空存储桶
```http
DELETE /oss/buckets/{bucketName}/files
```

### 文件操作

#### 上传文件
```http
POST /oss/{bucketName}/files/{objectName}
Content-Type: multipart/form-data

{
  "contentType": "image/jpeg",
  "metadata": {
    "author": "user123",
    "category": "photos"
  },
  "overwrite": true
}
```

#### 下载文件
```http
GET /oss/{bucketName}/files/{objectName}
```

#### 下载文件流
```http
GET /oss/{bucketName}/files/{objectName}/stream
```

#### 删除文件
```http
DELETE /oss/{bucketName}/files/{objectName}
```

#### 检查文件是否存在
```http
HEAD /oss/{bucketName}/files/{objectName}
```

#### 获取文件元数据
```http
GET /oss/{bucketName}/files/{objectName}/metadata
```

#### 列出文件
```http
GET /oss/{bucketName}/files?prefix=photos/&limit=100&page=1
```

#### 生成预签名下载URL
```http
GET /oss/{bucketName}/files/{objectName}/download-url?expires=3600
```

#### 生成预签名上传URL
```http
GET /oss/{bucketName}/files/{objectName}/upload-url?expires=1800
```

## 编程接口

### 使用服务层

```typescript
import { IOssService, IBucketService } from '@stratix/ossp';

// 在Stratix应用中使用依赖注入
class MyController {
  constructor(
    private ossService: IOssService,
    private bucketService: IBucketService
  ) {}

  async uploadFile(bucketName: string, objectName: string, fileData: Buffer) {
    // 检查存储桶是否存在
    const bucketExists = await this.bucketService.bucketExists(bucketName);
    if (!bucketExists.success || !bucketExists.data) {
      // 创建存储桶
      await this.bucketService.createBucket(bucketName);
    }

    // 上传文件
    const result = await this.ossService.uploadFile(bucketName, objectName, fileData, {
      contentType: 'application/octet-stream',
      metadata: {
        uploadedBy: 'api',
        timestamp: new Date().toISOString()
      }
    });

    return result;
  }

  async downloadFile(bucketName: string, objectName: string) {
    const result = await this.ossService.downloadFile(bucketName, objectName);
    return result;
  }

  async listFiles(bucketName: string, prefix?: string) {
    const result = await this.ossService.listFiles(bucketName, {
      prefix,
      limit: 100
    });
    return result;
  }
}
```

### 使用执行器

```typescript
import { IOssExecutor, OssTaskType } from '@stratix/ossp';

class MyTaskService {
  constructor(private ossExecutor: IOssExecutor) {}

  async executeUploadTask(bucketName: string, objectName: string, data: Buffer) {
    const result = await this.ossExecutor.execute({
      taskType: OssTaskType.UPLOAD_FILE,
      bucketName,
      objectName,
      data,
      options: {
        contentType: 'application/octet-stream'
      }
    });

    return result;
  }

  async executeBatchUpload(bucketName: string, files: Array<{ name: string; data: Buffer }>) {
    const result = await this.ossExecutor.execute({
      taskType: OssTaskType.BATCH_UPLOAD,
      bucketName,
      files: files.map(file => ({
        objectName: file.name,
        data: file.data
      }))
    });

    return result;
  }
}
```

## 配置选项

```typescript
interface OsspPluginOptions {
  oss: {
    provider: OssProvider;           // OSS提供商
    endpoint: string;                // 服务端点
    port?: number;                   // 端口号
    useSSL?: boolean;                // 是否使用SSL
    accessKeyId: string;             // 访问密钥ID
    accessKeySecret: string;         // 访问密钥Secret
    region?: string;                 // 区域
    connectTimeout?: number;         // 连接超时时间
    requestTimeout?: number;         // 请求超时时间
    retryAttempts?: number;          // 重试次数
    retryDelay?: number;             // 重试延迟
  };
  cache?: {
    enabled?: boolean;               // 是否启用缓存
    ttl?: number;                    // 缓存TTL
    prefix?: string;                 // 缓存前缀
  };
  logging?: {
    enabled?: boolean;               // 是否启用日志
    level?: string;                  // 日志级别
    logRequests?: boolean;           // 是否记录请求日志
  };
  security?: {
    enableAccessControl?: boolean;   // 是否启用访问控制
    maxFileSize?: number;            // 最大文件大小
    enableVirusScanning?: boolean;   // 是否启用病毒扫描
  };
  performance?: {
    poolSize?: number;               // 连接池大小
    multipartThreshold?: number;     // 分片上传阈值
    partSize?: number;               // 分片大小
    concurrentUploads?: number;      // 并发上传数
  };
}
```

## 支持的OSS提供商

### MinIO
```typescript
{
  oss: {
    provider: OssProvider.MINIO,
    endpoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKeyId: 'minioadmin',
    accessKeySecret: 'minioadmin'
  }
}
```

### AWS S3 (计划支持)
```typescript
{
  oss: {
    provider: OssProvider.AWS_S3,
    endpoint: 's3.amazonaws.com',
    region: 'us-east-1',
    accessKeyId: 'your-aws-access-key',
    accessKeySecret: 'your-aws-secret-key'
  }
}
```

### 阿里云OSS
```typescript
{
  oss: {
    provider: OssProvider.ALIYUN_OSS,
    accessKeyId: 'your-access-key-id',        // 必需：阿里云访问密钥ID
    accessKeySecret: 'your-access-key-secret', // 必需：阿里云访问密钥Secret
    region: 'oss-cn-hangzhou',                // 必需：OSS区域
    bucket: 'your-bucket-name',               // 可选：默认存储桶
    endpoint: 'oss-cn-hangzhou.aliyuncs.com', // 可选：自定义域名
    secure: true,                             // 可选：是否使用HTTPS，默认true
    timeout: 60000,                           // 可选：超时时间(ms)，默认60000
    stsToken: 'your-sts-token',               // 可选：STS临时访问凭证
    cname: false,                             // 可选：是否启用CNAME，默认false
    isRequestPay: false,                      // 可选：是否启用请求者付费，默认false
    userAgent: 'your-user-agent'              // 可选：自定义User-Agent
  }
}
```

## 错误处理

插件提供统一的错误处理机制：

```typescript
const result = await ossService.uploadFile(bucketName, objectName, data);

if (!result.success) {
  console.error('上传失败:', result.error);
  console.error('错误代码:', result.code);
  
  switch (result.code) {
    case 'BUCKET_NOT_FOUND':
      // 处理存储桶不存在
      break;
    case 'FILE_ALREADY_EXISTS':
      // 处理文件已存在
      break;
    case 'INVALID_OBJECT_NAME':
      // 处理无效对象名称
      break;
    default:
      // 处理其他错误
      break;
  }
}
```

## 开发

### 构建
```bash
pnpm run build
```

### 测试
```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 生成测试覆盖率报告
pnpm test:coverage
```

### 代码检查
```bash
pnpm run lint
pnpm run type-check
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 更新日志

### v1.0.0-beta.1
- 初始版本发布
- 支持MinIO对象存储
- 完整的文件和存储桶操作API
- 预签名URL支持
- 批量操作支持
- 异步任务执行器
- 完整的测试覆盖
