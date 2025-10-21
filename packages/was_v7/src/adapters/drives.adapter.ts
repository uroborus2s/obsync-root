import type { AwilixContainer } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  CreateDriveParams,
  CreateFileParams,
  DriveInfo,
  FileInfo,
  GetDriveParams,
  OpenLinkParams
} from '../types/drive.js';

/**
 * WPS V7 驱动盘API适配器
 * 提供纯函数式的驱动盘管理API调用
 */
export interface WpsDriveAdapter {
  // 基础CRUD操作
  createDrive(params: CreateDriveParams): Promise<DriveInfo>;
  getDrive(params: GetDriveParams): Promise<DriveInfo>;

  // 文件操作
  createFile(params: CreateFileParams): Promise<FileInfo>;

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
