import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Get, Post } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
import path from 'node:path';
import type OsspStorageService from '../services/OsspStorageService.js';

/**
 * OSS 控制器
 * 提供 OSS 相关的 HTTP 接口
 */
@Controller()
export default class OssController {
  constructor(
    private readonly logger: Logger,
    private readonly osspStorageService: OsspStorageService
  ) {
    this.logger.info('✅ OssController initialized');
  }

  /**
   * 生成预签名上传 URL
   * POST /api/icalink/v1/oss/presigned-upload-url
   *
   * 用于前端直接上传文件到 OSS，避免文件经过后端服务器
   */
  @Post('/api/icalink/v1/oss/presigned-upload-url', {
    schema: {
      body: {
        type: 'object',
        required: ['fileName', 'mimeType', 'fileSize', 'businessType'],
        properties: {
          fileName: { type: 'string' },
          mimeType: { type: 'string' },
          fileSize: { type: 'number' },
          businessType: {
            type: 'string',
            enum: ['checkin', 'leave', 'other']
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                uploadUrl: { type: 'string' },
                objectPath: { type: 'string' },
                expiresIn: { type: 'number' },
                bucketName: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  async generatePresignedUploadUrl(
    request: FastifyRequest<{
      Body: {
        fileName: string;
        mimeType: string;
        fileSize: number;
        businessType: 'checkin' | 'leave' | 'other';
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { fileName, mimeType, fileSize, businessType } = request.body;

      this.logger.debug('Generating presigned upload URL', {
        fileName,
        mimeType,
        fileSize,
        businessType
      });

      // 1. 验证文件大小（最大 10MB）
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxFileSize) {
        return reply.status(400).send({
          success: false,
          error: `文件大小超过限制（最大 ${maxFileSize / 1024 / 1024}MB）`
        });
      }

      // 2. 验证 MIME 类型（仅允许图片）
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ];
      if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
        return reply.status(400).send({
          success: false,
          error: '不支持的文件类型，仅支持图片格式（JPEG, PNG, GIF, WebP）'
        });
      }

      // 3. 调用服务生成预签名 URL
      const bucketName = 'icalink-attachments';
      const result = await this.osspStorageService.generatePresignedUploadUrl(
        bucketName,
        {
          fileName,
          mimeType,
          businessType
        }
      );

      // 4. 处理结果
      if (isLeft(result)) {
        this.logger.error('Failed to generate presigned upload URL', {
          error: result.left
        });
        return reply.status(500).send({
          success: false,
          error: result.left.message || '生成预签名上传URL失败'
        });
      }

      // 5. 返回成功响应
      return reply.status(200).send({
        success: true,
        message: '预签名上传URL生成成功',
        data: {
          uploadUrl: result.right.uploadUrl,
          objectPath: result.right.objectPath,
          expiresIn: result.right.expiresIn,
          bucketName: result.right.bucketName
        }
      });
    } catch (error: any) {
      this.logger.error('Error in generatePresignedUploadUrl', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * 生成 POST Policy 上传凭证（推荐方式）
   * POST /api/icalink/v1/oss/post-policy-upload
   *
   * 使用 POST Policy 方式上传文件，无需暴露 accessKey 和 secretKey
   * 前端使用表单 POST 方式直接上传到 OSS
   */
  @Post('/api/icalink/v1/oss/post-policy-upload', {
    schema: {
      body: {
        type: 'object',
        required: ['fileName', 'mimeType', 'fileSize', 'businessType'],
        properties: {
          fileName: { type: 'string' },
          mimeType: { type: 'string' },
          fileSize: { type: 'number' },
          businessType: {
            type: 'string',
            enum: ['checkin', 'leave', 'other']
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                postURL: { type: 'string' },
                formData: { type: 'object' },
                objectPath: { type: 'string' },
                expiresIn: { type: 'number' },
                bucketName: { type: 'string' }
              }
            }
          }
        }
      }
    }
  })
  async generatePostPolicyUpload(
    request: FastifyRequest<{
      Body: {
        fileName: string;
        mimeType: string;
        fileSize: number;
        businessType: 'checkin' | 'leave' | 'other';
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { fileName, mimeType, fileSize, businessType } = request.body;

      this.logger.debug('Generating POST Policy upload credentials', {
        fileName,
        mimeType,
        fileSize,
        businessType
      });

      // 1. 验证文件大小（最大 10MB）
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxFileSize) {
        return reply.status(400).send({
          success: false,
          error: `文件大小超过限制（最大 ${maxFileSize / 1024 / 1024}MB）`
        });
      }

      // 2. 验证 MIME 类型（仅允许图片）
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ];
      if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
        return reply.status(400).send({
          success: false,
          error: '不支持的文件类型，仅支持图片格式（JPEG, PNG, GIF, WebP）'
        });
      }

      // 3. 调用服务生成 POST Policy
      const bucketName = 'icalink-attachments';
      const result = await this.osspStorageService.generatePostPolicyUpload(
        bucketName,
        {
          fileName,
          mimeType,
          businessType
        }
      );

      // 4. 处理结果
      if (isLeft(result)) {
        this.logger.error('Failed to generate POST Policy upload credentials', {
          error: result.left
        });
        return reply.status(500).send({
          success: false,
          error: result.left.message || '生成POST Policy上传凭证失败'
        });
      }

      // 5. 返回成功响应
      return reply.status(200).send({
        success: true,
        message: 'POST Policy上传凭证生成成功',
        data: {
          postURL: result.right.postURL,
          formData: result.right.formData,
          objectPath: result.right.objectPath,
          expiresIn: result.right.expiresIn,
          bucketName: result.right.bucketName
        }
      });
    } catch (error: any) {
      this.logger.error('Error in generatePostPolicyUpload', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * 文件上传接口（后端上传方式）
   * POST /api/icalink/v1/oss/upload
   *
   * 接收前端上传的文件，后端直接上传到 MinIO OSS
   * 支持图片压缩和缩略图生成
   */
  @Post('/api/icalink/v1/oss/upload')
  async uploadFile(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // 1. 用户认证检查
      const userIdentity = (request as any).userIdentity;
      if (!userIdentity) {
        return reply.status(401).send({
          success: false,
          message: '用户未认证'
        });
      }

      this.logger.info('Starting file upload', {
        userId: userIdentity.userId,
        userType: userIdentity.userType
      });

      // 使用 request.parts() 获取 multipart/form-data
      const parts = request.parts();

      let fileData: any = null;
      let businessType: 'checkin' | 'leave' | 'other' = 'other';
      let partCount = 0;

      // 遍历所有部分（字段和文件）
      try {
        for await (const part of parts) {
          partCount++;
          this.logger.info(`Processing part ${partCount}: type=${part.type}`);

          if (part.type === 'file') {
            // 文件部分
            fileData = part;
            this.logger.info('Found file part', {
              filename: part.filename,
              mimetype: part.mimetype,
              encoding: part.encoding
            });

            // ✅ 找到文件后，如果已经有 businessType，就跳出循环
            if (businessType !== 'other') {
              this.logger.info(
                'Breaking loop: found both file and businessType'
              );
              break;
            }
          } else {
            // 字段部分 (part.type === 'field')
            this.logger.info(`Found field: ${part.fieldname} = ${part.value}`);

            if (part.fieldname === 'businessType') {
              businessType = part.value as 'checkin' | 'leave' | 'other';
              this.logger.info('Found businessType', { businessType });

              // ✅ 找到 businessType 后，如果已经有文件，就跳出循环
              if (fileData) {
                this.logger.info(
                  'Breaking loop: found both businessType and file'
                );
                break;
              }
            }
          }
        }
      } catch (error: any) {
        this.logger.error('Error parsing multipart parts', {
          error: error.message,
          stack: error.stack,
          partCount
        });
        throw error;
      }

      this.logger.info('Finished parsing multipart request', {
        partCount,
        hasFile: !!fileData,
        businessType
      });

      // 验证文件
      if (!fileData) {
        return reply.status(400).send({
          success: false,
          message: '未找到上传的文件'
        });
      }

      // 读取文件内容到 Buffer
      let fileBuffer: Buffer;
      let fileName: string;
      let mimeType: string;
      let fileSize: number;

      try {
        this.logger.info('Reading file to buffer...');
        fileBuffer = await fileData.toBuffer();
        fileName = fileData.filename;
        mimeType = fileData.mimetype || 'application/octet-stream';
        fileSize = fileBuffer.length;

        this.logger.info('File read successfully', {
          fileName,
          mimeType,
          fileSize,
          businessType
        });
      } catch (error: any) {
        this.logger.error('Error reading file to buffer', {
          error: error.message,
          stack: error.stack
        });
        return reply.status(500).send({
          success: false,
          message: '读取文件失败'
        });
      }

      // 1. 验证文件大小（最大 10MB）
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      if (fileSize > maxFileSize) {
        return reply.status(400).send({
          success: false,
          message: `文件大小超过限制（最大 ${maxFileSize / 1024 / 1024}MB）`
        });
      }

      // 2. 验证 MIME 类型（仅允许图片）
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ];
      if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
        return reply.status(400).send({
          success: false,
          message: '不支持的文件类型，仅支持图片格式（JPEG, PNG, GIF, WebP）'
        });
      }

      // 3. 获取文件扩展名
      // ✅ 防御性编程：如果文件名是 'blob' 或没有扩展名，根据 MIME 类型生成扩展名
      let extension = path.extname(fileName).slice(1);
      if (!extension || fileName === 'blob') {
        // 根据 MIME 类型映射扩展名
        const mimeToExt: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp'
        };
        extension = mimeToExt[mimeType.toLowerCase()] || 'jpg';

        // 如果原始文件名是 'blob'，生成一个有意义的文件名
        if (fileName === 'blob') {
          fileName = `photo_${Date.now()}.${extension}`;
          this.logger.info('Generated filename from MIME type', {
            originalFileName: 'blob',
            newFileName: fileName,
            mimeType,
            extension
          });
        }
      }

      // 4. 调用服务上传图片
      const bucketName = 'icalink-attachments';
      const uploadResult = await this.osspStorageService.uploadImage(
        bucketName,
        fileBuffer,
        {
          fileName,
          mimeType,
          extension,
          generateThumbnail: false,
          businessType,
          metadata: {
            'upload-time': new Date().toISOString(),
            'business-type': businessType
          }
        }
      );

      // 5. 处理结果
      if (isLeft(uploadResult)) {
        this.logger.error('Failed to upload image', {
          error: uploadResult.left
        });
        return reply.status(500).send({
          success: false,
          message: uploadResult.left.message || '文件上传失败'
        });
      }

      const { objectPath } = uploadResult.right;

      this.logger.info('File uploaded successfully', {
        objectPath,
        bucketName
      });

      return reply.status(200).send({
        success: true,
        message: '文件上传成功',
        data: {
          objectPath,
          bucketName
        }
      });
    } catch (error: any) {
      this.logger.error('Error in uploadFile', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 查看 OSS 图片
   * GET /api/icalink/v1/oss/view/*
   *
   * 通用的图片获取接口，用于代理访问 MinIO/OSS 中的私有图片
   * 支持签到图片、请假图片等所有业务场景
   *
   * @param request - Fastify 请求对象
   * @param reply - Fastify 响应对象
   * @returns 图片二进制数据
   *
   * @description
   * 业务逻辑：
   * 1. 验证用户是否已认证
   * 2. 从 URL 路径中提取对象路径（支持多级路径，如 checkin/123/photo.jpg）
   * 3. 调用 OsspStorageService 从 MinIO 获取图片
   * 4. 设置正确的 Content-Type 响应头
   * 5. 返回图片二进制流
   *
   * HTTP 状态码：
   * - 200: 成功返回图片
   * - 400: 参数验证失败（对象路径为空）
   * - 401: 用户未认证
   * - 404: 图片不存在
   * - 500: 服务器内部错误
   *
   * 示例：
   * - GET /api/icalink/v1/oss/view/checkin/1234567890/photo.jpg
   * - GET /api/icalink/v1/oss/view/leave/9876543210/证明.png
   */
  @Get('/api/icalink/v1/oss/view/*')
  async viewImage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // 1. 用户认证检查
      const userIdentity = (request as any).userIdentity;
      if (!userIdentity) {
        return reply.status(401).send({
          success: false,
          message: '用户未认证'
        });
      }

      // 2. 从 URL 中提取对象路径
      // URL 格式：/api/icalink/v1/oss/view/{objectPath}
      // 例如：/api/icalink/v1/oss/view/checkin/1234567890/photo.jpg
      const fullPath = request.url;
      const prefix = '/api/icalink/v1/oss/view/';

      if (!fullPath.startsWith(prefix)) {
        return reply.status(400).send({
          success: false,
          message: '无效的请求路径'
        });
      }

      // 提取对象路径（去掉前缀和查询参数）
      let objectPath = fullPath.substring(prefix.length);

      // 去掉查询参数（如果有）
      const queryIndex = objectPath.indexOf('?');
      if (queryIndex !== -1) {
        objectPath = objectPath.substring(0, queryIndex);
      }

      // URL 解码（处理中文文件名等特殊字符）
      objectPath = decodeURIComponent(objectPath);

      this.logger.info('Viewing image from OSS', {
        userId: userIdentity.userId,
        userType: userIdentity.userType,
        objectPath
      });

      // 3. 验证对象路径
      if (!objectPath || objectPath.trim() === '') {
        return reply.status(400).send({
          success: false,
          message: '对象路径不能为空'
        });
      }

      // 4. 调用服务层下载图片
      const bucketName = 'icalink-attachments';
      const downloadResult = await this.osspStorageService.downloadImage(
        bucketName,
        objectPath
      );

      // 5. 处理结果
      if (isLeft(downloadResult)) {
        this.logger.error('Failed to download image from OSS', {
          error: downloadResult.left,
          objectPath
        });

        // 判断是否为文件不存在错误
        const errorMessage = downloadResult.left.message || '';
        if (
          errorMessage.includes('不存在') ||
          errorMessage.includes('NotFound') ||
          errorMessage.includes('NoSuchKey')
        ) {
          return reply.status(404).send({
            success: false,
            message: '图片不存在'
          });
        }

        return reply.status(500).send({
          success: false,
          message: downloadResult.left.message || '获取图片失败'
        });
      }

      const { fileName, fileContent, mimeType, fileSize } =
        downloadResult.right;

      this.logger.info('Image downloaded successfully from OSS', {
        objectPath,
        fileName,
        mimeType,
        fileSize
      });

      // 6. 返回图片二进制数据
      reply.raw.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'public, max-age=3600', // 缓存 1 小时
        'Content-Length': fileSize.toString()
      });
      reply.raw.end(fileContent);
    } catch (error: any) {
      this.logger.error('Error in viewImage', {
        error: error.message,
        stack: error.stack
      });
      return reply.status(500).send({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}
