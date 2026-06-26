/**
 * @stratix/ossp - OSSP 客户端适配器
 *
 * 提供统一的对象存储服务适配器，支持多提供商架构
 * 遵循 Stratix 框架的适配器模式规范
 */

import type { Logger } from '@stratix/core';
import type { AwilixContainer } from '@stratix/core/plugin';
import type { Readable } from 'node:stream';
import type { OsspPluginOptions } from '../index.js';
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
} from './interfaces/IOSSAdapter.js';
import {
  AliyunOSSAdapter,
  type AliyunOSSConfig
} from './providers/AliyunOSSAdapter.js';
import { MinioAdapter, type MinioConfig } from './providers/MinioAdapter.js';

/**
 * 适配器工厂函数
 * 根据配置创建对应的 OSS 提供商适配器
 */
function createOSSProviderAdapter(
  config: OsspPluginOptions,
  logger: Logger
): IOSSAdapter {
  const provider = (config.provider || 'minio') as OSSProvider;

  switch (provider) {
    case 'minio':
      return new MinioAdapter(config as MinioConfig, logger);

    case 'aliyun-oss':
      return new AliyunOSSAdapter(config as AliyunOSSConfig, logger);

    // 未来可以添加其他提供商
    // case 'tencent-cos':
    //   return new TencentCOSAdapter(config, logger);
    // case 'aws-s3':
    //   return new AWSS3Adapter(config, logger);

    default:
      logger.warn(`Unknown OSS provider: ${provider}, falling back to MinIO`);
      return new MinioAdapter(config as MinioConfig, logger);
  }
}

/**
 * OSSP 客户端适配器类
 *
 * 遵循 Stratix 框架的 Adapter 层规范：
 * - 使用 SINGLETON 生命周期
 * - 定义静态 adapterName 标识符
 * - 通过容器解析依赖
 * - 提供简化的外部接口
 * - 统一配置和结果格式
 */
export default class ClientAdapter implements IOSSAdapter {
  /**
   * 当前使用的 OSS 提供商适配器
   */
  private adapter: IOSSAdapter;

  /**
   * 日志记录器
   */
  private logger: Logger;

  /**
   * 构造函数
   * @param pluginContainer 插件容器，用于解析依赖
   */
  constructor(pluginContainer: AwilixContainer) {
    this.logger = pluginContainer.resolve<Logger>('logger');

    // 从配置中获取 OSSP 配置
    const config = pluginContainer.resolve<OsspPluginOptions>('config');

    // 创建对应的提供商适配器
    this.adapter = createOSSProviderAdapter(config, this.logger);

    this.logger.info(
      `OSSP Client Adapter initialized with provider: ${this.adapter.provider}`
    );
  }

  /**
   * 应用关闭时的清理钩子
   * 优雅关闭 OSSP 连接
   */
  async onClose(): Promise<void> {
    try {
      this.logger.info('🔄 Closing OSSP connections...');
      await this.adapter.disconnect();
      this.logger.info('✅ OSSP connections closed successfully');
    } catch (error) {
      this.logger.error('❌ Error closing OSSP connections:', error);
      throw error;
    }
  }

  /**
   * 获取提供商类型
   */
  get provider(): OSSProvider {
    return this.adapter.provider;
  }

  /**
   * 获取原始客户端实例（用于高级操作）
   */
  getClient(): any {
    return this.adapter.getClient();
  }

  /**
   * 获取底层适配器实例
   * 用于需要直接访问提供商特定功能的场景
   */
  getAdapter(): IOSSAdapter {
    return this.adapter;
  }

  // ========== 存储桶操作 ==========

  async makeBucket(bucketName: string, region?: string): Promise<void> {
    return this.adapter.makeBucket(bucketName, region);
  }

  async listBuckets(): Promise<BucketInfo[]> {
    return this.adapter.listBuckets();
  }

  async bucketExists(bucketName: string): Promise<boolean> {
    return this.adapter.bucketExists(bucketName);
  }

  async removeBucket(bucketName: string): Promise<void> {
    return this.adapter.removeBucket(bucketName);
  }

  // ========== 对象上传操作 ==========

  async putObject(
    bucketName: string,
    objectName: string,
    stream: Readable | Buffer | string,
    size?: number,
    options?: UploadOptions
  ): Promise<UploadResult> {
    return this.adapter.putObject(
      bucketName,
      objectName,
      stream,
      size,
      options
    );
  }

  async fPutObject(
    bucketName: string,
    objectName: string,
    filePath: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    return this.adapter.fPutObject(bucketName, objectName, filePath, options);
  }

  // ========== 对象下载操作 ==========

  async getObject(
    bucketName: string,
    objectName: string,
    options?: DownloadOptions
  ): Promise<Readable> {
    return this.adapter.getObject(bucketName, objectName, options);
  }

  async getPartialObject(
    bucketName: string,
    objectName: string,
    offset: number,
    length?: number,
    options?: DownloadOptions
  ): Promise<Readable> {
    return this.adapter.getPartialObject(
      bucketName,
      objectName,
      offset,
      length,
      options
    );
  }

  async fGetObject(
    bucketName: string,
    objectName: string,
    filePath: string,
    options?: DownloadOptions
  ): Promise<void> {
    return this.adapter.fGetObject(bucketName, objectName, filePath, options);
  }

  // ========== 对象管理操作 ==========

  async copyObject(
    targetBucket: string,
    targetObject: string,
    sourceBucket: string,
    sourceObject: string
  ): Promise<CopyResult> {
    return this.adapter.copyObject(
      targetBucket,
      targetObject,
      sourceBucket,
      sourceObject
    );
  }

  async statObject(
    bucketName: string,
    objectName: string,
    options?: { versionId?: string }
  ): Promise<ObjectInfo> {
    return this.adapter.statObject(bucketName, objectName, options);
  }

  async removeObject(
    bucketName: string,
    objectName: string,
    options?: DeleteOptions
  ): Promise<void> {
    return this.adapter.removeObject(bucketName, objectName, options);
  }

  async removeObjects(
    bucketName: string,
    objectsList: string[] | DeleteObjectItem[]
  ): Promise<void> {
    return this.adapter.removeObjects(bucketName, objectsList);
  }

  async listObjects(
    bucketName: string,
    options?: ListOptions
  ): Promise<ObjectInfo[]> {
    return this.adapter.listObjects(bucketName, options);
  }

  // ========== 预签名URL操作 ==========

  async presignedUrl(
    method: string,
    bucketName: string,
    objectName: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    return this.adapter.presignedUrl(method, bucketName, objectName, options);
  }

  async presignedGetObject(
    bucketName: string,
    objectName: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    return this.adapter.presignedGetObject(bucketName, objectName, options);
  }

  async presignedPutObject(
    bucketName: string,
    objectName: string,
    expiry?: number
  ): Promise<string> {
    return this.adapter.presignedPutObject(bucketName, objectName, expiry);
  }

  async presignedPostPolicy(policy: any): Promise<{
    postURL: string;
    formData: Record<string, string>;
  }> {
    return this.adapter.presignedPostPolicy(policy);
  }

  createPostPolicy(): any {
    return this.adapter.createPostPolicy();
  }

  // ========== 健康检查和连接管理 ==========

  async ping(): Promise<boolean> {
    return this.adapter.ping();
  }

  isConnected(): boolean {
    return this.adapter.isConnected();
  }

  async disconnect(): Promise<void> {
    return this.adapter.disconnect();
  }
}
