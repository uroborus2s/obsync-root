/**
 * @stratix/ossp - Object Storage Service Provider 插件
 *
 * 提供 MinIO 客户端的标准化接口，支持完整的对象存储操作
 * 遵循 Stratix 框架的 Adapter 层规范
 */

import type {
  FastifyInstance,
  FastifyPluginOptions
} from '@stratix/core/plugin';
import { withRegisterAutoDI } from '@stratix/core/plugin';
import { deepMerge } from '@stratix/core/data';

/**
 * OSSP 插件配置选项
 */
export interface OsspPluginOptions extends FastifyPluginOptions {
  /** OSS 提供商 */
  provider?: string;
  /** MinIO 服务端点 */
  endPoint?: string;
  /** OSS 服务端点 */
  endpoint?: string;
  /** 端口号 */
  port?: number;
  /** 是否使用SSL */
  useSSL?: boolean;
  /** 访问密钥 */
  accessKey?: string;
  /** 阿里云访问密钥 ID */
  accessKeyId?: string;
  /** 秘密密钥 */
  secretKey?: string;
  /** 阿里云访问密钥 Secret */
  accessKeySecret?: string;
  /** 会话令牌 */
  sessionToken?: string;
  /** 阿里云 STS 临时凭证 */
  stsToken?: string;
  /** 区域 */
  region?: string;
  /** 分片大小 */
  partSize?: number;
  /** 路径样式 */
  pathStyle?: boolean;
  /** 传输代理 */
  transportAgent?: any;
  /** 连接池大小 */
  poolSize?: number;
  /** 重试次数 */
  retryAttempts?: number;
  /** 重试延迟 */
  retryDelay?: number;
  /** 超时时间 */
  timeout?: number;
  /** 默认存储桶 */
  defaultBucket?: string;
  /** 默认存储桶，阿里云 SDK 原生命名 */
  bucket?: string;
  /** 默认区域 */
  defaultRegion?: string;
  /** 启用调试模式 */
  debug?: boolean;
  /** 阿里云 OSS CNAME 模式 */
  cname?: boolean;
  /** 阿里云 OSS 内网访问 */
  internal?: boolean;
  /** 阿里云 OSS 请求者付费 */
  isRequestPay?: boolean;
  /** 自定义 User-Agent */
  userAgent?: string;
  /** 是否使用 V4 签名 */
  authorizationV4?: boolean;
}

/**
 * OSSP 插件主函数
 *
 * 实现 MinIO 客户端的自动注册和管理：
 * - 自动发现和注册 OSSP 适配器
 * - 提供统一的对象存储操作接口
 * - 支持完整的存储桶和对象操作
 * - 完整的错误处理和日志记录
 *
 * @param fastify - Fastify 实例
 * @param options - 插件配置选项
 */
async function ossp(
  fastify: FastifyInstance,
  options: OsspPluginOptions
): Promise<void> {
  fastify.log.info('🚀 @stratix/ossp plugin initializing...');
}

// 使用 withRegisterAutoDI 包装插件以启用自动依赖注入和参数处理
export default withRegisterAutoDI<OsspPluginOptions>(ossp, {
  discovery: {
    patterns: ['adapters/*.{ts,js}']
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'throw',
    debug: process.env.NODE_ENV === 'development'
  },
  debug: process.env.NODE_ENV === 'development',
  parameterProcessor: <T>(options: T): T =>
    deepMerge(
      {
        port: undefined, // 将由 useSSL 决定默认值
        useSSL: true,
        region: 'us-east-1',
        partSize: 64 * 1024 * 1024, // 64MB
        pathStyle: true,
        poolSize: 10,
        retryAttempts: 3,
        retryDelay: 1000,
        timeout: 30000, // 30秒
        debug: false
      },
      options || {}
    ) as T,
  parameterValidator: <T>(options: T): boolean => {
    const opts = options as Partial<OsspPluginOptions>;
    const provider = opts.provider || 'minio';
    const endpoint = opts.endPoint || opts.endpoint;
    const accessKey = opts.accessKey || opts.accessKeyId;
    const secretKey = opts.secretKey || opts.accessKeySecret;

    if (
      provider === 'minio' &&
      (typeof endpoint !== 'string' || endpoint.trim() === '')
    ) {
      return false;
    }

    if (typeof accessKey !== 'string' || accessKey.trim() === '') {
      return false;
    }

    if (typeof secretKey !== 'string' || secretKey.trim() === '') {
      return false;
    }

    return (
      accessKey.trim() !== 'minioadmin' && secretKey.trim() !== 'minioadmin'
    );
  }
});

export { OSSProvider } from './adapters/interfaces/IOSSAdapter.js';

// 导出核心接口和类型
export type {
  BucketInfo,
  CopyResult,
  DeleteObjectItem,
  DeleteOptions,
  DownloadOptions,
  IOSSAdapter,
  ListOptions,
  ObjectInfo,
  ObjectMetadata,
  PresignedUrlOptions,
  UploadOptions,
  UploadResult
} from './adapters/interfaces/IOSSAdapter.js';

// 导出扩展类型
export type {
  OsspBatchOptions,
  OsspBucketPolicy,
  OsspBucketTags,
  OsspConnectionInfo,
  OsspConnectionStatus,
  OsspCopyConditions,
  OsspCopyDestinationOptions,
  OsspCopySourceOptions,
  OsspEncryptionConfig,
  OsspError,
  OsspEvents,
  OsspLifecycleConfig,
  OsspLifecycleRule,
  OsspMultipartUpload,
  OsspMultipartUploadPart,
  OsspNotificationConfig,
  OsspObjectLegalHold,
  OsspObjectLockConfig,
  OsspObjectRetention,
  OsspObjectTags,
  OsspOperationResult,
  OsspSelectOptions,
  OsspStats,
  OsspVersioningConfig,
  PaginatedResult,
  QueryParams,
  ServiceResult
} from './types/index.js';

// 导出提供商适配器
export {
  AliyunOSSAdapter,
  type AliyunOSSConfig
} from './adapters/providers/AliyunOSSAdapter.js';
export {
  MinioAdapter,
  type MinioConfig
} from './adapters/providers/MinioAdapter.js';

// 导出默认适配器类
export { default as OsspClientAdapter } from './adapters/ossp.adapter.js';

// 向后兼容：保留旧的别名
export type { IOSSAdapter as OsspAdapter } from './adapters/interfaces/IOSSAdapter.js';
