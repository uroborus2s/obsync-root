import { AxiosInstance } from 'axios';
import { z } from 'zod';
import { messageSchema } from '../../schemas/response.js';
import { WasV1PaginationParams } from '../../types/request.js';
import { sendRequest } from '../request.js';

/**
 * 创建消息API
 */
export function createMessageApi(client: AxiosInstance) {
  return {
    /**
     * 发送文本消息
     */
    async sendTextMessage(data: { chat_id: string; content: string }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/messages/text',
          data
        },
        z.object({
          message_id: z.string()
        })
      );
    },

    /**
     * 发送图片消息
     */
    async sendImageMessage(data: { chat_id: string; image_url: string }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/messages/image',
          data
        },
        z.object({
          message_id: z.string()
        })
      );
    },

    /**
     * 发送文件消息
     */
    async sendFileMessage(data: { chat_id: string; file_id: string }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/messages/file',
          data
        },
        z.object({
          message_id: z.string()
        })
      );
    },

    /**
     * 获取消息列表
     */
    async getMessages(
      chatId: string,
      params?: {
        start_time?: number;
        end_time?: number;
      } & WasV1PaginationParams
    ) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/chats/${chatId}/messages`,
          params
        },
        z.object({
          messages: z.array(messageSchema),
          total_count: z.number(),
          page_size: z.number(),
          page_number: z.number()
        })
      );
    },

    /**
     * 获取消息详情
     */
    async getMessage(messageId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/messages/${messageId}`
        },
        z.object({
          message: messageSchema
        })
      );
    },

    /**
     * 创建会话
     */
    async createChat(data: {
      name?: string;
      user_ids: string[];
      chat_type: 'single' | 'group';
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/chats',
          data
        },
        z.object({
          chat_id: z.string()
        })
      );
    },

    /**
     * 获取会话详情
     */
    async getChat(chatId: string) {
      return sendRequest(client, {
        method: 'GET',
        url: `/api/v1/chats/${chatId}`
      });
    },

    /**
     * 获取会话成员列表
     */
    async getChatMembers(chatId: string) {
      return sendRequest(client, {
        method: 'GET',
        url: `/api/v1/chats/${chatId}/members`
      });
    }
  };
}
