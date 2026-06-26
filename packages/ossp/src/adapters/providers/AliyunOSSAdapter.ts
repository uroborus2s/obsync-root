/**
 * @stratix/ossp - 阿里云 OSS 适配器实现
 */

import type { Logger } from '@stratix/core';
import OSS from 'ali-oss';
import { createWriteStream } from 'node:fs';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  OSSProvider,
  type BucketInfo,
  type CopyResult,
  type DeleteObjectItem,
  type DeleteOptions,
  type DownloadOptions,
  type IOSSAdapter,
  type ListOptions,
  type ObjectInfo,
  type ObjectMetadata,
  type PresignedUrlOptions,
  type UploadOptions,
  type UploadResult
} from '../interfaces/IOSSAdapter.js';

type AliOSSClient = {
  _getReqUrl(params: Record<string, any>): string;
  calculatePostSignature(policy: object | string): Record<string, string>;
  copy(
    name: string,
    sourceName: string,
    sourceBucket?: string,
    options?: Record<string, any>
  ): Promise<any>;
  delete(name: string, options?: Record<string, any>): Promise<any>;
  deleteBucket(name: string, options?: Record<string, any>): Promise<any>;
  deleteMulti(
    names: Array<string | Record<string, string>>,
    options?: Record<string, any>
  ): Promise<any>;
  getBucketInfo(name: string, options?: Record<string, any>): Promise<any>;
  getStream(name: string, options?: Record<string, any>): Promise<{
    stream: Readable;
  }>;
  head(name: string, options?: Record<string, any>): Promise<any>;
  list(query?: Record<string, any>, options?: Record<string, any>): Promise<any>;
  listBuckets(
    query?: Record<string, any>,
    options?: Record<string, any>
  ): Promise<any>;
  put(
    name: string,
    file: Buffer | Readable | string,
    options?: Record<string, any>
  ): Promise<any>;
  putBucket(name: string, options?: Record<string, any>): Promise<any>;
  putStream(
    name: string,
    stream: Readable,
    options?: Record<string, any>
  ): Promise<any>;
  signatureUrl(name: string, options?: Record<string, any>): string;
};

type AliOSSConstructor = new (options: Record<string, any>) => AliOSSClient;

/**
 * 阿里云 OSS 配置接口
 */
export interface AliyunOSSConfig {
  provider?: OSSProvider | string;
  accessKey?: string;
  accessKeyId?: string;
  secretKey?: string;
  accessKeySecret?: string;
  sessionToken?: string;
  stsToken?: string;
  endPoint?: string;
  endpoint?: string;
  region?: string;
  bucket?: string;
  defaultBucket?: string;
  useSSL?: boolean;
  secure?: boolean;
  timeout?: number;
  retryAttempts?: number;
  poolSize?: number;
  cname?: boolean;
  internal?: boolean;
  isRequestPay?: boolean;
  userAgent?: string;
  authorizationV4?: boolean;
}

/**
 * 阿里云 OSS 适配器实现类
 */
export class AliyunOSSAdapter implements IOSSAdapter {
  readonly provider = OSSProvider.ALIYUN_OSS;

  private readonly OSSClient = OSS as AliOSSConstructor;
  private readonly client: AliOSSClient;
  private connected = false;

  constructor(
    private readonly config: AliyunOSSConfig,
    private readonly logger: Logger
  ) {
    this.client = this.createClient(config.bucket || config.defaultBucket);
    this.connected = true;
    this.logger.info('Aliyun OSS client initialized successfully');
  }

  getClient(): AliOSSClient {
    return this.client;
  }

  createPostPolicy(): any {
    return {
      conditions: [],
      expiration: new Date(Date.now() + 3600_000).toISOString()
    };
  }

  async makeBucket(bucketName: string, region?: string): Promise<void> {
    await this.createClient(undefined, region).putBucket(bucketName);
    this.logger.info(`Aliyun OSS bucket created: ${bucketName}`);
  }

  async listBuckets(): Promise<BucketInfo[]> {
    const result = await this.client.listBuckets();
    return (result.buckets || []).map((bucket: any) => ({
      name: bucket.name,
      creationDate: new Date(bucket.creationDate),
      region: bucket.region
    }));
  }

  async bucketExists(bucketName: string): Promise<boolean> {
    try {
      await this.client.getBucketInfo(bucketName);
      return true;
    } catch (error) {
      if (this.isNotFound(error)) return false;
      throw error;
    }
  }

