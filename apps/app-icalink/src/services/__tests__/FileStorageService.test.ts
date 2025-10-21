// @wps/app-icalink FileStorageService 测试
// 基于 Vitest 的文件存储服务测试

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import FileStorageService from '../FileStorageService.js';
import type { FileStorageConfig } from '../interfaces/IFileStorageService.js';
import { ServiceErrorCode } from '../../types/service.js';

// Mock logger
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('FileStorageService', () => {
  let fileStorageService: FileStorageService;
  let testConfig: FileStorageConfig;
  let testBaseDir: string;

  beforeEach(async () => {
    // 创建临时测试目录
    testBaseDir = path.join('/tmp', 'test-icalink-files', Date.now().toString());
    
    testConfig = {
      baseDir: testBaseDir,
      baseUrl: '/files',
      maxFileSize: 1024 * 1024, // 1MB
      allowedExtensions: ['jpg', 'png', 'gif'],
      enableCompression: true
    };

    fileStorageService = new FileStorageService(testConfig, mockLogger as any);

    // 确保测试目录存在
    await fs.mkdir(testBaseDir, { recursive: true });
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('storeLeaveAttachment', () => {
    it('应该成功存储附件文件', async () => {
      const applicationId = 123;
      const attachmentId = 456;
      const imageData = Buffer.from('test image data');
      const thumbnailData = Buffer.from('test thumbnail data');
      const fileExtension = 'jpg';

      const result = await fileStorageService.storeLeaveAttachment(
        applicationId,
        attachmentId,
        imageData,
        thumbnailData,
        fileExtension
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.originalPath).toMatch(/attachments\/\d{4}\/\d{2}\/original\/123_456_\d+\.jpg/);
      expect(result.data!.thumbnailPath).toMatch(/attachments\/\d{4}\/\d{2}\/thumbnails\/123_456_\d+_thumb\.jpg/);
      expect(result.data!.originalSize).toBe(imageData.length);
      expect(result.data!.thumbnailSize).toBe(thumbnailData.length);
    });

    it('应该拒绝过大的文件', async () => {
      const applicationId = 123;
      const attachmentId = 456;
      const largeImageData = Buffer.alloc(2 * 1024 * 1024); // 2MB，超过1MB限制
      const fileExtension = 'jpg';

      const result = await fileStorageService.storeLeaveAttachment(
        applicationId,
        attachmentId,
        largeImageData,
        undefined,
        fileExtension
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ServiceErrorCode.STORAGE_ERROR);
    });

    it('应该拒绝不允许的文件扩展名', async () => {
      const applicationId = 123;
      const attachmentId = 456;
      const imageData = Buffer.from('test image data');
      const fileExtension = 'exe'; // 不在允许列表中

      const result = await fileStorageService.storeLeaveAttachment(
        applicationId,
        attachmentId,
        imageData,
        undefined,
        fileExtension
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ServiceErrorCode.STORAGE_ERROR);
    });
  });

  describe('retrieveLeaveAttachment', () => {
    it('应该成功检索存在的文件', async () => {
      // 先存储一个文件
      const applicationId = 123;
      const attachmentId = 456;
      const imageData = Buffer.from('test image data');
      const fileExtension = 'jpg';

      const storeResult = await fileStorageService.storeLeaveAttachment(
        applicationId,
        attachmentId,
        imageData,
        undefined,
        fileExtension
      );

      expect(storeResult.success).toBe(true);

      // 然后检索文件
      const retrieveResult = await fileStorageService.retrieveLeaveAttachment(
        storeResult.data!.originalPath
      );

      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data).toEqual(imageData);
    });

    it('应该返回错误当文件不存在时', async () => {
      const result = await fileStorageService.retrieveLeaveAttachment(
        'attachments/2024/01/original/nonexistent.jpg'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ServiceErrorCode.STORAGE_ERROR);
    });
  });

  describe('fileExists', () => {
    it('应该正确检测文件是否存在', async () => {
      // 先存储一个文件
      const applicationId = 123;
      const attachmentId = 456;
      const imageData = Buffer.from('test image data');
      const fileExtension = 'jpg';

      const storeResult = await fileStorageService.storeLeaveAttachment(
        applicationId,
        attachmentId,
        imageData,
        undefined,
        fileExtension
      );

      expect(storeResult.success).toBe(true);

      // 检查文件是否存在
      const existsResult = await fileStorageService.fileExists(
        storeResult.data!.originalPath
      );

      expect(existsResult.success).toBe(true);
      expect(existsResult.data).toBe(true);

      // 检查不存在的文件
      const notExistsResult = await fileStorageService.fileExists(
        'attachments/2024/01/original/nonexistent.jpg'
      );

      expect(notExistsResult.success).toBe(true);
      expect(notExistsResult.data).toBe(false);
    });
  });

  describe('deleteLeaveAttachment', () => {
    it('应该成功删除存在的文件', async () => {
      // 先存储一个文件
      const applicationId = 123;
      const attachmentId = 456;
      const imageData = Buffer.from('test image data');
      const thumbnailData = Buffer.from('test thumbnail data');
      const fileExtension = 'jpg';

      const storeResult = await fileStorageService.storeLeaveAttachment(
        applicationId,
        attachmentId,
        imageData,
        thumbnailData,
        fileExtension
      );

      expect(storeResult.success).toBe(true);

      // 删除文件
      const deleteResult = await fileStorageService.deleteLeaveAttachment(
        storeResult.data!.originalPath,
        storeResult.data!.thumbnailPath
      );

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data).toBe(true);

      // 验证文件已被删除
      const existsResult = await fileStorageService.fileExists(
        storeResult.data!.originalPath
      );

      expect(existsResult.data).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('应该返回正确的文件信息', async () => {
      // 先存储一个文件
      const applicationId = 123;
      const attachmentId = 456;
      const imageData = Buffer.from('test image data');
      const fileExtension = 'jpg';

      const storeResult = await fileStorageService.storeLeaveAttachment(
        applicationId,
        attachmentId,
        imageData,
        undefined,
        fileExtension
      );

      expect(storeResult.success).toBe(true);

      // 获取文件信息
      const infoResult = await fileStorageService.getFileInfo(
        storeResult.data!.originalPath
      );

      expect(infoResult.success).toBe(true);
      expect(infoResult.data!.exists).toBe(true);
      expect(infoResult.data!.size).toBe(imageData.length);
      expect(infoResult.data!.checksum).toBeDefined();
      expect(infoResult.data!.mtime).toBeInstanceOf(Date);
    });
  });

  describe('validateFiles', () => {
    it('应该正确验证文件列表', async () => {
      // 存储一些文件
      const files = [
        { applicationId: 123, attachmentId: 456, data: Buffer.from('test1') },
        { applicationId: 124, attachmentId: 457, data: Buffer.from('test2') }
      ];

      const filePaths: string[] = [];

      for (const file of files) {
        const storeResult = await fileStorageService.storeLeaveAttachment(
          file.applicationId,
          file.attachmentId,
          file.data,
          undefined,
          'jpg'
        );
        expect(storeResult.success).toBe(true);
        filePaths.push(storeResult.data!.originalPath);
      }

      // 添加一个不存在的文件路径
      filePaths.push('attachments/2024/01/original/nonexistent.jpg');

      // 验证文件
      const validateResult = await fileStorageService.validateFiles(filePaths);

      expect(validateResult.success).toBe(true);
      expect(validateResult.data!.validCount).toBe(2);
      expect(validateResult.data!.invalidCount).toBe(1);
      expect(validateResult.data!.errors).toHaveLength(1);
      expect(validateResult.data!.errors[0].path).toBe('attachments/2024/01/original/nonexistent.jpg');
    });
  });
});
