import type { AuthManager } from '../auth/auth-manager.js';
import { createError } from '../core/error.js';
import type { HttpClient } from '../core/http-client.js';
import type { AccessToken } from '../types/index.js';

/**
 * 用户授权信息
 * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/user-authorization/user-info.html
 */
export interface UserAuthInfo {
  id: string;
  user_name: string;
  avatar?: string;
  company_id?: string;
  /** 外部ID */
  ex_user_id: string;
}

/**
 * 授权URL参数
 */
export interface AuthUrlParams {
  /** 重定向URI */
  redirect_uri: string;
  /** 授权范围，默认为 'user:read' */
  scope?: string;
  /** 状态参数，用于防止CSRF攻击 */
  state?: string;
  /** 响应类型，固定为 'code' */
  response_type?: 'code';
}

/**
 * 获取用户访问令牌参数
 */
export interface GetUserTokenParams {
  /** 授权码 */
  code: string;
  /** 重定向URI，必须与授权时的一致 */
  redirect_uri?: string;
}

/**
 * 用户授权模块
 * 实现WPS开发平台的用户授权登录功能
 *
 * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/user-authorization/flow.html
 */
export class UserAuthModule {
  constructor(
    private readonly wasV7HttpClient: HttpClient,
    private readonly wasV7AuthManager: AuthManager
  ) {}

  /**
   * 生成用户授权URL
   * 用于引导用户进行授权登录
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/user-authorization/flow.html
   * @param params 授权参数
   * @returns 授权URL
   */
  generateAuthUrl(params: AuthUrlParams): string {
    const {
      redirect_uri,
      scope = 'user:read',
      state,
      response_type = 'code'
    } = params;

    return this.wasV7AuthManager.generateAuthUrl(redirect_uri, scope, state);
  }

  /**
   * 验证授权回调参数
   * 验证从WPS授权服务器返回的参数
   *
   * @param code 授权码
   * @param state 状态参数
   * @param error 错误信息
   */
  validateAuthCallback(code?: string, state?: string, error?: string): void {
    this.wasV7AuthManager.validateCallback(code, state, error);
  }

  /**
   * 获取用户访问令牌
   * 通过授权码获取用户的access_token
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/get-token/get-user-access-token
   * @param params 获取令牌参数
   * @returns 访问令牌信息
   */
  async getUserAccessToken(params: GetUserTokenParams): Promise<AccessToken> {
    try {
      const { code, redirect_uri } = params;

      // 验证授权码
      if (!code) {
        throw createError.auth('授权码不能为空');
      }

      // 调用认证管理器获取用户访问令牌
      const tokenInfo = await this.wasV7AuthManager.getUserAccessToken(
        code,
        redirect_uri
      );

      return tokenInfo;
    } catch (error) {
      throw createError.auth('获取用户访问令牌失败', error);
    }
  }

  /**
   * 获取用户访问令牌
   * 通过授权码获取用户的access_token
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/get-token/get-user-access-token
   * @param params 获取令牌参数
   * @returns 访问令牌信息
   */
  async getUserXZAccessToken(params: GetUserTokenParams): Promise<AccessToken> {
    try {
      const { code } = params;

      // 验证授权码
      if (!code) {
        throw createError.auth('授权码不能为空');
      }

      // 调用认证管理器获取用户访问令牌
      const tokenInfo = await this.wasV7AuthManager.getXZUserAccessToken(code);

      return tokenInfo;
    } catch (error) {
      throw createError.auth('获取用户访问令牌失败', error);
    }
  }

  /**
   * 刷新用户访问令牌
   * 使用refresh_token刷新用户的access_token
   *
   * @param refreshToken 刷新令牌
   * @returns 新的访问令牌信息
   */
  async refreshUserAccessToken(refreshToken: string): Promise<AccessToken> {
    try {
      if (!refreshToken) {
        throw createError.auth('刷新令牌不能为空');
      }

      return await this.wasV7AuthManager.refreshUserAccessToken(refreshToken);
    } catch (error) {
      throw createError.auth('刷新用户访问令牌失败', error);
    }
  }

  /**
   * 获取当前用户信息
   * 获取当前访问令牌对应的用户详细信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/certification-authorization/user-authorization/user-info.html
   * @returns 用户信息
   */
  async getCurrentUserInfo(token: string): Promise<UserAuthInfo> {
    try {
      const response = await this.wasV7HttpClient.get<UserAuthInfo>(
        '/v7/users/current',
        {},
        { Authorization: `Bearer ${token}` }
      );

      if (response.code !== 0) {
        throw createError.auth(`获取用户信息失败: ${response.msg}`);
      }

      return response.data;
    } catch (error) {
      throw createError.auth('获取用户信息失败', error);
    }
  }

  /**
   * 完整的用户授权登录流程
   * 一站式完成从授权码到获取用户信息的完整流程
   *
   * @param params 授权参数
   * @returns 用户信息和访问令牌
   */
  async completeUserAuth(params: GetUserTokenParams): Promise<UserAuthInfo> {
    try {
      // 1. 获取用户访问令牌
      const accessToken = await this.getUserAccessToken(params);

      // 2. 获取用户信息
      const userInfo = await this.getCurrentUserInfo(accessToken.access_token);

      return userInfo;
    } catch (error) {
      throw createError.auth('完成用户授权失败', error);
    }
  }

  /**
   * 完整的用户授权登录流程
   * 一站式完成从授权码到获取用户信息的完整流程
   *
   * @param params 授权参数
   * @returns 用户信息和访问令牌
   */
  async completeXZUserAuth(params: GetUserTokenParams): Promise<UserAuthInfo> {
    try {
      // 1. 获取用户访问令牌
      const accessToken = await this.getUserXZAccessToken(params);

      // 2. 获取用户信息
      const userInfo = await this.wasV7AuthManager.getXZCurrentUserInfo(
        accessToken.access_token
      );

      return {
        id: userInfo.company_id,
        user_name: userInfo.nickname,
        avatar: userInfo.avatar,
        ex_user_id: userInfo.third_union_id
      };
    } catch (error) {
      throw createError.auth('完成用户授权失败', error);
    }
  }
}
