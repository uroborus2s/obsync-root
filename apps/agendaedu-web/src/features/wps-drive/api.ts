import { apiClient } from '@/lib/api-client'
import type { DriveInfo, FileInfo, GetChildrenResponse } from './types'

/**
 * 计算文件的SHA-256哈希值
 * @param file 要计算哈希值的文件
 * @returns SHA-256哈希值（小写十六进制字符串，64个字符）
 */
async function calculateFileSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

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
   * 支持通过parent_id或parent_path指定父目录
   */
  async createFile(params: {
    drive_id: string
    parent_id?: string
    parent_path?: string[]
    file_type: 'file' | 'folder'
    name: string
    on_name_conflict?: 'fail' | 'rename' | 'overwrite' | 'replace'
  }): Promise<FileInfo> {
    const response = await apiClient.post<{ success: boolean; data: FileInfo }>(
      `/api/icalink/v1/wps-drive/drives/${params.drive_id}/files`,
      {
        parent_id: params.parent_id,
        parent_path: params.parent_path,
        file_type: params.file_type,
        name: params.name,
        on_name_conflict: params.on_name_conflict,
      }
    )
    return response.data
  },

  /**
   * 删除文件或文件夹
   */
  async deleteFile(fileId: string): Promise<void> {
    await apiClient.delete(`/api/icalink/v1/wps-drive/files/${fileId}`)
  },

  /**
   * 开启文件分享
   */
  async openLinkOfFile(params: {
    file_id: string
    drive_id: string
    scope: 'anyone' | 'company' | 'users'
    opts?: {
      allow_perm_apply?: boolean
      check_code?: string
      close_after_expire?: string
      expire_period?: 0 | 7 | 30
      expire_time?: number
    }
  }): Promise<{ code: number }> {
    const { file_id, ...body } = params
    const response = await apiClient.post<{
      success: boolean
      data: { code: number }
    }>(`/api/icalink/v1/wps-drive/files/${file_id}/share`, body)
    return response.data
  },

  /**
   * 请求文件上传信息（上传第1步）
   * 获取上传地址和上传ID
   */
  async requestUpload(params: {
    drive_id: string
    parent_id: string
    file_name: string
    file_size: number
    file_hash?: string
  }): Promise<{
    upload_id: string
    store_request: {
      method: string
      url: string
      headers?: Record<string, string>
    }
  }> {
    const { drive_id, ...body } = params
    const response = await apiClient.post<{
      success: boolean
      data: {
        upload_id: string
        store_request: {
          method: string
          url: string
          headers?: Record<string, string>
        }
      }
    }>(
      `/api/icalink/v1/wps-drive/drives/${drive_id}/files/request-upload`,
      body
    )
    return response.data
  },

  /**
   * 计算文件SHA-256哈希值并请求上传
   * 这是一个便捷方法,自动计算哈希值后调用requestUpload
   */
  async requestUploadWithHash(params: {
    drive_id: string
    parent_id: string
    file: File
  }): Promise<{
    upload_id: string
    store_request: {
      method: string
      url: string
      headers?: Record<string, string>
    }
  }> {
    // 计算文件SHA-256哈希值
    const fileHash = await calculateFileSHA256(params.file)

    // 调用requestUpload
    return this.requestUpload({
      drive_id: params.drive_id,
      parent_id: params.parent_id,
      file_name: params.file.name,
      file_size: params.file.size,
      file_hash: fileHash,
    })
  },

  /**
   * 上传文件内容到WPS云盘（上传第2步）
   * 使用PUT方法将文件内容上传到指定地址
   *
   * @param uploadUrl - 上传URL
   * @param file - 要上传的文件
   * @param uploadHeaders - 上传请求头（可选，可能包含Authorization等认证信息）
   * @param onProgress - 上传进度回调
   */
  async uploadFileContent(
    uploadUrl: string,
    file: File,
    uploadHeaders?: Record<string, string>,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // 监听上传进度
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100)
            onProgress(progress)
          }
        })
      }

      // 监听上传完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`))
        }
      })

      // 监听上传错误
      xhr.addEventListener('error', () => {
        reject(new Error('网络错误，上传失败'))
      })

      // 监听上传中止
      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'))
      })

      // 发送PUT请求
      xhr.open('PUT', uploadUrl)

      // 设置Content-Type为文件的MIME类型
      // 如果文件没有type,使用application/octet-stream
      xhr.setRequestHeader(
        'Content-Type',
        file.type || 'application/octet-stream'
      )

      // 设置WPS API返回的额外请求头（如Authorization token）
      if (uploadHeaders) {
        Object.entries(uploadHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value)
        })
      }

      xhr.send(file)
    })
  },

  /**
   * 完成文件上传（上传第3步）
   * 通知WPS云盘上传已完成
   */
  async completeUpload(params: {
    drive_id: string
    upload_id: string
    file_name: string
    file_size: number
    parent_id: string
  }): Promise<{
    file_id: string
    name: string
    size: number
    status: string
  }> {
    const { drive_id, ...body } = params
    const response = await apiClient.post<{
      success: boolean
      data: {
        file_id: string
        name: string
        size: number
        status: string
      }
    }>(
      `/api/icalink/v1/wps-drive/drives/${drive_id}/files/complete-upload`,
      body
    )
    return response.data
  },
}
