/**
 * @stratix/ossp - OSS 适配器抽象接口
 *
 * 定义统一的对象存储服务接口，支持多提供商实现
 * 遵循 Stratix 框架的适配器模式规范
 */

import type { Readable } from 'node:stream';

/**
 * OSS 提供商类型枚举
 */
export enum OSSProvider {
  /** MinIO 对象存储 */
  MINIO = 'minio',
  /** 阿里云 OSS */
  ALIYUN_OSS = 'aliyun-oss',
  /** 腾讯云 COS */
  TENCENT_COS = 'tencent-cos',
  /** AWS S3 */
  AWS_S3 = 'aws-s3',
  /** 华为云 OBS */
  HUAWEI_OBS = 'huawei-obs'
}

/**
 * 对象元数据接口
 */
export interface ObjectMetadata {
  [key: string]: string | number | boolean;
}

/**
 * 对象信息接口
 */
export interface ObjectInfo {
  /** 对象名称 */
  name: string;
  /** 对象大小（字节） */
  size: number;
  /** ETag 标识 */
  etag: string;
  /** 最后修改时间 */
  lastModified: Date;
  /** 版本ID（如果启用版本控制） */
  versionId?: string;
  /** 是否为删除标记 */
  isDeleteMarker?: boolean;
  /** 对象元数据 */
  metadata?: ObjectMetadata;
  /** 内容类型 */
  contentType?: string;
  /** 存储类型 */
  storageClass?: string;
}

/**
 * 存储桶信息接口
 */
export interface BucketInfo {
  /** 存储桶名称 */
  name: string;
  /** 创建时间 */
  creationDate: Date;
  /** 区域 */
  region?: string;
  /** 版本控制状态 */
  versioningStatus?: 'Enabled' | 'Suspended' | 'Disabled';
}

/**
 * 上传选项
 */
export interface UploadOptions {
  /** 对象元数据 */
  metadata?: ObjectMetadata;
  /** 内容类型 */
  contentType?: string;
  /** 内容编码 */
  contentEncoding?: string;
  /** 缓存控制 */
  cacheControl?: string;
  /** 内容处置 */
  contentDisposition?: string;
  /** 存储类型 */
  storageClass?: string;
  /** 服务端加密 */
  serverSideEncryption?: string;
  /** 标签 */
  tags?: Record<string, string>;
}

/**
 * 下载选项
 */
export interface DownloadOptions {
  /** 版本ID */
  versionId?: string;
  /** 范围下载（字节范围） */
  range?: { start: number; end?: number };
  /** 服务端加密选项 */
  SSECustomerAlgorithm?: string;
  SSECustomerKey?: string;
  SSECustomerKeyMD5?: string;
}

/**
 * 列表选项
 */
export interface ListOptions {
  /** 前缀过滤 */
  prefix?: string;
  /** 递归列表 */
  recursive?: boolean;
  /** 最大返回数量 */
  maxKeys?: number;
  /** 起始位置 */
  startAfter?: string;
  /** 包含版本信息 */
  includeVersion?: boolean;
  /** 分隔符 */
  delimiter?: string;
}

/**
 * 预签名URL选项
 */
export interface PresignedUrlOptions {
  /** 过期时间（秒），默认 7 天 */
  expiry?: number;
  /** 请求参数 */
  reqParams?: Record<string, any>;
  /** 响应头 */
  respHeaders?: Record<string, string>;
  /** 请求日期 */
  requestDate?: Date;
  /** HTTP 方法 */
  method?: 'GET' | 'PUT' | 'POST' | 'DELETE';
}

/**
 * 上传结果
 */
export interface UploadResult {
  /** ETag 标识 */
  etag: string;
  /** 版本ID */
  versionId?: string;
  /** 对象URL */
  url?: string;
  /** 对象大小 */
  size?: number;
}

/**
 * 复制结果
 */
export interface CopyResult {
  /** ETag 标识 */
  etag: string;
  /** 最后修改时间 */
  lastModified: Date;
  /** 版本ID */
  versionId?: string;
}

/**
 * 删除选项
 */
export interface DeleteOptions {
  /** 版本ID */
  versionId?: string;
  /** 绕过治理模式 */
  governanceBypass?: boolean;
}

/**
 * 批量删除对象项
 */
export interface DeleteObjectItem {
  /** 对象名称 */
  name: string;
  /** 版本ID */
  versionId?: string;
}

/**
 * OSS 适配器抽象接口
 *
 * 定义所有 OSS 提供商必须实现的标准方法
 */
export interface IOSSAdapter {
  /**
   * 获取提供商类型
   */
  readonly provider: OSSProvider;

  /**
   * 获取原始客户端实例（用于高级操作）
   */
  getClient(): any;

  // ========== 存储桶操作 ==========

  /**
   * 创建存储桶
   * @param bucketName 存储桶名称
   * @param region 区域（可选）
   */
  makeBucket(bucketName: string, region?: string): Promise<void>;

  /**
   * 列出所有存储桶
   */
  listBuckets(): Promise<BucketInfo[]>;

