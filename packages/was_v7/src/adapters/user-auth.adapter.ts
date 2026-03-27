import type { AwilixContainer, Logger } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';

/**
 * 获取用户访问令牌参数
 */
export interface GetUserAccessTokenParams {
  code: string;
  redirect_uri: string;
}

/**
 * 获取用户访问令牌响应
 */
export interface GetUserAccessTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * 刷新用户访问令牌参数
 */
export interface RefreshUserAccessTokenParams {
  refresh_token: string;
}

/**
 * 刷新用户访问令牌响应
 */
export interface RefreshUserAccessTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * 获取用户信息参数
 */
export interface GetUserInfoParams {
  access_token: string;
}

/**
 * 用户认证信息
 */
export interface UserAuthInfo {
  user_id: string;
  name: string;
  email?: string;
  mobile?: string;
  avatar_url?: string;
}

/**
 * 获取用户信息响应
 */
export interface GetUserInfoResponse {
  user: UserAuthInfo;
}

/**
 * WPS V7 用户认证API适配器
 * 提供纯函数式的用户认证和授权API调用
 */
export interface WpsUserAuthAdapter {
  // 用户授权
  getUserAccessToken(params: GetUserAccessTokenParams): Promise<GetUserAccessTokenResponse>;
  refreshUserAccessToken(params: RefreshUserAccessTokenParams): Promise<RefreshUserAccessTokenResponse>;
  
  // 用户信息
  getUserInfo(params: GetUserInfoParams): Promise<GetUserInfoResponse>;
  getCurrentUserInfo(accessToken: string): Promise<UserAuthInfo>;
  
  // 便捷方法
  exchangeCodeForToken(code: string, redirectUri: string): Promise<GetUserAccessTokenResponse>;
  refreshToken(refreshToken: string): Promise<RefreshUserAccessTokenResponse>;
  validateAccessToken(accessToken: string): Promise<boolean>;
  getUserProfile(accessToken: string): Promise<UserAuthInfo>;
}

/**
 * 创建WPS用户认证适配器的工厂函数
 */
export function createWpsUserAuthAdapter(pluginContainer: AwilixContainer): WpsUserAuthAdapter {
  const httpClient = pluginContainer.resolve<HttpClientService>('httpClientService');
  const logger = pluginContainer.resolve<Logger>('logger');

  const adapter: WpsUserAuthAdapter = {
    /**
     * 获取用户访问令牌
     */
    async getUserAccessToken(params: GetUserAccessTokenParams): Promise<GetUserAccessTokenResponse> {
      // 用户授权不需要应用token
      const response = await httpClient.post('/v7/oauth/token', {
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: params.redirect_uri
      });
      return response.data;
    },

    /**
     * 刷新用户访问令牌
     */
    async refreshUserAccessToken(params: RefreshUserAccessTokenParams): Promise<RefreshUserAccessTokenResponse> {
      // 刷新token不需要应用token
      const response = await httpClient.post('/v7/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: params.refresh_token
      });
      return response.data;
    },

    /**
     * 获取用户信息
     */
    async getUserInfo(params: GetUserInfoParams): Promise<GetUserInfoResponse> {
      // 使用用户token获取用户信息，不需要应用token
      const response = await httpClient.get('/v7/user/info', {}, {
        'Authorization': `Bearer ${params.access_token}`
      });
      return response.data;
    },

    /**
     * 获取当前用户信息
     */
    async getCurrentUserInfo(accessToken: string): Promise<UserAuthInfo> {
      const response = await adapter.getUserInfo({ access_token: accessToken });
      return response.user;
    },

    /**
     * 通过授权码换取访问令牌
     */
    async exchangeCodeForToken(code: string, redirectUri: string): Promise<GetUserAccessTokenResponse> {
      return adapter.getUserAccessToken({
        code,
        redirect_uri: redirectUri
      });
    },

    /**
     * 刷新访问令牌
     */
    async refreshToken(refreshToken: string): Promise<RefreshUserAccessTokenResponse> {
      return adapter.refreshUserAccessToken({
        refresh_token: refreshToken
      });
    },

    /**
     * 验证访问令牌有效性
     */
    async validateAccessToken(accessToken: string): Promise<boolean> {
      try {
        await adapter.getCurrentUserInfo(accessToken);
        return true;
      } catch (error) {
        logger.warn('Access token validation failed:', error);
        return false;
      }
    },

    /**
     * 获取用户档案信息
     */
    async getUserProfile(accessToken: string): Promise<UserAuthInfo> {
      return adapter.getCurrentUserInfo(accessToken);
    }
  };

  return adapter;
}

/**
 * 默认导出适配器配置
 */
export default {
  adapterName: 'userAuth',
  factory: createWpsUserAuthAdapter
};
