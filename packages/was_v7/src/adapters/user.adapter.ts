import type { AwilixContainer } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  BatchDisableUserParams,
  BatchGetUserInfoParams,
  BatchGetUserInfoResponse,
  CreateUserParams,
  CreateUserResponse,
  DeleteUserParams,
  GetAllUserParams,
  GetAllUserResponse,
  GetUserByExIdParams,
  UpdateUserParams,
  UserInfo
} from '../types/contact.js';

/**
 * 获取用户参数
 */
export interface GetUserParams {
  user_id: string;
}

/**
 * WPS V7 用户API适配器
 * 提供纯函数式的用户管理API调用
 */
export interface WpsUserAdapter {
  // 基础CRUD操作
  createUser(params: CreateUserParams): Promise<CreateUserResponse>;
  getUser(params: GetUserParams): Promise<UserInfo>;
  updateUser(params: UpdateUserParams): Promise<void>;
  deleteUser(params: DeleteUserParams): Promise<void>;

  // 批量操作
  batchGetUserInfo(
    params: BatchGetUserInfoParams
  ): Promise<BatchGetUserInfoResponse>;
  batchDisableUser(params: BatchDisableUserParams): Promise<void>;

  // 查询操作
  getAllUser(params?: GetAllUserParams): Promise<GetAllUserResponse>;
  getAllUserList(params?: GetAllUserParams): Promise<UserInfo[]>;
  getCurrentUserId(): Promise<string>;
  getUserByExId(params: GetUserByExIdParams): Promise<UserInfo>;
}

/**
 * 创建WPS用户适配器的工厂函数
 */
export function createWpsUserAdapter(
  pluginContainer: AwilixContainer
): WpsUserAdapter {
  const httpClient =
    pluginContainer.resolve<HttpClientService>('httpClientService');

  const adapter: WpsUserAdapter = {
    /**
     * 创建用户
     */
    async createUser(params: CreateUserParams): Promise<CreateUserResponse> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post('/v7/contacts/users', params);
      return response.data;
    },

    /**
     * 获取用户信息
     */
    async getUser(params: GetUserParams): Promise<UserInfo> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get(
        `/v7/contacts/users/${params.user_id}`
      );
      return response.data;
    },

    /**
     * 更新用户信息
     */
    async updateUser(params: UpdateUserParams): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.put('/v7/contacts/users', params);
    },

    /**
     * 删除用户
     */
    async deleteUser(params: DeleteUserParams): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.delete('/v7/contacts/users', params);
    },

    /**
     * 批量获取用户信息
     */
    async batchGetUserInfo(
      params: BatchGetUserInfoParams
    ): Promise<BatchGetUserInfoResponse> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post(
        '/v7/contacts/users/batch/get',
        params
      );
      return response.data;
    },

    /**
     * 批量禁用用户
     */
    async batchDisableUser(params: BatchDisableUserParams): Promise<void> {
      await httpClient.ensureAccessToken();
      await httpClient.post('/v7/contacts/users/batch/disable', params);
    },

    /**
     * 获取所有用户
     */
    async getAllUser(
      params: GetAllUserParams = {}
    ): Promise<GetAllUserResponse> {
      await httpClient.ensureAccessToken();
      const queryParams = {
        ...params,
        page_size: Math.min(params.page_size || 10, 50)
      };
      const response = await httpClient.get('/v7/contacts/users', queryParams);
      return response.data;
    },

    /**
     * 获取所有用户列表（自动分页）
     */
    async getAllUserList(params: GetAllUserParams = {}): Promise<UserInfo[]> {
      const allUsers: UserInfo[] = [];
      let pageToken: string | undefined;

      do {
        const response = await adapter.getAllUser({
          ...params,
          page_token: pageToken
        });

        allUsers.push(...(response.items || []));
        pageToken = response.next_page_token;
      } while (pageToken);

      return allUsers;
    },

    /**
     * 获取当前用户ID
     */
    async getCurrentUserId(): Promise<string> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get('/v7/contacts/users/current');
      return response.data.user_id;
    },

    /**
     * 根据外部ID获取用户
     */
    async getUserByExId(params: GetUserByExIdParams): Promise<UserInfo> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get(
        '/v7/contacts/users/by_ex_id',
        params
      );
      return response.data;
    }
  };

  return adapter;
}

/**
 * 默认导出适配器配置
 */
export default {
  adapterName: 'user',
  factory: createWpsUserAdapter
};
