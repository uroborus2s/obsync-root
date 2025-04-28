import { AxiosInstance } from 'axios';
import { userTokenResponseSchema } from '../../schemas/response.js';
import { sendRequest } from '../request.js';

/**
 * 创建认证API
 */
export function createAuthApi(client: AxiosInstance) {
  return {
    /**
     * 获取用户的access_token
     * @param code 授权码
     * @returns 认证结果
     */
    async getUserToken(code: string) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/oauthapi/v3/user/token',
          data: { code }
        },
        userTokenResponseSchema
      );
    },

    /**
     * 刷新用户的access_token
     * @param refreshToken 刷新令牌
     * @returns 新的认证结果
     */
    async refreshUserToken(refreshToken: string) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/oauthapi/v3/user/token/refresh',
          data: { refresh_token: refreshToken }
        },
        userTokenResponseSchema
      );
    },

    /**
     * 获取用户信息
     * @param accessToken 用户的access_token
     * @returns 用户信息
     */
    async getUserInfo(accessToken: string) {
      return sendRequest(client, {
        method: 'GET',
        url: '/oauthapi/v3/user/info',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
    }
  };
}
