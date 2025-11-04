import { apiClient } from '@/lib/api-client'
import type { DriveInfo, FileInfo, GetChildrenResponse } from './types'

/**
 * WPS云盘API客户端
 */
export const wpsDriveApi = {
  /**
   * 获取驱动盘列表
   */
  async getDriveList(
    alloteeType: string,
    pageSize: number
  ): Promise<DriveInfo[]> {
    const response = await apiClient.get<{
      success: boolean
      data: DriveInfo[]
    }>('/api/icalink/v1/wps-drive/drives', {
      params: {
        allotee_type: alloteeType,
        page_size: pageSize,
      },
    })
    return response.data || []
  },

  /**
   * 获取驱动盘元数据
   */
  async getDriveMeta(
    driveId: string,
    withExtAttrs: boolean = false
  ): Promise<DriveInfo> {
    const response = await apiClient.get<{ success: boolean; data: DriveInfo }>(
      `/api/icalink/v1/wps-drive/drives/${driveId}/meta`,
      {
        params: {
          with_ext_attrs: withExtAttrs,
        },
      }
    )
    return response.data
  },

  /**
   * 获取文件/文件夹子节点
   */
  async getChildren(
    driveId: string,
    parentId: string,
    pageSize: number,
    pageToken?: string,
    withPermission: boolean = false,
    withExtAttrs: boolean = false
  ): Promise<GetChildrenResponse> {
    const response = await apiClient.get<{
      success: boolean
      data: GetChildrenResponse
    }>(
      `/api/icalink/v1/wps-drive/drives/${driveId}/files/${parentId}/children`,
      {
        params: {
          page_size: pageSize,
          page_token: pageToken,
          with_permission: withPermission,
          with_ext_attrs: withExtAttrs,
        },
      }
    )
    // ApiClient 的响应拦截器已经返回了 response.data
    // 所以这里 response = { success: boolean, data: GetChildrenResponse }
    console.log('🔍 getChildren API response:', response)
    console.log('📦 getChildren data:', response.data)
    return response.data
  },

  /**
   * 获取文件/文件夹元数据
   */
  async getFileMeta(
    fileId: string,
    withPermission: boolean = false,
    withExtAttrs: boolean = false,
    withDrive: boolean = false
  ): Promise<FileInfo> {
    const response = await apiClient.get<{ success: boolean; data: FileInfo }>(
      `/api/icalink/v1/wps-drive/files/${fileId}/meta`,
      {
        params: {
          with_permission: withPermission,
          with_ext_attrs: withExtAttrs,
          with_drive: withDrive,
        },
      }
    )
    // ApiClient 的响应拦截器已经返回了 response.data
    return response.data
  },

  /**
   * 创建驱动盘
   */
  async createDrive(params: {
    allotee_id: string
    allotee_type: 'user' | 'group' | 'app'
    name: string
    description?: string
    source?: string
    total_quota?: number
  }): Promise<DriveInfo> {
    const response = await apiClient.post<{
      success: boolean
      data: DriveInfo
    }>('/api/icalink/v1/wps-drive/drives', params)
    return response.data
  },

  /**
   * 创建文件或文件夹
   */
  async createFile(params: {
    drive_id: string
    parent_id: string
    file_type: 'file' | 'folder'
    name: string
    on_name_conflict?: 'fail' | 'rename' | 'overwrite' | 'replace'
  }): Promise<FileInfo> {
    const response = await apiClient.post<{ success: boolean; data: FileInfo }>(
      `/api/icalink/v1/wps-drive/drives/${params.drive_id}/files`,
      {
        parent_id: params.parent_id,
        file_type: params.file_type,
        name: params.name,
        on_name_conflict: params.on_name_conflict,
      }
    )
    return response.data
  },
}
