import type { AwilixContainer } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  GetChatHistoryParams,
  GetChatHistoryResponse,
  MentionItem,
  MessageInfo,
  MessageReceiver,
  RevokeMessageParams,
  SendMessageParams,
  SendMessageResponse,
  UpdateMessageParams
} from '../types/message.js';

/**
 * WPS V7 消息API适配器
 * 提供纯函数式的消息发送和管理API调用
 */
export interface WpsMessageAdapter {
  // 基础消息管理
  sendMessage(params: SendMessageParams): Promise<SendMessageResponse>;
  updateMessage(params: UpdateMessageParams): Promise<void>;
  revokeMessage(params: RevokeMessageParams): Promise<void>;
  getChatHistory(params: GetChatHistoryParams): Promise<GetChatHistoryResponse>;
  getAllChatHistory(
    chatId: string,
    params?: Omit<GetChatHistoryParams, 'chat_id'>
  ): Promise<MessageInfo[]>;

  // 便捷消息发送方法
  sendTextMessage(
    receivers: MessageReceiver[],
    content: string
  ): Promise<SendMessageResponse>;
  sendRichTextMessage(
    receivers: MessageReceiver[],
    content: string,
    mentions?: MentionItem[]
  ): Promise<SendMessageResponse>;
  sendImageMessage(
    receivers: MessageReceiver[],
    imageKey: string,
    fileName?: string
  ): Promise<SendMessageResponse>;
  sendFileMessage(
    receivers: MessageReceiver[],
    fileKey: string,
    fileName: string
  ): Promise<SendMessageResponse>;
  sendAudioMessage(
    receivers: MessageReceiver[],
    audioKey: string,
    duration?: number
  ): Promise<SendMessageResponse>;
  sendVideoMessage(
    receivers: MessageReceiver[],
    videoKey: string,
    duration?: number,
    coverKey?: string
  ): Promise<SendMessageResponse>;
  sendCardMessage(
    receivers: MessageReceiver[],
    cardData: any
  ): Promise<SendMessageResponse>;

  // 批量发送
  sendBulkTextMessage(
    receivers: MessageReceiver[],
    content: string
  ): Promise<SendMessageResponse>;
  sendBulkRichTextMessage(
    receivers: MessageReceiver[],
    content: string,
    mentions?: MentionItem[]
  ): Promise<SendMessageResponse>;
}

/**
 * 创建WPS消息适配器的工厂函数
 */
export function createWpsMessageAdapter(
  pluginContainer: AwilixContainer
): WpsMessageAdapter {
  const httpClient =
    pluginContainer.resolve<HttpClientService>('httpClientService');

  const adapter: WpsMessageAdapter = {
    /**
     * 发送消息
     */
    async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post(
        '/v7/messages/batch_create',
        params
      );
      return response.data;
    },

    /**
     * 更新消息
     */
    async updateMessage(params: UpdateMessageParams): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.patch(`/v7/im/messages/${params.message_id}`, {
        type: params.type,
        content: params.content
      });
    },

    /**
     * 撤回消息
     */
    async revokeMessage(params: RevokeMessageParams): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.delete(`/v7/im/messages/${params.message_id}`);
    },

    /**
     * 获取聊天历史记录
     */
    async getChatHistory(
      params: GetChatHistoryParams
    ): Promise<GetChatHistoryResponse> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get(
        `/v7/im/chats/${params.chat_id}/messages`,
        params
      );
      return response.data;
    },

    /**
     * 获取所有聊天历史记录（自动分页）
     */
    async getAllChatHistory(
      chatId: string,
      params: Omit<GetChatHistoryParams, 'chat_id'> = {}
    ): Promise<MessageInfo[]> {
      const allMessages: MessageInfo[] = [];
      let pageToken: string | undefined;

      do {
        const response = await adapter.getChatHistory({
          ...params,
          chat_id: chatId,
          page_token: pageToken
        });

        allMessages.push(...(response.items || []));
        pageToken = response.page_token;
      } while (pageToken);

      return allMessages;
    },

    /**
     * 发送文本消息
     */
    async sendTextMessage(
      receivers: MessageReceiver[],
      content: string
    ): Promise<SendMessageResponse> {
      return adapter.sendMessage({
        type: 'text',
        receivers,
        mentions: [],
        content: { text: content }
      });
    },

    /**
     * 发送富文本消息
     */
    async sendRichTextMessage(
      receivers: MessageReceiver[],
      content: string,
      mentions: MentionItem[] = []
    ): Promise<SendMessageResponse> {
      return adapter.sendMessage({
        type: 'rich_text',
        receivers,
        mentions,
        content: { rich_text: { content } }
      });
    },

    /**
     * 发送图片消息
     */
    async sendImageMessage(
      receivers: MessageReceiver[],
      imageKey: string
    ): Promise<SendMessageResponse> {
      return adapter.sendMessage({
        type: 'image',
        receivers,
        mentions: [],
        content: {
          image: {
            storage_key: imageKey
          }
        }
      });
    },

    /**
     * 发送文件消息
     */
    async sendFileMessage(
      receivers: MessageReceiver[],
      fileKey: string,
      fileName: string
    ): Promise<SendMessageResponse> {
      return adapter.sendMessage({
        type: 'file',
        receivers,
        mentions: [],
        content: {
          file: {
            storage_key: fileKey,
            name: fileName
          }
        }
      });
    },

    /**
     * 发送音频消息
     */
    async sendAudioMessage(
      receivers: MessageReceiver[],
      audioKey: string,
      duration?: number
    ): Promise<SendMessageResponse> {
      return adapter.sendMessage({
        type: 'audio',
        receivers,
        mentions: [],
        content: {
          audio: {
            storage_key: audioKey,
            duration
          }
        }
      });
    },

    /**
     * 发送视频消息
     */
    async sendVideoMessage(
      receivers: MessageReceiver[],
      videoKey: string,
      duration?: number,
      coverKey?: string
    ): Promise<SendMessageResponse> {
      return adapter.sendMessage({
        type: 'video',
        receivers,
        mentions: [],
        content: {
          video: {
            storage_key: videoKey,
            media: {
              codec: 'mp4',
              duration,
              cover_storage_key: coverKey
            }
          }
        }
      });
    },

    /**
     * 发送卡片消息
     */
    async sendCardMessage(
      receivers: MessageReceiver[],
      cardData: any
    ): Promise<SendMessageResponse> {
      return adapter.sendMessage({
        type: 'card',
        receivers,
        mentions: [],
        content: { card: cardData }
      });
    },

    /**
     * 批量发送文本消息
     */
    async sendBulkTextMessage(
      receivers: MessageReceiver[],
      content: string
    ): Promise<SendMessageResponse> {
      return adapter.sendTextMessage(receivers, content);
    },

    /**
     * 批量发送富文本消息
     */
    async sendBulkRichTextMessage(
      receivers: MessageReceiver[],
      content: string,
      mentions: MentionItem[] = []
    ): Promise<SendMessageResponse> {
      return adapter.sendRichTextMessage(receivers, content, mentions);
    }
  };

  return adapter;
}

/**
 * 默认导出适配器配置
 */
export default {
  adapterName: 'message',
  factory: createWpsMessageAdapter
};
