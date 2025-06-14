import type { AuthManager } from '../auth/auth-manager.js';
import type { HttpClient } from '../core/http-client.js';
import type {
  BatchAddMembersParams,
  BatchGetChatInfoParams,
  BatchGetChatInfoResponse,
  BatchRemoveMembersParams,
  ChatInfo,
  ChatMember,
  ConvertDeptChatParams,
  CreateChatParams,
  CreateChatResponse,
  CreateDeptChatParams,
  CreateDeptChatResponse,
  DismissChatParams,
  GetChatIdByUserIdParams,
  GetChatIdByUserIdResponse,
  GetChatListParams,
  GetChatListResponse,
  GetChatMembersParams,
  GetChatMembersResponse,
  GetUserUnreadCountParams,
  GetUserUnreadCountResponse,
  SetDeptChatOwnerParams,
  UpdateChatParams
} from '../types/message.js';

/**
 * 会话管理模块
 * 提供会话创建、管理、成员操作等功能
 *
 * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/
 */
export class ChatModule {
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
   * 创建会话（单聊或群聊）
   * 创建新的聊天会话
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/create-chat.html
   * @param params 创建会话参数
   * @returns 会话创建结果
   */
  async createChat(params: CreateChatParams): Promise<CreateChatResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<CreateChatResponse>(
      '/v7/im/chats',
      params
    );
    return response.data;
  }

  /**
   * 创建单聊
   * 快捷方法：创建单聊会话
   *
   * @param userId 对方用户ID
   * @returns 会话创建结果
   */
  async createSingleChat(userId: string): Promise<CreateChatResponse> {
    return this.createChat({
      type: 'single',
      users: [userId]
    });
  }

  /**
   * 创建群聊
   * 快捷方法：创建群聊会话
   *
   * @param userIds 用户ID列表
   * @param name 群聊名称
   * @param description 群聊描述（可选）
   * @returns 会话创建结果
   */
  async createGroupChat(
    userIds: string[],
    name: string,
    description?: string
  ): Promise<CreateChatResponse> {
    return this.createChat({
      type: 'group',
      users: userIds,
      name,
      description
    });
  }

  /**
   * 解散群聊
   * 解散指定的群聊
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/dismiss-chat.html
   * @param params 解散群聊参数
   */
  async dismissChat(params: DismissChatParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.delete(`/v7/im/chats/${params.chat_id}`);
  }

  /**
   * 获取会话列表
   * 分页获取会话列表
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/get-chat-list.html
   * @param params 查询参数
   * @returns 会话列表
   */
  async getChatList(
    params: GetChatListParams = {}
  ): Promise<GetChatListResponse> {
    await this.ensureAccessToken();

    const queryParams: Record<string, any> = {};
    if (params.page_size)
      queryParams.page_size = Math.min(params.page_size, 50); // 最大50
    if (params.page_token) queryParams.page_token = params.page_token;
    if (params.chat_type) queryParams.chat_type = params.chat_type;

    const response = await this.wasV7HttpClient.get<GetChatListResponse>(
      '/v7/im/chats',
      queryParams
    );
    return response.data;
  }

  /**
   * 获取所有会话列表
   * 自动分页获取所有会话
   *
   * @param chatType 会话类型过滤（可选）
   * @returns 所有会话列表
   */
  async getAllChatList(
    chatType?: GetChatListParams['chat_type']
  ): Promise<ChatInfo[]> {
    const allChats: ChatInfo[] = [];
    let pageToken: string | undefined;
    let hasMore = true;

    do {
      const response = await this.getChatList({
        page_size: 50, // 使用最大分页大小
        page_token: pageToken,
        chat_type: chatType
      });

      allChats.push(...response.items);
      pageToken = response.page_token;
      hasMore = response.has_more;
    } while (pageToken && hasMore);

    return allChats;
  }

  /**
   * 获取会话信息
   * 获取指定会话的详细信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/get-chat-info.html
   * @param chatId 会话ID
   * @returns 会话信息
   */
  async getChatInfo(chatId: string): Promise<ChatInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<ChatInfo>(
      `/v7/im/chats/${chatId}`
    );
    return response.data;
  }

  /**
   * 批量获取会话信息
   * 批量获取多个会话的信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/batch-get-chat-info.html
   * @param params 批量查询参数
   * @returns 会话信息列表
   */
  async batchGetChatInfo(
    params: BatchGetChatInfoParams
  ): Promise<BatchGetChatInfoResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<BatchGetChatInfoResponse>(
      '/v7/im/chats/batch',
      params
    );
    return response.data;
  }

  /**
   * 更新会话信息
   * 更新会话的名称、描述等信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/update-chat.html
   * @param params 更新参数
   */
  async updateChat(params: UpdateChatParams): Promise<void> {
    await this.ensureAccessToken();

    const { chat_id, ...updateData } = params;
    await this.wasV7HttpClient.patch(`/v7/im/chats/${chat_id}`, updateData);
  }

  /**
   * 批量添加群成员
   * 向群聊中批量添加成员
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/batch-add-members.html
   * @param params 添加成员参数
   */
  async batchAddMembers(params: BatchAddMembersParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.post(`/v7/im/chats/${params.chat_id}/members`, {
      user_ids: params.user_ids
    });
  }

  /**
   * 添加单个群成员
   * 快捷方法：向群聊中添加单个成员
   *
   * @param chatId 会话ID
   * @param userId 用户ID
   */
  async addMember(chatId: string, userId: string): Promise<void> {
    return this.batchAddMembers({
      chat_id: chatId,
      user_ids: [userId]
    });
  }

  /**
   * 获取群成员列表
   * 分页获取群聊成员列表
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/get-members.html
   * @param params 查询参数
   * @returns 群成员列表
   */
  async getChatMembers(
    params: GetChatMembersParams
  ): Promise<GetChatMembersResponse> {
    await this.ensureAccessToken();

    const queryParams: Record<string, any> = {};
    if (params.page_size)
      queryParams.page_size = Math.min(params.page_size, 50); // 最大50
    if (params.page_token) queryParams.page_token = params.page_token;

    const response = await this.wasV7HttpClient.get<GetChatMembersResponse>(
      `/v7/im/chats/${params.chat_id}/members`,
      queryParams
    );
    return response.data;
  }

  /**
   * 获取所有群成员
   * 自动分页获取群聊的所有成员
   *
   * @param chatId 会话ID
   * @returns 所有群成员列表
   */
  async getAllChatMembers(chatId: string): Promise<ChatMember[]> {
    const allMembers: ChatMember[] = [];
    let pageToken: string | undefined;
    let hasMore = true;

    do {
      const response = await this.getChatMembers({
        chat_id: chatId,
        page_size: 50, // 使用最大分页大小
        page_token: pageToken
      });

      allMembers.push(...response.items);
      pageToken = response.page_token;
      hasMore = response.has_more;
    } while (pageToken && hasMore);

    return allMembers;
  }

  /**
   * 批量删除群成员
   * 从群聊中批量删除成员
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/batch-remove-members.html
   * @param params 删除成员参数
   */
  async batchRemoveMembers(params: BatchRemoveMembersParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.delete(
      `/v7/im/chats/${params.chat_id}/members`,
      { user_ids: params.user_ids }
    );
  }

  /**
   * 删除单个群成员
   * 快捷方法：从群聊中删除单个成员
   *
   * @param chatId 会话ID
   * @param userId 用户ID
   */
  async removeMember(chatId: string, userId: string): Promise<void> {
    return this.batchRemoveMembers({
      chat_id: chatId,
      user_ids: [userId]
    });
  }

  /**
   * 获取用户会话未读数
   * 获取指定用户的会话未读消息数量
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/get-unread-count.html
   * @param params 查询参数
   * @returns 未读消息数量
   */
  async getUserUnreadCount(
    params: GetUserUnreadCountParams
  ): Promise<GetUserUnreadCountResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<GetUserUnreadCountResponse>(
      '/v7/im/chats/unread-count',
      { user_id: params.user_id }
    );
    return response.data;
  }

  /**
   * 根据用户ID获取会话ID
   * 根据用户ID获取与该用户的单聊会话ID
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/get-chat-id-by-user-id.html
   * @param params 查询参数
   * @returns 会话ID信息
   */
  async getChatIdByUserId(
    params: GetChatIdByUserIdParams
  ): Promise<GetChatIdByUserIdResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<GetChatIdByUserIdResponse>(
      '/v7/im/chats/user',
      { user_id: params.user_id }
    );
    return response.data;
  }

  /**
   * 创建部门群
   * 基于部门创建群聊
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/create-dept-chat.html
   * @param params 创建部门群参数
   * @returns 部门群创建结果
   */
  async createDeptChat(
    params: CreateDeptChatParams
  ): Promise<CreateDeptChatResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<CreateDeptChatResponse>(
      '/v7/im/chats/dept',
      params
    );
    return response.data;
  }

  /**
   * 部门群转普通群
   * 将部门群转换为普通群聊
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/convert-dept-chat.html
   * @param params 转换参数
   */
  async convertDeptChat(params: ConvertDeptChatParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.patch(`/v7/im/chats/${params.chat_id}/convert`);
  }

  /**
   * 指定部门群群主
   * 设置部门群的群主
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/im/chat/set-dept-chat-owner.html
   * @param params 设置群主参数
   */
  async setDeptChatOwner(params: SetDeptChatOwnerParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.patch(`/v7/im/chats/${params.chat_id}/owner`, {
      owner_id: params.owner_id
    });
  }

  /**
   * 判断用户是否在群聊中
   * 检查指定用户是否是群聊成员
   *
   * @param chatId 会话ID
   * @param userId 用户ID
   * @returns 是否在群聊中
   */
  async isUserInChat(chatId: string, userId: string): Promise<boolean> {
    try {
      const members = await this.getAllChatMembers(chatId);
      return members.some((member) => member.user_id === userId);
    } catch (error) {
      // 如果获取失败，返回false
      return false;
    }
  }

  /**
   * 获取群聊管理员列表
   * 获取群聊中的管理员和群主列表
   *
   * @param chatId 会话ID
   * @returns 管理员列表
   */
  async getChatAdmins(chatId: string): Promise<ChatMember[]> {
    const allMembers = await this.getAllChatMembers(chatId);
    return allMembers.filter(
      (member) => member.role === 'owner' || member.role === 'admin'
    );
  }
}