  async removeBucket(bucketName: string): Promise<void> {
    await this.client.deleteBucket(bucketName);
    this.logger.info(`Aliyun OSS bucket removed: ${bucketName}`);
  }

  async putObject(
    bucketName: string,
    objectName: string,
    stream: Readable | Buffer | string,
    size?: number,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const client = this.createClient(bucketName);
    const uploadOptions = this.toUploadOptions(options, size);
    const body = typeof stream === 'string' ? Buffer.from(stream) : stream;
    const result =
      this.isReadable(body) && !Buffer.isBuffer(body)
        ? await client.putStream(objectName, body, uploadOptions)
        : await client.put(objectName, body, uploadOptions);

    this.logger.info(`Aliyun OSS object uploaded: ${bucketName}/${objectName}`);
    return { etag: this.getEtag(result), size, url: result.url };
  }

  async fPutObject(
    bucketName: string,
    objectName: string,
    filePath: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    const result = await this.createClient(bucketName).put(
      objectName,
      filePath,
      this.toUploadOptions(options)
    );
    this.logger.info(
      `Aliyun OSS file uploaded: ${filePath} -> ${bucketName}/${objectName}`
    );
    return { etag: this.getEtag(result), url: result.url };
  }

  async getObject(
    bucketName: string,
    objectName: string,
    options?: DownloadOptions
  ): Promise<Readable> {
    const result = await this.createClient(bucketName).getStream(
      objectName,
      this.toDownloadOptions(options)
    );
    return result.stream;
  }

  async getPartialObject(
    bucketName: string,
    objectName: string,
    offset: number,
    length?: number,
    options?: DownloadOptions
  ): Promise<Readable> {
    return this.getObject(bucketName, objectName, {
      ...options,
      range: {
        start: offset,
        end: length === undefined ? undefined : offset + length - 1
      }
    });
  }

  async fGetObject(
    bucketName: string,
    objectName: string,
    filePath: string,
    options?: DownloadOptions
  ): Promise<void> {
    await pipeline(
      await this.getObject(bucketName, objectName, options),
      createWriteStream(filePath)
    );
    this.logger.info(
      `Aliyun OSS file downloaded: ${bucketName}/${objectName} -> ${filePath}`
    );
  }

  async copyObject(
    targetBucket: string,
    targetObject: string,
    sourceBucket: string,
    sourceObject: string
  ): Promise<CopyResult> {
    const result = await this.createClient(targetBucket).copy(
      targetObject,
      sourceObject,
      sourceBucket
    );
    return {
      etag: this.stripQuotes(result.data?.etag),
      lastModified: new Date(result.data?.lastModified || Date.now())
    };
  }

  async statObject(
    bucketName: string,
    objectName: string,
    options?: { versionId?: string }
  ): Promise<ObjectInfo> {
    const result = await this.createClient(bucketName).head(objectName, options);
    const headers = result.res?.headers || {};
    return {
      name: objectName,
      size: Number(headers['content-length'] || 0),
      etag: this.stripQuotes(headers.etag),
      lastModified: new Date(headers['last-modified'] || Date.now()),
      versionId: headers['x-oss-version-id'] || options?.versionId,
      metadata: result.meta || this.extractMetadata(headers),
      contentType: headers['content-type'],
      storageClass: headers['x-oss-storage-class']
    };
  }

  async removeObject(
    bucketName: string,
    objectName: string,
    options?: DeleteOptions
  ): Promise<void> {
    await this.createClient(bucketName).delete(objectName, options);
    this.logger.info(`Aliyun OSS object removed: ${bucketName}/${objectName}`);
  }

  async removeObjects(
    bucketName: string,
    objectsList: string[] | DeleteObjectItem[]
  ): Promise<void> {
    const names = objectsList.map((object) =>
      typeof object === 'string'
        ? object
        : { key: object.name, versionId: object.versionId || '' }
    );
    await this.createClient(bucketName).deleteMulti(names);
    this.logger.info(`Aliyun OSS objects removed from bucket: ${bucketName}`);
  }

  async listObjects(
    bucketName: string,
    options?: ListOptions
  ): Promise<ObjectInfo[]> {
    const query: Record<string, any> = {
      delimiter:
        options?.recursive === false ? options.delimiter || '/' : options?.delimiter,
      marker: options?.startAfter,
      prefix: options?.prefix
    };
    if (options?.maxKeys !== undefined) query['max-keys'] = options.maxKeys;

    const result = await this.createClient(bucketName).list(query);
    return (result.objects || []).map((object: any) => ({
      name: object.name,
      size: Number(object.size || 0),
      etag: this.stripQuotes(object.etag),
      lastModified: new Date(object.lastModified),
      versionId: object.versionId,
      storageClass: object.storageClass
    }));
  }

