import type { AuthManager } from '../auth/auth-manager.js';
import type { HttpClient } from '../core/http-client.js';
import type {
  BatchDisableUserParams,
  BatchEnableUserParams,
  BatchGetDeptUserParams,
  BatchGetDeptUserResponse,
  BatchGetUserAttributeParams,
  BatchGetUserAttributeResponse,
  BatchGetUserInfoParams,
  BatchGetUserInfoResponse,
  BatchUpdateUserAttributeParams,
  BatchUpdateUserDeptParams,
  BatchUpdateUserOrderParams,
  CreateUserParams,
  CreateUserResponse,
  DeleteUserParams,
  GetAllUserParams,
  GetAllUserResponse,
  GetCurrentUserIdResponse,
  GetDeptUserParams,
  GetDeptUserResponse,
  GetUserByEmailParams,
  GetUserByExIdParams,
  GetUserByPhoneParams,
  GetUserDeptParams,
  GetUserDeptResponse,
  JoinDeptParams,
  RemoveDeptParams,
  UpdateUserParams,
  UserInfo
} from '../types/contact.js';

/**
 * 用户管理模块
 * 提供用户的增删改查、状态管理、部门关联等功能
 */
export class UserModule {
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
   * 批量禁用用户
   * 批量禁用指定的用户账号
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/batch-disable-user.html
   * @param params 禁用参数
   */
  async batchDisableUser(params: BatchDisableUserParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.post('/v7/contacts/users/batch/disable', params);
  }

  /**
   * 批量启用用户
   * 批量启用指定的用户账号
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/batch-enable-user.html
   * @param params 启用参数
   */
  async batchEnableUser(params: BatchEnableUserParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.post('/v7/contacts/users/batch/enable', params);
  }

