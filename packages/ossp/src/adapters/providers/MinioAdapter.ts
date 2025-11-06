/**
 * @stratix/ossp - MinIO 适配器实现
 *
 * 实现 IOSSAdapter 接口，封装 MinIO 客户端操作
 * 遵循 Stratix 框架的适配器模式规范
 */

import type { Logger } from '@stratix/core';
import { Client as MinioClient, type ClientOptions } from 'minio';
import type { Readable } from 'node:stream';
import type {
  BucketInfo,
  CopyResult,
  DeleteObjectItem,
  DeleteOptions,
  DownloadOptions,
  IOSSAdapter,
  ListOptions,
  ObjectInfo,
  OSSProvider,
  PresignedUrlOptions,
  UploadOptions,
  UploadResult
} from '../interfaces/IOSSAdapter.js';

/**
 * MinIO 配置接口
 */
export interface MinioConfig {
  /** MinIO 服务端点 */
  endPoint: string;
  /** 端口号 */
  port?: number;
  /** 是否使用SSL */
  useSSL?: boolean;
  /** 访问密钥 */
  accessKey: string;
  /** 秘密密钥 */
  secretKey: string;
  /** 会话令牌 */
  sessionToken?: string;
  /** 区域 */
  region?: string;
  /** 分片大小 */
  partSize?: number;
  /** 路径样式 */
  pathStyle?: boolean;
  /** 传输代理 */
  transportAgent?: any;
}

/**
 * MinIO 适配器实现类
 *
 * 封装 MinIO 客户端，实现统一的 OSS 接口
 */
export class MinioAdapter implements IOSSAdapter {
  readonly provider: OSSProvider = 'minio' as OSSProvider;

  private client: MinioClient;
  private config: MinioConfig;
  private logger: Logger;
  private connected: boolean = false;

  constructor(config: MinioConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.client = this.initializeClient();
  }

  /**
   * 初始化 MinIO 客户端
   */
  private initializeClient(): MinioClient {
    try {
      this.logger.info('Initializing MinIO client', {
        endPoint: this.config.endPoint,
        port: this.config.port,
        useSSL: this.config.useSSL
      });

      const clientOptions: ClientOptions = {
        endPoint: this.config.endPoint,
        port: this.config.port || (this.config.useSSL ? 443 : 80),
        useSSL: this.config.useSSL !== false,
        accessKey: this.config.accessKey,
        secretKey: this.config.secretKey,
        sessionToken: this.config.sessionToken,
        region: this.config.region,
        partSize: this.config.partSize,
        pathStyle: this.config.pathStyle,
        transportAgent: this.config.transportAgent
      };

      const client = new MinioClient(clientOptions);
      this.connected = true;

      this.logger.info('MinIO client initialized successfully');
      return client;
    } catch (error) {
      this.logger.error('Failed to initialize MinIO client:', error);
      throw error;
    }
  }

  /**
   * 获取原始 MinIO 客户端实例
   */
  getClient(): MinioClient {
    return this.client;
  }

  // ========== 存储桶操作 ==========

  async makeBucket(bucketName: string, region?: string): Promise<void> {
    try {
      await this.client.makeBucket(
        bucketName,
        region || this.config.region || 'us-east-1'
      );
      this.logger.info(`Bucket created: ${bucketName}`);
    } catch (error) {
      this.logger.error('MinIO makeBucket error:', error);
      throw error;
    }
  }

  async listBuckets(): Promise<BucketInfo[]> {
    try {
      const buckets = await this.client.listBuckets();
      return buckets.map((bucket) => ({
        name: bucket.name,
        creationDate: bucket.creationDate
      }));
    } catch (error) {
      this.logger.error('MinIO listBuckets error:', error);
      throw error;
    }
  }

  async bucketExists(bucketName: string): Promise<boolean> {
    try {
      return await this.client.bucketExists(bucketName);
    } catch (error) {
      this.logger.error('MinIO bucketExists error:', error);
      throw error;
    }
  }

  async removeBucket(bucketName: string): Promise<void> {
    try {
      await this.client.removeBucket(bucketName);
      this.logger.info(`Bucket removed: ${bucketName}`);
    } catch (error) {
      this.logger.error('MinIO removeBucket error:', error);
      throw error;
    }
  }

  // ========== 对象上传操作 ==========

