import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeaveService from '../LeaveService';

// Mock dependencies
const mockLeaveApplicationRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findWithDetailsPaginated: vi.fn()
};

const mockLeaveApprovalRepository = {
  create: vi.fn(),
  findByLeaveApplication: vi.fn()
};

const mockLeaveAttachmentRepository = {
  create: vi.fn(),
  findByLeaveApplication: vi.fn(),
  findById: vi.fn()
};

const mockAttendanceRecordRepository = {
  findById: vi.fn(),
  update: vi.fn()
};

const mockAttendanceCourseRepository = {
  findByCourseCode: vi.fn()
};

const mockUserService = {
  getUserInfo: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

describe('LeaveService - Image Compression', () => {
  let leaveService: LeaveService;

  beforeEach(() => {
    vi.clearAllMocks();

    leaveService = new LeaveService(
      mockLeaveApplicationRepository as any,
      mockLeaveApprovalRepository as any,
      mockLeaveAttachmentRepository as any,
      mockAttendanceRecordRepository as any,
      mockAttendanceCourseRepository as any,
      mockUserService as any,
      mockLogger as any
    );
  });

  describe('processLeaveAttachments with compression', () => {
    it('should compress large images automatically', async () => {
      // 创建一个模拟的大图片数据 (3MB)
      const largeSize = 3 * 1024 * 1024; // 3MB
      const largeImageBuffer = Buffer.alloc(largeSize, 0xff); // 填充数据

      // 创建一个真实的小图片作为基础，然后扩展它
      const baseImage = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      })
        .jpeg({ quality: 100 })
        .toBuffer();

      // 将真实图片数据复制到大缓冲区的开头
      baseImage.copy(largeImageBuffer, 0);

      const base64Content = largeImageBuffer.toString('base64');

      // Mock repository create method to return success
      mockLeaveAttachmentRepository.create.mockResolvedValue({
        success: true,
        data: 123 // attachment ID
      });

      const testImages = [
        {
          name: 'large-test-image.jpg',
          type: 'image/jpeg',
          size: largeSize, // 使用实际的大小
          content: base64Content
        }
      ];

      const result = await leaveService.processLeaveAttachments(1, testImages);

      expect(result.success).toBe(true);
      expect(result.data.uploadedCount).toBe(1);
      expect(result.data.attachmentIds).toHaveLength(1);
      expect(result.data.attachmentIds[0]).toBe(123);

      // 验证压缩日志被调用
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'large-test-image.jpg',
          originalSize: expect.any(Number),
          maxAllowed: 2 * 1024 * 1024
        }),
        'Image too large for database, attempting compression'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'large-test-image.jpg',
          originalSize: expect.any(Number),
          compressedSize: expect.any(Number),
          compressionRatio: expect.stringMatching(/\d+\.\d+%/)
        }),
        'Image compressed successfully'
      );

      // 验证 repository create 被调用时使用了压缩后的数据
      expect(mockLeaveAttachmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leave_application_id: 1,
          image_name: 'large-test-image.jpg',
          image_type: 'image/jpeg',
          image_size: expect.any(Number), // 应该是压缩后的大小
          image_content: expect.any(Buffer)
        })
      );
    });

    it('should handle PNG to JPEG conversion', async () => {
      // 创建一个 PNG 图片
      const pngImageBuffer = await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
        .png()
        .toBuffer();

      const base64Content = pngImageBuffer.toString('base64');

      mockLeaveAttachmentRepository.create.mockResolvedValue({
        success: true,
        data: 124
      });

      const testImages = [
        {
          name: 'test-image.png',
          type: 'image/png',
          size: pngImageBuffer.length,
          content: base64Content
        }
      ];

      const result = await leaveService.processLeaveAttachments(1, testImages);

      expect(result.success).toBe(true);
      expect(result.data.uploadedCount).toBe(1);

      // PNG 应该被转换为 JPEG 以获得更好的压缩率
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'png',
          mimeType: 'image/png'
        }),
        'Starting image compression with Sharp'
      );
    });

    it('should handle compression failure gracefully', async () => {
      // 创建无效的图片数据
      const invalidImageData = Buffer.from('invalid image data');
      const base64Content = invalidImageData.toString('base64');

      mockLeaveAttachmentRepository.create.mockResolvedValue({
        success: true,
        data: 125
      });

      const testImages = [
        {
          name: 'invalid-image.jpg',
          type: 'image/jpeg',
          size: 3 * 1024 * 1024, // 3MB
          content: base64Content
        }
      ];

      const result = await leaveService.processLeaveAttachments(1, testImages);

      expect(result.success).toBe(true);
      expect(result.data.uploadedCount).toBe(1);

      // 应该记录压缩失败的警告
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'invalid-image.jpg',
          compressionError: expect.any(String)
        }),
        'Image compression failed, uploading original'
      );
    });

    it('should not compress small images', async () => {
      // 创建一个小图片 (< 2MB)
      const smallImageBuffer = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 0, g: 255, b: 0 }
        }
      })
        .jpeg({ quality: 80 })
        .toBuffer();

      const base64Content = smallImageBuffer.toString('base64');

      mockLeaveAttachmentRepository.create.mockResolvedValue({
        success: true,
        data: 126
      });

      const testImages = [
        {
          name: 'small-image.jpg',
          type: 'image/jpeg',
          size: smallImageBuffer.length,
          content: base64Content
        }
      ];

      const result = await leaveService.processLeaveAttachments(1, testImages);

      expect(result.success).toBe(true);
      expect(result.data.uploadedCount).toBe(1);

      // 小图片不应该触发压缩警告
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'small-image.jpg'
        }),
        'Image too large for database, attempting compression'
      );
    });

    it('should handle multiple images with mixed sizes', async () => {
      // 创建一个大图片和一个小图片
      const largeImageBuffer = await sharp({
        create: {
          width: 2000,
          height: 2000,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      })
        .jpeg({ quality: 100 })
        .toBuffer();

      const smallImageBuffer = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 3,
          background: { r: 0, g: 255, b: 0 }
        }
      })
        .jpeg({ quality: 80 })
        .toBuffer();

      mockLeaveAttachmentRepository.create
        .mockResolvedValueOnce({ success: true, data: 127 })
        .mockResolvedValueOnce({ success: true, data: 128 });

      const testImages = [
        {
          name: 'large-image.jpg',
          type: 'image/jpeg',
          size: largeImageBuffer.length,
          content: largeImageBuffer.toString('base64')
        },
        {
          name: 'small-image.jpg',
          type: 'image/jpeg',
          size: smallImageBuffer.length,
          content: smallImageBuffer.toString('base64')
        }
      ];

      const result = await leaveService.processLeaveAttachments(1, testImages);

      expect(result.success).toBe(true);
      expect(result.data.uploadedCount).toBe(2);
      expect(result.data.attachmentIds).toHaveLength(2);
      expect(result.data.attachmentIds).toEqual([127, 128]);

      // 只有大图片应该触发压缩
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'large-image.jpg'
        }),
        'Image too large for database, attempting compression'
      );

      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'small-image.jpg'
        }),
        'Image too large for database, attempting compression'
      );
    });
  });
});
