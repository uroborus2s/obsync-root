import type { AwilixContainer } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  ChatInfo,
  ChatMember,
  CreateChatParams,
  CreateChatResponse,
  GetChatListParams,
  GetChatListResponse,
  GetChatMembersParams,
  GetChatMembersResponse,
  UpdateChatParams
} from '../types/message.js';

// 简化的参数类型
interface GetChatInfoParams {
  chat_id: string;
}

interface DisbandChatParams {
  chat_id: string;
}

interface AddChatMembersParams {
  chat_id: string;
  id_list: string[];
  id_type?: 'user_id' | 'open_id' | 'union_id';
}

interface RemoveChatMembersParams {
  chat_id: string;
  id_list: string[];
  id_type?: 'user_id' | 'open_id' | 'union_id';
}

/**
 * WPS V7 聊天API适配器
 * 提供纯函数式的聊天会话管理API调用
 */
export interface WpsChatAdapter {
  // 聊天会话管理
  createChat(params: CreateChatParams): Promise<CreateChatResponse>;
  getChatInfo(params: GetChatInfoParams): Promise<ChatInfo>;
  updateChat(params: UpdateChatParams): Promise<void>;
  disbandChat(params: DisbandChatParams): Promise<void>;
  getChatList(params?: GetChatListParams): Promise<GetChatListResponse>;
  getAllChatList(params?: GetChatListParams): Promise<ChatInfo[]>;

  // 聊天成员管理
  addChatMembers(params: AddChatMembersParams): Promise<void>;
  removeChatMembers(params: RemoveChatMembersParams): Promise<void>;
  getChatMembers(params: GetChatMembersParams): Promise<GetChatMembersResponse>;
  getAllChatMembers(
    chatId: string,
    params?: Omit<GetChatMembersParams, 'chat_id'>
  ): Promise<ChatMember[]>;

  // 便捷方法
  createGroupChat(
    name: string,
    description: string,
    memberIds: string[]
  ): Promise<CreateChatResponse>;
  createPrivateChat(userId: string): Promise<CreateChatResponse>;
  inviteUsersToChat(chatId: string, userIds: string[]): Promise<void>;
  removeUsersFromChat(chatId: string, userIds: string[]): Promise<void>;
  updateChatName(chatId: string, name: string): Promise<void>;
  updateChatDescription(chatId: string, description: string): Promise<void>;
}

/**
 * 创建WPS聊天适配器的工厂函数
 */
export function createWpsChatAdapter(
  pluginContainer: AwilixContainer
): WpsChatAdapter {
  const httpClient =
    pluginContainer.resolve<HttpClientService>('httpClientService');

  const adapter: WpsChatAdapter = {
    /**
     * 创建聊天会话
     */
    async createChat(params: CreateChatParams): Promise<CreateChatResponse> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post('/v7/im/chats', params);
      return response.data;
    },

    /**
     * 获取聊天会话信息
     */
    async getChatInfo(params: GetChatInfoParams): Promise<ChatInfo> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get(`/v7/im/chats/${params.chat_id}`);
      return response.data;
    },

    /**
     * 更新聊天会话
     */
    async updateChat(params: UpdateChatParams): Promise<void> {
      await httpClient.ensureAccessToken();
      const { chat_id, ...updateData } = params;
      await httpClient.patch(`/v7/im/chats/${chat_id}`, updateData);
    },

    /**
     * 解散聊天会话
     */
    async disbandChat(params: DisbandChatParams): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.delete(`/v7/im/chats/${params.chat_id}`);
    },

    /**
     * 获取聊天会话列表
     */
    async getChatList(
      params: GetChatListParams = {}
    ): Promise<GetChatListResponse> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get('/v7/im/chats', params);
      return response.data;
    },

    /**
     * 获取所有聊天会话列表（自动分页）
     */
    async getAllChatList(params: GetChatListParams = {}): Promise<ChatInfo[]> {
      const allChats: ChatInfo[] = [];
      let pageToken: string | undefined;

      do {
        const response = await adapter.getChatList({
          ...params,
          page_token: pageToken
        });

        allChats.push(...(response.items || []));
        pageToken = response.page_token;
      } while (pageToken);

      return allChats;
    },

    /**
     * 添加聊天成员
     */
    async addChatMembers(params: AddChatMembersParams): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.post(`/v7/im/chats/${params.chat_id}/members`, {
        id_list: params.id_list,
        id_type: params.id_type
      });
    },

    /**
     * 移除聊天成员
     */
    async removeChatMembers(params: RemoveChatMembersParams): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.delete(`/v7/im/chats/${params.chat_id}/members`, {
        id_list: params.id_list,
        id_type: params.id_type
      });
    },

    /**
     * 获取聊天成员列表
     */
    async getChatMembers(
      params: GetChatMembersParams
    ): Promise<GetChatMembersResponse> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get(
        `/v7/im/chats/${params.chat_id}/members`,
        params
      );
      return response.data;
    },

    /**
     * 获取所有聊天成员（自动分页）
     */
    async getAllChatMembers(
      chatId: string,
      params: Omit<GetChatMembersParams, 'chat_id'> = {}
    ): Promise<ChatMember[]> {
      const allMembers: ChatMember[] = [];
      let pageToken: string | undefined;

      do {
        const response = await adapter.getChatMembers({
          ...params,
          chat_id: chatId,
          page_token: pageToken
        });

        allMembers.push(...(response.items || []));
        pageToken = response.page_token;
      } while (pageToken);

      return allMembers;
    },

    /**
     * 创建群聊
     */
    async createGroupChat(
      name: string,
      description: string,
      memberIds: string[]
    ): Promise<CreateChatResponse> {
      return adapter.createChat({
        type: 'group',
        name,
        description,
        users: memberIds
      });
    },

    /**
     * 创建私聊
     */
    async createPrivateChat(userId: string): Promise<CreateChatResponse> {
      return adapter.createChat({
        type: 'single',
        users: [userId]
      });
    },

    /**
     * 邀请用户加入聊天
     */
    async inviteUsersToChat(chatId: string, userIds: string[]): Promise<void> {
      return adapter.addChatMembers({
        chat_id: chatId,
        id_list: userIds,
        id_type: 'user_id'
      });
    },

    /**
     * 从聊天中移除用户
     */
    async removeUsersFromChat(
      chatId: string,
      userIds: string[]
    ): Promise<void> {
      return adapter.removeChatMembers({
        chat_id: chatId,
        id_list: userIds,
        id_type: 'user_id'
      });
    },

    /**
     * 更新聊天名称
     */
    async updateChatName(chatId: string, name: string): Promise<void> {
      return adapter.updateChat({
        chat_id: chatId,
        name
      });
    },

    /**
     * 更新聊天描述
     */
    async updateChatDescription(
      chatId: string,
      description: string
    ): Promise<void> {
      return adapter.updateChat({
        chat_id: chatId,
        description
      });
    }
  };

  return adapter;
}

/**
 * 默认导出适配器配置
 */
export default {
  adapterName: 'chat',
  factory: createWpsChatAdapter
};
