import type {
  CompleteUploadResponse,
  DriveInfo,
  GetChildrenResponse,
  RequestUploadResponse
} from '@stratix/was-v7';
import type { FileInfo } from '@stratix/was-v7/src/types/drive.js';

/**
 * WPS云盘服务接口
 * 负责WPS云盘相关的业务逻辑处理
 */
export interface IWpsDriveService {
  /**
   * 获取驱动盘列表
   *
   * @param alloteeType - 盘归属身份类型
   * @param pageSize - 分页大小
   * @returns 包含驱动盘列表的服务结果
   */
  getDriveList(
    alloteeType: string,
    pageSize: number
  ): Promise<{
    success: boolean;
    data?: DriveInfo[];
    error?: string;
  }>;

  /**
   * 获取驱动盘元数据
   *
   * @param driveId - 驱动盘ID
   * @param withExtAttrs - 是否获取扩展属性
   * @returns 包含驱动盘元数据的服务结果
   */
  getDriveMeta(
    driveId: string,
    withExtAttrs?: boolean
  ): Promise<{
    success: boolean;
    data?: DriveInfo;
    error?: string;
  }>;

  /**
   * 获取文件/文件夹子节点
   *
   * @param driveId - 驱动盘ID
   * @param parentId - 父目录ID（根目录传 '0'）
   * @param pageSize - 分页大小
   * @param pageToken - 分页Token
   * @param withPermission - 是否返回权限信息
   * @param withExtAttrs - 是否返回扩展属性
   * @returns 包含子节点列表的服务结果
   */
  getChildren(
    driveId: string,
    parentId: string,
    pageSize: number,
    pageToken?: string,
    withPermission?: boolean,
    withExtAttrs?: boolean
  ): Promise<{
    success: boolean;
    data?: GetChildrenResponse;
    error?: string;
  }>;

  /**
   * 获取文件/文件夹元数据
   *
   * @param fileId - 文件ID
   * @param withPermission - 是否返回权限信息
   * @param withExtAttrs - 是否返回扩展属性
   * @param withDrive - 是否返回驱动盘信息
   * @returns 包含文件元数据的服务结果
   */
  getFileMeta(
    fileId: string,
    withPermission?: boolean,
    withExtAttrs?: boolean,
    withDrive?: boolean
  ): Promise<{
    success: boolean;
    data?: FileInfo;
    error?: string;
  }>;

  /**
   * 请求文件上传信息（上传第1步）
   *
   * @param driveId - 驱动盘ID
   * @param parentId - 父目录ID
   * @param fileName - 文件名
   * @param fileSize - 文件大小（字节）
   * @param fileHash - 文件SHA1哈希值（可选）
   * @returns 包含上传地址和上传ID的服务结果
   */
  requestUpload(
    driveId: string,
    parentId: string,
    fileName: string,
    fileSize: number,
    fileHash?: string
  ): Promise<{
    success: boolean;
    data?: RequestUploadResponse;
    error?: string;
  }>;

  /**
   * 完成文件上传（上传第3步）
   *
   * @param driveId - 驱动盘ID
   * @param uploadId - 上传ID（第1步返回）
   * @param fileName - 文件名
   * @param fileSize - 文件大小（字节）
   * @param parentId - 父目录ID
   * @returns 包含文件信息的服务结果
   */
  completeUpload(
    driveId: string,
    uploadId: string,
    fileName: string,
    fileSize: number,
    parentId: string
  ): Promise<{
    success: boolean;
    data?: CompleteUploadResponse;
    error?: string;
  }>;

  /**
   * 一体化文件上传（整合三步流程）
   *
   * 该方法在后端完成完整的上传流程:
   * 1. 请求上传许可
   * 2. 上传文件到WPS存储服务器
   * 3. 完成上传确认
   *
   * @param driveId - 驱动盘ID
   * @param parentId - 父目录ID
   * @param fileName - 文件名
   * @param fileBuffer - 文件的二进制内容
   * @param fileSize - 文件大小（字节）
   * @param contentType - 文件的MIME类型
   * @param fileHash - 文件SHA-256哈希值（可选）
   * @returns 包含上传结果的服务结果
   */
  uploadFile(
    driveId: string,
    parentId: string,
    fileName: string,
    fileBuffer: Buffer,
    fileSize: number,
    contentType: string,
    fileHash: string
  ): Promise<{
    success: boolean;
    data?: CompleteUploadResponse;
    error?: string;
  }>;
}