  /**
   * 查询指定用户
   * 根据用户ID查询用户信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/get-user.html
   * @param userId 用户ID
   * @returns 用户信息
   */
  async getUser(userId: string): Promise<UserInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<UserInfo>(
      `/v7/users/${userId}`
    );
    return response.data;
  }

  /**
   * 批量查询用户
   * 根据用户ID列表批量查询用户信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/batch-get-user.html
   * @param params 查询参数
   * @returns 用户信息列表
   */
  async batchGetUser(
    params: BatchGetUserInfoParams
  ): Promise<BatchGetUserInfoResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<BatchGetUserInfoResponse>(
      '/v7/contacts/users/batch',
      params
    );
    return response.data;
  }

  /**
   * 获取用户ID信息
   * 获取当前访问令牌对应的用户ID
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/get-current-user-id.html
   * @returns 用户ID信息
   */
  async getCurrentUserId(): Promise<GetCurrentUserIdResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<GetCurrentUserIdResponse>(
      '/v7/contacts/users/me'
    );
    return response.data;
  }

  /**
   * 查询企业下所有用户
   * 分页查询企业下的所有用户，单页最大值为50
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/get-all-user.html
   * @param params 查询参数
   * @returns 用户列表
   */
  async getAllUser(params: GetAllUserParams = {}): Promise<GetAllUserResponse> {
    await this.ensureAccessToken();

    // 确保分页大小不超过最大值50
    const queryParams = {
      ...params,
      page_size: Math.min(params.page_size || 20, 50)
    };

    const response = await this.wasV7HttpClient.get<GetAllUserResponse>(
      '/v7/contacts/users',
      queryParams
    );
    return response.data;
  }

  /**
   * 获取企业下所有用户（自动分页）
   * 自动处理分页，获取企业下的所有用户
   *
   * @param params 查询参数（不包含分页参数）
   * @returns 所有用户列表
   */
  async getAllUserList(
    params: Omit<GetAllUserParams, 'page_size' | 'page_token'> = {}
  ): Promise<UserInfo[]> {
    const allUsers: UserInfo[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.getAllUser({
        ...params,
        page_size: 50, // 使用最大分页大小
        page_token: pageToken
      });

      allUsers.push(...response.items);
      pageToken = response.next_page_token;
    } while (pageToken);

    return allUsers;
  }

  /**
   * 查询部门下用户列表
   * 查询指定部门下的用户列表，支持分页
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/get-dept-user.html
   * @param params 查询参数
   * @returns 用户列表
   */
  async getDeptUser(params: GetDeptUserParams): Promise<GetDeptUserResponse> {
    await this.ensureAccessToken();

    // 确保分页大小不超过最大值50
    const queryParams = {
      ...params,
      page_size: Math.min(params.page_size || 20, 50)
    };

    const response = await this.wasV7HttpClient.get<GetDeptUserResponse>(
      `/v7/contacts/depts/${params.dept_id}/users`,
      queryParams
    );
    return response.data;
  }

  /**
   * 获取部门下所有用户（自动分页）
   * 自动处理分页，获取指定部门下的所有用户
   *
   * @param params 查询参数（不包含分页参数）
   * @returns 所有用户列表
   */
  async getAllDeptUser(
    params: Omit<GetDeptUserParams, 'page_size' | 'page_token'>
  ): Promise<UserInfo[]> {
    const allUsers: UserInfo[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.getDeptUser({
        ...params,
        page_size: 50, // 使用最大分页大小
        page_token: pageToken
      });

      allUsers.push(...response.items);
      pageToken = response.next_page_token;
    } while (pageToken);

    return allUsers;
  }

  /**
   * 批量查询部门下的成员信息
   * 根据部门ID列表批量查询部门下的成员信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/batch-get-dept-user.html
   * @param params 查询参数
   * @returns 部门成员信息列表
   */
  async batchGetDeptUser(
    params: BatchGetDeptUserParams
  ): Promise<BatchGetDeptUserResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<BatchGetDeptUserResponse>(
      '/v7/contacts/depts/users/batch',
      params
    );
    return response.data;
  }

  /**
   * 根据邮箱获取用户
   * 通过邮箱地址查询用户信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/get-email-user.html
   * @param params 查询参数
   * @returns 用户信息
   */
  async getUserByEmail(params: GetUserByEmailParams): Promise<UserInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<UserInfo>(
      `/v7/contacts/users/email/${encodeURIComponent(params.email)}`
    );
    return response.data;
  }

  /**
   * 根据手机号获取用户
   * 通过手机号查询用户信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/get-phone-user.html
   * @param params 查询参数
   * @returns 用户信息
   */
  async getUserByPhone(params: GetUserByPhoneParams): Promise<UserInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<UserInfo>(
      `/v7/contacts/users/mobile/${params.mobile}`
    );
    return response.data;
  }

  /**
   * 根据外部用户ID获取用户信息
   * 通过外部用户ID查询用户信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/get-ex-user.html
   * @param params 查询参数
   * @returns 用户信息
   */
  async getUserByExId(params: GetUserByExIdParams): Promise<UserInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<UserInfo>(
      `/v7/users/by_ex_user_ids`,
      params
    );
    return response.data;
  }

  /**
   * 创建用户
   * 在企业中创建新用户
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/create-user.html
   * @param params 创建参数
   * @returns 创建结果
   */
  async createUser(params: CreateUserParams): Promise<CreateUserResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<CreateUserResponse>(
      '/v7/contacts/users',
      params
    );
    return response.data;
  }

  /**
   * 更新用户
   * 更新指定用户的信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/update-user.html
   * @param params 更新参数
   */
  async updateUser(params: UpdateUserParams): Promise<void> {
    await this.ensureAccessToken();

    const { user_id, ...updateData } = params;
    await this.wasV7HttpClient.put(`/v7/contacts/users/${user_id}`, updateData);
  }

  /**
   * 删除用户
   * 删除指定用户
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/delete-user.html
   * @param params 删除参数
   */
  async deleteUser(params: DeleteUserParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.delete(`/v7/contacts/users/${params.user_id}`);
  }

  /**
   * 批量修改用户在部门中排序值
   * 批量修改用户在指定部门中的排序值
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/batch-update-user-order.html
   * @param params 更新参数
   */
  async batchUpdateUserOrder(
    params: BatchUpdateUserOrderParams
  ): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.put('/v7/contacts/users/order/batch', params);
  }

  /**
   * 批量更新用户所在部门
   * 批量更新用户的部门归属
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/batch-update-user-dept.html
   * @param params 更新参数
   */
  async batchUpdateUserDept(params: BatchUpdateUserDeptParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.put('/v7/contacts/users/dept/batch', params);
  }

  /**
   * 批量获取用户的自定义属性值
   * 批量获取用户的自定义属性值
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/batch-get-user-attribute.html
   * @param params 查询参数
   * @returns 用户属性信息列表
   */
  async batchGetUserAttribute(
    params: BatchGetUserAttributeParams
  ): Promise<BatchGetUserAttributeResponse> {
    await this.ensureAccessToken();

    const response =
      await this.wasV7HttpClient.post<BatchGetUserAttributeResponse>(
        '/v7/contacts/users/attributes/batch',
        params
      );
    return response.data;
  }

  /**
   * 批量更新用户的自定义属性值
   * 批量更新用户的自定义属性值
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/batch-update-user-attribute.html
   * @param params 更新参数
   */
  async batchUpdateUserAttribute(
    params: BatchUpdateUserAttributeParams
  ): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.put(
      '/v7/contacts/users/attributes/batch',
      params
    );
  }

  /**
   * 将用户加入到部门
   * 将指定用户加入到指定部门
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/join-dept.html
   * @param params 加入参数
   */
  async joinDept(params: JoinDeptParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.post(
      `/v7/contacts/users/${params.user_id}/depts/${params.dept_id}`,
      { order: params.order || 0 }
    );
  }

  /**
   * 将用户移除部门
   * 将指定用户从指定部门移除
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/remove-dept.html
   * @param params 移除参数
   */
  async removeDept(params: RemoveDeptParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.delete(
      `/v7/contacts/users/${params.user_id}/depts/${params.dept_id}`
    );
  }

  /**
   * 获取用户所在部门列表
   * 获取指定用户所在的所有部门列表
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/user/get-user-dept.html
   * @param params 查询参数
   * @returns 用户部门列表
   */
  async getUserDept(params: GetUserDeptParams): Promise<GetUserDeptResponse> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<GetUserDeptResponse>(
      `/v7/contacts/users/${params.user_id}/depts`
    );
    return response.data;
  }
}
