import type { AwilixContainer } from '@stratix/core';
import axios from 'axios';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  BatchGetFilesParams,
  BatchGetFilesResponse,
  CheckFileNameParams,
  CheckFileNameResponse,
  CompleteUploadParams,
  CompleteUploadResponse,
  CreateDriveParams,
  CreateFileParams,
  DeleteFileParams,
  DriveInfo,
  FileInfo,
  GetChildrenParams,
  GetChildrenResponse,
  GetDriveMetaParams,
  GetDriveParams,
  GetFileMetaParams,
  OpenLinkParams,
  RenameFileParams,
  RenameFileResponse,
  RequestUploadParams,
  RequestUploadResponse
} from '../types/drive.js';

/**
 * WPS V7 驱动盘API适配器
 * 提供纯函数式的驱动盘管理API调用
 */
export interface WpsDriveAdapter {
  // 基础CRUD操作
  createDrive(params: CreateDriveParams): Promise<DriveInfo>;
  getDrive(params: GetDriveParams): Promise<DriveInfo>;
  getDriveMeta(params: GetDriveMetaParams): Promise<DriveInfo>;

  // 文件操作
  createFile(params: CreateFileParams): Promise<FileInfo>;
  getChildren(params: GetChildrenParams): Promise<GetChildrenResponse>;
  batchGetFiles(params: BatchGetFilesParams): Promise<BatchGetFilesResponse>;
  getFileMeta(params: GetFileMetaParams): Promise<FileInfo>;
  deleteFile(params: DeleteFileParams): Promise<void>;
  renameFile(params: RenameFileParams): Promise<RenameFileResponse>;
  checkFileName(params: CheckFileNameParams): Promise<CheckFileNameResponse>;

  // 文件上传
  requestUpload(params: RequestUploadParams): Promise<RequestUploadResponse>;
  uploadFileToStorage(
    uploadUrl: string,
    fileBuffer: Buffer,
    contentType: string,
    headers?: Record<string, string>
  ): Promise<void>;
  completeUpload(params: CompleteUploadParams): Promise<CompleteUploadResponse>;

  // 分享文件链接
  openLinkOfFile(params: OpenLinkParams): Promise<{ code: number }>;
}

/**
 * 创建WPS驱动盘适配器的工厂函数
 */
