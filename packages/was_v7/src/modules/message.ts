import type { AuthManager } from '../auth/auth-manager.js';
import type { HttpClient } from '../core/http-client.js';
import type {
  GetChatHistoryParams,
  GetChatHistoryResponse,
  GetMessageContentParams,
  GetMessageContentResponse,
  GetMessageIdByBusinessIdParams,
  GetMessageIdByBusinessIdResponse,
  MentionItem,
  MessageInfo,
  RevokeMessageParams,
  SendMessageParams,
  SendMessageResponse,
  UpdateMessageParams
} from '../types/message.js';

/**
 * 消息管理模块
 * 严格按照WPS协作机器人API文档实现
 *
 * 支持的消息类型：
 * - text: 文本消息
 * - rich_text: 富文本消息（支持markdown）
 * - image: 图片消息
 * - file: 文件消息
 * - audio: 音频消息
 * - video: 视频消息
 * - card: 卡片消息
 *
 * API地址: POST https://openapi.wps.cn/v7/messages/batch_create
 *
 * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/message/create-msg.html
 */
export class MessageModule {
  constructor(
    private readonly wasV7HttpClient: HttpClient,
    private readonly wasV7AuthManager: AuthManager
  ) {}

  /**
   * 确保有有效的访问令牌
   */
  private async ensureAccessToken(): Promise<void> {
    if (!this.wasV7AuthManager.isTokenValid()) {
      await this.wasV7AuthManager.getAppAccessToken();
    }
  }

  /**
   * 发送消息
   * 严格按照WPS协作机器人API文档实现
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/message/create-msg.html
   * @param params 发送消息参数
   * @returns 消息发送结果
   */
  async sendMessage(params: SendMessageParams): Promise<SendMessageResponse> {
    await this.ensureAccessToken();

    // 严格按照文档的接口地址: POST /v7/messages/batch_create
    const response = await this.wasV7HttpClient.post<SendMessageResponse>(
      '/v7/messages/batch_create',
      params
    );
    return response.data;
  }