  /**
   * 检查存储桶是否存在
   * @param bucketName 存储桶名称
   */
  bucketExists(bucketName: string): Promise<boolean>;

  /**
   * 删除存储桶
   * @param bucketName 存储桶名称
   */
  removeBucket(bucketName: string): Promise<void>;

  // ========== 对象上传操作 ==========

  /**
   * 上传对象（流式上传）
   * @param bucketName 存储桶名称
   * @param objectName 对象名称
   * @param stream 数据流
   * @param size 数据大小（可选）
   * @param options 上传选项
   */
  putObject(
    bucketName: string,
    objectName: string,
    stream: Readable | Buffer | string,
    size?: number,
    options?: UploadOptions
  ): Promise<UploadResult>;

  /**
   * 上传文件
   * @param bucketName 存储桶名称
   * @param objectName 对象名称
   * @param filePath 文件路径
   * @param options 上传选项
   */
  fPutObject(
    bucketName: string,
    objectName: string,
    filePath: string,
    options?: UploadOptions
  ): Promise<UploadResult>;

  // ========== 对象下载操作 ==========

  /**
   * 获取对象（返回流）
   * @param bucketName 存储桶名称
   * @param objectName 对象名称
   * @param options 下载选项
   */
  getObject(
    bucketName: string,
    objectName: string,
    options?: DownloadOptions
  ): Promise<Readable>;

  /**
   * 获取部分对象
   * @param bucketName 存储桶名称
   * @param objectName 对象名称
   * @param offset 起始偏移量
   * @param length 读取长度
   * @param options 下载选项
   */
  getPartialObject(
    bucketName: string,
    objectName: string,
    offset: number,
    length?: number,
    options?: DownloadOptions
  ): Promise<Readable>;

  /**
   * 下载文件到本地
   * @param bucketName 存储桶名称
   * @param objectName 对象名称
   * @param filePath 本地文件路径
   * @param options 下载选项
   */
  fGetObject(
    bucketName: string,
    objectName: string,
    filePath: string,
    options?: DownloadOptions
  ): Promise<void>;

  // ========== 对象管理操作 ==========

  /**
   * 复制对象
   * @param targetBucket 目标存储桶
   * @param targetObject 目标对象名称
   * @param sourceBucket 源存储桶
   * @param sourceObject 源对象名称
   */
  copyObject(
    targetBucket: string,
    targetObject: string,
    sourceBucket: string,
    sourceObject: string
  ): Promise<CopyResult>;

  /**
   * 获取对象信息
   * @param bucketName 存储桶名称
   * @param objectName 对象名称
   * @param options 选项
   */
  statObject(
    bucketName: string,
    objectName: string,
    options?: { versionId?: string }
  ): Promise<ObjectInfo>;

  /**
   * 删除对象
   * @param bucketName 存储桶名称
   * @param objectName 对象名称
   * @param options 删除选项
   */
  removeObject(
    bucketName: string,
    objectName: string,
    options?: DeleteOptions
  ): Promise<void>;

  /**
   * 批量删除对象
   * @param bucketName 存储桶名称
   * @param objectsList 对象列表
   */
  removeObjects(
    bucketName: string,
    objectsList: string[] | DeleteObjectItem[]
  ): Promise<void>;

  /**
   * 列出对象
   * @param bucketName 存储桶名称
   * @param options 列表选项
   */
  listObjects(bucketName: string, options?: ListOptions): Promise<ObjectInfo[]>;

  // ========== 预签名URL操作 ==========

  /**
   * 生成预签名URL
   * @param method HTTP方法
   * @param bucketName 存储桶名称
   * @param objectName 对象名称
   * @param options 预签名选项
   */
  presignedUrl(
    method: string,
    bucketName: string,
    objectName: string,
    options?: PresignedUrlOptions
  ): Promise<string>;

  /**
   * 生成预签名GET URL（用于下载）
   * @param bucketName 存储桶名称
   * @param objectName 对象名称
   * @param options 预签名选项
   */
  presignedGetObject(
    bucketName: string,
    objectName: string,
    options?: PresignedUrlOptions
  ): Promise<string>;

  /**
   * 生成预签名PUT URL（用于上传）
   * @param bucketName 存储桶名称
   * @param objectName 对象名称
   * @param expiry 过期时间（秒）
   */
  presignedPutObject(
    bucketName: string,
    objectName: string,
    expiry?: number
  ): Promise<string>;

  /**
   * 生成预签名 POST Policy（用于浏览器直接上传）
   * @param policy POST Policy 对象
   * @returns Promise<{ postURL: string; formData: Record<string, string> }>
   */
  presignedPostPolicy(policy: any): Promise<{
    postURL: string;
    formData: Record<string, string>;
  }>;

  /**
   * 创建 PostPolicy 实例
   * @returns PostPolicy 实例
   */
  createPostPolicy(): any;

  // ========== 健康检查和连接管理 ==========

  /**
   * 健康检查
   */
  ping(): Promise<boolean>;

  /**
   * 检查连接状态
   */
  isConnected(): boolean;

  /**
   * 断开连接
   */
  disconnect(): Promise<void>;
}
