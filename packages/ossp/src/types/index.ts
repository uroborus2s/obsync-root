/**
 * @stratix/ossp 类型定义
 */

// 导入核心类型用于本地接口定义
import type { ObjectMetadata } from '../adapters/interfaces/IOSSAdapter.js';

// 重新导出核心适配器接口类型
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
  OSSProvider,
  PresignedUrlOptions,
  UploadOptions,
  UploadResult
} from '../adapters/interfaces/IOSSAdapter.js';

// 向后兼容：保留旧的别名
export type { IOSSAdapter as OsspAdapter } from '../adapters/interfaces/IOSSAdapter.js';

// 重新导出插件配置类型
export type { OsspPluginOptions } from '../index.js';

/**
 * OSSP 操作结果类型
 */
export interface OsspOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * OSSP 连接状态
 */
export enum OsspConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

/**
 * OSSP 连接信息
 */
export interface OsspConnectionInfo {
  status: OsspConnectionStatus;
  endPoint?: string;
  port?: number;
  useSSL?: boolean;
  region?: string;
  connectedAt?: Date;
  lastError?: string;
}

/**
 * OSSP 统计信息
 */
export interface OsspStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  totalBuckets: number;
  totalObjects: number;
  totalSize: number;
}

/**
 * OSSP 事件类型
 */
export interface OsspEvents {
  connect: () => void;
  ready: () => void;
  error: (error: Error) => void;
  close: () => void;
  reconnecting: () => void;
  end: () => void;
}

/**
 * OSSP 批量操作选项
 */
export interface OsspBatchOptions {
  /** 批量大小 */
  batchSize?: number;
  /** 并发数 */
  concurrency?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 失败时是否继续 */
  continueOnError?: boolean;
}

/**
 * OSSP 存储桶策略
 */
export interface OsspBucketPolicy {
  Version: string;
  Statement: Array<{
    Effect: 'Allow' | 'Deny';
    Principal?: string | { [key: string]: string | string[] };
    Action: string | string[];
    Resource: string | string[];
    Condition?: { [key: string]: { [key: string]: string | string[] } };
  }>;
}

/**
 * OSSP 存储桶生命周期规则
 */
export interface OsspLifecycleRule {
  ID?: string;
  Status: 'Enabled' | 'Disabled';
  Filter?: {
    Prefix?: string;
    Tag?: { Key: string; Value: string };
    And?: {
      Prefix?: string;
      Tags?: Array<{ Key: string; Value: string }>;
    };
  };
  Expiration?: {
    Days?: number;
    Date?: string;
    ExpiredObjectDeleteMarker?: boolean;
  };
  Transition?: Array<{
    Days?: number;
    Date?: string;
    StorageClass: string;
  }>;
  AbortIncompleteMultipartUpload?: {
    DaysAfterInitiation: number;
  };
  NoncurrentVersionExpiration?: {
    NoncurrentDays: number;
  };
  NoncurrentVersionTransition?: Array<{
    NoncurrentDays: number;
    StorageClass: string;
  }>;
}

/**
 * OSSP 存储桶生命周期配置
 */
export interface OsspLifecycleConfig {
  Rule: OsspLifecycleRule[];
}

/**
 * OSSP 存储桶版本控制配置
 */
export interface OsspVersioningConfig {
  Status: 'Enabled' | 'Suspended';
  MfaDelete?: 'Enabled' | 'Disabled';
}

/**
 * OSSP 存储桶加密配置
 */
export interface OsspEncryptionConfig {
  Rule: Array<{
    ApplyServerSideEncryptionByDefault: {
      SSEAlgorithm: 'AES256' | 'aws:kms';
      KMSMasterKeyID?: string;
    };
    BucketKeyEnabled?: boolean;
  }>;
}

/**
 * OSSP 存储桶标签
 */
export interface OsspBucketTags {
  [key: string]: string;
}

/**
 * OSSP 对象标签
 */
export interface OsspObjectTags {
  [key: string]: string;
}

/**
 * OSSP 对象锁定配置
 */
export interface OsspObjectLockConfig {
  ObjectLockEnabled: 'Enabled';
  Rule?: {
    DefaultRetention: {
      Mode: 'GOVERNANCE' | 'COMPLIANCE';
      Days?: number;
      Years?: number;
    };
  };
}

/**
 * OSSP 对象保留配置
 */
export interface OsspObjectRetention {
  Mode: 'GOVERNANCE' | 'COMPLIANCE';
  RetainUntilDate: string;
}