  /**
   * 发送文本消息
   * 快捷方法：发送纯文本消息
   *
   * @param receivers 接收者列表
   * @param text 文本内容
   * @param mentions 提及的用户（可选）
   * @returns 消息发送结果
   */
  async sendTextMessage(
    receivers: SendMessageParams['receivers'],
    text: string,
    mentions?: MentionItem[]
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      type: 'text',
      receivers,
      mentions: mentions || [],
      content: { text }
    });
  }

  /**
   * 发送富文本消息
   * 快捷方法：发送富文本消息，支持markdown格式
   *
   * @param receivers 接收者列表
   * @param content 富文本内容
   * @param mentions 提及的用户（可选）
   * @returns 消息发送结果
   */
  async sendRichTextMessage(
    receivers: SendMessageParams['receivers'],
    content: string,
    mentions?: MentionItem[]
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      type: 'rich_text',
      receivers,
      mentions: mentions || [],
      content: {
        rich_text: { content }
      }
    });
  }

  /**
   * 发送图片消息
   * 快捷方法：发送图片消息
   *
   * @param receivers 接收者列表
   * @param storageKey 图片存储key
   * @param options 图片选项（宽高、大小等）
   * @returns 消息发送结果
   */
  async sendImageMessage(
    receivers: SendMessageParams['receivers'],
    storageKey: string,
    options?: { width?: number; height?: number; size?: number }
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      type: 'image',
      receivers,
      mentions: [],
      content: {
        image: {
          storage_key: storageKey,
          ...options
        }
      }
    });
  }

  /**
   * 发送文件消息
   * 快捷方法：发送文件消息
   *
   * @param receivers 接收者列表
   * @param storageKey 文件存储key
   * @param name 文件名
   * @param options 文件选项（大小、后缀等）
   * @returns 消息发送结果
   */
  async sendFileMessage(
    receivers: SendMessageParams['receivers'],
    storageKey: string,
    name: string,
    options?: { size?: number; suffix?: string }
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      type: 'file',
      receivers,
      mentions: [],
      content: {
        file: {
          storage_key: storageKey,
          name,
          ...options
        }
      }
    });
  }

  /**
   * 发送音频消息
   * 快捷方法：发送音频消息
   *
   * @param receivers 接收者列表
   * @param storageKey 音频存储key
   * @param options 音频选项（时长、大小等）
   * @returns 消息发送结果
   */
  async sendAudioMessage(
    receivers: SendMessageParams['receivers'],
    storageKey: string,
    options?: { duration?: number; size?: number }
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      type: 'audio',
      receivers,
      mentions: [],
      content: {
        audio: {
          storage_key: storageKey,
          ...options
        }
      }
    });
  }

  /**
   * 发送视频消息
   * 快捷方法：发送视频消息
   *
   * @param receivers 接收者列表
   * @param storageKey 视频存储key
   * @param media 视频媒体信息
   * @returns 消息发送结果
   */
  async sendVideoMessage(
    receivers: SendMessageParams['receivers'],
    storageKey: string,
    media: {
      codec: string;
      cover_storage_key?: string;
      duration?: number;
      format?: string;
      height?: number;
      size?: number;
      width?: number;
    }
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      type: 'video',
      receivers,
      mentions: [],
      content: {
        video: {
          storage_key: storageKey,
          media
        }
      }
    });
  }

  /**
   * 发送卡片消息
   * 快捷方法：发送消息卡片
   *
   * @param receivers 接收者列表
   * @param card 卡片内容
   * @param mentions 提及的用户（可选）
   * @returns 消息发送结果
   */
  async sendCardMessage(
    receivers: SendMessageParams['receivers'],
    card: any,
    mentions?: MentionItem[]
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      type: 'card',
      receivers,
      mentions: mentions || [],
      content: { card }
    });
  }

  /**
   * 构建@人的文本
   * 辅助方法：构建包含@人标签的文本内容
   * 按照文档说明，使用<at id="索引">展示名称</at>格式
   *
   * @param text 原始文本
   * @param mentions 提及的用户列表，包含索引id和展示名称
   * @returns 包含@标签的文本
   */
  static buildMentionText(
    text: string,
    mentions: Array<{ id: string; name: string }>
  ): string {
    let result = text;
    mentions.forEach((mention) => {
      const atTag = `<at id="${mention.id}">${mention.name}</at>`;
      result = result.replace(`@${mention.name}`, atTag);
    });
    return result;
  }

  /**
   * 构建@所有人的文本
   * 辅助方法：构建包含@所有人标签的文本内容
   * 按照文档说明，@所有人的id固定为1
   *
   * @param text 原始文本
   * @returns 包含@所有人标签的文本
   */
  static buildMentionAllText(text: string): string {
    return text.replace('@所有人', '<at id="1">所有人</at>');
  }

  /**
   * 批量发送消息
   * 向多个接收者批量发送相同内容的消息
   *
   * @param receiversList 接收者列表的列表
   * @param messageParams 消息参数（不包含receivers）
   * @returns 批量发送结果
   */
  async batchSendMessage(
    receiversList: SendMessageParams['receivers'][],
    messageParams: Omit<SendMessageParams, 'receivers'>
  ): Promise<SendMessageResponse[]> {
    const promises = receiversList.map((receivers) =>
      this.sendMessage({
        ...messageParams,
        receivers
      })
    );

    return Promise.all(promises);
  }

  /**
   * 更新消息
   * 更新已发送的消息内容
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/message/update-msg.html
   * @param params 更新消息参数
   */
  async updateMessage(params: UpdateMessageParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.patch(`/v7/im/messages/${params.message_id}`, {
      type: params.type,
      content: params.content
    });
  }

  /**
   * 撤回消息
   * 撤回已发送的消息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/message/revoke-msg.html
   * @param params 撤回消息参数
   */
  async revokeMessage(params: RevokeMessageParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.delete(`/v7/im/messages/${params.message_id}`);
  }

  /**
   * 根据三方业务ID获取消息ID
   * 通过业务ID查询对应的消息ID
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/message/get-msg-id-by-business-id.html
   * @param params 查询参数
   * @returns 消息ID信息
   */
  async getMessageIdByBusinessId(
    params: GetMessageIdByBusinessIdParams
  ): Promise<GetMessageIdByBusinessIdResponse> {
    await this.ensureAccessToken();

    const response =
      await this.wasV7HttpClient.get<GetMessageIdByBusinessIdResponse>(
        '/v7/im/messages/business-id',
        { business_id: params.business_id }
      );
    return response.data;
  }

  /**
   * 获取会话历史消息
   * 分页获取指定会话的历史消息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/message/get-chat-history.html
   * @param params 查询参数
   * @returns 历史消息列表
   */
  async getChatHistory(
    params: GetChatHistoryParams
  ): Promise<GetChatHistoryResponse> {
    await this.ensureAccessToken();

    const queryParams: Record<string, any> = {
      chat_id: params.chat_id
    };

    if (params.start_time) queryParams.start_time = params.start_time;
    if (params.end_time) queryParams.end_time = params.end_time;
    if (params.page_size)
      queryParams.page_size = Math.min(params.page_size, 50); // 最大50
    if (params.page_token) queryParams.page_token = params.page_token;

    const response = await this.wasV7HttpClient.get<GetChatHistoryResponse>(
      '/v7/im/messages/history',
      queryParams
    );
    return response.data;
  }

  /**
   * 获取会话所有历史消息
   * 自动分页获取指定会话的所有历史消息
   *
   * @param chatId 会话ID
   * @param options 查询选项
   * @returns 所有历史消息列表
   */
  async getAllChatHistory(
    chatId: string,
    options?: { startTime?: string; endTime?: string }
  ): Promise<MessageInfo[]> {
    const allMessages: MessageInfo[] = [];
    let pageToken: string | undefined;
    let hasMore = true;

    do {
      const response = await this.getChatHistory({
        chat_id: chatId,
        start_time: options?.startTime,
        end_time: options?.endTime,
        page_size: 50, // 使用最大分页大小
        page_token: pageToken
      });

      allMessages.push(...response.items);
      pageToken = response.page_token;
      hasMore = response.has_more;
    } while (pageToken && hasMore);

    return allMessages;
  }

  /**
   * 获取指定消息的内容
   * 根据消息ID获取消息详细内容
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/message/get-msg-content.html
   * @param params 查询参数
   * @returns 消息内容
   */
  async getMessageContent(
    params: GetMessageContentParams
  ): Promise<GetMessageContentResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<GetMessageContentResponse>(
      `/v7/im/messages/${params.message_id}`
    );
    return response.data;
  }
}
