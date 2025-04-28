import axios from 'axios';
import { tokenResponseSchema } from '../schemas/response.js';
import { WasV1Options } from '../types/config.js';
import { generateWPS3Headers } from './signature.js';

// 缓存实例
let tokenCache: Map<string, { token: string; expires: number }> | null = null;

/**
 * 初始化token缓存
 */
export function initTokenCache(options: WasV1Options): void {
  if (options.tokenCacheEnabled !== false) {
    tokenCache = new Map();
  }
}

/**
 * 从缓存获取token
 * @param appId 应用ID
 * @returns 缓存的token或null
 */
function getTokenFromCache(appId: string): string | null {
  if (!tokenCache) return null;

  const cached = tokenCache.get(appId);
  if (!cached) return null;

  // 检查token是否过期
  if (cached.expires < Date.now()) {
    tokenCache.delete(appId);
    return null;
  }

  return cached.token;
}

/**
 * 将token存入缓存
 * @param appId 应用ID
 * @param token token值
 * @param ttl 过期时间（毫秒）
 */
function setTokenToCache(appId: string, token: string, ttl: number): void {
  if (!tokenCache) return;

  const expires = Date.now() + ttl;
  tokenCache.set(appId, { token, expires });
}

/**
 * 获取company_token
 * @param app Stratix应用实例
 * @param options 插件配置
 * @returns company_token
 */
export async function getCompanyToken(
  app: any,
  options: WasV1Options
): Promise<string> {
  const logger = app.hasPlugin('logger') ? app.logger : console;

  // 尝试从缓存获取token
  const cachedToken = getTokenFromCache(options.appId);
  if (cachedToken) {
    logger.debug('从缓存获取company_token成功');
    return cachedToken;
  }

  logger.debug('开始获取company_token');

  try {
    // 设置请求URL和参数
    const url = `/oauthapi/v3/inner/company/token`;
    const queryParams = { app_id: options.appId };
    const fullUrl = `${options.baseUrl}${url}?app_id=${options.appId}`;

    // 生成WPS3签名头
    const headers = generateWPS3Headers(
      options.appId,
      options.appKey,
      'GET',
      `${url}?app_id=${options.appId}`
    );

    // 发送请求
    const response = await axios.get(fullUrl, { headers });

    // 验证响应数据
    const result = tokenResponseSchema.parse(response.data);

    // 获取token和过期时间
    const token = result.company_token;
    const ttl = (result.expires_in || 3600) * 1000; // 转换为毫秒

    // 缓存token
    if (options.tokenCacheEnabled !== false) {
      setTokenToCache(options.appId, token, options.tokenCacheTTL || ttl);
    }

    logger.debug('获取company_token成功');

    return token;
  } catch (error) {
    logger.error('获取company_token失败', error);
    throw new Error(`获取company_token失败: ${(error as Error).message}`);
  }
}

/**
 * 清除token缓存
 * @param appId 应用ID，不提供则清除所有缓存
 */
export function clearTokenCache(appId?: string): void {
  if (!tokenCache) return;

  if (appId) {
    tokenCache.delete(appId);
  } else {
    tokenCache.clear();
  }
}