/**
 * OSSP 对象法律保留
 */
export interface OsspObjectLegalHold {
  Status: 'ON' | 'OFF';
}

/**
 * OSSP 多部分上传信息
 */
export interface OsspMultipartUpload {
  uploadId: string;
  key: string;
  initiated: Date;
  storageClass?: string;
  owner?: {
    displayName: string;
    id: string;
  };
  initiator?: {
    displayName: string;
    id: string;
  };
}

/**
 * OSSP 多部分上传部分信息
 */
export interface OsspMultipartUploadPart {
  partNumber: number;
  lastModified: Date;
  etag: string;
  size: number;
}

/**
 * OSSP 复制条件
 */
export interface OsspCopyConditions {
  matchETag?: string;
  matchETagExcept?: string;
  modified?: Date;
  unmodified?: Date;
}

/**
 * OSSP 复制源选项
 */
export interface OsspCopySourceOptions {
  Bucket: string;
  Object: string;
  VersionId?: string;
  MatchETag?: string;
  MatchETagExcept?: string;
  ModifiedSince?: Date;
  UnmodifiedSince?: Date;
  Start?: number;
  End?: number;
}

/**
 * OSSP 复制目标选项
 */
export interface OsspCopyDestinationOptions {
  Bucket: string;
  Object: string;
  MetadataDirective?: 'COPY' | 'REPLACE';
  Metadata?: ObjectMetadata;
  TaggingDirective?: 'COPY' | 'REPLACE';
  Tagging?: OsspObjectTags;
  StorageClass?: string;
  ServerSideEncryption?: string;
  SSEKMSKeyId?: string;
  SSEContext?: string;
  WebsiteRedirectLocation?: string;
  CacheControl?: string;
  ContentDisposition?: string;
  ContentEncoding?: string;
  ContentLanguage?: string;
  ContentType?: string;
  Expires?: Date;
}

/**
 * OSSP 选择查询选项
 */
export interface OsspSelectOptions {
  expression: string;
  expressionType: 'SQL';
  inputSerialization: {
    CSV?: {
      FileHeaderInfo?: 'USE' | 'IGNORE' | 'NONE';
      RecordDelimiter?: string;
      FieldDelimiter?: string;
      QuoteCharacter?: string;
      QuoteEscapeCharacter?: string;
      Comments?: string;
      AllowQuotedRecordDelimiter?: boolean;
    };
    JSON?: {
      Type?: 'DOCUMENT' | 'LINES';
    };
    CompressionType?: 'NONE' | 'GZIP' | 'BZIP2';
  };
  outputSerialization: {
    CSV?: {
      RecordDelimiter?: string;
      FieldDelimiter?: string;
      QuoteCharacter?: string;
      QuoteEscapeCharacter?: string;
      QuoteFields?: 'ALWAYS' | 'ASNEEDED';
    };
    JSON?: {
      RecordDelimiter?: string;
    };
  };
  requestProgress?: {
    Enabled: boolean;
  };
}

/**
 * OSSP 通知配置
 */
export interface OsspNotificationConfig {
  CloudWatchConfiguration?: Array<{
    Id?: string;
    Event: string[];
    Filter?: {
      Key?: {
        FilterRules?: Array<{
          Name: 'prefix' | 'suffix';
          Value: string;
        }>;
      };
    };
  }>;
  QueueConfiguration?: Array<{
    Id?: string;
    Queue: string;
    Event: string[];
    Filter?: {
      Key?: {
        FilterRules?: Array<{
          Name: 'prefix' | 'suffix';
          Value: string;
        }>;
      };
    };
  }>;
  TopicConfiguration?: Array<{
    Id?: string;
    Topic: string;
    Event: string[];
    Filter?: {
      Key?: {
        FilterRules?: Array<{
          Name: 'prefix' | 'suffix';
          Value: string;
        }>;
      };
    };
  }>;
  LambdaConfiguration?: Array<{
    Id?: string;
    LambdaFunctionArn: string;
    Event: string[];
    Filter?: {
      Key?: {
        FilterRules?: Array<{
          Name: 'prefix' | 'suffix';
          Value: string;
        }>;
      };
    };
  }>;
}

/**
 * OSSP 错误类型
 */
export class OsspError extends Error {
  public code?: string;
  public statusCode?: number;
  public resource?: string;
  public requestId?: string;
  public hostId?: string;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'OsspError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * OSSP 服务结果类型
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
  timestamp?: Date;
}

/**
 * OSSP 分页结果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * OSSP 查询参数
 */
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
}
