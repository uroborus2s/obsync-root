// @wps/app-icalink 文件存储服务接口
// 基于 Stratix 框架的文件存储服务接口定义

import type { ServiceError } from '@stratix/core';
import type { Either } from '@stratix/utils/functional';

/**
 * 文件存储配置接口
 */
export interface FileStorageConfig {
  baseDir: string;
  baseUrl: string;
  maxFileSize?: number;
  allowedExtensions?: string[];
  enableCompression?: boolean;
}

/**
 * 文件信息接口
 */
export interface FileInfo {
  size: number;
  mtime: Date;
  checksum: string;
  exists: boolean;
}

/**
 * 存储结果接口
 */
export interface StorageResult {
  originalPath: string;
  thumbnailPath?: string;
  originalSize: number;
  thumbnailSize?: number;
}

/**
 * 文件验证结果接口
 */
export interface FileValidationResult {
  validCount: number;
  invalidCount: number;
  errors: Array<{
    path: string;
    error: string;
  }>;
}

/**
 * 文件存储服务接口
 * 提供文件系统存储的抽象接口
 */
export interface IFileStorageService {
  /**
   * 存储请假附件
   * @param applicationId 请假申请ID
   * @param attachmentId 附件ID
   * @param imageData 图片数据
   * @param thumbnailData 缩略图数据（可选）
   * @param fileExtension 文件扩展名
   * @returns 存储结果
   */
  storeLeaveAttachment(
    applicationId: number,
    attachmentId: number,
    imageData: Buffer,
    thumbnailData?: Buffer,
    fileExtension?: string
  ): Promise<Either<ServiceError, StorageResult>>;

  /**
   * 检索请假附件
   * @param filePath 文件相对路径
   * @returns 文件数据
   */
  retrieveLeaveAttachment(
    filePath: string
  ): Promise<Either<ServiceError, Buffer>>;

  /**
   * 删除请假附件
   * @param originalPath 原图路径
   * @param thumbnailPath 缩略图路径（可选）
   * @returns 删除是否成功
   */
  deleteLeaveAttachment(
    originalPath: string,
    thumbnailPath?: string
  ): Promise<Either<ServiceError, boolean>>;

  /**
   * 检查文件是否存在
   * @param filePath 文件相对路径
   * @returns 文件是否存在
   */
  fileExists(filePath: string): Promise<Either<ServiceError, boolean>>;

  /**
   * 获取文件信息
   * @param filePath 文件相对路径
   * @returns 文件信息
   */
  getFileInfo(filePath: string): Promise<Either<ServiceError, FileInfo>>;

  /**
   * 清理空目录
   * @param dirPath 目录相对路径
   * @returns 清理的目录数量
   */
  cleanupEmptyDirectories(
    dirPath: string
  ): Promise<Either<ServiceError, number>>;

  /**
   * 批量验证文件完整性
   * @param filePaths 文件路径数组
   * @returns 验证结果
   */
  validateFiles(
    filePaths: string[]
  ): Promise<Either<ServiceError, FileValidationResult>>;

  /**
   * 获取存储统计信息
   * @returns 存储统计
   */
  getStorageStats(): Promise<
    Either<
      ServiceError,
      {
        totalFiles: number;
        totalSize: number;
        availableSpace: number;
      }
    >
  >;
}