  async putObject(
    bucketName: string,
    objectName: string,
    stream: Readable | Buffer | string,
    size?: number,
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      // MinIO 的 metadata 类型是 ObjectMetaData (string | number)
      // 需要过滤掉 boolean 类型的值
      const metadata = options?.metadata
        ? Object.entries(options.metadata).reduce(
            (acc, [key, value]) => {
              if (typeof value !== 'boolean') {
                acc[key] = value;
              }
              return acc;
            },
            {} as Record<string, string | number>
          )
        : undefined;

      const result = await this.client.putObject(
        bucketName,
        objectName,
        stream,
        size,
        metadata
      );
      this.logger.info(`Object uploaded: ${bucketName}/${objectName}`);
      return {
        etag: result.etag,
        versionId: result.versionId ?? undefined
      };
    } catch (error) {
      this.logger.error('MinIO putObject error:', error);
      throw error;
    }
  }

  async fPutObject(
    bucketName: string,
    objectName: string,
    filePath: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    try {
      // MinIO 的 metadata 类型是 ObjectMetaData (string | number)
      // 需要过滤掉 boolean 类型的值
      const metadata = options?.metadata
        ? Object.entries(options.metadata).reduce(
            (acc, [key, value]) => {
              if (typeof value !== 'boolean') {
                acc[key] = value;
              }
              return acc;
            },
            {} as Record<string, string | number>
          )
        : undefined;

      const result = await this.client.fPutObject(
        bucketName,
        objectName,
        filePath,
        metadata
      );
      this.logger.info(
        `File uploaded: ${filePath} -> ${bucketName}/${objectName}`
      );
      return {
        etag: result.etag,
        versionId: result.versionId ?? undefined
      };
    } catch (error) {
      this.logger.error('MinIO fPutObject error:', error);
      throw error;
    }
  }

  // ========== 对象下载操作 ==========

  async getObject(
    bucketName: string,
    objectName: string,
    options?: DownloadOptions
  ): Promise<Readable> {
    try {
      return await this.client.getObject(bucketName, objectName, options);
    } catch (error) {
      this.logger.error('MinIO getObject error:', error);
      throw error;
    }
  }

  async getPartialObject(
    bucketName: string,
    objectName: string,
    offset: number,
    length?: number,
    options?: DownloadOptions
  ): Promise<Readable> {
    try {
      return await this.client.getPartialObject(
        bucketName,
        objectName,
        offset,
        length,
        options
      );
    } catch (error) {
      this.logger.error('MinIO getPartialObject error:', error);
      throw error;
    }
  }

  async fGetObject(
    bucketName: string,
    objectName: string,
    filePath: string,
    options?: DownloadOptions
  ): Promise<void> {
    try {
      await this.client.fGetObject(bucketName, objectName, filePath, options);
      this.logger.info(
        `File downloaded: ${bucketName}/${objectName} -> ${filePath}`
      );
    } catch (error) {
      this.logger.error('MinIO fGetObject error:', error);
      throw error;
    }
  }

  // ========== 对象管理操作 ==========

  async copyObject(
    targetBucket: string,
    targetObject: string,
    sourceBucket: string,
    sourceObject: string
  ): Promise<CopyResult> {
    try {
      const result = await this.client.copyObject(
        targetBucket,
        targetObject,
        `/${sourceBucket}/${sourceObject}`
      );
      this.logger.info(
        `Object copied: ${sourceBucket}/${sourceObject} -> ${targetBucket}/${targetObject}`
      );

      // MinIO 返回的 CopyObjectResult 有两个版本 (V1 和 V2)
      // 需要处理类型联合
      const etag = 'etag' in result ? result.etag : '';
      const lastModified =
        'lastModified' in result
          ? typeof result.lastModified === 'string'
            ? new Date(result.lastModified)
            : result.lastModified
          : new Date();
      const versionId: string | undefined =
        'versionId' in result && typeof result.versionId === 'string'
          ? result.versionId
          : undefined;

      return {
        etag,
        lastModified,
        versionId
      };
    } catch (error) {
      this.logger.error('MinIO copyObject error:', error);
      throw error;
    }
  }

  async statObject(
    bucketName: string,
    objectName: string,
    options?: { versionId?: string }
  ): Promise<ObjectInfo> {
    try {
      const stat = await this.client.statObject(
        bucketName,
        objectName,
        options
      );
      return {
        name: objectName,
        size: stat.size,
        etag: stat.etag,
        lastModified: stat.lastModified,
        versionId: stat.versionId ?? undefined,
        metadata: stat.metaData
      };
    } catch (error) {
      this.logger.error('MinIO statObject error:', error);
      throw error;
    }
  }

  async removeObject(
    bucketName: string,
    objectName: string,
    options?: DeleteOptions
  ): Promise<void> {
    try {
      await this.client.removeObject(bucketName, objectName, options);
      this.logger.info(`Object removed: ${bucketName}/${objectName}`);
    } catch (error) {
      this.logger.error('MinIO removeObject error:', error);
      throw error;
    }
  }

  async removeObjects(
    bucketName: string,
    objectsList: string[] | DeleteObjectItem[]
  ): Promise<void> {
    try {
      await this.client.removeObjects(bucketName, objectsList);
      this.logger.info(`Objects removed from bucket: ${bucketName}`);
    } catch (error) {
      this.logger.error('MinIO removeObjects error:', error);
      throw error;
    }
  }

  async listObjects(
    bucketName: string,
    options?: ListOptions
  ): Promise<ObjectInfo[]> {
    try {
      return new Promise((resolve, reject) => {
        const objects: ObjectInfo[] = [];
        const stream = this.client.listObjects(
          bucketName,
          options?.prefix || '',
          options?.recursive || false
        );

        stream.on('data', (obj: any) => {
          // 过滤掉不完整的对象信息
          if (
            obj.name &&
            obj.size !== undefined &&
            obj.etag &&
            obj.lastModified
          ) {
            objects.push({
              name: obj.name,
              size: obj.size,
              etag: obj.etag,
              lastModified: obj.lastModified,
              versionId: obj.versionId ?? undefined,
              isDeleteMarker: obj.isDeleteMarker ?? false
            });
          }
        });

        stream.on('end', () => resolve(objects));
        stream.on('error', reject);
      });
    } catch (error) {
      this.logger.error('MinIO listObjects error:', error);
      throw error;
    }
  }

  // ========== 预签名URL操作 ==========

  async presignedUrl(
    method: string,
    bucketName: string,
    objectName: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    try {
      return await this.client.presignedUrl(
        method,
        bucketName,
        objectName,
        options?.expiry,
        options?.reqParams,
        options?.requestDate
      );
    } catch (error) {
      this.logger.error('MinIO presignedUrl error:', error);
      throw error;
    }
  }

  async presignedGetObject(
    bucketName: string,
    objectName: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    try {
      return await this.client.presignedGetObject(
        bucketName,
        objectName,
        options?.expiry,
        options?.respHeaders,
        options?.requestDate
      );
    } catch (error) {
      this.logger.error('MinIO presignedGetObject error:', error);
      throw error;
    }
  }

  async presignedPutObject(
    bucketName: string,
    objectName: string,
    expiry?: number
  ): Promise<string> {
    try {
      return await this.client.presignedPutObject(
        bucketName,
        objectName,
        expiry
      );
    } catch (error) {
      this.logger.error('MinIO presignedPutObject error:', error);
      throw error;
    }
  }

  /**
   * 生成预签名 POST Policy
   * 用于浏览器直接上传文件，无需暴露 accessKey 和 secretKey
   *
   * @param policy POST Policy 对象
   * @returns Promise<{ postURL: string; formData: Record<string, string> }>
   */
  async presignedPostPolicy(policy: any): Promise<{
    postURL: string;
    formData: Record<string, string>;
  }> {
    try {
      return await this.client.presignedPostPolicy(policy);
    } catch (error) {
      this.logger.error('MinIO presignedPostPolicy error:', error);
      throw error;
    }
  }

  // ========== 健康检查和连接管理 ==========

  async ping(): Promise<boolean> {
    try {
      // MinIO 没有直接的 ping 方法，通过列出存储桶来检查连接
      await this.client.listBuckets();
      return true;
    } catch (error) {
      this.logger.error('MinIO ping error:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    try {
      // MinIO 客户端没有显式的断开连接方法
      this.connected = false;
      this.logger.info('MinIO client disconnected');
    } catch (error) {
      this.logger.error('MinIO disconnect error:', error);
      throw error;
    }
  }
}
