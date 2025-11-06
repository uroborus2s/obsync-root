import type { Logger } from '@stratix/core';
import { IOSSAdapter } from '@stratix/ossp';
import {
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import sharp from 'sharp';
import type { ServiceError } from '../types/service.js';
import { ServiceErrorCode } from '../types/service.js';

/**
 * 图片上传选项
 */
export interface ImageUploadOptions {
  /** 文件名 */
  fileName: string;
  /** MIME 类型 */
  mimeType: string;
  /** 文件扩展名 */
  extension: string;
  /** 是否生成缩略图 */
  generateThumbnail: boolean;
  /** 元数据 */
  metadata?: Record<string, string>;
}

/**
 * 图片上传结果
 */
export interface ImageUploadResult {
  /** 原图对象路径 */
  objectPath: string;
  /** 缩略图对象路径 */
  thumbnailPath: string;
  /** ETag */
  etag: string;
  /** 版本ID */
  versionId: string;
}

/**
 * 图片下载结果
 */
export interface ImageDownloadResult {
  /** 文件名 */
  fileName: string;
  /** 文件内容 */
  fileContent: Buffer;
  /** MIME 类型 */
  mimeType: string;
  /** 文件大小 */
  fileSize: number;
}

/**
 * 预签名上传URL选项
 */
export interface PresignedUploadUrlOptions {
  /** 文件名 */
  fileName: string;
  /** MIME 类型 */
  mimeType: string;
  /** 业务类型（用于组织文件路径：checkin/leave/other） */
  businessType: 'checkin' | 'leave' | 'other';
}

/**
 * 预签名上传URL结果
 */
export interface PresignedUploadUrlResult {
  /** 预签名上传URL */
  uploadUrl: string;
  /** 对象路径（上传成功后的文件路径） */
  objectPath: string;
  /** URL过期时间（秒） */
  expiresIn: number;
  /** 存储桶名称 */
  bucketName: string;
}

/**
 * OSSP 存储服务接口
 */
export interface IOsspStorageService {
  /**
   * 上传图片到 OSS（自动生成缩略图）
   */
  uploadImage(
    bucketName: string,
    fileContent: Buffer,
    options: ImageUploadOptions
  ): Promise<Either<ServiceError, ImageUploadResult>>;

  /**
   * 从 OSS 下载图片
   */
  downloadImage(
    bucketName: string,
    objectPath: string
  ): Promise<Either<ServiceError, ImageDownloadResult>>;

  /**
   * 获取预签名下载 URL（有效期 1 小时）
   */
  getPresignedUrl(
    bucketName: string,
    objectPath: string
  ): Promise<Either<ServiceError, string>>;

  /**
   * 生成预签名上传 URL（有效期 15 分钟）
   * 用于前端直接上传文件到 OSS
   */
  generatePresignedUploadUrl(
    bucketName: string,
    options: PresignedUploadUrlOptions
  ): Promise<Either<ServiceError, PresignedUploadUrlResult>>;

  /**
   * 检查对象是否存在于 OSS
   * @param bucketName 存储桶名称
   * @param objectPath 对象路径
   * @returns 对象是否存在
   */
  checkObjectExists(
    bucketName: string,
    objectPath: string
  ): Promise<Either<ServiceError, boolean>>;
}

/**
 * OSSP 存储服务实现
 *
 * 封装 OSS 操作并集成 Sharp 图片处理
 * - 自动压缩图片
 * - 生成缩略图（200x200）
 * - 支持预签名 URL
 */
export default class OsspStorageService implements IOsspStorageService {
  constructor(
    private readonly osspClient: IOSSAdapter,
    private readonly logger: Logger
  ) {
    this.logger.info('✅ OsspStorageService initialized');
  }

  /**
   * 上传图片到 OSS
   */
  async uploadImage(
    bucketName: string,
    fileContent: Buffer,
    options: ImageUploadOptions
  ): Promise<Either<ServiceError, ImageUploadResult>> {
    try {
      this.logger.info(
        { bucketName, fileName: options.fileName },
        'Uploading image to OSS'
      );

      // 1. 确保存储桶存在
      const bucketExists = await this.osspClient.bucketExists(bucketName);
      if (!bucketExists) {
        this.logger.info({ bucketName }, 'Creating bucket');
        await this.osspClient.makeBucket(bucketName);
      }

      // 2. 压缩原图
      const compressedImage = await this.compressImage(fileContent);

      // 3. 生成对象路径
      const timestamp = Date.now();
      const objectPath = `images/${timestamp}/${options.fileName}`;

      // 4. 上传原图
      const uploadResult = await this.osspClient.putObject(
        bucketName,
        objectPath,
        compressedImage,
        compressedImage.length,
        {
          contentType: options.mimeType,
          metadata: options.metadata
        }
      );

      this.logger.info(
        { bucketName, objectPath, etag: uploadResult.etag },
        'Image uploaded successfully'
      );

      // 5. 生成并上传缩略图（如果需要）
      let thumbnailPath = '';
      if (options.generateThumbnail) {
        const thumbnail = await this.generateThumbnail(compressedImage);
        thumbnailPath = `thumbnails/${timestamp}/${options.fileName}`;

        await this.osspClient.putObject(
          bucketName,
          thumbnailPath,
          thumbnail,
          thumbnail.length,
          {
            contentType: options.mimeType,
            metadata: options.metadata
          }
        );

        this.logger.info({ bucketName, thumbnailPath }, 'Thumbnail uploaded');
      }

      return right({
        objectPath,
        thumbnailPath,
        etag: uploadResult.etag || '',
        versionId: uploadResult.versionId || ''
      });
    } catch (error) {
      this.logger.error({ error, bucketName }, 'Failed to upload image');
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '上传图片失败'
      });
    }
  }

  /**
   * 从 OSS 下载图片
   */
  async downloadImage(
    bucketName: string,
    objectPath: string
  ): Promise<Either<ServiceError, ImageDownloadResult>> {
    try {
      this.logger.info(
        { bucketName, objectPath },
        'Downloading image from OSS'
      );

      // 1. 获取对象信息
      const stat = await this.osspClient.statObject(bucketName, objectPath);

      // 2. 下载对象
      const stream = await this.osspClient.getObject(bucketName, objectPath);

      // 3. 将流转换为 Buffer
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const fileContent = Buffer.concat(chunks);

      this.logger.info(
        { bucketName, objectPath, size: fileContent.length },
        'Image downloaded successfully'
      );

      // 4. 提取文件名
      const fileName = objectPath.split('/').pop() || 'download';

      // 5. 提取 MIME 类型（确保是字符串）
      const contentType = stat.metadata?.['content-type'];
      const mimeType =
        typeof contentType === 'string'
          ? contentType
          : 'application/octet-stream';

      return right({
        fileName,
        fileContent,
        mimeType,
        fileSize: fileContent.length
      });
    } catch (error) {
      this.logger.error(
        { error, bucketName, objectPath },
        'Failed to download image'
      );
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '下载图片失败'
      });
    }
  }

  /**
   * 获取预签名 URL
   */
  async getPresignedUrl(
    bucketName: string,
    objectPath: string
  ): Promise<Either<ServiceError, string>> {
    try {
      this.logger.info({ bucketName, objectPath }, 'Generating presigned URL');

      // 生成有效期 1 小时的预签名 URL
      const url = await this.osspClient.presignedGetObject(
        bucketName,
        objectPath,
        { expiry: 3600 } // 1 小时
      );

      this.logger.info(
        { bucketName, objectPath, url },
        'Presigned URL generated'
      );

      return right(url);
    } catch (error) {
      this.logger.error(
        { error, bucketName, objectPath },
        'Failed to generate presigned URL'
      );
      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: error instanceof Error ? error.message : '生成预签名URL失败'
      });
    }
  }

  /**
   * 压缩图片
   *
   * 压缩策略：
   * - 目标大小：1.5MB
   * - 最大尺寸：1920px
   * - 质量：70-85（根据文件大小动态调整）
   * - PNG 转 JPEG（更好的压缩率）
   */
  private async compressImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const originalSize = imageBuffer.length;

      // 计算目标质量
      let quality = 85;
      if (originalSize > 5 * 1024 * 1024) {
        quality = 70; // > 5MB
      } else if (originalSize > 3 * 1024 * 1024) {
        quality = 75; // > 3MB
      }

      // 计算目标尺寸
      let resizeOptions: { width?: number; height?: number } | undefined;
      if (metadata.width && metadata.height) {
        const maxDimension = 1920;
        if (metadata.width > maxDimension || metadata.height > maxDimension) {
          const ratio = Math.min(
            maxDimension / metadata.width,
            maxDimension / metadata.height
          );
          resizeOptions = {
            width: Math.round(metadata.width * ratio),
            height: Math.round(metadata.height * ratio)
          };
        }
      }

      // 压缩图片
      let pipeline = sharp(imageBuffer);

      if (resizeOptions) {
        pipeline = pipeline.resize(resizeOptions.width, resizeOptions.height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // PNG 转 JPEG
      if (metadata.format === 'png') {
        pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
      } else {
        pipeline = pipeline.jpeg({ quality, progressive: true });
      }

      const compressedBuffer = await pipeline.toBuffer();

      this.logger.info(
        {
          originalSize,
          compressedSize: compressedBuffer.length,
          ratio:
            ((compressedBuffer.length / originalSize) * 100).toFixed(2) + '%'
        },
        'Image compressed'
      );

      return compressedBuffer;
    } catch (error) {
      this.logger.warn({ error }, 'Failed to compress image, using original');
      return imageBuffer;
    }
  }

  /**
   * 生成缩略图
   *
   * 缩略图规格：
   * - 尺寸：200x200
   * - 质量：80
   * - 格式：JPEG
   */
  private async generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const thumbnail = await sharp(imageBuffer)
        .resize(200, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      this.logger.info(
        { thumbnailSize: thumbnail.length },
        'Thumbnail generated'
      );

      return thumbnail;
    } catch (error) {
      this.logger.error({ error }, 'Failed to generate thumbnail');
      throw error;
    }
  }

  /**
   * 生成预签名上传 URL
   *
   * 用于前端直接上传文件到 OSS，避免文件经过后端服务器
   * - 有效期：15 分钟
   * - 自动按业务类型和时间戳组织文件路径
   * - 路径格式：{businessType}/{timestamp}/{fileName}
   */
  async generatePresignedUploadUrl(
    bucketName: string,
    options: PresignedUploadUrlOptions
  ): Promise<Either<ServiceError, PresignedUploadUrlResult>> {
    try {
      this.logger.info(
        {
          bucketName,
          fileName: options.fileName,
          businessType: options.businessType
        },
        'Generating presigned upload URL'
      );

      // 1. 确保存储桶存在
      const bucketExists = await this.osspClient.bucketExists(bucketName);
      if (!bucketExists) {
        this.logger.info(
          { bucketName },
          'Creating bucket for presigned upload'
        );
        await this.osspClient.makeBucket(bucketName);
      }

      // 2. 生成对象路径（按业务类型和时间戳组织）
      const timestamp = Date.now();
      const businessPath = options.businessType;
      const objectPath = `${businessPath}/${timestamp}/${options.fileName}`;

      // 3. 生成预签名上传 URL（有效期 15 分钟）
      const expiresIn = 15 * 60; // 15 分钟
      const uploadUrl = await this.osspClient.presignedPutObject(
        bucketName,
        objectPath,
        expiresIn
      );

      this.logger.info(
        { objectPath, expiresIn },
        'Presigned upload URL generated successfully'
      );

      return right({
        uploadUrl,
        objectPath,
        expiresIn,
        bucketName
      });
    } catch (error) {
      this.logger.error(
        { error, bucketName, fileName: options.fileName },
        'Failed to generate presigned upload URL'
      );
      return left({
        code: String(ServiceErrorCode.STORAGE_ERROR),
        message: '生成预签名上传URL失败'
      });
    }
  }

  /**
   * 检查对象是否存在于 OSS
   * @param bucketName 存储桶名称
   * @param objectPath 对象路径
   * @returns 对象是否存在
   */
  async checkObjectExists(
    bucketName: string,
    objectPath: string
  ): Promise<Either<ServiceError, boolean>> {
    try {
      this.logger.debug(
        { bucketName, objectPath },
        'Checking if object exists in OSS'
      );

      // 使用 statObject 检查对象是否存在
      await this.osspClient.statObject(bucketName, objectPath);

      this.logger.debug({ bucketName, objectPath }, 'Object exists in OSS');

      return right(true);
    } catch (error: any) {
      // 如果对象不存在，MinIO 会抛出错误
      // 检查错误码，如果是 NotFound，返回 false
      if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
        this.logger.debug(
          { bucketName, objectPath },
          'Object does not exist in OSS'
        );
        return right(false);
      }

      // 其他错误（如权限问题、网络问题）返回错误
      this.logger.error(
        { error, bucketName, objectPath },
        'Failed to check object existence'
      );
      return left({
        code: String(ServiceErrorCode.STORAGE_ERROR),
        message: '检查对象是否存在失败'
      });
    }
  }
}