export function createWpsDriveAdapter(
  pluginContainer: AwilixContainer
): WpsDriveAdapter {
  const httpClient =
    pluginContainer.resolve<HttpClientService>('httpClientService');

  const adapter: WpsDriveAdapter = {
    /**
     * 创建驱动盘
     */
    async createDrive(params: CreateDriveParams): Promise<DriveInfo> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post('/v7/drives/create', params);
      return response.data;
    },

    /**
     * 获取驱动盘信息
     */
    async getDrive(params: GetDriveParams): Promise<DriveInfo> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get(`/v7/drives`, params);
      return response.data;
    },

    /**
     * 获取盘元信息
     * 获取指定驱动盘的详细信息，包括盘名称、容量、归属信息、扩展属性等
     */
    async getDriveMeta(params: GetDriveMetaParams): Promise<DriveInfo> {
      await httpClient.ensureAccessToken();
      const { drive_id, with_ext_attrs } = params;

      // 构建查询参数
      const queryParams: Record<string, any> = {};
      if (with_ext_attrs !== undefined) {
        queryParams.with_ext_attrs = with_ext_attrs;
      }

      const response = await httpClient.get<DriveInfo>(
        `/v7/drives/${drive_id}/meta`,
        queryParams
      );
      return response.data;
    },

    /**
     * 创建文件
     */
    async createFile(params: CreateFileParams): Promise<FileInfo> {
      await httpClient.ensureAccessToken();
      const { drive_id, parent_id, ...bodyParams } = params;
      const response = await httpClient.post(
        `/v7/drives/${drive_id}/files/${parent_id}/create`,
        bodyParams
      );
      return response.data;
    },

    /**
     * 获取子文件列表
     * 获取指定文件夹下的子文件或子文件夹列表
     */
    async getChildren(params: GetChildrenParams): Promise<GetChildrenResponse> {
      await httpClient.ensureAccessToken();
      const { drive_id, parent_id, id_type, ...queryParams } = params;

      // 构建请求头
      const headers: Record<string, string> = {};
      if (id_type) {
        headers['X-Kso-Id-Type'] = id_type;
      }

      const response = await httpClient.get<GetChildrenResponse>(
        `/v7/drives/${drive_id}/files/${parent_id}/children`,
        queryParams,
        headers
      );
      return response.data;
    },

    /**
     * 批量获取文件信息
     * 根据file_id(s)批量获取文件的详细信息
     */
    async batchGetFiles(
      params: BatchGetFilesParams
    ): Promise<BatchGetFilesResponse> {
      await httpClient.ensureAccessToken();

      // 构建查询参数
      const queryParams: Record<string, any> = {
        file_ids: params.file_ids
      };

      if (params.with_permission !== undefined) {
        queryParams.with_permission = params.with_permission;
      }
      if (params.with_ext_attrs !== undefined) {
        queryParams.with_ext_attrs = params.with_ext_attrs;
      }
      if (params.with_drive !== undefined) {
        queryParams.with_drive = params.with_drive;
      }
      if (params.mode !== undefined) {
        queryParams.mode = params.mode;
      }

      const response = await httpClient.get<BatchGetFilesResponse>(
        '/v7/files/batch_get',
        queryParams
      );
      return response.data;
    },

    /**
     * 获取文件元信息
     * 根据file_id获取指定文件的详细信息
     */
    async getFileMeta(params: GetFileMetaParams): Promise<FileInfo> {
      await httpClient.ensureAccessToken();
      const { file_id, ...queryParams } = params;

      const response = await httpClient.get<FileInfo>(
        `/v7/files/${file_id}/meta`,
        queryParams
      );
      return response.data;
    },

    /**
     * 删除文件
     * 删除指定文件或文件夹
     */
    async deleteFile(params: DeleteFileParams): Promise<void> {
      await httpClient.ensureAccessToken();
      const { file_id } = params;

      await httpClient.delete(`/v7/files/${file_id}`);
    },

    /**
     * 重命名文件
     * 修改文件或文件夹的名称
     */
    async renameFile(params: RenameFileParams): Promise<RenameFileResponse> {
      await httpClient.ensureAccessToken();
      const { file_id, name } = params;

      const response = await httpClient.post<RenameFileResponse>(
        `/v7/files/${file_id}/rename`,
        { name }
      );
      return response.data;
    },

    /**
     * 检查文件名是否已存在
     * 在上传、复制、移动等操作前检测指定目录下的文件名是否重复
     */
    async checkFileName(
      params: CheckFileNameParams
    ): Promise<CheckFileNameResponse> {
      await httpClient.ensureAccessToken();
      const { drive_id, parent_id, name } = params;

      const response = await httpClient.post<CheckFileNameResponse>(
        `/v7/drives/${drive_id}/files/${parent_id}/check_name`,
        { name }
      );
      return response.data;
    },

    /**
     * 请求文件上传信息
     * 获取上传所需的临时上传地址与配置信息（文件上传第1步）
     */
    async requestUpload(
      params: RequestUploadParams
    ): Promise<RequestUploadResponse> {
      await httpClient.ensureAccessToken();
      const { drive_id, parent_id, ...bodyParams } = params;

      const response = await httpClient.post<RequestUploadResponse>(
        `/v7/drives/${drive_id}/files/${parent_id}/request_upload`,
        bodyParams
      );
      return response.data;
    },

    /**
     * 上传文件到WPS存储服务器（文件上传第2步）
     * 直接使用HTTP PUT请求上传文件内容到WPS存储URL
     *
     * @param uploadUrl - WPS存储服务器的上传URL
     * @param fileBuffer - 文件的二进制内容
     * @param contentType - 文件的MIME类型
     * @param headers - 额外的请求头（如Authorization）
     */
    async uploadFileToStorage(
      uploadUrl: string,
      fileBuffer: Buffer,
      contentType: string,
      headers?: Record<string, string>
    ): Promise<void> {
      try {
        const token = await httpClient.getAppAccessToken();
        // 使用axios直接发送PUT请求到WPS存储服务器
        // 不使用httpClient,因为存储服务器不需要WPS API的签名
        await axios.put(uploadUrl, fileBuffer, {
          headers: {
            'Content-Type': contentType,
            ...headers,
            Authorization: `Bearer ${token}`
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        });
      } catch (error: any) {
        throw new Error(
          `Failed to upload file to storage: ${error.message || 'Unknown error'}`
        );
      }
    },

    /**
     * 提交文件上传完成
     * 通知服务端上传完成，文件元信息生效（文件上传第3步）
     */
    async completeUpload(
      params: CompleteUploadParams
    ): Promise<CompleteUploadResponse> {
      await httpClient.ensureAccessToken();
      const { drive_id, parent_id, ...bodyParams } = params;

      const response = await httpClient.post<CompleteUploadResponse>(
        `/v7/drives/${drive_id}/files/${parent_id}/commit_upload`,
        bodyParams
      );
      return response.data;
    },

    /**
     * 开启文件分享
     */
    async openLinkOfFile(params: OpenLinkParams): Promise<{ code: number }> {
      await httpClient.ensureAccessToken();
      const { drive_id, file_id, ...bodyParams } = params;
      const response = await httpClient.post(
        `/v7/drives/${drive_id}/files/${file_id}/open_link`,
        bodyParams
      );
      return response;
    }

    /**
     * 获取子文件列表
     */
  };

  return adapter;
}

/**
 * 默认导出适配器配置
 */
export default {
  adapterName: 'drive',
  factory: createWpsDriveAdapter
};
