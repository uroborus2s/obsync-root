import type { FastifyReply, FastifyRequest, Logger } from '@stratix/core';
import { Controller, Post } from '@stratix/core';
import { isLeft } from '@stratix/utils/functional';
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
}
