import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { documentSchema } from '../../schemas/response.js';
import { WasV1PaginationParams } from '../../types/request.js';
import { sendRequest } from '../request.js';

/**
 * 创建文档API
 */
export function createDocumentApi(client: AxiosInstance) {
  return {
    /**
     * 获取文档列表
     */
    async getDocuments(
      params?: { parent_id?: string } & WasV1PaginationParams
    ) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/api/v1/drive/files',
          params
        },
        z.object({
          files: z.array(documentSchema),
          total_count: z.number(),
          page_size: z.number(),
          page_number: z.number()
        })
      );
    },

    /**
     * 获取文档详情
     */
    async getDocument(fileId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/drive/files/${fileId}`
        },
        z.object({
          file: documentSchema
        })
      );
    },

    /**
     * 创建文件夹
     */
    async createFolder(data: { name: string; parent_id?: string }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/drive/folders',
          data
        },
        z.object({
          folder_id: z.string()
        })
      );
    },

    /**
     * 删除文件/文件夹
     */
    async deleteFile(fileId: string) {
      return sendRequest(client, {
        method: 'DELETE',
        url: `/api/v1/drive/files/${fileId}`
      });
    },

    /**
     * 获取文件下载链接
     */
    async getDownloadUrl(fileId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/drive/files/${fileId}/download_url`
        },
        z.object({
          download_url: z.string(),
          expires_in: z.number()
        })
      );
    },

    /**
     * 获取文件上传链接
     */
    async getUploadUrl(data: {
      name: string;
      size: number;
      parent_id?: string;
      overwrite?: boolean;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/drive/files/upload_url',
          data
        },
        z.object({
          upload_url: z.string(),
          file_id: z.string(),
          expires_in: z.number()
        })
      );
    }
  };
}