  async presignedUrl(
    method: string,
    bucketName: string,
    objectName: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    return this.createClient(bucketName).signatureUrl(objectName, {
      ...(options?.reqParams || {}),
      expires: options?.expiry,
      method
    });
  }

  async presignedGetObject(
    bucketName: string,
    objectName: string,
    options?: PresignedUrlOptions
  ): Promise<string> {
    return this.presignedUrl('GET', bucketName, objectName, options);
  }

  async presignedPutObject(
    bucketName: string,
    objectName: string,
    expiry?: number
  ): Promise<string> {
    return this.presignedUrl('PUT', bucketName, objectName, { expiry });
  }

  async presignedPostPolicy(policy: any): Promise<{
    postURL: string;
    formData: Record<string, string>;
  }> {
    const bucket = this.config.bucket || this.config.defaultBucket;
    if (!bucket) {
      throw new Error('Aliyun OSS POST policy requires a configured bucket');
    }

    const client = this.createClient(bucket);
    return {
      postURL: client._getReqUrl({ bucket }),
      formData: client.calculatePostSignature(policy)
    };
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.listBuckets({ 'max-keys': 1 });
      return true;
    } catch (error) {
      this.logger.error('Aliyun OSS ping error:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.logger.info('Aliyun OSS client disconnected');
  }

  private createClient(bucket?: string, region?: string): AliOSSClient {
    return new this.OSSClient({
      accessKeyId: this.config.accessKeyId || this.config.accessKey,
      accessKeySecret: this.config.accessKeySecret || this.config.secretKey,
      authorizationV4: this.config.authorizationV4,
      bucket,
      cname: this.config.cname,
      endpoint: this.config.endpoint || this.config.endPoint,
      internal: this.config.internal,
      isRequestPay: this.config.isRequestPay,
      maxSockets: this.config.poolSize,
      region: region || this.config.region || 'oss-cn-hangzhou',
      retryMax: this.config.retryAttempts,
      secure: this.config.secure ?? this.config.useSSL ?? true,
      stsToken: this.config.stsToken || this.config.sessionToken,
      timeout: this.config.timeout,
      userAgent: this.config.userAgent
    });
  }

  private toUploadOptions(
    options?: UploadOptions,
    size?: number
  ): Record<string, any> {
    const headers: Record<string, string> = {};
    if (options?.cacheControl) headers['Cache-Control'] = options.cacheControl;
    if (options?.contentDisposition) {
      headers['Content-Disposition'] = options.contentDisposition;
    }
    if (options?.contentEncoding) {
      headers['Content-Encoding'] = options.contentEncoding;
    }
    if (options?.storageClass) {
      headers['x-oss-storage-class'] = options.storageClass;
    }
    if (options?.serverSideEncryption) {
      headers['x-oss-server-side-encryption'] = options.serverSideEncryption;
    }
    if (options?.tags) {
      headers['x-oss-tagging'] = new URLSearchParams(options.tags).toString();
    }

    return {
      contentLength: size,
      headers,
      meta: this.toStringMetadata(options?.metadata),
      mime: options?.contentType
    };
  }

  private toDownloadOptions(options?: DownloadOptions): Record<string, any> {
    const headers: Record<string, string> = {};
    if (options?.range) {
      headers.Range = `bytes=${options.range.start}-${options.range.end ?? ''}`;
    }

    return {
      headers,
      versionId: options?.versionId
    };
  }

  private toStringMetadata(
    metadata?: ObjectMetadata
  ): Record<string, string> | undefined {
    if (!metadata) return undefined;
    return Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [key, String(value)])
    );
  }

  private extractMetadata(headers: Record<string, string>): ObjectMetadata {
    return Object.fromEntries(
      Object.entries(headers)
        .filter(([key]) => key.startsWith('x-oss-meta-'))
        .map(([key, value]) => [key.slice(11), value])
    );
  }

  private getEtag(result: any): string {
    return this.stripQuotes(result.etag || result.res?.headers?.etag);
  }

  private stripQuotes(value?: string): string {
    return String(value || '').replace(/^"|"$/g, '');
  }

  private isReadable(value: unknown): value is Readable {
    return !!value && typeof (value as Readable).pipe === 'function';
  }

  private isNotFound(error: unknown): boolean {
    const err = error as { code?: string; status?: number };
    return err.status === 404 || err.code === 'NoSuchBucket';
  }
}
